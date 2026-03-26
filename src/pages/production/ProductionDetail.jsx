import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Package, FileText, Download, AlertTriangle } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import MaterialsTable from "@/components/orders/MaterialsTable";
import CustomerInfoCard from "@/components/orders/CustomerInfoCard";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { formatOrderDate } from "@/lib/orders/formatters";
import { getOrderCustomerId } from "@/lib/orders/customerInfo";
import OrderStatusReasonModal from "@/components/orders/OrderStatusReasonModal";
import SuccessModal from "@/components/SuccessModal";
import ProductionService from "@/services/ProductionService";
import { STATUS_STYLES as PRODUCTION_STATUS_STYLES, getProductionStatusLabel } from "@/utils/statusUtils";
import { userService } from "@/services/UserService";
import ProductionPartService from "@/services/ProductionPartService";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import { toast } from "react-toastify";
import Pagination from "@/components/Pagination";
import { Link } from "react-router-dom";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/roleAccess";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    status: "Đang Sản Xuất",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    note: "Ưu tiên hoàn thành trước 05/05 do sự kiện nội bộ.",
    order: {
      id: 29,
      orderName: "Đồng phục công ty ABC",
      type: "Đồng phục",
      size: "L",
      color: "Trắng",
      quantity: 100,
      cpu: 15000,
      startDate: "2026-04-15",
      endDate: "2026-05-05",
      status: "Đã chấp nhận",
      image: "",
      note: "Giao trong giờ hành chính.",
      materials: [
        { materialName: "Vải cotton", value: 120, uom: "m", note: "Cotton 65/35" },
        { materialName: "Cúc áo", value: 100, uom: "cái", note: "Màu trắng" },
      ],
      templates: [{ templateName: "Mẫu áo", type: "SOFT", file: "" }],
      customerName: "Công ty ABC",
      customerPhone: "0901234567",
      customerAddress: "Q.1, TP.HCM",
    },
  },
  {
    productionId: 1002,
    status: "Chờ Xét Duyệt Kế Hoạch",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    note: "Đang chờ duyệt mẫu in.",
    order: {
      id: 30,
      orderName: "Áo hoodie mùa đông",
      type: "Hoodie",
      size: "M",
      color: "Đen",
      quantity: 80,
      cpu: 22000,
      startDate: "2026-04-10",
      endDate: "2026-04-30",
      status: "Đã chấp nhận",
      image: "",
      note: "In logo trước ngực.",
      materials: [],
      templates: [],
      customerName: "Shop XYZ",
      customerPhone: "0912345678",
      customerAddress: "Q.3, TP.HCM",
    },
  },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getProductionDurationText(startDate, endDate) {
  const startUtc = toUtcDateOnly(startDate);
  const endUtc = toUtcDateOnly(endDate);
  if (startUtc === null || endUtc === null || endUtc < startUtc) return "-";

  const days = Math.floor((endUtc - startUtc) / DAY_IN_MS) + 1;
  return `${days} ngày`;
}

export default function ProductionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isRejectSuccessModalOpen, setIsRejectSuccessModalOpen] = useState(false);

  const [production, setProduction] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [rejectReason, setRejectReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  const [reportedErrorCount, setReportedErrorCount] = useState(0);
  const [checkingCuttingBook, setCheckingCuttingBook] = useState(false);

  const currentUser = getStoredUser();
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
  const isPM = hasAnyRole(roleValue, ["pm", "manager"]);
  const isWorker = hasAnyRole(roleValue, ["worker", "kcs", "team leader"]);
  const customerId = getOrderCustomerId(production?.order);

  useEffect(() => {
    let active = true;

    const normalizeDetail = (payload) => {
      if (!payload) return null;

      const resolvedStatus = getProductionStatusLabel(
        payload.statusName ?? payload.status ?? payload.statusId
      );

      const order = payload.order || {};
      return {
        productionId: payload.productionId ?? payload.id ?? null,
        status: resolvedStatus === "-" ? getProductionStatusLabel(1) : resolvedStatus,
        pStartDate: payload.startDate || payload.pStartDate || "",
        pEndDate: payload.endDate || payload.pEndDate || "",
        pmId: payload.pm?.id ?? payload.pmId ?? null,
        pmName: payload.pm?.name ?? payload.pmName ?? "",
        note: payload.note ?? payload.productionNote ?? "",
        order: {
          ...order,
          size: typeof order.size === "string" ? order.size.trim() : order.size,
          status: order.statusName ?? order.status,
          templates: Array.isArray(order.templates)
            ? order.templates.map((t) => ({ ...t, templateName: t.templateName ?? t.name }))
            : order.templates,
          materials: Array.isArray(order.materials)
            ? order.materials.map((m) => ({ ...m, materialName: m.materialName ?? m.name }))
            : order.materials,
        },
      };
    };

    const fetchProduction = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;

        const payload = response?.data?.data ?? response?.data ?? null;
        const normalized = normalizeDetail(payload);
        if (normalized) {
          setProduction(normalized);
          return;
        }

        const fallback = MOCK_PRODUCTIONS.find((item) => String(item.productionId) === String(id)) || null;
        setProduction(fallback);
        if (!fallback) setError(`Không tìm thấy đơn sản xuất #${id}.`);
      } catch (_err) {
        if (!active) return;
        setError("Không thể tải chi tiết đơn sản xuất.");
        const fallback = MOCK_PRODUCTIONS.find((item) => String(item.productionId) === String(id)) || null;
        setProduction(fallback);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProduction();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const loadCustomerProfile = async () => {
      if (!customerId) {
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

  useEffect(() => {
    let active = true;

    const fetchRejectReason = async () => {
      if (!production?.productionId) return;
      const rejLabel = getProductionStatusLabel(2); // "Từ Chối"
      const isRejected =
        String(production.status ?? "").trim().toLowerCase() ===
        String(rejLabel).trim().toLowerCase();
      console.debug("[rejectReason] status:", production.status, "isRejected:", isRejected);
      if (!isRejected) {
        if (active) setRejectReason(null);
        return;
      }
      try {
        const res = await ProductionService.getProductionRejectReason(production.productionId);
        // axiosClient interceptor already returns response.data, so res = API body = {data: {...}}
        const data = res?.data ?? null;
        console.debug("[rejectReason] data:", data);
        if (active) setRejectReason(data);
      } catch (err) {
        console.error("[rejectReason] fetch error:", err);
        if (active) setRejectReason(null);
      }
    };

    fetchRejectReason();
    return () => { active = false; };
  }, [production?.productionId, production?.status]);

  useEffect(() => {
    let active = true;
    const fetchParts = async () => {
      if (!production?.productionId) return;
      try {
        const res = await ProductionPartService.getPartsByProduction(production.productionId, {
          PageIndex: 0,
          PageSize: 50,
          SortColumn: "Name",
          SortOrder: "ASC",
        });
        if (!active) return;
        const list = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        setSteps(list);
        setTotalParts(list.length);
      } catch (err) { console.error("Lỗi tải công đoạn:", err); }
    };
    fetchParts();
    return () => { active = false; };
  }, [production?.productionId]);

  useEffect(() => {
    if (!production?.productionId) return;
    try {
      const raw = localStorage.getItem("gpms-error-reports");
      if (!raw) return setReportedErrorCount(0);
      const list = JSON.parse(raw);
      const count = (Array.isArray(list) ? list : []).filter(i => String(i?.productionId) === String(production.productionId)).length;
      setReportedErrorCount(count);
    } catch { setReportedErrorCount(0); }
  }, [production?.productionId]);

  const pageData = useMemo(() => {
    const start = pageIndex * pageSize;
    return steps.slice(start, start + pageSize);
  }, [steps, pageIndex]);

  const totalCpu = steps.reduce((sum, s) => sum + (Number(s.cpu) || 0), 0);
  const progressSummary = useMemo(() => {
    const total = totalParts || steps?.length || 0;
    const today = new Date();
    const completedCount = steps.filter((row) => {
      if (row.status === "Hoàn thành") return true;
      const raw = row.endDate;
      if (!raw || raw === "-") return false;
      const parsed = new Date(raw);
      return Number.isFinite(parsed.getTime()) && parsed <= today;
    }).length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { completed: completedCount, total, percent };
  }, [steps, totalParts]);

  const order = production?.order || {};
  const isApprovedProduction = production?.status && !["Chờ Xét Duyệt", "Từ Chối", "-"].includes(production.status);
  const softTemplates = Array.isArray(order.templates) ? order.templates.filter(t => t.type !== "HARD") : [];
  const hardCopyTotal = Array.isArray(order.templates) ? order.templates.filter(t => t.type === "HARD").length : 0;
  const progressPercent = steps.length > 0 ? Math.round((steps.filter(s => s.status === "Hoàn thành").length / steps.length) * 100) : 0;

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Đang tải chi tiết đơn sản xuất...
        </div>
      </OwnerLayout>
    );
  }

  if (!production) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          {error || `Không tìm thấy đơn sản xuất #${id}.`}
        </div>
      </OwnerLayout>
    );
  }

  const rejectedStatusLabel = getProductionStatusLabel(2); // "Từ Chối"
  const isRejectedProduction = String(production?.status ?? "").trim().toLowerCase() === String(rejectedStatusLabel).trim().toLowerCase();
  const isActionLocked = isApprovedProduction || isRejectedProduction;

  const productionStartDateText = formatOrderDate(production.pStartDate);
  const productionEndDateText = formatOrderDate(production.pEndDate);
  const productionDateRangeText =
    productionStartDateText === "-" && productionEndDateText === "-"
      ? "-"
      : `${productionStartDateText} -> ${productionEndDateText}`;
  const productionDurationText = getProductionDurationText(production.pStartDate, production.pEndDate);

  const handleApproveProduction = async () => {
    if (isActionLocked) return;
    try {
      const userId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      if (!userId) {
        alert("Không tìm thấy thông tin người dùng.");
        return;
      }
      await ProductionService.approveProduction(production.productionId, { userId });
      setProduction((prev) => (prev ? { ...prev, status: getProductionStatusLabel(4) } : prev));
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Lỗi khi chấp nhận đơn sản xuất:", err);
      const errorMsg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi chấp nhận đơn sản xuất.";
      alert(errorMsg);
    }
  };

  const handleRejectProduction = async (reason) => {
    if (isActionLocked) return;
    try {
      const userId = currentUser?.id ?? currentUser?.userId ?? currentUser?.accountId;
      if (!userId) {
        alert("Không tìm thấy thông tin người dùng.");
        return;
      }
      await ProductionService.rejectProduction(production.productionId, { userId, reason });
      setProduction((prev) => (prev ? { ...prev, status: getProductionStatusLabel(2) } : prev));
      setIsReasonModalOpen(false);
      setIsRejectSuccessModalOpen(true);
    } catch (err) {
      console.error("Lỗi khi từ chối đơn sản xuất:", err);
      const errorMsg = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi từ chối đơn sản xuất.";
      alert(errorMsg);
    }
  };

  const handleOpenCuttingBook = async () => {
    if (!production?.productionId || checkingCuttingBook) return;
    setCheckingCuttingBook(true);
    try {
      navigate("/worker/cutting-book", {
        state: {
          productionId: production.productionId,
          production,
          product: { ...production.order, productName: production.order.orderName },
          openCuttingBookMode: "list", // Default to list view
          filterByProduction: true,
        },
      });
    } finally { setCheckingCuttingBook(false); }
  };

  const handleApprovePlan = async () => {
    if (!window.confirm("Chấp nhận kế hoạch này?")) return;
    try {
      await ProductionService.approveProductionPlan(production.productionId);
      toast.success("Đã duyệt kế hoạch");
      window.location.reload();
    } catch (err) { toast.error("Không thể duyệt kế hoạch"); }
  };

  const handleRequestPlanUpdate = async () => {
    if (!window.confirm("Yêu cầu sửa lại kế hoạch?")) return;
    try {
      await ProductionService.requestPlanUpdate(production.productionId);
      toast.success("Đã gửi yêu cầu sửa");
      window.location.reload();
    } catch (err) { toast.error("Không thể gửi yêu cầu"); }
  };

  const handleSubmitPlan = async () => {
    if (steps.length === 0) {
      toast.warn("Vui lòng tạo ít nhất một công đoạn trước khi gửi duyệt.");
      return;
    }
    if (!window.confirm("Gửi kế hoạch này cho Owner duyệt?")) return;
    try {
      await ProductionService.submitProductionPlan(production.productionId);
      toast.success("Đã gửi duyệt kế hoạch.");
      window.location.reload();
    } catch (err) {
      toast.error("Không thể gửi duyệt kế hoạch.");
    }
  };

  const statusName = String(production?.status ?? "").trim();
  const isPendingApproval = statusName === "Chờ Xét Duyệt";
  const isAccepted = statusName === "Chấp Nhận";
  const isPendingPlanApproval = statusName === "Chờ Xét Duyệt Kế Hoạch";
  const isNeedUpdatePlan = statusName === "Cần Chỉnh Sửa Kế Hoạch";
  const isInProduction = statusName === "Đang Sản Xuất";

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button onClick={() => navigate(-1)}
                className="cursor-pointer mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Chi tiết đơn sản xuất #PR-{production.productionId}
                </h1>
                <p className="text-slate-600">Theo dõi thông tin đơn sản xuất và đơn hàng liên quan.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Nút cho Owner duyệt ĐƠN sản xuất ban đầu */}
              {isPM && isPendingApproval && (
                <>
                  <button type="button"
                    onClick={() => setIsApproveModalOpen(true)}
                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Chấp nhận đơn
                  </button>
                  <button type="button"
                    onClick={() => setIsReasonModalOpen(true)}
                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Từ chối đơn
                  </button>
                </>
              )}

              {/* Nút cho Owner duyệt KẾ HOẠCH sau khi PM gửi */}
              {isOwner && isPendingPlanApproval && (
                <>
                  <button type="button"
                    onClick={handleApprovePlan}
                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                  >
                    Duyệt KH
                  </button>
                  <button type="button"
                    onClick={handleRequestPlanUpdate}
                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Yêu cầu sửa KH
                  </button>
                </>
              )}

              {/* Nút cho PM lập kế hoạch và gửi duyệt */}
              {(isPM || isOwner) && (isAccepted || isNeedUpdatePlan) && (
                <>
                  <Link
                    to="/production-plan/create"
                    state={{ productionId: production.productionId, steps }}
                    className="rounded-xl border border-emerald-600 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    {steps.length > 0 ? "Chỉnh sửa công đoạn" : "Thiết kế công đoạn"}
                  </Link>
                  {steps.length > 0 && (
                    <button type="button"
                      onClick={handleSubmitPlan}
                      className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-md"
                    >
                      Gửi duyệt kế hoạch
                    </button>
                  )}
                </>
              )}

              {/* Các nút khi đã duyệt kế hoạch hoặc đang sản xuất */}
              {(isPM || isOwner || isWorker) && (isInProduction || isPendingPlanApproval || isAccepted) && (
                <button type="button"
                  onClick={handleOpenCuttingBook}
                  disabled={checkingCuttingBook}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {checkingCuttingBook ? "Đang kiểm tra..." : "Sổ cắt"}
                </button>
              )}

              {(isPM || isOwner) && (isInProduction || isPendingPlanApproval) && (
                <Link
                  to={`/production-plan/assign/${production.productionId}`}
                  state={{ production, product: { ...order, productName: order.orderName }, steps }}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
                >
                  {steps.some(s => Array.isArray(s.assignees) && s.assignees.length > 0)
                    ? "Chỉnh sửa phân công"
                    : "Phân công lao động"}
                </Link>
              )}

              {/* Nút Sửa chung cho Owner */}
              {isOwner && (
                <button type="button"
                  onClick={() => navigate(`/production/${production.productionId}/edit`, { state: { production } })}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-50"
                  title="Chỉnh sửa thông tin chung"
                >
                  <FileText size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
              <Info size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin đơn sản xuất</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
              <DetailRow label="Mã đơn sản xuất" value={`#PR-${production.productionId}`} />
              <DetailRow label="Trạng thái" value={production.status} />
              <DetailRow label="PM quản lý" value={production.pmName || (production.pmId ? `PM #${production.pmId}` : "-")} />
              <DetailRow label="Thời gian thực hiện" value={productionDateRangeText} />
              <DetailRow label="Số ngày thực hiện" value={productionDurationText} />
            </div>
            <div className="p-5 border-t border-slate-100 bg-amber-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú đơn sản xuất</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                {production.note || "Không có ghi chú cho đơn sản xuất này."}
              </p>
            </div>
          </div>

          {isRejectedProduction && rejectReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-red-100 bg-red-100/60 flex items-center gap-2 text-red-700">
                <AlertTriangle size={16} />
                <h2 className="text-xs font-bold uppercase tracking-widest">Lý do từ chối</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-red-800 leading-relaxed italic">
                  {rejectReason.reason || "Không có lý do được ghi nhận."}
                </p>
                {rejectReason.createdAt && (
                  <p className="mt-3 text-[11px] text-red-400 font-medium">
                    Thời gian từ chối:{" "}
                    {new Date(rejectReason.createdAt).toLocaleString("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin đơn hàng</h2>
                </div>
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Ảnh đơn hàng</div>
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                    <div className="w-32 h-32 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-sm">
                      {order.image ? (
                        <img src={order.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Ảnh tham khảo tổng quan đơn hàng để đối chiếu trước khi sản xuất.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
                  <DetailRow label="Mã đơn hàng" value={order.id ? `#ĐH-${order.id}` : "-"} />
                  <DetailRow label="Tên đơn hàng" value={order.orderName} />
                  <DetailRow label="Loại đơn hàng" value={order.type} />
                  <DetailRow label="Màu sắc" value={order.color} />
                  <DetailRow label="Kích thước" value={order.size} />
                  <DetailRow label="Số lượng" value={order.quantity ? `${order.quantity}` : "-"} />
                  <DetailRow label="Đơn giá" value={order.cpu ? `${order.cpu} VND/SP` : "-"} />
                  <DetailRow label="Tổng tiền" value={order.quantity && order.cpu ? `${(order.quantity * order.cpu).toLocaleString("vi-VN")} VND` : "-"} />
                  <DetailRow label="Ngày bắt đầu" value={formatOrderDate(order.startDate)} />
                  <DetailRow label="Ngày kết thúc" value={formatOrderDate(order.endDate)} />
                  <DetailRow label="Trạng thái" value={order.status} />
                </div>
                <div className="p-5 border-t border-slate-100 bg-amber-50/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú đơn hàng</p>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    {order.note || "Không có ghi chú bổ sung cho đơn hàng này."}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Package size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách vật liệu sản xuất</h2>
                </div>
                <MaterialsTable
                  materials={order.materials ?? []}
                  variant="detail"
                  showImage
                  emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                />
              </div>

              {isApprovedProduction && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Tổng hợp tiến độ</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Lỗi báo cáo</div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-lg font-bold text-slate-900">{reportedErrorCount}</span>
                          <Link to={`/production/${production.productionId}/errors`} className="text-[10px] font-bold text-emerald-700 hover:underline">Chi tiết</Link>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Hiệu suất</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{progressSummary.percent}%</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Hoàn thành</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{progressSummary.completed}/{progressSummary.total}</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Lương công đoạn</div>
                        <div className="mt-1 text-lg font-bold text-emerald-700">{totalCpu.toLocaleString("vi-VN")} đ</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600">Danh sách công đoạn & nhiệm vụ</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">STT</th>
                            <th className="px-4 py-3 text-left">Tên công đoạn</th>
                            <th className="px-4 py-3 text-left">Thợ được giao</th>
                            <th className="px-4 py-3 text-left">Bắt đầu</th>
                            <th className="px-4 py-3 text-left">Kết thúc</th>
                            <th className="px-4 py-3 text-right">Giá/SP</th>
                            <th className="px-4 py-3 text-center">Trạng thái</th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pageData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-400">{(pageIndex * pageSize + idx + 1).toString().padStart(2, '0')}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{row.partName || row.name}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(row.assignees) && row.assignees.length > 0 ? (
                                    row.assignees.map((w, wIdx) => (
                                      <span key={wIdx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                                        {w.fullName || w.name || w.id}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-300 italic text-[11px]">Chưa giao</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{formatOrderDate(row.startDate)}</td>
                              <td className="px-4 py-3 text-slate-600">{formatOrderDate(row.endDate)}</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">{Number(row.cpu).toLocaleString('vi-VN')} đ</td>
                              <td className="px-4 py-3 text-center text-[10px] font-bold uppercase">
                                <span className={`px-2 py-1 rounded-full ${row.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {row.status || 'Đang chờ'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Link to="/worker/error-report" state={{ assignment: { ...row, productionId: production.productionId, orderName: order.orderName } }} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline">Báo lỗi</Link>
                              </td>
                            </tr>
                          ))}
                          {steps.length === 0 && (
                            <tr><td colSpan="8" className="py-10 text-center text-slate-400 italic">Chưa lập kế hoạch công đoạn</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalParts > pageSize && (
                      <div className="p-4 border-t border-slate-100">
                        <Pagination currentPage={pageIndex + 1} totalPages={Math.ceil(totalParts / pageSize)} onPageChange={(p) => setPageIndex(p - 1)} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <CustomerInfoCard
                order={order}
                profile={customerProfile}
                title="Thông tin khách hàng"
                nameLabel="Họ tên"
                phoneLabel="SĐT"
                addressLabel="Địa chỉ"
              />

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Mẫu thiết kế bản mềm</h2>
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

                <div className="border-t border-slate-100 pt-4">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Bản cứng</h2>
                  <div className="text-sm font-semibold text-slate-700">
                    Số lượng bản cứng: <span className="text-emerald-700">{hardCopyTotal}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-rose-700 mb-3">
                  Tổng hợp lỗi
                </div>
                <p className="text-sm text-rose-800 mb-4">
                  Xem nhanh các lỗi đã báo cáo liên quan đến đơn sản xuất này.
                </p>
                <button type="button"
                  onClick={() => navigate(`/production/${production.productionId}/errors`)}
                  className="cursor-pointer w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Xem tổng hợp lỗi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isOwner && (
        <>
          <OrderStatusReasonModal
            isOpen={isReasonModalOpen}
            onClose={() => setIsReasonModalOpen(false)}
            onSubmit={handleRejectProduction}
            title="Từ chối đơn sản xuất"
            description="Vui lòng nhập lý do từ chối để lưu vào hệ thống."
            confirmText="Xác nhận từ chối"
            tone="danger"
            requireReason
          />
          <OrderStatusReasonModal
            isOpen={isApproveModalOpen}
            onClose={() => setIsApproveModalOpen(false)}
            onSubmit={() => {
              handleApproveProduction();
              setIsApproveModalOpen(false);
            }}
            title="Chấp nhận đơn sản xuất"
            description="Bạn có chắc muốn chấp nhận đơn sản xuất này không?"
            confirmText="Xác nhận"
            tone="warning"
            requireReason={false}
          />
          <SuccessModal
            isOpen={isSuccessModalOpen}
            onClose={() => setIsSuccessModalOpen(false)}
            onPrimary={() => navigate("/production")}
            title="Duyệt thành công"
            description={`Đơn sản xuất #PR-${production?.productionId} đã được chấp nhận.`}
            primaryLabel="Về danh sách"
            hideSecondary={true}
          />
          <SuccessModal
            isOpen={isRejectSuccessModalOpen}
            onClose={() => setIsRejectSuccessModalOpen(false)}
            onPrimary={() => navigate("/production")}
            title="Từ chối thành công"
            description={`Đơn sản xuất #PR-${production?.productionId} đã bị từ chối.`}
            primaryLabel="Về danh sách"
            hideSecondary={true}
          />
        </>
      )}
    </OwnerLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value || "-"}</span>
    </div>
  );
}
