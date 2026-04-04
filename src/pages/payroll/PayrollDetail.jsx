import { useMemo, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Package, Calendar, TrendingUp, Info, Loader2, CreditCard, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import { fetchAggregatedPayroll, getWorkerMonthlyDetail } from "@/utils/payrollUtils";
import { getErrorMessage } from "@/utils/errorUtils";
import ProductionPartService from "@/services/ProductionPartService";
import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";
import SuccessModal from "@/components/SuccessModal";
import { toast } from "react-toastify";
import "@/styles/homepage.css";
import "@/styles/leave.css";
import { exportDetailToExcel } from "@/utils/exportUtils";
import { Download } from "lucide-react";

export default function PayrollDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workerId } = useParams();
  const [searchParams] = useSearchParams();

  const initialMonth = Number(searchParams.get("month")) || location.state?.month || new Date().getMonth() + 1;
  const initialYear = Number(searchParams.get("year")) || location.state?.year || new Date().getFullYear();

  const [month] = useState(initialMonth);
  const [year] = useState(initialYear);
  const [logs, setLogs] = useState(location.state?.logs || []);
  const [loading, setLoading] = useState(!location.state?.logs);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isPaying, setIsPaying] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'paid', 'unpaid'

  useEffect(() => {
    if (location.state?.logs) return;

    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const aggregated = await fetchAggregatedPayroll(month, year);
        const workerData = aggregated.find(w => String(w.userId || w.workerName) === String(workerId));
        if (active) {
          setLogs(workerData?.logs || []);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, "Không thể tải chi tiết lương."));
          console.error(err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [workerId, month, year, refreshKey]);

  const handlePaymentAll = async (workerLogs) => {
    if (!workerLogs?.length) return;

    // Filter out already paid logs if possible
    const unpaidLogs = workerLogs.filter(log => !log.paidAt);
    if (unpaidLogs.length === 0 && workerLogs.some(l => l.paidAt)) {
      toast.info("Tất cả công đoạn hiện tại đã được thanh toán.");
      return;
    }

    setIsConfirmOpen(true);
  };

  const confirmPaymentAll = async () => {
    setIsConfirmOpen(false);
    try {
      setIsPaying(true);
      
      // Filter ONLY unpaid logs before grouping
      const unpaidLogs = workerLogs.filter(l => !(l.isPayment || !!l.paidAt));
      if (unpaidLogs.length === 0) {
        toast.info("Không có công đoạn mới nào cần thanh toán.");
        return;
      }

      // Group logically by partId
      const groups = unpaidLogs.reduce((acc, log) => {
        const pId = log.partId;
        if (!pId) return acc;
        if (!acc[pId]) acc[pId] = [];
        acc[pId].push(log.id || log.workLogId || log.wlId);
        return acc;
      }, {});

      const promises = Object.entries(groups).map(([partId, logIds]) =>
        ProductionPartService.completePayment(partId, { workLogIds: logIds })
      );

      await Promise.all(promises);
      setIsSuccessOpen(true);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Thanh toán thất bại."));
    } finally {
      setIsPaying(false);
    }
  };

  const workerLogs = useMemo(() => {
    // If we have logs from state but navigate directly, this ensures we filter correctly
    return getWorkerMonthlyDetail(logs, workerId, month, year);
  }, [logs, workerId, month, year]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === "all") return workerLogs;
    return workerLogs.filter(log => {
      const isPaid = log.isPayment || !!log.paidAt;
      return statusFilter === "paid" ? isPaid : !isPaid;
    });
  }, [workerLogs, statusFilter]);

  const stats = useMemo(() => {
    const totalQty = workerLogs.reduce((sum, log) => sum + (log.quantity || 0), 0);
    const uniquePartCount = new Set(workerLogs.map(l => l.partId).filter(Boolean)).size;
    
    // Total Salary in Month
    const totalSalary = workerLogs.reduce((sum, log) => sum + (log.quantity || 0) * (log.cpu || 0), 0);
    
    const totalPaid = workerLogs.reduce((sum, log) => {
      const isPaid = log.isPayment || !!log.paidAt;
      return isPaid ? sum + (log.quantity || 0) * (log.cpu || 0) : sum;
    }, 0);
    
    const totalUnpaid = totalSalary - totalPaid;

    const firstLog = workerLogs[0];
    const workerName = firstLog?.workerFullName || firstLog?.workerName || workerId;
    const workerAvatar = firstLog?.workerAvatar || null;
    return { totalQty, uniquePartCount, totalSalary, totalPaid, totalUnpaid, workerName, workerAvatar };
  }, [workerLogs, workerId]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const currentLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN");
    } catch {
      return dateStr;
    }
  };

  return (
    <PmOwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-4">
                {stats.workerAvatar ? (
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-sm ring-1 ring-slate-100">
                    <img src={stats.workerAvatar} alt={stats.workerName} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black uppercase text-emerald-700 shadow-sm ring-1 ring-emerald-200">
                    {stats.workerName.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Chi tiết lương: {stats.workerName}
                  </h1>
                  <p className="text-slate-600 text-sm">
                    Kỳ lương: Tháng {month}/{year}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => exportDetailToExcel(workerLogs, stats.workerName, month, year)}
                disabled={workerLogs.length === 0}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                title="Tải chi tiết lương (Excel)"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Xuất chi tiết</span>
              </button>
              <button
                onClick={() => handlePaymentAll(workerLogs)}
                disabled={isPaying || workerLogs.length === 0}
                className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                Thanh toán lương
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng thu nhập tháng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {stats.totalSalary.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">VND</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-100">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Đã thanh toán</p>
                  <div className="flex items-baseline gap-1 border-b border-sky-50">
                    <span className="text-2xl font-black text-sky-700">
                      {stats.totalPaid.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-sky-400 uppercase">VND</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-100">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chờ thanh toán</p>
                  <div className="flex items-baseline gap-1 border-b border-amber-50">
                    <span className="text-2xl font-black text-amber-700">
                      {stats.totalUnpaid.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 uppercase">VND</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                  <Package size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Số công đoạn</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {stats.uniquePartCount}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Công đoạn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[300px] relative">
            <div className="leave-table-card__header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Info size={16} className="text-slate-400" />
                <h2 className="leave-table-card__title">Danh sách công đoạn đã làm trong tháng</h2>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 px-2 text-slate-400">
                  <Filter size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Lọc trạng thái:</span>
                </div>
                <div className="flex gap-1">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'paid', label: 'Đã thanh toán' },
                    { id: 'unpaid', label: 'Chờ thanh toán' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => { setStatusFilter(btn.id); setCurrentPage(1); }}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${
                        statusFilter === btn.id
                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                        : 'text-slate-500 hover:bg-white/50'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Đang tải chi tiết...</p>
                </div>
              )}

              {error && (
                <div className="py-20 text-center text-rose-500 font-bold">{error}</div>
              )}

              {!loading && !error && (
                <table className="w-full divide-y divide-slate-100 table-auto text-sm">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px]">Ngày ghi nhận</th>
                      <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px]">Đơn hàng / Sản xuất</th>
                      <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px]">Công đoạn</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Đơn giá</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Số lượng</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Trạng thái</th>
                      <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {currentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500">
                          Không tìm thấy dữ liệu báo cáo chi tiết cho thợ này.
                        </td>
                      </tr>
                    ) : (
                      currentLogs.map((log, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-emerald-500">
                          <td className="px-6 py-5 whitespace-nowrap text-slate-500 font-medium italic">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-300" />
                              {formatDate(log.reportDate)}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-slate-900 line-clamp-1 italic text-sm">{log.orderName}</div>
                            <Link
                              to={`/production/${log.productionId}`}
                              state={{ from: location.pathname }}
                              className="text-[10px] text-emerald-600 hover:text-emerald-800 font-black uppercase tracking-widest transition-all hover:translate-x-1 inline-flex items-center gap-1 opacity-70 hover:opacity-100"
                            >
                              #PR-{log.productionId}
                              <ArrowLeft size={10} className="rotate-180" />
                            </Link>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-slate-700">{log.partName}</div>
                          </td>
                          <td className="px-6 py-5 text-center text-slate-600 font-black">
                            {Number(log.cpu).toLocaleString("vi-VN")}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-flex h-9 w-12 items-center justify-center rounded-xl bg-blue-50/50 border border-blue-100 font-black text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-300 transform group-hover:scale-110">
                              {log.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center whitespace-nowrap">
                            {log.isPayment || log.paidAt ? (
                              <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-[10px] uppercase shadow-sm">
                                <CheckCircle2 size={12} />
                                Đã thanh toán
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 font-black text-[10px] uppercase shadow-sm">
                                <AlertCircle size={12} />
                                Chờ thanh toán
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-emerald-700 text-base">
                            {(log.quantity * log.cpu).toLocaleString("vi-VN")} <span className="text-[10px] opacity-50 ml-0.5">VND</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50/80 font-black">
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-right text-slate-400 uppercase tracking-widest text-[10px]">Tổng cộng thu nhập (Trên kết quả lọc)</td>
                      <td className="px-6 py-4 text-right text-emerald-800 text-lg">
                        {filteredLogs.reduce((sum, log) => sum + (log.quantity * log.cpu), 0).toLocaleString("vi-VN")} VND
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
            {filteredLogs.length > 0 && !loading && !error && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalCount={filteredLogs.length}
                  pageSize={pageSize}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Xác nhận thanh toán lương"
        primaryLabel="Xác nhận thanh toán"
        confirmIcon={CreditCard}
        description={`Bạn có chắc chắn muốn thanh toán tổng số tiền chờ thanh toán là: ${stats.totalUnpaid.toLocaleString("vi-VN")} VND cho ${stats.workerName}?`}
        onConfirm={confirmPaymentAll}
        onClose={() => setIsConfirmOpen(false)}
      />

      <SuccessModal
        isOpen={isSuccessOpen}
        title="Thanh toán thành công"
        description={`Đã xác nhận thanh toán cho toàn bộ công đoạn trong tháng của ${stats.workerName}.`}
        primaryLabel="Đóng"
        onPrimary={() => setIsSuccessOpen(false)}
        onClose={() => setIsSuccessOpen(false)}
        hideSecondary={true}
      />
    </PmOwnerLayout>
  );
}
