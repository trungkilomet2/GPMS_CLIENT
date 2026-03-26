import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Users, 
  Wallet, 
  CalendarDays, 
  ChevronRight, 
  Download,
  AlertCircle,
  Loader2
} from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import { fetchAggregatedPayroll } from "@/utils/payrollUtils";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function PayrollList() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workerSummary, setWorkerSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAggregatedPayroll(selectedMonth, selectedYear);
        if (active) {
          setWorkerSummary(data);
        }
      } catch (err) {
        if (active) {
          setError("Không thể tải dữ liệu bảng lương. Vui lòng thử lại sau.");
          console.error(err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const totalBudget = workerSummary.reduce((sum, w) => sum + w.totalSalary, 0);
    const activeWorkers = workerSummary.length;
    return { totalBudget, activeWorkers };
  }, [workerSummary]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2024, 2025, 2026];

  return (
    <PmOwnerLayout>
      <div className="leave-page leave-list-page">
        <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <Wallet size={24} />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bảng lương thợ</h1>
                <p className="text-slate-600 text-sm">Quản lý lương dựa trên sản lượng sản xuất thực tế từ các công đoạn.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => window.print()}
              >
                <Download size={16} />
                <span>Xuất báo cáo</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
                  <Wallet size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng quỹ lương tháng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {stats.totalBudget.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">VND</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thợ có sản lượng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">{stats.activeWorkers}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Người</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <CalendarDays size={20} className="text-slate-400" />
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs text-slate-400 italic">
                * Dữ liệu được tổng hợp tự động từ báo cáo sản lượng của tất cả công đoạn.
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[400px] relative">
            <div className="leave-table-card__header">
              <h2 className="leave-table-card__title">Chi tiết thu nhập thợ</h2>
              <p className="leave-table-card__subtitle">Thống kê theo lượt báo cáo của nhân viên.</p>
            </div>

            <div className="overflow-x-auto relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Đang tổng hợp dữ liệu từ hệ thống...</p>
                  <p className="text-xs text-slate-400">Quá trình này có thể mất vài giây</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertCircle size={48} className="text-rose-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">{error}</h3>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {!loading && !error && (
                <table className="w-full divide-y divide-slate-100 table-fixed text-sm">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thợ</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Sản lượng</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Số báo cáo</th>
                      <th className="px-6 py-4 text-right font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thu nhập</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {workerSummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-500">
                          Chưa có dữ liệu sản lượng trong tháng {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      workerSummary.map((worker) => (
                        <tr key={worker.userId || worker.workerName} className="group hover:bg-slate-50/80 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-black uppercase shadow-sm">
                                {worker.workerName ? worker.workerName.charAt(0) : "?"}
                              </div>
                              <span className="font-bold text-slate-900">{worker.workerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {worker.totalQuantity.toLocaleString("vi-VN")} cái
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">
                            {worker.logCount} lượt
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700">
                            {worker.totalSalary.toLocaleString("vi-VN")} VND
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link 
                              to={`/payroll/${worker.userId || worker.workerName}`}
                              state={{ month: selectedMonth, year: selectedYear, logs: worker.logs }}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                            >
                              <ChevronRight size={20} />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </PmOwnerLayout>
  );
}
