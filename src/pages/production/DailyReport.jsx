import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChevronRight, X, ClipboardCheck, Loader2, BookOpen } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import OwnerLayout from "@/layouts/OwnerLayout";
import { toast } from "react-toastify";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ProductionPartService from "@/services/ProductionPartService";
import WorkerService from "@/services/WorkerService";
import { getStoredUser } from "@/lib/authStorage";
import { getErrorMessage } from "@/utils/errorUtils";
import { getPrimaryWorkspaceRole, hasAnyRole } from "@/lib/internalRoleFlow";
import { getPlanStatusLabel } from "@/utils/statusUtils";


function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeWorkerValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function extractWorkerIds(source) {
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
}

function extractWorkerNames(source) {
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
}

function hasWorkerAssignmentMetadata(step) {
  const idSources = [step?.assignedWorkerIds, step?.workerIds, step?.assigneeIds, step?.assignedWorkerId, step?.workerId];
  const nameSources = [step?.assignedWorkers, step?.workerNames, step?.workers, step?.workerList, step?.assignees, step?.workerName];
  return (
    idSources.some((source) => toArray(source).length > 0) ||
    nameSources.some((source) => toArray(source).length > 0)
  );
}

function isStepAssignedToCurrentWorker(step, currentWorkerIdSet, currentWorkerNameSet) {
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

}

function formatDateInput(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function DailyReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const assignment = location.state?.assignment || null;
  const plan = location.state?.plan || null;
  const productInfo = plan?.product || assignment?.product || null;
  const maxQty = productInfo?.quantity ? Number(productInfo.quantity) : null;

  const planSteps = Array.isArray(plan?.steps) ? plan.steps : [];
  const currentUser = getStoredUser() || {};
  const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
  const primaryRole = getPrimaryWorkspaceRole(roleValue);
  const isManager = ["owner", "admin", "pm", "manager"].includes(primaryRole);
  const LayoutComponent = ["worker", "kcs"].includes(primaryRole) ? WorkerLayout : OwnerLayout;

  const [selectedWorker, setSelectedWorker] = useState(currentUser);
  const [workers, setWorkers] = useState([]);


  const targetWorkerIdSet = useMemo(() => {
    const id = selectedWorker?.userId ?? selectedWorker?.id ?? selectedWorker?.accountId;
    return new Set(id ? [String(id).trim()] : []);
  }, [selectedWorker]);

  const targetWorkerNameSet = useMemo(() => {
    const names = [selectedWorker?.fullName, selectedWorker?.name, selectedWorker?.userName, selectedWorker?.username]
      .map((value) => normalizeWorkerValue(value))
      .filter(Boolean);
    return new Set(names);
  }, [selectedWorker]);

  useEffect(() => {
    if (isManager) {
      const fetchWorkers = async () => {
        try {
          const res = primaryRole === "pm"
            ? await WorkerService.getEmployeeDirectoryByPmScope()
            : await WorkerService.getManagerDirectory();
          setWorkers(res?.data || []);
        } catch (err) {
          console.error("Error fetching workers:", err);
        }
      };
      fetchWorkers();
    }
  }, [isManager, primaryRole]);

  const isStepAvailableForReporting = (step) => {
    if (!step) return false;
    const statusLabel = getPlanStatusLabel(step.statusName ?? step.status ?? step.statusId ?? "");
    const normalized = String(statusLabel || "").toLowerCase().trim();

    const isHidden =
      normalized.includes("đã hoàn thành") ||
      normalized.includes("hoàn thành") ||
      normalized.includes("chờ nghiệm thu") ||
      normalized === "da hoan thanh" ||
      normalized === "hoan thanh" ||
      normalized === "cho nghiem thu";

    if (isHidden) return false;

    // Check if totally done based on system quantity (qtyVar vs finVar)
    const qty = Number(step.qtyVar || step.targetQuantity || step.quantity || 0);
    const fin = Number(step.finVar || step.actualQuantity || step.finishedQuantity || 0);
    if (qty > 0 && fin >= qty) return false;

    return true;
  };

  const getTasksForWorker = (worker) => {
    if (!worker) return [];

    const workerId = worker?.userId ?? worker?.id ?? worker?.accountId;
    const wIdSet = new Set(workerId ? [String(workerId).trim()] : []);

    const names = [worker?.fullName, worker?.name, worker?.userName, worker?.username]
      .map((value) => normalizeWorkerValue(value))
      .filter(Boolean);
    const wNameSet = new Set(names);

    if (planSteps.length > 0) {
      const results = [];
      planSteps.forEach((part, pIdx) => {
        if (part.colorName || part.sizeName || part.variant || part.partOrderSizeId) {
          if (isStepAssignedToCurrentWorker(part, wIdSet, wNameSet)) {
            results.push({
              id: `f-${part.id || pIdx}`,
              partId: part.partId || part.id,
              partOrderSizeId: part.partOrderSizeId || part.id,
              productionId: plan?.production?.productionId || part.productionId || "",
              orderName: plan?.production?.orderName || plan?.production?.orderCode || plan?.production?.name || "",
              partName: part.partName || part.name || "-",
              color: part.colorName || part.color || "-",
              size: part.sizeName || part.size || "-",
              cpu: part.unitPrice || part.cpu || 0,
              workLogId: null,
              logReadOnly: false,
              status: part.status,
              statusName: part.statusName,
              statusId: part.statusId,
              isCuttingStep: part.isCuttingStep || false,
              qtyVar: part.quantity || part.targetQuantity || 0,
              finVar: part.actualQuantity || part.finishedQuantity || 0,
            });
          }
          return;
        }

        const variants = part.variants || part.listPartOrderSizes || [];
        variants.forEach((v, vIdx) => {
          if (isStepAssignedToCurrentWorker(v, wIdSet, wNameSet)) {
            const uniqueId = `row-${pIdx}-${vIdx}-${v.id || v.partOrderSizeId || '0'}`;
            results.push({
              id: uniqueId,
              partId: part.partId || part.id,
              partOrderSizeId: v.id || v.partOrderSizeId,
              productionId: plan?.production?.productionId || part.productionId || "",
              orderName: plan?.production?.orderName || plan?.production?.orderCode || plan?.production?.name || "",
              partName: part.partName || part.name || "-",
              color: v.colorName || v.color || "-",
              size: v.sizeName || v.size || "-",
              cpu: part.unitPrice || part.cpu || 0,
              workLogId: null,
              logReadOnly: false,
              status: v.status || part.status,
              statusName: v.statusName || part.statusName,
              statusId: v.statusId || part.statusId,
              isCuttingStep: part.isCuttingStep || false,
              qtyVar: v.quantity || 0,
              finVar: v.finishedQuantity || 0,
            });
          }
        });
      });
      return results.filter(isStepAvailableForReporting);
    }

    if (assignment && isStepAvailableForReporting(assignment)) {
      if (isStepAssignedToCurrentWorker(assignment, wIdSet, wNameSet)) {
        return [{
          ...assignment,
          id: assignment.id || "assignment-0",
          partId: assignment.partId,
          partOrderSizeId: assignment.partOrderSizeId || assignment.id,
          color: assignment.color || "-",
          size: assignment.size || "-",
          cpu: assignment.cpu || 0,
          status: assignment.status,
          statusName: assignment.statusName,
          statusId: assignment.statusId
        }];
      }
    }

    return [];
  };

  const initialBase = useMemo(() => getTasksForWorker(selectedWorker), [selectedWorker, planSteps, assignment]);

  const today = useMemo(() => formatDateInput(), []);
  const [reportDate, setReportDate] = useState(today);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [rows, setRows] = useState(() =>
    initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
  );

  useEffect(() => {
    setRows(initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" })));
  }, [initialBase]);

  const isToday = reportDate === today;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [changedItems, setChangedItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWorker, reportDate]);

  const displayedRows = useMemo(() => {
    return rows.filter(row => {
      if (!isToday) return true;
      return isStepAvailableForReporting(row);
    });
  }, [rows, isToday]);

  const totalPages = Math.ceil(displayedRows.length / ITEMS_PER_PAGE);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedRows.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedRows, currentPage]);

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.cpu) || 0), 0),
    [rows]
  );


  const handleChange = (id, field, value) => {
    if (field === "quantity") {
      const row = rows.find(r => r.id === id);
      if (!row) return;

      const cleanValue = String(value).replace(/[^0-9]/g, "");
      const num = Number(cleanValue);
      const limit = Math.max(0, (row.qtyVar || 0) - (row.finVar || 0));

      let finalValue = cleanValue;
      if (num > limit && limit >= 0) {
        finalValue = String(limit);
        toast.warning(`Chỉ được báo cáo tối đa ${limit} sản phẩm.`, {
          toastId: `max-qty-${id}`
        });
      }

      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, quantity: finalValue } : r))
      );
    } else {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    }
  };



  const normalizeDateString = (target) => {
    if (!target) return "";
    const raw = String(target).trim();
    if (raw.includes("/")) {
      const [mm, dd, yyyy] = raw.split("/").map((v) => v.trim());
      if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    if (raw.includes("T")) {
      return raw.split("T")[0];
    }
    return raw.substring(0, 10);
  };

  const normalizeName = (value) => {
    if (!value) return "";
    return String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]/g, "");
  };

  const unwrapArrayPayload = (response) => {
    const root = response?.data ?? response;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.data)) return root.data;
    return [];
  };

  const unwrapObjectId = (response) => {
    const root = response?.data ?? response;
    return root?.id ?? root?.data?.id ?? null;
  };

  useEffect(() => {
    const initData = async () => {
      setRows(prev => (prev || []).map(row => ({
        ...row,
        workLogId: null,
        logReadOnly: false,
        quantity: "",
        cumulativeToday: 0
      })));

      const activeRows = rows || [];
      const prodId = plan?.production?.productionId || activeRows.find(r => r.productionId)?.productionId;

      if (prodId) {
        try {
          const res = await ProductionPartService.getPartsByProduction(prodId, { PageSize: 100 });
          const payload = res?.data?.data ?? res?.data ?? [];
          const partList = Array.isArray(payload) ? payload : [];

          const latestDataMap = new Map();
          partList.forEach(p => {
            const variants = p.variants || p.partOrderSizes || [];
            const stageName = normalizeName(p.partName || p.name);
            variants.forEach(v => {
              const color = normalizeName(v.colorName || v.color);
              const size = normalizeName(v.sizeName || v.size);
              const idKey = `${p.id || p.partId}-${v.id || v.partOrderSizeId}`;
              const nameKey = `${stageName}-${color}-${size}`;
              const data = {
                total: v.quantity || 0,
                finished: v.actualQuantity || v.finishedQuantity || 0,
                partId: p.id || p.partId,
                partOrderSizeId: v.id || v.partOrderSizeId
              };
              latestDataMap.set(idKey, data);
              latestDataMap.set(nameKey, data);
            });
          });

          const targetId = selectedWorker?.userId ?? selectedWorker?.id ?? selectedWorker?.accountId;
          let allLogs = [];
          let pIdx = 0;
          let hasMore = true;

          while (hasMore && pIdx < 30) {
            try {
              const logRes = await ProductionPartService.getProductionWorkLogs(prodId, { PageIndex: pIdx, PageSize: 30 });
              const pageData = unwrapArrayPayload(logRes);
              if (pageData.length > 0) {
                allLogs = [...allLogs, ...pageData];
                hasMore = pageData.length === 30;
                pIdx++;
              } else {
                hasMore = false;
              }
            } catch (err) {
              console.error(`Lỗi gọi logs trang ${pIdx}:`, err);
              hasMore = false;
            }
          }

          const targetDateStr = formatDateInput(new Date());
          const reportedTodayMap = new Map();
          const finishedTotalMap = new Map();

          allLogs.forEach(log => {
            const sid = String(log.partOrderSizeId);
            const qty = Number(log.quantity || 0);
            finishedTotalMap.set(sid, (finishedTotalMap.get(sid) || 0) + qty);

            const logDate = normalizeDateString(log.createDate || log.workDate);
            const logWorkerId = String(log.workerId || log.userId || log.accountId || "");
            if (logDate === targetDateStr && logWorkerId === String(targetId)) {
              reportedTodayMap.set(sid, log);
            }
          });

          setRows(prev => (prev || []).map(row => {
            const sid = String(row.partOrderSizeId);
            const idKey = `${row.partId || ""}-${row.partOrderSizeId || ""}`;
            const latest = latestDataMap.get(idKey);
            const latestFinished = latest ? latest.finished : (finishedTotalMap.get(sid) || 0);
            const existingLog = reportedTodayMap.get(sid);

            return {
              ...row,
              finVar: latestFinished,
              quantity: "", // Keep input empty for next entry
              reportedTodayQty: existingLog ? Number(existingLog.quantity || 0) : 0,
              logReadOnly: !!existingLog,
              workLogId: existingLog?.id || null
            };
          }));
        } catch (err) {
          console.error("Lỗi đồng bộ dữ liệu:", err);
        }
      }
    };
    initData();
  }, [plan?.production?.productionId, refreshKey, selectedWorker]);

  const buildPayload = (row, worker = selectedWorker) => {
    const targetId = worker?.userId ?? worker?.id ?? worker?.accountId;
    return {
      userId: Number(targetId) || 1,
      quantity: Number(row?.quantity || 0),
    };
  };


  const handlePreSaveCheck = () => {
    if (!isToday || isSavingAll) return;
    const currentRows = rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;

    const errors = [];
    const changes = currentRows.filter((row) => {
      if (!row.partId) return false;
      const currentQty = Number(row.quantity || 0);
      const limit = (row.qtyVar || 0) - (row.finVar || 0);
      if (currentQty > limit && limit > 0) {
        errors.push(`${row.partName} (${row.color}/${row.size}): Số lượng vượt quá mức cho phép.`);
      }
      return currentQty > 0;
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    if (changes.length === 0) {
      toast.info("Vui lòng nhập số lượng để lưu báo cáo.");
      return;
    }
    setChangedItems(changes);
    setIsConfirmOpen(true);
  };

  const executeSaveAll = async () => {
    setIsConfirmOpen(false);
    if (!isToday || isSavingAll) return;
    const currentRows = rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;
    setIsSavingAll(true);
    try {
      const results = await Promise.allSettled(
        currentRows.map(async (row) => {
          if (!row?.partId) return { row, skipped: true };
          const isChanged = changedItems.some(c => c.id === row.id);
          if (!isChanged) return { row, skipped: true };
          const payload = buildPayload(row);
          const response = await ProductionPartService.createWorkLog(row.partId, row.partOrderSizeId, payload);
          let createdId = unwrapObjectId(response);
          return { row, createdId };
        })
      );

      const failed = results.filter((res) => res.status === "rejected");
      setRows((prev) => (prev || []).map((row) => ({ ...row, quantity: "" })));

      if (failed.length === 0) {
        toast.success("Đã lưu báo cáo thành công.");
        setRefreshKey(prev => prev + 1); // Trigger server-side reload
      } else {
        toast.error(`Có ${failed.length} dòng lưu thất bại. Vui lòng kiểm tra lại.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Lỗi hệ thống khi lưu báo cáo."));
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <LayoutComponent>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  const prodId = plan?.production?.productionId ?? assignment?.productionId;
                  if (prodId) {
                    navigate(`/production/${prodId}`);
                  } else {
                    navigate(-1);
                  }
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {assignment ? "Báo cáo sản lượng công đoạn" : "Báo cáo sản lượng hằng ngày"}
                </h1>
                <p className="text-slate-600">Điền số lượng vừa hoàn thành hằng ngày.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const firstRow = displayedRows[0] || rows[0];
                  const prodId = plan?.production?.id || plan?.production?.productionId || assignment?.productionId || firstRow?.productionId;
                  if (prodId) {
                    navigate(`/production-plan/${prodId}/history`, { state: { productionId: prodId } });
                  } else {
                    navigate('/worker/output-history');
                  }
                }}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 flex items-center gap-2 shadow-sm"
              >
                <BookOpen size={16} className="text-emerald-600" /> Sổ ghi chép
              </button>



              {isToday && rows.length > 0 && (
                <button
                  onClick={handlePreSaveCheck}
                  disabled={isSavingAll}
                  className="h-10 px-5 rounded-xl bg-emerald-600 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  {isSavingAll ? <Loader2 className="animate-spin" size={16} /> : <ClipboardCheck size={16} />}
                  Lưu báo cáo
                </button>
              )}
            </div>
          </div>




          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Ngày báo cáo</div>
                <div className="flex items-center gap-3">
                  <CalendarDays size={18} className="text-slate-400" />
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(event) => setReportDate(event.target.value)}
                    className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                  <span className="text-xs text-slate-500">
                    {isToday ? "Chỉ cho phép nhập sản lượng trong ngày." : "Chỉ được chỉnh sửa trong ngày hiện tại."}
                  </span>
                </div>
              </div>

              {/* Removed Proxy Report Button */}
            </div>
          </div>



          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách Công đoạn</h2>
                <p className="leave-table-card__subtitle">Điền số lượng hoàn thành và ghi chú nếu cần.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-12 px-2 py-3 text-center">STT</th>
                    <th className="leave-table-th w-28 px-2 py-3 text-left">Sản xuất</th>
                    <th className="leave-table-th w-40 px-3 py-3 text-left">Công đoạn</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center">Màu</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-center">Size</th>
                    <th className="leave-table-th w-28 px-2 py-3 text-center">Đơn giá</th>
                    <th className="leave-table-th w-40 px-3 py-3 text-center">Số lượng báo cáo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRows.length > 0 ? (
                    paginatedRows.map((row, index) => (
                      <tr key={`wr-${row.id}-${index}`} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-2 py-2 text-center text-xs text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td className="px-2 py-2 text-xs font-semibold text-slate-700">#PR-{row.productionId}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">{row.partName}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                            {row.color}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100 uppercase">
                            {row.size}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-slate-600 text-xs">
                          {row.cpu ? `${row.cpu.toLocaleString("vi-VN")} đ` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {isToday ? (
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const mQty = (row.qtyVar || 0) - (row.finVar || 0);
                                return (
                                  <>
                                    <div className="relative group">
                                      <input
                                        type="number"
                                        min="0"
                                        max={mQty}
                                        value={row.quantity}
                                        placeholder={"Nhập thêm..."}
                                        onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-sm font-black outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                                      />
                                    </div>
                                    {row.qtyVar > 0 && (
                                      <div className="text-[10px] text-slate-400 text-center font-medium mt-1 space-y-0.5">
                                        {mQty > 0 ? (
                                          <div className="text-emerald-600 font-bold uppercase text-[11px]">CÒN LẠI TỐI ĐA: {mQty}</div>
                                        ) : (
                                          <div className="text-slate-400 font-bold uppercase text-[11px]">ĐÃ HOÀN TẤT</div>
                                        )}
                                        <div className="italic text-slate-500">Tiến độ: {row.finVar}/{row.qtyVar} sản phẩm</div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-center text-slate-900 font-black">{row.quantity === "" ? "-" : row.quantity}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <BookOpen size={48} className="text-slate-200 mb-2" />
                          <p className="font-semibold text-slate-600">Bạn chưa có công việc được giao</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {paginatedRows.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-3 py-4 font-bold text-slate-500 text-right uppercase tracking-wider text-[10px]">TỔNG TIỀN BÁO CÁO:</td>
                      <td className="px-2 py-4 text-center font-black text-emerald-700 text-lg whitespace-nowrap bg-emerald-50/30">
                        {totalAmount.toLocaleString("vi-VN")} đ
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="text-xs text-slate-500 font-medium">
                  Hiển thị <span className="font-bold text-slate-700">{Math.min(displayedRows.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(displayedRows.length, currentPage * ITEMS_PER_PAGE)}</span> trong tổng số <span className="font-bold text-slate-700">{displayedRows.length}</span> công đoạn
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-100"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white/95 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Xác nhận báo cáo sản lượng</h3>
                  <p className="text-emerald-50/80 text-xs">Vui lòng kiểm tra lại thông tin trước khi lưu</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100/50">
                    {changedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/30">
                        <td className="px-4 py-3 font-medium text-slate-700">{item.partName} ({item.color}/{item.size})</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">{item.quantity} cái</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setIsConfirmOpen(false)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy bỏ</button>
                <button onClick={executeSaveAll} className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200">Xác nhận & Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutComponent>
  );
}

