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
import { toast } from "react-toastify";
import { getStoredUser } from "@/lib/authStorage";
import { getPrimaryWorkspaceRole, hasAnyRole } from "@/lib/internalRoleFlow";
import WorkerLayout from "@/layouts/WorkerLayout";
import Pagination from "@/components/Pagination";
import "@/styles/homepage.css";
import "@/styles/leave.css";

export default function ProductionPartHistory() {
  const user = getStoredUser();
  const primaryRole = getPrimaryWorkspaceRole(user?.role);
  const isWorker = primaryRole === "worker";
  const LayoutComponent = isWorker ? WorkerLayout : OwnerLayout;

  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [productionId, setProductionId] = useState(params.productionId || "");
  const [logs, setLogs] = useState([]);
  const [partsLookup, setPartsLookup] = useState({});
  const [variantLookup, setVariantLookup] = useState({});
  const [orderSizeLookup, setOrderSizeLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "pending", "accepted"

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

  const toPositiveInt = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  };

  const getLogIdentity = (log = {}) => {
    const finalLogId = toPositiveInt(log.id || log.workLogId);
    const variantIdValue = log.partOrderSizeId || log.productionPartOrderSizeId || log.orderSizeId || 0;
    const finalVariantId = toPositiveInt(variantIdValue);
    const logPartId = log.productionPartId || log.partId;
    let finalPartId = toPositiveInt(logPartId);

    if (finalPartId === 0 && finalVariantId !== 0) {
      const foundPart = variantLookup[String(finalVariantId)];
      if (foundPart) {
        finalPartId = toPositiveInt(foundPart.id || foundPart.partId);
      }
    }
    if (finalPartId === 0) {
      finalPartId = toPositiveInt(params.partId);
    }
    return { partId: finalPartId, partOrderSizeId: finalVariantId, workLogId: finalLogId };
  };

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
        // A. Fetch Production Detail (Basic Info)
        try {
          await ProductionService.getProductionDetail(activeProdId);
        } catch (e) {
          console.error("Error Production Detail API:", e);
        }

        // B. Fetch Parts & Build Lookup (No Order API needed anymore)
        const partsRes = await ProductionPartService.getPartsByProduction(activeProdId).catch(err => {
          console.error("Error Parts API:", err);
          return { data: [] };
        });

        if (partsRes) {
          const partsList = partsRes.data?.data || partsRes.data || [];
          const pLookup = {};
          const vLookup = {};
          const osLookup = {};

          partsList.forEach((p) => {
            const pid = String(p.id || p.partId || p.productionPartId || "");
            if (pid && pid !== "0") pLookup[pid] = p;

            const variants = p.listPartOrderSizes || p.variants || p.partOrderSizes || [];
            variants.forEach(v => {
              const vlinkId = String(v.id || v.partOrderSizeId || "");
              if (vlinkId && vlinkId !== "0") {
                vLookup[vlinkId] = p;
                osLookup[vlinkId] = {
                  color: v.color || v.colorName || "-",
                  size: v.size || v.sizeName || "-",
                  targetQuantity: v.quantity || v.targetQuantity || 0
                };
              }
            });
          });
          setPartsLookup(pLookup);
          setVariantLookup(vLookup);
          setOrderSizeLookup(osLookup);
        }

        // C. Fetch Logs (Multi-page)
        let allLogs = [];
        let pIdx = 0;
        let hasMore = true;
        while (hasMore && pIdx < 50) {
          try {
            const logsRes = await ProductionPartService.getProductionWorkLogs(activeProdId, { PageIndex: pIdx, PageSize: 30 });
            const logData = logsRes?.data?.data || logsRes?.data || [];
            if (Array.isArray(logData) && logData.length > 0) {
              allLogs = [...allLogs, ...logData];
              hasMore = logData.length === 30;
              pIdx++;
            } else {
              hasMore = false;
            }
          } catch (err) {
            console.error(`Error Logs API Page ${pIdx}:`, err);
            hasMore = false;
          }
        }
        setLogs(allLogs);

      } catch (err) {
        console.error("Critical Fetch Error:", err);
        toast.error("Lỗi dữ liệu hệ thống.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [productionId, params.partId]);

  const stats = useMemo(() => {
    const totalLogs = logs.length;
    const pendingCount = logs.filter(log => !log.isReadOnly).length;
    return { totalLogs, pendingCount };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === "all") return logs;
    if (statusFilter === "pending") return logs.filter(log => !log.isReadOnly);
    if (statusFilter === "accepted") return logs.filter(log => log.isReadOnly);
    return logs;
  }, [logs, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  const pageLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleOpenApprove = (log) => {
    const fallbackQty = Number(log.quantity);
    setTargetLog(log);
    setApproveQty(Number.isFinite(fallbackQty) ? String(Math.max(0, Math.floor(fallbackQty))) : "");
    setIsApproveOpen(true);
  };

  const executeApprove = async () => {
    if (!targetLog) return;
    const qty = Number(approveQty);
    if (isNaN(qty) || qty < 0) {
      toast.warn("Số lượng nghiệm thu không hợp lệ.");
      return;
    }
    const approvedQuantity = Math.floor(qty);
    const logPosId = String(targetLog.productionPartOrderSizeId || targetLog.partOrderSizeId || targetLog.orderSizeId || "");
    const osInfo = orderSizeLookup[logPosId];
    if (osInfo && approvedQuantity > osInfo.targetQuantity) {
      toast.warn(`Số lượng nghiệm thu không được vượt quá số lượng của biến thể (${osInfo.targetQuantity}).`);
      return;
    }
    const { partId, partOrderSizeId, workLogId } = getLogIdentity(targetLog);
    if (!partId || !partOrderSizeId || !workLogId) {
      toast.error("Không đủ thông tin để nghiệm thu bản ghi này.");
      return;
    }
    setIsApproveOpen(false);
    setIsProcessing(true);
    try {
      const payload = { approvedQuantity };
      await ProductionPartService.approveWorkLog(partId, partOrderSizeId, workLogId, payload);
      setLogs((prev) => prev.map((item) => (
        getLogIdentity(item).workLogId === workLogId
          ? { ...item, quantity: approvedQuantity, status: 2, statusName: "Đã nghiệm thu", isReadOnly: true }
          : item
      )));
      toast.success("Đã nghiệm thu sản lượng thành công.");
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.error || "Lỗi nghiệm thu sản phẩm.";
      toast.error(msg);
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

    const logPosId = String(log.productionPartOrderSizeId || log.partOrderSizeId || log.orderSizeId || "");
    const osInfo = orderSizeLookup[logPosId];
    if (osInfo && val > osInfo.targetQuantity) {
      toast.warn(`Số lượng không được vượt quá số lượng của biến thể (${osInfo.targetQuantity}).`);
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
        const { workLogId } = getLogIdentity(data);
        await ProductionPartService.deleteWorkLog(workLogId);
        setLogs((prev) => prev.filter((item) => getLogIdentity(item).workLogId !== workLogId));
        toast.success("Đã xóa bản ghi.");
      } else if (type === "EDIT") {
        const { log, newVal } = data;
        const { partId, partOrderSizeId, workLogId } = getLogIdentity(log);
        await ProductionPartService.updateWorkLog(partId, partOrderSizeId, workLogId, { quantity: newVal });
        setLogs((prev) => prev.map((item) => (getLogIdentity(item).workLogId === workLogId ? { ...item, quantity: newVal } : item)));
        setEditingId(null);
        toast.success("Đã cập nhật số lượng.");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.error || "Thao tác thất bại.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <LayoutComponent>
      <div className="leave-page min-h-screen font-sans selection:bg-[#1e6e43]/10 selection:text-[#1e6e43] pb-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

          {/* HEADER */}
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
                  Lịch sử báo cáo sản lượng
                </h1>
                <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mt-1">
                  Mã sản xuất: #PR-{productionId || "..."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <StatCard icon={<History size={24} />} label="Số lượt báo cáo" value={loading ? "..." : `${stats.totalLogs} lượt`} color="emerald" />
            <StatCard icon={<Zap size={24} />} label="Bản ghi chờ duyệt" value={loading ? "..." : `${stats.pendingCount} bản ghi`} color="emerald" />
          </div>

          <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#1e6e43] rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800">Bảng kê chi tiết thực hiện</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-black shadow-sm mr-4">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "pending", label: "Chờ nghiệm thu" },
                    { id: "accepted", label: "Đã nghiệm thu" }
                  ].map(btn => (
                    <button
                      key={btn.id}
                      onClick={() => { setStatusFilter(btn.id); setCurrentPage(1); }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === btn.id ? 'bg-[#1e6e43] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-black">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-black">
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black w-16">STT</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Công đoạn</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Kích cỡ & màu sắc</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black min-w-[160px]">Thợ thực hiện</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Số lượng</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Ngày ghi</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 border-r border-black">Trạng thái</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-800 w-[140px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 border-black">
                  {logs.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={8} className="py-32 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Không có dữ liệu</td>
                    </tr>
                  ) : pageLogs.map((log, index) => {
                    const globalIndex = (currentPage - 1) * pageSize + index + 1;
                    const logPosId = String(log.productionPartOrderSizeId || log.partOrderSizeId || log.orderSizeId || "");
                    const osInfo = orderSizeLookup[logPosId];
                    const { workLogId } = getLogIdentity(log);
                    const rowId = workLogId || `row-${index}`;
                    const isEditing = editingId === rowId;
                    const isDone = log.status === 2 || log.statusName === "Đã nghiệm thu";

                    // CHECK PERMISSIONS
                    const isOwnerOrPM = primaryRole === "owner" || primaryRole === "pm";
                    const isCreator = String(log.userId || log.workerId || log.accountId) === String(user?.id || user?.userId);
                    
                    const canApprove = isOwnerOrPM && !isDone && !log.isReadOnly;
                    const canEditDelete = (isOwnerOrPM || isCreator) && !isDone && !log.isReadOnly;

                    return (
                      <tr key={rowId} className={`hover:bg-slate-50/50 transition-all divide-x divide-black border-b border-black last:border-b-0 ${isDone ? "bg-emerald-50/5" : ""}`}>
                        <td className="px-6 py-4 text-center font-bold text-slate-400 text-[11px] italic">{String(globalIndex).padStart(2, "0")}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 uppercase tracking-tight text-sm">{log.productionPartName || log.partName || "N/A"}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5">
                            <span className="rounded-lg bg-white border border-black px-2.5 py-1 text-[10px] font-bold uppercase">{log.colorName || osInfo?.color || "-"}</span>
                            <span className="rounded-lg bg-white border border-black px-2.5 py-1 text-[10px] font-bold uppercase">{log.sizeName || osInfo?.size || "-"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center whitespace-nowrap font-bold text-slate-600 uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full bg-slate-50 border border-black italic min-w-[120px]">
                            {log.userName || log.workerName || `Thợ #${log.userId}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            (() => {
                              const posId = String(log.productionPartOrderSizeId || log.partOrderSizeId || log.orderSizeId || "");
                              const limit = orderSizeLookup[posId]?.targetQuantity || 0;
                              const isOver = Number(editValue) > limit;
                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    value={editValue}
                                    max={limit}
                                    onChange={e => setEditValue(e.target.value)}
                                    className={`w-16 rounded border ${isOver ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-black'} text-center font-bold outline-none transition-all`}
                                    autoFocus
                                  />
                                  {isOver && <span className="text-[8px] font-black text-rose-500 uppercase leading-none">Tối đa: {limit}</span>}
                                </div>
                              );
                            })()
                          ) : (
                            <span className={`inline-flex h-8 w-10 items-center justify-center rounded-lg font-bold text-xs border ${isDone ? 'bg-slate-900 text-white' : 'bg-white border-black'}`}>{log.quantity}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold text-slate-600 italic">{formatDate(log.createDate || log.workDate)}</td>
                        <td className="px-6 py-4 text-center">
                          {log.isReadOnly ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-indigo-700"><ClipboardCheck size={11} /> Đã nghiệm thu</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-white px-3 py-0.5 text-[9px] font-bold uppercase text-amber-600"><Zap size={11} className="animate-pulse" /> Chờ nghiệm thu</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              (() => {
                                const posId = String(log.productionPartOrderSizeId || log.partOrderSizeId || log.orderSizeId || "");
                                const limit = orderSizeLookup[posId]?.targetQuantity || 0;
                                const isOver = Number(editValue) > limit;
                                return (
                                  <>
                                    <button
                                      onClick={() => !isOver && openEditConfirm(log)}
                                      disabled={isOver}
                                      title={isOver ? "Vượt quá giới hạn" : "Lưu số lượng"}
                                      className={`h-9 w-9 flex items-center justify-center rounded-xl bg-white border ${isOver ? 'border-slate-200 text-slate-300' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'} transition-all active:scale-95 shadow-sm`}
                                    >
                                      <Check size={18} />
                                    </button>
                                    <button onClick={() => setEditingId(null)} title="Hủy bỏ" className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-rose-500 text-rose-600 hover:bg-rose-50 transition-all active:scale-95 shadow-sm"><X size={18} /></button>
                                  </>
                                );
                              })()
                            ) : (
                              <>
                                {canApprove && (
                                  <button
                                    onClick={() => handleOpenApprove(log)}
                                    title="Xác nhận Nghiệm thu"
                                    className="w-10 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-[#1e6e43] flex items-center justify-center transition-all hover:bg-[#1e6e43] hover:text-white hover:shadow-md active:scale-95 shadow-sm"
                                  >
                                    <Zap size={16} />
                                  </button>
                                )}
                                {canEditDelete && (
                                  <>
                                    <button
                                      onClick={() => (setEditingId(rowId), setEditValue(String(log.quantity)))}
                                      title="Chỉnh sửa sản lượng"
                                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 transition-all hover:text-slate-900 hover:border-slate-300 hover:shadow-sm active:scale-95 shadow-sm"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => openDeleteConfirm(log)}
                                      title="Xóa lượt báo cáo này"
                                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-rose-300 transition-all hover:text-rose-500 hover:border-rose-200 hover:shadow-sm active:scale-95 shadow-sm"
                                    >
                                      <Trash size={15} />
                                    </button>
                                  </>
                                )}
                                {!canApprove && !canEditDelete && (
                                  <div className="flex items-center gap-1.5 opacity-40 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 grayscale" title="Bạn không có quyền thao tác trên bản ghi này">
                                    <ShieldCheck size={14} className="text-slate-400" />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Chỉ xem</span>
                                  </div>
                                )}
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

            <div className="px-8 py-5 border-t border-black bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hiển thị {filteredLogs.length} bản ghi</p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        </div>

        {isApproveOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-black shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 mb-4"><ShieldCheck size={32} /></div>
                <h3 className="text-xl font-black uppercase tracking-tight">Nghiệm thu bản ghi</h3>
              </div>
              <div className="space-y-6 mb-8">
                {(() => {
                  const logPosId = String(targetLog?.productionPartOrderSizeId || targetLog?.partOrderSizeId || targetLog?.orderSizeId || "");
                  const limit = orderSizeLookup[logPosId]?.targetQuantity || 0;
                  const isOver = Number(approveQty) > limit;
                  return (
                    <>
                      <div className="relative">
                        <input
                          type="number"
                          value={approveQty}
                          max={limit}
                          onChange={(e) => setApproveQty(e.target.value)}
                          className={`w-full rounded-2xl border ${isOver ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-rose-100' : 'border-slate-200 bg-slate-50 text-slate-900'} px-6 py-5 text-center text-4xl font-bold outline-none transition-all shadow-inner`}
                          autoFocus
                        />
                        {isOver && (
                          <div className="absolute -bottom-4 left-0 right-0 text-center">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-white px-2">Số lượng tối đa: {limit}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase text-center mt-3">Thợ báo cáo: {targetLog?.quantity} cái</div>
                      <div className="flex gap-4">
                        <button onClick={() => setIsApproveOpen(false)} className="flex-1 rounded-xl bg-white border border-slate-200 py-4 text-xs font-bold text-slate-500 uppercase">Hủy bỏ</button>
                        <button
                          onClick={() => !isOver && executeApprove()}
                          disabled={isOver}
                          className={`flex-[2] rounded-xl py-4 text-xs font-bold text-white uppercase shadow-lg transition-all ${isOver ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-[#1e6e43] shadow-green-100 active:scale-[0.98]'}`}
                        >
                          Xác nhận Nghiệm thu
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmConfig.isOpen} title={confirmConfig.title} description={confirmConfig.description}
          onConfirm={executeAction} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          primaryLabel={confirmConfig.type === "DELETE" ? "Đồng ý xóa" : "Xác nhận lưu"} secondaryLabel="Quay lại"
          confirmIcon={confirmConfig.type === "DELETE" ? <Trash size={32} /> : <Check size={32} />} variant={confirmConfig.type === "DELETE" ? "danger" : "success"}
        />

        {isProcessing && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xl flex items-center gap-4">
              <Loader2 className="animate-spin text-black" size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Đang cập nhật...</span>
            </div>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorMap = { emerald: "bg-[#f0f9f4] border-[#d4e3da] text-[#1e6e43]" };
  return (
    <div className="flex items-center gap-6 rounded-2xl border border-black bg-white p-8 shadow-sm transition-all hover:translate-y-[-2px]">
      <div className={`flex h-16 w-16 items-center justify-center rounded-xl border shadow-sm ${colorMap[color] || colorMap.emerald}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
      </div>
    </div>
  );
}
