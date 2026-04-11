import React from 'react';
import { Truck, CheckCircle, Clock, Plus, BarChart2, Info, History } from 'lucide-react';

export default function DeliveryProgressSection({ variants = [], deliveries = [], onAddDelivery }) {
    const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
    const sizeLabels = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

    // Calculate totals
    const totalOrdered = variants.reduce((sum, v) => {
        return sum + sizeKeys.reduce((sSum, k) => sSum + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
    }, 0);

    const totalDelivered = deliveries.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const totalRemaining = Math.max(0, totalOrdered - totalDelivered);
    const overallProgress = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

    return (
        <div className="space-y-10 py-6">
            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-[1.25rem] text-white shadow-xl shadow-emerald-100">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1 italic">Bảng điều khiển giao nhận</h2>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Tiến độ trả hàng</h3>
                    </div>
                </div>
                <button 
                    onClick={onAddDelivery}
                    className="group flex items-center gap-3 px-8 py-3.5 bg-slate-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all hover:bg-emerald-600 hover:-translate-y-1 active:translate-y-0 active:scale-95"
                >
                    <Plus size={18} strokeWidth={3} className="text-emerald-500 group-hover:text-white transition-colors" />
                    Ghi nhận đợt mới
                </button>
            </div>

            {/* Stats Cards - Sleeker Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Tổng đặt hàng', value: totalOrdered, icon: BarChart2, color: 'slate' },
                    { label: 'Đã hoàn thành', value: totalDelivered, icon: CheckCircle, color: 'emerald' },
                    { label: 'Số lượng nợ', value: totalRemaining, icon: Truck, color: 'amber' },
                    { label: 'Tỷ lệ hoàn thành', value: `${overallProgress}%`, icon: Info, color: 'emerald', isProgress: true }
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-emerald-100 group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                                    <Icon size={20} />
                                </div>
                                {stat.isProgress && (
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{overallProgress}%</span>
                                )}
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black text-slate-900 tracking-tighter`}>{stat.value.toLocaleString()}</p>
                            {stat.isProgress && (
                                <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Compact Matrix View */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                        <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-800 italic">Ma trận giao nhận hợp nhất</h4>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Phân loại Màu</th>
                                {sizeLabels.map(s => (
                                    <th key={s} className="px-4 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{s}</th>
                                ))}
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiến độ dòng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {variants.map((v, idx) => {
                                const rowOrdered = sizeKeys.reduce((sum, k) => sum + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                                if (rowOrdered === 0) return null;

                                const rowDelivered = deliveries
                                    .filter(d => d.color === v.color)
                                    .reduce((sum, d) => sum + (d.quantity || 0), 0);
                                
                                const rowProgress = Math.round((rowDelivered / rowOrdered) * 100);

                                return (
                                    <tr key={idx} className="group hover:bg-emerald-50/30 transition-all">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-5 h-5 rounded-full ring-4 ring-slate-50 shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: v.colorCode || '#cbd5e1' }} />
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{v.color}</span>
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
                                                            <div className="flex items-center gap-1">
                                                                <span className={`text-[12px] font-black ${delivered === ordered ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                                    {delivered}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-300">/</span>
                                                                <span className="text-[11px] font-bold text-slate-500">{ordered}</span>
                                                            </div>
                                                            <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${delivered === ordered ? 'bg-emerald-500' : 'bg-amber-400'} transition-all`} 
                                                                    style={{ width: `${cellProgress}%` }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-100 font-bold">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-10 py-6 text-right">
                                            <div className="inline-flex flex-col items-end gap-1">
                                                <span className={`text-[11px] font-black ${rowProgress === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                    {rowProgress}%
                                                </span>
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500" style={{ width: `${rowProgress}%` }} />
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
                <div className="px-10 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 italic">
                        * Dữ liệu được hợp nhất từ {deliveries.length} đợt giao hàng thực tế.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Hoàn tất</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Đang giao</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historical Batches - Now smaller and separate */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <History size={16} className="text-slate-400" />
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nhật ký các đợt giao gần đây</h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deliveries.slice().reverse().map((d, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-black text-slate-900">{d.color} - {d.size?.toUpperCase()}</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+{d.quantity}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">{d.date}</p>
                                <p className="text-[10px] text-slate-500 italic mt-2">"{d.note || 'Không có ghi chú'}"</p>
                            </div>
                            <div className="p-2 rounded-lg bg-slate-50 text-slate-300">
                                <Clock size={14} />
                            </div>
                        </div>
                    ))}
                    {deliveries.length === 0 && (
                        <div className="col-span-full py-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                            <p className="text-[11px] font-bold text-slate-400">Chưa ghi nhận bất kỳ đợt giao hàng nào cho dự án này.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailItem({ label, value, isBold = false, isGreen = false }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
            <span className={`text-xs ${isBold ? 'font-black text-slate-900' : 'font-bold text-slate-700'} ${isGreen ? 'text-emerald-600' : ''}`}>
                {value || '-'}
            </span>
        </div>
    );
}
