import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Package, Calendar, Loader2 } from "lucide-react";
import PmOwnerLayout from "@/layouts/PmOwnerLayout";
import ProductionPartService from "@/services/ProductionPartService";
import { toast } from "react-toastify";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function ProductionPartHistory() {
  const { partId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const partInfo = location.state?.part || {};
  const productionInfo = location.state?.production || {};

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await ProductionPartService.getWorkLogs(partId);
        const data = res?.data?.data || res?.data || [];
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching work logs:", err);
        toast.error("Không thể tải lịch sử báo cáo.");
      } finally {
        setLoading(false);
      }
    };
    if (partId) fetchLogs();
  }, [partId]);

  const totalQuantity = useMemo(() => {
    return logs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0);
  }, [logs]);

  const totalAmount = useMemo(() => {
    const cpu = Number(partInfo.cpu || 0);
    return totalQuantity * cpu;
  }, [totalQuantity, partInfo.cpu]);

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
                  Lịch sử báo cáo: {partInfo.partName || partInfo.name || "Công đoạn"}
                </h1>
                <p className="text-slate-600 text-sm">
                  Đơn sản xuất #PR-{productionInfo.productionId || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-100">
                  <Package size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng sản lượng báo cáo</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {totalQuantity.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cái</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-lg shadow-slate-200">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Số lượt báo cáo</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {logs.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Lần</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-100">
                  <Package size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tổng tiền quyết toán</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900">
                      {totalAmount.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">VND</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="leave-table-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[400px] relative">
            <div className="leave-table-card__header">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-slate-400" />
                <h2 className="leave-table-card__title">Chi tiết các bản ghi sản lượng</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-2" />
                  <p className="text-sm font-bold text-slate-600">Đang tải lịch sử...</p>
                </div>
              ) : (
                <table className="w-full divide-y divide-slate-100 table-auto text-sm">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px] w-16">STT</th>
                      <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thợ thực hiện</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Số lượng</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Đơn giá</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Thành tiền</th>
                      <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-slate-500 text-[10px]">Ngày ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500 italic">
                          Chưa có thợ nào báo cáo sản lượng cho công đoạn này.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4 text-center text-slate-400 font-bold italic">
                            {(idx + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">
                                {(() => {
                                  // 1. Thử lấy trực tiếp từ log
                                  const nameFromLog = log.fullName || log.workerFullName || log.workerName || log.userName || 
                                                     log.worker?.fullName || log.user?.fullName || log.account?.fullName;
                                  if (nameFromLog) return nameFromLog;

                                  // 2. Thử tra cứu từ danh sách phân công (nếu có ppsInfo/partInfo)
                                  const assignees = partInfo.assignees || partInfo.assignedWorkers || partInfo.workers || [];
                                  const match = assignees.find(a => 
                                    String(a.id || a.userId || a.workerId) === String(log.userId || log.uId)
                                  );
                                  if (match) return match.fullName || match.name || match.workerName;

                                  // 3. Fallback
                                  return `Thợ #${log.userId || log.uId || "?"}`;
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex h-9 min-w-[3rem] px-2 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-900">
                              {log.quantity?.toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600 font-semibold">
                            {Number(partInfo.cpu || 0).toLocaleString("vi-VN")} đ
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-emerald-600 font-black">
                              {(Number(log.quantity || 0) * Number(partInfo.cpu || 0)).toLocaleString("vi-VN")} đ
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 font-medium">
                            <div className="flex items-center justify-center gap-2">
                              <Calendar size={14} className="text-slate-300" />
                              {formatDate(log.workDate || log.reportDate)}
                            </div>
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
