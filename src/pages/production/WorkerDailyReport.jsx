import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChevronRight, X, ClipboardCheck, Loader2, BookOpen } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import OwnerLayout from "@/layouts/OwnerLayout";
import { toast } from "react-toastify";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ProductionPartService from "@/services/ProductionPartService";
import { getStoredUser } from "@/lib/authStorage";
import { getErrorMessage } from "@/utils/errorUtils";
import { getPrimaryWorkspaceRole, hasAnyRole } from "@/lib/internalRoleFlow";


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

  const nameCandidates = [
    ...extractWorkerNames(step?.assignedWorkers),
    ...extractWorkerNames(step?.workerNames),
    ...extractWorkerNames(step?.workers),
    ...extractWorkerNames(step?.workerList),
    ...extractWorkerNames(step?.assignees),
    ...extractWorkerNames(step?.workerName),
  ];
  return nameCandidates.some((name) => currentWorkerNameSet.has(name));
}

function formatDateInput(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

import { getPlanStatusLabel } from "@/utils/statusUtils";

export default function WorkerDailyReport() {
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
  const LayoutComponent = ["worker", "kcs"].includes(primaryRole) ? WorkerLayout : OwnerLayout;
  const currentWorkerIdSet = new Set(
    [currentUser?.id, currentUser?.userId, currentUser?.accountId]
      .filter((value) => value != null && String(value).trim() !== "")
      .map((value) => String(value).trim())
  );
  const currentWorkerNameSet = new Set(
    [currentUser?.fullName, currentUser?.name, currentUser?.userName, currentUser?.username]
      .map((value) => normalizeWorkerValue(value))
      .filter(Boolean)
  );

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

    return !isHidden;
  };

  const initialBase = useMemo(() => {
    if (planSteps.length > 0) {
      const results = [];
      planSteps.forEach((part, pIdx) => {
        // Nếu part đã có thông tin biến thể cụ thể (đã được làm phẳng từ ProductionDetail)
        if (part.colorName || part.sizeName || part.variant || part.partOrderSizeId) {
          if (isStepAssignedToCurrentWorker(part, currentWorkerIdSet, currentWorkerNameSet)) {
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
              cumulativeToday: part.actualQuantity || 0, // Fallback for visibility
            });
          }
          return;
        }

        // Trường hợp fallback: Nếu dữ liệu chưa được làm phẳng
        const variants = part.variants || part.listPartOrderSizes || [];
        variants.forEach((v, vIdx) => {
          if (isStepAssignedToCurrentWorker(v, currentWorkerIdSet, currentWorkerNameSet)) {
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
            });
          }
        });
      });
      return results;
    }

    if (assignment) {
      if (isStepAssignedToCurrentWorker(assignment, currentWorkerIdSet, currentWorkerNameSet)) {
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
  }, [planSteps, assignment, currentWorkerIdSet, currentWorkerNameSet]);

  const today = useMemo(() => formatDateInput(), []);
  const [reportDate, setReportDate] = useState(today);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [rows, setRows] = useState(() =>
    initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
  );

  const isToday = reportDate === today;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [changedItems, setChangedItems] = useState([]);

  const fetchNotebookLogs = async (row) => {
    if (!row?.productionId) return;

    try {
      setIsLoadingLogs(true);
      setActiveRowId(row.id);

      const nbRes = await CuttingNotebookService.getByProduction(row.productionId);
      const nbData = nbRes?.data?.data || nbRes?.data || nbRes;

      const notebook = Array.isArray(nbData) ? nbData[0] : nbData;
      if (!notebook || !notebook.id) {
        toast.info("Không tìm thấy sổ cắt cho đơn sản xuất này.");
        return;
      }

      const logsRes = await CuttingNotebookService.getListLogs(notebook.id);
      const logs = logsRes?.data?.data || logsRes?.data || logsRes;

      setCurrentNotebookLogs(Array.isArray(logs) ? logs : []);
      setShowLogSelector(true);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, "Lỗi khi tải dữ liệu sổ cắt."));
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSelectLog = (log) => {
    const qty = log.productQty || log.quantity || 0;
    handleChange(activeRowId, "quantity", qty);
    toast.success(`Đã lấy sản lượng (${qty}) từ sổ cắt.`);
    setShowLogSelector(false);
  };

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.cpu) || 0), 0),
    [rows]
  );

  const handleChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          let nextValue = value;
          if (field === "quantity") {
            nextValue = String(value).replace(/[^0-9]/g, "");
            const num = Number(nextValue);
            const maxAllowed = (row.qtyVar || 0) - (row.finVar || 0);

            if (num > maxAllowed && maxAllowed > 0) {
              nextValue = String(maxAllowed);
              toast.warning(`Chỉ được báo cáo tối đa ${maxAllowed} sản phẩm.`);
            }
          }
          return { ...row, [field]: nextValue };
        }
        return row;
      })
    );
  };

  const displayedRows = rows.filter(row => {
    if (!isToday) return true;
    // Hide if already reported today (logReadOnly is set in sync logic)
    if (row.logReadOnly) return false;
    return isStepAvailableForReporting(row);
  });

  const normalizeDateString = (target) => {
    if (!target) return "";
    const raw = String(target).trim();
    if (raw.includes("/")) {
      const [mm, dd, yyyy] = raw.split("/").map((v) => v.trim());
      if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    // Handle ISO string or date string with T
    if (raw.includes("T")) {
      return raw.split("T")[0];
    }
    return raw.substring(0, 10);
  };

  const sameDate = (value, target) => {
    if (!value || !target) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const normalizedTarget = normalizeDateString(target);
    return `${yyyy}-${mm}-${dd}` === normalizedTarget;
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
      const productionId = plan?.production?.productionId || activeRows.find(r => r.productionId)?.productionId;

      if (productionId) {
        try {
          const res = await ProductionPartService.getPartsByProduction(productionId, { PageSize: 100 });
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
                finished: v.finishedQuantity || 0,
                partId: p.id || p.partId,
                partOrderSizeId: v.id || v.partOrderSizeId
              };

              latestDataMap.set(idKey, data);
              latestDataMap.set(nameKey, data);
            });
          });

          // NEW: Fetch today's logs to block multiple reports
          const currentId = currentUser?.userId || currentUser?.id;
          // Try to use a very simple query to avoid 400
          const logRes = await ProductionPartService.getProductionWorkLogs(productionId, {
            WorkerId: Number(currentId)
          }).catch(err => {
            console.error("Lỗi gọi work-logs:", err);
            return { data: [] };
          });

          const logList = unwrapArrayPayload(logRes);
          const targetDateStr = normalizeDateString(new Date());
          const reportedTodayMap = new Map();

          logList.forEach(log => {
            const logDate = normalizeDateString(log.createDate || log.workDate);
            if (logDate === targetDateStr) {
              // Store by ID
              reportedTodayMap.set(String(log.partOrderSizeId), log);
            }
          });

          setRows(prev => (prev || []).map(row => {
            const idKey = `${row.partId}-${row.partOrderSizeId}`;
            const rowStageName = normalizeName(row.partName);
            const rowColor = normalizeName(row.color);
            const rowSize = normalizeName(row.size);
            const nameKey = `${rowStageName}-${rowColor}-${rowSize}`;

            const latest = latestDataMap.get(idKey) || latestDataMap.get(nameKey);

            // Check if reported today by ID
            const existingLog = reportedTodayMap.get(String(row.partOrderSizeId)) ||
              reportedTodayMap.get(String(latest?.partOrderSizeId));

            if (latest) {
              return {
                ...row,
                partId: row.partId || latest.partId,
                partOrderSizeId: row.partOrderSizeId || latest.partOrderSizeId,
                qtyVar: latest.total,
                finVar: latest.finished,
                quantity: existingLog ? String(existingLog.quantity) : "",
                logReadOnly: !!existingLog,
                workLogId: existingLog?.id || null
              };
            }
            return row;
          }));
        } catch (err) {
          console.error("Lỗi đồng bộ dữ liệu:", err);
        }
      }
    };
    initData();
  }, [rows?.length]);

  const buildPayload = (row) => {
    const currentId = currentUser?.userId || currentUser?.id;
    return {
      userId: Number(currentId) || 1,
      quantity: Number(row?.quantity || 0),
    };
  };

  const handlePreSaveCheck = () => {
    if (!isToday || isSavingAll) return;
    const currentRows = rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;

    // Detect actual changes compared to current saved rows
    const errors = [];
    const changes = currentRows.filter((row) => {
      if (!row.partId || row.logReadOnly) return false;
      const currentQty = Number(row.quantity || 0);
      const limit = (row.qtyVar || 0) - (row.finVar || 0);

      if (currentQty > limit && limit > 0) {
        errors.push(`${row.partName} (${row.color}/${row.size}): Số lượng vượt quá mức cho phép.`);
      }

      // If it has quantity > 0, it's a new report to save
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
          if (!row?.partId || row.logReadOnly) return { row, skipped: true };

          const isChanged = changedItems.some(c => c.id === row.id);
          if (!isChanged) return { row, skipped: true };

          const payload = buildPayload(row);
          const response = await ProductionPartService.createWorkLog(row.partId, row.partOrderSizeId, payload);
          let createdId = unwrapObjectId(response);
          return { row, createdId };
        })
      );

      const failed = results
        .map((res, idx) => ({ res, row: currentRows[idx] }))
        .filter((item) => item.res.status === "rejected");

      const failedWithReasons = failed.map((item) => ({
        row: item.row,
        reason: getErrorMessage(item.res.reason, "Lỗi không xác định")
      }));

      const updatedRows = currentRows.map((row, idx) => {
        const res = results[idx];
        if (res.status !== "fulfilled") return row;
        const createdId = res.value?.createdId ?? row.workLogId ?? null;
        return { ...row, workLogId: createdId };
      });

      setRows(updatedRows.map((row) => ({ ...row, quantity: "" })));

      if (failed.length === 0) {
        toast.success("Đã lưu báo cáo thành công.");
      } else {
        // Ghi log chi tiết lỗi vào console cho developer
        console.error("Chi tiết lưu thất bại:", failedWithReasons);

        // Thông báo cho người dùng một cách thân thiện
        const firstFailed = failedWithReasons[0];
        if (failed.length === 1) {
          toast.error(`${firstFailed.row.partName}: ${firstFailed.reason}`);
        } else {
          toast.error(`Lỗi lưu ${failed.length} dòng. Dòng đầu tiên (${firstFailed.row.partName}): ${firstFailed.reason}`);
        }
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
                    const target = `/production/${prodId}`;
                    navigate(target);
                  } else {
                    navigate(-1);
                  }
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {assignment ? "Báo cáo sản lượng công đoạn" : "Báo cáo sản lượng hằng ngày"}
                </h1>
                <p className="text-slate-600">
                  {assignment
                    ? "Nhập số lượng vừa hoàn thành cho công đoạn được chọn."
                    : "Nhập số lượng vừa hoàn thành hằng ngày."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const firstRow = displayedRows[0] || rows[0];
                  const prodId = plan?.production?.id || plan?.production?.productionId || assignment?.productionId || firstRow?.productionId;
                  
                  if (prodId) {
                    navigate(`/production-plan/${prodId}/history`, { 
                      state: { productionId: prodId } 
                    });
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
                  {isSavingAll ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <ClipboardCheck size={16} />
                  )}
                  Lưu báo cáo
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày báo cáo</div>
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
                  {displayedRows.length > 0 ? (
                    displayedRows.map((row, index) => (
                      <tr key={`wr-${row.id}-${index}`} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-2 py-2 text-center text-xs text-slate-500">{index + 1}</td>
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
                                const hasData = row.qtyVar > 0;

                                if (row.logReadOnly) {
                                  return (
                                    <div className="flex flex-col items-center gap-1.5 py-1">
                                      <div className="text-sm font-black text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                                        {row.quantity}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-medium italic underline decoration-slate-200 decoration-1 underline-offset-2">
                                        Đã báo cáo. Vào Sổ ghi chép để sửa/xóa.
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <>
                                    <input
                                      type="number"
                                      min="0"
                                      max={mQty}
                                      value={row.quantity}
                                      placeholder={!hasData ? "Nhập số lượng..." : mQty > 0 ? `Tối đa ${mQty}...` : "Đã hoàn thành"}
                                      onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                                      className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-sm font-black outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-inner"
                                    />
                                    {hasData && mQty > 0 && (
                                      <div className="text-[10px] text-slate-400 text-center font-medium">
                                        <span>Số lượng còn lại: {mQty}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-center text-slate-900 font-black">
                              {row.quantity === "" ? "-" : row.quantity}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <BookOpen size={48} className="text-slate-200 mb-2" />
                          <p className="font-semibold text-slate-600">Bạn chưa có công việc được giao</p>
                          <p className="text-xs">Vui lòng liên hệ quản lý hoặc chờ kế hoạch sản xuất mới.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {displayedRows.length > 0 && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="px-3 py-4 font-bold text-slate-500 text-right uppercase tracking-wider text-[10px]">TỔNG TIỀN BÁO CÁO:</td>
                      <td className="px-2 py-4 text-center font-black text-emerald-700 text-lg whitespace-nowrap border-x border-slate-100/50 bg-emerald-50/30">
                        {totalAmount.toLocaleString("vi-VN")} đ
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white/95 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <ClipboardCheck size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Xác nhận báo cáo sản lượng</h3>
                  <p className="text-emerald-50/80 text-xs">Vui lòng kiểm tra lại các thông tin trước khi lưu</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Danh sách các phần tử thay đổi</div>
              <div className="max-h-[300px] overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Công đoạn</th>
                      <th className="px-4 py-2 text-right">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {changedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700">{item.partName}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-700">{item.quantity} cái</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsConfirmOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={executeSaveAll}
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                  >
                    Xác nhận & Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutComponent>
  );
}














