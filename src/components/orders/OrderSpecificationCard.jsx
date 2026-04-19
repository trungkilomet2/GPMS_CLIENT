import React from 'react';
import { Package, FileText } from 'lucide-react';
import { formatOrderDate } from '@/lib/orders/formatters';
import { processOrderVariants } from '@/lib/orders/variants';

/**
 * Thẻ hiển thị thông tin chi tiết kỹ thuật của đơn hàng.
 * Bao gồm: Ảnh, các thông số cơ bản (ID, Tên, Ngày, Số lượng) và bảng Ma trận Phân bổ.
 */
export default function OrderSpecificationCard({ order, onImageClick }) {
    if (!order) return null;

    const processedVariants = processOrderVariants(order);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-xl border border-black bg-white overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-8 py-5 border-b border-black flex items-center gap-3 bg-slate-50/50">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Thông tin tổng quát đơn hàng</h2>
                </div>

                <div className="p-8 space-y-8">
                    {/* Image Section */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ảnh đơn hàng</p>
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-[160px] h-[160px] shrink-0 rounded-2xl border border-black bg-white p-2 shadow-sm overflow-hidden">
                                {order.image ? (
                                    <img
                                        src={order.image}
                                        alt=""
                                        className="w-full h-full object-contain cursor-pointer"
                                        onClick={() => onImageClick?.(order.image)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                        <Package size={40} />
                                    </div>
                                )}
                            </div>
                            <p className="text-[13px] text-gray-500 max-w-md leading-relaxed">
                                Ảnh tham khảo tổng quan đơn hàng, dùng để kiểm tra nhanh trước khi sản xuất.
                            </p>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 pt-4 relative">
                        {/* Left Column */}
                        <div className="flex flex-col">
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã đơn hàng</span>
                                <span className="text-[13px] font-black text-slate-600">ORD-{order.id}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tên đơn hàng</span>
                                <span className="text-[14px] font-black text-slate-800 uppercase">{order.orderName}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ngày bắt đầu</span>
                                <span className="text-[13px] font-bold text-slate-600">{formatOrderDate(order.startDate)}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 md:border-b-0 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ngày kết thúc</span>
                                <span className="text-[13px] font-bold text-slate-600">{formatOrderDate(order.endDate)}</span>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="flex flex-col relative">
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Số lượng</span>
                                <span className="text-[13px] font-black text-slate-700">{order.quantity?.toLocaleString()} SP</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Đơn giá</span>
                                <span className="text-[13px] font-black text-slate-700">{order.cpu?.toLocaleString()} VND</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-b border-black">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tổng giá trị</span>
                                <span className="text-[15px] font-black text-emerald-600">{(order.quantity * (order.cpu || 0)).toLocaleString()} VND</span>
                            </div>
                            <div className="flex justify-between items-center py-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thời hạn</span>
                                <span className="text-[13px] font-bold text-[#1e6e43]">
                                    {(() => {
                                        const s = new Date(order.startDate);
                                        const e = new Date(order.endDate);
                                        const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
                                        return isNaN(diff) ? '-' : `${diff} ngày`;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Distribution Grid Area */}
                    <div className="pt-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Phân bổ Màu & Size</h4>
                        </div>

                        <div className="border border-black overflow-hidden bg-white shadow-sm">
                            {/* Matrix Header */}
                            <div className="grid grid-cols-11 bg-slate-50 border-b border-black divide-x divide-black">
                                <div className="col-span-2 py-4 px-6 text-[10px] font-black text-black uppercase tracking-widest bg-slate-100/30">Phối màu</div>
                                {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => (
                                    <div key={s} className="col-span-1 py-4 text-center text-[10px] font-black text-black uppercase tracking-widest flex items-center justify-center">{s}</div>
                                ))}
                                <div className="col-span-2 py-4 px-6 text-right text-[10px] font-black text-black uppercase tracking-widest bg-slate-100/30">Tổng cộng</div>
                            </div>

                            {/* Matrix Body */}
                            <div className="divide-y divide-black font-mono">
                                {processedVariants.length > 0 ? (
                                    processedVariants.map((v, idx) => {
                                        const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
                                        const rowTotal = sizeKeys.reduce((acc, k) => acc + (v[k] || 0), 0);
                                        return (
                                            <div key={idx} className="grid grid-cols-11 items-stretch hover:bg-slate-50/50 transition-all divide-x divide-black">
                                                <div className="col-span-2 py-4 px-6 flex items-center bg-slate-50/10">
                                                    <span className="text-[12px] font-black text-black uppercase tracking-tight truncate">{v.color}</span>
                                                </div>
                                                {sizeKeys.map(k => (
                                                    <div key={k} className="col-span-1 py-4 text-center flex items-center justify-center">
                                                        <span className={`text-[13px] font-black ${v[k] > 0 ? 'text-[#1e6e43]' : 'text-slate-300'}`}>
                                                            {v[k] > 0 ? v[k] : '-'}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="col-span-2 py-4 px-6 text-right flex items-center justify-end bg-slate-50/10">
                                                    <span className="text-[14px] font-black text-black">{rowTotal.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50/30">
                                        <div className="w-16 h-16 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm mb-4">
                                            <Package className="text-slate-200" size={32} />
                                        </div>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chưa có dữ liệu phân bổ</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Note Section */}
                    {order.note && (
                        <div className="pt-6 border-t border-black space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ghi chú vận hành</p>
                            <p className="text-[14px] text-gray-600 italic">
                                "{order.note}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
