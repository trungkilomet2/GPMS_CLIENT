import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FileText, Filter, Search, XCircle } from "lucide-react";
import Pagination from "@/components/Pagination";
import OwnerLayout from "@/layouts/OwnerLayout";
import ProductionService from "@/services/ProductionService";
import WorkerService from "@/services/WorkerService";
import { userService } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useProductionList } from "@/hooks/useProductionList";
import { STATUS_STYLES, getProductionStatusLabel } from "@/utils/statusUtils";
import ProductionPartService from "@/services/ProductionPartService";
import "@/styles/homepage.css";
import "@/styles/leave.css";
function getPmId(item) {
  return item?.pmInfo?.id ?? item?.pmId ?? item?.pmID ?? item?.pm_id ?? item?.pm?.id ?? item?.pm?.userId ?? null;
}

function getPmName(item) {
  const pmId = getPmId(item);
  return (
    item?.pmInfo?.fullName ??
    item?.pmName ??
    item?.pm?.name ??
    item?.pm?.fullName ??
    (pmId ? `Người Quản lý #${pmId}` : "-")
  );
}

export default function ProductionList() {
  const { isOwner, isPm, currentUserId } = useAuth();
  const { productions, loading, error, totalCount } = useProductionList();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyMyOrders, setOnlyMyOrders] = useState(true);
  const [involvedProdIds, setInvolvedProdIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`involved_prods_${currentUserId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [partCounts, setPartCounts] = useState({});
  const pageSize = 10;



  const baseProductions = useMemo(() => {
    // Owner sees all, PM sees filtered by default
    if (isOwner || currentUserId == null) return productions;
    if (!isPm) return productions;

    // Toggle off: see everything
    if (!onlyMyOrders) return productions;

    // Toggle on: see only main PM orders or those where you are involved
    const uid = String(currentUserId);
    return productions.filter((item) => {
      const isMainPm = String(getPmId(item)) === uid;
      const isPartAssignee = involvedProdIds.has(item.productionId);
      return isMainPm || isPartAssignee;
    });
  }, [productions, isOwner, isPm, currentUserId, involvedProdIds, onlyMyOrders]);



  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseProductions.filter((item) => {
      const hit =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.order?.id ?? item.orderId ?? "").includes(q) ||
        String(item.order?.orderName ?? item.orderName ?? "").toLowerCase().includes(q) ||
        String(getPmName(item) || "").toLowerCase().includes(q);
      const statusOk = statusFilter === "all" || item.statusName === statusFilter;
      return hit && statusOk;
    });
  }, [baseProductions, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const total = baseProductions.length;
    const pendingCheck = baseProductions.filter((item) => item.statusId === 1 || item.statusName === "Chờ Xét Duyệt").length;
    const pendingPlan = baseProductions.filter((item) => item.statusId === 4 || item.statusName === "Chờ Xét Duyệt Kế Hoạch").length;
    const rejected = baseProductions.filter((item) => item.statusName === "Từ Chối").length;
    const inProgress = baseProductions.filter((item) => item.statusName === "Đang Sản Xuất").length;
    const completed = baseProductions.filter((item) => item.statusName === "Hoàn Thành").length;
    return { total, pendingCheck, pendingPlan, rejected, inProgress, completed };
  }, [baseProductions]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  useEffect(() => {
    let isMounted = true;
    const discoverAllInvolvement = async () => {
      // 1. Collect ALL production IDs that aren't discovered yet
      const allIds = productions.map(p => p.productionId).filter(Boolean);
      const pendingIds = allIds.filter(id => partCounts[id] === undefined);
      
      if (pendingIds.length === 0) return;

      // 2. Process in chunks of 5 to avoid overloading the server/browser
      const chunkSize = 5;
      for (let i = 0; i < pendingIds.length; i += chunkSize) {
        if (!isMounted) break;
        const chunk = pendingIds.slice(i, i + chunkSize);
        
        const results = await Promise.all(
          chunk.map(async (productionId) => {
            try {
              const response = await ProductionPartService.getPartsByProduction(productionId, { PageSize: 100 });
              const payload = response?.data?.data ?? response?.data ?? [];
              const list = Array.isArray(payload) ? payload : [];
              
              const uid = String(currentUserId);
              const isUserInvolved = list.some(part => {
                const workers = [
                  ...(Array.isArray(part.workerIds) ? part.workerIds : []),
                  ...(Array.isArray(part.assignedWorkers) ? part.assignedWorkers : []),
                  ...(Array.isArray(part.assignees) ? part.assignees : []),
                  ...(Array.isArray(part.workers) ? part.workers : []),
                  part.workerId,
                  part.userId
                ].filter(Boolean);

                return workers.some(w => {
                  const wid = (typeof w === 'object') ? (w.id || w.workerId || w.userId || w.accountId) : w;
                  return String(wid) === uid;
                });
              });

              const completed = list.filter(p => p.status === 'Hoàn thành').length;
              const display = list.length > 0 ? `${completed} / ${list.length}` : "0";
              return { productionId, display, isUserInvolved };
            } catch (error) {
              return { productionId, display: "0", isUserInvolved: false };
            }
          })
        );

        if (!isMounted) break;

        // Update counts and involvement sets
        setPartCounts((prev) => {
          const next = { ...prev };
          results.forEach((r) => { next[r.productionId] = r.display; });
          return next;
        });

        setInvolvedProdIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          results.forEach((r) => {
            if (r.isUserInvolved && !next.has(r.productionId)) {
              next.add(r.productionId);
              changed = true;
            }
          });
          if (changed && currentUserId) {
            localStorage.setItem(`involved_prods_${currentUserId}`, JSON.stringify([...next]));
          }
          return next;
        });
      }
    };

    if (productions.length > 0) discoverAllInvolvement();
    return () => { isMounted = false; };
  }, [pageData, partCounts]);

  return (
    <OwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh sách đơn sản xuất</h1>
              <p className="text-slate-600">Theo dõi các đơn sản xuất và trạng thái triển khai.</p>
            </div>
            {(!isPm || isOwner) && (
              <Link className="order-create-btn" to="/production/create">
                + Tạo đơn sản xuất
              </Link>
            )}
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
              onClick={() => setStatusFilter("Chờ kiểm tra")}
              className={`group cursor-pointer rounded-[1.75rem] border bg-white px-5 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusFilter === "Chờ kiểm tra" ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200"
                }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-500">Chờ Xét Duyệt</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.pendingCheck}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-sky-100 bg-sky-50 text-sky-700">
                  <Clock3 size={26} strokeWidth={2.1} />
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
                  <div className="text-sm font-semibold text-slate-500">Chờ duyệt KH</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.pendingPlan}</div>
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
                  <div className="text-sm font-semibold text-slate-500">Đang sản xuất</div>
                  <div className="mt-2 text-4xl font-bold leading-none text-slate-900">{stats.inProgress}</div>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-violet-100 bg-violet-50 text-violet-700">
                  <Clock3 size={26} strokeWidth={2.1} />
                </div>
              </div>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid items-end gap-3 lg:grid-cols-[1.3fr_220px_220px_auto]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.8rem)] -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã đơn, đơn sản xuất, đơn hàng, người quản lý..."
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
                  <option value="all">Tất cả</option>
                  <option value="Chờ Xét Duyệt">Chờ Xét Duyệt</option>
                  <option value="Chờ Xét Duyệt Kế Hoạch">Chờ Xét Duyệt Kế Hoạch</option>
                  <option value="Đang Sản Xuất">Đang Sản Xuất</option>
                  <option value="Hoàn Thành">Hoàn Thành</option>
                  <option value="Từ Chối">Từ Chối</option>
                </select>
              </label>
              
              {isPm && !isOwner && (
                <div className="flex items-center gap-3 h-[45px] pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={onlyMyOrders} 
                        onChange={(e) => setOnlyMyOrders(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600">Chỉ đơn của tôi</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 h-[45px] pb-1">
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
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Đơn sản xuất</th>
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Đơn hàng</th>
                    <th className="leave-table-th w-36 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Tên đơn</th>
                    <th className="leave-table-th w-20 px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide">Người quản lý</th>
                    <th className="leave-table-th w-16 px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide">Công đoạn</th>
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
                        Đang tải danh sách đơn sản xuất...
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
                        Không có đơn sản xuất phù hợp
                      </td>
                    </tr>
                  ) : (
                    pageData.map((item) => (
                      <tr key={item.productionId} className="leave-table-row hover:bg-slate-50/80">
                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">#PR-{item.productionId}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-medium">#ĐH-{item.order?.id ?? item.orderId ?? "-"}</td>
                        <td className="px-3 py-3 text-sm text-slate-900 font-medium truncate">{item.order?.orderName ?? item.orderName ?? "-"}</td>
                        <td
                          className="px-3 py-3 text-sm text-slate-700 truncate"
                          title={getPmName(item)}
                        >
                          {getPmName(item)}
                        </td>
                        <td className="px-3 py-3 text-sm text-center text-slate-700 font-medium">
                          {partCounts[item.productionId] ?? "--"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700 text-center">{item.startDate ?? item.pStartDate ?? "-"}</td>
                        <td className="px-3 py-3 text-sm text-slate-700 text-center">{item.endDate ?? item.pEndDate ?? "-"}</td>
                        <td className="px-3 py-3 text-center">
                          {(() => {
                            const statusLabel = item.statusName
                              || getProductionStatusLabel(item.status ?? item.statusId);
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
