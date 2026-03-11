import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import {
    ArrowLeft, FileText, MessageSquare, History,
    Loader2, Edit3, Download, Package, Info
} from 'lucide-react';
import OrderCommentModal from '@/components/OrderCommentModal';
import OrderHistoryUpdateModal from '@/components/OrderHistoryUpdateModal';
import MaterialsTable from '@/components/MaterialsTable';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/constants';
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
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
    const [imageNaturalSize, setImageNaturalSize] = useState({ w: 0, h: 0 });
    const imageContainerRef = useRef(null);

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

    const templates = order?.templates ?? order?.template ?? order?.files ?? [];
    const softTemplates = templates.filter((t) => {
        const type = (t.type ?? '').toString().toLowerCase();
        return type.includes('soft') || !!t.file || !!t.url;
    });
    const hardTemplates = templates.filter((t) => {
        const type = (t.type ?? '').toString().toLowerCase();
        return type.includes('hard');
    });
    const hardCopyTotal = hardTemplates.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

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

                            <div className="px-5 py-4 border-b border-gray-100">
                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-3">Ảnh đơn hàng</div>
                                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                                    <div className="w-32 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shadow-sm relative group">
                                        {order.image ? (
                                            <button
                                                type="button"
                                                onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); setIsImageModalOpen(true); }}
                                                className="w-full h-full cursor-zoom-in"
                                                title="Click để xem & zoom ảnh"
                                            >
                                                <img src={order.image} alt="" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] text-white font-semibold">Click để zoom</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-gray-400">-</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 leading-relaxed">
                                        Ảnh tham khảo tổng quan đơn hàng, dùng để kiểm tra nhanh trước khi sản xuất.
                                    </div>
                                </div>
                            </div>

                            {/* Layout Grid 2 cột cho thông tin chi tiết */}
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100 font-sans">
                                <div className="p-0">
                                    <DetailItem label="Mã đơn hàng" value={`#ĐH-${order.id}`} />
                                    <DetailItem label="Tên đơn hàng" value={order.orderName} isBold />
                                    <DetailItem label="Loại đơn hàng" value={order.type} />
                                    <DetailItem label="Màu sắc" value={order.color} />
                                    <DetailItem label="Kích thước (Size)" value={order.size} />
                                </div>
                                <div className="p-0">
                                    <DetailItem label="Số lượng" value={order.quantity?.toLocaleString()} isEmerald />
                                    <DetailItem label="Đơn giá" value={order.cpu ? `${order.cpu} VND/SP` : '-'} />
                                    <DetailItem label="Tổng tiền đơn hàng" value={order.quantity && order.cpu ? `${(order.quantity * order.cpu).toLocaleString('vi-VN')} VND` : '---'} isBold />
                                    <DetailItem label="Ngày bắt đầu" value={formatDate(order.startDate)} />
                                    <DetailItem label="Ngày kết thúc" value={formatDate(order.endDate)} />
                                </div>
                            </div>

                            {/* Ghi chú chiếm toàn bộ chiều ngang phía dưới */}
                            <div className="p-5 border-t border-gray-100 bg-amber-50/30">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Ghi chú</p>
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
                            <MaterialsTable
                                materials={order.materials ?? []}
                                variant="detail"
                                showImage
                                emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                            />
                        </div>
                    </div>

                    {/* CỘT PHẢI (1/3): FILE & THẢO LUẬN */}
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-5 space-y-5">
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mẫu thiết kế bản mềm</h2>
                                <div className="space-y-2">
                                    {softTemplates.length > 0 ? (
                                        softTemplates.map((file, idx) => {
                                            const fileName = file.templateName ?? file.name ?? `File ${idx + 1}`;
                                            const fileUrl = file.file ?? file.url ?? '';
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded border border-gray-100 hover:border-emerald-200 transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText size={18} className="text-emerald-600 shrink-0" />
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-bold text-gray-700 truncate">{fileName}</p>
                                                            {file.size && <p className="text-[10px] text-gray-400 font-bold uppercase">{file.size}</p>}
                                                        </div>
                                                    </div>
                                                    {fileUrl ? (
                                                        <a href={fileUrl} download target="_blank" rel="noreferrer" className="text-gray-400 hover:text-emerald-600">
                                                            <Download size={16} />
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400">Không có link</span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center py-4 text-gray-400 text-[11px] italic">Không có file thiết kế</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bản cứng</h2>
                                <div className="text-sm font-semibold text-gray-700">
                                    Số lượng bản cứng: <span className="text-emerald-700">{hardCopyTotal}</span>
                                </div>
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
            {order.image && isImageModalOpen && (
                <div
                    className="fixed inset-0 z-9999 bg-black/70 flex items-center justify-center p-4 overscroll-none touch-none"
                    onClick={() => setIsImageModalOpen(false)}
                    onWheelCapture={(e) => e.preventDefault()}
                >
                    <div className="relative w-full max-w-4xl h-[80vh]" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setIsImageModalOpen(false)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-700 shadow flex items-center justify-center"
                        >
                            ×
                        </button>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
                            <div className="flex flex-col items-center justify-center gap-2 px-4 py-3 border-b border-gray-100">
                                <div className="text-xs font-semibold text-gray-600">Zoom</div>
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageZoom((z) => {
                                                const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                                                if (next === 1) setImagePan({ x: 0, y: 0 });
                                                return next;
                                            });
                                        }}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.05"
                                        value={imageZoom}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            setImageZoom(next);
                                            if (next === 1) setImagePan({ x: 0, y: 0 });
                                        }}
                                        className="w-48 accent-emerald-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setImageZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                                    >
                                        +
                                    </button>
                                    <span className="text-xs text-gray-600 w-14 text-center">{Math.round(imageZoom * 100)}%</span>
                                    <button
                                        type="button"
                                        onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                                        className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={imageContainerRef}
                                className="flex-1 bg-black/5 flex items-center justify-center p-2 overflow-hidden"
                                onWheel={(e) => {
                                    if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
                                    e.preventDefault();
                                    setImageZoom((z) => {
                                        const next = Math.min(3, Math.max(1, Number((z + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2))));
                                        if (next === 1) setImagePan({ x: 0, y: 0 });
                                        return next;
                                    });
                                }}
                                onPointerDown={(e) => {
                                    if (imageZoom <= 1) return;
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX, y: e.clientY, panX: imagePan.x, panY: imagePan.y });
                                    e.currentTarget.setPointerCapture?.(e.pointerId);
                                }}
                                onPointerMove={(e) => {
                                    if (!isDragging || imageZoom <= 1) return;
                                    const dx = e.clientX - dragStart.x;
                                    const dy = e.clientY - dragStart.y;
                                    const container = imageContainerRef.current;
                                    if (!container || !imageNaturalSize.w || !imageNaturalSize.h) return;
                                    const containerRect = container.getBoundingClientRect();
                                    const fitScale = Math.min(containerRect.width / imageNaturalSize.w, containerRect.height / imageNaturalSize.h);
                                    const baseW = imageNaturalSize.w * fitScale;
                                    const baseH = imageNaturalSize.h * fitScale;
                                    const scaledW = baseW * imageZoom;
                                    const scaledH = baseH * imageZoom;
                                    const maxX = Math.max(0, (scaledW - containerRect.width) / 2);
                                    const maxY = Math.max(0, (scaledH - containerRect.height) / 2);
                                    const nextX = Math.max(-maxX, Math.min(maxX, dragStart.panX + dx));
                                    const nextY = Math.max(-maxY, Math.min(maxY, dragStart.panY + dy));
                                    setImagePan({ x: nextX, y: nextY });
                                }}
                                onPointerUp={(e) => {
                                    setIsDragging(false);
                                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                                }}
                                onPointerCancel={(e) => {
                                    setIsDragging(false);
                                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                                }}
                            >
                                <div
                                    className="will-change-transform"
                                    style={{
                                        transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                                        transformOrigin: 'center',
                                    }}
                                >
                                    <img
                                        src={order.image}
                                        alt=""
                                        className="block max-w-full max-h-[80vh] object-contain select-none"
                                        onLoad={(e) => {
                                            const img = e.currentTarget;
                                            setImageNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                                        }}
                                        draggable={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}

// Sub-component hiển thị từng dòng thông tin
function DetailItem({ label, value, isBold = false, isEmerald = false }) {
    const displayValue = value === null || value === undefined || value === '' ? '-' : value;
    return (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{label}</span>
            <span className={`text-sm ${isBold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${isEmerald ? 'text-emerald-700 font-bold' : ''}`}>
                {displayValue}
            </span>
        </div>
    );
}

function formatDate(dateString) {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateString));
}

function getStatusStyle(status) {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'bg-emerald-600 text-white';
    if (s === 'pending') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (s === 'processing') return 'bg-blue-600 text-white';
    return 'bg-gray-100 text-gray-700';
}
