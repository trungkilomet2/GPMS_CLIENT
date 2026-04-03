import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, FileText, MessageSquare, History,
    Loader2, Edit3, Download, Package, Info
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
import { hasAnyRole, splitRoles } from '@/lib/authRouting';
import OrderImageZoomModal from '@/pages/orders/components/OrderImageZoomModal';
import DesignTemplatesSection from '@/components/orders/DesignTemplatesSection';
import OrderStatusReasonModal from '@/components/orders/OrderStatusReasonModal';
import OwnerLayout from '@/layouts/OwnerLayout';
import ProductionService from '@/services/ProductionService';
import { getProductionStatusLabel } from '@/utils/statusUtils';
import '@/styles/homepage.css';
import '@/styles/leave.css';

function extractRejectReasonFromResponse(response) {
    const root = response?.data?.data ?? response?.data ?? response;
    const payload = Array.isArray(root) ? root[0] : root;
    if (!payload || typeof payload !== 'object') return '';

    const candidateKeys = [
        'reason',
        'rejectReason',
        'statusReason',
        'note',
        'description',
        'content',
        'message',
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
    const user = getStoredUser();
    const roles = splitRoles(user?.role);
    const isOwner = hasAnyRole(roles, ['owner']);
    const isAdmin = hasAnyRole(roles, ['admin']);
    const isCustomer = hasAnyRole(roles, ['customer']);
    const canModerate = isOwner || isAdmin;

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

        return () => {
            isMounted = false;
        };
    }, [order, canModerate]);

    useEffect(() => {
        let isMounted = true;

        const loadRejectReason = async () => {
            const orderId = order?.id ?? id;
            const normalized = normalizeOrderStatus(order?.statusName ?? order?.status);
            const isRejectedOrder = normalized === 'Đã từ chối';

            if (!orderId || !isRejectedOrder) {
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
                setRejectReasonError(null);
            } catch (err) {
                if (!isMounted) return;
                setRejectReason('');
                setRejectReasonError('Không thể tải lý do từ chối.');
                console.error('Không thể tải lý do từ chối đơn hàng:', err);
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

    if (loading) return (
        <OwnerLayout>
            <div className="flex flex-col items-center justify-center min-h-400px">
                <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
                <p className="text-slate-500 text-sm font-medium">Đang truy xuất dữ liệu...</p>
            </div>
        </OwnerLayout>
    );
    if (error) return (
        <OwnerLayout>
            <div className="flex flex-col items-center justify-center min-h-400px">
                <p className="text-red-600 text-sm font-semibold">{error}</p>
            </div>
        </OwnerLayout>
    );

    const templates = order?.templates ?? order?.template ?? order?.files ?? [];
    const orderStatusValue = order?.statusName ?? order?.status;
    const orderOwnerId = getOrderCustomerId(order);
    const currentUserId = user?.userId ?? user?.id ?? null;
    const canEdit =
        orderOwnerId && currentUserId && String(orderOwnerId) === String(currentUserId);
    const normalizedStatus = normalizeOrderStatus(orderStatusValue);
    const canRequestModification = normalizedStatus === 'Chờ xét duyệt';
    const canEditOnlyWhenRequested = normalizedStatus === 'Yêu cầu chỉnh sửa';
    const isRejected = normalizedStatus === 'Đã từ chối';
    const isAccepted = normalizedStatus === 'Đã chấp nhận';
    const isCanceled = normalizedStatus === 'Đã hủy';
    const isProcessing = normalizedStatus === 'Đang sản xuất';
    const canCancelOrder = normalizedStatus === 'Chờ xét duyệt';
    const canAccept = normalizedStatus === 'Chờ xét duyệt';
    const isCompleted = normalizedStatus === 'Đã hoàn thành';
    const canCustomerDeny = isCustomer && canEdit && !isAccepted && !isRejected && !isCanceled && !isProcessing && !isCompleted;

    const updateOrderStatus = async (nextStatus, reason = '') => {
        if (!order?.id) return;
        try {
            setIsUpdatingStatus(true);
            const normalizedReason = reason ?? '';
            const payload = {
                ...order,
                status: nextStatus,
                reason: normalizedReason,
                statusReason: normalizedReason,
            };
            await OrderService.updateOrder(order.id, payload);
            setOrder((prev) => ({ ...prev, status: nextStatus }));
        } catch (err) {
            console.error('Lỗi cập nhật trạng thái:', err);
            toast.error(getErrorMessage(err, 'Không thể cập nhật trạng thái đơn hàng.'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleApproveOrder = async () => {
        if (!order?.id && !id) return;
        try {
            setIsUpdatingStatus(true);
            await OrderService.approveOrder(order?.id ?? id);
            setOrder((prev) => (prev ? { ...prev, status: 'Đã chấp nhận' } : prev));
        } catch (err) {
            console.error('Lỗi chấp nhận đơn hàng:', err);
            toast.error(getErrorMessage(err, 'Không thể chấp nhận đơn hàng.'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const openReasonModal = (status) => {
        setPendingStatus(status);
        setIsReasonModalOpen(true);
    };

    const handleCustomerDenyOrder = async () => {
        if (!order?.id && !id) {
            setDenyError('Không tìm thấy mã đơn hàng để hủy.');
            return;
        }
        const orderId = order?.id ?? id;
        setDenyLoading(true);
        setDenyError(null);
        setDenySuccess(null);
        try {
            await OrderService.denyOrder(orderId);
            setDenySuccess(`Đã hủy đơn hàng #ĐH-${orderId}.`);
            setShowDenyConfirm(false);
            setOrder((prev) => (prev ? { ...prev, status: 'Đã hủy' } : prev));
        } catch (err) {
            setDenyError(getErrorMessage(err, 'Hủy đơn hàng thất bại.'));
        } finally {
            setDenyLoading(false);
        }
    };

    return (
        <OwnerLayout>
            <div className="leave-page leave-list-page">
                <div className="leave-shell mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <button onClick={() => navigate('/orders')}
                                className="cursor-pointer mt-1 rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className="flex flex-col gap-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                                    Chi tiết đơn hàng #{order.id}
                                </h1>
                                <p className="text-slate-600">Theo dõi thông tin đơn hàng và trạng thái xử lý.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${getOrderStatusStyle(orderStatusValue, 'detail')}`}>
                                {order.statusName || order.status}
                            </span>
                            {canCustomerDeny && (
                                <button type="button"
                                    onClick={() => setShowDenyConfirm(true)}
                                    className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Hủy đơn hàng
                                </button>
                            )}
                            {canModerate && !isRejected && normalizeOrderStatus(order.status) === 'Đã chấp nhận' && !hasProduction && (
                                <button type="button"
                                    onClick={() => {
                                        if (isCheckingProduction) return;
                                        navigate(`/production/create/${order.id}`);
                                    }}
                                    disabled={isCheckingProduction}
                                    className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCheckingProduction ? "Đang kiểm tra..." : "Tạo production"}
                                </button>
                            )}
                            {canModerate && (
                                <>
                                    {!isRejected && !isAccepted && !isProcessing && !isCanceled && canAccept && (
                                        <button type="button"
                                            disabled={isUpdatingStatus}
                                            onClick={() => {
                                                if (isUpdatingStatus) return;
                                                setIsApproveModalOpen(true);
                                            }}
                                            className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Chấp nhận
                                        </button>
                                    )}
                                    {!isRejected && !isAccepted && !isProcessing && !isCanceled && (
                                        <button type="button"
                                            disabled={isUpdatingStatus}
                                            onClick={() => {
                                                if (isUpdatingStatus) return;
                                                openReasonModal('Từ chối');
                                            }}
                                            className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                        >
                                            Từ chối
                                        </button>
                                    )}
                                    {!isRejected && !isAccepted && !isProcessing && !isCanceled && canRequestModification && (
                                        <button type="button"
                                            disabled={isUpdatingStatus}
                                            onClick={() => {
                                                if (isUpdatingStatus) return;
                                                openReasonModal('Yêu cầu chỉnh sửa');
                                            }}
                                            className="cursor-pointer rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Yêu cầu chỉnh sửa
                                        </button>
                                    )}
                                </>
                            )}
                            {canEdit && canEditOnlyWhenRequested && (
                                <button onClick={() => {
                                    navigate(`/orders/edit/${order.id}`, { state: { order } });
                                }}
                                    className="cursor-pointer flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Edit3 size={16} /> Chỉnh sửa
                                </button>
                            )}
                        </div>
                    </div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {(denyError || denySuccess) && (
                            <div
                                className={`lg:col-span-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${denyError
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }`}
                            >
                                {denyError || denySuccess}
                            </div>
                        )}
                        {/* KHỐI THÔNG TIN CHI TIẾT (2/3) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                                    <Info size={16} />
                                    <h2 className="text-xs font-bold uppercase tracking-widest">Thông tin tổng quát đơn hàng</h2>
                                </div>

                                <div className="px-5 py-4 border-b border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-3">Ảnh đơn hàng</div>
                                    <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                                        <div className="w-32 h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-sm relative group">
                                            {order.image ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { setZoomImageUrl(order.image); setIsImageModalOpen(true); }}
                                                    className="w-full h-full cursor-zoom-in"
                                                    title="Click để xem & zoom ảnh"
                                                >
                                                    <img src={order.image} alt="" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-[10px] text-white font-semibold">Click để zoom</span>
                                                    </div>
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-slate-400">-</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 leading-relaxed">
                                            Ảnh tham khảo tổng quan đơn hàng, dùng để kiểm tra nhanh trước khi sản xuất.
                                        </div>
                                    </div>
                                </div>

                                {/* Layout Grid 2 cột cho thông tin chi tiết */}
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-100 font-sans">
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
                                        <DetailItem label="Ngày bắt đầu" value={formatOrderDate(order.startDate)} />
                                        <DetailItem label="Ngày kết thúc" value={formatOrderDate(order.endDate)} />
                                    </div>
                                </div>

                                {/* Ghi chú chiếm toàn bộ chiều ngang phía dưới */}
                                <div className="p-5 border-t border-slate-100 bg-amber-50/30">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú</p>
                                    <p className="text-sm text-slate-700 leading-relaxed italic">
                                        {order.note ? `"${order.note}"` : "Không có ghi chú bổ sung cho đơn hàng này."}
                                    </p>
                                </div>
                            </div>

                            {/* Bảng vật liệu - Thực dụng và rõ ràng */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 text-slate-600">
                                    <Package size={16} />
                                    <h2 className="text-xs font-bold uppercase tracking-widest">Danh sách vật liệu sản xuất</h2>
                                </div>
                                <MaterialsTable
                                    materials={order.materials ?? []}
                                    variant="detail"
                                    showImage
                                    emptyText={MATERIALS_TABLE_EMPTY_TEXT.detail}
                                    onImageClick={(url) => {
                                        if (!url) return;
                                        setZoomImageUrl(url);
                                        setIsImageModalOpen(true);
                                    }}
                                />
                            </div>
                        </div>

                        {/* CỘT PHẢI (1/3): FILE & THẢO LUẬN */}
                        <div className="space-y-6">
                            {canModerate && (
                                <CustomerInfoCard
                                    order={order}
                                    profile={customerProfile}
                                    title="Thông tin người đặt hàng"
                                    nameLabel="Họ và tên"
                                    phoneLabel="Số điện thoại"
                                    addressLabel="Địa chỉ"
                                    showHeaderIcon
                                    rowClassName="flex items-start justify-between gap-3"
                                />
                            )}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
                                <DesignTemplatesSection 
                                    templates={templates} 
                                    title="File & Thiết kế đính kèm"
                                />
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => setIsCommentModalOpen(true)}
                                    className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 text-sm font-bold"
                                >
                                    <MessageSquare size={16} /> Thảo luận đơn hàng
                                </button>
                                <button onClick={() => setIsHistoryModalOpen(true)}
                                    className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 text-sm font-medium"
                                >
                                    <History size={16} /> Lịch sử chỉnh sửa
                                </button>
                            </div>

                            {isRejected && (
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Lý do từ chối</p>
                                    <p className="text-sm text-rose-800 leading-relaxed break-words whitespace-pre-wrap">
                                        {rejectReasonLoading
                                            ? 'Đang tải lý do từ chối...'
                                            : rejectReason || rejectReasonError || 'Không có lý do từ chối.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <OrderCommentModal isOpen={isCommentModalOpen} onClose={() => setIsCommentModalOpen(false)} orderId={order?.id ?? id} />
            <OrderHistoryUpdateModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} orderId={order?.id ?? id} />
            <OrderImageZoomModal
                isOpen={isImageModalOpen}
                imageUrl={zoomImageUrl}
                onClose={() => { setIsImageModalOpen(false); setZoomImageUrl(""); }}
            />
            <OrderStatusReasonModal
                isOpen={isReasonModalOpen}
                onClose={() => setIsReasonModalOpen(false)}
                onSubmit={async (reason) => {
                    if (pendingStatus === 'Yêu cầu chỉnh sửa') {
                        try {
                            setIsUpdatingStatus(true);
                            await OrderService.requestOrderModification(order?.id ?? id, { reason });
                            setOrder((prev) => ({ ...prev, status: pendingStatus }));
                        } catch (err) {
                            console.error('Lỗi yêu cầu chỉnh sửa:', err);
                            toast.error(getErrorMessage(err, 'Không thể gửi yêu cầu chỉnh sửa.'));
                        } finally {
                            setIsUpdatingStatus(false);
                        }
                        setIsReasonModalOpen(false);
                        return;
                    }
                    if (pendingStatus === 'Từ chối') {
                        try {
                            setIsUpdatingStatus(true);
                            await OrderService.rejectOrder({
                                orderId: order?.id ?? id,
                                reason,
                                userId: user?.userId ?? user?.id ?? null,
                            });
                            setOrder((prev) => ({ ...prev, status: pendingStatus }));
                            setRejectReason(reason?.trim() || '');
                            setRejectReasonError(null);
                        } catch (err) {
                            console.error('Lỗi từ chối đơn hàng:', err);
                            toast.error(getErrorMessage(err, 'Không thể từ chối đơn hàng.'));
                        } finally {
                            setIsUpdatingStatus(false);
                        }
                        setIsReasonModalOpen(false);
                        return;
                    }
                    await updateOrderStatus(pendingStatus, reason);
                    setIsReasonModalOpen(false);
                }}
                title={pendingStatus === 'Từ chối' ? 'Từ chối đơn hàng' : 'Yêu cầu chỉnh sửa'}
                description={pendingStatus === 'Từ chối'
                    ? 'Vui lòng nhập lý do từ chối để khách hàng nắm rõ.'
                    : 'Bạn có chắc muốn gửi yêu cầu chỉnh sửa đơn hàng này không?'}
                confirmText={pendingStatus === 'Từ chối' ? 'Xác nhận từ chối' : 'Xác nhận yêu cầu'}
                loading={isUpdatingStatus}
                tone={pendingStatus === 'Từ chối' ? 'danger' : 'warning'}
                requireReason={pendingStatus === 'Từ chối'}
            />
            <OrderStatusReasonModal
                isOpen={isApproveModalOpen}
                onClose={() => setIsApproveModalOpen(false)}
                onSubmit={async () => {
                    await handleApproveOrder();
                    setIsApproveModalOpen(false);
                }}
                title="Chấp nhận đơn hàng"
                description="Bạn có chắc muốn chấp nhận đơn hàng này không?"
                confirmText="Xác nhận"
                loading={isUpdatingStatus}
                tone="warning"
                requireReason={false}
            />

            {showDenyConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center gap-3 text-rose-600">
                            <Info size={18} />
                            <h3 className="text-lg font-semibold text-slate-900">Xác nhận hủy đơn hàng</h3>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                            Bạn có chắc muốn hủy đơn hàng #{order?.id ?? id} không?
                        </p>
                        <div className="mt-5 flex flex-wrap justify-end gap-3">
                            <button type="button"
                                onClick={() => setShowDenyConfirm(false)}
                                disabled={denyLoading}
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                            >
                                Hủy
                            </button>
                            <button type="button"
                                onClick={handleCustomerDenyOrder}
                                disabled={denyLoading}
                                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:bg-rose-300"
                            >
                                {denyLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </OwnerLayout>
    );
}

// Sub-component hiển thị từng dòng thông tin
function DetailItem({ label, value, isBold = false, isEmerald = false }) {
    const displayValue = value === null || value === undefined || value === '' ? '-' : value;
    return (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
            <span className={`text-sm ${isBold ? 'font-bold text-slate-900' : 'font-medium text-slate-700'} ${isEmerald ? 'text-emerald-700 font-bold' : ''}`}>
                {displayValue}
            </span>
        </div>
    );
}
