import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Package, FileText, Download } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import MaterialsTable from "@/components/orders/MaterialsTable";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import { formatOrderDate } from "@/lib/orders/formatters";
import OrderStatusReasonModal from "@/components/orders/OrderStatusReasonModal";
import ProductionService from "@/services/ProductionService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    status: "In Progress",
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

const STATUS_STYLES = {
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function ProductionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const normalizeDetail = (payload) => {
      if (!payload) return null;
      const statusMap = { 1: "Planned", 2: "In Progress", 3: "Completed" };
      const order = payload.order || {};
      return {
        productionId: payload.productionId ?? payload.id ?? null,
        status: payload.statusName || statusMap[payload.statusId] || payload.status || "Planned",
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
        if (!fallback) setError(`Không tìm thấy production #${id}.`);
      } catch (err) {
        if (!active) return;
        setError("Không thể tải chi tiết production.");
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

  if (loading) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Đang tải chi tiết production...
        </div>
      </OwnerLayout>
    );
  }

  if (!production) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          {error || `Không tìm thấy production #${id}.`}
        </div>
      </OwnerLayout>
    );
  }

  const order = production.order || {};
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
                  Chi tiết Production #PR-{production.productionId}
                </h1>
                <p className="text-slate-600">Theo dõi thông tin production và đơn hàng liên quan.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${STATUS_STYLES[production.status] || STATUS_STYLES.default}`}>
                {production.status}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/production/${production.productionId}/edit`)}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => { setPendingAction("reject"); setIsReasonModalOpen(true); }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => { setPendingAction("revise"); setIsReasonModalOpen(true); }}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
              >
                Yêu cầu chỉnh sửa
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
              <Info size={16} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin Production</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100">
            <DetailRow label="Production ID" value={`#PR-${production.productionId}`} />
            <DetailRow label="Trạng thái" value={production.status} />
            <DetailRow label="PM quản lý" value={production.pmName || (production.pmId ? `PM #${production.pmId}` : "-")} />
            <DetailRow label="Ngày bắt đầu (Production)" value={production.pStartDate} />
            <DetailRow label="Ngày kết thúc (Production)" value={production.pEndDate} />
            </div>
            <div className="p-5 border-t border-slate-100 bg-amber-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú Production</p>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                {production.note || "Không có ghi chú cho production này."}
              </p>
            </div>
          </div>

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
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Thông tin khách hàng
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Họ tên</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order.customerName || order.userName || order.fullName || order?.user?.fullName || order?.user?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">SĐT</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order.customerPhone || order.phone || order.phoneNumber || order?.user?.phoneNumber || order?.user?.phone || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Địa chỉ</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {order.customerAddress || order.address || order.location || order?.user?.address || order?.user?.location || "-"}
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
      <OrderStatusReasonModal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        onSubmit={(reason) => {
          const actionLabel = pendingAction === "reject" ? "Từ chối" : "Yêu cầu chỉnh sửa";
          alert(`${actionLabel} production với lý do: ${reason}`);
          setIsReasonModalOpen(false);
        }}
        title={pendingAction === "reject" ? "Từ chối production" : "Yêu cầu chỉnh sửa production"}
        description={pendingAction === "reject"
          ? "Vui lòng nhập lý do từ chối để lưu vào hệ thống."
          : "Vui lòng nhập lý do yêu cầu chỉnh sửa."}
        confirmText={pendingAction === "reject" ? "Xác nhận từ chối" : "Gửi yêu cầu"}
        tone={pendingAction === "reject" ? "danger" : "warning"}
      />
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








