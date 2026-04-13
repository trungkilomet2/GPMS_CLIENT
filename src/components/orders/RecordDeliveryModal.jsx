import React, { useState, useEffect } from 'react';
import { X, Calendar, Edit3, Truck, CheckCircle, Loader2, Info } from 'lucide-react';
import ProductionPartService from '@/services/ProductionPartService';
import { toast } from 'react-toastify';

export default function RecordDeliveryModal({ isOpen, onClose, orderId, variants = [], deliveries = [], onRefresh }) {
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && variants && variants.length > 0) {
            const SIZE_ID_TO_LABEL = { 1: 'XS', 2: 'S', 3: 'M', 4: 'L', 5: 'XL', 6: '2XL', 7: '3XL' };

            const activeItems = variants.map(v => {
                const ordered = Number(v.quantity || v.amount || v.qty || 0);
                const itemSizeId = v.id || v.orderSizeId || v.orderSizeID || v.order_size_id;
                
                // Get size display name
                let sizeDisp = v.sizeName || v.sizeValue || v.sizeValueName;
                if (!sizeDisp && v.size) {
                    sizeDisp = typeof v.size === 'string' ? v.size : (v.size.sizeName || v.size.sizeValue);
                }
                if (!sizeDisp && v.sizeId) {
                    sizeDisp = SIZE_ID_TO_LABEL[v.sizeId];
                }
                if (!sizeDisp && v.orderSize && v.orderSize.size) {
                     sizeDisp = v.orderSize.size.sizeName || v.orderSize.size.sizeValue;
                }
                
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

                // Calculate already delivered for this specific orderSizeId
                const delivered = (deliveries || [])
                    .filter(d => {
                        const dId = d.orderSizeId || d.orderSizeID || d.order_size_id;
                        const statusId = Number(d.deliverStatusId);
                        const dateStr = d.deliveredAt || d.receivedDate || d.date;
                        const autoConfirmed = isAutoConfirmed(dateStr);
                        
                        // Strict filter: only count if actually received (3) or auto-confirmed
                        return String(dId) === String(itemSizeId) && (statusId === 3 || autoConfirmed);
                    })
                    .reduce((sum, d) => sum + (Number(d.deliverQuantity || d.quantity || 0)), 0);
                
                const remaining = Math.max(0, ordered - delivered);
                
                return {
                    id: itemSizeId,
                    color: v.colorName || v.color || v.colorCode || 'Mặc định',
                    colorCode: v.colorCode || '#cbd5e1',
                    size: sizeDisp || '-',
                    totalOrdered: ordered,
                    alreadyDelivered: delivered,
                    remaining: remaining,
                    quantity: 0 // User input for this batch
                };
            }).filter(item => item.totalOrdered > 0 && item.id);

            setItems(activeItems);
        }
    }, [isOpen, variants, deliveries]);

    if (!isOpen) return null;

    const handleQtyChange = (index, value) => {
        const val = Number(value);
        if (isNaN(val)) return;
        const newQty = Math.max(0, Math.min(items[index].remaining, val));
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
                                        <th className="px-6 py-4 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Giao đợt này</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {items.length > 0 ? items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.colorCode || '#cbd5e1' }} />
                                                    <span className="text-xs font-black text-slate-800 uppercase">{item.color}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-black">
                                                    {item.size}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-gray-500">{item.alreadyDelivered}</td>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-700">{item.totalOrdered}</td>
                                            <td className="px-6 py-4 text-center text-xs font-black text-slate-900">{item.remaining}</td>
                                            <td className="px-6 py-4 text-right">
                                                <input 
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    placeholder="0"
                                                    onChange={(e) => handleQtyChange(idx, e.target.value)}
                                                    className="w-20 h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-right text-sm font-black text-[#1e6e43] focus:outline-none focus:ring-2 focus:ring-[#1e6e43]/20"
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
