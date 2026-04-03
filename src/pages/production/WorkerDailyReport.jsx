import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, BookOpen, ChevronRight, X, ClipboardCheck } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import CuttingNotebookService from "@/services/CuttingNotebookService";
import { toast } from "react-toastify";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ProductionPartService from "@/services/ProductionPartService";
import { getStoredUser } from "@/lib/authStorage";
import { getErrorMessage } from "@/utils/errorUtils";
import { hasAnyRole } from "@/lib/internalRoleFlow";


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

  const filteredPlanSteps = (() => {
    if (planSteps.length === 0) return [];
    return planSteps.filter((step) =>
      isStepAssignedToCurrentWorker(step, currentWorkerIdSet, currentWorkerNameSet)
    );
  })();

  const initialBase = planSteps.length > 0
    ? filteredPlanSteps.map((step, index) => ({
      id: step?.id ?? step?.partId ?? `${plan?.production?.productionId || "plan"}-${index}`,
      partId: step?.partId ?? step?.id ?? null,
      productionId: plan?.production?.productionId ?? step?.productionId ?? "",
      orderName: plan?.production?.orderName ?? "",
      partName: step?.partName ?? step?.name ?? "-",
      cpu: step?.cpu ?? step?.unitPrice ?? 0,
      workLogId: step?.workLogId ?? null,
      logReadOnly: false,
      status: step?.status,
      statusName: step?.statusName,
      statusId: step?.statusId,
      assignedWorkers: step?.assignedWorkers ?? step?.workerNames ?? step?.workers ?? step?.workerList ?? step?.assignees ?? [],
      assignedWorkerIds: step?.assignedWorkerIds ?? step?.workerIds ?? step?.assigneeIds ?? [],
      isCuttingStep: step?.isCuttingStep ?? false,
    }))
    : (assignment
      ? (isStepAssignedToCurrentWorker(assignment, currentWorkerIdSet, currentWorkerNameSet)
        ? [{
          ...assignment,
          status: assignment?.status,
          statusName: assignment?.statusName,
          statusId: assignment?.statusId
        }]
        : [])
      : MOCK_TASKS);

  const today = useMemo(() => formatDateInput(), []);
  const [reportDate, setReportDate] = useState(today);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [rows, setRows] = useState(() =>
    initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
  );

  const isToday = reportDate === today;

  const [isEditing, setIsEditing] = useState(() => {
    if (assignment) return isStepAvailableForReporting(assignment);
    const available = filteredPlanSteps.filter(isStepAvailableForReporting);
    return available.length > 0;
  });

  const [draftRows, setDraftRows] = useState(() =>
    planSteps.length > 0 || assignment
      ? initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
      : null
  );

  const [showLogSelector, setShowLogSelector] = useState(false);
  const [currentNotebookLogs, setCurrentNotebookLogs] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

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
    let nextValue = value;
    if (field === "quantity") {
      nextValue = String(value).replace(/[^0-9]/g, "");
    }
    setDraftRows((prev) =>
      Array.isArray(prev) ? prev.map((row) => (row.id === id ? { ...row, [field]: nextValue } : row)) : prev
    );
  };

  const canEdit = isToday && isEditing;
  const allRows = isEditing ? (draftRows || []) : rows;
  const displayedRows = allRows.filter(row => {
    if (!isToday) return true;
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

  const normalizeName = (value) => String(value || "").trim().toLowerCase();
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
    let active = true;
    const loadLogs = async () => {
      if (!Array.isArray(rows) || rows.length === 0) return;

      // Clear existing quantities and IDs before loading for a new date
      // but keep the basic info (partId, name, etc.)
      setRows(prev => prev.map(row => ({
        ...row,
        workLogId: null,
        logReadOnly: false,
        quantity: ""
      })));
      setDraftRows(null);
      setIsEditing(false);

      let rowsToUse = rows;
      const missingPart = rows.filter((row) => !row.partId && row.partName);
      const productionId =
        plan?.production?.productionId || rows.find((row) => row.productionId)?.productionId;
      if (missingPart.length > 0 && productionId) {
        try {
          const res = await ProductionPartService.getPartsByProduction(productionId, { PageSize: 100 });
          const payload = res?.data?.data ?? res?.data ?? [];
          const partList = Array.isArray(payload) ? payload : [];
          const nameToId = new Map(
            partList
              .map((p) => [normalizeName(p?.partName ?? p?.name), p?.id ?? p?.partId])
              .filter(([name, id]) => name && id != null)
          );
          rowsToUse = rows.map((row) => {
            if (row.partId) return row;
            const mappedId = nameToId.get(normalizeName(row.partName));
            return mappedId ? { ...row, partId: mappedId } : row;
          });
          setRows(rowsToUse);
          setDraftRows((prev) => (prev ? rowsToUse.map((row) => ({ ...row })) : prev));
        } catch (err) {
          console.error(err);
        }
      }

      const partIds = rowsToUse.map((row) => row.partId).filter(Boolean);
      const partIdKeys = partIds.map((id) => String(id));
      if (partIds.length === 0) return;
      setIsLoadingLogs(true);
      try {
        const responses = await Promise.all(
          partIds.map((partId) => ProductionPartService.getWorkLogs(partId))
        );
        if (!active) return;
        const byPart = new Map();
        responses.forEach((res, idx) => {
          const partId = partIdKeys[idx];
          const effectiveList = unwrapArrayPayload(res);
          if (effectiveList.length === 0) return;

          // Find the EXACT log for the selected reportDate (ignoring time) AND current user
          const targetDateStr = normalizeDateString(reportDate); // yyyy-mm-dd
          const matchLog = effectiveList.find(log => {
            const logDate = normalizeDateString(log.workDate || log.reportDate);
            const logUserId = String(log.userId || log.uId || "");
            const matchesUser = currentWorkerIdSet.has(logUserId);
            return logDate === targetDateStr && matchesUser;
          });

          if (matchLog) byPart.set(partId, matchLog);
        });

        const applyLogs = (list) =>
          list.map((row) => {
            const log = row.partId ? byPart.get(String(row.partId)) : null;
            if (!log) {
              // Reset transient fields if no log is found for the current reportDate
              return { ...row, quantity: "", workLogId: null, logReadOnly: false };
            }
            const nextQty = log.quantity ?? "";
            return {
              ...row,
              workLogId: log.id ?? row.workLogId ?? null,
              logReadOnly: Boolean(log.isReadOnly),
              quantity: nextQty,
            };
          });

        const applied = applyLogs(rowsToUse);
        setRows(applied);
        setDraftRows((prev) => (prev ? applied.map((r) => ({ ...r })) : prev));
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setIsLoadingLogs(false);
      }
    };
    loadLogs();
    return () => {
      active = false;
    };
  }, [reportDate, rows.length]);

  const beginEdit = () => {
    setDraftRows(rows.map((row) => ({ ...row })));
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftRows(null);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (!draftRows) return;
    setRows(draftRows);
    setDraftRows(null);
    setIsEditing(false);
  };

  const buildPayload = (row) => {
    const currentId = currentUser?.userId || currentUser?.id;
    const workDate = reportDate
      ? new Date(reportDate).toISOString()
      : new Date().toISOString();

    return {
      partId: row?.partId ? Number(row.partId) : 0,
      userId: Number(currentId) || 1,
      quantity: Number(row?.quantity || 0),
      workDate,
    };
  };

  const handlePreSaveCheck = () => {
    if (!canEdit || isSavingAll) return;
    const currentRows = isEditing ? draftRows : rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;

    // Detect actual changes compared to current saved rows
    const errors = [];
    const changes = currentRows.filter((row) => {
      if (!row.partId || row.logReadOnly) return false;
      const original = rows.find((r) => r.id === row.id);
      const currentQty = Number(row.quantity || 0);
      const originalQty = original ? Number(original.quantity || 0) : 0;

      // Local validation: Check against max order quantity if available
      if (maxQty !== null && currentQty > maxQty) {
        errors.push(`${row.partName}: Số lượng (${currentQty}) vượt quá tổng đơn hàng (${maxQty}).`);
      }

      // If it's a new entry (no workLogId) and has quantity > 0, it's a change
      if (!row.workLogId && currentQty > 0) return true;
      // If it's an existing entry and quantity is different
      if (row.workLogId && currentQty !== originalQty) return true;

      return false;
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    if (changes.length === 0) {
      toast.info("Không có thay đổi nào để lưu.");
      return;
    }

    setChangedItems(changes);
    setIsConfirmOpen(true);
  };

  const executeSaveAll = async () => {
    setIsConfirmOpen(false);
    if (!canEdit || isSavingAll) return;
    const currentRows = isEditing ? draftRows : rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;
    setIsSavingAll(true);
    try {
      const results = await Promise.allSettled(
        currentRows.map(async (row) => {
          if (!row?.partId) return { row, skipped: true };
          if (row.logReadOnly) return { row, skipped: true };

          // Only save if it's in the changedItems list to optimize (optional, but let's stick to user request)
          // Actually, let's keep original logic but only call for those with changes to be safe
          const isChanged = changedItems.some(c => c.id === row.id);
          if (!isChanged) return { row, skipped: true };

          const payload = buildPayload(row);
          let createdId = row.workLogId ?? null;
          if (row.workLogId) {
            await ProductionPartService.updateWorkLog(row.partId, row.workLogId, payload);
          } else {
            const response = await ProductionPartService.createWorkLog(row.partId, payload);
            createdId = unwrapObjectId(response);
          }
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

      setRows(updatedRows.map((row) => ({ ...row })));
      setDraftRows(updatedRows.map((row) => ({ ...row })));

      if (failed.length === 0) {
        setIsEditing(false);
        setDraftRows(null);
        toast.success("Đã lưu tất cả báo cáo thành công.");
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
    <WorkerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  const prodId = plan?.production?.productionId ?? assignment?.productionId;
                  if (prodId) {
                    const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
                    const isWorkerRole = hasAnyRole(roleValue, ["Worker", "KCS"]);
                    const target = isWorkerRole ? `/worker/production-plan/${prodId}` : `/production/${prodId}`;
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
                    ? "Nhập số lượng hoàn thành cho công đoạn được chọn."
                    : "Nhập số lượng đã hoàn thành theo công đoạn."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={beginEdit}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  disabled={!isToday}
                >
                  Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handlePreSaveCheck}
                    disabled={!canEdit || isSavingAll}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isSavingAll ? "Đang lưu..." : "Lưu"}
                  </button>
                </>
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
                    <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th w-36 px-3 py-3 text-left">Đơn sản xuất</th>
                    <th className="leave-table-th w-44 px-3 py-3 text-left">Đơn hàng</th>
                    <th className="leave-table-th w-52 px-3 py-3 text-left">Công đoạn</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Đơn giá</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRows.length > 0 ? (
                    displayedRows.map((row, index) => (
                      <tr key={row.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center">{index + 1}</td>
                        <td className="px-3 py-2 text-slate-700">#PR-{row.productionId}</td>
                        <td className="px-3 py-2 text-slate-700">{row.orderName}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.partName}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">
                          {row.cpu ? `${row.cpu.toLocaleString("vi-VN")} VND` : "-"}
                        </td>
                        <td className="px-3 py-2">
                          {canEdit && !row.logReadOnly ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxQty || undefined}
                                  value={row.quantity}
                                  onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                                />
                                {row.isCuttingStep && (
                                  <button
                                    type="button"
                                    onClick={() => fetchNotebookLogs(row)}
                                    title="Lấy dữ liệu từ sổ cắt"
                                    className="flex h-9 w-10 min-w-[40px] items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                  >
                                    <BookOpen size={16} />
                                  </button>
                                )}
                              </div>
                              {maxQty !== null && (
                                <div className="text-[10px] text-slate-400 text-center font-medium">
                                  Tối đa: {maxQty}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-slate-700 font-medium">
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
                      <td colSpan={4} className="px-3 py-4 font-bold text-slate-700 text-right">TỔNG CỘNG:</td>
                      <td colSpan={2} className="px-3 py-4 text-center font-bold text-emerald-700 text-lg whitespace-nowrap">
                        {totalAmount.toLocaleString("vi-VN")} đ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {/* Cutting Log Selector Modal */}
      {showLogSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-none">Chọn từ Sổ cắt</h3>
                  <p className="text-xs text-slate-500 mt-1">Lấy sản lượng đã cắt vào báo cáo</p>
                </div>
              </div>
              <button onClick={() => setShowLogSelector(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Màu</th>
                    <th className="px-4 py-3 text-center">Số lớp</th>
                    <th className="px-4 py-3 text-center">Sản lượng</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentNotebookLogs.length > 0 ? (
                    currentNotebookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{log.color || "-"}</td>
                        <td className="px-3 py-3 text-center italic">{log.layer || 0}</td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">
                          {log.productQty || log.quantity || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleSelectLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Chọn <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Không tìm thấy log.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowLogSelector(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-bold text-slate-600">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
    </WorkerLayout>
  );
}














