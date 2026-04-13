import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Package,
  Loader2,
  Pencil,
  Trash,
  Check,
  X,
  CheckCircle2,
  ShieldCheck,
  Zap
} from "lucide-react";
import OwnerLayout from "@/layouts/OwnerLayout";
import ConfirmModal from "@/components/ConfirmModal";
import ProductionPartService from "@/services/ProductionPartService";
import ProductionService from "@/services/ProductionService";
import OrderService from "@/services/OrderService";
import { toast } from "react-toastify";

export default function ProductionPartHistory() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [productionId, setProductionId] = useState(params.productionId || "");
  const [logs, setLogs] = useState([]);
  const [partsLookup, setPartsLookup] = useState({});
  const [orderSizeLookup, setOrderSizeLookup] = useState({});
  const [loading, setLoading] = useState(true);

  // Management State
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", description: "", type: null, data: null });

  // Approve Modal State
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveQty, setApproveQty] = useState("");
  const [targetLog, setTargetLog] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      let activeProdId = productionId;
      if (!activeProdId && params.partId) {
        try {
          const partRes = await ProductionPartService.getPartDetail(params.partId);
          activeProdId = partRes?.data?.data?.productionId || partRes?.data?.productionId;
          if (activeProdId) setProductionId(String(activeProdId));
        } catch (err) { console.error(err); }
      }
      if (!activeProdId && location.state?.productionId) {
        activeProdId = location.state.productionId;
        setProductionId(String(activeProdId));
      }
      if (!activeProdId) { setLoading(false); return; }

      try {
        setLoading(true);
        // A. Fetch Production Detail
        const prodRes = await ProductionService.getProductionDetail(activeProdId);
        const prodData = prodRes?.data?.data || prodRes?.data || {};
        console.log("GPMS - RAW Production:", prodData);

        const orderId = prodData?.orderId || prodData?.order?.id || prodData?.orderID;

        // B. Fetch Order Detail
        if (orderId) {
          try {
            const orderRes = await OrderService.getOrderDetail(orderId);
            const orderData = orderRes?.data?.data || orderRes?.data || {};
            console.log("GPMS - RAW Order:", orderData);
            const orderDetails = orderData?.orderDetails || orderData?.orderItems || [];

            const osLookup = {};
            orderDetails.forEach(detail => {
              const color = detail.colorName || detail.productColorName || detail.color || "-";
              if (detail.orderSizes) {
                detail.orderSizes.forEach(os => {
                  const osId = String(os.id || os.orderSizeId || "");
                  if (osId) {
                    osLookup[osId] = {
                      color,
                      size: os.sizeName || os.size || os.productSize || "-"
                    };
                  }
                });
              }
            });
            setOrderSizeLookup(osLookup);
          } catch (err) { console.error("Error Order API:", err); }
        }

        // C. Fetch Parts
        const partsRes = await ProductionPartService.getPartsByProduction(activeProdId);
        const partsList = partsRes?.data?.data || partsRes?.data || [];
        console.log("GPMS - RAW Parts:", partsList);
        const lookup = {};

        partsList.forEach((p) => {
          const posid = String(p.partOrderSizeId || p.orderSizeId || "");
          const pid = String(p.id || p.partId || p.productionPartId || "");
          if (posid && posid !== "0") lookup[posid] = p;
          if (pid) lookup[pid] = p;
        });
        setPartsLookup(lookup);

        // D. Fetch Logs
        const logsRes = await ProductionPartService.getProductionWorkLogs(activeProdId);
        const logData = logsRes?.data?.data || logsRes?.data || [];
        console.log("GPMS - RAW Logs:", logData);
        setLogs(Array.isArray(logData) ? logData : []);
      } catch (err) {
        toast.error("Lỗi dữ liệu hệ thống.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [productionId, params.partId]);

  const stats = useMemo(() => {
    const totalQty = logs.reduce((sum, log) => sum + (log.quantity || 0), 0);
    return { totalQty, totalLogs: logs.length };
  }, [logs]);

  // --- ACTIONS ---

  const handleOpenApprove = (log) => {
    setTargetLog(log);
    setApproveQty(String(log.quantity)); // Fill with worker's quantity
    setIsApproveOpen(true);
  };

  const executeApprove = async () => {
    if (!targetLog) return;
    const qty = Number(approveQty);
    if (isNaN(qty) || qty < 0) {
      toast.warn("Số lượng nghiệm thu không hợp lệ.");
      return;
    }

    setIsApproveOpen(false);
    setIsProcessing(true);
    try {
      // Robust mapping from log to part details
      const posId = targetLog.partOrderSizeId || targetLog.productionPartOrderSizeId || 0;
      const pId = targetLog.productionPartId || targetLog.partId || 0;

      const part = partsLookup[String(posId)] || partsLookup[String(pId)];

      const finalPartId = pId || part?.partId || part?.id || 0;
      const finalPOSId = posId || part?.partOrderSizeId || 0;
      const logId = targetLog.id || targetLog.workLogId || 0;

      const payload = {
        approvedQuantity: Math.floor(qty)
      };

      console.log("GPMS - Executing Approve with IDs:", { finalPartId, finalPOSId, logId });

      await ProductionPartService.approveWorkLog(finalPartId, finalPOSId, logId, payload);

      setLogs(prev => prev.map(item =>
        (item.id || item.workLogId) === logId
          ? { ...item, quantity: qty, status: 2, statusName: "Đã nghiệm thu" }
          : item
      ));
      toast.success("Đã nghiệm thu sản lượng thành công.");
    } catch (err) {
      console.error("Full Error Response:", err.response);

      let msg = "Lỗi nghiệm thu: ";
      const data = err.response?.data;

      if (data?.errors) {
        // Extract all validation messages
        const errors = data.errors;
        const messages = Object.values(errors).flat().join(", ");
        msg += messages;
      } else {
        msg += data?.message || data?.title || "Lỗi hệ thống (400)";
      }

      toast.error(msg, { autoClose: 5000 });
    } finally {
      setIsProcessing(false);
      setTargetLog(null);
    }
  };

  const openDeleteConfirm = (log) => {
    setConfirmConfig({
      isOpen: true,
      type: "DELETE",
      title: "Xác nhận xóa bản ghi",
      description: `Bạn có chắc chắn muốn xóa lượt báo cáo này của thợ ${log.userName || log.workerName}?`,
      data: log
    });
  };

  const openEditConfirm = (log) => {
    const val = Number(editValue);
    if (isNaN(val) || val < 0) {
      toast.warn("Số lượng không hợp lệ.");
      return;
    }
    setConfirmConfig({
      isOpen: true,
      type: "EDIT",
      title: "Cập nhật sản lượng",
      description: `Thay đổi số lượng thành ${val} cái?`,
      data: { log, newVal: val }
    });
  };

  const executeAction = async () => {
    const { type, data } = confirmConfig;
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    setIsProcessing(true);

    try {
      if (type === "DELETE") {
        const logId = data.id || data.workLogId;
        await ProductionPartService.deleteWorkLog(logId);
        setLogs(prev => prev.filter(item => (item.id || item.workLogId) !== logId));
        toast.success("Đã xóa bản ghi.");
      } else if (type === "EDIT") {
        const { log, newVal } = data;
        const part = partsLookup[String(log.partOrderSizeId)] || partsLookup[String(log.partId)];
        const partId = log.partId || part?.partId || part?.id || 0;
        const partOrderSizeId = log.partOrderSizeId || part?.partOrderSizeId || 0;
        const logId = log.id || log.workLogId || 0;

        await ProductionPartService.updateWorkLog(partId, partOrderSizeId, logId, { quantity: newVal });
        setLogs(prev => prev.map(item => (item.id || item.workLogId) === logId ? { ...item, quantity: newVal } : item));
        setEditingId(null);
        toast.success("Đã cập nhật số lượng.");
      }
    } catch (err) {
      toast.error("Thao tác thất bại.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <OwnerLayout>
      <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-emerald-50 text-slate-600 transition-all border border-slate-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Nhật ký sản xuất</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Production Code: #PR-{productionId || "..."}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <StatCard icon={<Package size={22} />} label="Tổng sản lượng báo cáo" value={`${stats.totalQty.toLocaleString("vi-VN")} cái`} color="emerald" />
          <StatCard icon={<ClipboardCheck size={22} />} label="Tổng số lượt báo cáo" value={`${stats.totalLogs} lần`} color="blue" />
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
          <div className="bg-slate-50/50 px-8 py-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Chi tiết thực hiện & Nghiệm thu</span>
            </div>
            {loading && <Loader2 className="animate-spin text-emerald-600" size={20} />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/30 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  <th className="px-8 py-5 text-center">STT</th>
                  <th className="px-8 py-5">Công đoạn / Giai đoạn</th>
                  <th className="px-8 py-5">Biến thể</th>
                  <th className="px-8 py-5">Nhân sự</th>
                  <th className="px-8 py-5 text-center">Sản lượng</th>
                  <th className="px-8 py-5 text-center">Thời gian</th>
                  <th className="px-8 py-5 text-center">Trạng thái</th>
                  <th className="px-8 py-5 text-center text-emerald-600">Thao tác Quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 && !loading ? (
                  <tr><td colSpan={8} className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest opacity-40">Không có dữ liệu bản ghi</td></tr>
                ) : logs.map((log, index) => {
                  // Aggressive ID search
                  const logPosId = String(log.partOrderSizeId || log.productionPartOrderSizeId || log.orderSizeId || log.productOrderSizeId || "");
                  const logPartId = String(log.productionPartId || log.partId || log.productPartId || log.partID || "");

                  const part = partsLookup[logPosId] || partsLookup[logPartId];
                  const osInfo = orderSizeLookup[logPosId];

                  const logId = log.id || log.workLogId;
                  const isEditing = editingId === logId;
                  const isDone = log.status === 2 || log.statusName === "Đã nghiệm thu";

                  // Priority: OrderSizeLookup -> Part Color/Size -> Default "-"
                  const color = osInfo?.color || part?.color || part?.colorName || part?.productColor || "-";
                  const size = osInfo?.size || part?.size || part?.sizeName || part?.productSize || "-";

                  if (index === 0) {
                    console.log("GPMS - Row 0 Processing:", { logPosId, logPartId, osInfo, part, color, size });
                  }

                  return (
                    <tr key={logId} className={`group transition-all hover:bg-slate-50/80 ${isDone ? "bg-emerald-50/20" : ""}`}>
                      <td className="px-8 py-5 text-center font-bold text-slate-300">{String(index + 1).padStart(2, "0")}</td>
                      <td className="px-8 py-5">
                        <div className="font-extrabold text-slate-800">{part?.name || part?.partName || "N/A"}</div>
                        <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase">Mã: {logPartId || "-"}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex gap-1.5 focus:outline-none">
                          {color !== "-" && <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 shadow-sm">{color}</span>}
                          {size !== "-" && <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 shadow-sm">{size}</span>}
                          {color === "-" && size === "-" && <span className="text-slate-300">---</span>}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                            {(log.userName || log.workerName || "W")?.[0]}
                          </div>
                          <span className="font-bold text-slate-700">{log.userName || log.workerName || `Thợ #${log.userId}`}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {isEditing ? (
                          <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-20 rounded-xl border-2 border-emerald-300 bg-white px-3 py-1.5 text-center font-black text-emerald-700 outline-none shadow-lg focus:border-emerald-500" autoFocus />
                        ) : (
                          <span className={`inline-flex h-10 min-w-[3rem] items-center justify-center rounded-2xl font-black text-sm px-3 ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
                            {log.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">{formatDate(log.createDate || log.workDate)}</td>
                      <td className="px-8 py-5 text-center">
                        {log.status === 4 || log.statusName === "Đã hoàn thành" || log.statusName === "Đã hoàn thành" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-600">
                            <CheckCircle2 size={12} /> Đã hoàn thành
                          </span>
                        ) : log.status === 3 || log.statusName === "Chờ Nghiệm Thu" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-600">
                            <Loader2 size={12} className="animate-spin" /> Chờ nghiệm thu
                          </span>
                        ) : log.status === 2 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase text-blue-600">
                            Đang thực hiện
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-400">
                            Chưa thực hiện
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => openEditConfirm(log)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-md"><Check size={16} /></button>
                              <button onClick={() => setEditingId(null)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all shadow-md"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              {(log.status === 4 || log.statusName === "Đã hoàn thành") ? (
                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95" title="Đã hoàn thành">
                                  <CheckCircle2 size={18} strokeWidth={3} />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenApprove(log)}
                                  className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white text-emerald-600 border border-emerald-100 shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
                                  title="Nghiệm thu bản ghi"
                                >
                                  <Zap size={18} fill="currentColor" />
                                </button>
                              )}
                              <button onClick={() => { setEditingId(logId); setEditValue(String(log.quantity)); }} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-blue-100 text-blue-600 shadow-lg hover:bg-blue-50 active:scale-95" title="Chỉnh sửa"><Pencil size={18} /></button>
                              <button onClick={() => openDeleteConfirm(log)} className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-rose-100 text-rose-600 shadow-lg hover:bg-rose-50 active:scale-95" title="Xóa"><Trash size={18} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Approve Modal with Input */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Nghiệm thu sản lượng</h3>
              <p className="mt-2 text-sm font-medium text-slate-500 px-4">
                Xác nhận số lượng thực tế hoàn thành của <strong>{targetLog?.userName || targetLog?.workerName}</strong>.
              </p>
            </div>

            <div className="mb-8 space-y-4">
              <div className="rounded-3xl bg-slate-50 p-6 border border-slate-100 shadow-sm">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Số lượng nghiệm thu</label>
                <div className="relative">
                  <input
                    type="number"
                    value={approveQty}
                    onChange={(e) => setApproveQty(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-center text-3xl font-black text-slate-900 outline-none transition-all focus:border-emerald-500 focus:shadow-emerald-100/50 shadow-lg"
                    placeholder="0"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Cái</div>
                </div>
                <p className="mt-4 text-center text-[11px] font-bold text-slate-400 italic">
                  * Số lượng công nhân báo cáo: {targetLog?.quantity} cái
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsApproveOpen(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-black text-slate-500 transition-all hover:bg-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeApprove}
                className="flex-[1.5] rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-100"
              >
                Xác nhận Nghiệm thu
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={executeAction}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        primaryLabel={confirmConfig.type === "DELETE" ? "Đồng ý xóa" : "Xác nhận lưu"}
        secondaryLabel="Quay lại"
        confirmIcon={confirmConfig.type === "DELETE" ? Trash : Check}
      />

      {isProcessing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="rounded-3xl bg-white p-6 shadow-2xl flex items-center gap-4 border border-slate-100 animate-in fade-in duration-300">
            <Loader2 className="animate-spin text-emerald-600" size={24} />
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Đang cập nhật...</span>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = { emerald: "bg-emerald-50 text-emerald-600", blue: "bg-blue-50 text-blue-600" };
  return (
    <div className="flex items-center gap-6 rounded-[2rem] border border-white bg-white p-8 shadow-xl shadow-slate-200/50 transition-all hover:translate-y-[-4px] hover:shadow-2xl">
      <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] shadow-sm transform rotate-3 transition-transform group-hover:rotate-6 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
