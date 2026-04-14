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
    const [items, setItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingProduction, setLoadingProduction] = useState(false);
    const [productionMetrics, setProductionMetrics] = useState({}); // key: orderSizeId, value: { finishedQty: 0 }
    const [localProdId, setLocalProdId] = useState(productionId);

    // Sync prop productionId to local state
    useEffect(() => {
        if (productionId) setLocalProdId(productionId);
    }, [productionId]);

    // Fallback: If productionId not provided, try to find it via OrderId
    useEffect(() => {
        const findProduction = async () => {
            if (!isOpen || localProdId || !orderId) return;
            try {
                const response = await ProductionService.getProductionList({ PageIndex: 0, PageSize: 100 });
                const list = response?.data?.data ?? response?.data ?? [];
                const found = list.find(item => {
                    const oid = item?.order?.id ?? item?.orderId ?? item?.orderID ?? item?.order_id;
                    return String(oid) === String(orderId);
                });
                if (found) setLocalProdId(found.productionId ?? found.id);
            } catch (err) {
                console.warn("Could not auto-resolve productionId for modal:", err);
            }
        };
        findProduction();
    }, [isOpen, orderId, localProdId]);

    useEffect(() => {
        const fetchProductionInfo = async () => {
            if (!isOpen || !localProdId) return;
            try {
                setLoadingProduction(true);
                const [partsRes, logsRes] = await Promise.allSettled([
                    ProductionPartService.getPartsByProduction(localProdId),
                    ProductionPartService.getProductionWorkLogs(localProdId)
                ]);

                const parts = partsRes.status === 'fulfilled' ? (partsRes.value?.data?.data || partsRes.value?.data || []) : [];
                const logs = logsRes.status === 'fulfilled' ? (logsRes.value?.data?.data || logsRes.value?.data || []) : [];

                console.log("RAW API DATA FETCHED:", {
                    productionId: localProdId,
                    rawPartsResult: partsRes,
                    rawLogsResult: logsRes,
                    partsCount: parts.length,
                    logsCount: logs.length
                });

                // 1. Calculate Bottleneck-aware Finished Quantity for each variant
                const metrics = {};

                variants.forEach(v => {
                    const osId = String(v.id || v.orderSizeId || "");
                    const vColor = String(v.colorName || v.color || v.productColorName || v.color_name || "-").toLowerCase().trim();
                    const vSize = String(v.sizeName || v.size || v.productSizeName || v.size_name || "-").toLowerCase().trim();

                    if (!osId || vColor === "-" || vSize === "-") return;

                    // A. Find all relevant stages for this specific Color/Size combination
                    const relevantStages = [];
                    parts.forEach(p => {
                        const variantLinks = p.listPartOrderSizes || p.partOrderSizes || [];
                        const match = variantLinks.find(link => {
                            const lColor = String(link.colorName || link.color || link.productColorName || "").toLowerCase().trim();
                            const lSize = String(link.sizeName || link.size || link.productSizeName || "").toLowerCase().trim();
                            return lColor === vColor && lSize === vSize;
                        });

                        if (match) {
                            relevantStages.push({
                                partId: String(p.id || p.partId),
                                partName: p.partName || p.name,
                                linkId: String(match.id || match.partOrderSizeId)
                            });
                        }
                    });

                    // B. Sum approved logs for EACH found stage
                    const stageReports = relevantStages.map(stage => {
                        const approvedSum = logs
                            .filter(l => {
                                const logPartId = String(l.productionPartId || l.partId || l.productPartId || "");
                                const logLinkId = String(l.partOrderSizeId || l.productionPartOrderSizeId || "");

                                const isApproved =
                                    l.isReadOnly === true ||
                                    l.isReadOnly === 1 ||
                                    [2, 4].includes(Number(l.status)) ||
                                    ["đã nghiệm thu", "đã hoàn thành", "hoàn thành"].includes(String(l.statusName || "").toLowerCase());

                                return logPartId === stage.partId && logLinkId === stage.linkId && isApproved;
                            })
                            .reduce((sum, l) => sum + (Number(l.confirmedQuantity || l.quantity || 0)), 0);

                        return { stageName: stage.partName, count: approvedSum };
                    });

                    // C. Final Finished Qty
                    // If no stages found at all, it's 0. Otherwise, it's the bottleneck.
                    const finishedQty = relevantStages.length > 0 ? Math.min(...stageReports.map(r => r.count)) : 0;

                    metrics[osId] = {
                        finishedQty,
                        color: vColor,
                        size: vSize,
                        details: stageReports
                    };
                });

                setProductionMetrics(metrics);
                console.log("DIAGNOSTIC BOTTLENECK REPORT:", {
                    productionId: localProdId,
                    metrics
                });
            } catch (err) {
                console.error("Error fetching production info for delivery:", err);
            } finally {
                setLoadingProduction(false);
            }
        };

        fetchProductionInfo();
    }, [isOpen, productionId]);

    useEffect(() => {
        if (isOpen && variants && variants.length > 0) {
            const SIZE_ID_TO_LABEL = { 1: 'XS', 2: 'S', 3: 'M', 4: 'L', 5: 'XL', 6: '2XL', 7: '3XL' };

            const activeItems = variants.map(v => {
                const ordered = Number(v.quantity || v.amount || v.qty || 0);
                const itemSizeId = String(v.id || v.orderSizeId || v.orderSizeID || v.order_size_id);

                // ... same logic for size dispensing ...
                let sizeDisp = v.sizeName || v.sizeValue || v.sizeValueName;
                // ... (preserving original logic)
                if (!sizeDisp && v.size) {
                    sizeDisp = typeof v.size === 'string' ? v.size : (v.size.sizeName || v.size.sizeValue);
                }
                if (!sizeDisp && v.sizeId) {
                    sizeDisp = SIZE_ID_TO_LABEL[v.sizeId];
                }
                if (!sizeDisp && v.orderSize && v.orderSize.size) {
                    sizeDisp = v.orderSize.size.sizeName || v.orderSize.size.sizeValue;
                }

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

                const delivered = (deliveries || [])
                    .filter(d => {
                        const dId = d.orderSizeId || d.orderSizeID || d.order_size_id;
                        const statusId = Number(d.deliverStatusId);
                        const dateStr = d.deliveredAt || d.receivedDate || d.date;
                        const autoConfirmed = isAutoConfirmed(dateStr);
                        return String(dId) === String(itemSizeId) && (statusId === 3 || autoConfirmed);
                    })
                    .reduce((sum, d) => sum + (Number(d.deliverQuantity || d.quantity || 0)), 0);

                const remaining = Math.max(0, ordered - delivered);
                const finished = productionMetrics[itemSizeId]?.finishedQty || 0;

                return {
                    id: itemSizeId,
                    color: v.colorName || v.color || v.colorCode || 'Mặc định',
                    colorCode: v.colorCode || v.color || '#cbd5e1',
                    size: sizeDisp || '-',
                    totalOrdered: ordered,
                    alreadyDelivered: delivered,
                    remaining: remaining,
                    finishedQty: finished,
                    quantity: 0
                };
            }).filter(item => item.totalOrdered > 0 && item.id);

            setItems(activeItems);
        }
    }, [isOpen, variants, deliveries, productionMetrics]);

    if (!isOpen) return null;

    const handleQtyChange = (index, value) => {
        const val = Number(value);
        if (isNaN(val)) return;

        const item = items[index];
        // The max allowed is the minimum of (remaining in order) and (available in warehouse output)
        // If no production exists, we only cap by order remaining
        let maxAllowed = item.remaining;

        // Use localProdId or check if we have any metrics to enforce limit
        const hasMetrics = Object.keys(productionMetrics).length > 0;
        if (localProdId || hasMetrics) {
            maxAllowed = Math.min(item.remaining, item.finishedQty || 0);
        }

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
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-xs font-black ${(item.finishedQty > 0 || localProdId) ? 'text-rose-600' : 'text-slate-300'}`}>
                                                        {loadingProduction ? '...' : (localProdId || Object.keys(productionMetrics).length > 0 ? item.finishedQty : '-')}
                                                    </span>
                                                    {localProdId && item.finishedQty === 0 && !loadingProduction && (
                                                        <span className="text-[8px] text-slate-400 font-medium italic uppercase">Chưa nghiệm thu</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <input
                                                    type="number"
                                                    value={item.quantity || ''}
                                                    placeholder="0"
                                                    max={productionId ? Math.min(item.remaining, item.finishedQty) : item.remaining}
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
