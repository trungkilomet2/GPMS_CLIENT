import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  History,
  Info,
  Package,
  ShieldAlert,
  Zap,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import Pagination from "@/components/Pagination";
import OrderImageZoomModal from "@/pages/orders/components/OrderImageZoomModal";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import WorkerLayout from "@/layouts/WorkerLayout";

const SEVERITY_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  default: "bg-slate-50 text-slate-600 border-slate-200",
};

const TYPE_ISSUE_LABELS = {
  0: "Lỗi công đoạn",
  1: "Lỗi cắt",
  2: "Lỗi may",
  3: "Lỗi khác",
};

const ISSUE_STATUS_LABELS = {
  1: "Chờ xử lý",
  2: "Đang xử lý",
  3: "Đã khắc phục",
  4: "Không thể sửa",
};

const ISSUE_STATUS_STYLES = {
  1: "bg-amber-50 text-amber-700 border-amber-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-emerald-50 text-emerald-700 border-emerald-200",
  4: "bg-rose-50 text-rose-700 border-rose-200",
};

const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

const getSeverityFromPriority = (priority, fallbackSeverity) => {
  if (typeof fallbackSeverity === "string" && SEVERITY_ORDER.includes(fallbackSeverity)) {
    return fallbackSeverity;
  }

  const p = Number(priority);
  if (!Number.isFinite(p)) return "low";
  if (p >= 4) return "critical";
  if (p === 3) return "high";
  if (p === 2) return "medium";
  return "low";
};

const getTypeIssueLabel = (typeIssue) => {
  const n = Number(typeIssue);
  if (Number.isFinite(n) && TYPE_ISSUE_LABELS[n]) return TYPE_ISSUE_LABELS[n];
  return "Chưa phân loại";
};

const parsePayload = (payload) => {
  if (typeof payload !== "string") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
};

const extractList = (payload) => {
  const parsed = parsePayload(payload);
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.list)) return parsed.list;
  if (Array.isArray(parsed?.results)) return parsed.results;
  if (Array.isArray(parsed)) return parsed;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeIssue = (item, index) => {
  const typeLabel = getTypeIssueLabel(item?.typeIssue);
  const partName =
    item?.partName ??
    item?.part?.partName ??
    item?.stageName ??
    item?.stepName ??
    (item?.partId ? `Công đoạn #${item.partId}` : typeLabel);

  const severity = getSeverityFromPriority(item?.priority, item?.severity);
  const statusIdCandidate = Number(
    item?.statusId ?? item?.issueStatusId ?? item?.status?.id ?? item?.status
  );
  const hasStatusId = Number.isFinite(statusIdCandidate) && statusIdCandidate > 0;
  const statusId = hasStatusId ? statusIdCandidate : null;
  const rawStatusText =
    item?.statusName ??
    item?.status?.name ??
    (typeof item?.status === "string" ? item.status : "");
  const statusText = String(rawStatusText ?? "").trim();

  return {
    id: item?.issueId ?? item?.id ?? `issue-${index}`,
    rawId: item?.id ?? item?.issueId,
    partName,
    typeIssue: item?.typeIssue,
    typeIssueLabel: typeLabel,
    title: item?.title ?? "Không có tiêu đề",
    description: item?.description ?? "",
    severity,
    priority: item?.priority ?? 0,
    quantity: Number(item?.quantity) || 0,
    imageUrl: item?.imageUrl ?? "",
    createdAt: item?.createdAt ?? "",
    statusId,
    status: statusId
      ? ISSUE_STATUS_LABELS[statusId] ?? `${statusId}`
      : statusText || "-",
  };
};

import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function ProductionErrorSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isWorker = primaryRole === "worker";
  const LayoutComponent = isWorker ? WorkerLayout : OwnerLayout;

  const [production, setProduction] = useState(null);
  const [productionLoading, setProductionLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [errors, setErrors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState("");
  const [isHandlingModalOpen, setIsHandlingModalOpen] = useState(false);
  const [targetIssue, setTargetIssue] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmedQuantity, setConfirmedQuantity] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let active = true;

    const fetchProduction = async () => {
      try {
        setProductionLoading(true);
        const response = await ProductionService.getProductionDetail(id);
        if (!active) return;
        const payload = response?.data?.data ?? response?.data ?? {};
        const order = payload?.order ?? {};
        setProduction({
          productionId: payload?.productionId ?? payload?.id ?? id,
          orderName: order?.orderName ?? order?.name ?? "",
        });
      } catch {
        if (!active) return;
        setProduction({ productionId: id, orderName: "" });
      } finally {
        if (active) setProductionLoading(false);
      }
    };

    fetchProduction();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const fetchIssues = async () => {
      try {
        setIssuesLoading(true);
        setIssueError("");

        const response = await ProductionService.getProductionIssues(id);
        if (!active) return;

        const payload = response?.data ?? response;
        const list = extractList(payload).map(normalizeIssue);
        const sorted = list.sort((a, b) => {
          const aTs = new Date(a.createdAt || 0).getTime();
          const bTs = new Date(b.createdAt || 0).getTime();
          return bTs - aTs;
        });

        setErrors(sorted);
      } catch {
        if (!active) return;
        setErrors([]);
        setIssueError("Không thể tải danh sách lỗi từ hệ thống.");
      } finally {
        if (active) {
          setIssuesLoading(false);
          setCurrentPage(1);
        }
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, [id]);

  const handleUpdateIssueStatus = async (statusId) => {
    if (!targetIssue) return;
    try {
      setIsUpdating(true);
      await ProductionService.updateIssueStatus(targetIssue.id, statusId);

      // Update local state
      setErrors((prev) =>
        prev.map((err) =>
          err.id === targetIssue.id
            ? {
              ...err,
              statusId,
              status: ISSUE_STATUS_LABELS[statusId] ?? `${statusId}`,
            }
            : err
        )
      );
      setIsHandlingModalOpen(false);
      setTargetIssue(null);
      toast.success("Cập nhật trạng thái thành công!");
    } catch (err) {
      console.error("Error updating issue status:", err.response?.data || err);
      const errorData = err.response?.data;
      let errorMsg = "Không thể cập nhật trạng thái.";

      if (typeof errorData === "string") {
        errorMsg = errorData;
      } else if (errorData?.errors) {
        errorMsg = Object.values(errorData.errors).flat().join(", ");
      } else if (errorData?.message || errorData?.detail) {
        errorMsg = errorData.message || errorData.detail;
      }

      toast.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmUnfixable = async (quantity) => {
    if (!targetIssue) return;
    try {
      setIsUpdating(true);
      await ProductionService.confirmUnfixable(targetIssue.id, quantity);
      toast.success("Đã xác nhận số lượng không thể sửa!");
      setIsHandlingModalOpen(false);
      setTargetIssue(null);
      // Cập nhật lại danh sách hoặc UI nếu cần (ở đây là fetch lại data)
      window.location.reload(); // Hoặc gọi lại fetchSummary nếu có sẵn trong scope
    } catch (err) {
      console.error("Error confirming unfixable:", err.response?.data || err);
      const errorData = err.response?.data;
      let errorMsg = "Không thể xác nhận số lượng.";
      if (typeof errorData === "string") errorMsg = errorData;
      else if (errorData?.errors) errorMsg = Object.values(errorData.errors).flat().join(", ");
      else if (errorData?.message || errorData?.detail) errorMsg = errorData.message || errorData.detail;
      toast.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const severityCounts = useMemo(
    () =>
      errors.reduce(
        (acc, item) => {
          const key = item.severity || "low";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        { low: 0, medium: 0, high: 0, critical: 0 }
      ),
    [errors]
  );

  const byPart = useMemo(() => {
    const map = new Map();

    errors.forEach((item) => {
      const key = item.partName || "Chưa xác định";
      const current = map.get(key) || {
        partName: key,
        count: 0,
        totalQuantity: 0,
        latestAt: "",
        highestSeverity: "low",
      };

      current.count += 1;
      current.totalQuantity += Number(item.quantity) || 0;

      const nextTs = new Date(item.createdAt || 0).getTime();
      const currentTs = new Date(current.latestAt || 0).getTime();
      if (!current.latestAt || nextTs > currentTs) {
        current.latestAt = item.createdAt || "";
      }

      const currentRank = SEVERITY_ORDER.indexOf(current.highestSeverity);
      const nextRank = SEVERITY_ORDER.indexOf(item.severity || "low");
      if (nextRank > currentRank) {
        current.highestSeverity = item.severity || "low";
      }

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [errors]);
  console.log(errors);
  const totalPages = Math.max(1, Math.ceil(errors.length / pageSize));

  const pagedErrors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return errors.slice(start, start + pageSize);
  }, [errors, currentPage]);

  const loading = productionLoading || issuesLoading;

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HEADER SECTION */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-600 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95"
              >
                <ArrowLeft size={22} />
              </button>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-none uppercase">
                  Tổng hợp lỗi đơn sản xuất
                </h1>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mt-1">
                  Mã sản xuất: #PR-{production?.productionId ?? id}
                  {production?.orderName && ` • Đơn hàng: ${production.orderName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-[#f0f9f4] text-[#1e6e43] border border-[#d4e3da] rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm">
                {errors.length} Lỗi ghi nhận
              </span>
            </div>
          </div>

          {issueError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-bold flex items-center gap-2">
              <AlertTriangle size={18} />
              {issueError}
            </div>
          )}

          {/* STATS SECTION */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Info size={24} />}
              label="Mức độ Thấp"
              value={loading ? "..." : `${severityCounts.low}`}
              color="emerald"
            />
            <StatCard
              icon={<Zap size={24} />}
              label="Trung bình"
              value={loading ? "..." : `${severityCounts.medium}`}
              color="emerald"
            />
            <StatCard
              icon={<AlertTriangle size={24} />}
              label="Mức độ Cao"
              value={loading ? "..." : `${severityCounts.high}`}
              color="emerald"
            />
            <StatCard
              icon={<ShieldAlert size={24} />}
              label="Nghiêm trọng"
              value={loading ? "..." : `${severityCounts.critical}`}
              color="emerald"
            />
          </div>

          {/* BY PART SUMMARY TABLE */}
          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Tổng hợp theo công đoạn</h2>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tóm tắt nhanh</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Công đoạn</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Tóm tắt lỗi</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Cao nhất</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800">Cập nhật cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black border-black">
                  {byPart.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-200">
                          <Package size={48} />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Không có dữ liệu</p>
                        </div>
                      </td>
                    </tr>
                  ) : byPart.map((row) => (
                    <tr key={row.partName} className="hover:bg-slate-50/50 transition-all divide-x divide-black border-b border-black last:border-b-0">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 uppercase tracking-tight text-sm">{row.partName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="rounded-lg bg-white border border-black px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">
                            {row.count} lỗi
                          </span>
                          <span className="rounded-lg bg-slate-900 text-white px-2.5 py-1 text-[10px] font-bold uppercase border border-black">
                            {row.totalQuantity} SP lỗi
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-bold uppercase shadow-sm ${SEVERITY_STYLES[row.highestSeverity] || SEVERITY_STYLES.default
                            }`}
                        >
                          {SEVERITY_LABELS[row.highestSeverity] || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic">
                          {formatDateTime(row.latestAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAILED ISSUE TABLE */}
          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Danh sách lỗi chi tiết</h2>
              </div>
              {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black w-16">STT</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Công đoạn / Tiêu đề</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Mô tả</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Minh chứng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Mức độ</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Số lượng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Trạng thái</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Thời gian</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black border-black">
                  {pagedErrors.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={9} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-200">
                          <AlertTriangle size={64} />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Không có lỗi nào được ghi nhận</p>
                        </div>
                      </td>
                    </tr>
                  ) : pagedErrors.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all divide-x divide-black border-b border-black last:border-b-0">
                      <td className="px-6 py-4 text-center font-bold text-slate-400 text-[11px] italic">
                        {String((currentPage - 1) * pageSize + index + 1).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 uppercase tracking-tight text-sm">{item.partName || "-"}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 line-clamp-1">{item.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-medium text-slate-600 line-clamp-2 max-w-[200px]">{item.description || "-"}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.imageUrl ? (
                          <button
                            onClick={() => {
                              setZoomImageUrl(item.imageUrl);
                              setIsImageModalOpen(true);
                            }}
                            className="group relative inline-block overflow-hidden rounded-xl border border-black shadow-sm transition hover:scale-105 active:scale-95"
                          >
                            <img
                              src={item.imageUrl}
                              alt="Minh chứng"
                              className="h-10 w-10 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase shadow-sm ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.default
                            }`}
                        >
                          {SEVERITY_LABELS[item.severity] || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                        <span className="inline-flex h-9 w-12 items-center justify-center rounded-xl font-bold text-sm border border-black bg-white">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.statusId === 3 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-emerald-600 shadow-sm">
                            <CheckCircle2 size={11} /> {item.status}
                          </span>
                        ) : item.statusId === 4 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-rose-600 shadow-sm">
                            <XCircle size={11} /> {item.status}
                          </span>
                        ) : item.statusId === 2 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-blue-600 shadow-sm">
                            <Settings2 size={11} className="animate-spin-slow" /> {item.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-amber-600 shadow-sm">
                            <Clock size={11} /> {item.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic whitespace-nowrap">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(!isWorker || item.statusId !== 4) && (
                          <button
                            onClick={() => {
                              setTargetIssue(item);
                              setConfirmedQuantity(item.quantity || 0);
                              setIsHandlingModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#1e6e43] flex items-center gap-2 transition-all hover:bg-[#1e6e43] hover:text-white hover:shadow-md active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed mx-auto"
                            disabled={item.statusId === 3}
                          >
                            <Zap size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Xác nhận</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.length > 0 && (
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalCount={errors.length}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>
        </div>

        <OrderImageZoomModal
          isOpen={isImageModalOpen}
          imageUrl={zoomImageUrl}
          onClose={() => {
            setIsImageModalOpen(false);
            setZoomImageUrl("");
          }}
        />

        {/* Handling Modal */}
        {isHandlingModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-black shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-black mb-4">
                  <ClipboardList size={32} />
                </div>
                <h3 className="text-xl font-black text-black uppercase tracking-tight">Xử lý báo cáo lỗi</h3>
                <div className="mt-3 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Lỗi tại: {targetIssue?.partName}
                  </span>
                  <div className="mt-2 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                    Số lượng: {targetIssue?.quantity} SP
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1 -> 2: Chờ xử lý -> Đang xử lý */}
                {(targetIssue?.statusId === 1 || !targetIssue?.statusId) && (
                  <ModalActionBtn
                    onClick={() => handleUpdateIssueStatus(2)}
                    disabled={isUpdating}
                    title="Bắt đầu xử lý"
                    subtitle="Xác nhận đang tiến hành sửa chữa"
                    theme="blue"
                  />
                )}

                {/* 2 -> 3: Đang xử lý -> Đã khắc phục */}
                {targetIssue?.statusId === 2 && (
                  <ModalActionBtn
                    onClick={() => handleUpdateIssueStatus(3)}
                    disabled={isUpdating}
                    title="Đã khắc phục"
                    subtitle="Tiếp tục sản xuất & giao nhận"
                    theme="emerald"
                  />
                )}

                {/* Status 4 flow */}
                {targetIssue?.statusId === 4 ? (
                  !isWorker && (
                    <div className="space-y-4 rounded-2xl bg-orange-50/50 p-6 border border-orange-200">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-orange-700 ml-1 block text-center">
                          Số lượng xác nhận hủy
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={targetIssue?.quantity}
                          value={confirmedQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val > targetIssue?.quantity) {
                              toast.warning(`Tối đa ${targetIssue.quantity}`);
                              setConfirmedQuantity(targetIssue.quantity);
                            } else setConfirmedQuantity(e.target.value);
                          }}
                          className="w-full rounded-2xl border border-orange-200 bg-white px-6 py-4 text-center text-3xl font-bold text-orange-900 outline-none focus:border-orange-500 transition-all shadow-inner"
                        />
                      </div>

                      <button
                        onClick={() => handleConfirmUnfixable(Number(confirmedQuantity))}
                        disabled={isUpdating || !confirmedQuantity || confirmedQuantity <= 0}
                        className="w-full rounded-xl bg-orange-600 py-4 text-white font-bold uppercase text-[11px] tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-[0.98]"
                      >
                        Xác nhận chốt số lượng
                      </button>
                    </div>
                  )
                ) : (
                  !isWorker && (
                    <ModalActionBtn
                      onClick={() => handleUpdateIssueStatus(4)}
                      disabled={isUpdating}
                      title="Không thể sửa"
                      subtitle="Sản phẩm bị loại bỏ"
                      theme="rose"
                    />
                  )
                )}

                <button
                  onClick={() => setIsHandlingModalOpen(false)}
                  className="mt-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  disabled={isUpdating}
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        )}

        {isUpdating && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xl flex items-center gap-4">
              <Loader2 className="animate-spin text-black" size={24} />
              <span className="text-xs font-black text-black uppercase tracking-widest">Đang cập nhật...</span>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    emerald: "bg-[#f0f9f4] border-[#d4e3da] text-[#1e6e43]",
  };
  return (
    <div className="flex items-center gap-6 rounded-2xl border border-black bg-white p-6 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
      <div className={`flex h-14 w-14 items-center justify-center rounded-xl border shadow-sm ${colorMap[color] || colorMap.emerald}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function ModalActionBtn({ onClick, disabled, title, subtitle, theme }) {
  const themes = {
    blue: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-400",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400",
    rose: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border-2 px-6 py-5 text-center transition-all active:scale-[0.98] ${themes[theme]}`}
    >
      <div className="text-[11px] font-black uppercase tracking-widest">{title}</div>
      <div className="text-[10px] font-bold opacity-70 mt-0.5">{subtitle}</div>
    </button>
  );
}
