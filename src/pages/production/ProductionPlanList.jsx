import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FileText, Filter, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import { getStoredUser } from "@/lib/authStorage";
import { extractRoleValue } from "@/lib/authIdentity";
import { hasAnyRole } from "@/lib/roleAccess";
import "@/styles/homepage.css";
import "@/styles/leave.css";

const STATUS_STYLES = {
  Planned: "bg-amber-50 text-amber-700 border-amber-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  default: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_LABELS = {
  "chờ xét duyệt kế hoạch": "Planned",
  "cho xet duyet ke hoach": "Planned",
  planned: "Planned",
  "chờ xét duyệt": "Planned",
  "cho xet duyet": "Planned",
  pending: "Planned",
  "đang sản xuất": "In Progress",
  "dang san xuat": "In Progress",
  "in progress": "In Progress",
  "hoàn thành": "Completed",
  "hoan thanh": "Completed",
  completed: "Completed",
  done: "Completed",
};

function getPlanStatusLabel(status) {
  if (typeof status === "number") {
    if (status === 1) return "Planned";
    if (status === 2) return "In Progress";
    if (status === 3) return "Completed";
  }

  const raw = String(status ?? "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase();
  return STATUS_LABELS[normalized] || raw;
}

export default function ProductionPlanList() {
  const user = getStoredUser();
  const roleValue = extractRoleValue(user) || user?.role || user?.roles || "";
  const isWorker = hasAnyRole(roleValue, ["worker", "sewer", "tailor"]);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [partCounts, setPartCounts] = useState({});
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
      } catch (err) {
        if (!active) return;
        setError("Không thể tải danh sách production.");
        setProductions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProductions();
    return () => {
      active = false;
    };
  }, []);

  const plans = useMemo(() => {
    return productions.map((item) => {
      const order = item?.order ?? {};
      const orderId = order?.id ?? item?.orderId ?? item?.order?.orderId ?? "-";
      const orderName = order?.orderName ?? item?.orderName ?? "-";
      const productName = order?.productName ?? item?.productName ?? order?.type ?? "-";
      const startDate = item?.startDate ?? item?.pStartDate ?? order?.startDate ?? "-";
      const endDate = item?.endDate ?? item?.pEndDate ?? order?.endDate ?? "-";
      const status = getPlanStatusLabel(item?.statusName ?? item?.status ?? item?.statusId ?? "");
      return {
        productionId: item?.productionId ?? item?.id ?? "-",
        orderId,
        orderName,
        productName,
        pStartDate: startDate,
        pEndDate: endDate,
        status,
      };
    });
  }, [productions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((item) => {
      const hit =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.orderId).includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.productName || "").toLowerCase().includes(q);
      const statusOk = statusFilter === "all" || item.status === statusFilter;
      return hit && statusOk;
    });
  }, [plans, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const total = plans.length;
    const planned = plans.filter((item) => item.status === "Planned").length;
    const inProgress = plans.filter((item) => item.status === "In Progress").length;
    const completed = plans.filter((item) => item.status === "Completed").length;
    return { total, planned, inProgress, completed };
  }, [plans]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPartCounts = async () => {
      const productionIds = [...new Set(plans.map((item) => item.productionId).filter(Boolean))];
      const pendingIds = productionIds.filter((id) => partCounts[id] === undefined);

      if (pendingIds.length === 0) {
        return;
      }

      const results = await Promise.all(
        pendingIds.map(async (productionId) => {
          try {
            const response = await ProductionPartService.getPartsByProduction(productionId, {
              pageIndex: 0,
              pageSize: 10,
              sortColumn: "Name",
              sortOrder: "ASC",
            }).catch(() => ProductionPartService.getPartsByProduction(productionId));
            const payload = response?.data;
            const list =
              payload?.data ??
              payload?.items ??
              payload?.list ??
              payload?.results ??
              (Array.isArray(payload) ? payload : []);
            const total =
              typeof payload?.recordCount === "number"
                ? payload.recordCount
                : Array.isArray(list)
                ? list.length
                : 0;
            return [productionId, total];
          } catch (error) {
            return [productionId, 0];
          }
        })
      );

      if (!isMounted) return;

      setPartCounts((prev) => {
        const next = { ...prev };
        results.forEach(([productionId, total]) => {
          next[productionId] = total;
        });
        return next;
      });
    };

    fetchPartCounts();

    return () => {
      isMounted = false;
    };
  }, [partCounts, plans]);

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách kế hoạch sản xuất</h1>
              <p className="text-slate-600">Theo dõi kế hoạch sản xuất và tiến độ triển khai theo từng đơn hàng.</p>
            </div>
            {!isWorker && (
              <Link className="order-create-btn" to="/production-plan/create">
                + Tạo kế hoạch
              </Link>
            )}
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
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Production</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Đơn hàng</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tên đơn</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Sản phẩm</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Công đoạn</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Bắt đầu</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Kết thúc</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Trạng thái</th>
                    <th className="leave-table-th w-24 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-600">
                        Đang tải danh sách kế hoạch...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-red-600">
                        {error}
                      </td>
                    </tr>
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-600">
                        Không có kế hoạch phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageData.map((item) => (
                      <tr key={item.productionId} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-2 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">#PR-{item.productionId}</td>
                        <td className="px-2 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">#ĐH-{item.orderId}</td>
                        <td className="px-2 py-3 text-sm text-slate-900 font-medium truncate max-w-[220px]">{item.orderName}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 truncate max-w-[200px]">{item.productName}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">
                          {partCounts[item.productionId] ?? "--"}
                        </td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{item.pStartDate}</td>
                        <td className="px-2 py-3 text-sm text-slate-700 text-center whitespace-nowrap">{item.pEndDate}</td>
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.default}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">
                          <Link to={`/production-plan/${item.productionId}`} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
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
