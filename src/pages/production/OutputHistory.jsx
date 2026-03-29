import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardCheck, Search, TrendingUp, Wallet, Package, Calendar, Loader2 } from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole } from "@/lib/internalRoleFlow";
import Pagination from "@/components/Pagination";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function OutputHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isCustomer = primaryRole === "customer";
  const LayoutComponent =
    primaryRole === "worker"
      ? WorkerLayout
      : PmOwnerLayout;

  const [outputs, setOutputs] = useState([]);
  const [workLogPartMap, setWorkLogPartMap] = useState({}); // Map: workLogId -> partName
  const [productions, setProductions] = useState([]); // Lookup for order names
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [allDates, setAllDates] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const userIdFromStorage = localStorage.getItem("userId");
  const currentUserId = String(user?.id || user?.userId || userIdFromStorage || "");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch History
      // Always fetch history for the current user's ID to avoid 404 on global history
      // and to align with the "flow like worker" requirement.
      const historyRes = await ProductionService.getWorkerOutputHistory(currentUserId);

      const rawHistory = historyRes?.data?.data ?? historyRes?.data ?? [];

      // Fetch Productions for lookup
      const prodRes = await ProductionService.getProductionList({ PageSize: 100 });
      const prodList = prodRes?.data?.data ?? prodRes?.data ?? [];
      setProductions(prodList);

      // Deep fetch to map workLogId (sourceId) back to partName
      const uniqueProdIds = [
        ...new Set(rawHistory.filter(h => h.productionId).map(h => h.productionId))
      ];

      const logMap = {};

      await Promise.all(
        uniqueProdIds.map(async (pId) => {
          try {
            const partsRes = await ProductionPartService.getPartsByProduction(pId, { PageSize: 100 });
            const partsList = partsRes?.data?.data ?? partsRes?.data ?? [];

            // For each part, fetch its logs to build the reverse map
            await Promise.all(
              partsList.map(async (part) => {
                try {
                  const logsRes = await ProductionPartService.getWorkLogs(part.id);
                  const logs = logsRes?.data?.data ?? logsRes?.data ?? [];
                  logs.forEach(log => {
                    const logId = log.id || log.workLogId || log.wlId;
                    if (logId) {
                      logMap[String(logId)] = {
                        name: part.partName || part.name,
                        cpu: part.cpu || part.unitPrice || part.price || 0,
                      };
                    }
                  });
                } catch (e) {
                  // Ignore per-part log fetch errors
                }
              })
            );
          } catch (e) {
            console.error(`Failed to fetch parts for production ${pId}`, e);
          }
        })
      );

      setWorkLogPartMap(logMap);
      setOutputs(Array.isArray(rawHistory) ? rawHistory : []);
    } catch (err) {
      console.error("Failed to fetch output history:", err);
      setOutputs([]);
    } finally {
      setLoading(false);
    }
  }, [primaryRole, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Map raw outputs to UI format with lookups
    const mapped = outputs.map(item => {
      const prodId = item.productionId;
      const logId = String(item.sourceId || "");
      const prodMatch = productions.find(p => (p.productionId || p.id) === prodId);

      // Standardize date to YYYY-MM-DD for comparison
      const subAt = item.submittedAt || item.reportDate || "";
      const datePart = subAt.split("T")[0];

      return {
        ...item,
        id: item.sourceId || item.id || Math.random(),
        productionId: prodId,
        orderName: prodMatch?.order?.orderName || prodMatch?.orderName || "-",
        orderId: prodMatch?.order?.id || prodMatch?.orderId || null,
        partName: workLogPartMap[logId]?.name || item.note || `Công đoạn #${logId}`,
        reportDate: datePart,
        quantity: item.quantity || 0,
        cpu: item.cpu || workLogPartMap[logId]?.cpu || 0,
      };
    });

    return mapped.filter((item) => {
      const matchQuery =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.workerName || "").toLowerCase().includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.partName || "").toLowerCase().includes(q);

      const matchDate = allDates || !dateFilter || item.reportDate === dateFilter;
      return matchQuery && matchDate;
    });
  }, [outputs, productions, query, dateFilter, allDates]);

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
        <div className="flex flex-col items-center justify-center min-h-[400px] text-sm text-slate-600">
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

          <div className="relative min-h-[500px]">
            {loading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-white/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl border border-emerald-100 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
                  <div>
                    <p className="text-base font-bold text-slate-900">Đang tải lịch sử sản lượng...</p>
                    <p className="text-xs text-slate-500 mt-1">Hệ thống đang đối soát dữ liệu báo cáo và công đoạn</p>
                  </div>
                </div>
              </div>
            )}

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
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer">
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
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Làm mới
                  </button>
                </div>
              </div>
            </div>

            <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="leave-table-card__header">
                <div>
                  <h2 className="leave-table-card__title">Danh sách báo cáo</h2>
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
                      <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800">Đơn giá</th>
                      <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800">SL</th>
                      <th className="border-y border-emerald-100 px-4 py-4 text-center font-bold uppercase tracking-wider text-emerald-800 rounded-tr-2xl">Ngày ghi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={primaryRole === "worker" ? 7 : 8} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={primaryRole === "worker" ? 7 : 8} className="py-24 text-center">
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
                            <span className="font-bold text-slate-700">
                              {Number(item.cpu).toLocaleString("vi-VN")} VND
                            </span>
                          </td>
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
      </div>
    </LayoutComponent>
  );
}






