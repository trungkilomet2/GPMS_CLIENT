import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";

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

export default function ProductionPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showProductionInfo, setShowProductionInfo] = useState(true);
  const [showProductInfo, setShowProductInfo] = useState(true);
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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded text-gray-400">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chi tiết kế hoạch #PL-{plan.planId}</h1>
                <p className="text-slate-600">Theo dõi công đoạn của production.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openRejectModal}
                className="px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50"
              >
                Từ chối
              </button>
              <button className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Chỉnh sửa
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <button
              type="button"
              onClick={() => setShowProductionInfo((prev) => !prev)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Thông tin production</div>
                <div className="text-lg font-semibold text-slate-900">#PR-{plan.production.productionId}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                {plan.production.status}
              </span>
            </button>
            {showProductionInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                <InfoItem label="Đơn hàng" value={`#ĐH-${plan.production.orderId}`} />
                <InfoItem label="Tên đơn" value={plan.production.orderName} />
                <InfoItem label="PM quản lý" value={plan.production.pmName} />
                <InfoItem label="Ngày bắt đầu" value={plan.production.pStartDate} />
                <InfoItem label="Ngày kết thúc" value={plan.production.pEndDate} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <button
              type="button"
              onClick={() => setShowProductInfo((prev) => !prev)}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Thông tin sản phẩm</div>
                <div className="text-lg font-semibold text-slate-900">{plan.product.productName}</div>
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase">#{plan.product.productCode}</div>
            </button>
            {showProductInfo && (
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                <div className="w-32 h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                  {plan.product.image ? (
                    <img src={plan.product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                  <InfoItem label="Loại sản phẩm" value={plan.product.type} />
                  <InfoItem label="Kích thước" value={plan.product.size} />
                  <InfoItem label="Màu sắc" value={plan.product.color} />
                  <InfoItem label="Số lượng" value={plan.product.quantity} />
                  <InfoItem label="Giá/SP" value={`${plan.product.cpu?.toLocaleString("vi-VN") ?? "-"} VND`} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-800">Danh sách công đoạn</div>
              <div className="text-xs text-slate-500">Công đoạn đã lập cho kế hoạch.</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-275 w-full divide-y divide-slate-200 table-fixed">
                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-600 tracking-wider">
                  <tr>
                    <th className="w-16 px-3 py-3 text-center">STT</th>
                    <th className="w-56 px-3 py-3 text-left">Tên công đoạn</th>
                    <th className="w-44 px-3 py-3 text-left">Tổ trưởng</th>
                    <th className="w-32 px-3 py-3 text-center">Start date</th>
                    <th className="w-32 px-3 py-3 text-center">End date</th>
                    <th className="w-28 px-3 py-3 text-center">Giá/SP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {plan.steps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-600">
                        Chưa có công đoạn.
                      </td>
                    </tr>
                  ) : (
                    plan.steps.map((row, idx) => (
                      <tr key={`${row.partName}-${idx}`} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-center">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-slate-700">{row.partName || "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{row.teamLeaderName || "-"}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{row.startDate || "-"}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{row.endDate || "-"}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700">TOTAL</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">
                      {`${totalCpu.toLocaleString("vi-VN")} VND`}
                    </td>
                  </tr>
                </tbody>
              </table>
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

function InfoItem({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
