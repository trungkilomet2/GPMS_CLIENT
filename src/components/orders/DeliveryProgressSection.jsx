import React from 'react';
import { Truck, CheckCircle, Clock, Plus, BarChart2, Info, History } from 'lucide-react';

export default function DeliveryProgressSection({ 
    variants = [], 
    deliveries = [], 
    onAddDelivery, 
    isOwner = false, 
    isCustomer = false, 
    onConfirmDelivery 
}) {
    const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
    const sizeLabels = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

    const [isDiaryOpen, setIsDiaryOpen] = React.useState(false);

    // Helper to check 3 days logic for auto-confirmation
    const isAutoConfirmed = (dateStr) => {
        try {
            const [d, m, y] = dateStr.split('/').map(Number);
            const deliveryDate = new Date(y, m - 1, d);
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

    const totalDelivered = deliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
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

            {/* Stats Cards - Sleeker Design */}
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

            {/* Compact Matrix View */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-[#1e6e43] rounded-full" />
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-600">Ma trận giao nhận hợp nhất</h4>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-[#F8FAF9]">
                                <th className="px-8 py-5 text-left text-[9px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-100">Phân loại Màu</th>
                                {sizeLabels.map(s => (
                                    <th key={s} className="px-4 py-5 text-center text-[9px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-100">{s}</th>
                                ))}
                                <th className="px-8 py-5 text-right text-[9px] font-bold text-gray-600 uppercase tracking-widest border-b border-gray-100">Tiến độ dòng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {variants.map((v, idx) => {
                                const rowOrdered = sizeKeys.reduce((sum, k) => sum + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                                if (rowOrdered === 0) return null;

                                const rowDelivered = deliveries
                                    .filter(d => d.color === v.color)
                                    .reduce((sum, d) => sum + (d.quantity || 0), 0);

                                const rowProgress = Math.round((rowDelivered / rowOrdered) * 100);

                                return (
                                    <tr key={idx} className="group hover:bg-gray-50/50 transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: v.colorCode || '#cbd5e1' }} />
                                                <span className="text-xs font-bold text-gray-700 uppercase">{v.color}</span>
                                            </div>
                                        </td>
                                        {sizeKeys.map(k => {
                                            const ordered = Number(v[k] || v[k.toUpperCase()] || 0);
                                            const delivered = deliveries
                                                .filter(d => d.color === v.color && d.size?.toLowerCase() === k)
                                                .reduce((sum, d) => sum + (d.quantity || 0), 0);

                                            const cellProgress = ordered > 0 ? (delivered / ordered) * 100 : 0;

                                            return (
                                                <td key={k} className="px-4 py-6 text-center">
                                                    {ordered > 0 ? (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <div className="flex items-baseline gap-1">
                                                                <span className={`text-[12px] font-bold ${delivered === ordered ? 'text-[#1e6e43]' : 'text-gray-900'}`}>
                                                                    {delivered}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-400">/</span>
                                                                <span className="text-[10px] font-bold text-gray-500">{ordered}</span>
                                                            </div>
                                                            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${delivered === ordered ? 'bg-[#2d9058]' : 'bg-amber-400/70'} transition-all`}
                                                                    style={{ width: `${cellProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-100 font-bold">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-8 py-6 text-right">
                                            <div className="inline-flex flex-col items-end gap-1.5">
                                                <span className={`text-[12px] font-bold ${rowProgress === 100 ? 'text-[#1e6e43]' : 'text-gray-600'}`}>
                                                    {rowProgress}%
                                                </span>
                                                <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[#1e6e43]" style={{ width: `${rowProgress}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Info */}
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
            </div>

            {/* Diary Modal */}
            {isDiaryOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
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

                        {/* Modal Body - Timeline */}
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/20">
                            <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[35px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200/60">
                                {deliveries.slice().reverse().map((d, i) => {
                                    const originalIdx = deliveries.length - 1 - i;
                                    const autoConfirmed = isAutoConfirmed(d.date);
                                    const confirmed = d.isConfirmed || autoConfirmed;

                                    return (
                                        <div key={i} className="relative group">
                                            <div className={`absolute -left-[40px] top-4 w-5 h-5 rounded-full border-4 border-[#fff] shadow-sm z-10 transition-colors ${
                                                confirmed ? 'bg-[#1e6e43]' : 'bg-amber-400'
                                            }`} />

                                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-[#d4e3da] hover:shadow-md transition-all">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div className="space-y-4 flex-1">
                                                        <div className="flex items-center gap-4">
                                                            <div className="px-3 py-1 bg-[#f0f9f4] rounded-lg border border-[#d4e3da]/30">
                                                                <span className="text-[10px] font-black text-[#1e6e43] uppercase">{d.color} — {d.size?.toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                 <span>{d.date}</span>
                                                                 <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                                 <span className="text-gray-900 font-black">+{d.quantity} SP</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-[11px] text-gray-600 font-medium leading-relaxed italic">
                                                             "{d.note || 'Không có ghi chú nào cho đợt giao này.'}"
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2">
                                                        {confirmed ? (
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                                autoConfirmed && !d.isConfirmed ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-[#e7f5ed] text-[#1e6e43] border-[#d4e3da]'
                                                            }`}>
                                                                <CheckCircle size={12} />
                                                                {autoConfirmed && !d.isConfirmed ? 'Đã nhận (Tự động)' : 'Đã xác nhận'}
                                                            </div>
                                                        ) : (
                                                            isCustomer && (
                                                                <button 
                                                                    onClick={() => onConfirmDelivery(originalIdx)}
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

                        {/* Modal Footer */}
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
