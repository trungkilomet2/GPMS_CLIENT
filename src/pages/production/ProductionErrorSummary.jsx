import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import Pagination from "@/components/Pagination";
import OrderImageZoomModal from "@/pages/orders/components/OrderImageZoomModal";
import "@/styles/homepage.css";
import "@/styles/leave.css";

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

export default function ProductionErrorSummary() {
  const { id } = useParams();
  const navigate = useNavigate();

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
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                aria-label="Quay lại"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Tổng hợp lỗi đơn sản xuất #{production?.productionId ?? id}
                </h1>
                <p className="text-slate-600">
                  {production?.orderName
                    ? `Đơn hàng: ${production.orderName}`
                    : "Theo dõi lỗi theo từng công đoạn."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Tổng lỗi: {errors.length}
              </span>
            </div>
          </div>

          {issueError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {issueError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { key: "low", label: "Thấp", value: severityCounts.low },
              { key: "medium", label: "Trung bình", value: severityCounts.medium },
              { key: "high", label: "Cao", value: severityCounts.high },
              { key: "critical", label: "Nghiêm trọng", value: severityCounts.critical },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <ClipboardList size={16} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Theo công đoạn</div>
                  <div className="text-sm text-slate-500 mt-1">Tổng hợp nhanh theo công đoạn.</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">Gộp lỗi theo công đoạn</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2 text-left">Công đoạn</th>
                    <th className="px-4 py-2 text-left">Tóm tắt</th>
                    <th className="px-4 py-2 text-center">Mức độ cao nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byPart.map((row) => (
                    <tr key={row.partName} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-slate-800">{row.partName}</div>
                        <div className="text-[10px] text-slate-400">
                          Lỗi gần nhất: {formatDateTime(row.latestAt)}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2 text-slate-700">
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold">
                            {row.count} lỗi
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold">
                            {row.totalQuantity} sản phẩm lỗi
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[row.highestSeverity] || SEVERITY_STYLES.default
                            }`}
                        >
                          {SEVERITY_LABELS[row.highestSeverity] || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {byPart.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        Chưa có lỗi nào cho đơn sản xuất này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <AlertTriangle size={16} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Danh sách lỗi</div>
                  <div className="text-sm text-slate-500 mt-1">Chi tiết từng báo cáo lỗi.</div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Công đoạn</th>
                    <th className="px-4 py-3 text-left">Tiêu đề</th>
                    <th className="px-4 py-3 text-center">Minh chứng</th>
                    <th className="px-4 py-3 text-center">Mức độ</th>
                    <th className="px-4 py-3 text-center">Số lượng</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thời gian</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedErrors.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.partName || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.title || "Không có tiêu đề"}</div>
                        <div className="text-[11px] text-slate-400">{item.description || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              setZoomImageUrl(item.imageUrl);
                              setIsImageModalOpen(true);
                            }}
                            className="group relative inline-block overflow-hidden rounded-lg border border-slate-100 shadow-sm transition hover:border-emerald-500"
                          >
                            <img
                              src={item.imageUrl}
                              alt="Minh chứng"
                              className="h-10 w-10 object-cover transition duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <span className="text-[10px] italic text-slate-300">Không có ảnh</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.default
                            }`}
                        >
                          {SEVERITY_LABELS[item.severity] || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.quantity ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        {item.status && item.status !== "-" ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${ISSUE_STATUS_STYLES[item.statusId] ?? "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                          >
                            {item.status}
                          </span>
                        ) : (
                          <span className="text-[10px] italic text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setTargetIssue(item);
                            setConfirmedQuantity(item.quantity || 0);
                            setIsHandlingModalOpen(true);
                          }}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                          disabled={item.statusId === 3}
                        >
                          Xác nhận
                        </button>
                      </td>
                    </tr>
                  ))}
                  {errors.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Chưa có lỗi nào được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {errors.length > 0 && (
              <div className="px-5 py-4">
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
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow">
          Đang tải dữ liệu đơn sản xuất...
        </div>
      )}

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl border border-slate-100">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Xử lý báo cáo lỗi</h3>
              <p className="mt-2 text-sm text-slate-500">
                Lỗi tại: <strong>{targetIssue?.partName}</strong>
                <br />
                Số lượng: <span className="font-bold text-rose-600">{targetIssue?.quantity} sản phẩm</span>
                <br />
                Trạng thái: <span className="font-bold text-slate-700 uppercase">{targetIssue?.status}</span>
              </p>
            </div>

            <div className="space-y-3">
              {/* Nếu là Chờ xử lý (1), hiển thị nút Bắt đầu xử lý (2) */}
              {(targetIssue?.statusId === 1 || !targetIssue?.statusId) && (
                <button
                  onClick={() => handleUpdateIssueStatus(2)}
                  disabled={isUpdating}
                  className="w-full rounded-xl bg-blue-50 px-6 py-4 text-center border-2 border-transparent transition-all hover:border-blue-500 hover:bg-blue-100 group"
                >
                  <div className="text-[11px] font-black uppercase tracking-widest text-blue-700">Bắt đầu xử lý</div>
                  <div className="text-[10px] font-medium text-blue-600/70">Xác nhận đang tiến hành sửa chữa</div>
                </button>
              )}

              {/* Nếu là Đang xử lý (2), hiển thị nút Đã khắc phục (3) */}
              {targetIssue?.statusId === 2 && (
                <button
                  onClick={() => handleUpdateIssueStatus(3)}
                  disabled={isUpdating}
                  className="w-full rounded-xl bg-emerald-50 px-6 py-4 text-center border-2 border-transparent transition-all hover:border-emerald-500 hover:bg-emerald-100 group"
                >
                  <div className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Đã khắc phục</div>
                  <div className="text-[10px] font-medium text-emerald-600/70">Có thể tiếp tục sản xuất và giao nhận</div>
                </button>
              )}

              {/* Nếu là Đang ở trạng thái Không thể sửa (4) */}
              {targetIssue?.statusId === 4 && (
                <div className="space-y-4 rounded-2xl bg-orange-50/50 p-4 border border-orange-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-700 ml-1">
                      Số lượng xác nhận hủy
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={targetIssue?.quantity}
                        value={confirmedQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val > targetIssue?.quantity) {
                            toast.warning(`Không được vượt quá ${targetIssue?.quantity}`);
                            setConfirmedQuantity(targetIssue?.quantity);
                          } else {
                            setConfirmedQuantity(e.target.value);
                          }
                        }}
                        className="w-full rounded-xl border-2 border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-900 focus:border-orange-500 focus:ring-0 transition-all"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-400">
                        MAX: {targetIssue?.quantity}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmUnfixable(Number(confirmedQuantity))}
                    disabled={isUpdating || !confirmedQuantity || confirmedQuantity <= 0}
                    className="w-full rounded-xl bg-orange-600 px-6 py-4 text-center shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="text-[11px] font-black uppercase tracking-widest text-white">Xác nhận chốt số lượng</div>
                    <div className="text-[10px] font-medium text-orange-100">
                      Chốt {confirmedQuantity} sản phẩm bị loại bỏ
                    </div>
                  </button>
                </div>
              )}

              {targetIssue?.statusId !== 4 && (
                <button
                  onClick={() => handleUpdateIssueStatus(4)}
                  disabled={isUpdating}
                  className="w-full rounded-xl bg-rose-50 px-6 py-4 text-center border-2 border-transparent transition-all hover:border-rose-500 hover:bg-rose-100 group"
                >
                  <div className="text-[11px] font-black uppercase tracking-widest text-rose-700">Không thể sửa</div>
                  <div className="text-[10px] font-medium text-rose-600/70 text-center">Sản phẩm bị loại bỏ, trừ vào số lượng đơn</div>
                </button>
              )}

              <button
                onClick={() => setIsHandlingModalOpen(false)}
                className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isUpdating}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
