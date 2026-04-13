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
import { getOrderCustomerId, getOrderCustomerInfo } from '@/lib/orders/customerInfo';
import { getOrderStatusStyle, normalizeOrderStatus } from '@/lib/orders/status';
import OrderService from '@/services/OrderService';
import ProductionPartService from '@/services/ProductionPartService';
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
import { processOrderVariants } from '@/lib/orders/variants';
import OrderSpecificationCard from '@/components/orders/OrderSpecificationCard';
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
    const [deliveries, setDeliveries] = useState([]);
    const [criticalIssues, setCriticalIssues] = useState([]);
    const [linkedProductionId, setLinkedProductionId] = useState(null);

    const user = getStoredUser();
    const roles = splitRoles(user?.role);
    const isOwner = hasAnyRole(roles, ['owner']);
    const isAdmin = hasAnyRole(roles, ['admin']);
    const isCustomer = hasAnyRole(roles, ['customer']);
    const canModerate = isOwner || isAdmin;

    // --- EFFECTS ---
    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            const response = await OrderService.getOrderDetail(id);
            console.log('Order Detail Response:', response);
            const orderData = response.data.data || response.data;
            setOrder(orderData);
            
            // 1. First try fetching from dedicated delivery history API
            try {
                const deliveryRes = await ProductionPartService.getDeliveryHistory(id);
                const apiDeliveries = deliveryRes.data.data || deliveryRes.data || [];
                setDeliveries(apiDeliveries);
            } catch (delErr) {
                console.warn('Could not fetch dedicated delivery history, falling back to order object:', delErr);
                // 2. Fallback to extracting from order object
                const fallbackDeliveries = 
                    orderData.orderDeliveries || 
                    orderData.deliveries || 
                    orderData.order_details?.flatMap(d => d.deliveries || []) || [];
                setDeliveries(fallbackDeliveries);
            }
            
            setError(null);
        } catch (err) {
            console.error('Lỗi khi tải chi tiết đơn hàng:', err.response?.data || err.message);
            const serverMsg = typeof err.response?.data === 'string' ? err.response.data : (err.response?.data?.message || err.response?.data?.detail);
            setError(serverMsg || getErrorMessage(err, "Không thể tải thông tin đơn hàng."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchOrderDetail();
    }, [id]);


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
                if (isMounted) {
                    setHasProduction(exists);
                    if (exists) {
                        const found = list.find(item => String(item?.order?.id ?? item?.orderId) === String(orderId));
                        setLinkedProductionId(found?.productionId ?? found?.id);
                    }
                }
            } catch (err) {
                console.error('Error checking existing production:', err);
            } finally {
                if (isMounted) setIsCheckingProduction(false);
            }
        };
        checkExistingProduction();
        return () => { isMounted = false; };
    }, [order?.id, id]);

    useEffect(() => {
        if (!linkedProductionId) return;
        const fetchIssues = async () => {
            try {
                const response = await ProductionService.getProductionIssues(linkedProductionId);
                const allIssues = response?.data?.data ?? response?.data ?? [];
                // ONLY filter issues that are confirmed as "UNFIXABLE" (Status 4)
                const unfixable = allIssues.filter(issue => 
                    String(issue.status) === "4" && 
                    issue.quantity > 0
                );
                setCriticalIssues(unfixable);
            } catch (err) {
                console.error('Error fetching production issues:', err);
            }
        };
        fetchIssues();
    }, [linkedProductionId]);

    const workshopErrorQuantity = criticalIssues.reduce((sum, issue) => sum + (issue.quantity || 0), 0);
    const finalQuantity = Math.max(0, (order?.quantity || 0) - workshopErrorQuantity);

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
    const canEdit = isCustomer && isOrderOwner && normalizedStatus === 'Yêu cầu chỉnh sửa';
    const canAccept = (isOwner || isAdmin) && normalizedStatus === 'Chờ xét duyệt';
    const canRequestModification = (isOwner || isAdmin) && normalizedStatus === 'Chờ xét duyệt';
    const canCustomerDeny = isCustomer && isOrderOwner && !isAccepted && !isRejected && !isCanceled && !isProcessing && !isCompleted;

    const processedVariants = processOrderVariants(order);

    // --- HANDLERS ---
    const handleApproveOrder = async () => {
        if (!order?.id && !id) return;
        try {
            setIsUpdatingStatus(true);
            await OrderService.approveOrder(order?.id ?? id);
            toast.success("Đã chấp nhận đơn hàng.");
            setIsApproveModalOpen(false);
            // Re-fetch to update all derived states (buttons, UI, etc)
            await fetchOrderDetail();
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
            toast.success("Đã hủy đơn hàng.");
            setShowDenyConfirm(false);
            await fetchOrderDetail();
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
                                    {(isCustomer || isOwner) && (
                                        <button
                                            onClick={() => {
                                                const target = isOwner ? '/orders/create-manual' : '/orders/create';
                                                navigate(target, { state: { reuseOrder: order } });
                                            }}
                                            className="h-9 px-5 rounded-xl bg-amber-50 border border-black text-[9px] font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-100 active:scale-95 shadow-sm"
                                        >
                                            Tái sử dụng
                                        </button>
                                    )}
                                    {isOwner && isAccepted && !hasProduction && (
                                        <button
                                            onClick={() => navigate(`/production/create/${order.id}`)}
                                            className="h-9 px-5 rounded-xl bg-emerald-600 border border-black text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
                                        >
                                            Tạo đơn sản xuất
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
                                <div className="space-y-8">
                                    <OrderSpecificationCard
                                        order={order}
                                        onImageClick={(url) => { setZoomImageUrl(url); setIsImageModalOpen(true); }}
                                    />

                                    {/* Workshop Quality Summary for Customer & Owner */}
                                    {hasProduction && (
                                        <div className="bg-[#f0f9f4] border border-[#d4e3da] rounded-2xl p-8 relative overflow-hidden group transition-all hover:bg-[#e8f4ec]">
                                            <div className="absolute top-0 right-0 p-8 text-[#1e6e43]/10 group-hover:scale-110 transition-transform">
                                                <AlertCircle size={80} />
                                            </div>
                                            <div className="relative z-10 space-y-6">
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1e6e43] mb-1">Kiểm soát chất lượng xưởng</h3>
                                                    <p className="text-xl font-black text-gray-900 tracking-tight uppercase">Tóm tắt sản lượng thực tế</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tổng đặt hàng</p>
                                                        <p className="text-3xl font-black text-gray-900">{order?.quantity?.toLocaleString()} <span className="text-xs text-gray-400">SP</span></p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Lỗi xưởng khấu trừ</p>
                                                        <p className="text-3xl font-black text-rose-600">-{workshopErrorQuantity.toLocaleString()} <span className="text-xs text-rose-300">SP</span></p>
                                                        {workshopErrorQuantity > 0 && (
                                                            <p className="text-[8px] font-bold text-rose-400 italic font-sans italic">* Phẩn phẩm bị lỗi nghiêm trọng không đủ điều kiện giao hàng</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-[#1e6e43] uppercase tracking-widest">Thực giao dự kiến</p>
                                                        <p className="text-3xl font-black text-[#1e6e43]">{finalQuantity.toLocaleString()} <span className="text-xs text-[#1e6e43]/40">SP</span></p>
                                                    </div>
                                                </div>

                                                {criticalIssues.length > 0 && (
                                                    <div className="pt-6 border-t border-[#1e6e43]/10">
                                                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <AlertTriangle size={12} /> Chi tiết lỗi không thể khắc phục:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {criticalIssues.map((issue, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-gray-600 bg-rose-50/30 p-2 rounded-lg border border-rose-100">
                                                                    <span>{issue.title || issue.description}</span>
                                                                    <span className="text-rose-600">-{issue.quantity} SP</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'delivery' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-white rounded-xl border border-black shadow-sm p-4">
                                        <DeliveryProgressSection
                                            variants={processedVariants}
                                            rawOrderSizes={
                                                order.orderSizes || 
                                                order.orderSize || 
                                                order.sizes || 
                                                order.orderDetails || 
                                                order.orderDetailsList || 
                                                order.order_details || 
                                                []
                                            }
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
                                {canModerate && (order?.userFullName || order?.userPhone || order?.userLocation) && (
                                    <div className="pb-8 border-b border-black">
                                        <CustomerInfoCard
                                            order={order}
                                            className="p-0 border-none bg-transparent shadow-none"
                                        />
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
                            toast.success("Đã gửi yêu cầu chỉnh sửa.");
                            setIsReasonModalOpen(false);
                            await fetchOrderDetail();
                        } catch (err) {
                            toast.error("Gửi yêu cầu thất bại.");
                        } finally {
                            setIsUpdatingStatus(false);
                        }
                    } else if (pendingStatus === 'Từ chối') {
                        try {
                            setIsUpdatingStatus(true);
                            await OrderService.rejectOrder({ orderId: order.id, reason, userId: user?.userId });
                            toast.success("Đã từ chối đơn hàng.");
                            setIsReasonModalOpen(false);
                            await fetchOrderDetail();
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
                orderId={order.id}
                variants={
                    order.orderSizes || 
                    order.orderSize || 
                    order.sizes || 
                    order.size || 
                    order.orderDetails || 
                    order.orderDetailsList || 
                    order.order_details || 
                    order.variants || 
                    order.variantMatrix ||
                    order.items || 
                    []
                }
                deliveries={deliveries}
                onRefresh={fetchOrderDetail}
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
