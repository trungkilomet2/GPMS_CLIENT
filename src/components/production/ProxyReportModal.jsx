import { useEffect, useState } from "react";
import { Users, X, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "react-toastify";
import ProductionPartService from "@/services/ProductionPartService";

export default function ProxyReportModal({
  isOpen,
  onClose,
  workers,
  currentUser,
  plan,
  steps,
  allLogs,
  onSuccess
}) {
  const [proxyWorker, setProxyWorker] = useState(null);
  const [proxyRows, setProxyRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  const normalizeDateString = (target) => {
    if (!target) return "";
    const raw = String(target).trim();
    if (raw.includes("/")) {
      const [mm, dd, yyyy] = raw.split("/").map((v) => v.trim());
      if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    if (raw.includes("T")) return raw.split("T")[0];
    return raw.substring(0, 10);
  };

  const normalizeWorkerValue = (value) => String(value ?? "").trim().toLowerCase();

  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  };

  const extractWorkerIds = (source) => {
    return toArray(source)
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === "number") return [String(item)];
        if (typeof item === "string") {
          const raw = item.trim();
          if (!raw) return [];
          return Number.isNaN(Number(raw)) ? [] : [String(Number(raw))];
        }
        if (typeof item === "object") {
          const id = item?.workerId ?? item?.id ?? item?.userId ?? item?.accountId;
          return id == null ? [] : [String(id)];
        }
        return [];
      })
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const extractWorkerNames = (source) => {
    return toArray(source)
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === "string") {
          const raw = normalizeWorkerValue(item);
          if (!raw || !Number.isNaN(Number(raw))) return [];
          return [raw];
        }
        if (typeof item === "object") {
          const name = normalizeWorkerValue(
            item?.fullName ?? item?.name ?? item?.userName ?? item?.username ?? ""
          );
          return name ? [name] : [];
        }
        return [];
      })
      .filter(Boolean);
  };

  const isStepAssignedToCurrentWorker = (step, currentWorkerIdSet, currentWorkerNameSet) => {
    const idCandidates = [
      ...extractWorkerIds(step?.assignedWorkerIds),
      ...extractWorkerIds(step?.workerIds),
      ...extractWorkerIds(step?.assigneeIds),
      ...extractWorkerIds(step?.assignedWorkerId),
      ...extractWorkerIds(step?.workers),
      ...extractWorkerIds(step?.workerList),
      ...extractWorkerIds(step?.assignees),
      ...extractWorkerIds(step?.workerId),
    ];
    if (idCandidates.some((id) => currentWorkerIdSet.has(id))) return true;

    const nameCandidates = [
      ...extractWorkerNames(step?.assignedWorkers),
      ...extractWorkerNames(step?.workerNames),
      ...extractWorkerNames(step?.workers),
      ...extractWorkerNames(step?.workerList),
      ...extractWorkerNames(step?.assignees),
      ...extractWorkerNames(step?.workerName),
    ];
    return nameCandidates.some((name) => currentWorkerNameSet.has(name));
  };

  const getTasksForWorker = (worker) => {
    if (!worker || !steps) return [];

    const workerId = worker?.userId ?? worker?.id ?? worker?.accountId;
    const wIdSet = new Set(workerId ? [String(workerId).trim()] : []);

    const names = [worker?.fullName, worker?.name, worker?.userName, worker?.username]
      .map((value) => normalizeWorkerValue(value))
      .filter(Boolean);
    const wNameSet = new Set(names);

    const results = [];
    steps.forEach((step, idx) => {
      // step is a flattened item from ProductionDetail
      const isAssigned = isStepAssignedToCurrentWorker(step, wIdSet, wNameSet);
      if (isAssigned) {
        // Ensure we have correct IDs. In ProductionDetail steps:
        // id = variant.id, partId = part.id
        const variantId = step.variant?.id ?? step.id;
        const stageId = step.partId ?? step.id;

        results.push({
          id: `f-${variantId}-${idx}`,
          partId: stageId,
          partOrderSizeId: variantId,
          productionId: plan?.productionId || step.productionId || "",
          partName: step.partName || step.name || "-",
          color: step.colorName || step.color || "-",
          size: step.sizeName || step.size || "-",
          cpu: step.unitPrice || step.cpu || 0,
          qtyVar: Number(step.quantity || step.targetQuantity || 0),
          // We will recalculate finVar from logs for accuracy
          finVar: Number(step.actualQuantity || step.finishedQuantity || 0),
        });
      }
    });
    return results;
  };

  // Fetch available workers for assignment
  useEffect(() => {
    if (isOpen) {
      const fetchAvailableWorkers = async () => {
        setIsLoadingWorkers(true);
        try {
          let allWorkers = [];
          let pageIndex = 0;
          let hasMore = true;

          while (hasMore && pageIndex < 50) { // Safety limit of 50 pages
            const res = await ProductionPartService.getAssignWorkers({
              PageIndex: pageIndex,
              PageSize: 30,
              SortColumn: "Name",
              SortOrder: "ASC",
              // Include production context if available (may be required by backend)
              ...(plan?.pmId ? { PMId: plan.pmId } : {}),
              ...(plan?.pStartDate || plan?.startDate ? { fromDate: plan.pStartDate || plan.startDate } : {}),
              ...(plan?.pEndDate || plan?.endDate ? { toDate: plan.pEndDate || plan.endDate } : {}),
            });

            const rawData = res?.data?.data ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);

            if (rawData.length > 0) {
              allWorkers = [...allWorkers, ...rawData];
              if (rawData.length < 30) {
                hasMore = false;
              } else {
                pageIndex++;
              }
            } else {
              hasMore = false;
            }
          }

          // Map to handle potential nesting in API response (workerInfo)
          const mapped = allWorkers.map(item => ({
            id: String(item.workerInfo?.workerId || item.workerId || item.userId || ""),
            fullName: item.workerInfo?.workerName || item.workerName || item.fullName || item.userName || "—",
            roleName: item.workerSkillInfo?.[0]?.skillName || item.roleName || ""
          })).filter(w => w.id);

          // Filter out current user if necessary
          const currentUid = String(currentUser?.userId || currentUser?.id || "");
          const filtered = mapped.filter(w => String(w.id) !== currentUid);

          setAvailableWorkers(filtered);
        } catch (err) {
          console.error("Error fetching workers for proxy report:", err);
          toast.error("Không thể tải danh sách thợ.");
        } finally {
          setIsLoadingWorkers(false);
        }
      };
      fetchAvailableWorkers();
    } else {
      setProxyWorker(null);
      setAvailableWorkers([]);
    }
  }, [isOpen, currentUser, plan]);

  useEffect(() => {
    if (proxyWorker) {
      setIsLoading(true);
      try {
        const tasks = getTasksForWorker(proxyWorker);
        const targetId = proxyWorker?.userId ?? proxyWorker?.id ?? proxyWorker?.accountId;
        const todayStr = new Date().toISOString().split("T")[0];

        // Map to store TOTAL finished for each variant (from all workers)
        const totalFinishedMap = new Map();
        // Map to store TODAY'S finished for the SELECTED worker
        const reportedTodayMap = new Map();

        if (Array.isArray(allLogs)) {
          allLogs.forEach(log => {
            const sid = String(log.partOrderSizeId || log.productionPartOrderSizeId || "");
            const qty = Number(log.quantity || 0);

            // 1. Accumulate total finished for this variant
            totalFinishedMap.set(sid, (totalFinishedMap.get(sid) || 0) + qty);

            // 2. Accumulate today's report for the proxy target worker
            const logDate = normalizeDateString(log.createDate || log.workDate);
            const logWorkerId = String(log.workerId || log.userId || log.accountId || "");
            if (logDate === todayStr && logWorkerId === String(targetId)) {
              reportedTodayMap.set(sid, (reportedTodayMap.get(sid) || 0) + qty);
            }
          });
        }

        setProxyRows(tasks.map(t => {
          const sid = String(t.partOrderSizeId);
          // Prefer log sum for accuracy, fallback to server field
          const realFinished = totalFinishedMap.has(sid) ? totalFinishedMap.get(sid) : t.finVar;
          const todayQty = reportedTodayMap.get(sid) || 0;

          return {
            ...t,
            quantity: "",
            finVar: realFinished,
            reportedTodayQty: todayQty,
            isFinished: realFinished >= t.qtyVar && t.qtyVar > 0
          };
        }).filter(row => !row.isFinished));
      } catch (err) {
        console.error("Lỗi xử lý dữ liệu proxy:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setProxyRows([]);
    }
  }, [proxyWorker, plan, steps, allLogs]);

  const handleQtyChange = (id, value) => {
    const row = proxyRows.find(r => r.id === id);
    if (!row) return;

    const cleanValue = String(value).replace(/[^0-9]/g, "");
    const num = Number(cleanValue);
    const limit = Math.max(0, (row.qtyVar || 0) - (row.finVar || 0));

    let finalValue = cleanValue;
    if (num > limit && limit >= 0) {
      finalValue = String(limit);
      toast.warning(`Tối đa ${limit} sản phẩm.`);
    }

    setProxyRows(prev => prev.map(r => r.id === id ? { ...r, quantity: finalValue } : r));
  };

  const handleSave = async () => {
    const changes = proxyRows.filter(r => Number(r.quantity) > 0);
    if (changes.length === 0) {
      toast.info("Vui lòng nhập số lượng.");
      return;
    }

    const targetId = proxyWorker?.userId ?? proxyWorker?.id ?? proxyWorker?.accountId;
    if (!targetId) {
      toast.error("Không tìm thấy thông tin nhân sự để báo cáo.");
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all(changes.map(row => {
        // Double check IDs are numbers
        const pId = Number(row.partId);
        const psId = Number(row.partOrderSizeId);

        const payload = {
          userId: Number(targetId),
          quantity: Number(row.quantity)
        };

        if (isNaN(pId) || isNaN(psId)) {
          throw new Error("Thông tin công đoạn không hợp lệ (ID missing).");
        }

        return ProductionPartService.createWorkLog(pId, psId, payload);
      }));
      toast.success("Đã lưu báo cáo hộ thành công.");
      onSuccess();
    } catch (err) {
      console.error("Save Proxy Report Error:", err);
      const msg = err.response?.data?.message || err.message || "Lỗi khi lưu báo cáo hộ.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.25rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh] border border-white/20">

        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 text-white flex justify-between items-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/30">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Báo cáo sản lượng hộ</h3>
              <p className="text-emerald-50/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">Chọn nhân sự & nhập sản lượng hoàn thành</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-all active:scale-90 group relative z-10">
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {/* Worker Selector Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chọn nhân sự được báo cáo hộ</label>
            </div>
            <div className="relative">
              <select
                value={proxyWorker?.id || ""}
                onChange={(e) => {
                  const worker = availableWorkers.find(w => String(w.id) === e.target.value);
                  setProxyWorker(worker || null);
                }}
                disabled={isLoadingWorkers}
                className="w-full h-14 rounded-xl border-2 border-slate-100 bg-slate-50/50 px-6 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-8 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer disabled:opacity-50"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2rem' }}
              >
                <option value="">{isLoadingWorkers ? "Đang tải danh sách..." : "-- Danh sách nhân sự khả dụng --"}</option>
                {availableWorkers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.fullName || w.name || w.userName}
                  </option>
                ))}
              </select>
              {isLoadingWorkers && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin text-emerald-500" size={18} />
                </div>
              )}
            </div>
          </div>

          {proxyWorker && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Danh sách công đoạn đã giao</h4>
                </div>
                {isLoading && <Loader2 className="animate-spin text-emerald-600" size={20} />}
              </div>

              {proxyRows.length > 0 ? (
                <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết công đoạn</th>
                        <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Quy cách</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Sản lượng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {proxyRows.map(row => (
                        <tr key={row.id} className="group hover:bg-emerald-50/20 transition-colors">
                          <td className="px-6 py-5">
                            <p className="font-bold text-slate-800 text-sm">{row.partName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[8px] font-black text-slate-500 uppercase tracking-tighter italic">#PR-{row.productionId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 uppercase">{row.color}</span>
                              <span className="px-2 py-1 rounded-lg bg-blue-50 text-[10px] font-black text-blue-600 uppercase">{row.size}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {row.isFinished ? (
                              <div className="flex justify-center py-2">
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100 shadow-sm flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Hoàn thành
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <div className="relative group/input">
                                  <input
                                    type="number"
                                    placeholder="Nhập..."
                                    value={row.quantity}
                                    onChange={(e) => handleQtyChange(row.id, e.target.value)}
                                    className="w-full h-11 rounded-xl border-2 border-slate-100 text-center font-black text-slate-700 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-300 text-base"
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/50">
                                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">
                                      Còn lại: {(row.qtyVar || 0) - (row.finVar || 0)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !isLoading && (
                <div className="py-16 text-center border-4 border-dashed border-slate-50 rounded-[1.25rem] bg-slate-50/20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 mb-4">
                    <Users size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Thợ này không có công việc khả dụng</p>
                  <p className="text-slate-300 text-xs mt-1">Vui lòng kiểm tra lại phân công thợ</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Blur Effect */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-xl border-2 border-slate-200 bg-white font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !proxyWorker || proxyRows.length === 0}
            className="flex-[1.5] h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-black text-white hover:from-emerald-700 hover:to-teal-700 disabled:opacity-30 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.15em] border-t border-white/20"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <ClipboardCheck size={20} />
                <span>Xác nhận & Lưu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

