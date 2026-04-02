import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePlus2,
  Loader2,
  Search,
  Send,
  UserRoundX,
  XCircle,
} from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { formatLeaveDateTime } from "@/lib/leaveDateTime";
import LeaveService, { getLeaveErrorMessage } from "@/services/LeaveService";
import "@/styles/leave.css";

const PAGE_SIZE = 10;

const STATUS_MAP = {
  pending: {
    label: "Chờ duyệt",
    icon: Clock3,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  rejected: {
    label: "Từ chối",
    icon: XCircle,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  cancel_requested: {
    label: "Chờ hủy",
    icon: Clock3,
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  cancelled: {
    label: "Đã hủy",
    icon: XCircle,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, borderTone }) {
  return (
    <div className={`rounded-[1.75rem] border bg-white px-5 py-4 shadow-sm ${borderTone}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{value}</div>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
          <Icon size={26} strokeWidth={2.1} />
        </div>
      </div>
    </div>
  );
}

function toIsoFromLocalDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function toLocalDateKey(value) {
  return String(value ?? "").split("T")[0];
}

function getTodayLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function shouldShowApprover(leave) {
  return Boolean(leave?.approvedByName) && leave?.status !== "pending";
}

export default function LeaveRequests() {
  const location = useLocation();
  const user = getStoredUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isWorkerRoute = location.pathname.startsWith("/worker/leave-requests");
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const detailBasePath = isWorkerRoute ? "/worker/leave-requests" : "/leave-requests";
  const LayoutComponent = primaryRole === "worker" || primaryRole === "kcs" ? WorkerLayout : PmOwnerLayout;

  useEffect(() => {
    let active = true;

    const fetchMyLeaveRequests = async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          PageIndex: Math.max(0, page - 1),
          PageSize: PAGE_SIZE,
          SortColumn: "DateCreate",
          SortOrder: "DESC",
        };

        if (statusFilter !== "all") {
          params.Status = statusFilter;
        }

        if (search.trim()) {
          params.FilterQuery = search.trim();
        }

        if (dateFrom) {
          params.DateCreateFrom = new Date(`${dateFrom}T00:00:00`).toISOString();
        }

        if (dateTo) {
          params.DateCreateTo = new Date(`${dateTo}T23:59:59.999`).toISOString();
        }

        const response = await LeaveService.getMyLeaveRequests(params);
        if (!active) return;

        setItems(response.data ?? []);
        setTotalCount(response.recordCount ?? response.RecordCount ?? (response.data ?? []).length);
      } catch (err) {
        if (!active) return;
        setItems([]);
        setTotalCount(0);
        setError(getLeaveErrorMessage(err, "Không thể tải lịch sử nghỉ phép."));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMyLeaveRequests();

    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, page, refreshKey, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: totalCount || items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      cancelRequested: items.filter((item) => item.status === "cancel_requested").length,
      cancelled: items.filter((item) => item.status === "cancelled").length,
    }),
    [items, totalCount]
  );

  const totalPages = Math.max(1, Math.ceil((totalCount || items.length || 1) / PAGE_SIZE));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      setError("Vui lòng nhập nội dung đơn nghỉ.");
      return;
    }

    if (!fromDate || !toDate) {
      setError("Vui lòng chọn đầy đủ thời gian nghỉ.");
      return;
    }

    if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
      setError("Thời gian bắt đầu nghỉ không được lớn hơn thời gian kết thúc.");
      return;
    }

    if (toLocalDateKey(fromDate) < getTodayLocalDateKey()) {
      setError("Ngày bắt đầu nghỉ không được ở quá khứ.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setNotice("");

      const created = await LeaveService.createLeaveRequest({
        content: normalizedContent,
        fromDate: toIsoFromLocalDateTime(fromDate),
        toDate: toIsoFromLocalDateTime(toDate),
      });

      setContent("");
      setFromDate("");
      setToDate("");
      setNotice(`Đã gửi đơn nghỉ${created?.id ? ` #${created.id}` : ""} thành công.`);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(getLeaveErrorMessage(err, "Không thể tạo đơn nghỉ phép."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LayoutComponent>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Đơn xin nghỉ phép</h1>
            <p className="text-sm text-slate-500">Tạo đơn mới và theo dõi lịch sử xử lý các đơn nghỉ của chính bạn.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Tổng đơn" value={stats.total} icon={FilePlus2} borderTone="border-slate-200" />
            <SummaryCard label="Chờ duyệt" value={stats.pending} icon={Clock3} borderTone="border-amber-200" />
            <SummaryCard label="Đã duyệt" value={stats.approved} icon={CheckCircle2} borderTone="border-emerald-200" />
            <SummaryCard label="Từ chối" value={stats.rejected} icon={XCircle} borderTone="border-rose-200" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Tạo đơn nghỉ mới</h2>
                  <p className="mt-1 text-sm text-slate-500">Gửi nhanh nội dung nghỉ phép để hệ thống chuyển sang luồng xét duyệt.</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Send size={20} />
                </div>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung đơn nghỉ</span>
                <textarea
                  rows={7}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Ví dụ: Xin nghỉ phép 1 ngày để giải quyết việc cá nhân..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Từ lúc</span>
                  <input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Đến lúc</span>
                  <input
                    type="datetime-local"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>
              </div>

              {notice ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? "Đang gửi..." : "Gửi đơn nghỉ"}
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid items-end gap-3 lg:grid-cols-[1.2fr_180px_170px_170px]">
                <label className="relative block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm nội dung</span>
                  <Search size={18} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo nội dung đơn..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>

                <label className="relative block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="cancel_requested">Chờ hủy</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>

                <label className="relative block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Từ ngày</span>
                  <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>

                <label className="relative block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Đến ngày</span>
                  <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </label>
              </div>

              <div className="leave-table-card mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="leave-table-card__header">
                  <div>
                    <h2 className="leave-table-card__title">Lịch sử đơn của tôi</h2>
                    <p className="leave-table-card__subtitle">Tra cứu nhanh các đơn nghỉ bạn đã gửi và trạng thái hiện tại.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="leave-table-head">
                      <tr>
                        <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung</th>
                        <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                        <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày phản hồi</th>
                        <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                        <th className="leave-table-th px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-500">
                              <Loader2 size={32} className="animate-spin text-emerald-600" />
                              <span className="text-sm">Đang tải lịch sử đơn nghỉ...</span>
                            </div>
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-500">
                              <UserRoundX size={32} />
                              <span className="text-sm">Bạn chưa có đơn xin nghỉ nào phù hợp bộ lọc.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                            <td className="px-5 py-4 align-top">
                              <div className="max-w-xl text-sm leading-6 text-slate-700">{item.content}</div>
                              <div className="mt-2 text-xs text-slate-500">
                                Nghỉ từ {formatLeaveDateTime(item.fromDate)} đến {formatLeaveDateTime(item.toDate)}
                              </div>
                              {shouldShowApprover(item) ? <div className="mt-1 text-xs text-slate-500">Người phê duyệt: {item.approvedByName}</div> : null}
                              {item.cancelContent ? <div className="mt-1 text-xs text-slate-500">Lý do hủy: {item.cancelContent}</div> : null}
                            </td>
                            <td className="px-5 py-4 align-top text-sm text-slate-700">{formatLeaveDateTime(item.dateCreate)}</td>
                            <td className="px-5 py-4 align-top text-sm text-slate-700">
                              <div>{formatLeaveDateTime(item.dateReply)}</div>
                              {shouldShowApprover(item) ? <div className="mt-1 text-xs text-slate-500">{item.approvedByName}</div> : null}
                            </td>
                            <td className="px-5 py-4 align-top">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-5 py-4 text-center align-top">
                              <Link
                                to={`${detailBasePath}/${item.id}`}
                                state={{ leave: item }}
                                className="inline-flex rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                              >
                                Xem chi tiết
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                    Trang {page} / {totalPages}
                  </div>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutComponent>
  );
}
