import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, FileText, Download, Package } from "lucide-react";
import WorkerService from "@/services/WorkerService";
import { formatOrderDate } from "@/lib/orders/formatters";
import MaterialsTable from "@/components/orders/MaterialsTable";
import { MATERIALS_TABLE_EMPTY_TEXT } from "@/lib/orders/materials";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";

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

  const production = useMemo(() => {
    const pid = Number(id);
    return MOCK_PRODUCTIONS.find((item) => Number(item.productionId) === pid) || null;
  }, [id]);

  const [pmUsers, setPmUsers] = useState([]);
  const [loadingPM, setLoadingPM] = useState(true);
  const [pmError, setPmError] = useState(null);

  const [form, setForm] = useState({
    pmId: production?.pmId ? String(production.pmId) : "",
    pStartDate: production?.pStartDate ?? "",
    pEndDate: production?.pEndDate ?? "",
    productionNote: production?.note ?? "",
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
      } catch (err) {
        if (!active) return;
        setPmError("Không thể tải danh sách PM.");
      } finally {
        if (active) setLoadingPM(false);
      }
    };
    fetchPMs();
    return () => { active = false; };
  }, []);

  if (!production) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Không tìm thấy production #{id}.
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

  const validate = () => {
    const nextErrors = {};
    if (!form.pmId) nextErrors.pmId = "Vui lòng chọn PM quản lý.";
    if (!form.pStartDate) nextErrors.pStartDate = "Vui lòng chọn ngày bắt đầu.";
    if (!form.pEndDate) nextErrors.pEndDate = "Vui lòng chọn ngày kết thúc.";
    if (form.pStartDate && form.pEndDate && new Date(form.pStartDate) > new Date(form.pEndDate)) {
      nextErrors.pEndDate = "Ngày kết thúc không được trước ngày bắt đầu.";
    }
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
      alert("Cập nhật production thành công!");
      navigate(`/production/${production.productionId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OwnerLayout>
      <div className="max-w-6xl mx-auto py-6 px-4 font-sans text-gray-900 space-y-6">
        <div className="flex items-center gap-4 border-b pb-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded text-gray-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Cập nhật Production #PR-{production.productionId}</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">
              Hệ thống quản lý sản xuất GPMS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5">
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <UserCheck size={16} />
                <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin Production</h2>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 mb-2 block">PM quản lý</label>
                  <select
                    name="pmId"
                    value={form.pmId}
                    onChange={handleChange}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
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

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Ngày bắt đầu sản xuất</label>
                  <input
                    type="date"
                    name="pStartDate"
                    value={form.pStartDate}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${
                      errors.pStartDate
                        ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100"
                        : "border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                    }`}
                  />
                  {errors.pStartDate && (
                    <div className="mt-2 text-xs text-red-600 font-semibold">{errors.pStartDate}</div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Ngày kết thúc sản xuất</label>
                  <input
                    type="date"
                    name="pEndDate"
                    value={form.pEndDate}
                    onChange={handleChange}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all outline-none ${
                      errors.pEndDate
                        ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-100"
                        : "border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white"
                    }`}
                  />
                  {errors.pEndDate && (
                    <div className="mt-2 text-xs text-red-600 font-semibold">{errors.pEndDate}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 mb-2 block">Ghi chú Production</label>
                  <textarea
                    name="productionNote"
                    rows={3}
                    value={form.productionNote}
                    onChange={handleChange}
                    placeholder="Nhập ghi chú cho production..."
                    className="block w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/30 transition-all outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 text-gray-600 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:bg-emerald-400"
                  >
                    {isSubmitting ? "Đang cập nhật..." : "Cập nhật Production"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 text-gray-600 text-xs font-bold uppercase tracking-widest">
                Thông tin đơn hàng
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center border-b border-gray-100">
                <div className="w-32 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shadow-sm">
                  {order?.image ? (
                    <img src={order.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-gray-400">-</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  Thông tin tổng quan đơn hàng để đối chiếu trước khi giao cho PM quản lý.
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100">
                {[
                  ["Mã đơn hàng", order?.id ? `#ĐH-${order.id}` : "-"],
                  ["Tên đơn hàng", order?.orderName ?? "-"],
                  ["Loại đơn hàng", order?.type ?? "-"],
                  ["Kích thước", order?.size ?? "-"],
                  ["Màu sắc", order?.color ?? "-"],
                  ["Số lượng", order?.quantity ? `${order.quantity}` : "-"],
                  ["Ngày bắt đầu", formatOrderDate(order?.startDate)],
                  ["Ngày kết thúc", formatOrderDate(order?.endDate)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>
                      <span className="text-sm font-medium text-gray-700">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-gray-600">
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
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">
                Thông tin bổ sung
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Khách hàng</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {order?.customerName || order?.userName || order?.fullName || order?.user?.fullName || order?.user?.name || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">SĐT</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {order?.customerPhone || order?.phone || order?.phoneNumber || order?.user?.phoneNumber || order?.user?.phone || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Địa chỉ</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {order?.customerAddress || order?.address || order?.location || order?.user?.address || order?.user?.location || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5 space-y-5">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mẫu thiết kế bản mềm</h2>
                <div className="space-y-2">
                  {softTemplates.length > 0 ? (
                    softTemplates.map((file, idx) => {
                      const fileName = file.templateName ?? file.name ?? `File ${idx + 1}`;
                      const fileUrl = file.file ?? file.url ?? "";
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded border border-gray-100 hover:border-emerald-200 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText size={18} className="text-emerald-600 shrink-0" />
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-gray-700 truncate">{fileName}</p>
                              {file.size && <p className="text-[10px] text-gray-400 font-bold uppercase">{file.size}</p>}
                            </div>
                          </div>
                          {fileUrl ? (
                            <a href={fileUrl} download target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-600">
                              <Download size={16} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400">Không có link</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-4 text-gray-400 text-[11px] italic">Không có file thiết kế</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bản cứng</h2>
                <div className="text-sm font-semibold text-gray-700">
                  Số lượng bản cứng: <span className="text-emerald-700">{hardCopyTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
