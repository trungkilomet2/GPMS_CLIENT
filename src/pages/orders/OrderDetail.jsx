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
import "@/styles/leave.css";
import RecordDeliveryModal from '@/components/orders/RecordDeliveryModal';
import ProductionService from '@/services/ProductionService';
import { getProductionStatusLabel } from '@/utils/statusUtils';
import '@/styles/homepage.css';

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
        { color: 'Đỏ Đô', size: 'M', quantity: 15, date: '08/04/2026', note: 'Đợt giao đầu tiên - Đã tự động xác nhận sau 3 ngày', isConfirmed: false },
        { color: 'Đỏ Đô', size: 'L', quantity: 20, date: '10/04/2026', note: 'Đợt giao thứ 2 - Đã được khách xác nhận thủ công', isConfirmed: true },
        { color: 'Xám Khói', size: 'XL', quantity: 10, date: '12/04/2026', note: 'Đợt vừa giao hôm nay - Đang chờ xác nhận', isConfirmed: false },
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
                // FALLBACK MOCK DATA FOR IDS 101, 102, 103, 104
                const mockID = String(id);
                const MOCK_ORDERS = {
                    '101': { id: 101, orderName: 'Áo sơ mi nam công sở', quantity: 150, size: 'M/L', color: 'Trắng/Xanh', endDate: '2026-04-20', status: 'Approved', statusName: 'Đã chấp nhận', orderVariants: [], customerId: 1 },
                    '102': { id: 102, orderName: 'Quần tây Âu premium', quantity: 200, size: '30/32/34', color: 'Đen', endDate: '2026-04-25', status: 'Pending', statusName: 'Chờ xét duyệt', orderVariants: [], customerId: user?.userId || user?.id || 1 },
                    '103': { id: 103, orderName: 'Váy midi hoa nhí', quantity: 80, size: 'S/M', color: 'Hồng/Vàng', endDate: '2026-04-15', status: 'Completed', statusName: 'Hoàn thành', orderVariants: [], customerId: 1 },
                    '104': { id: 104, orderName: 'Áo khoác gió thể thao', quantity: 120, size: 'L/XL', color: 'Xanh Navy', endDate: '2026-04-30', status: 'Rejected', statusName: 'Từ chối', orderVariants: [], customerId: 1 },
                };

                if (MOCK_ORDERS[mockID]) {
                    setOrder(MOCK_ORDERS[mockID]);
                    setError(null);
                } else {
                    setError("Không thể tải thông tin đơn hàng.");
                }
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
    const canEdit = (isOwner || isAdmin || (isCustomer && isOrderOwner)) && (normalizedStatus === 'Chờ xét duyệt' || normalizedStatus === 'Yêu cầu chỉnh sửa');
    const canAccept = (isOwner || isAdmin) && normalizedStatus === 'Chờ xét duyệt';
    const canRequestModification = (isOwner || isAdmin) && normalizedStatus === 'Chờ xét duyệt';
    const canCustomerDeny = isCustomer && isOrderOwner && !isAccepted && !isRejected && !isCanceled && !isProcessing && !isCompleted;

    const processedVariants = (() => {
        if (!order) return [];

        // Check for new 'sizes' structure first
        if (order.sizes && Array.isArray(order.sizes)) {
            const grouped = {};
            const SIZE_ID_TO_KEY = { 1: 'xs', 2: 's', 3: 'm', 4: 'l', 5: 'xl', 6: '2xl', 7: '3xl' };
            order.sizes.forEach(s => {
                const color = s.color || 'Chưa xác định';
                if (!grouped[color]) {
                    grouped[color] = { color, xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0 };
                }
                const key = SIZE_ID_TO_KEY[s.sizeId];
                if (key) grouped[color][key] = s.quantity;
            });
            return Object.values(grouped);
        }

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
            <div className="leave-page leave-detail-page font-sans selection:bg-[#1e6e43]/10 selection:text-[#1e6e43] pb-20">
                <div className="leave-shell mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">


                    {/* HERO HEADER */}
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <button
                                onClick={() => navigate('/orders')}
                                className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-500 transition-all hover:border-[#1e6e43] hover:text-[#1e6e43] shadow-sm active:scale-95"
                            >
                                <ArrowLeft size={22} />
                            </button>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                                        Đơn hàng #{order.id}
                                    </h1>
                                    <div className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${orderStatusValue === 'Chờ xét duyệt' || orderStatusValue === 'Chờ Xét Duyệt' || orderStatusValue === 'Pending'
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-[#f0f9f4] text-[#1e6e43] border-[#d4e3da]'
                                        }`}>
                                        {order.statusName || order.status}
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Quản lý & Theo dõi tiến độ sản xuất</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 flex-1">
                            {/* Actions and Tabs unified box */}
                            <div className="flex flex-wrap items-center justify-end gap-3 w-full">
                                {/* Tabs */}
                                <div className="bg-gray-100/50 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
                                    {[
                                        { id: 'specification', label: 'Thông số', icon: FileText },
                                        { id: 'delivery', label: 'Tiến độ', icon: Truck },
                                        { id: 'materials', label: 'Vật liệu', icon: Package },
                                    ].map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isActive
                                                    ? 'bg-white text-[#1e6e43] shadow-sm border border-gray-100'
                                                    : 'text-gray-500 hover:text-gray-900 border border-transparent'
                                                    }`}
                                            >
                                                <Icon size={12} />
                                                <span className="hidden sm:inline">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Main Actions */}
                                <div className="flex items-center gap-2">
                                    {canAccept && (
                                        <button
                                            onClick={() => setIsApproveModalOpen(true)}
                                            className="h-9 px-5 rounded-xl bg-[#1e6e43] border border-black text-white text-[9px] font-black uppercase tracking-widest transition-all hover:bg-[#155232] shadow-sm active:scale-95"
                                        >
                                            Chấp nhận
                                        </button>
                                    )}
                                    {canRequestModification && (
                                        <button
                                            onClick={() => { setPendingStatus('Yêu cầu chỉnh sửa'); setIsReasonModalOpen(true); }}
                                            className="h-9 px-5 rounded-xl bg-white border border-black text-[9px] font-black uppercase tracking-widest text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
                                        >
                                            Yêu cầu sửa
                                        </button>
                                    )}
                                    {(canModerate && normalizedStatus === 'Chờ xét duyệt') && (
                                        <button
                                            onClick={() => { setPendingStatus('Từ chối'); setIsReasonModalOpen(true); }}
                                            className="h-9 px-5 rounded-xl bg-white border border-black text-[9px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-50 active:scale-95"
                                        >
                                            Từ chối
                                        </button>
                                    )}
                                    {canEdit && (
                                        <button
                                            onClick={() => navigate(`/orders/edit/${order.id}`, { state: { order } })}
                                            className="h-9 px-5 rounded-xl bg-slate-900 border border-black text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 active:scale-95 shadow-sm"
                                        >
                                            Sửa đơn
                                        </button>
                                    )}
                                    {canCustomerDeny && (
                                        <button
                                            onClick={() => setShowDenyConfirm(true)}
                                            className="h-9 px-5 rounded-xl bg-rose-50 border border-black text-[9px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-100 active:scale-95 shadow-sm"
                                        >
                                            Hủy đơn
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">

                            {activeTab === 'specification' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="rounded-xl border border-black bg-white overflow-hidden">
                                        {/* Header */}
                                        <div className="px-8 py-4 border-b border-black-600 flex items-center gap-3 bg-white">
                                            <Info size={16} className="text-gray-400" />
                                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#4a5568]">Thông tin tổng quát đơn hàng</h2>
                                        </div>

                                        <div className="p-8 space-y-8">
                                            {/* Image Section */}
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ảnh đơn hàng</p>
                                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                                    <div className="w-[160px] h-[160px] shrink-0 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                                                        {order.image ? (
                                                            <img
                                                                src={order.image}
                                                                alt=""
                                                                className="w-full h-full object-contain cursor-pointer"
                                                                onClick={() => { setZoomImageUrl(order.image); setIsImageModalOpen(true); }}
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 pt-4 border-t border-gray-50 relative">
                                                {/* Left Column */}
                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mã đơn hàng</span>
                                                        <span className="text-[13px] font-bold text-gray-700">#DH-{order.id}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tên đơn hàng</span>
                                                        <span className="text-[14px] font-bold text-gray-900 uppercase">{order.orderName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ngày bắt đầu</span>
                                                        <span className="text-[13px] font-bold text-gray-600">{formatOrderDate(order.startDate)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4 md:border-b-0 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ngày kết thúc</span>
                                                        <span className="text-[13px] font-bold text-gray-600">{formatOrderDate(order.endDate)}</span>
                                                    </div>
                                                </div>

                                                {/* Vertical Divider for MD+ screens */}
                                                <div className="hidden md:block absolute left-1/2 h-full w-px bg-gray-50 -translate-x-1/2" />

                                                {/* Right Column */}
                                                <div className="flex flex-col relative">
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Số lượng</span>
                                                        <span className="text-[13px] font-bold text-gray-700">{order.quantity?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đơn giá</span>
                                                        <span className="text-[13px] font-bold text-gray-700">{order.cpu?.toLocaleString()} VND/SP</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4 border-b border-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng tiền đơn hàng</span>
                                                        <span className="text-[14px] font-extrabold text-[#111827]">{(order.quantity * order.cpu).toLocaleString()} VND</span>
                                                    </div>
                                                    <div className="flex justify-between items-center py-4">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng số ngày thực hiện</span>
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

                                            {/* Restore Distribution Chart */}
                                            <div className="py-8 border-t border-gray-100">
                                                <div className="mb-6">
                                                    <p className="text-[10px] font-bold text-[#1e6e43] uppercase tracking-[0.2em] mb-1">Cấu trúc chi tiết</p>
                                                    <h4 className="text-lg font-bold text-gray-900 tracking-tight uppercase">Phân bổ Màu & Size</h4>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-10 bg-gray-100/50 rounded-xl py-4 px-8 border border-black">
                                                        <div className="col-span-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Màu sắc</div>
                                                        {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => <div key={s} className="text-center text-[9px] font-bold text-gray-600 uppercase tracking-widest">{s}</div>)}
                                                        <div className="text-right text-[9px] font-bold text-gray-600 uppercase tracking-widest">Tổng</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {processedVariants.map((v, idx) => {
                                                            const sizeKeys = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
                                                            const total = sizeKeys.reduce((acc, k) => acc + (Number(v[k] || v[k.toUpperCase()] || 0)), 0);
                                                            return (
                                                                <div key={idx} className="grid grid-cols-10 py-5 px-8 items-center bg-white border border-black rounded-xl hover:bg-gray-50 transition-all">
                                                                    <div className="col-span-2 flex items-center gap-3">
                                                                        <div className="w-4 h-4 rounded-full border border-gray-100" style={{ backgroundColor: v.colorCode || '#cbd5e1' }} />
                                                                        <span className="text-xs font-bold text-gray-800 uppercase">{v.color}</span>
                                                                    </div>
                                                                    {sizeKeys.map(k => {
                                                                        const val = Number(v[k] || v[k.toUpperCase()] || 0);
                                                                        return <div key={k} className="text-center text-sm font-bold text-[#1e6e43]">{val || '-'}</div>;
                                                                    })}
                                                                    <div className="text-right">
                                                                        <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-700">{total}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note Section */}
                                            <div className="pt-6 border-t border-gray-50 space-y-3">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ghi chú vận hành</p>
                                                <p className="text-[14px] text-gray-600 italic">
                                                    "{order.note || "Không có ghi chú bổ sung"}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'delivery' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-xl border border-black shadow-sm p-4">
                                        <DeliveryProgressSection
                                            variants={processedVariants}
                                            deliveries={deliveries}
                                            isOwner={isOwner || canModerate}
                                            isCustomer={isCustomer}
                                            onAddDelivery={() => setIsRecordDeliveryModalOpen(true)}
                                            onConfirmDelivery={(idx) => {
                                                const newDeliveries = [...deliveries];
                                                newDeliveries[idx].isConfirmed = true;
                                                setDeliveries(newDeliveries);
                                                toast.success('Đã xác nhận nhận hàng thành công!');
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'materials' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-xl border border-black shadow-sm overflow-hidden">
                                        <div className="px-8 py-5 border-b border-gray-50 flex items-center gap-3 bg-gray-50/30">
                                            <Package size={18} className="text-[#1e6e43]" />
                                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Nguyên vật liệu dự kiến</h2>
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
                            <div className="rounded-xl border border-black bg-white shadow-sm p-8 space-y-8 sticky top-8">
                                {canModerate && customerProfile && (
                                    <div className="pb-8 border-b border-black">
                                        <CustomerInfoCard order={order} profile={customerProfile} />
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <DesignTemplatesSection templates={templates} title="TÀI LIỆU ĐÍNH KÈM" />
                                </div>
                                <div className="flex flex-col gap-3 pt-6 border-t border-gray-100">
                                    <button onClick={() => setIsCommentModalOpen(true)} className="h-12 flex items-center justify-center gap-3 rounded-xl bg-white border border-black text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                                        <MessageSquare size={18} className="text-[#1e6e43]" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Thảo luận</span>
                                    </button>
                                    <button onClick={() => setIsHistoryModalOpen(true)} className="h-12 flex items-center justify-center gap-3 rounded-xl bg-white border border-black text-gray-500 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                                        <History size={18} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Lịch sử</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-full bg-[#1e6e43] text-white shadow-2xl hover:scale-105 transition-transform active:scale-95 group">
                <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-bold tracking-tight">Hỏi trợ lý</span>
            </button>

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
            {
                showDenyConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Hủy đơn hàng?</h3>
                            <p className="text-sm text-gray-500 mb-8">Bạn có chắc muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowDenyConfirm(false)} className="px-6 py-2 text-[10px] font-bold uppercase text-gray-400 hover:text-gray-900 transition-colors">Quay lại</button>
                                <button onClick={handleCustomerDenyOrder} disabled={denyLoading} className="px-6 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-bold uppercase hover:bg-rose-700 shadow-md transition-colors">{denyLoading ? '...' : 'Xác nhận hủy'}</button>
                            </div>
                        </div>
                    </div>
                )
            }
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
        </OwnerLayout >
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
