import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    orderId: 29,
    orderName: "Đồng phục công ty ABC",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    status: "In Progress",
    pmName: "Nguyễn Văn An",
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
  },
  {
    productionId: 1002,
    orderId: 30,
    orderName: "Áo hoodie mùa đông",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    status: "Planned",
    pmName: "Trần Ngọc Bích",
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
  },
];

const PLAN_STEPS = [
  { partName: "Diễu nẹp cổ", cpu: 800, teamLeaderId: "TL-01", startDate: "2026-04-22", endDate: "2026-04-23" },
  { partName: "Đính mác", cpu: 200, teamLeaderId: "TL-02", startDate: "2026-04-23", endDate: "2026-04-24" },
  { partName: "Can dây lồng cổ", cpu: 100, teamLeaderId: "TL-03", startDate: "2026-04-24", endDate: "2026-04-25" },
  { partName: "Chạy dây lồng cổ", cpu: 500, teamLeaderId: "TL-04", startDate: "2026-04-25", endDate: "2026-04-26" },
  { partName: "Bấm lỗ lồng dây", cpu: 400, teamLeaderId: "TL-05", startDate: "2026-04-26", endDate: "2026-04-27" },
  { partName: "Lộn hàng", cpu: 200, teamLeaderId: "TL-06", startDate: "2026-04-27", endDate: "2026-04-28" },
  { partName: "Kiểm hàng", cpu: 100, teamLeaderId: "TL-07", startDate: "2026-04-28", endDate: "2026-04-29" },
  { partName: "Bó buộc hàng", cpu: 100, teamLeaderId: "TL-08", startDate: "2026-04-29", endDate: "2026-04-30" },
];

const MOCK_WORKERS = [
  { id: 1, fullName: "My" },
  { id: 2, fullName: "Hoa A" },
  { id: 3, fullName: "Mi" },
  { id: 4, fullName: "Hằng" },
  { id: 5, fullName: "Thảo" },
  { id: 6, fullName: "Hà" },
  { id: 7, fullName: "Trang" },
  { id: 8, fullName: "Nhung" },
  { id: 9, fullName: "Thư" },
  { id: 10, fullName: "Hoa B" },
];

export default function ProductionAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedProductionId, setSelectedProductionId] = useState(() => (id ? String(id) : ""));
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [workerError, setWorkerError] = useState(null);
  const [assignments, setAssignments] = useState({});

  const selectedProduction = useMemo(() => {
    const pid = Number(selectedProductionId);
    if (!pid) return null;
    return MOCK_PRODUCTIONS.find((item) => Number(item.productionId) === pid) || null;
  }, [selectedProductionId]);

  const rows = useMemo(
    () =>
      PLAN_STEPS.map((row, index) => ({
        ...row,
        ppId: 2000 + index,
        productionId: selectedProduction ? selectedProduction.productionId : null,
      })),
    [selectedProduction]
  );

  useEffect(() => {
    setWorkers(MOCK_WORKERS);
    setWorkerError(null);
  }, []);

  useEffect(() => {
    const next = {};
    rows.forEach((row) => {
      next[row.ppId] = {
        workerIds: [],
      };
    });
    setAssignments(next);
  }, [selectedProductionId, rows]);

  const assignedCount = useMemo(
    () => Object.values(assignments).filter((item) => (item.workerIds || []).length > 0).length,
    [assignments]
  );

  const totalCpu = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0),
    [rows]
  );

  const workerColumns = useMemo(
    () =>
      workers.map((worker) => ({
        id: String(worker.id),
        label: worker.fullName || worker.userName || `#${worker.id}`,
      })),
    [workers]
  );

  const toggleWorker = (ppId, workerId) => {
    setAssignments((prev) => ({
      ...prev,
      [ppId]: {
        ...prev[ppId],
        workerIds: prev[ppId]?.workerIds?.includes(workerId)
          ? prev[ppId].workerIds.filter((id) => id !== workerId)
          : [...(prev[ppId]?.workerIds || []), workerId],
      },
    }));
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Giao việc cho thợ</h1>
                <p className="text-slate-600">Phân công theo công đoạn đã lập trong kế hoạch sản xuất.</p>
              </div>
            </div>
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Lưu phân công
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chọn production</div>
              <select
                value={selectedProductionId}
                onChange={(event) => setSelectedProductionId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">Chọn production...</option>
                {MOCK_PRODUCTIONS.map((item) => (
                  <option key={item.productionId} value={item.productionId}>
                    {`#PR-${item.productionId} - ${item.orderName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <Users size={16} />
                  <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin Production</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                  <InfoItem label="Production" value={selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"} />
                  <InfoItem label="Đơn hàng" value={selectedProduction ? `#ĐH-${selectedProduction.orderId}` : "-"} />
                  <InfoItem label="Tên đơn" value={selectedProduction?.orderName || "-"} />
                  <InfoItem label="PM quản lý" value={selectedProduction?.pmName || "-"} />
                  <InfoItem label="Ngày bắt đầu" value={selectedProduction?.pStartDate || "-"} />
                  <InfoItem label="Ngày kết thúc" value={selectedProduction?.pEndDate || "-"} />
                </div>
              </div>

              <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="leave-table-card__header">
                  <div>
                    <h2 className="leave-table-card__title">Danh sách công đoạn</h2>
                    <p className="leave-table-card__subtitle">Tích chọn thợ theo từng công đoạn.</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-[56px_1fr_140px] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
                    <div className="text-center">STT</div>
                    <div>Công đoạn</div>
                    <div className="text-center">Đơn giá</div>
                  </div>

                  {rows.map((row, idx) => (
                    <div key={row.ppId} className="px-4 py-4 hover:bg-slate-50/60">
                      <div className="grid grid-cols-[56px_1fr_140px] gap-3 items-center text-sm">
                        <div className="text-center text-slate-700 font-semibold">{idx + 1}</div>
                        <div className="font-medium text-slate-800">{row.partName}</div>
                        <div className="text-center font-semibold text-slate-700 whitespace-nowrap">
                          {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        {loadingWorkers ? (
                          <div className="text-xs text-slate-500">Đang tải thợ...</div>
                        ) : workerColumns.length === 0 ? (
                          <div className="text-xs text-slate-500">Chưa có thợ</div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {workerColumns.map((worker) => {
                              const checked = assignments[row.ppId]?.workerIds?.includes(worker.id);
                              return (
                                <label
                                  key={`${row.ppId}-${worker.id}`}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                                    checked
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!checked}
                                    onChange={() => toggleWorker(row.ppId, worker.id)}
                                    disabled={!selectedProductionId}
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="truncate">{worker.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>TOTAL</span>
                    <span>{`${totalCpu.toLocaleString("vi-VN")} VND`}</span>
                  </div>
                </div>
              </div>
              {workerError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {workerError}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Tóm tắt phân công
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <SummaryItem label="Tổng công đoạn" value={rows.length} />
                  <SummaryItem label="Đã phân công" value={assignedCount} />
                  <SummaryItem label="Chưa phân công" value={rows.length - assignedCount} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
                  Thông tin sản phẩm
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  <SummaryItem label="Sản phẩm" value={selectedProduction?.product?.productName || "-"} />
                  <SummaryItem label="Mã" value={selectedProduction?.product?.productCode || "-"} />
                  <SummaryItem label="Số lượng" value={selectedProduction?.product?.quantity || "-"} />
                  <SummaryItem
                    label="Giá/SP"
                    value={`${selectedProduction?.product?.cpu?.toLocaleString("vi-VN") ?? "-"} VND`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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

function SummaryItem({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-400 uppercase">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}
