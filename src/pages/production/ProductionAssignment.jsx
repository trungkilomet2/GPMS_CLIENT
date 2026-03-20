import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Users, AlertTriangle, Check } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  { id: 1, fullName: "My", frequentSteps: ["Diễu nẹp cổ", "May cổ", "Ủi hoàn thiện"] },
  { id: 2, fullName: "Hoa A", frequentSteps: ["Đính mác", "Kiểm hàng"] },
  { id: 3, fullName: "Mi", frequentSteps: ["Chạy dây lồng cổ", "Bấm lỗ lồng dây"] },
  { id: 4, fullName: "Hằng", frequentSteps: ["May sườn", "May tay"] },
  { id: 5, fullName: "Thảo", frequentSteps: ["Lộn hàng", "Đóng gói"] },
  { id: 6, fullName: "Hà", frequentSteps: ["Can dây lồng cổ", "Đính mác"] },
  { id: 7, fullName: "Trang", frequentSteps: ["Kiểm hàng", "Ủi hoàn thiện"] },
  { id: 8, fullName: "Nhung", frequentSteps: ["May cổ", "May vai"] },
  { id: 9, fullName: "Thư", frequentSteps: ["Vắt sổ", "May lai"] },
  { id: 10, fullName: "Hoa B", frequentSteps: ["Đóng gói", "Kiểm hàng"] },
];

export default function ProductionAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = location.state ?? {};
  const [selectedProductionId, setSelectedProductionId] = useState(() => {
    if (incoming?.production?.productionId) return String(incoming.production.productionId);
    return id ? String(id) : "";
  });
  const [workers, setWorkers] = useState([]);
  const [workerError, setWorkerError] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [workerQuery, setWorkerQuery] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [overloadRatio, setOverloadRatio] = useState(1.2);
  const [underloadRatio, setUnderloadRatio] = useState(0.8);
  const [activeRowId, setActiveRowId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const loadingWorkers = workers.length === 0 && !workerError;

  const selectedProduction = useMemo(() => {
    if (incoming?.production) {
      return {
        ...incoming.production,
        product: incoming.product ?? null,
      };
    }
    const pid = Number(selectedProductionId);
    if (!pid) return null;
    return MOCK_PRODUCTIONS.find((item) => Number(item.productionId) === pid) || null;
  }, [selectedProductionId, incoming]);

  const rows = useMemo(() => {
    const sourceSteps = Array.isArray(incoming?.steps) && incoming.steps.length > 0
      ? incoming.steps
      : PLAN_STEPS;
    return sourceSteps.map((row, index) => ({
      ...row,
      ppId: 2000 + index,
      productionId: selectedProduction ? selectedProduction.productionId : null,
    }));
  }, [selectedProduction, incoming]);

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
    if (rows.length > 0) {
      setActiveRowId(rows[0].ppId);
    }
  }, [selectedProductionId, rows]);

  const assignedCount = useMemo(
    () => Object.values(assignments).filter((item) => (item.workerIds || []).length > 0).length,
    [assignments]
  );

  const totalCpu = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.cpu) || 0), 0),
    [rows]
  );

  const productQty = selectedProduction?.product?.quantity ? Number(selectedProduction.product.quantity) : 0;

  const workerColumns = useMemo(
    () =>
      workers.map((worker) => ({
        id: String(worker.id),
        label: worker.fullName || worker.userName || `#${worker.id}`,
        frequentSteps: Array.isArray(worker.frequentSteps) ? worker.frequentSteps : [],
      })),
    [workers]
  );

  const filteredWorkers = useMemo(() => {
    const q = workerQuery.trim().toLowerCase();
    if (!q) return workerColumns;
    return workerColumns.filter((worker) => worker.label.toLowerCase().includes(q));
  }, [workerColumns, workerQuery]);

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

  const setRowWorkers = (ppId, nextIds) => {
    setAssignments((prev) => ({
      ...prev,
      [ppId]: {
        ...prev[ppId],
        workerIds: nextIds,
      },
    }));
  };

  const activeRow = useMemo(
    () => rows.find((row) => row.ppId === activeRowId) || null,
    [rows, activeRowId]
  );

  const workerStats = useMemo(() => {
    const base = {};
    workerColumns.forEach((worker) => {
      base[worker.id] = {
        id: worker.id,
        label: worker.label,
        steps: 0,
        quantity: 0,
        income: 0,
      };
    });

    rows.forEach((row) => {
      const selectedIds = assignments[row.ppId]?.workerIds || [];
      const workerCount = selectedIds.length;
      if (!workerCount || !productQty) return;
      const perWorkerQty = productQty / workerCount;
      const perWorkerIncome = (Number(row.cpu) || 0) * productQty / workerCount;

      selectedIds.forEach((workerId) => {
        if (!base[workerId]) return;
        base[workerId].steps += 1;
        base[workerId].quantity += perWorkerQty;
        base[workerId].income += perWorkerIncome;
      });
    });

    const statsArray = Object.values(base);
    const totalIncome = statsArray.reduce((sum, item) => sum + item.income, 0);
    const avgIncome = statsArray.length ? totalIncome / statsArray.length : 0;

    return {
      avgIncome,
      items: statsArray.map((item) => ({
        ...item,
        overload: avgIncome > 0 && item.income > avgIncome * Number(overloadRatio),
        underload: avgIncome > 0 && item.income < avgIncome * Number(underloadRatio),
      })),
    };
  }, [assignments, rows, workerColumns, productQty, overloadRatio, underloadRatio]);

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
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isEditing
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isEditing ? "Lưu chỉnh sửa" : "Chỉnh sửa"}
            </button>
          </div>

          {incoming?.production && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
                <InfoItem label="Production" value={selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"} />
                <InfoItem label="Đơn hàng" value={selectedProduction ? `#ĐH-${selectedProduction.orderId}` : "-"} />
                <InfoItem label="PM" value={selectedProduction?.pmName || "-"} />
                <InfoItem label="Trạng thái" value={selectedProduction?.status || "-"} />
              </div>
            </div>
          )}

          {!incoming?.production && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Vui lòng mở phân công từ <b>Chi tiết kế hoạch sản xuất</b> để tự động lấy dữ liệu công đoạn.
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                      Cân bằng thu nhập
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                      <span>TB: {Math.round(workerStats.avgIncome).toLocaleString("vi-VN")} VND</span>
                      <span>Quá tải: {workerStats.items.filter((item) => item.overload).length}</span>
                      <span>Thiếu tải: {workerStats.items.filter((item) => item.underload).length}</span>
                    </div>
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

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    Bảng cân bằng thu nhập
                  </div>
                  <div className="text-[11px] text-slate-500">
                    TB: {Math.round(workerStats.avgIncome).toLocaleString("vi-VN")} VND
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-2 text-left">Nhân viên</th>
                        <th className="px-3 py-2 text-center">Công đoạn</th>
                        <th className="px-3 py-2 text-center">Sản lượng</th>
                        <th className="px-3 py-2 text-right">Thu nhập</th>
                        <th className="px-3 py-2 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {workerStats.items.map((worker) => (
                        <tr key={`income-${worker.id}`} className="text-slate-700">
                          <td className="px-3 py-2 font-semibold text-slate-800">{worker.label}</td>
                          <td className="px-3 py-2 text-center">{worker.steps}</td>
                          <td className="px-3 py-2 text-center">{worker.quantity.toFixed(1)} SP</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {Math.round(worker.income).toLocaleString("vi-VN")} VND
                          </td>
                          <td className="px-3 py-2 text-center">
                            {worker.overload ? (
                              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Quá tải
                              </span>
                            ) : worker.underload ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Thiếu tải
                              </span>
                            ) : (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                Cân bằng
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {workerStats.items.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            Chưa có dữ liệu phân công.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={16} />
                      <h2 className="text-sm font-bold uppercase tracking-widest">Bảng công đoạn</h2>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-700">
                        <Search size={16} className="text-slate-400" />
                        <input
                          value={workerQuery}
                          onChange={(event) => setWorkerQuery(event.target.value)}
                          placeholder="Tìm thợ..."
                          className="w-40 bg-transparent text-base outline-none placeholder:text-slate-400 sm:w-52"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 max-h-96 overflow-y-auto space-y-3 pr-1">
                    {rows.map((row, idx) => {
                      const selectedIds = assignments[row.ppId]?.workerIds || [];
                      const selectedLabels = workerColumns
                        .filter((worker) => selectedIds.includes(worker.id))
                        .map((worker) => worker.label);
                      const isActive = activeRowId === row.ppId;

                      return (
                        <button
                          type="button"
                          key={row.ppId}
                          onClick={() => setActiveRowId(row.ppId)}
                          className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                            isActive
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-slate-200 bg-white hover:border-emerald-200"
                          }`}
                        >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                                {idx + 1}
                              </div>
                              <div>
                              <div className="text-base font-semibold text-slate-800">{row.partName}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                Đơn giá: {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {row.startDate || "-"} → {row.endDate || "-"}
                              </div>
                                {selectedLabels.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {selectedLabels.map((label) => (
                                      <span
                                        key={`${row.ppId}-${label}`}
                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-sm font-semibold text-slate-600">
                              <span>{selectedIds.length} thợ đã chọn</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>TOTAL</span>
                    <span>{`${totalCpu.toLocaleString("vi-VN")} VND`}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-bold uppercase tracking-widest text-slate-600">
                      Danh sách nhân viên
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={showSelectedOnly}
                        onChange={(event) => setShowSelectedOnly(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-slate-600">Chỉ hiển thị đã chọn</span>
                    </label>
                  </div>
                  {!activeRow ? (
                    <div className="text-sm text-slate-600">Chọn một công đoạn để phân công.</div>
                  ) : (
                    (() => {
                      const selectedIds = assignments[activeRow.ppId]?.workerIds || [];
                      const visibleWorkers = filteredWorkers.filter((worker) =>
                        showSelectedOnly ? selectedIds.includes(worker.id) : true
                      );
                      const visibleIds = visibleWorkers.map((worker) => worker.id);
                      const isAllVisibleSelected =
                        visibleIds.length > 0 && visibleIds.every((workerId) => selectedIds.includes(workerId));

                      return (
                        <>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600">
                            <span className="uppercase tracking-wide">Hành động nhanh</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setRowWorkers(
                                  activeRow.ppId,
                                  isAllVisibleSelected
                                    ? selectedIds.filter((id) => !visibleIds.includes(id))
                                    : Array.from(new Set([...selectedIds, ...visibleIds]))
                                )}
                                disabled={!selectedProductionId || visibleIds.length === 0 || !isEditing}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700 disabled:text-slate-300"
                              >
                                {isAllVisibleSelected ? "Bỏ chọn" : "Chọn hết"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRowWorkers(activeRow.ppId, [])}
                                disabled={!selectedProductionId || selectedIds.length === 0 || !isEditing}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:text-slate-300"
                              >
                                Xóa chọn
                              </button>
                            </div>
                          </div>
                          {loadingWorkers ? (
                            <div className="text-xs text-slate-500">Đang tải thợ...</div>
                          ) : workerColumns.length === 0 ? (
                            <div className="text-xs text-slate-500">Chưa có thợ</div>
                          ) : visibleWorkers.length === 0 ? (
                            <div className="text-xs text-slate-500">Không có thợ phù hợp.</div>
                          ) : (
                            <div className="max-h-96 min-h-80 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                              {visibleWorkers.map((worker) => {
                                const checked = selectedIds.includes(worker.id);
                                const frequentText = worker.frequentSteps.length
                                  ? worker.frequentSteps.slice(0, 3).join(" • ")
                                  : "";
                                return (
                                  <button
                                    type="button"
                                    aria-pressed={checked}
                                    key={`${activeRow.ppId}-${worker.id}`}
                                    onClick={() => toggleWorker(activeRow.ppId, worker.id)}
                                    disabled={!selectedProductionId || !isEditing}
                                    className={`flex w-full items-center justify-between gap-3 px-4 py-5 text-sm font-semibold transition ${
                                      checked
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <div className="min-w-0 text-left">
                                      <div className="truncate text-sm font-semibold text-slate-800">{worker.label}</div>
                                      {frequentText && (
                                        <div className="mt-1 truncate text-[11px] font-medium text-slate-500">
                                          {frequentText}
                                        </div>
                                      )}
                                    </div>
                                    {checked ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        Đã chọn <Check size={12} />
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-slate-500">Chọn</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
              {workerError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {workerError}
                </div>
              )}
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
