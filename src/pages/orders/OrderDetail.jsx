import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import {
    ArrowLeft, FileText, MessageSquare, History,
    Loader2, Edit3, Download, Package, Info
} from 'lucide-react';
import OrderCommentModal from '@/components/OrderCommentModal';
import OrderHistoryUpdateModal from '@/components/OrderHistoryUpdateModal';
import OrderService from '@/services/OrderService';
import MainLayout from '../../layouts/MainLayout';
import '@/styles/homepage.css';

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                const response = await OrderService.getOrderDetail(id);
                setOrder(response.data.data || response.data);
            } catch (err) {
                setError("Không thể tải thông tin đơn hàng.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchOrderDetail();
    }, [id]);

    if (loading) return (
        <MainLayout>
            <div className="flex flex-col items-center justify-center min-h-400px">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
                <p className="text-gray-500 text-sm font-medium">Đang truy xuất dữ liệu...</p>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto py-6 px-4 font-sans text-gray-900">
                {/* Header thanh mảnh, tập trung vào ID và Nút sửa */}
                <div className="flex items-center justify-between mb-6 border-b pb-4 border-gray-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded text-gray-400">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">Chi tiết đơn hàng #{order.id}</h1>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Hệ thống quản lý sản xuất GPMS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                            {order.statusName || order.status}
                        </span>
                        <button
                            onClick={() => navigate(`/orders/edit/${order.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all text-sm font-bold shadow-sm"
                        >
                            <Edit3 size={16} /> Chỉnh sửa
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* KHỐI THÔNG TIN CHI TIẾT (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-gray-600">
                                <Info size={16} />
                                <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin tổng quát đơn hàng</h2>
                            </div>

                            {/* Layout Grid 2 cột cho thông tin chi tiết */}
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100 font-sans">
                                <div className="p-0">
                                    <DetailItem label="Mã đơn hàng" value={`#ĐH-${order.id}`} />
                                    <DetailItem label="Tên sản phẩm" value={order.orderName} isBold />
                                    <DetailItem label="Loại sản phẩm" value={order.type} />
                                    <DetailItem label="Kích thước (Size)" value={order.size} />
                                    <DetailItem label="Màu sắc" value={order.color} />
                                </div>
                                <div className="p-0">
                                    <DetailItem label="Số lượng đặt hàng" value={order.quantity?.toLocaleString()} isEmerald />
                                    <DetailItem label="Ngày bắt đầu" value={formatDate(order.startDate)} />
                                    <DetailItem label="Ngày kết thúc dự kiến" value={formatDate(order.endDate)} />
                                    <DetailItem label="Mẫu thiết kế bản cứng" value={`${order.hardCopy || 0} bản`} />
                                    <DetailItem label="Đơn giá (CPU)" value={order.cpu ? `${order.cpu} VND/SP` : '---'} />
                                </div>
                            </div>

                            {/* Ghi chú chiếm toàn bộ chiều ngang phía dưới */}
                            <div className="p-5 border-t border-gray-100 bg-amber-50/30">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Ghi chú đặc biệt cho xưởng</p>
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                    {order.note ? `"${order.note}"` : "Không có ghi chú bổ sung cho đơn hàng này."}
                                </p>
                            </div>
                        </div>

                        {/* Bảng vật liệu - Thực dụng và rõ ràng */}
                        <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-gray-600">
                                <Package size={16} />
                                <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách vật liệu sản xuất</h2>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Tên vật liệu</th>
                                        <th className="px-6 py-3 text-center">Định mức/Số lượng</th>
                                        <th className="px-6 py-3 text-right">Đơn vị (UoM)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                    {order.materials?.length > 0 ? (
                                        order.materials.map((m, i) => (
                                            <tr key={i} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-gray-700">{m.name}</td>
                                                <td className="px-6 py-4 text-center text-emerald-700 font-bold">{m.value}</td>
                                                <td className="px-6 py-4 text-right text-gray-500 font-medium uppercase">{m.uom}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400 text-xs italic">Dữ liệu vật liệu chưa được cập nhật</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CỘT PHẢI (1/3): FILE & THẢO LUẬN */}
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Mẫu thiết kế bản mềm</h2>
                            <div className="space-y-2">
                                {order.files?.length > 0 ? (
                                    order.files.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded border border-gray-100 hover:border-emerald-200 transition-all">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileText size={18} className="text-emerald-600 shrink-0" />
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-gray-700 truncate">{file.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{file.size}</p>
                                                </div>
                                            </div>
                                            <button className="text-gray-400 hover:text-emerald-600"><Download size={16} /></button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-4 text-gray-400 text-[11px] italic">Không có file thiết kế</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setIsCommentModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-bold"
                            >
                                <MessageSquare size={16} /> Thảo luận đơn hàng
                            </button>
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium"
                            >
                                <History size={16} /> Lịch sử chỉnh sửa
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <OrderCommentModal isOpen={isCommentModalOpen} onClose={() => setIsCommentModalOpen(false)} orderId={order.id} />
            <OrderHistoryUpdateModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} orderId={order.id} />
        </MainLayout>
    );
}

// Sub-component hiển thị từng dòng thông tin
function DetailItem({ label, value, isBold = false, isEmerald = false }) {
    return (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>
            <span className={`text-sm ${isBold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${isEmerald ? 'text-emerald-700 font-bold' : ''}`}>
                {value || "---"}
            </span>
        </div>
    );
}

function formatDate(dateString) {
    if (!dateString) return "---";
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString));
}

function getStatusStyle(status) {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'bg-emerald-600 text-white';
    if (s === 'pending') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (s === 'processing') return 'bg-blue-600 text-white';
    return 'bg-gray-100 text-gray-700';
}