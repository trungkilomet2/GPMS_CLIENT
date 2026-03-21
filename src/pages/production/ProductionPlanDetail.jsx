import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
      {
        partName: "Diễu nẹp cổ",
        cpu: 800,
        startDate: "2026-04-22",
        endDate: "2026-04-23",
        assignedWorkers: ["My", "Hoa A"],
      },
      {
        partName: "Đính mác",
        cpu: 200,
        startDate: "2026-04-23",
        endDate: "2026-04-24",
        assignedWorkers: ["Mi"],
      },
      {
        partName: "Can dây lồng cổ",
        cpu: 100,
        startDate: "2026-04-24",
        endDate: "2026-04-25",
        assignedWorkers: ["Hằng", "Thảo"],
      },
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
      {
        partName: "May thân",
        cpu: 1200,
        startDate: "2026-04-19",
        endDate: "2026-04-20",
        assignedWorkers: ["Trang", "Nhung"],
      },
      {
        partName: "May tay",
        cpu: 900,
        startDate: "2026-04-20",
        endDate: "2026-04-21",
        assignedWorkers: ["Thư"],
      },
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

  const plan = useMemo(() => {
    const pid = Number(id);
    return MOCK_PLAN_DETAILS.find((item) => Number(item.planId) === pid) || null;
  }, [id]);

  const totalCpu = useMemo(() => {
    if (!plan?.steps) return 0;
    return plan.steps.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0);
  }, [plan]);

  const progressPercent = useMemo(() => {
    const start = new Date(plan?.production?.pStartDate ?? "");
    const end = new Date(plan?.production?.pEndDate ?? "");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const total = end.getTime() - start.getTime();
    if (total <= 0) return 0;
    const now = new Date().getTime();
    const done = Math.min(Math.max(now - start.getTime(), 0), total);
    return Math.round((done / total) * 100);
  }, [plan]);

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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Chi tiết kế hoạch #{plan.planId}</h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      STATUS_STYLES[plan.production.status] || STATUS_STYLES.default
                    }`}
                  >
                    {plan.production.status}
                  </span>
                </div>
                <p className="text-slate-600">Theo dõi thông tin kế hoạch và tiến độ thực hiện.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Chỉnh sửa
              </button>
              <Link
                to={`/production-plan/assign/${plan.production.productionId}`}
                state={{ production: plan.production, product: plan.product, steps: plan.steps }}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                Phân công
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Thông tin sản xuất</div>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 md:grid-cols-4">
                  <InfoBadge label="Mã kế hoạch" value={`#PL-${plan.planId}`} />
                  <InfoBadge label="Mã sản xuất" value={`#PR-${plan.production.productionId}`} />
                  <InfoBadge label="Mã đơn hàng" value={`#ĐH-${plan.production.orderId}`} />
                  <InfoBadge label="Tên đơn hàng" value={plan.production.orderName} />
                  <InfoBadge label="Quản lý dự án" value={plan.production.pmName} />
                  <InfoBadge label="Thời gian" value={`${plan.production.pStartDate} - ${plan.production.pEndDate}`} />
                  <InfoBadge label="Trạng thái" value={plan.production.status} isStatus />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr]">
                  <div className="h-40 w-40 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {plan.product.image ? (
                      <img src={plan.product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Thông tin sản phẩm</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{plan.product.productName}</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">SKU: {plan.product.productCode}</div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                      <InfoBadge label="Loại" value={plan.product.type} />
                      <InfoBadge label="Số lượng" value={`${plan.product.quantity} cái`} />
                      <InfoBadge label="Màu sắc / Kích thước" value={`${plan.product.color} / ${plan.product.size}`} />
                      <InfoBadge label="Giá/SP" value={`${plan.product.cpu?.toLocaleString("vi-VN") ?? "-"} VND`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Danh sách công đoạn & nhiệm vụ</div>
                    <div className="text-sm text-slate-500 mt-1">Công đoạn đã lập cho kế hoạch.</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Tổng cộng {plan.steps.length} công đoạn
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">STT</th>
                        <th className="px-4 py-3 text-left">Tên công đoạn</th>
                        <th className="px-4 py-3 text-left">Thợ được giao</th>
                        <th className="px-4 py-3 text-left">Ngày bắt đầu / kết thúc</th>
                        <th className="px-4 py-3 text-right">Giá/SP</th>
                        <th className="px-4 py-3 text-center">Trắng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.steps.map((row, idx) => (
                        <tr key={`${row.partName}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-slate-500">{String(idx + 1).padStart(2, "0")}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{row.partName || "-"}</div>
                            <div className="text-[11px] text-slate-400">Giai đoạn: Rập</div>
                          </td>
                          <td className="px-4 py-3">
                            {Array.isArray(row.assignedWorkers) && row.assignedWorkers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.assignedWorkers.map((worker) => (
                                  <span
                                    key={`${row.partName}-${worker}`}
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                  >
                                    {worker}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.startDate || "-"} - {row.endDate || "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Đang làm
                            </span>
                          </td>
                        </tr>
                      ))}
                      {plan.steps.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            Chưa có công đoạn.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Tổng quan kế hoạch</div>
                <div className="mt-3 text-sm text-emerald-900">
                  <div className="flex items-end justify-between">
                    <span className="text-[11px] font-semibold uppercase text-emerald-700">Tổng chi phí</span>
                    <span className="text-lg font-bold">{totalCpu.toLocaleString("vi-VN")} VND</span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-emerald-700">
                    <div>Tham chiếu kế hoạch: #PL-{plan.planId}</div>
                    <div>Người quản lý: {plan.production.pmName}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Tiến độ sản xuất</div>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <ProgressItem
                    title="Bắt đầu sản xuất"
                    date={plan.production.pStartDate}
                    status="Đã hoàn thành"
                    active
                  />
                  <div>
                    <ProgressItem
                      title="Dự kiến hoàn thành"
                      date={plan.production.pEndDate}
                      status={`${progressPercent}%`}
                    />
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <ProgressItem title="Kiểm định chất lượng" date="Chưa xác định" status="-" muted />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </OwnerLayout>
  );
}

function InfoBadge({ label, value, isStatus = false }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`text-sm font-semibold ${isStatus ? "text-emerald-700" : "text-slate-800"}`}>
        {value ?? "-"}
      </div>
    </div>
  );
}

function ProgressItem({ title, date, status, active = false, muted = false }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 h-3 w-3 rounded-full border ${
          active ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
        }`}
      />
      <div className={`${muted ? "text-slate-400" : "text-slate-700"}`}>
        <div className="text-xs font-semibold uppercase tracking-widest">{title}</div>
        <div className="text-sm font-semibold">{date}</div>
        <div className="text-[11px] text-emerald-600 font-semibold">{status}</div>
      </div>
    </div>
  );
}


