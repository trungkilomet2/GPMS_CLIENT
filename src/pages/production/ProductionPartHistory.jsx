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
  Zap,
  History
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
    const totalLogs = logs.length;
    const pendingCount = logs.filter(log => 
      !(log.status === 2 || log.statusName === "Đã nghiệm thu" || log.status === 4 || log.statusName === "Đã hoàn thành")
    ).length;
    
    return { 
      totalLogs, 
      pendingCount 
    };
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
      <div className="min-h-screen bg-[#f0f9f4] font-sans selection:bg-[#1e6e43]/10 selection:text-[#1e6e43] pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HEADER SECTION */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-600 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95"
              >
                <ArrowLeft size={22} />
              </button>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-none uppercase">
                  Lịch sử công đoạn
                </h1>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mt-1">
                  Mã sản xuất: #PR-{productionId || "..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-4 py-2 bg-[#f0f9f4] text-[#1e6e43] border border-[#d4e3da] rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm">
                {stats.totalLogs} Lượt báo cáo
              </span>
            </div>
          </div>

          {/* STATS SECTION */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <StatCard
              icon={<History size={24} />}
              label="Số lượt báo cáo"
              value={loading ? "..." : `${stats.totalLogs} lượt`}
              color="emerald"
            />
            <StatCard
              icon={<Zap size={24} />}
              label="Bản ghi chờ duyệt"
              value={loading ? "..." : `${stats.pendingCount} bản ghi`}
              color="emerald"
            />
          </div>

          {/* TABLE SECTION */}
          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Bảng kê chi tiết thực hiện</h2>
              </div>
              {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black w-16">STT</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Công đoạn</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Biến thể</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Thợ thực hiện</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Số lượng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Ngày ghi</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Trạng thái</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 border-black">
                  {logs.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={8} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-200">
                          <Package size={64} />
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Không có dữ liệu bản ghi</p>
                        </div>
                      </td>
                    </tr>
                  ) : logs.map((log, index) => {
                    const logPosId = String(log.partOrderSizeId || log.productionPartOrderSizeId || log.orderSizeId || log.productOrderSizeId || "");
                    const logPartId = String(log.productionPartId || log.partId || log.productPartId || log.partID || "");
                    const part = partsLookup[logPosId] || partsLookup[logPartId];
                    const osInfo = orderSizeLookup[logPosId];
                    const logId = log.id || log.workLogId;
                    const isEditing = editingId === logId;
                    const isDone = log.status === 2 || log.statusName === "Đã nghiệm thu";

                    const color = osInfo?.color || part?.color || part?.colorName || part?.productColor || "-";
                    const size = osInfo?.size || part?.size || part?.sizeName || part?.productSize || "-";

                    return (
                      <tr key={logId} className={`hover:bg-slate-50/50 transition-all divide-x divide-black border-b border-black last:border-b-0 ${isDone ? "bg-emerald-50/10" : ""}`}>
                        <td className="px-6 py-4 text-center font-bold text-slate-400 text-[11px] italic">{String(index + 1).padStart(2, "0")}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 uppercase tracking-tight text-sm">{part?.name || part?.partName || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 focus:outline-none">
                            {color !== "-" && <span className="rounded-lg bg-white border border-black px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">{color}</span>}
                            {size !== "-" && <span className="rounded-lg bg-white border border-black px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">{size}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-600 uppercase text-[10px] tracking-widest px-3 py-1 rounded-lg bg-slate-50 inline-block border border-black">
                            {log.userName || log.workerName || `Thợ #${log.userId}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-20 rounded-xl border border-black bg-white px-3 py-2 text-center font-bold text-slate-900 outline-none shadow-sm focus:border-slate-400 transition-all"
                              autoFocus
                            />
                          ) : (
                            <span className={`inline-flex h-9 w-12 items-center justify-center rounded-xl font-bold text-sm border ${isDone ? 'bg-slate-900 text-white border-black' : 'bg-white text-slate-800 border-black'}`}>
                              {log.quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-tighter italic">{formatDate(log.createDate || log.workDate)}</td>
                        <td className="px-6 py-4 text-center">
                          {log.status === 4 || log.statusName === "Đã hoàn thành" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-emerald-600 shadow-sm">
                              <CheckCircle2 size={11} /> Hoàn nhận
                            </span>
                          ) : log.status === 3 || log.statusName === "Chờ Nghiệm Thu" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-amber-600 shadow-sm">
                              <Zap size={11} className="animate-pulse" /> Chờ duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                              Đang xử lý
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => openEditConfirm(log)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-all"><Check size={18} /></button>
                                <button onClick={() => setEditingId(null)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-rose-500 text-rose-600 hover:bg-rose-50 transition-all"><X size={18} /></button>
                              </>
                            ) : (
                              <>
                                {!isDone && (
                                  <button
                                    onClick={() => handleOpenApprove(log)}
                                    title="Xác nhận Nghiệm thu"
                                    className="w-10 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#1e6e43] flex items-center justify-center transition-all hover:bg-[#1e6e43] hover:text-white hover:shadow-md active:scale-95"
                                  >
                                    <Zap size={16} />
                                  </button>
                                )}
                                <button onClick={() => { setEditingId(logId); setEditValue(String(log.quantity)); }} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all shadow-sm" title="Sửa"><Pencil size={15} /></button>
                                <button onClick={() => openDeleteConfirm(log)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-rose-300 hover:text-rose-500 hover:border-rose-200 active:scale-95 transition-all shadow-sm" title="Xóa"><Trash size={15} /></button>
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

        {/* MODALS */}
        {isApproveOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-black shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-black mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-black text-black uppercase tracking-tight">Nghiệm thu bản ghi</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Xác nhận sản lượng của: {targetLog?.userName || targetLog?.workerName}
                </p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Số lượng nghiệm thu</label>
                  <input
                    type="number"
                    value={approveQty}
                    onChange={(e) => setApproveQty(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center text-4xl font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400 transition-all shadow-inner"
                    autoFocus
                  />
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mt-3 italic">
                    * Thợ báo cáo: {targetLog?.quantity} cái
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsApproveOpen(false)}
                  className="flex-1 rounded-xl bg-white border border-slate-200 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={executeApprove}
                  className="flex-[2] rounded-xl bg-[#1e6e43] py-4 text-xs font-bold text-white uppercase tracking-widest hover:bg-[#155232] shadow-lg shadow-green-100 active:scale-[0.98] transition-all"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xl flex items-center gap-4">
              <Loader2 className="animate-spin text-black" size={24} />
              <span className="text-xs font-black text-black uppercase tracking-widest">Đang cập nhật...</span>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    emerald: "bg-[#f0f9f4] border-[#d4e3da] text-[#1e6e43]",
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

