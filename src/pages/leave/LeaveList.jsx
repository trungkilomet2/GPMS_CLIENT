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
import LeaveService from "@/services/LeaveService";
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
};

function formatDateTime(value) {
  if (!value) return "Chưa phản hồi";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon size={20} />
      </div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
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

  useEffect(() => {
    let active = true;

    const fetchLeaveRequests = async () => {
      try {
        setLoading(true);

        const params = {
          PageIndex: Math.max(0, page - 1),
          PageSize: PAGE_SIZE,
        };

        if (search.trim()) {
          params.FilterQuery = search.trim();
        }

        const response = await LeaveService.getLeaveRequests(params);

        if (!active) return;

        setItems(response.data ?? []);
        setTotalCount(response.recordCount ?? response.RecordCount ?? (response.data ?? []).length);
        setError("");
      } catch {
        if (!active) return;
        setItems([]);
        setTotalCount(0);
        setError("Không thể tải danh sách đơn nghỉ. Vui lòng thử lại.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLeaveRequests();

    return () => {
      active = false;
    };
  }, [dateFilter, page, search, statusFilter]);

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
      items.filter((item) => {
        const matchStatus = statusFilter === "all" || item.status === statusFilter;
        const matchDate = !dateFilter || String(item.dateCreate ?? "").startsWith(dateFilter);

        return matchStatus && matchDate;
      }),
    [dateFilter, items, statusFilter]
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
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Danh sách này đang lấy từ API `leave-request-list`, bám theo dữ liệu đơn nghỉ thực tế của hệ thống.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Tổng đơn" value={stats.total} icon={FileText} active={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setPage(1); }} />
            <SummaryCard label="Chờ duyệt" value={stats.pending} icon={Clock3} active={statusFilter === "pending"} onClick={() => { setStatusFilter("pending"); setPage(1); }} />
            <SummaryCard label="Đã duyệt" value={stats.approved} icon={CheckCircle2} active={statusFilter === "approved"} onClick={() => { setStatusFilter("approved"); setPage(1); }} />
            <SummaryCard label="Từ chối" value={stats.rejected} icon={XCircle} active={statusFilter === "rejected"} onClick={() => { setStatusFilter("rejected"); setPage(1); }} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_220px_200px_auto]">
              <label className="relative block">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm mã đơn, họ tên, username hoặc nội dung..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <label className="relative block">
                <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                </select>
              </label>

              <label className="relative block">
                <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <div className="text-sm text-slate-500">{totalCount || items.length} kết quả</div>
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

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân viên</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung đơn</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày tạo</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày phản hồi</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
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
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold text-slate-900">{item.userFullName}</div>
                          <div className="mt-1 text-sm text-slate-500">User ID: {item.userId ?? "N/A"}</div>
                          <div className="mt-1 text-xs text-slate-400">#{item.id}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="line-clamp-3 max-w-xl text-sm leading-6 text-slate-700">{item.content}</p>
                          {item.denyContent && (
                            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                              Lý do từ chối: {item.denyContent}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">{formatDateTime(item.dateCreate)}</td>
                        <td className="px-5 py-4 align-top text-sm text-slate-700">{formatDateTime(item.dateReply)}</td>
                        <td className="px-5 py-4 align-top">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4 text-right align-top">
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
