import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, FileText, Download, Package } from "lucide-react";
import WorkerService from "@/services/WorkerService";
import ProductionService from "@/services/ProductionService";
import { formatOrderDate } from "@/lib/orders/formatters";
import MaterialsTable from "@/components/orders/MaterialsTable";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    status: "In Progress",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    note: "Ưu tiên hoàn thành trước 05/05 do sự kiện nội bộ.",
    pmId: 7,
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
      templates: [
        { templateName: "Mẫu áo", type: "SOFT", file: "" },
      ],
      customerName: "Công ty ABC",
      customerPhone: "0901234567",
      customerAddress: "Q.1, TP.HCM",
    },
  },
  {
    productionId: 1002,
    status: "Planned",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    note: "Đang chờ duyệt mẫu in.",
    pmId: 9,
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

export default function UpdateProduction() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [production, setProduction] = useState(null);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const [productionError, setProductionError] = useState("");

  const [pmUsers, setPmUsers] = useState([]);
  const [loadingPM, setLoadingPM] = useState(true);
  const [pmError, setPmError] = useState(null);

  const [form, setForm] = useState({
    pmId: "",
    pStartDate: "",
    pEndDate: "",
    productionNote: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchPMs = async () => {
      try {
        setLoadingPM(true);
        const response = await WorkerService.getAllEmployees();
        const items = response?.data ?? [];
        const pms = items.filter((item) =>
          item?.primaryRole === "PM" || (Array.isArray(item?.roles) && item.roles.includes("PM"))
        );
        if (!active) return;
        setPmUsers(pms);
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
    const normalizeDetail = (payload) => {
      if (!payload) return null;
      const order = payload.order || {};
      return {
        productionId: payload.productionId ?? payload.id ?? null,
        status: payload.statusName || payload.status || "",
        pStartDate: payload.startDate || payload.pStartDate || "",
        pEndDate: payload.endDate || payload.pEndDate || "",
        pmId: payload.pm?.id ?? payload.pmId ?? null,
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
        setLoadingProduction(true);
        setProductionError("");
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
        if (!fallback) setProductionError(`Không tìm thấy production #${id}.`);
      } catch (_err) {
        if (!active) return;
        setProductionError("Không thể tải thông tin production.");
        const fallback = MOCK_PRODUCTIONS.find((item) => String(item.productionId) === String(id)) || null;
        setProduction(fallback);
      } finally {
        if (active) setLoadingProduction(false);
      }
    };

    fetchProduction();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!production) return;
    setForm({
      pmId: production?.pmId ? String(production.pmId) : "",
      pStartDate: production?.pStartDate ?? "",
      pEndDate: production?.pEndDate ?? "",
      productionNote: production?.note ?? "",
    });
  }, [production]);

  const order = production?.order || {};
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

  if (loadingProduction) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Đang tải thông tin production...
        </div>
      </OwnerLayout>
    );
  }

  if (!production) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          {productionError || `Không tìm thấy production #${id}.`}
        </div>
      </OwnerLayout>
    );
  }

  const templates = order.templates ?? order.template ?? order.files ?? [];
  const softTemplates = templates.filter((t) => {
    const type = (t.type ?? "").toString().toLowerCase();
    return type.includes("soft") || !!t.file || !!t.url;
  });
  const hardTemplates = templates.filter((t) => {
    const type = (t.type ?? "").toString().toLowerCase();
    return type.includes("hard");
  });
  const hardCopyTotal = hardTemplates.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

  const validate = () => {
    const nextErrors = {};
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
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await ProductionService.updateProductionPm(production.productionId, form.pmId);
      alert("Cập nhật PM quản lý thành công!");
      navigate(`/production/${production.productionId}`);
    } catch (_err) {
      alert("Không thể cập nhật PM quản lý.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
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
                  Cập nhật Production #PR-{production.productionId}
                </h1>
                <p className="text-slate-600">Thiết lập PM quản lý cho production.</p>
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
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin Production</h2>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    </select>
                    {pmError && (
                      <div className="mt-2 text-xs text-red-600 font-semibold">{pmError}</div>
                    )}
                    {errors.pmId && (
                      <div className="mt-2 text-xs text-red-600 font-semibold">{errors.pmId}</div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Ghi chú Production</label>
                    <textarea
                      name="productionNote"
                      rows={3}
                      value={form.productionNote}
                      onChange={handleChange}
                      placeholder="Nhập ghi chú cho production..."
                      disabled
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />
                    <div className="mt-2 text-[11px] text-slate-400">
                      Ghi chú chỉ hiển thị, không cập nhật ở màn này.
                    </div>
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
                      disabled={isSubmitting}
                      className="rounded-xl bg-emerald-600 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-emerald-400"
                    >
                      {isSubmitting ? "Đang cập nhật..." : "Cập nhật PM"}
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
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Thông tin bổ sung
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Khách hàng</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order?.customerName || order?.userName || order?.fullName || order?.user?.fullName || order?.user?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">SĐT</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order?.customerPhone || order?.phone || order?.phoneNumber || order?.user?.phoneNumber || order?.user?.phone || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Địa chỉ</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order?.customerAddress || order?.address || order?.location || order?.user?.address || order?.user?.location || "-"}
                    </span>
                  </div>
                </div>
              </div>

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
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}








