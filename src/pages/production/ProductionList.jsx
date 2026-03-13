import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import OwnerLayout from "@/layouts/OwnerLayout";
import "@/styles/homepage.css";

const MOCK_PRODUCTIONS = [
  {
    productionId: 1001,
    orderId: 29,
    orderName: "Đồng phục công ty ABC",
    pmId: 7,
    pmName: "Nguyễn Văn An",
    pStartDate: "2026-04-21",
    pEndDate: "2026-05-05",
    status: "In Progress",
  },
  {
    productionId: 1002,
    orderId: 30,
    orderName: "Áo hoodie mùa đông",
    pmId: 9,
    pmName: "Trần Ngọc Bích",
    pStartDate: "2026-04-18",
    pEndDate: "2026-04-30",
    status: "Planned",
  },
  {
    productionId: 1003,
    orderId: 31,
    orderName: "Áo sơ mi nữ",
    pmId: 5,
    pmName: "Phạm Minh Khoa",
    pStartDate: "2026-04-10",
    pEndDate: "2026-04-25",
    status: "Completed",
  },
  {
    productionId: 1004,
    orderId: 32,
    orderName: "Váy bộ mùa hè",
    pmId: 7,
    pmName: "Nguyễn Văn An",
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

export default function ProductionList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PRODUCTIONS.filter((item) => {
      const hit =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.orderId).includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.pmName || "").toLowerCase().includes(q);
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

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Production List</h1>
            <p className="text-slate-600">Danh sách kế hoạch sản xuất đang theo dõi.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã production, mã đơn, tên đơn, PM..."
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-275 w-full divide-y divide-slate-200 table-auto">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-28 px-5 py-3 text-left text-sm font-semibold text-slate-700">Production</th>
                    <th className="w-28 px-4 py-3 text-left text-sm font-semibold text-slate-700">Đơn hàng</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tên đơn</th>
                    <th className="w-48 px-4 py-3 text-left text-sm font-semibold text-slate-700">PM quản lý</th>
                    <th className="w-36 px-4 py-3 text-center text-sm font-semibold text-slate-700">Bắt đầu</th>
                    <th className="w-36 px-4 py-3 text-center text-sm font-semibold text-slate-700">Kết thúc</th>
                    <th className="w-36 px-4 py-3 text-center text-sm font-semibold text-slate-700">Trạng thái</th>
                    <th className="w-28 px-4 py-3 text-right text-sm font-semibold text-slate-700">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-600">
                        Không có production phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageData.map((item) => (
                      <tr key={item.productionId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-600 font-medium">#PR-{item.productionId}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">#ĐH-{item.orderId}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{item.orderName}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.pmName || `PM #${item.pmId}`}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-center">{item.pStartDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-center">{item.pEndDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[item.status] || STATUS_STYLES.default}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/orders/detail/${item.orderId}`} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                            Chi tiết →
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
