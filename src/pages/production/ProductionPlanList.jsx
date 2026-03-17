import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FileText, Filter, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_PLAN_LIST = [
  {
    planId: 5001,
    productionId: 1001,
    orderId: 29,
    orderName: "Đồng phục công ty ABC",
    productName: "Áo thun đồng phục cổ tròn",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    status: "In Progress",
  },
  {
    planId: 5002,
    productionId: 1002,
    orderId: 30,
    orderName: "Áo hoodie mùa đông",
    productName: "Áo hoodie",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    status: "Planned",
  },
  {
    planId: 5003,
    productionId: 1003,
    orderId: 31,
    orderName: "Áo sơ mi nữ",
    productName: "Áo sơ mi",
    pStartDate: "2026-04-10",
    pEndDate: "2026-04-25",
    status: "Completed",
  },
  {
    planId: 5004,
    productionId: 1004,
    orderId: 32,
    orderName: "Váy bộ mùa hè",
    productName: "Váy bộ",
    pStartDate: "2026-05-01",
    pEndDate: "2026-05-16",
    status: "Planned",
  },
];

const STATUS_STYLES = {
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function ProductionPlanList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PLAN_LIST.filter((item) => {
      const hit =
        !q ||
        String(item.planId).includes(q) ||
        String(item.productionId).includes(q) ||
        String(item.orderId).includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.productName || "").toLowerCase().includes(q);
      const statusOk = statusFilter === "all" || item.status === statusFilter;
      return hit && statusOk;
    });
  }, [search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const total = MOCK_PLAN_LIST.length;
    const planned = MOCK_PLAN_LIST.filter((item) => item.status === "Planned").length;
    const inProgress = MOCK_PLAN_LIST.filter((item) => item.status === "In Progress").length;
    const completed = MOCK_PLAN_LIST.filter((item) => item.status === "Completed").length;
    return { total, planned, inProgress, completed };
  }, []);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách kế hoạch sản xuất</h1>
              <p className="text-slate-600">Theo dõi kế hoạch sản xuất và tiến độ triển khai theo từng đơn hàng.</p>
            </div>
            <Link className="order-create-btn" to="/production-plan/create">
              + Tạo kế hoạch
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className="group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md border-slate-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Tổng kế hoạch</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.total}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <FileText size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Planned")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                statusFilter === "Planned" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Đã lên kế hoạch</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.planned}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("In Progress")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                statusFilter === "In Progress" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Đang triển khai</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.inProgress}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Completed")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                statusFilter === "Completed" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Hoàn tất</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.completed}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.3fr_220px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã kế hoạch, production, đơn hàng, sản phẩm..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</span>
                <Filter size={16} className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>
              <div className="flex items-center justify-end gap-3">
                {(search || statusFilter !== "all") && (
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
                <h2 className="leave-table-card__title">Danh sách kế hoạch</h2>
                <p className="leave-table-card__subtitle">Theo dõi kế hoạch sản xuất và truy cập nhanh chi tiết.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Kế hoạch</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Production</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Đơn hàng</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tên đơn</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Sản phẩm</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Bắt đầu</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Kết thúc</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Trạng thái</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-600">
                        Không có kế hoạch phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageData.map((item) => (
                      <tr key={item.planId} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-2 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">#PL-{item.planId}</td>
                        <td className="px-2 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">#PR-{item.productionId}</td>
                        <td className="px-2 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">#ĐH-{item.orderId}</td>
                        <td className="px-2 py-3 text-sm text-slate-900 font-medium truncate max-w-[220px]">{item.orderName}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 truncate max-w-[200px]">{item.productName}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{item.pStartDate}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{item.pEndDate}</td>
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.default}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">
                          <Link to={`/production-plan/${item.planId}`} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
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

          {filtered.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalCount={filtered.length}
              pageSize={pageSize}
            />
          )}
        </div>
      </div>
    </OwnerLayout>
  );
}
