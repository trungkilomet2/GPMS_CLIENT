import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Clock3, FileText, Filter, Search } from "lucide-react";
import Pagination from "@/components/Pagination";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import { useAuth } from "@/hooks/useAuth";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import { useProductionList } from "@/hooks/useProductionList";
import { STATUS_STYLES, getProductionStatusLabel } from "@/utils/statusUtils";
import "@/styles/homepage.css";
import "@/styles/leave.css";



export default function ProductionPlanList() {
  const location = useLocation();
  const { isWorker, roleValue } = useAuth();
  const primaryRole = getPrimaryWorkspaceRole(roleValue);
  const isWorkerRoute = location.pathname.startsWith("/worker/");
  const isWorkerView = primaryRole === "worker";
  const LayoutComponent = isWorkerView ? WorkerLayout : PmOwnerLayout;
  const detailBasePath = isWorkerRoute ? "/worker/production-plan" : "/production-plan";
  const { productions, loading, error } = useProductionList();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [partCounts, setPartCounts] = useState({});
  const pageSize = 10;



  const plans = useMemo(() => {
    return productions
      .filter((item) => {
        const sid = Number(item?.statusId ?? item?.status ?? 0);
        const name = getProductionStatusLabel(item?.statusName ?? item?.status ?? item?.statusId ?? "");
        // Exclude Chờ Xét Duyệt (1) and Từ Chối (2)
        if (sid === 1 || sid === 2) return false;
        if (name === "Chờ Xét Duyệt" || name === "Từ Chối" || name === "Chờ kiểm tra") return false;
        return true;
      })
      .map((item) => {
        const order = item?.order ?? {};
        const pm = item?.pm ?? {};
        const orderId = order?.id ?? item?.orderId ?? item?.order?.orderId ?? "-";
        const orderName = order?.orderName ?? item?.orderName ?? "-";
        const pmIdRaw = item?.pmInfo?.id ?? item?.pmId ?? pm?.id ?? item?.pmID ?? item?.pm_id ?? null;
        const pmName =
          item?.pmInfo?.fullName ??
          item?.pmName ??
          pm?.name ??
          pm?.fullName ??
          (pmIdRaw ? `PM #${pmIdRaw}` : "-");
        const startDate = item?.startDate ?? item?.pStartDate ?? order?.startDate ?? "-";
        const endDate = item?.endDate ?? item?.pEndDate ?? order?.endDate ?? "-";
        const status = getProductionStatusLabel(item?.statusName ?? item?.status ?? item?.statusId ?? "");
        return {
          productionId: item?.productionId ?? item?.id ?? "-",
          orderId,
          orderName,
          pmName,
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
        String(item.pmName || "").toLowerCase().includes(q);
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
    const planned = plans.filter((item) => item.status === "Chờ Xét Duyệt Kế Hoạch").length;
    const inProgress = plans.filter((item) => item.status === "Đang Sản Xuất").length;
    const completed = plans.filter((item) => item.status === "Hoàn Thành").length;
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
              PageIndex: 0,
              PageSize: 500,
              SortColumn: "Name",
              SortOrder: "ASC",
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
    <LayoutComponent>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách kế hoạch sản xuất</h1>
              <p className="text-slate-600">Theo dõi kế hoạch sản xuất và tiến độ triển khai theo từng đơn hàng.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "all" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
                }`}
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
              className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Chờ Xét Duyệt Kế Hoạch" ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Đã lên kế hoạch</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.planned}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-indigo-100 bg-indigo-50 text-indigo-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Đang Sản Xuất")}
              className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Đang Sản Xuất" ? "border-violet-500 ring-2 ring-violet-100" : "border-slate-200"
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Đang triển khai</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.inProgress}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-violet-100 bg-violet-50 text-violet-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Hoàn Thành")}
              className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Hoàn Thành" ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
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
                  placeholder="Tìm mã kế hoạch, đơn sản xuất, đơn hàng, sản phẩm..."
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
                  <option value="Chờ Xét Duyệt">Chờ Xét Duyệt</option>
                  <option value="Chờ Xét Duyệt Kế Hoạch">Chờ Xét Duyệt Kế Hoạch</option>
                  <option value="Chấp Nhận">Chấp Nhận</option>
                  <option value="Cần Chỉnh Sửa Kế Hoạch">Cần Chỉnh Sửa Kế Hoạch</option>
                  <option value="Đang Sản Xuất">Đang Sản Xuất</option>
                  <option value="Hoàn Thành">Hoàn Thành</option>
                  <option value="Từ Chối">Từ Chối</option>
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
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Đơn sản xuất</th>
                    <th className="leave-table-th w-20 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Đơn hàng</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tên đơn</th>
                    <th className="leave-table-th px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tên quản lý</th>
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
                        <td className="px-2 py-3 text-sm text-slate-700 truncate max-w-[200px]">{item.pmName}</td>
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
                          <Link to={`${detailBasePath}/${item.productionId}`} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50">
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
    </LayoutComponent>
  );
}
