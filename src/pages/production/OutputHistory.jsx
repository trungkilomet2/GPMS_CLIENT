import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardCheck, Search, TrendingUp, Wallet, Package, Calendar } from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import TeamLeaderLayout from "@/layouts/TeamLeaderLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import Pagination from "@/components/Pagination";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const MOCK_OUTPUTS = [
  {
    id: 1,
    workLogId: 1,
    partId: 31,
    userId: 39,
    workerName: "My",
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Diễu nẹp cổ",
    cpu: 800,
    quantity: 20,
    reportDate: "2026-03-15",
  },
  {
    id: 2,
    workLogId: 2,
    partId: 32,
    userId: 39,
    workerName: "Hoa A",
    productionId: 1001,
    orderName: "Đồng phục công ty ABC",
    partName: "Đính mác",
    cpu: 200,
    quantity: 30,
    reportDate: "2026-03-15",
  },
  {
    id: 3,
    workLogId: 3,
    partId: 33,
    userId: 39,
    workerName: "Mi",
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Kiểm hàng",
    cpu: 100,
    quantity: 15,
    reportDate: "2026-03-14",
  },
  {
    id: 4,
    workLogId: 4,
    partId: 34,
    userId: 39,
    workerName: "Trang",
    productionId: 1002,
    orderName: "Áo hoodie mùa đông",
    partName: "Chạy dây lồng cổ",
    cpu: 500,
    quantity: 25,
    reportDate: "2026-03-13",
  },
  {
    id: 5,
    workLogId: 5,
    partId: 35,
    userId: 39,
    workerName: "Minh",
    productionId: 1003,
    orderName: "Ao polo su kien",
    partName: "May suon",
    cpu: 150,
    quantity: 18,
    reportDate: "2026-03-20",
  },
  {
    id: 6,
    workLogId: 6,
    partId: 36,
    userId: 39,
    workerName: "Linh",
    productionId: 1003,
    orderName: "Ao polo su kien",
    partName: "Dong nut",
    cpu: 120,
    quantity: 40,
    reportDate: "2026-03-20",
  },
  {
    id: 7,
    workLogId: 7,
    partId: 37,
    userId: 39,
    workerName: "Khoa",
    productionId: 1004,
    orderName: "Vay dong phuc nha hang",
    partName: "May khoa keo",
    cpu: 180,
    quantity: 12,
    reportDate: "2026-03-20",
  },
  {
    id: 8,
    workLogId: 8,
    partId: 38,
    userId: 39,
    workerName: "Huy",
    productionId: 1004,
    orderName: "Vay dong phuc nha hang",
    partName: "Len lai",
    cpu: 130,
    quantity: 22,
    reportDate: "2026-03-19",
  },
  {
    id: 9,
    workLogId: 9,
    partId: 39,
    userId: 39,
    workerName: "Nam",
    productionId: 1005,
    orderName: "Ao khoac gio",
    partName: "May tui",
    cpu: 160,
    quantity: 27,
    reportDate: "2026-03-20",
  },
  {
    id: 10,
    workLogId: 10,
    partId: 40,
    userId: 39,
    workerName: "Nam",
    productionId: 1005,
    orderName: "Ao khoac gio",
    partName: "May bo tay",
    cpu: 140,
    quantity: 16,
    reportDate: "2026-03-18",
  },
  {
    id: 11,
    workLogId: 11,
    partId: 41,
    userId: 39,
    workerName: "Trang",
    productionId: 1006,
    orderName: "Quan tay van phong",
    partName: "Tra lung",
    cpu: 110,
    quantity: 24,
    reportDate: "2026-03-20",
  },
  {
    id: 12,
    workLogId: 12,
    partId: 42,
    userId: 39,
    workerName: "Trang",
    productionId: 1006,
    orderName: "Quan tay van phong",
    partName: "Vat so",
    cpu: 115,
    quantity: 28,
    reportDate: "2026-03-17",
  },
  {
    id: 13,
    workLogId: 13,
    partId: 43,
    userId: 39,
    workerName: "My",
    productionId: 1007,
    orderName: "Ao so mi cong so",
    partName: "May co",
    cpu: 90,
    quantity: 32,
    reportDate: "2026-03-20",
  },
  {
    id: 14,
    workLogId: 14,
    partId: 44,
    userId: 39,
    workerName: "Hoa A",
    productionId: 1007,
    orderName: "Ao so mi cong so",
    partName: "May tay",
    cpu: 95,
    quantity: 19,
    reportDate: "2026-03-16",
  },
  {
    id: 15,
    workLogId: 15,
    partId: 45,
    userId: 39,
    workerName: "Mi",
    productionId: 1008,
    orderName: "Dong phuc benh vien",
    partName: "May tui nguc",
    cpu: 105,
    quantity: 21,
    reportDate: "2026-03-20",
  },
];

export default function OutputHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isCustomer = primaryRole === "customer";
  const LayoutComponent =
    primaryRole === "worker"
      ? WorkerLayout
      : primaryRole === "teamLeader"
        ? TeamLeaderLayout
        : PmOwnerLayout;

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [allDates, setAllDates] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const currentUserId = String(user?.id || user?.userId || "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_OUTPUTS.filter((item) => {
      // Logic for Worker: Only show own records
      if (primaryRole === "worker") {
        const itemUserId = String(item.userId || "");
        if (currentUserId && itemUserId !== currentUserId) return false;
      }

      const matchQuery =
        !q ||
        String(item.productionId).includes(q) ||
        (primaryRole !== "worker" && String(item.workerName || "").toLowerCase().includes(q)) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.partName || "").toLowerCase().includes(q) ||
        String(item.reportDate || "").toLowerCase().includes(q);
      const matchDate = allDates || !dateFilter || item.reportDate === dateFilter;
      return matchQuery && matchDate;
    });
  }, [query, dateFilter, allDates, primaryRole, currentUserId]);

  const stats = useMemo(() => {
    const totalQty = filtered.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalVND = filtered.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cpu) || 0), 0);
    return { totalQty, totalVND };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [query, dateFilter, allDates]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages || 1);
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  if (isCustomer) {
    return (
      <LayoutComponent>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Bạn không có quyền truy cập trang này.
        </div>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {primaryRole === "worker" ? "Sản lượng của tôi" : "Lịch sử sản lượng"}
                </h1>
                <p className="text-slate-600 text-sm">
                  {primaryRole === "worker"
                    ? "Theo dõi tiến độ hoàn thành và thu nhập dự kiến của bạn."
                    : "Xem lịch sử submit sản lượng của toàn bộ thợ trong xưởng."}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Section for Worker */}
          {primaryRole === "worker" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-50/50 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
                    <Package size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tổng sản lượng</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{stats.totalQty.toLocaleString("vi-VN")}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">Cái</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-orange-50/50 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-100">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Thu nhập dự kiến</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">{stats.totalVND.toLocaleString("vi-VN")}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">VND</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.3fr_260px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={primaryRole === "worker" ? "Tìm mã đơn, tên hàng, công đoạn..." : "Tìm tên thợ, mã đơn, công đoạn..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </label>
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày</span>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    disabled={allDates}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allDates}
                      onChange={(event) => setAllDates(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Tất cả ngày
                  </label>
                </div>
              </label>
              <div className="flex items-center justify-end gap-3">
                {(query) && (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); }}
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
                <h2 className="leave-table-card__title">Danh sách submit</h2>
                <p className="leave-table-card__subtitle">Theo dõi sản lượng theo ngày và thợ thực hiện.</p>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <ClipboardCheck size={16} />
                <span className="text-xs font-semibold uppercase">Tổng: {filtered.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-emerald-50/50">
                    <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800 rounded-tl-2xl">STT</th>
                    <th className="border-y border-emerald-100 px-4 py-4 text-left font-bold uppercase tracking-wider text-emerald-800">Đơn sản xuất</th>
                    <th className="border-y border-emerald-100 px-4 py-4 text-left font-bold uppercase tracking-wider text-emerald-800">Sản phẩm / Đơn hàng</th>
                    <th className="border-y border-emerald-100 px-4 py-4 text-left font-bold uppercase tracking-wider text-emerald-800">Công đoạn thực hiện</th>
                    {primaryRole !== "worker" && <th className="border-y border-emerald-100 px-4 py-4 text-left font-bold uppercase tracking-wider text-emerald-800">Thợ</th>}
                    <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800">SL</th>
                    <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800 rounded-tr-2xl">Ngày ghi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={primaryRole === "worker" ? 6 : 7} className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                            <ClipboardCheck size={32} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">Không có dữ liệu phù hợp</p>
                            <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi bộ lọc hoặc tìm kiếm theo từ khóa khác.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item, index) => (
                      <tr key={item.id} className="group hover:bg-emerald-50/30 transition-all duration-200">
                        <td className="border-b border-slate-100 px-4 py-4 text-center text-slate-400 font-bold tracking-tighter italic">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          <span className="font-black text-emerald-800 tracking-tight">#PR-{item.productionId}</span>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="font-extrabold text-slate-900 line-clamp-1">{item.orderName}</div>
                          {item.orderId && <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">ORD-{item.orderId}</div>}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 text-slate-700 font-bold">{item.partName}</td>
                        {primaryRole !== "worker" && (
                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                              {item.workerName}
                            </span>
                          </td>
                        )}
                        <td className="border-b border-slate-100 px-4 py-4 text-center">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-900 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-200 transition-all duration-300 transform group-hover:scale-110">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 text-center text-slate-500 font-bold">
                          <div className="flex items-center justify-center gap-2 text-xs">
                            <Calendar size={14} className="text-slate-300" />
                            {item.reportDate}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
      </div>
    </LayoutComponent>
  );
}






