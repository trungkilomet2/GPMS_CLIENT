import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FileText, Filter, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const STATUS_STYLES = {
  "Cần Cập Nhật": "bg-amber-50 text-amber-700 border-amber-200",
  "Cần Chỉnh Sửa Kế Hoạch": "bg-amber-50 text-amber-700 border-amber-200",
  "Chấp Nhận": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Chờ Xét Duyệt": "bg-blue-50 text-blue-700 border-blue-200",
  "Chờ Xét Duyệt Kế Hoạch": "bg-blue-50 text-blue-700 border-blue-200",
  "Đang Sản Xuất": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Hoàn Thành": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Từ Chối": "bg-red-50 text-red-700 border-red-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_LABELS = {
  "cần cập nhật": "Cần Cập Nhật",
  "can cap nhat": "Cần Cập Nhật",
  "need update": "Cần Cập Nhật",
  "update required": "Cần Cập Nhật",
  "cần chỉnh sửa kế hoạch": "Cần Chỉnh Sửa Kế Hoạch",
  "can chinh sua ke hoach": "Cần Chỉnh Sửa Kế Hoạch",
  "need plan update": "Cần Chỉnh Sửa Kế Hoạch",
  "chấp nhận": "Chấp Nhận",
  "chap nhan": "Chấp Nhận",
  approved: "Chấp Nhận",
  accepted: "Chấp Nhận",
  "chờ xét duyệt": "Chờ Xét Duyệt",
  "cho xet duyet": "Chờ Xét Duyệt",
  pending: "Chờ Xét Duyệt",
  waiting: "Chờ Xét Duyệt",
  "chờ xét duyệt kế hoạch": "Chờ Xét Duyệt Kế Hoạch",
  "cho xet duyet ke hoach": "Chờ Xét Duyệt Kế Hoạch",
  planned: "Chờ Xét Duyệt Kế Hoạch",
  "đang sản xuất": "Đang Sản Xuất",
  "dang san xuat": "Đang Sản Xuất",
  "in progress": "Đang Sản Xuất",
  production: "Đang Sản Xuất",
  "hoàn thành": "Hoàn Thành",
  "hoan thanh": "Hoàn Thành",
  completed: "Hoàn Thành",
  done: "Hoàn Thành",
  "từ chối": "Từ Chối",
  "tu choi": "Từ Chối",
  rejected: "Từ Chối",
  deny: "Từ Chối",
  denied: "Từ Chối",
};

function getProductionStatusLabel(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase();
  return STATUS_LABELS[normalized] || raw;
}

export default function ProductionList() {
  const [productions, setProductions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let active = true;
    const fetchProductions = async () => {
      try {
        setLoading(true);
        setError("");
        const allItems = [];
        const seenKeys = new Set();
        let pageIndex = 0;
        let recordCount = null;
        const pageSizeFetch = 50;
        const maxPages = 200;

        while (pageIndex < maxPages) {
          const response = await ProductionService.getProductionList({
            PageIndex: pageIndex,
            PageSize: pageSizeFetch,
            SortColumn: "Name",
            SortOrder: "ASC",
          });
          if (!active) return;
          const payload = response?.data ?? response;
          const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

          let added = 0;
          list.forEach((item) => {
            const key = item?.productionId ?? item?.id ?? JSON.stringify(item);
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            allItems.push(item);
            added += 1;
          });

          if (recordCount == null) {
            const reported = Number(payload?.recordCount ?? payload?.totalCount ?? 0);
            recordCount = Number.isFinite(reported) && reported > 0 ? reported : null;
            if (recordCount != null && recordCount <= list.length) {
              recordCount = null;
            }
          }

          if (list.length === 0) break;
          if (added === 0) break;
          if (recordCount != null && allItems.length >= recordCount) break;
          if (list.length < pageSizeFetch) break;
          pageIndex += 1;
        }

        setProductions(allItems);
        setTotalCount(allItems.length);
      } catch (err) {
        if (!active) return;
        setError("Không thể tải danh sách production.");
        setProductions([]);
        setTotalCount(0);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProductions();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return productions.filter((item) => {
      const hit =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.orderId).includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.pmName || "").toLowerCase().includes(q);
      const statusLabel = getProductionStatusLabel(item.status);
      const statusOk = statusFilter === "all" || statusLabel === statusFilter;
      return hit && statusOk;
    });
  }, [productions, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = totalCount;
    const planned = productions.filter((item) => getProductionStatusLabel(item.status) === "Chờ Xét Duyệt Kế Hoạch").length;
    const inProgress = productions.filter((item) => getProductionStatusLabel(item.status) === "Đang Sản Xuất").length;
    const completed = productions.filter((item) => getProductionStatusLabel(item.status) === "Hoàn Thành").length;
    return { total, planned, inProgress, completed };
  }, [productions, totalCount]);

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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách sản xuất</h1>
              <p className="text-slate-600">Theo dõi các kế hoạch sản xuất và trạng thái triển khai.</p>
            </div>
            <Link className="order-create-btn" to="/production/create">
              + Tạo production
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
              onClick={() => setStatusFilter("Chờ Xét Duyệt Kế Hoạch")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Chờ Xét Duyệt Kế Hoạch" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
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
              onClick={() => setStatusFilter("Đang Sản Xuất")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Đang Sản Xuất" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Đang sản xuất</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.inProgress}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Hoàn Thành")}
              className={`group rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Hoàn Thành" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
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
                  placeholder="Tìm mã production, mã đơn, tên đơn, PM..."
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
                  <option value="Chờ Xét Duyệt Kế Hoạch">Chờ Xét Duyệt Kế Hoạch</option>
                  <option value="Đang Sản Xuất">Đang Sản Xuất</option>
                  <option value="Hoàn Thành">Hoàn Thành</option>
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
                <h2 className="leave-table-card__title">Danh sách sản xuất</h2>
                <p className="leave-table-card__subtitle">Theo dõi tiến độ sản xuất và truy cập nhanh từng kế hoạch.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200 table-fixed">
                <thead className="leave-table-head">
                  <tr>
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Production</th>
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Đơn hàng</th>
                    <th className="leave-table-th w-36 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Tên đơn</th>
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">PM quản lý</th>
                    <th className="leave-table-th w-20 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Bắt đầu</th>
                    <th className="leave-table-th w-20 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Kết thúc</th>
                    <th className="leave-table-th w-24 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Trạng thái</th>
                    <th className="leave-table-th w-20 px-2 py-4 text-right text-xs font-semibold uppercase tracking-wide">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-600">
                        Đang tải danh sách production...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-600">
                        Không có production phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageData.map((item) => (
                      <tr key={item.productionId} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">#PR-{item.productionId}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">#ĐH-{item.order.id}</td>
                        <td className="px-3 py-3 text-sm text-slate-900 font-medium truncate">{item.order.orderName}</td>
                        <td className="px-3 py-3 text-sm text-slate-700 truncate">{item.pmName || `PM #${item.pmId}`}</td>
                        <td className="px-3 py-3 text-sm text-slate-700 text-center">{item.pStartDate}</td>
                        <td className="px-3 py-3 text-sm text-slate-700 text-center">{item.pEndDate}</td>
                        <td className="px-3 py-3 text-center">
                          {(() => {
                            const statusLabel = getProductionStatusLabel(item.statusId);
                            return (
                              <span className={`inline-block rounded-full border px-3.5 py-1 text-xs font-medium ${STATUS_STYLES[statusLabel] || STATUS_STYLES.default}`}>
                                {statusLabel}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Link to={`/production/${item.productionId}`} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
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
