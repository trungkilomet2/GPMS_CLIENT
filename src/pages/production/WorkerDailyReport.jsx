import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import WorkerLayout from "@/layouts/WorkerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import ProductionPartService from "@/services/ProductionPartService";
import { getStoredUser } from "@/lib/authStorage";

const MOCK_TASKS = [
  {
    id: 1,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Diễu nẹp cổ",
    cpu: 800,
  },
  {
    id: 2,
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Đính mác",
    cpu: 200,
  },
  {
    id: 3,
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Kiểm hàng",
    cpu: 100,
  },
];

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

export default function WorkerDailyReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const assignment = location.state?.assignment || null;
  const plan = location.state?.plan || null;
  const planSteps = Array.isArray(plan?.steps) ? plan.steps : [];
  const currentUser = getStoredUser() || {};
  const currentWorkerIdSet = new Set(
    [currentUser?.id, currentUser?.userId, currentUser?.accountId, localStorage.getItem("userId")]
      .filter((value) => value != null && String(value).trim() !== "")
      .map((value) => String(value).trim())
  );
  const currentWorkerNameSet = new Set(
    [currentUser?.fullName, currentUser?.name, currentUser?.userName, currentUser?.username]
      .map((value) => normalizeWorkerValue(value))
      .filter(Boolean)
  );
  const filteredPlanSteps = (() => {
    if (planSteps.length === 0) return [];
    const hasAssignmentData = planSteps.some((step) => hasWorkerAssignmentMetadata(step));
    if (!hasAssignmentData) return planSteps;
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
      assignedWorkers: step?.assignedWorkers ?? step?.workerNames ?? step?.workers ?? step?.workerList ?? step?.assignees ?? [],
      assignedWorkerIds: step?.assignedWorkerIds ?? step?.workerIds ?? step?.assigneeIds ?? [],
    }))
    : (assignment
      ? [assignment].filter((item) =>
        isStepAssignedToCurrentWorker(item, currentWorkerIdSet, currentWorkerNameSet)
      )
      : MOCK_TASKS);
  const today = useMemo(() => formatDateInput(), []);
  const [reportDate, setReportDate] = useState(today);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [rows, setRows] = useState(() =>
    initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
  );
  const [isEditing, setIsEditing] = useState(
    Boolean(assignment) || (planSteps.length > 0 && filteredPlanSteps.length > 0)
  );
  const [draftRows, setDraftRows] = useState(() =>
    planSteps.length > 0 || assignment
      ? initialBase.map((task) => ({ ...task, quantity: task?.quantity ?? "" }))
      : null
  );

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.cpu) || 0), 0),
    [rows]
  );

  const handleChange = (id, field, value) => {
    setDraftRows((prev) =>
      Array.isArray(prev) ? prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)) : prev
    );
  };

  const isToday = reportDate === today;
  const canEdit = isToday && isEditing;
  const displayedRows = isEditing ? (draftRows || []) : rows;

  const normalizeDateString = (target) => {
    if (!target) return "";
    const raw = String(target).trim();
    if (raw.includes("/")) {
      const [mm, dd, yyyy] = raw.split("/").map((v) => v.trim());
      if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return raw;
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
          const latest = effectiveList.sort((a, b) => new Date(b.workDate) - new Date(a.workDate))[0];
          if (latest) byPart.set(partId, latest);
        });

        const applyLogs = (list) =>
          list.map((row) => {
            const log = row.partId ? byPart.get(String(row.partId)) : null;
            if (!log) return row;
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
        setDraftRows((prev) => (prev ? applied : prev));
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
    const storedUserId = localStorage.getItem("userId");
    const workDate = reportDate
      ? new Date(reportDate).toISOString()
      : new Date().toISOString();
    return {
      partId: Number(row.partId),
      userId: Number(storedUserId) || 1,
      quantity: Number(row.quantity || 0),
      workDate,
    };
  };

  const saveAll = async () => {
    if (!canEdit || isSavingAll) return;
    const currentRows = isEditing ? draftRows : rows;
    if (!Array.isArray(currentRows) || currentRows.length === 0) return;
    setIsSavingAll(true);
    try {
      const results = await Promise.allSettled(
        currentRows.map(async (row) => {
          if (!row?.partId) return { row, skipped: true };
          if (row.logReadOnly) return { row, skipped: true };
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
      }
    } catch (err) {
      console.error(err);
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
                onClick={() => navigate(-1)}
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
                    onClick={saveAll}
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
                  {displayedRows.map((row, index) => (
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
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(event) => handleChange(row.id, "quantity", event.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                          />
                        ) : (
                          <div className="text-center text-slate-700 font-medium">
                            {row.quantity === "" ? "-" : row.quantity}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        Không có công đoạn nào được giao cho tài khoản hiện tại.
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-3 py-3 font-semibold text-slate-700">TOTAL</td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">
                      {totalAmount.toLocaleString("vi-VN")} VND
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}














