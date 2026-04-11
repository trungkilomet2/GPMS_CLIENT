import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileText, MessageSquare, History,
    Loader2, Edit3, Package, Info, AlertCircle, Truck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/utils/errorUtils';
import OrderCommentModal from '@/components/orders/OrderCommentModal';
import OrderHistoryUpdateModal from '@/components/orders/OrderHistoryUpdateModal';
import MaterialsTable from '@/components/orders/MaterialsTable';
import CustomerInfoCard from '@/components/orders/CustomerInfoCard';
import { MATERIALS_TABLE_EMPTY_TEXT } from '@/lib/orders/materials';
import { formatOrderDate } from '@/lib/orders/formatters';
import { getOrderCustomerId } from '@/lib/orders/customerInfo';
import { getOrderStatusStyle, normalizeOrderStatus } from '@/lib/orders/status';
import OrderService from '@/services/OrderService';
import { userService } from '@/services/userService';
import { getStoredUser } from '@/lib/authStorage';
import DeliveryProgressSection from '@/components/orders/DeliveryProgressSection';
import { hasAnyRole, splitRoles } from '@/lib/authRouting';
import OrderImageZoomModal from '@/pages/orders/components/OrderImageZoomModal';
import DesignTemplatesSection from '@/components/orders/DesignTemplatesSection';
import OrderStatusReasonModal from '@/components/orders/OrderStatusReasonModal';
import OwnerLayout from '@/layouts/OwnerLayout';
import RecordDeliveryModal from '@/components/orders/RecordDeliveryModal';
import ProductionService from '@/services/ProductionService';
import { getProductionStatusLabel } from '@/utils/statusUtils';
import '@/styles/homepage.css';
import '@/styles/leave.css';

function extractRejectReasonFromResponse(response) {
    const root = response?.data?.data ?? response?.data ?? response;
    const payload = Array.isArray(root) ? root[0] : root;
    if (!payload || typeof payload !== 'object') return '';

    const candidateKeys = [
        'reason', 'rejectReason', 'statusReason', 'note', 'description', 'content', 'message'
    ];

    for (const key of candidateKeys) {
        const value = payload?.[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- STATES ---
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const [customerProfile, setCustomerProfile] = useState(null);
    const [showDenyConfirm, setShowDenyConfirm] = useState(false);
    const [denyLoading, setDenyLoading] = useState(false);
    const [denyError, setDenyError] = useState(null);
    const [denySuccess, setDenySuccess] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectReasonLoading, setRejectReasonLoading] = useState(false);
    const [rejectReasonError, setRejectReasonError] = useState(null);
    const [hasProduction, setHasProduction] = useState(false);
    const [isCheckingProduction, setIsCheckingProduction] = useState(false);
    const [isRecordDeliveryModalOpen, setIsRecordDeliveryModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('specification'); // specification, delivery, materials
    const [deliveries, setDeliveries] = useState([
        { color: 'Đỏ Đô', size: 'M', quantity: 20, date: '10/04/2026', note: 'Giao đợt 1' },
        { color: 'Xám Khói', size: 'L', quantity: 15, date: '11/04/2026', note: 'Giao đợt 1' }
    ]);

    const user = getStoredUser();
    const roles = splitRoles(user?.role);
    const isOwner = hasAnyRole(roles, ['owner']);
    const isAdmin = hasAnyRole(roles, ['admin']);
    const isCustomer = hasAnyRole(roles, ['customer']);
    const canModerate = isOwner || isAdmin;

    // --- EFFECTS ---
    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                const response = await OrderService.getOrderDetail(id);
                setOrder(response.data.data || response.data);
                setError(null);
            } catch (_err) {
                setError("Không thể tải thông tin đơn hàng.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchOrderDetail();
    }, [id]);

    useEffect(() => {
        let isMounted = true;
        const loadCustomerProfile = async () => {
            const customerId = getOrderCustomerId(order);
            if (!canModerate || !customerId) {
                if (isMounted) setCustomerProfile(null);
                return;
            }
            try {
                const profile = await userService.getProfileById(customerId);
                if (isMounted) setCustomerProfile(profile || null);
            } catch (err) {
                if (isMounted) setCustomerProfile(null);
                console.error('Không thể tải hồ sơ khách hàng:', err);
            }
        };
        loadCustomerProfile();
        return () => { isMounted = false; };
    }, [order, canModerate]);

    useEffect(() => {
        let isMounted = true;
        const loadRejectReason = async () => {
            const orderId = order?.id ?? id;
            const normalized = normalizeOrderStatus(order?.statusName ?? order?.status);
            if (!orderId || normalized !== 'Đã từ chối') {
                if (isMounted) {
                    setRejectReason('');
                    setRejectReasonError(null);
                    setRejectReasonLoading(false);
                }
                return;
            }
            try {
                setRejectReasonLoading(true);
                const response = await OrderService.getOrderRejectById(orderId);
                const reason = extractRejectReasonFromResponse(response);
                if (!isMounted) return;
                setRejectReason(reason);
            } catch (err) {
                if (!isMounted) return;
                setRejectReasonError('Không thể tải lý do từ chối.');
            } finally {
                if (isMounted) setRejectReasonLoading(false);
            }
        };
        loadRejectReason();
        return () => { isMounted = false; };
    }, [order?.id, order?.status, id]);

    useEffect(() => {
        let isMounted = true;
        const checkExistingProduction = async () => {
            const orderId = order?.id ?? id;
            if (!orderId) return;
            try {
                setIsCheckingProduction(true);
                const response = await ProductionService.getProductionList({ PageIndex: 0, PageSize: 50 });
                const list = response?.data?.data ?? response?.data ?? [];
                const exists = list.some((item) => {
                    const oid = item?.order?.id ?? item?.orderId ?? item?.orderID ?? item?.order_id;
                    const statusVal = item?.statusName ?? item?.status;
                    const normalizedProdStatus = getProductionStatusLabel(statusVal);
                    return String(oid) === String(orderId) && normalizedProdStatus !== 'Từ Chối';
                });
                if (isMounted) setHasProduction(exists);
            } catch (err) {
                console.error('Error checking existing production:', err);
            } finally {
                if (isMounted) setIsCheckingProduction(false);
            }
        };
        checkExistingProduction();
        return () => { isMounted = false; };
    }, [order?.id, id]);

    // --- DERIVED CONSTANTS ---
    const templates = order?.templates ?? order?.template ?? order?.files ?? [];
    const orderStatusValue = order?.statusName ?? order?.status;
    const orderOwnerId = getOrderCustomerId(order);
    const currentUserId = user?.userId ?? user?.id ?? null;
    const isOrderOwner = currentUserId && orderOwnerId && String(currentUserId) === String(orderOwnerId);

    const normalizedStatus = normalizeOrderStatus(orderStatusValue);
    const isRejected = normalizedStatus === 'Đã từ chối';
    const isAccepted = normalizedStatus === 'Đã chấp nhận';
    const isCanceled = normalizedStatus === 'Đã hủy';
    const isProcessing = normalizedStatus === 'Đang sản xuất';
    const isCompleted = normalizedStatus === 'Đã hoàn thành';

    // Permission rules
    const canEdit = (isOwner || isAdmin || (isCustomer && isOrderOwner)) && (normalizedStatus === 'Chờ xác nhận' || normalizedStatus === 'Yêu cầu chỉnh sửa');
    const canAccept = (isOwner || isAdmin) && normalizedStatus === 'Chờ xác nhận';
    const canRequestModification = (isOwner || isAdmin) && normalizedStatus === 'Chờ xác nhận';
    const canCustomerDeny = isCustomer && isOrderOwner && !isAccepted && !isRejected && !isCanceled && !isProcessing && !isCompleted;

    const processedVariants = (() => {
        if (!order) return [];
        const realVariants = order.variants || order.orderVariants || order.productVariants || order.itemVariants || (order.data?.variants);
        const mockVariants = [
            { color: 'Đỏ Đô', colorCode: '#991b1b', xs: 15, s: 25, m: 40, l: 30, xl: 20, '2xl': 10, '3xl': 5 },
            { color: 'Xám Khói', colorCode: '#475569', xs: 10, s: 30, m: 55, l: 45, xl: 15, '2xl': 5, '3xl': 0 },
            { color: 'Xanh Navy', colorCode: '#1e3a8a', xs: 20, s: 40, m: 60, l: 50, xl: 30, '2xl': 15, '3xl': 10 },
            { color: 'Xanh Rêu', colorCode: '#166534', xs: 5, s: 15, m: 25, l: 20, xl: 10, '2xl': 0, '3xl': 0 },
        ];
        return (Array.isArray(realVariants) && realVariants.length > 0) ? realVariants : mockVariants;
    })();

    // --- HANDLERS ---
    const handleApproveOrder = async () => {
        if (!order?.id && !id) return;
        try {
            setIsUpdatingStatus(true);
            await OrderService.approveOrder(order?.id ?? id);
            setOrder(prev => (prev ? { ...prev, status: 'Đã chấp nhận', statusName: 'Đã chấp nhận' } : prev));
            toast.success("Đã chấp nhận đơn hàng.");
        } catch (err) {
            toast.error(getErrorMessage(err, 'Không thể chấp nhận đơn hàng.'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleCustomerDenyOrder = async () => {
        const orderId = order?.id ?? id;
        if (!orderId) return;
        try {
            setDenyLoading(true);
            await OrderService.denyOrder(orderId);
            setOrder(prev => (prev ? { ...prev, status: 'Đã hủy', statusName: 'Đã hủy' } : prev));
            setShowDenyConfirm(false);
            toast.success("Đã hủy đơn hàng.");
        } catch (err) {
            toast.error(getErrorMessage(err, 'Hủy đơn hàng thất bại.'));
        } finally {
            setDenyLoading(false);
        }
    };

    const updateOrderStatus = async (nextStatus, reason = '') => {
        if (!order?.id) return;
        try {
            setIsUpdatingStatus(true);
            const payload = { ...order, status: nextStatus, reason };
            await OrderService.updateOrder(order.id, payload);
            setOrder(prev => ({ ...prev, status: nextStatus, statusName: nextStatus }));
            toast.success(`Cập nhật trạng thái thành ${nextStatus}.`);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Cập nhật trạng thái thất bại.'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // --- RENDER HELPERS ---
    if (loading) return (
        <OwnerLayout>
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
                <p className="text-slate-500 text-sm font-medium">Đang truy xuất dữ liệu...</p>
            </div>
        </OwnerLayout>
    );

    if (error || !order) return (
        <OwnerLayout>
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-rose-600 text-sm font-semibold">{error || "Sản phẩm không khả dụng."}</p>
                <button onClick={() => navigate('/orders')} className="mt-4 text-emerald-600 font-bold hover:underline">Quay lại danh sách</button>
            </div>
        </OwnerLayout>
    );

    return (
        <OwnerLayout>
            <div className="min-h-screen bg-[#fafbfc] font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

                    {/* HERO HEADER */}
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            <button onClick={() => navigate('/orders')} className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 transition-all hover:border-emerald-500 hover:text-emerald-600 shadow-sm active:scale-95">
                                <ArrowLeft size={22} />
                            </button>
                            <div className="space-y-0.5">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                    Đơn hàng <span className="text-emerald-600">#{order.id}</span>
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase">Quản lý dự án & Vận hành</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Tabs Navigation */}
                            <div className="bg-slate-100/50 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-100">
                                {[
                                    { id: 'specification', label: 'Thông số & Phân bổ', icon: FileText },
                                    { id: 'delivery', label: 'Tiến độ giao hàng', icon: Truck },
                                    { id: 'materials', label: 'Nguyên phụ liệu', icon: Package },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200'
                                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                                }`}
                                        >
                                            <Icon size={14} />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className={`rounded-xl border px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${getOrderStatusStyle(orderStatusValue, 'detail')}`}>
                                    {order.statusName || order.status}
                                </div>
                                {canAccept && (
                                    <button onClick={() => setIsApproveModalOpen(true)} className="h-11 rounded-xl bg-emerald-600 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-95">
                                        Chấp nhận
                                    </button>
                                )}
                                {canEdit && (
                                    <button onClick={() => navigate(`/orders/edit/${order.id}`, { state: { order } })} className="h-11 flex items-center gap-2 rounded-xl bg-slate-950 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 active:scale-95">
                                        <Edit3 size={14} /> Hiệu chỉnh
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">

                            {activeTab === 'specification' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
                                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Thông số kỹ thuật sản phẩm</h2>
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-10">
                                            <div className="flex flex-col md:flex-row gap-10 items-start">
                                                <div className="w-full md:w-[220px] shrink-0">
                                                    <div className="relative aspect-square rounded-[2rem] border-2 border-slate-100 bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                                                        {order.image ? (
                                                            <button onClick={() => { setZoomImageUrl(order.image); setIsImageModalOpen(true); }} className="w-full h-full">
                                                                <img src={order.image} alt="" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                                                            </button>
                                                        ) : (
                                                            <div className="text-slate-200 flex flex-col items-center gap-2">
                                                                <Package size={48} strokeWidth={1} />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest italic">Chưa có ảnh</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-8">
                                                    <div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 font-serif italic">Tên đơn hàng</p>
                                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight">{order.orderName}</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-12 gap-y-8 border-t border-slate-100 pt-8">
                                                        <DetailItem label="Sản lượng tổng" value={`${order.quantity?.toLocaleString()} SP`} isGreen />
                                                        <DetailItem label="Đơn giá cơ sở" value={`${order.cpu?.toLocaleString()} VND`} />
                                                        <DetailItem label="Ngày khởi tạo" value={formatOrderDate(order.startDate)} />
                                                        <DetailItem label="Kỳ hạn giao hàng" value={formatOrderDate(order.endDate)} isBold />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-950 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-emerald-900/10">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Giá trị dự án tịnh</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-4xl font-black text-white tracking-tighter">
                                                            {(order.quantity * order.cpu).toLocaleString()}
                                                        </span>
                                                        <span className="text-sm font-bold text-emerald-500">VND</span>
                                                    </div>
                                                </div>
                                                <div className="h-12 w-px bg-slate-800 hidden md:block" />
                                                <div className="text-center md:text-right">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Gia công / SP</p>
                                                    <p className="text-2xl font-black text-slate-200">{order.cpu?.toLocaleString()} <span className="text-[10px] text-slate-500">VND</span></p>
                                                </div>
                                            </div>

                                            <div className="py-8 border-y border-slate-100">
                                                <div className="mb-8">
                                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 italic">Ma trận chi tiết</h4>
                                                    <p className="text-2xl font-black text-slate-900 tracking-tight uppercase">Phân bổ Màu & Size</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-10 bg-slate-900 rounded-2xl py-4 px-8 shadow-lg">
                                                        <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Màu sắc</div>
                                                        {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => <div key={s} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{s}</div>)}
                                                        <div className="text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {processedVariants.map((v, idx) => {
                                                            const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
                                                            const total = sizeKeys.reduce((acc, k) => acc + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                                                            return (
                                                                <div key={idx} className="grid grid-cols-10 py-5 px-8 items-center bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md transition-all group/vrow">
                                                                    <div className="col-span-2 flex items-center gap-4">
                                                                        <div className="w-5 h-5 rounded-full ring-4 ring-slate-50 shadow-inner group-hover/vrow:scale-110 transition-transform" style={{ backgroundColor: v.colorCode || '#cbd5e1' }} />
                                                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{v.color}</span>
                                                                    </div>
                                                                    {sizeKeys.map(k => {
                                                                        const val = Number(v[k] || v[k.toUpperCase()] || 0);
                                                                        return <div key={k} className="text-center text-sm font-black text-emerald-600">{val || '-'}</div>;
                                                                    })}
                                                                    <div className="text-right">
                                                                        <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black text-slate-900">{total}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-slate-400">
                                                    <MessageSquare size={16} />
                                                    <p className="text-[10px] font-black uppercase tracking-widest italic">Ghi chú nội bộ</p>
                                                </div>
                                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 italic text-slate-600 text-sm leading-relaxed font-medium shadow-inner">
                                                    {order.note || "Hệ thống không ghi nhận chỉ dẫn bổ sung dành cho dự án sản xuất này."}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'delivery' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-2">
                                        <DeliveryProgressSection
                                            variants={processedVariants}
                                            deliveries={deliveries}
                                            onAddDelivery={() => setIsRecordDeliveryModalOpen(true)}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'materials' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3">
                                            <Package size={20} className="text-emerald-600" />
                                            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Danh mục nguyên phụ liệu kỹ thuật</h2>
                                        </div>
                                        <div className="p-4">
                                            <MaterialsTable
                                                materials={order.materials ?? []}
                                                variant="detail"
                                                showImage
                                                emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                                                onImageClick={(url) => { if (url) { setZoomImageUrl(url); setIsImageModalOpen(true); } }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-xl p-8 space-y-10 sticky top-8">
                                {canModerate && customerProfile && (
                                    <div className="pb-8 border-b border-slate-100 text-center md:text-left">
                                        <CustomerInfoCard order={order} profile={customerProfile} />
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <DesignTemplatesSection templates={templates} title="Hồ sơ thiết kế" />
                                </div>
                                <div className="grid grid-cols-1 gap-4 pt-6">
                                    <button onClick={() => setIsCommentModalOpen(true)} className="h-14 flex items-center justify-center gap-3 rounded-2xl bg-slate-950 text-white hover:bg-slate-900 shadow-xl transition-all active:scale-95">
                                        <MessageSquare size={18} className="text-emerald-500" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Trung tâm thảo luận</span>
                                    </button>
                                    <button onClick={() => setIsHistoryModalOpen(true)} className="h-14 flex items-center justify-center gap-3 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-all active:scale-95">
                                        <History size={18} className="text-slate-400" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Lịch sử chỉnh sửa</span>
                                    </button>
                                </div>
                                {isRejected && rejectReason && (
                                    <div className="mt-8 p-8 rounded-[2rem] bg-rose-50 border border-rose-100 shadow-inner">
                                        <div className="flex items-center gap-3 mb-4">
                                            <AlertCircle size={18} className="text-rose-500" />
                                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Chi tiết từ chối</p>
                                        </div>
                                        <p className="text-sm font-bold text-rose-900 leading-relaxed italic">"{rejectReason}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <OrderCommentModal isOpen={isCommentModalOpen} onClose={() => setIsCommentModalOpen(false)} orderId={order.id} />
            <OrderHistoryUpdateModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} orderId={order.id} />
            <OrderImageZoomModal isOpen={isImageModalOpen} imageUrl={zoomImageUrl} onClose={() => setIsImageModalOpen(false)} />
            <OrderStatusReasonModal
                isOpen={isReasonModalOpen}
                onClose={() => setIsReasonModalOpen(false)}
                onSubmit={async (reason) => {
                    if (pendingStatus === 'Yêu cầu chỉnh sửa') {
                        try {
                            setIsUpdatingStatus(true);
                            await OrderService.requestOrderModification(order.id, { reason });
                            setOrder(prev => ({ ...prev, status: 'Yêu cầu chỉnh sửa', statusName: 'Yêu cầu chỉnh sửa' }));
                            setIsReasonModalOpen(false);
                            toast.success("Đã gửi yêu cầu chỉnh sửa.");
                        } catch (err) {
                            toast.error("Gửi yêu cầu thất bại.");
                        } finally {
                            setIsUpdatingStatus(false);
                        }
                    } else if (pendingStatus === 'Từ chối') {
                        try {
                            setIsUpdatingStatus(true);
                            await OrderService.rejectOrder({ orderId: order.id, reason, userId: user?.userId });
                            setOrder(prev => ({ ...prev, status: 'Đã từ chối', statusName: 'Đã từ chối' }));
                            setRejectReason(reason);
                            setIsReasonModalOpen(false);
                            toast.success("Đã từ chối đơn hàng.");
                        } catch (err) {
                            toast.error("Từ chối thất bại.");
                        } finally {
                            setIsUpdatingStatus(false);
                        }
                    }
                }}
                title={pendingStatus}
                requireReason={pendingStatus === 'Từ chối'}
                loading={isUpdatingStatus}
            />
            <OrderStatusReasonModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                onSubmit={handleApproveOrder}
                title="Chấp nhận đơn hàng"
                description="Hành động này sẽ xác nhận đơn hàng bắt đầu đi vào quy trình sản xuất."
                requireReason={false}
                loading={isUpdatingStatus}
            />
            {showDenyConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-black text-slate-900 mb-4">Hủy đơn hàng?</h3>
                        <p className="text-sm text-slate-500 mb-8">Bạn có chắc muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDenyConfirm(false)} className="px-6 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900">Quay lại</button>
                            <button onClick={handleCustomerDenyOrder} disabled={denyLoading} className="px-6 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase hover:bg-rose-700 shadow-lg shadow-rose-100">{denyLoading ? '...' : 'Xác nhận hủy'}</button>
                        </div>
                    </div>
                </div>
            )}
            <RecordDeliveryModal
                isOpen={isRecordDeliveryModalOpen}
                onClose={() => setIsRecordDeliveryModalOpen(false)}
                variants={processedVariants}
                deliveries={deliveries}
                onSubmit={(news) => {
                    setDeliveries(prev => [...prev, ...news]);
                    toast.success("Đã ghi nhận đợt giao hàng!");
                }}
            />
        </OwnerLayout>
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
