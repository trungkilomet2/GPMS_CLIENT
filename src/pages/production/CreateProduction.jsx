import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserCheck, FileText, Download, Package } from "lucide-react";
import { toast } from 'react-toastify';
import OrderService from "@/services/OrderService";
import WorkerService from "@/services/WorkerService";
import ProductionService from "@/services/ProductionService";
import { userService } from "@/services/userService";
import { formatOrderDate } from "@/lib/orders/formatters";
import { normalizeOrderStatus, getOrderStatusLabel } from "@/lib/orders/status";
import { getOrderCustomerId } from "@/lib/orders/customerInfo";
import MaterialsTable from "@/components/orders/MaterialsTable";
import CustomerInfoCard from "@/components/orders/CustomerInfoCard";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { getProductionStatusLabel } from "@/utils/statusUtils";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";


export default function CreateProduction() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(!!orderId);
  const [orderError, setOrderError] = useState(null);

  const currentUser = getStoredUser();
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);
  const [pmUsers, setPmUsers] = useState([]);
  const [loadingPM, setLoadingPM] = useState(true);
  const [pmError, setPmError] = useState(null);

  const [selectedOrderId, setSelectedOrderId] = useState(orderId ? String(orderId) : "");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const [form, setForm] = useState({
    pmId: "",
    productionNote: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const customerId = getOrderCustomerId(order);

  const normalizeOrderDetail = (payload) => {
    if (!payload) return null;
    const templates = Array.isArray(payload.templates)
      ? payload.templates
      : Array.isArray(payload.template)
        ? payload.template
        : Array.isArray(payload.files)
          ? payload.files
          : [];
    const materials = Array.isArray(payload.materials)
      ? payload.materials
      : Array.isArray(payload.materialList)
        ? payload.materialList
        : Array.isArray(payload.materialItems)
          ? payload.materialItems
          : [];

    return {
      ...payload,
      templates: templates.map((t) => ({
        ...t,
        templateName: t?.templateName ?? t?.name,
      })),
      materials: materials.map((m) => ({
        ...m,
        materialName: m?.materialName ?? m?.name,
      })),
    };
  };

  useEffect(() => {
    let active = true;
    const fetchOrder = async () => {
      if (!orderId) {
        setLoadingOrder(false);
        setOrder(null);
        setOrderError(null);
        return;
      }
      try {
        setLoadingOrder(true);
        const response = await OrderService.getOrderDetail(orderId);
        const raw = response?.data?.data ?? response?.data ?? null;
        const data = normalizeOrderDetail(raw);
        if (!active) return;
        setOrder(data);
        setOrderError(null);
      } catch (_err) {
        if (!active) return;
        setOrderError("Không thể tải thông tin đơn hàng.");
      } finally {
        if (active) setLoadingOrder(false);
      }
    };
    fetchOrder();
    return () => { active = false; };
  }, [orderId]);

  useEffect(() => {
    let active = true;
    const fetchPMs = async () => {
      try {
        setLoadingPM(true);

        // Fetch all employees via pagination to ensure we capture all workers and PMs
        let allEmployees = [];
        let pageIdx = 0; // Backend uses 0-based indexing
        const pageSizeFetch = 50; // Increased page size to minimize loop iterations
        const maxPages = 20;

        while (pageIdx < maxPages) {
          try {
            const pageRes = await WorkerService.getAllEmployees({
              PageIndex: pageIdx,
              PageSize: pageSizeFetch,
            });
            const items = pageRes?.data ?? [];
            allEmployees = [...allEmployees, ...items];
            if (items.length < pageSizeFetch) break;
            pageIdx++;
          } catch (_err) {
            if (pageIdx === 0) {
              try {
                const fallback = await WorkerService.getAllEmployees();
                allEmployees = fallback?.data ?? [];
              } catch { }
            }
            break;
          }
        }

        // Collect IDs of people who are set as managerId for at least one person
        const managedBySet = new Set(
          allEmployees.map(emp => emp.managerId != null ? String(emp.managerId) : null).filter(Boolean)
        );

        const pmRoles = ["PM", "Manager", "Owner"];
        let pms = allEmployees.filter((item) => {
          // If they manage somebody, they are likely a valid PM candidate
          if (managedBySet.has(String(item.id))) return true;

          // Check explicit roles
          if (pmRoles.includes(item?.primaryRole)) return true;
          const normalizedRole = getPrimaryWorkspaceRole(item?.role ?? item?.roles ?? "").toLowerCase();
          if (normalizedRole === "pm" || normalizedRole === "owner" || normalizedRole === "manager") return true;

          if (Array.isArray(item?.roles)) {
            return item.roles.some((role) => pmRoles.includes(role));
          }
          const rawRoles = String(item?.role ?? "").split(",").map((r) => r.trim());
          return rawRoles.some((role) => pmRoles.includes(role));
        });

        if (!active) return;
        const currentUserId = String(currentUser?.userId ?? currentUser?.id ?? "");
        const finalPms = pms.filter((pm) => String(pm.id) !== currentUserId);
        setPmUsers(finalPms);
        setPmError(null);
      } catch (_err) {
        if (!active) return;
        setPmError("Không thể tải danh sách PM.");
      } finally {
        if (active) setLoadingPM(false);
      }
    };
    fetchPMs();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      if (orderId) return;
      try {
        setOrdersLoading(true);
        const getAssignedOrderIds = async () => {
          const assigned = new Set();
          let pageIndex = 0;
          const pageSizeFetch = 50;
          const maxPages = 200;

          while (pageIndex < maxPages) {
            const response = await ProductionService.getProductionList({
              PageIndex: pageIndex,
              PageSize: pageSizeFetch,
              SortColumn: "Name",
              SortOrder: "ASC",
            });
            const payload = response?.data ?? response;
            const list = Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : [];

            list.forEach((item) => {
              const oid = item?.order?.id ?? item?.orderId ?? item?.orderID ?? item?.order_id;
              const statusName = item?.statusName || item?.status;
              const normalizedProductionStatus = getProductionStatusLabel(statusName);

              // Only mark order as "assigned" if its current production is NOT rejected
              if (oid != null && normalizedProductionStatus !== "Từ Chối") {
                assigned.add(String(oid));
              }
            });

            if (list.length < pageSizeFetch) break;
            pageIndex += 1;
          }

          return assigned;
        };

        let response;
        const paramsSerializer = {
          serialize: (params) =>
            Object.entries(params)
              .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
              .join("&"),
        };

        const baseParams = {
          PageIndex: 0,
          PageSize: 50,
          SortColumn: "Name",
          SortOrder: "ASC",
        };

        try {
          response = await OrderService.getAllOrders(
            {
              ...baseParams,
              Status: "Đã Chấp Nhận",
            },
            { paramsSerializer }
          );
        } catch (err) {
          if (err?.response?.status === 400) {
            try {
              response = await OrderService.getAllOrders(
                {
                  pageIndex: baseParams.PageIndex,
                  pageSize: baseParams.PageSize,
                  sortColumn: baseParams.SortColumn,
                  sortOrder: baseParams.SortOrder,
                  status: "Đã Chấp Nhận",
                },
                { paramsSerializer }
              );
            } catch (err2) {
              if (err2?.response?.status === 400) {
                try {
                  response = await OrderService.getAllOrders(
                    {
                      ...baseParams,
                    },
                    { paramsSerializer }
                  );
                } catch (err3) {
                  if (err3?.response?.status === 400) {
                    response = await OrderService.getAllOrders();
                  } else {
                    throw err3;
                  }
                }
              } else {
                throw err2;
              }
            }
          } else {
            throw err;
          }
        }
        const items = Array.isArray(response)
          ? response
          : response?.data?.data ??
          response?.data?.items ??
          response?.data ??
          response?.items ??
          [];
        if (!active) return;
        let filteredItems = Array.isArray(items) ? items : [];
        try {
          const assignedOrderIds = await getAssignedOrderIds();
          filteredItems = filteredItems.filter((o) => {
            const oid = o?.id ?? o?.orderId ?? o?.orderID ?? o?.order_id;
            if (oid == null) return true;
            return !assignedOrderIds.has(String(oid));
          });
        } catch (_err) {
          // If fetching productions fails, fall back to showing all orders.
        }
        setOrders(filteredItems);
        setOrdersError(null);
      } catch (_err) {
        if (!active) return;
        setOrdersError("Không thể tải danh sách đơn hàng.");
      } finally {
        if (active) setOrdersLoading(false);
      }
    };
    fetchOrders();
    return () => { active = false; };
  }, [orderId]);

  useEffect(() => {
    if (!selectedOrderId || orderId) return;
    let active = true;
    const picked = orders.find((item) => String(item.id ?? item.orderId) === String(selectedOrderId)) || null;
    setOrder(picked);
    const fetchDetail = async () => {
      try {
        setLoadingOrder(true);
        const response = await OrderService.getOrderDetail(selectedOrderId);
        const raw = response?.data?.data ?? response?.data ?? null;
        if (!active) return;
        setOrder(normalizeOrderDetail(raw));
        setOrderError(null);
      } catch (_err) {
        if (!active) return;
        setOrderError("Không thể tải thông tin đơn hàng.");
      } finally {
        if (active) setLoadingOrder(false);
      }
    };
    fetchDetail();
    return () => {
      active = false;
    };
  }, [selectedOrderId, orderId, orders]);

  useEffect(() => {
    let active = true;
    const loadCustomerProfile = async () => {
      if (!customerId || !isOwner) {
        if (active) setCustomerProfile(null);
        return;
      }
      try {
        const profile = await userService.getProfileById(customerId);
        if (active) setCustomerProfile(profile || null);
      } catch (err) {
        if (active) setCustomerProfile(null);
        console.error("Không thể tải hồ sơ khách hàng:", err);
      }
    };

    loadCustomerProfile();
    return () => {
      active = false;
    };
  }, [customerId]);

  const orderSummaryRows = useMemo(() => ([
    ["Mã đơn hàng", order?.id ? `#ĐH-${order.id}` : "-"],
    ["Tên đơn hàng", order?.orderName ?? "-"],
    ["Loại đơn hàng", order?.type ?? "-"],
    ["Kích thước", order?.size ?? "-"],
    ["Màu sắc", order?.color ?? "-"],
    ["Số lượng", order?.quantity ? `${order.quantity}` : "-"],
    ["Ngày bắt đầu", formatOrderDate(order?.startDate)],
    ["Ngày kết thúc", formatOrderDate(order?.endDate)],
  ]), [order]);

  const templates = order?.templates ?? order?.template ?? order?.files ?? [];
  const softTemplates = templates.filter((t) => {
    const type = (t.type ?? "").toString().toLowerCase();
    return type.includes("soft") || !!t.file || !!t.url;
  });
  const normalizedStatus = normalizeOrderStatus(order?.status);
  const isAccepted = getOrderStatusLabel(normalizedStatus) === "Đã Chấp Nhận";

  const validate = () => {
    const nextErrors = {};
    if (!order?.id) nextErrors.orderId = "Vui lòng chọn đơn hàng.";
    if (!form.pmId) nextErrors.pmId = "Vui lòng chọn PM quản lý.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAccepted) {
      toast.error("Chỉ được tạo đơn sản xuất cho đơn hàng Đã Chấp Nhận.");
      return;
    }
    if (!validate()) return;

    const payload = {
      id: 0,
      pmId: Number(form.pmId),
      orderId: Number(order?.id ?? orderId),
      startDate: order?.startDate ?? "",
      endDate: order?.endDate ?? "",
      statusId: 0,
    };

    try {
      setIsSubmitting(true);
      await ProductionService.createProduction(payload);
      const nextStatus = "Chờ xét duyệt";
      const orderIdToUpdate = Number(order?.id ?? orderId);
      if (orderIdToUpdate) {
        try {
          let orderDetail = order;
          if (!orderDetail || !orderDetail.id) {
            const detailRes = await OrderService.getOrderDetail(orderIdToUpdate);
            orderDetail = detailRes?.data?.data ?? detailRes?.data ?? orderDetail;
          }
          const updatePayload = orderDetail ? { ...orderDetail, status: nextStatus } : { status: nextStatus };
          await OrderService.updateOrder(orderIdToUpdate, updatePayload);
          setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
        } catch (err) {
          console.error("Update order status error:", err?.response?.data ?? err);
        }
      }
      setShowSuccess(true);
    } catch (err) {
      console.error("Create production error:", err?.response?.data ?? err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.title || "Không thể tạo đơn sản xuất. Vui lòng thử lại.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px">
          <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
          <p className="text-gray-500 text-sm font-medium">Đang tải thông tin đơn hàng...</p>
        </div>
      </OwnerLayout>
    );
  }

  if (orderError) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px">
          <p className="text-red-600 text-sm font-semibold">{orderError}</p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Tạo đơn sản xuất thành công</h3>
              <p className="mt-2 text-sm text-slate-600">
                Đơn sản xuất đã được tạo thành công. Bạn có muốn chuyển về danh sách sản xuất không?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  onClick={() => navigate("/production")}
                >
                  Về danh sách sản xuất
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Tạo đơn sản xuất cho đơn hàng #{order?.id ?? "--"}
                </h1>
                <p className="text-slate-600">Thiết lập PM quản lý cho đơn sản xuất.</p>
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Hệ thống quản lý sản xuất GPMS
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <UserCheck size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin đơn sản xuất</h2>
                </div>

                {!isAccepted && order?.id && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    Chỉ được tạo đơn sản xuất cho đơn hàng có trạng thái <strong>Đã Chấp Nhận</strong>.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {!orderId && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Chọn đơn hàng</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="">
                          {ordersLoading ? "Đang tải đơn hàng..." : "Chọn đơn hàng"}
                        </option>
                        {orders
                          .filter((o) => {
                            const statusValue = o.statusName ?? o.status ?? o.statusText ?? o.state ?? o.statusId;
                            const label = getOrderStatusLabel(statusValue);
                            if (label === "Đã Chấp Nhận") return true;
                            const statusId = Number(statusValue);
                            return Number.isFinite(statusId) && statusId === 3;
                          })
                          .map((o) => (
                            <option key={o.id ?? o.orderId} value={o.id ?? o.orderId}>
                              #{o.id ?? o.orderId} - {o.orderName}
                            </option>
                          ))}
                      </select>
                      {ordersError && (
                        <div className="mt-2 text-xs text-red-600 font-semibold">{ordersError}</div>
                      )}
                      {errors.orderId && (
                        <div className="mt-2 text-xs text-red-600 font-semibold">{errors.orderId}</div>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">PM quản lý</label>
                    <select
                      name="pmId"
                      value={form.pmId}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      disabled={loadingPM}
                    >
                      <option value="">{loadingPM ? "Đang tải danh sách PM..." : "Chọn PM"}</option>
                      {pmUsers.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.fullName || pm.userName || `PM #${pm.id}`}
                        </option>
                      ))}
                      {currentUser && hasAnyRole(currentUser.role, ["Owner"]) && (
                        <option value={currentUser.userId}>
                          Giao việc cho tôi ({currentUser.fullName || currentUser.name || currentUser.userName})
                        </option>
                      )}
                    </select>

                    {pmError && (
                      <div className="mt-2 text-xs text-red-600 font-semibold">{pmError}</div>
                    )}
                    {errors.pmId && (
                      <div className="mt-2 text-xs text-red-600 font-semibold">{errors.pmId}</div>
                    )}
                  </div>

                  <div className="md:col-span-2 flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !isAccepted}
                      className="rounded-xl bg-emerald-600 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-400"
                    >
                      {isSubmitting ? "Đang tạo..." : "Tạo đơn sản xuất"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 text-slate-600 text-xs font-bold uppercase tracking-widest">
                  Thông tin đơn hàng
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-slate-100">
                  <div className="w-32 h-32 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-sm">
                    {order?.image ? (
                      <img src={order.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-slate-400">-</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    Thông tin tổng quan đơn hàng để đối chiếu trước khi giao cho PM quản lý.
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
                  {orderSummaryRows.map(([label, value]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
                        <span className="text-sm font-medium text-slate-700">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Package size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách vật liệu sản xuất</h2>
                </div>
                <div className="overflow-x-auto">
                  <MaterialsTable
                    materials={order?.materials ?? []}
                    variant="detail"
                    showImage
                    emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {isOwner && (
                <CustomerInfoCard
                  order={order}
                  profile={customerProfile}
                  title="Thông tin bổ sung"
                  nameLabel="Khách hàng"
                  phoneLabel="SĐT"
                  addressLabel="Địa chỉ"
                />
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mẫu thiết kế</h2>
                  <div className="space-y-2">
                    {softTemplates.length > 0 ? (
                      softTemplates.map((file, idx) => {
                        const fileName = file.templateName ?? file.name ?? `File ${idx + 1}`;
                        const fileUrl = file.file ?? file.url ?? "";
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText size={18} className="text-emerald-600 shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-700 truncate">{fileName}</p>
                                {file.size && <p className="text-[10px] text-slate-400 font-bold uppercase">{file.size}</p>}
                              </div>
                            </div>
                            {fileUrl ? (
                              <a href={fileUrl} download target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-600">
                                <Download size={16} />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">Không có link</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-4 text-slate-400 text-[11px] italic">Không có file thiết kế</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
