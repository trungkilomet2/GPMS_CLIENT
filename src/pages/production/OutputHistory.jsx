import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Search,
  TrendingUp,
  Wallet,
  Package,
  Calendar,
  Loader2,
  Filter,
  RefreshCw,
  ChevronRight,
  Hash,
  History,
  Zap,
  ArrowLeft
} from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import WorkerLayout from "@/layouts/WorkerLayout";
import { getStoredUser } from "@/lib/authStorage";
import { hasAnyRole } from "@/lib/internalRoleFlow";
import Pagination from "@/components/Pagination";
import ProductionService from "@/services/ProductionService";
import ProductionPartService from "@/services/ProductionPartService";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function OutputHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();

  const isPersonalView = useMemo(() => {
    if (location.pathname.startsWith("/worker/")) return true;
    const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
    return !hasAnyRole(roleValue, ["Owner", "PM"]);
  }, [location.pathname, user]);

  const LayoutComponent = useMemo(() => {
    const roleValue = user?.role ?? user?.roles ?? user?.roleName ?? "";
    if (hasAnyRole(roleValue, ["Owner", "PM"])) return PmOwnerLayout;
    return WorkerLayout;
  }, [user]);

  const [outputs, setOutputs] = useState([]);
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

      const prodRes = await ProductionService.getProductionList({ PageIndex: 0, PageSize: 100 });
      const prodList = prodRes?.data?.data ?? prodRes?.data ?? [];

      const [allLogsResults, allPartsResults] = await Promise.all([
        Promise.allSettled(prodList.map(p => ProductionPartService.getProductionWorkLogs(p.productionId || p.id))),
        Promise.allSettled(prodList.map(p => ProductionPartService.getPartsByProduction(p.productionId || p.id)))
      ]);

      const globalPartsMap = {};
      allPartsResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const parts = result.value?.data?.data ?? result.value?.data ?? [];
          if (Array.isArray(parts)) {
            parts.forEach(p => {
              const pid = p.id || p.partId || p.productionPartId;
              if (pid) {
                globalPartsMap[String(pid)] = {
                  name: p.partName || p.name,
                  cpu: p.cpu || p.pricePerUnit || p.unitPrice || p.price || 0
                };
              }
            });
          }
        }
      });

      let mergedLogs = [];
      allLogsResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const p = prodList[idx];
          const data = result.value?.data?.data ?? result.value?.data ?? [];
          const logs = Array.isArray(data) ? data : [];

          const logsWithCtx = logs.map(log => {
            const logPartId = String(log.productionPartId || log.partId);
            const partInfo = globalPartsMap[logPartId] || {};

            return {
              ...log,
              id: log.id || log.workLogId || Math.random(),
              productionId: p.productionId || p.id,
              orderName: p.order?.orderName || p.orderName || `Đơn hàng #${p.orderId}`,
              orderId: p.order?.id || p.orderId,
              partName: log.partName || log.productionPartName || partInfo.name || `Công đoạn #${logPartId}`,
              workerName: log.workerName || log.fullName || `Thợ #${log.userId}`,
              cpu: log.cpu || partInfo.cpu || 0,
              reportDate: (log.createDate || log.submittedAt || "").split("T")[0]
            };
          });

          mergedLogs = [...mergedLogs, ...logsWithCtx];
        }
      });

      if (isPersonalView) {
        mergedLogs = mergedLogs.filter(log => String(log.userId || log.uId || log.accountId) === currentUserId);
      }

      mergedLogs.sort((a, b) => new Date(b.createDate || b.submittedAt || 0) - new Date(a.createDate || a.submittedAt || 0));
      setOutputs(mergedLogs);
    } catch (err) {
      console.error(err);
      setOutputs([]);
    } finally {
      setLoading(false);
    }
  }, [isPersonalView, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return outputs.filter((item) => {
      const matchQuery =
        !q ||
        String(item.productionId).includes(q) ||
        String(item.workerName || "").toLowerCase().includes(q) ||
        String(item.orderName || "").toLowerCase().includes(q) ||
        String(item.partName || "").toLowerCase().includes(q);

      const matchDate = allDates || !dateFilter || item.reportDate === dateFilter;
      return matchQuery && matchDate;
    });
  }, [outputs, query, dateFilter, allDates]);

  const stats = useMemo(() => {
    const totalQty = filtered.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalVND = filtered.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cpu) || 0), 0);
    return {
      totalLogs: filtered.length,
      totalQty,
      totalVND
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HEADER SECTION */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-none uppercase">
                  {isPersonalView ? "Sản lượng của tôi" : "Lịch sử sản lượng"}
                </h1>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mt-1">
                  Hệ thống quản lý sản lượng tập trung
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-white/60 backdrop-blur-sm text-[#1e6e43] border border-black rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm">
                {stats.totalLogs} Bản ghi
              </span>
            </div>
          </div>

          {/* STATS SECTION */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <StatCard
              icon={<History size={24} />}
              label="TỔNG LƯỢT BÁO CÁO"
              value={loading ? "..." : `${stats.totalLogs} lượt`}
              color="emerald"
            />
            <StatCard
              icon={<Wallet size={24} />}
              label="THU NHẬP DỰ KIẾN"
              value={loading ? "..." : `${stats.totalVND.toLocaleString()} đ`}
              color="emerald"
            />
          </div>

          {/* SEARCH & FILTER SECTION */}
          <div className="bg-white rounded-xl border border-black p-6 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tìm kiếm</label>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm mã đơn, tên hàng, công đoạn..."
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-black focus:bg-white transition-all shadow-inner"
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ngày báo cáo</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allDates}
                      onChange={(e) => setAllDates(e.target.checked)}
                      className="h-4 w-4 rounded-md border-slate-300 text-black focus:ring-black"
                    />
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tất cả ngày</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    disabled={allDates}
                    className="flex-1 h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-black focus:bg-white disabled:opacity-30 disabled:grayscale transition-all shadow-inner"
                  />
                  <button
                    onClick={fetchData}
                    className="h-12 w-12 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-black hover:border-black transition-all shadow-sm"
                  >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-white rounded-xl border border-black shadow-lg shadow-black/5 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">DANH SÁCH BÁO CÁO CHI TIẾT</h2>
              </div>
              {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black w-16">STT</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">Đơn sản xuất</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">Sản phẩm / Đơn hàng</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">Tên công đoạn</th>
                    {!isPersonalView && <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">Thợ</th>}
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">Đơn giá</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black font-black">SL</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800 font-black">Ngày ghi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 border-black font-black">
                  {filtered.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={isPersonalView ? 7 : 8} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-200">
                          <Package size={64} />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Không có dữ liệu báo cáo</p>
                        </div>
                      </td>
                    </tr>
                  ) : pageItems.map((item, index) => {
                    const idx = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all divide-x border-black divide-black border-b border-black last:border-b-0">
                        <td className="px-6 py-4 text-center font-bold text-slate-400 text-[11px] italic">{String(idx).padStart(2, "0")}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-lg bg-black px-2.5 py-1 text-[10px] font-bold uppercase text-white tracking-widest">
                            #PR-{item.productionId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 uppercase tracking-tight text-sm line-clamp-1">{item.orderName}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">REF: {item.orderId || "N/A"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#1e6e43] uppercase tracking-tight text-sm">{item.partName}</div>
                        </td>
                        {!isPersonalView && (
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-widest px-3 py-1 rounded-lg bg-slate-50 inline-block border border-black">
                              {item.workerName}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-slate-900">
                            {Number(item.cpu).toLocaleString()} <small className="text-[10px] text-slate-400">đ</small>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex h-10 w-14 items-center justify-center rounded-2xl bg-[#f0f9f4] border-2 border-[#d4e3da] text-emerald-700 font-bold text-sm">
                            {item.quantity}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-tighter italic">
                          {item.reportDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="px-8 py-6 bg-slate-50/50 border-t border-black">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Hiển thị {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filtered.length, currentPage * pageSize)} trên {filtered.length} bản ghi
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutComponent>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    emerald: "bg-white border-[#d4e3da] text-[#1e6e43]",
  };
  return (
    <div className="flex items-center gap-6 rounded-2xl border border-black bg-white p-8 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-md">
      <div className={`flex h-16 w-16 items-center justify-center rounded-xl border shadow-sm ${colorMap[color] || colorMap.emerald}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
