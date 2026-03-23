import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Search } from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import { getStoredUser } from "@/lib/authStorage";
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

function splitRoles(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OutputHistory() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const roles = splitRoles(user?.role).map((role) => role.toLowerCase());
  const isCustomer = roles.includes("customer");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_OUTPUTS.filter((item) => {
      const matchQuery =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.workerName || "").toLowerCase().includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.partName || "").toLowerCase().includes(q) ||
        String(item.reportDate || "").toLowerCase().includes(q);
      const matchDate = allDates || !dateFilter || item.reportDate === dateFilter;
      return matchQuery && matchDate;
    });
  }, [query, dateFilter, allDates]);

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
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center min-h-400px text-sm text-slate-600">
          Bạn không có quyền truy cập trang này.
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Lịch sử sản lượng</h1>
                <p className="text-slate-600">Xem lịch sử submit sản lượng của toàn bộ thợ.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.3fr_260px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tên thợ, mã production, công đoạn..."
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
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed text-sm">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-14 px-3 py-3 text-center">STT</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-left">Production</th>
                    <th className="leave-table-th w-48 px-3 py-3 text-left">Đơn hàng</th>
                    <th className="leave-table-th w-40 px-3 py-3 text-left">Công đoạn</th>
                    <th className="leave-table-th w-32 px-3 py-3 text-left">Thợ</th>
                    <th className="leave-table-th w-20 px-3 py-3 text-center">SL</th>
                    <th className="leave-table-th w-28 px-3 py-3 text-center">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-600">
                        Không có dữ liệu phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item, index) => (
                      <tr key={item.id} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-3 py-2 text-center">{(currentPage - 1) * pageSize + index + 1}</td>
                        <td className="px-3 py-2 text-slate-700">#PR-{item.productionId}</td>
                        <td className="px-3 py-2 text-slate-700">{item.orderName}</td>
                        <td className="px-3 py-2 text-slate-700">{item.partName}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {item.workerName}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-center text-slate-600">{item.reportDate}</td>
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
    </OwnerLayout>
  );
}






