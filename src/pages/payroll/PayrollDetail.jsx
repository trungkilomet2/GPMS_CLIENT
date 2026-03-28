import { useMemo, useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Package, Calendar, TrendingUp, Info, Loader2 } from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import { fetchAggregatedPayroll, getWorkerMonthlyDetail } from "@/utils/payrollUtils";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function PayrollDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId } = useParams();
  const [searchParams] = useSearchParams();

  const initialMonth = Number(searchParams.get("month")) || location.state?.month || new Date().getMonth() + 1;
  const initialYear = Number(searchParams.get("year")) || location.state?.year || new Date().getFullYear();

  const [month] = useState(initialMonth);
  const [year] = useState(initialYear);
  const [logs, setLogs] = useState(location.state?.logs || []);
  const [loading, setLoading] = useState(!location.state?.logs);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.logs) return;

    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const aggregated = await fetchAggregatedPayroll(month, year);
        const workerData = aggregated.find(w => String(w.userId || w.workerName) === String(employeeId));
        if (active) {
          setLogs(workerData?.logs || []);
        }
      } catch (err) {
        if (active) {
          setError("Không thể tải chi tiết lương.");
          console.error(err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [employeeId, month, year, location.state]);

  const workerLogs = useMemo(() => {
    // If we have logs from state but navigate directly, this ensures we filter correctly
    return getWorkerMonthlyDetail(logs, employeeId, month, year);
  }, [logs, employeeId, month, year]);

  const stats = useMemo(() => {
    const totalQty = workerLogs.reduce((sum, log) => sum + log.quantity, 0);
    const totalSalary = workerLogs.reduce((sum, log) => sum + log.quantity * log.cpu, 0);
    const workerName = workerLogs[0]?.workerName || employeeId;
    return { totalQty, totalSalary, workerName };
  }, [workerLogs, employeeId]);

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng thu nhập tháng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {stats.totalSalary.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">VND</span>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sản lượng hoàn thành</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {stats.totalQty.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cái</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[300px] relative">
            <div className="leave-table-card__header">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-slate-400" />
                <h2 className="leave-table-card__title">Danh sách công đoạn đã làm trong tháng</h2>
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
                      <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {workerLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500">
                          Không tìm thấy dữ liệu báo cáo chi tiết cho thợ này.
                        </td>
                      </tr>
                    ) : (
                      workerLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium italic">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-300" />
                              {formatDate(log.reportDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 line-clamp-1 italic">{log.orderName}</div>
                            <Link 
                               to={`/production/${log.productionId}`}
                               state={{ from: location.pathname }}
                               className="text-[10px] text-emerald-600 hover:text-emerald-800 font-black uppercase tracking-widest transition-all hover:translate-x-1 inline-flex items-center gap-1"
                            >
                               #PR-{log.productionId}
                               <ArrowLeft size={10} className="rotate-180" />
                            </Link>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{log.partName}</td>
                          <td className="px-6 py-4 text-center text-slate-600 font-bold">
                            {Number(log.cpu).toLocaleString("vi-VN")}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex h-8 w-12 items-center justify-center rounded-lg bg-slate-100 font-black text-slate-700">
                              {log.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700">
                            {(log.quantity * log.cpu).toLocaleString("vi-VN")} VND
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50/80 font-black">
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-right text-slate-400 uppercase tracking-widest text-[10px]">Tổng cộng thu nhập</td>
                      <td className="px-6 py-4 text-right text-emerald-800 text-lg">
                        {stats.totalSalary.toLocaleString("vi-VN")} VND
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </PmOwnerLayout>
  );
}
