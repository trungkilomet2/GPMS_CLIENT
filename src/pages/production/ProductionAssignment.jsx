import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Users, Check, AlertTriangle, Info, Save, Send, ChevronDown, ChevronRight } from "lucide-react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import OwnerLayout from "@/layouts/OwnerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import "@/styles/homepage.css";
import "@/styles/leave.css";

import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import WorkerService from "@/services/WorkerService";
import { toast } from "react-toastify";
import ConfirmModal from "@/components/ConfirmModal";
import { getPlanStatusLabel, STATUS_STYLES } from "@/utils/statusUtils";

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
  const [workerGroups, setWorkerGroups] = useState([]); // Groups of workers by manager
  const [ungroupedWorkers, setUngroupedWorkers] = useState([]); // Standalone workers
  const [collapsedGroups, setCollapsedGroups] = useState({}); // Track collapsed state of groups
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
  const [initialAssignments, setInitialAssignments] = useState({}); // To track changes
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isOwnerView, setIsOwnerView] = useState(false);
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
        orderId: order.id || order.orderId || null,
        orderName: order.orderName,
        pStartDate: payload.startDate ?? order.startDate ?? null,
        pEndDate: payload.endDate ?? order.endDate ?? null,
        status: payload.statusName || payload.status,
        pmName: pm.fullName || pm.name || (pm.id ? `Người Quản lý #${pm.id}` : "-"),
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
      setWorkerError("Không thể tải thông tin đơn sản xuất.");
    });
    return () => { active = false; };
  }, [selectedProductionId, incoming]);

  const selectedProduction = useMemo(() => {
    const incomingPmId = incoming?.production?.pmId || incoming?.production?.pm?.id;
    if (incoming?.production && incomingPmId) {
      return {
        ...incoming.production,
        orderId: incoming.production.orderId ?? incoming.production.order?.id ?? incoming.production.order?.orderId ?? null,
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
        const res = await ProductionPartService.getPartsByProduction(selectedProductionId, { PageSize: 100 });
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

    // Create a pool of backend parts to track which ones have been matched
    const availableBackendParts = backendParts.map((p, idx) => ({ ...p, originalIndex: idx }));

    return sourceSteps.map((row, index) => {
      // 1. Try to match by exact name first
      let matchIdx = availableBackendParts.findIndex(p => p.partName === row.partName || p.name === row.partName);

      // 2. If no name match, fallback to the same index (assuming order is preserved)
      if (matchIdx === -1) {
        matchIdx = availableBackendParts.findIndex(p => p.originalIndex === index);
      }

      let realPart = null;
      if (matchIdx !== -1) {
        realPart = availableBackendParts[matchIdx];
        // Remove the matched part so it can't be matched twice
        availableBackendParts.splice(matchIdx, 1);
      }

      return {
        ...row,
        ppId: realPart?.id ?? (2000 + index), // Use real backend ID if available
        realPartId: realPart?.id ?? null,
        statusName: realPart?.statusName || getPlanStatusLabel(realPart?.statusId),
        statusId: realPart?.statusId,
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
    const pmId = selectedProduction?.pmId || selectedProduction?.pm?.id || null;
    const fromDate = selectedProduction?.pStartDate || selectedProduction?.startDate
      || selectedProduction?.product?.startDate || "2026-01-01";
    const toDate = selectedProduction?.pEndDate || selectedProduction?.endDate
      || selectedProduction?.product?.endDate || "2026-12-31";
    const pm = selectedProduction?.pm || {};
    const currentUser = getStoredUser();
    const roleValue = currentUser?.role ?? currentUser?.roles ?? currentUser?.roleName ?? "";
    const isOwner = hasAnyRole(roleValue, ["owner", "admin"]);
    setIsOwnerView(isOwner);

    if (!pmId) {
      setWorkerError("Không tìm thấy thông tin PM quản lý đơn sản xuất này.");
      return;
    }

    if (isOwner) {
      // Owner: fetch ALL employees and group by manager
      WorkerService.getEmployeeDirectory()
        .then((res) => {
          const allEmployees = res?.data || [];
          // Filter only active workers/PMs (exclude Admin, Customer, inactive)
          const eligible = allEmployees.filter(emp => {
            if (emp.status !== "active") return false;
            const sysRole = (emp.primarySystemRole || "").toLowerCase();
            if (["admin", "customer"].includes(sysRole)) return false;

            // If the production is assigned directly to the owner, show all workers
            const assignedPmIsOwner = isOwner && String(pmId) === String(currentUser?.id);
            if (assignedPmIsOwner) return true;

            // Otherwise, only keep the PM assigned to this production, their workers, or other owners
            const isAssignedPm = String(emp.id) === String(pmId);
            const isWorkerOfAssignedPm = String(emp.managerId) === String(pmId);
            const isCurrentOwner = sysRole === "owner";

            if (!isAssignedPm && !isWorkerOfAssignedPm && !isCurrentOwner) return false;

            return true;
          });

          const mapped = eligible.map(emp => ({
            id: String(emp.id),
            fullName: emp.fullName || emp.userName || "No name",
            status: "ready",
            frequentSteps: emp.workerSkillLabels || emp.workerSkillNames || [],
            leaveDate: "",
            role: emp.primaryRoleLabel || emp.primarySystemRole || "Thợ may",
            managerId: emp.managerId ?? null,
            managerName: emp.managerName || "",
          }));

          // Inject Owner if not in list
          if (currentUser?.id && !mapped.some(w => String(w.id) === String(currentUser.id))) {
            mapped.push({
              id: String(currentUser.id),
              fullName: currentUser.fullName || currentUser.name || "Chủ xưởng",
              status: "ready",
              frequentSteps: [],
              leaveDate: "",
              role: "Chủ xưởng",
              managerId: null,
              managerName: "",
            });
          }

          // Active managers: all distinct managerIds that are assigned to someone
          const activeManagerIds = new Set(mapped.filter(w => w.managerId).map(w => String(w.managerId)));

          // Build groups by managerId
          const groupMap = new Map();
          const ungrouped = [];

          mapped.forEach(w => {
            let mgrKey = w.managerId ? String(w.managerId) : null;

            // If the worker is a manager themselves (their ID manages others), force them into their own group
            if (activeManagerIds.has(String(w.id))) {
              mgrKey = String(w.id);
            }

            // Owner should never be grouped under anyone
            if (w.role === "Chủ xưởng" || w.role === "Owner" || w.role === "owner") {
              mgrKey = null;
            }

            if (mgrKey) {
              let mgrLabel = w.managerName;
              if (!mgrLabel) {
                const manager = allEmployees.find(e => String(e.id) === mgrKey);
                mgrLabel = manager ? (manager.fullName || manager.userName) : `Quản lý #${mgrKey}`;
              }
              if (!groupMap.has(mgrKey)) {
                groupMap.set(mgrKey, { managerId: mgrKey, managerName: mgrLabel, workers: [] });
              }
              groupMap.get(mgrKey).workers.push(w);
            } else {
              ungrouped.push(w);
            }
          });

          // Sort groups: PM of production first, then others
          const groups = Array.from(groupMap.values()).sort((a, b) => {
            if (a.managerId === String(pmId)) return -1;
            if (b.managerId === String(pmId)) return 1;
            return a.managerName.localeCompare(b.managerName);
          });

          setWorkerGroups(groups);
          setUngroupedWorkers(ungrouped);
          setWorkers(mapped);
        })
        .catch((err) => {
          setWorkerError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Lỗi tải danh sách nhân viên");
        });
    } else {
      // PM: use existing assign-workers API
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

              let roleLabel = w.role || "Nhân viên";
              if (roleLabel.toLowerCase() === "worker") roleLabel = "Nhân viên";
              if (roleLabel.toLowerCase() === "pm") roleLabel = "Quản lý sản xuất";

              return {
                id: String(info.workerId || info.id || ""),
                fullName: info.workerName || info.fullName || info.userName || "No name",
                status: hasLeave ? "leave" : (w.statusId === 2 ? "leave" : "ready"),
                frequentSteps: skills,
                leaveDate: leaveDate || w.leaveDate || "",
                role: roleLabel,
              };
            }).filter(w => w.id !== "");

            // Inject PM managing this production if not in list
            if (pm.id && !mapped.some(w => String(w.id) === String(pm.id))) {
              mapped.push({
                id: String(pm.id),
                fullName: pm.fullName || pm.name || `PM #${pm.id}`,
                status: "ready",
                frequentSteps: [],
                leaveDate: "",
                role: "Quản lý sản xuất", // Translated from "PM"
              });
            }

            setWorkerGroups([]);
            setWorkers(mapped);
          }
        })
        .catch((err) => {
          setWorkerError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Lỗi tải danh sách thợ");
        });
    }
  }, [selectedProductionId, selectedProduction]);

  useEffect(() => {
    setAssignments((prev) => {
      const next = { ...prev };
      const base = { ...initialAssignments };
      let initialized = false;

      // Create a pool of backend parts to ensure 1-to-1 matching
      const pool = backendParts.map((p, idx) => ({ ...p, originalIndex: idx }));

      rows.forEach((row, index) => {
        const existing = next[row.ppId]?.workerIds || [];
        if (existing.length > 0) return;

        // 1. Match by realPartId
        let matchIdx = pool.findIndex(p => p.id === row.realPartId);

        // 2. Match by exact name
        if (matchIdx === -1) {
          matchIdx = pool.findIndex(p => p.partName === row.partName || p.name === row.partName);
        }

        // 3. Match by original preserved index
        if (matchIdx === -1) {
          matchIdx = pool.findIndex(p => p.originalIndex === index);
        }

        let realPart = null;
        if (matchIdx !== -1) {
          realPart = pool[matchIdx];
          pool.splice(matchIdx, 1);
        }

        const initialIds = extractAssignedWorkerIds(realPart, workers);
        next[row.ppId] = { workerIds: initialIds };
        base[row.ppId] = { workerIds: [...initialIds] };
        initialized = true;
      });

      if (initialized) {
        setInitialAssignments(base);
      }
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
        role: worker.role || "",
      })),
    [workers]
  );

  const filteredWorkers = useMemo(() => {
    const q = workerQuery.trim().toLowerCase();
    if (!q) return workerColumns;
    return workerColumns.filter((worker) => worker.label.toLowerCase().includes(q));
  }, [workerColumns, workerQuery]);

  const toggleWorker = (ppId, workerId) => {
    const row = rows.find(r => r.ppId === ppId);
    const lockedStatuses = ["Hoàn Thành", "Đã Hoàn Thành", "Chờ Nghiệm Thu"];
    if (lockedStatuses.includes(row?.statusName) || row?.statusId === 3 || row?.statusId === 4) {
      toast.warning("Công đoạn đã hoàn thành hoặc đang chờ nghiệm thu, không thể thay đổi phân công.");
      return;
    }
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
    const row = rows.find(r => r.ppId === ppId);
    const lockedStatuses = ["Hoàn Thành", "Đã Hoàn Thành", "Chờ Nghiệm Thu"];
    if (lockedStatuses.includes(row?.statusName) || row?.statusId === 3 || row?.statusId === 4) {
      toast.warning("Công đoạn đã hoàn thành hoặc đang chờ nghiệm thu, không thể thay đổi phân công.");
      return;
    }
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

  const handleToggleEdit = () => {
    if (isSaving) return;
    const canAssign = selectedProduction?.status !== "Chờ Xét Duyệt Kế Hoạch" && selectedProduction?.status !== "Cần Chỉnh Sửa Kế Hoạch";
    if (!canAssign) {
      toast.warning("Kế hoạch sản xuất cần được duyệt trước khi phân công lao động.");
      return;
    }
    if (isEditing) {
      // User clicked Save Edit -> show confirm modal
      setIsConfirmOpen(true);
    } else {
      setIsEditing(true);
      setWorkerError(null);
    }
  };

  const handleSaveAssignments = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    try {
      // 1. Identify rows that have real IDs and have CHANGED (Dirty check)
      console.log("=== START SAVE ===");
      console.log("Total rows checking:", rows.length);
      const dirtyRows = rows.filter(row => {
        if (row.realPartId == null) {
          console.warn("Row skipped because realPartId is null:", row.partName);
          return false;
        }

        const currentIds = [...(assignments[row.ppId]?.workerIds || [])].sort().join(',');
        const originalIds = [...(initialAssignments[row.ppId]?.workerIds || [])].sort().join(',');

        const isDirty = currentIds !== originalIds;
        console.log(`Row: ${row.partName} | realPartId: ${row.realPartId} | Current: [${currentIds}] | Original: [${originalIds}] | isDirty: ${isDirty}`);

        return isDirty;
      });

      console.log("Dirty rows to save:", dirtyRows.map(r => r.partName));

      if (dirtyRows.length === 0) {
        setIsEditing(false);
        toast.success("Dữ liệu phân công đã được cập nhật."); // Give a positive feedback even if no API call was needed
        return;
      }


      // 2. Save only dirty rows
      const results = await Promise.allSettled(
        dirtyRows.map((row) => {
          const selectedWorkerIds = (assignments[row.ppId]?.workerIds || []).map(Number);
          // Remove duplicates if any
          const uniqueIds = Array.from(new Set(selectedWorkerIds));
          return ProductionPartService.updateAssignWorker(row.realPartId, { workerIds: uniqueIds });
        })
      );

      const failed = results
        .map((res, idx) => ({ res, row: dirtyRows[idx] }))
        .filter((item) => item.res.status === "rejected");

      if (failed.length > 0) {
        const first = failed[0]?.row;
        toast.error(`Lỗi lưu ${failed.length} công đoạn. Ví dụ: ${first?.partName || "không xác định"}`);
        return;
      }

      toast.success("Lưu dữ liệu phân công thành công!");

      // Update initial state to match current assignments
      const updatedBase = {};
      Object.keys(assignments).forEach(key => {
        updatedBase[key] = { workerIds: [...(assignments[key]?.workerIds || [])] };
      });
      setInitialAssignments(updatedBase);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setWorkerError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Lỗi khi lưu phân công thợ.");
      toast.error("Phát sinh lỗi khi lưu phân công.");
    } finally {
      setIsSaving(false);
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {Object.values(initialAssignments).some(v => v.workerIds.length > 0)
                    ? "Chỉnh sửa phân công"
                    : "Phân công lao động"}
                </h1>
                <p className="text-slate-600">Phân công theo công đoạn đã lập trong kế hoạch sản xuất.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleEdit}
                disabled={isSaving || (selectedProduction?.status === "Chờ Xét Duyệt Kế Hoạch" || selectedProduction?.status === "Cần Chỉnh Sửa Kế Hoạch")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isEditing
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  } ${(selectedProduction?.status === "Chờ Xét Duyệt Kế Hoạch" || selectedProduction?.status === "Cần Chỉnh Sửa Kế Hoạch") ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                {isSaving ? "Đang lưu..." : (isEditing ? "Lưu chỉnh sửa" : (
                  Object.values(initialAssignments).some(v => v.workerIds.length > 0) ? "Cập nhật phân công" : "Phân công ngay"
                ))}
              </button>
            </div>
          </div>

          {incoming?.production && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
                <InfoItem label="Đơn sản xuất" value={selectedProduction ? `#PR-${selectedProduction.productionId}` : "-"} />
                <InfoItem label="Đơn hàng" value={selectedProduction ? `#ĐH-${selectedProduction.orderId || selectedProduction.order?.id || selectedProduction.order?.orderId || "-"}` : "-"} />
                <InfoItem label="Người quản lý" value={selectedProduction?.pmName || "-"} />
                <InfoItem label="Trạng thái" value={selectedProduction?.status || "-"} />
              </div>
            </div>
          )}

          {!incoming?.production && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm flex items-center gap-3">
              <Info size={18} />
              <span>Vui lòng mở phân công từ <b>Chi tiết kế hoạch sản xuất</b> để tự động lấy dữ liệu công đoạn.</span>
            </div>
          )}

          {(selectedProduction?.status === "Chờ Xét Duyệt Kế Hoạch" || selectedProduction?.status === "Cần Chỉnh Sửa Kế Hoạch") && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 shadow-sm flex items-center gap-3">
              <AlertTriangle size={18} />
              <div>
                <strong>Kế hoạch sản xuất hiện tại chưa được duyệt.</strong>
                <p className="mt-1">Bạn chỉ có thể thực hiện phân công lao động sau khi chủ xưởng đã duyệt thành công bước lập kế hoạch.</p>
              </div>
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
                                <div className="flex items-center gap-2">
                                  <div className="text-base font-semibold text-slate-800">{row.partName}</div>
                                  {row.statusName && (
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[row.statusName] || STATUS_STYLES.default}`}>
                                      {row.statusName}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  Đơn giá: {row.cpu ? `${Number(row.cpu).toLocaleString("vi-VN")} VND` : "-"}
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  {(row.startDate || "-").replace("T", " ").slice(0, 16)} → {(row.endDate || "-").replace("T", " ").slice(0, 16)}
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
                    <div className="text-sm text-slate-600 px-2 py-8 text-center italic">Chọn một công đoạn bên trái để xem danh sách thợ.</div>
                  ) : (
                    (() => {
                      const selectedIds = assignments[activeRow.ppId]?.workerIds || [];
                      const isLocked =
                        activeRow?.statusName === "Hoàn Thành" ||
                        activeRow?.statusName === "Đã Hoàn Thành" ||
                        activeRow?.statusName === "Chờ Nghiệm Thu" ||
                        activeRow?.statusId === 3 || activeRow?.statusId === "3" ||
                        activeRow?.statusId === 4 || activeRow?.statusId === "4";

                      // Render a single worker card
                      const renderWorkerCard = (worker) => {
                        const checked = selectedIds.includes(worker.id);
                        const frequentText = worker.frequentSteps?.length
                          ? worker.frequentSteps.slice(0, 3).join(" • ")
                          : "";
                        const isOnLeave = worker.status === "leave";
                        const isLeaveConflict = isOnLeave && isLeaveDuringRow(worker.leaveDate, activeRow);
                        const canSelect = !!selectedProductionId && isEditing && !isLeaveConflict && !isLocked;
                        const workerRole = worker.role || "";

                        return (
                          <button
                            type="button"
                            aria-pressed={checked}
                            key={`${activeRow.ppId}-${worker.id}`}
                            onClick={() => toggleWorker(activeRow.ppId, worker.id)}
                            disabled={!canSelect}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-4 text-sm font-semibold transition ${!canSelect
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                              : checked
                                ? "cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "cursor-pointer border-slate-100 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40"
                              }`}
                          >
                            <div className="min-w-0 text-left">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-sm font-semibold text-slate-800">{worker.label}</div>
                                {workerRole && (
                                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                    {workerRole}
                                  </span>
                                )}
                                {isOnLeave ? (
                                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                    Nghỉ {(worker.leaveDate || "").replace("T", " ").slice(0, 16)}
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
                      };

                      // Filter workers based on search query and selected-only filter
                      const getVisibleWorkers = (workerList) => {
                        return workerList.filter((worker) => {
                          const matchQuery = !workerQuery.trim() || worker.label.toLowerCase().includes(workerQuery.trim().toLowerCase());
                          const matchSelected = !showSelectedOnly || selectedIds.includes(worker.id);
                          return matchQuery && matchSelected;
                        });
                      };

                      return (
                        <>
                          {isLocked && (
                            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                              <div>
                                <strong className="block font-bold text-rose-900">Công đoạn đã khóa phân công</strong>
                                <p className="mt-0.5 opacity-90 font-medium">Bạn không thể thay đổi phân công lao động cho các công đoạn đã hoàn thành hoặc đang chờ nghiệm thu.</p>
                              </div>
                            </div>
                          )}

                          {loadingWorkers ? (
                            <div className="py-8 text-center text-xs text-slate-500">Đang tải danh sách thợ...</div>
                          ) : workerColumns.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">Hệ thống chưa có dữ liệu thợ.</div>
                          ) : isOwnerView && (workerGroups.length > 0 || ungroupedWorkers.length > 0) ? (
                            /* Owner view: workers grouped by manager + ungrouped */
                            <div className={`max-h-[500px] min-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 ${isLocked ? "opacity-60 pointer-events-none grayscale-[20%]" : ""}`}>
                              {/* RENDER GROUPS */}
                              {workerGroups.map((group) => {
                                const groupWorkerCols = workerColumns.filter(wc => {
                                  return group.workers.some(gw => String(gw.id) === wc.id);
                                });
                                const visibleInGroup = getVisibleWorkers(groupWorkerCols);
                                if (visibleInGroup.length === 0) return null;

                                const isCollapsed = collapsedGroups[group.managerId] ?? false;
                                const selectedCountInGroup = visibleInGroup.filter(w => selectedIds.includes(w.id)).length;

                                return (
                                  <div key={group.managerId} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.managerId]: !isCollapsed }))}
                                      className="flex w-full items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition"
                                    >
                                      <div className="flex items-center gap-2">
                                        {isCollapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                        <Users size={14} className="text-indigo-500" />
                                        <span className="text-sm font-bold text-slate-700">{group.managerName}</span>
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                          {visibleInGroup.length} nhân viên
                                        </span>
                                      </div>
                                      {selectedCountInGroup > 0 && (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                          {selectedCountInGroup} đã chọn
                                        </span>
                                      )}
                                    </button>
                                    {!isCollapsed && (
                                      <div className="space-y-1.5 p-2 pt-0">
                                        {visibleInGroup.map(worker => renderWorkerCard(worker))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* RENDER UNGROUPED */}
                              {(() => {
                                const ungroupedWorkerCols = workerColumns.filter(wc => {
                                  return ungroupedWorkers.some(u => String(u.id) === wc.id);
                                });
                                const visibleUngrouped = getVisibleWorkers(ungroupedWorkerCols);

                                if (visibleUngrouped.length === 0) return null;

                                return (
                                  <div className="space-y-1.5 mt-2">
                                    {workerGroups.length > 0 && (
                                      <div className="px-2 pb-1 pt-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Nhân sự khác
                                      </div>
                                    )}
                                    {visibleUngrouped.map(worker => renderWorkerCard(worker))}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            /* PM view: flat worker list */
                            (() => {
                              const visibleWorkers = getVisibleWorkers(filteredWorkers);
                              if (visibleWorkers.length === 0) {
                                return <div className="py-8 text-center text-xs text-slate-500">Không tìm thấy thợ nào phù hợp.</div>;
                              }
                              return (
                                <div className={`max-h-[500px] min-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 ${isLocked ? "opacity-60 pointer-events-none grayscale-[20%]" : ""}`}>
                                  {visibleWorkers.map(worker => renderWorkerCard(worker))}
                                </div>
                              );
                            })()
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

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Xác nhận lưu phân công"
        description="Bạn có chắc chắn muốn lưu các thay đổi phân công lao động cho đơn sản xuất này không?"
        onConfirm={handleSaveAssignments}
        onClose={() => setIsConfirmOpen(false)}
        primaryLabel="Xác nhận lưu"
        confirmIcon={Save}
      />
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


const PLAN_STEPS = [
  { partName: "Cắt Vải", cpu: 5000, startDate: "2026-03-01", endDate: "2026-03-05" },
  { partName: "May", cpu: 15000, startDate: "2026-03-05", endDate: "2026-03-15" },
  { partName: "Đóng gói", cpu: 2000, startDate: "2026-03-15", endDate: "2026-03-20" },
];

const MOCK_PRODUCTIONS = [
  { productionId: 9, orderId: 5, pmName: "Tùng Quản Lý", status: "Đang Sản Xuất" },
];
