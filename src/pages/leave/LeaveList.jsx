import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  Loader2,
  Search,
  UserRoundX,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { compareLeaveDateDesc, formatLeaveDateTime } from "@/lib/leaveDateTime";
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

function SummaryCard({ label, value, icon, active, onClick }) {
  const Icon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{value}</div>
        </div>

        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border transition-colors ${
          active
            ? "border-emerald-200 bg-emerald-100 text-emerald-700"
            : "border-emerald-100 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
        }`}>
          <Icon size={26} strokeWidth={2.1} />
        </div>
      </div>
    </button>
  );
}

export default function LeaveList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("leave-change", handler);
    return () => window.removeEventListener("leave-change", handler);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchLeaveRequests = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError("");
        }

        const params = {
          PageIndex: Math.max(0, page - 1),
          PageSize: PAGE_SIZE,
          SortColumn: "DateCreate",
          SortOrder: "DESC",
        };

        if (search.trim()) {
          params.FilterQuery = search.trim();
        }

        if (statusFilter !== "all") {
          params.Status = statusFilter;
        }

        if (dateFilter) {
          params.DateCreateFrom = new Date(`${dateFilter}T00:00:00`).toISOString();
          params.DateCreateTo = new Date(`${dateFilter}T23:59:59.999`).toISOString();
        }

        const response = await LeaveService.getLeaveRequests(params);

        if (!active) return;

        setItems(response.data ?? []);
        setTotalCount(response.recordCount ?? response.RecordCount ?? (response.data ?? []).length);
        if (!silent) setError("");
      } catch (err) {
        if (!active) return;

        // Silent refresh shouldn't wipe UI; keep current list and only surface error on next hard refresh.
        if (!silent) {
          setItems([]);
          setTotalCount(0);
          setError(getLeaveErrorMessage(err, "Không thể tải danh sách đơn nghỉ. Vui lòng thử lại."));
        }
      } finally {
        if (active && !silent) setLoading(false);
      }
    };

    fetchLeaveRequests({ silent: false });

    // Auto-refresh to reflect new requests without reloading the page.
    // This is a light polling fallback (in lieu of websocket/SSE from backend).
    const intervalMs = 15000;
    const onTick = () => {
      if (!active) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchLeaveRequests({ silent: true });
    };

    const intervalId = window.setInterval(onTick, intervalMs);
    const onFocus = () => onTick();
    const onVisibility = () => onTick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dateFilter, page, refreshKey, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: totalCount || items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
    }),
    [items, totalCount]
  );
  const totalPages = Math.max(1, Math.ceil((totalCount || items.length || 1) / PAGE_SIZE));
  const paginated = useMemo(
    () =>
      items
        .sort((left, right) => compareLeaveDateDesc(left.dateCreate, right.dateCreate)),
    [items]
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý nghỉ phép</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Tổng đơn" value={stats.total} icon={FileText} active={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setPage(1); }} />
            <SummaryCard label="Chờ duyệt" value={stats.pending} icon={Clock3} active={statusFilter === "pending"} onClick={() => { setStatusFilter("pending"); setPage(1); }} />
            <SummaryCard label="Đã duyệt" value={stats.approved} icon={CheckCircle2} active={statusFilter === "approved"} onClick={() => { setStatusFilter("approved"); setPage(1); }} />
            <SummaryCard label="Từ chối" value={stats.rejected} icon={XCircle} active={statusFilter === "rejected"} onClick={() => { setStatusFilter("rejected"); setPage(1); }} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.4fr_220px_200px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tên nhân viên</span>
                <Search size={18} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo tên nhân viên..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                <Filter size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="cancel_requested">Chờ hủy</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>

              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày gửi</span>
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Ngày gửi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <div className="flex items-center justify-end gap-3">
                {(search || statusFilter !== "all" || dateFilter) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách đơn nghỉ</h2>
                <p className="leave-table-card__subtitle">Theo dõi trạng thái xử lý và truy cập chi tiết từng đơn nhanh hơn.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân viên</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung đơn</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày phản hồi</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                    <th className="leave-table-th px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Loader2 size={32} className="animate-spin text-emerald-600" />
                          <span className="text-sm">Đang tải danh sách đơn nghỉ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-sm text-rose-600">
                        {error}
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <UserRoundX size={32} />
                          <span className="text-sm">Không có đơn xin nghỉ phù hợp.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold text-slate-900">{item.userFullName}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="line-clamp-3 max-w-xl text-sm leading-6 text-slate-700">{item.content}</p>
                          <div className="mt-2 text-xs text-slate-500">
                            Nghỉ từ {formatLeaveDateTime(item.fromDate)} đến {formatLeaveDateTime(item.toDate)}
                          </div>
                          {item.approvedByName ? <div className="mt-1 text-xs text-slate-500">Người phê duyệt: {item.approvedByName}</div> : null}
                          {item.denyContent && (
                            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                              Lý do từ chối: {item.denyContent}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">{formatLeaveDateTime(item.dateCreate)}</td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          <div>{formatLeaveDateTime(item.dateReply, "Chưa phản hồi")}</div>
                          {item.approvedByName ? <div className="mt-1 text-xs text-slate-500">{item.approvedByName}</div> : null}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <button
                            type="button"
                            onClick={() => navigate(`/leave/${item.id}`, { state: { leave: item } })}
                            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
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
    </DashboardLayout>
  );
}
