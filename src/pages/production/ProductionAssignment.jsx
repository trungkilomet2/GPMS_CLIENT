import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Users, Check } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import { toast } from "react-toastify";

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
  const [isSaving, setIsSaving] = useState(false);
  const [fetchedProduction, setFetchedProduction] = useState(null);
  const [backendParts, setBackendParts] = useState([]); // Real parts with real IDs from backend
  const loadingWorkers = workers.length === 0 && !workerError;

  // Fetch production detail from API when pmId is missing (from incoming state or directly by URL)
  useEffect(() => {
    const incomingPmId = incoming?.production?.pmId || incoming?.production?.pm?.id;
    const needFetch = selectedProductionId && !incomingPmId;
    if (!needFetch) return;
    let active = true;
    ProductionService.getProductionDetail(selectedProductionId).then((res) => {
      if (!active) return;
      const payload = res?.data?.data ?? res?.data ?? null;
      if (!payload) return;
      const order = payload.order || {};
      const pm = payload.pm || {};
      setFetchedProduction({
        productionId: payload.productionId ?? payload.id,
        pmId: pm.id ?? null,
        pm,
        orderId: order.id,
        orderName: order.orderName,
        pStartDate: payload.startDate ?? order.startDate ?? null,
        pEndDate: payload.endDate ?? order.endDate ?? null,
        status: payload.statusName || payload.status,
        pmName: pm.fullName || pm.name || (pm.id ? `PM #${pm.id}` : "-"),
        product: {
          productCode: order.id ? `PRD-${order.id}` : "PRD-UNKNOWN",
          productName: order.orderName,
          type: order.type,
          size: order.size,
          color: order.color,
          quantity: order.quantity,
          cpu: order.cpu,
          image: order.image || "",
          startDate: order.startDate,
          endDate: order.endDate,
        },
      });
    }).catch(() => {
      setWorkerError("Không thể tải thông tin production.");
    });
    return () => { active = false; };
  }, [selectedProductionId, incoming]);

  const selectedProduction = useMemo(() => {
    const incomingPmId = incoming?.production?.pmId || incoming?.production?.pm?.id;
    if (incoming?.production && incomingPmId) {
      return {
        ...incoming.production,
        pmId: incomingPmId,
        product: incoming.product ?? null,
      };
    }
    // If incoming exists but no pmId, merge with fetchedProduction to get pmId
    if (incoming?.production && fetchedProduction) {
      return {
        ...incoming.production,
        pmId: fetchedProduction.pmId,
        product: incoming.product ?? fetchedProduction.product ?? null,
      };
    }
    if (fetchedProduction) return fetchedProduction;
    const pid = Number(selectedProductionId);
    if (!pid) return null;
    return MOCK_PRODUCTIONS.find((item) => Number(item.productionId) === pid) || null;
  }, [selectedProductionId, incoming, fetchedProduction]);

  // Fetch real part IDs from backend for this production
  useEffect(() => {
    if (!selectedProductionId) return;
    let active = true;
    const fetchParts = async () => {
      try {
        const res = await ProductionPartService.getPartsByProduction(selectedProductionId);
        if (!active) return;
        const payload = res?.data?.data ?? res?.data ?? [];
        const list = Array.isArray(payload) ? payload : [];
        setBackendParts(list);
      } catch {
        // ignore - parts may not exist yet
      }
    };
    fetchParts();
    return () => { active = false; };
  }, [selectedProductionId]);

  const rows = useMemo(() => {
    const sourceSteps = Array.isArray(incoming?.steps) && incoming.steps.length > 0
      ? incoming.steps
      : PLAN_STEPS;
    return sourceSteps.map((row, index) => {
      // Try to match with a real backend part by name or index
      const realPart = backendParts[index] || backendParts.find(p => p.partName === row.partName || p.name === row.partName);
      return {
        ...row,
        ppId: realPart?.id ?? (2000 + index), // Use real backend ID if available
        realPartId: realPart?.id ?? null,
        productionId: selectedProduction ? selectedProduction.productionId : null,
      };
    });
  }, [selectedProduction, incoming, backendParts]);

  const extractAssignedWorkerIds = (part, workerList) => {
    if (!part) return [];
    const normalizeIds = (ids) =>
      ids
        .map((id) => (id != null ? String(id) : ""))
        .filter((id) => id !== "");

    let ids = [];
    if (Array.isArray(part.workerIds)) ids = part.workerIds;
    else if (Array.isArray(part.assignedWorkerIds)) ids = part.assignedWorkerIds;
    else if (Array.isArray(part.assignedWorkers)) ids = part.assignedWorkers;
    else if (Array.isArray(part.workers)) ids = part.workers;
    else if (Array.isArray(part.workerList)) ids = part.workerList;
    else if (Array.isArray(part.assignees)) ids = part.assignees;

    // If array contains objects, extract ids
    if (ids.length > 0 && typeof ids[0] === "object") {
      ids = ids
        .map((w) => w?.workerId ?? w?.id ?? w?.userId ?? w?.accountId ?? null)
        .filter((id) => id != null);
      return normalizeIds(ids);
    }

    // If array contains strings that are not numeric, treat them as names
    const stringIds = ids.filter((id) => typeof id === "string");
    const looksLikeName = stringIds.some((id) => Number.isNaN(Number(id)));
    if (looksLikeName && Array.isArray(workerList)) {
      const nameToId = new Map(
        workerList
          .map((w) => [w.fullName || w.userName || w.label || "", String(w.id)])
          .filter(([name]) => name)
      );
      return normalizeIds(
        stringIds.map((name) => nameToId.get(name)).filter((id) => id != null)
      );
    }

    return normalizeIds(ids);
  };

  useEffect(() => {
    if (!selectedProductionId) return;
    // pmId can be at pmId (top-level), pm.id (nested), or fallback
    const pmId = selectedProduction?.pmId || selectedProduction?.pm?.id || null;
    const fromDate = selectedProduction?.pStartDate || selectedProduction?.startDate
      || selectedProduction?.product?.startDate || "2026-01-01";
    const toDate = selectedProduction?.pEndDate || selectedProduction?.endDate
      || selectedProduction?.product?.endDate || "2026-12-31";
    if (!pmId) {
      setWorkerError("Không tìm thấy thông tin PM quản lý production này.");
      return;
    }
    ProductionPartService.getAssignWorkers({ PMId: pmId, fromDate, toDate })
      .then((res) => {
        const list = res?.data?.data || res?.data || res || [];
        if (Array.isArray(list)) {
          const mapped = list.map((w) => {
            const info = w.workerInfo || w || {};
            const skills = Array.isArray(w.workerSkillInfo)
              ? w.workerSkillInfo.map(s => s.skillName)
              : (w.frequentSteps || []);
            const lrInfo = Array.isArray(w.workerLrInfo) ? w.workerLrInfo : [];
            const hasLeave = lrInfo.length > 0;
            const leaveDate = hasLeave ? (lrInfo[0]?.fromDate || lrInfo[0]?.startDate || lrInfo[0]?.leaveDate || "") : "";

            return {
              id: String(info.workerId || info.id || ""),
              fullName: info.workerName || info.fullName || info.userName || "No name",
              status: hasLeave ? "leave" : (w.statusId === 2 ? "leave" : "ready"),
              frequentSteps: skills,
              leaveDate: leaveDate || w.leaveDate || "",
              role: w.role || "Worker",
            };
          }).filter(w => w.id !== ""); // Filter out empty IDs just in case
          setWorkers(mapped);
        }
      })
      .catch((err) => {
        setWorkerError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Lỗi tải danh sách thợ");
      });
  }, [selectedProductionId, selectedProduction]);

  useEffect(() => {
    setAssignments((prev) => {
      const next = { ...prev };
      rows.forEach((row, index) => {
        const existing = next[row.ppId]?.workerIds || [];
        if (existing.length > 0) return;
        const realPart =
          backendParts.find((p) => p?.id === row.realPartId) ||
          backendParts[index] ||
          backendParts.find((p) => p?.partName === row.partName || p?.name === row.partName);
        const initialIds = extractAssignedWorkerIds(realPart, workers);
        next[row.ppId] = {
          workerIds: initialIds,
        };
      });
      return next;
    });
    if (!activeRowId && rows.length > 0) {
      setActiveRowId(rows[0].ppId);
    }
  }, [selectedProductionId, rows, backendParts, workers, activeRowId]);

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
        status: worker.status || "ready",
        leaveDate: worker.leaveDate || "",
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

  const isLeaveDuringRow = (leaveDate, row) => {
    if (!leaveDate || !row?.startDate || !row?.endDate) return false;
    const toDate = (value) => {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const leave = toDate(leaveDate);
    const start = toDate(row.startDate);
    const end = toDate(row.endDate);
    if (!leave || !start || !end) return false;
    const day = new Date(leave.getFullYear(), leave.getMonth(), leave.getDate()).getTime();
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return day >= from && day <= to;
  };

  const handleToggleEdit = async () => {
    if (isSaving) return;
    if (isEditing) {
      // User clicked Save Edit
      try {
        const rowsWithRealId = rows.filter(row => row.realPartId != null);
        if (rowsWithRealId.length === 0) {
          toast.error(`Lỗi lưu ${failed.length} công đoạn. Ví dụ: ${first?.partName || "không xác định"}`);
          return;
        }
        setIsSaving(true);
        const results = await Promise.allSettled(
          rowsWithRealId.map((row) => {
            const selectedWorkerIds = (assignments[row.ppId]?.workerIds || []).map(Number);
            return ProductionPartService.updateAssignWorker(row.realPartId, { workerIds: selectedWorkerIds });
          })
        );
        const failed = results
          .map((res, idx) => ({ res, row: rowsWithRealId[idx] }))
          .filter((item) => item.res.status === "rejected");
        if (failed.length > 0) {
          const first = failed[0]?.row;
          toast.error(`Lỗi lưu ${failed.length} công đoạn. Ví dụ: ${first?.partName || "không xác định"}`);
          return;
        }
        toast.success("Lưu dữ liệu phân công thành công!");
        setIsEditing(false);
      } catch (err) {
        console.error(err);
        setWorkerError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Lỗi khi lưu phân công thợ.");
        toast.error(err?.response?.data?.detail || err?.response?.data?.message || "Phát sinh lỗi khi lưu phân công.");
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(true);
      setWorkerError(null);
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Giao việc cho thợ</h1>
                <p className="text-slate-600">Phân công theo công đoạn đã lập trong kế hoạch sản xuất.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleEdit}
              disabled={isSaving}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isEditing
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
            >
              {isSaving ? "Đang lưu..." : (isEditing ? "Lưu chỉnh sửa" : "Chỉnh sửa")}
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
                          className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${isActive
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
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-700">
                        <Search size={16} className="text-slate-400" />
                        <input
                          value={workerQuery}
                          onChange={(event) => setWorkerQuery(event.target.value)}
                          placeholder="Tìm thợ..."
                          className="w-40 bg-transparent text-base outline-none placeholder:text-slate-400 sm:w-52"
                        />
                      </label>
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
                                const isOnLeave = worker.status === "leave";
                                const isLeaveConflict = isOnLeave && isLeaveDuringRow(worker.leaveDate, activeRow);
                                const canSelect = !!selectedProductionId && isEditing && !isLeaveConflict;
                                return (
                                  <button
                                    type="button"
                                    aria-pressed={checked}
                                    key={`${activeRow.ppId}-${worker.id}`}
                                    onClick={() => toggleWorker(activeRow.ppId, worker.id)}
                                    disabled={!canSelect}
                                    className={`flex w-full items-center justify-between gap-3 px-4 py-5 text-sm font-semibold transition ${checked
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-white text-slate-700 hover:bg-slate-50"
                                      }`}
                                  >
                                    <div className="min-w-0 text-left">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-sm font-semibold text-slate-800">{worker.label}</div>
                                        {isOnLeave ? (
                                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                            Nghỉ {worker.leaveDate || ""}
                                          </span>
                                        ) : (
                                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            Sẵn sàng
                                          </span>
                                        )}
                                        {isLeaveConflict && (
                                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                            Trùng ngày công đoạn
                                          </span>
                                        )}
                                      </div>
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






