import { useMemo, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PLAN_DETAILS = [
  {
    planId: 5001,
    production: {
      productionId: 1001,
      orderId: 29,
      orderName: "Đồng phục công ty ABC",
      pStartDate: "2026-04-21",
      pEndDate: "2026-05-05",
      status: "Đang sản xuất",
      pmName: "Nguyễn Văn An",
    },
    product: {
      productCode: "PRD-ABC-01",
      productName: "Áo thun đồng phục cổ tròn",
      type: "Áo thun",
      size: "L",
      color: "Trắng",
      quantity: 100,
      cpu: 15000,
      image: "",
    },
    steps: [
      { partName: "Diễu nẹp cổ", cpu: 800, teamLeaderName: "Trần Minh Huy", startDate: "2026-04-22", endDate: "2026-04-23" },
      { partName: "Đính mác", cpu: 200, teamLeaderName: "Lê Thị Thu", startDate: "2026-04-23", endDate: "2026-04-24" },
      { partName: "Can dây lồng cổ", cpu: 100, teamLeaderName: "Phạm Hoàng Đức", startDate: "2026-04-24", endDate: "2026-04-25" },
    ],
  },
  {
    planId: 5002,
    production: {
      productionId: 1002,
      orderId: 30,
      orderName: "Áo hoodie mùa đông",
      pStartDate: "2026-04-18",
      pEndDate: "2026-04-30",
      status: "Planned",
      pmName: "Trần Ngọc Bích",
    },
    product: {
      productCode: "PRD-HOOD-02",
      productName: "Áo hoodie",
      type: "Hoodie",
      size: "M",
      color: "Đen",
      quantity: 80,
      cpu: 22000,
      image: "",
    },
    steps: [
      { partName: "May thân", cpu: 1200, teamLeaderName: "Đỗ Ngọc Anh", startDate: "2026-04-19", endDate: "2026-04-20" },
      { partName: "May tay", cpu: 900, teamLeaderName: "Nguyễn Hữu Long", startDate: "2026-04-20", endDate: "2026-04-21" },
    ],
  },
];

const STATUS_STYLES = {
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Đang sản xuất": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function ProductionPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const plan = useMemo(() => {
    const pid = Number(id);
    return MOCK_PLAN_DETAILS.find((item) => Number(item.planId) === pid) || null;
  }, [id]);

  const totalCpu = useMemo(() => {
    if (!plan?.steps) return 0;
    return plan.steps.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0);
  }, [plan]);

  const openRejectModal = () => setIsRejectOpen(true);
  const closeRejectModal = () => {
    setIsRejectOpen(false);
    setRejectReason("");
  };

  const submitReject = () => {
    if (!rejectReason.trim()) return;
    closeRejectModal();
  };

  if (!plan) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center min-h-400px text-sm text-slate-600">
          Không tìm thấy kế hoạch #{id}.
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="leave-page leave-detail-page">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chi tiết kế hoạch #{plan.planId}</h1>
                <p className="text-slate-600">Theo dõi thông tin kế hoạch và tiến độ thực hiện.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${
                  STATUS_STYLES[plan.production.status] || STATUS_STYLES.default
                }`}
              >
                {plan.production.status}
              </span>
              <button
                type="button"
                onClick={openRejectModal}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
              >
                Từ chối
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Chỉnh sửa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin production</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100 font-sans">
                  <div className="p-0">
                    <DetailItem label="Mã kế hoạch" value={`#PL-${plan.planId}`} isBold />
                    <DetailItem label="Production" value={`#PR-${plan.production.productionId}`} />
                    <DetailItem label="Đơn hàng" value={`#ĐH-${plan.production.orderId}`} />
                    <DetailItem label="Tên đơn" value={plan.production.orderName} />
                  </div>
                  <div className="p-0">
                    <DetailItem label="PM quản lý" value={plan.production.pmName} />
                    <DetailItem label="Ngày bắt đầu" value={plan.production.pStartDate} />
                    <DetailItem label="Ngày kết thúc" value={plan.production.pEndDate} />
                    <DetailItem label="Trạng thái" value={plan.production.status} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin sản phẩm</h2>
                </div>
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                    <div className="w-32 h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {plan.product.image ? (
                        <img src={plan.product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{plan.product.productName}</div>
                      <div className="text-xs text-slate-500 uppercase mt-1">#{plan.product.productCode}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100 font-sans">
                  <div className="p-0">
                    <DetailItem label="Loại sản phẩm" value={plan.product.type} />
                    <DetailItem label="Kích thước" value={plan.product.size} />
                    <DetailItem label="Màu sắc" value={plan.product.color} />
                  </div>
                  <div className="p-0">
                    <DetailItem label="Số lượng" value={plan.product.quantity} isBold />
                    <DetailItem label="Giá/SP" value={`${plan.product.cpu?.toLocaleString("vi-VN") ?? "-"} VND`} />
                  </div>
                </div>
              </div>

              <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="leave-table-card__header">
                  <div>
                    <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                    <p className="leave-table-card__subtitle">Công đoạn đã lập cho kế hoạch.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-slate-200 table-fixed">
                    <thead className="leave-table-head">
                      <tr>
                        <th className="leave-table-th w-12 px-3 py-4 text-center text-xs font-semibold uppercase tracking-wide">STT</th>
                        <th className="leave-table-th w-40 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Tên công đoạn</th>
                        <th className="leave-table-th w-36 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Tổ trưởng</th>
                        <th className="leave-table-th w-24 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Bắt đầu</th>
                        <th className="leave-table-th w-24 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Kết thúc</th>
                        <th className="leave-table-th w-24 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Giá/SP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {plan.steps.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-600">
                            Chưa có công đoạn.
                          </td>
                        </tr>
                      ) : (
                        plan.steps.map((row, idx) => (
                          <tr key={`${row.partName}-${idx}`} className="leave-table-row hover:bg-slate-50/80">
                            <td className="px-3 py-3 text-center text-sm text-slate-600">{idx + 1}</td>
                            <td className="px-3 py-3 text-sm text-slate-900 font-medium truncate">{row.partName || "-"}</td>
                            <td className="px-3 py-3 text-sm text-slate-700 truncate">{row.teamLeaderName || "-"}</td>
                            <td className="px-3 py-3 text-sm text-slate-700 text-center">{row.startDate || "-"}</td>
                            <td className="px-3 py-3 text-sm text-slate-700 text-center">{row.endDate || "-"}</td>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-slate-700">
                              {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700">Tổng chi phí</td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">
                          {`${totalCpu.toLocaleString("vi-VN")} VND`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Tổng quan kế hoạch</h2>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <SideItem label="Mã kế hoạch" value={`#PL-${plan.planId}`} />
                  <SideItem label="Production" value={`#PR-${plan.production.productionId}`} />
                  <SideItem label="Đơn hàng" value={`#ĐH-${plan.production.orderId}`} />
                  <SideItem label="PM" value={plan.production.pmName} />
                  <SideItem label="Tổng chi phí" value={`${totalCpu.toLocaleString("vi-VN")} VND`} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2 text-slate-600 mb-3">
                  <Info size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Mốc thời gian</h2>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <SideItem label="Bắt đầu" value={plan.production.pStartDate} />
                  <SideItem label="Kết thúc" value={plan.production.pEndDate} />
                  <SideItem label="Trạng thái" value={plan.production.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRejectOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Từ chối kế hoạch</div>
              <button onClick={closeRejectModal} className="text-slate-400 hover:text-slate-600">
                Đóng
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase">Lý do từ chối</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={closeRejectModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600">
                Hủy
              </button>
              <button
                onClick={submitReject}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}

function DetailItem({ label, value, isBold = false }) {
  const displayValue = value === null || value === undefined || value === "" ? "-" : value;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className={`text-sm ${isBold ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
        {displayValue}
      </span>
    </div>
  );
}

function SideItem({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value ?? "-"}</span>
    </div>
  );
}
