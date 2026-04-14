import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Truck, CheckCircle, Loader2, Info } from 'lucide-react';
import ProductionPartService from '@/services/ProductionPartService';
import { toast } from 'react-toastify';

export default function RecordDeliveryModal({
    isOpen,
    onClose,
    orderId,
    productionId,
    variants = [],
    deliveries = [],
    onRefresh
}) {
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [planningData, setPlanningData] = useState([]);
    const [items, setItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingProduction, setLoadingProduction] = useState(false);

    // 1. Fetch Planning Data (Total Ordered & Finished Qty) once or when order changes
    useEffect(() => {
        const fetchPlanning = async () => {
            if (!isOpen || !orderId) return;
            try {
                setLoadingProduction(true);
                const response = await ProductionPartService.getDeliveryPlanning(orderId);
                const data = response?.data?.data || response?.data || [];
                setPlanningData(data);
            } catch (err) {
                console.error("Error fetching delivery planning:", err);
            } finally {
                setLoadingProduction(false);
            }
        };
        fetchPlanning();
    }, [isOpen, orderId]);

    // 2. Compute View Items whenever planningData OR deliveries prop changes
    useEffect(() => {
        if (!planningData.length) return;

        const isAutoConfirmed = (dateStr) => {
            if (!dateStr) return false;
            try {
                const dDate = new Date(dateStr);
                if (isNaN(dDate.getTime())) return false;
                const now = new Date();
                const diffDays = Math.floor((now - dDate) / (1000 * 60 * 60 * 24));
                return diffDays >= 3;
            } catch (e) { return false; }
        };

        const mapped = planningData.map(item => {
            const osId = String(item.orderSizeId);
            const confirmedQuantity = (deliveries || [])
                .filter(d => {
                    const dId = String(d.orderSizeId || d.orderSizeID || d.order_size_id);
                    const statusId = Number(d.deliverStatusId);
                    const dateStr = d.deliveredAt || d.receivedDate || d.date;
                    const isConfirmed = statusId === 3 || isAutoConfirmed(dateStr);
                    return dId === osId && isConfirmed;
                })
                .reduce((sum, d) => sum + (Number(d.deliverQuantity || d.quantity || 0)), 0);

            const totalOrdered = item.totalOrderedQuantity || 0;
            const remaining = Math.max(0, totalOrdered - confirmedQuantity);
            const finished = item.completedQuantity || 0;

            return {
                id: osId,
                color: item.color || "Mặc định",
                size: item.sizeName || "-",
                totalOrdered,
                alreadyDelivered: confirmedQuantity,
                remaining,
                finishedQty: finished,
                maxDeliverable: Math.min(remaining, finished),
                quantity: items.find(i => i.id === osId)?.quantity || 0
            };
        });

        setItems(mapped);
    }, [planningData, deliveries]);

    if (!isOpen) return null;

    const handleQtyChange = (index, value) => {
        const val = Number(value);
        if (isNaN(val)) return;

        const item = items[index];
        // The max allowed is provided by the planning API (min of remaining and finished)
        const maxAllowed = item.maxDeliverable || 0;

        const newQty = Math.max(0, Math.min(maxAllowed, val));
        const newItems = [...items];
        newItems[index].quantity = newQty;
        setItems(newItems);
    };

    const totalThisBatch = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const handleSubmit = async () => {
        const deliveryDetails = items
            .filter(item => item.quantity > 0)
            .map(item => ({
                orderSizeId: item.id,
                deliverQuantity: item.quantity,
                deliverStatusId: 1 // Default status for new delivery
            }));

        if (deliveryDetails.length === 0) {
            toast.warn('Vui lòng nhập số lượng giao ít nhất cho một sản phẩm.');
            return;
        }

        const payload = {
            deliveries: deliveryDetails
        };

        try {
            setIsSubmitting(true);
            await ProductionPartService.recordDelivery(orderId, payload);
            toast.success('Đã ghi nhận đợt giao hàng thành công!');
            if (onRefresh) onRefresh();
            onClose();
        } catch (err) {
            console.error('Delivery Error:', err);
            toast.error(err.response?.data?.message || 'Không thể ghi nhận giao hàng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#f0f9f4] flex items-center justify-center text-[#1e6e43] shadow-sm">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Ghi nhận giao hàng chi tiết</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Nhập số lượng giao cho từng Màu & Size</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Date Picker */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={12} className="text-[#1e6e43]" /> Ngày giao
                            </label>
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full h-12 px-6 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e6e43]/20 focus:border-[#1e6e43] transition-all"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Edit3 size={12} className="text-[#1e6e43]" /> Chi tiết số lượng (Màu & Size)
                        </label>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/30 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Màu sắc</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Size</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Đã giao</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Tổng đặt</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Còn lại</th>
                                        <th className="px-6 py-4 text-center text-[9px] font-black text-rose-500 uppercase tracking-widest">Số lượng hoàn thành</th>
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Giao đợt này</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {items.length > 0 ? items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-b-0">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.color}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600">
                                                    {item.size}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center text-xs font-bold text-slate-400">{item.alreadyDelivered}</td>
                                            <td className="px-6 py-5 text-center text-xs font-bold text-slate-400">{item.totalOrdered}</td>
                                            <td className="px-6 py-5 text-center text-xs font-black text-slate-900">{item.remaining}</td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-xs font-black ${item.finishedQty > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                        {loadingProduction ? '...' : item.finishedQty}
                                                    </span>
                                                    {!loadingProduction && item.finishedQty === 0 && (
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Chưa nghiệm thu</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <input
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    placeholder="0"
                                                    min="0"
                                                    max={item.maxDeliverable}
                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                    className="w-20 h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-right text-sm font-black text-[#1e6e43] outline-none focus:ring-2 focus:ring-[#1e6e43]/20 focus:border-[#1e6e43] transition-all"
                                                />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                                    <Info size={40} className="opacity-20" />
                                                    <p className="text-sm font-bold uppercase tracking-widest italic">
                                                        Không tìm thấy dữ liệu biến thể sản phẩm để giao hàng.
                                                    </p>
                                                    <p className="text-[10px] font-medium max-w-xs">
                                                        Vui lòng kiểm tra lại cấu trúc đơn hàng hoặc liên hệ quản trị viên.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Tổng cộng đợt này</p>
                        <p className="text-2xl font-black text-[#1e6e43]">
                            {totalThisBatch.toLocaleString()} <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sản phẩm</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-slate-900 transition-colors">
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`flex items-center gap-3 px-10 py-4 bg-[#1e6e43] text-white rounded-xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-green-100/50 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#155232] hover:-translate-y-0.5'}`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            {isSubmitting ? 'Đang gửi...' : 'Xác nhận giao hàng'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
