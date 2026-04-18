import React, { useState } from 'react';
import { Truck, CheckCircle, Clock, Plus, BarChart2, Info, History, AlertCircle } from 'lucide-react';
import ProductionService from '@/services/ProductionService';
import { toast } from 'react-toastify';
export default function DeliveryProgressSection({
    variants = [],
    rawOrderSizes = [],
    deliveries = [],
    onAddDelivery,
    isOwner = false,
    isCustomer = false,
    onConfirmDelivery
}) {
    const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
    const sizeLabels = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const SIZE_ID_TO_LABEL = { 1: 'XS', 2: 'S', 3: 'M', 4: 'L', 5: 'XL', 6: '2XL', 7: '3XL' };

    const [isDiaryOpen, setIsDiaryOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [targetDelivery, setTargetDelivery] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmationInput, setConfirmationInput] = useState("");
    const [localError, setLocalError] = useState("");

    const handleConfirmAction = async () => {
        if (!targetDelivery || !confirmationInput) return;

        // Map Vietnamese input keywords to backend expected values
        let backendValue = confirmationInput.trim().toUpperCase();
        if (backendValue === 'Y') backendValue = 'Yes';
        else if (backendValue === 'N') backendValue = 'No';

        try {
            setIsConfirming(true);
            const deliveryId = targetDelivery.id || targetDelivery.deliverId || targetDelivery.deliverID;
            await ProductionService.confirmDelivery(deliveryId, backendValue);

            toast.success("Xác nhận thành công!");
            setIsConfirmModalOpen(false);
            setTargetDelivery(null);
            setConfirmationInput("");

            if (typeof onConfirmDelivery === 'function') {
                onConfirmDelivery();
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error("Error confirming delivery:", err.response?.data || err);
            
            const errorData = err.response?.data;
            let errorMsg = "Mã xác nhận không chính xác. Vui lòng thử lại.";

            if (typeof errorData === 'string') errorMsg = errorData;
            else if (errorData?.errors) errorMsg = Object.values(errorData.errors).flat().join(", ");
            else if (errorData?.message) errorMsg = errorData.message;

            // Normalize error message to use Y/N instead of YES/NO
            errorMsg = errorMsg.replace(/YES/gi, 'Y').replace(/NO/gi, 'N');

            setLocalError(errorMsg);
        } finally {
            setIsConfirming(false);
        }
    };

    // Helpers for history mapping
    const getDetailedInfo = (d) => {
        const osId = d.orderSizeId || d.orderSizeID || d.order_size_id;
        const os = rawOrderSizes.find(s => String(s.id || s.orderSizeId) === String(osId));

        if (!os) return { color: d.colorName || d.color || "SP", size: d.sizeName || d.size || "" };

        let sz = os.sizeName || os.sizeValue;
        if (!sz && os.sizeId) sz = SIZE_ID_TO_LABEL[os.sizeId];
        if (!sz && os.size) sz = typeof os.size === 'string' ? os.size : (os.size.sizeName || os.size.sizeValue);

        return {
            color: os.colorName || os.color || "SP",
            size: sz || ""
        };
    };

    const DELIVERY_STATUS = {
        SENDING: 1,
        NOT_RECEIVED: 2,
        RECEIVED: 3
    };

    const DELIVERY_STATUS_LABELS = {
        [DELIVERY_STATUS.SENDING]: "Đang gửi hàng",
        [DELIVERY_STATUS.NOT_RECEIVED]: "Chưa nhận được hàng",
        [DELIVERY_STATUS.RECEIVED]: "Đã nhận được hàng"
    };

    const DELIVERY_STATUS_STYLES = {
        [DELIVERY_STATUS.SENDING]: "text-amber-500 bg-amber-50 border-amber-100",
        [DELIVERY_STATUS.NOT_RECEIVED]: "text-rose-500 bg-rose-50 border-rose-100",
        [DELIVERY_STATUS.RECEIVED]: "text-emerald-600 bg-emerald-50 border-emerald-100"
    };

    const getStatusLabel = (sId) => {
        return DELIVERY_STATUS_LABELS[Number(sId)] || "Giao thành công";
    };

    // Helper to check 3 days logic for auto-confirmation
    const isAutoConfirmed = (dateStr) => {
        if (!dateStr) return false;
        try {
            const deliveryDate = new Date(dateStr);
            if (isNaN(deliveryDate.getTime())) return false;
            const now = new Date();
            const diffDays = Math.floor((now - deliveryDate) / (1000 * 60 * 60 * 24));
            return diffDays >= 3;
        } catch (e) {
            return false;
        }
    };

    // Calculate totals
    const totalOrdered = variants.reduce((sum, v) => {
        return sum + sizeKeys.reduce((sSum, k) => sSum + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
    }, 0);

    const totalDelivered = deliveries.reduce((sum, d) => {
        const isActuallyReceived = Number(d.deliverStatusId) === DELIVERY_STATUS.RECEIVED || isAutoConfirmed(d.deliveredAt || d.receivedDate || d.date);
        return sum + (isActuallyReceived ? Number(d.deliverQuantity || d.quantity || 0) : 0);
    }, 0);
    const totalRemaining = Math.max(0, totalOrdered - totalDelivered);
    const overallProgress = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

    return (
        <div className="space-y-10 py-4">
            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#f0f9f4] rounded-2xl text-[#1e6e43] border border-[#d4e3da] shadow-sm">
                        <Truck size={24} />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-[#1e6e43] uppercase tracking-[0.2em]">Bảng điều khiển giao nhận</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Tiến độ trả hàng</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsDiaryOpen(true)}
                        className="flex items-center gap-2 px-5 h-9 bg-white border border-gray-200 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm transition-all hover:bg-gray-50 active:scale-95"
                    >
                        <History size={14} />
                        Xem nhật ký
                    </button>
                    {isOwner && (
                        <button
                            onClick={onAddDelivery}
                            className="flex items-center gap-2 px-5 h-9 bg-[#1e6e43] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md shadow-green-100 transition-all hover:bg-[#155232] active:scale-95"
                        >
                            <Plus size={14} />
                            Ghi nhận đợt mới
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tổng đặt hàng', value: totalOrdered, icon: BarChart2, color: 'gray' },
                    { label: 'Đã hoàn thành', value: totalDelivered, icon: CheckCircle, color: 'emerald' },
                    { label: 'Số lượng nợ', value: totalRemaining, icon: Truck, color: 'amber' },
                    { label: 'Tỷ lệ hoàn thành', value: `${overallProgress}%`, icon: Info, color: 'emerald', isProgress: true }
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-xl ${stat.color === 'emerald' ? 'bg-[#f0f9f4] text-[#1e6e43]' :
                                    stat.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                        'bg-gray-50 text-gray-400'
                                    }`}>
                                    <Icon size={18} />
                                </div>
                                {stat.isProgress && (
                                    <span className="text-[10px] font-bold text-[#1e6e43] bg-[#f0f9f4] px-3 py-1 rounded-full">{overallProgress}%</span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value.toLocaleString()}</p>
                            {stat.isProgress && (
                                <div className="mt-4 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#1e6e43] transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Unified Delivery Matrix */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Ma trận giao nhận hợp nhất</h4>
                </div>

                <div className="border border-black overflow-hidden bg-white shadow-sm">
                    {/* Grid Header */}
                    <div className="grid grid-cols-11 bg-slate-50 border-b border-black divide-x divide-black">
                        <div className="col-span-2 py-4 px-6 text-xs font-black text-black uppercase tracking-widest bg-slate-100/30">Phân loại Màu</div>
                        {sizeLabels.map(s => (
                            <div key={s} className="col-span-1 py-4 text-center text-xs font-black text-black uppercase tracking-widest flex items-center justify-center">{s}</div>
                        ))}
                        <div className="col-span-2 py-4 px-6 text-right text-xs font-black text-black uppercase tracking-widest bg-slate-100/30">Tiến độ dòng</div>
                    </div>

                    {/* Grid Body */}
                    <div className="divide-y divide-black font-sans text-[14px]">
                        {variants.map((v, idx) => {
                            const rowOrdered = sizeKeys.reduce((sum, k) => sum + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                            if (rowOrdered === 0) return null;

                            // Calculate row delivery
                            const rowDelivered = deliveries
                                .filter(d => {
                                    const dOsId = String(d.orderSizeId || d.orderSizeID || d.order_size_id || "");
                                    const isActuallyReceived = Number(d.deliverStatusId) === DELIVERY_STATUS.RECEIVED || isAutoConfirmed(d.deliveredAt || d.receivedDate || d.date);
                                    if (!isActuallyReceived) return false;

                                    if (v.idMap && dOsId) {
                                        return Object.values(v.idMap).some(id => String(id) === dOsId);
                                    }
                                    return d.color === v.color || d.colorName === v.color;
                                })
                                .reduce((sum, d) => sum + (Number(d.deliverQuantity || d.quantity || 0)), 0);

                            const rowProgress = Math.round((rowDelivered / rowOrdered) * 100);

                            return (
                                <div key={idx} className="grid grid-cols-11 items-stretch hover:bg-slate-50/50 transition-all divide-x divide-black">
                                    <div className="col-span-2 py-5 px-6 flex items-center bg-slate-50/10">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="text-[14px] font-black text-slate-800 uppercase truncate">{v.color}</span>
                                        </div>
                                    </div>
                                    {sizeKeys.map(k => {
                                        const ordered = Number(v[k] || v[k.toUpperCase()] || 0);
                                        const osId = v.idMap ? v.idMap[k] : null;

                                        const delivered = deliveries
                                            .filter(d => {
                                                const dOsId = d.orderSizeId || d.orderSizeID || d.order_size_id;
                                                const isActuallyReceived = Number(d.deliverStatusId) === DELIVERY_STATUS.RECEIVED || isAutoConfirmed(d.deliveredAt || d.receivedDate || d.date);
                                                if (!isActuallyReceived) return false;

                                                if (osId && dOsId) {
                                                    return String(osId) === String(dOsId);
                                                }
                                                const matchesLegacy = d.color === v.color && (d.size?.toLowerCase() === k || d.sizeName?.toLowerCase() === k);
                                                return matchesLegacy;
                                            })
                                            .reduce((sum, d) => sum + (Number(d.deliverQuantity || d.quantity || 0)), 0);

                                        const cellProgress = ordered > 0 ? (delivered / ordered) * 100 : 0;

                                        return (
                                            <div key={k} className="col-span-1 py-5 flex items-center justify-center">
                                                {ordered > 0 ? (
                                                    <div className="flex flex-col items-center gap-1 w-full px-1">
                                                        <div className="flex items-baseline gap-1 justify-center">
                                                            <span className={`text-[15px] font-black ${delivered === ordered ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                {delivered}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-slate-300">/</span>
                                                            <span className="text-[12px] font-bold text-slate-400">{ordered}</span>
                                                        </div>
                                                        <div className="w-full max-w-[40px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${delivered === ordered ? 'bg-emerald-500' : 'bg-amber-400'} transition-all`}
                                                                style={{ width: `${cellProgress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200 font-bold text-[14px]">-</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="col-span-2 py-5 px-6 flex flex-col items-end justify-center bg-slate-50/10 space-y-1.5">
                                        <span className={`text-lg font-black ${rowProgress === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                            {rowProgress}%
                                        </span>
                                        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${rowProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="px-8 py-5 bg-[#F8FAF9]/50 border-t border-gray-50 flex items-center justify-between">
                <p className="text-[10px] font-medium text-gray-400 italic">
                    * Dữ liệu được hợp nhất từ {deliveries.length} đợt giao hàng thực tế.
                </p>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#1e6e43]" />
                        <span className="text-[10px] font-bold uppercase text-gray-600 tracking-widest">Hoàn tất</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400/70" />
                        <span className="text-[10px] font-bold uppercase text-gray-600 tracking-widest">Đang giao</span>
                    </div>
                </div>
            </div>

            {/* Diary Modal */}
            {isDiaryOpen && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#fcfdfc] w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#f0f9f4] rounded-2xl text-[#1e6e43]">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-black text-gray-900 uppercase tracking-tight">Nhật ký trả hàng chi tiết</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Lịch sử giao nhận & trạng thái xác nhận</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDiaryOpen(false)}
                                className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                            >
                                <Plus size={18} className="rotate-45" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/20">
                            <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[35px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200/60">
                                {deliveries
                                    .slice()
                                    .sort((a, b) => new Date(b.deliveredAt || b.receivedDate || b.date || 0) - new Date(a.deliveredAt || a.receivedDate || a.date || 0))
                                    .map((d, i) => {
                                    const { color, size } = getDetailedInfo(d);
                                    const dateStr = d.deliveredAt || d.receivedDate || d.date || "";
                                    const autoConfirmed = isAutoConfirmed(dateStr);
                                    const statusId = Number(d.deliverStatusId);
                                    const confirmed = statusId === DELIVERY_STATUS.RECEIVED || autoConfirmed;

                                    const qtyDisp = d.deliverQuantity || d.quantity || 0;
                                    const statusLabel = getStatusLabel(statusId);

                                    return (
                                        <div key={i} className="relative group">
                                            <div className={`absolute -left-[40px] top-4 w-5 h-5 rounded-full border-4 border-[#fff] shadow-sm z-10 transition-colors ${statusId === DELIVERY_STATUS.RECEIVED ? 'bg-emerald-500' : statusId === DELIVERY_STATUS.NOT_RECEIVED ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-[#d4e3da] hover:shadow-md transition-all">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-center gap-4">
                                                            <div className="px-3 py-1 bg-[#f0f9f4] rounded-lg border border-[#d4e3da]/30">
                                                                <span className="text-[10px] font-black text-[#1e6e43] uppercase">{color} {size && `— ${size}`}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                <span>{dateStr.replace('T', ' ').slice(0, 16)}</span>
                                                                <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                                <span className="text-gray-900 font-black">+{qtyDisp} SP</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${DELIVERY_STATUS_STYLES[statusId] || 'text-slate-400 bg-slate-50 border-slate-100'}`}>
                                                                {statusLabel}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {confirmed ? (
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${autoConfirmed && statusId !== DELIVERY_STATUS.RECEIVED ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-[#e7f5ed] text-[#1e6e43] border-[#d4e3da]'}`}>
                                                                <CheckCircle size={12} />
                                                                {autoConfirmed && statusId !== DELIVERY_STATUS.RECEIVED ? 'Đã nhận (Tự động)' : 'Đã nhận hàng'}
                                                            </div>
                                                        ) : (
                                                            isCustomer && statusId !== DELIVERY_STATUS.NOT_RECEIVED && (
                                                                <button
                                                                    onClick={() => {
                                                                        setTargetDelivery(d);
                                                                        setIsConfirmModalOpen(true);
                                                                    }}
                                                                    className="px-5 h-8 bg-[#1e6e43] text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-green-100 hover:bg-[#155232] active:scale-95 transition-all"
                                                                >
                                                                    Xác nhận ngay
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {deliveries.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-4">
                                        <Truck size={40} className="opacity-20" />
                                        <p className="text-[11px] font-bold uppercase tracking-widest italic">Chưa có lịch sử giao nhận cho đơn hàng này</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-5 bg-white border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setIsDiaryOpen(false)}
                                className="px-8 h-10 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                            >
                                Đóng nhật ký
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Action Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-[#f0f9f4] rounded-2xl flex items-center justify-center text-[#1e6e43]">
                                <AlertCircle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-black text-slate-900 uppercase">Xác nhận giao hàng</h4>
                                <p className="text-xs font-medium text-slate-500">
                                    Vui lòng nhập <span className="text-[#1e6e43] font-bold">Y</span> nếu đúng hoặc <span className="text-rose-500 font-bold">N</span> nếu có sai sót
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Y / N"
                                maxLength={1}
                                value={confirmationInput}
                                onChange={(e) => {
                                    setConfirmationInput(e.target.value);
                                    setLocalError("");
                                }}
                                className={`w-full h-14 border-2 rounded-2xl px-6 text-center text-lg font-black uppercase tracking-[0.2em] outline-none transition-all placeholder:text-slate-200 ${localError ? 'border-rose-300 bg-rose-50' : 'bg-slate-50 border-slate-100 focus:border-[#1e6e43] focus:bg-white'}`}
                                autoFocus
                            />

                            {localError && (
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1 px-4">
                                    {localError}
                                </p>
                            )}

                            <button
                                onClick={handleConfirmAction}
                                disabled={isConfirming || !confirmationInput.trim()}
                                className="w-full h-14 bg-[#1e6e43] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-green-100 hover:bg-[#155232] transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isConfirming ? "Đang xử lý..." : "Xác nhận chốt đợt này"}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setIsConfirmModalOpen(false);
                                setTargetDelivery(null);
                                setConfirmationInput("");
                            }}
                            className="w-full py-2 text-[10px] font-black uppercase text-slate-300 hover:text-slate-500 transition-colors"
                        >
                            Để sau / Hủy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value, isBold = false, isGreen = false }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
            <span className={`text-[15px] ${isBold ? 'font-bold text-gray-900' : 'font-bold text-gray-800'} ${isGreen ? 'text-[#1e6e43]' : ''}`}>
                {value || '-'}
            </span>
        </div>
    );
}
