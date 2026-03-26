import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
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
import LeaveService from "@/services/LeaveService";
import "@/styles/leave.css";

const STATUS_MAP = {
  pending: {
    label: "Chờ duyệt",
    icon: Clock3,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Từ chối",
    icon: XCircle,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
  cancel_requested: {
    label: "Chờ hủy",
    icon: Clock3,
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  cancelled: {
    label: "Đã hủy",
    icon: XCircle,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

function StatusBadge({ status }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.badge}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{value}</div>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
          <Icon size={26} strokeWidth={2.1} />
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequestHistoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await LeaveService.getLeaveRequests({
          SortColumn: "DateCreate",
          SortOrder: "DESC",
        });

        if (!mounted) return;

        setItems(response?.data ?? []);
        setError("");
      } catch {
        if (!mounted) return;
        setItems([]);
        setError("Không thể tải lịch sử đơn nghỉ.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return items
      .filter((item) => {
        const matchSearch =
          !keyword ||
          item.userFullName.toLowerCase().includes(keyword) ||
          item.content.toLowerCase().includes(keyword) ||
          String(item.id).includes(keyword);
        const matchStatus = statusFilter === "all" || item.status === statusFilter;
        const matchDate = !dateFilter || String(item.dateCreate ?? "").startsWith(dateFilter);

        return matchSearch && matchStatus && matchDate;
      })
      .sort((left, right) => compareLeaveDateDesc(left.dateCreate, right.dateCreate));
  }, [dateFilter, items, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
    }),
    [items]
  );

  return (
    <DashboardLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lịch sử đơn nghỉ</h1>
            <p className="text-sm text-slate-500">
              Theo dõi toàn bộ đơn xin nghỉ đã tạo trong hệ thống, bao gồm trạng thái xử lý và thời điểm phản hồi.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Tổng đơn" value={stats.total} icon={FileText} />
            <SummaryCard label="Chờ duyệt" value={stats.pending} icon={Clock3} />
            <SummaryCard label="Đã duyệt" value={stats.approved} icon={CheckCircle2} />
            <SummaryCard label="Từ chối" value={stats.rejected} icon={XCircle} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.4fr_220px_200px]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search size={18} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo mã đơn, tên nhân viên hoặc nội dung..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>

              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                <Filter size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
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
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="leave-table-card__header">
              <div>
                <h2 className="leave-table-card__title">Danh sách lịch sử đơn nghỉ</h2>
                <p className="leave-table-card__subtitle">Mỗi bản ghi tương ứng một đơn nghỉ đang được lưu trong hệ thống.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mã đơn</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân viên</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày gửi</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày phản hồi</th>
                    <th className="leave-table-th px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                    <th className="leave-table-th px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <Loader2 size={32} className="animate-spin text-emerald-600" />
                          <span className="text-sm">Đang tải lịch sử đơn nghỉ...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-rose-600">
                        {error}
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-500">
                          <UserRoundX size={32} />
                          <span className="text-sm">Không có bản ghi nào phù hợp.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-5 py-4 align-top text-sm font-semibold text-slate-800">LR-{String(item.id).padStart(3, "0")}</td>
                        <td className="px-5 py-4 align-top">
                          <div className="font-semibold text-slate-900">{item.userFullName}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="line-clamp-2 max-w-xl text-sm leading-6 text-slate-700">{item.content}</p>
                          <div className="mt-2 text-xs text-slate-500">
                            Nghỉ từ {formatLeaveDateTime(item.fromDate)} đến {formatLeaveDateTime(item.toDate)}
                          </div>
                          {item.approvedByName ? <div className="mt-1 text-xs text-slate-500">Người phê duyệt: {item.approvedByName}</div> : null}
                          {item.cancelContent ? <div className="mt-1 text-xs text-slate-500">Lý do hủy: {item.cancelContent}</div> : null}
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
                          <Link
                            to={`/leave-history/${item.id}`}
                            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
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
        </div>
      </div>
    </DashboardLayout>
  );
}
