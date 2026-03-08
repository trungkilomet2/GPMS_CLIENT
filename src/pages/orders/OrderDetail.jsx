import React, { useState, useEffect } from 'react'; // Thêm useEffect
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ArrowLeft, FileText, MessageSquare, History, Loader2 } from 'lucide-react'; // Thêm Loader2
import OrderCommentModal from '@/components/OrderCommentModal';
import OrderHistoryUpdateModal from '@/components/OrderHistoryUpdateModal';
import OrderService from '@/services/OrderService'; // Import Service của bạn

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // 1. Quản lý trạng thái dữ liệu
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // 2. Gọi API khi Component mount
    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                const response = await OrderService.getOrderDetail(id);
                // Giả sử API trả về data nằm trong response.data hoặc response.data.data tùy cấu hình BE của bạn
                setOrder(response.data.data || response.data);
            } catch (err) {
                console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
                setError("Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchOrderDetail();
    }, [id]);

    // 3. Xử lý trạng thái Loading và Error
    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="animate-spin text-emerald-600 mb-2" size={40} />
                    <p className="text-gray-500">Đang tải chi tiết đơn hàng...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !order) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <p className="text-red-500 mb-4">{error || "Không tìm thấy đơn hàng"}</p>
                    <button onClick={() => navigate(-1)} className="text-emerald-600 underline">Quay lại</button>
                </div>
            </DashboardLayout>
        );
    }

    // 4. Render dữ liệu thật
    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded hover:bg-gray-100"
                            aria-label="Quay lại"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Chi tiết đơn hàng <span className="text-emerald-600">#{order.id}</span>
                            </h1>
                            <p className="text-sm text-gray-500">Xem chi tiết 1 đơn hàng</p>
                        </div>
                    </div>
                    {/* Trạng thái nên lấy từ field status của API */}
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusStyle(order.status)}`}>
                        {order.statusName || order.status}
                    </span>
                </div>

                {/* Thông tin đơn hàng */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Info label="Mã đơn hàng" value={`#ID-${order.id}`} />
                        <Info label="Loại sản phẩm" value={order.orderName} />
                        <Info label="Kích thước" value={order.size} />
                        <Info label="Màu sắc" value={order.color} />
                        <Info label="Số lượng" value={order.quantity?.toLocaleString()} />
                        <Info label="Ngày bắt đầu" value={formatDate(order.startDate)} />
                        <Info label="Ngày kết thúc" value={formatDate(order.endDate)} />
                        <Info label="Đơn giá" value={order.cpu} />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-sm text-gray-500">Ghi chú</h3>
                        <p className="text-gray-700">{order.note || "Không có ghi chú"}</p>
                    </div>
                </div>

                {/* Mẫu thiết kế & Vật liệu (Tương tự, map từ mảng trong API) */}
                {/* 2. Cung cấp mẫu (Files & Hardcopies) */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2">Mẫu thiết kế & Tài liệu</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">File bản mềm (PDF, Image)</label>
                            <div className="space-y-2">
                                {/* Hiển thị danh sách file từ API nếu có */}
                                {order.files && order.files.length > 0 ? (
                                    <ul className="divide-y divide-gray-100 border rounded-lg">
                                        {order.files.map((file, idx) => (
                                            <li key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <FileText size={20} className="text-emerald-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">{file.name}</p>
                                                        <p className="text-xs text-gray-400">{file.size}</p>
                                                    </div>
                                                </div>
                                                <button className="text-xs text-emerald-600 hover:underline">Tải về</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-100 rounded-lg p-6 text-center">
                                        <span className="text-sm text-gray-400">Không có file đính kèm</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng bản cứng</label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <span className="text-lg font-bold text-emerald-700">
                                    {order.hardCopy || 0}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">bản</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-400 font-italic italic">* Bản cứng dùng để đối chiếu trực tiếp tại xưởng.</p>
                        </div>
                    </div>
                </div>
                <br />
                {/* ... giữ nguyên logic render mảng nhưng check null/undefined ... */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Danh sách vật liệu</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Tên vật liệu</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Số lượng</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-700">Đơn vị (UoM)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {/* Kiểm tra: Nếu order.materials tồn tại VÀ có độ dài > 0 
                */}
                                {order.materials && order.materials.length > 0 ? (
                                    order.materials.map((m, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 text-gray-900">{m.name}</td>
                                            <td className="px-4 py-2 text-gray-600 font-medium">{m.value}</td>
                                            <td className="px-4 py-2 text-gray-500">{m.uom}</td>
                                        </tr>
                                    ))
                                ) : (
                                    /* Trường hợp mảng rỗng hoặc null/undefined 
                                    */
                                    <tr>
                                        <td colSpan="3" className="px-4 py-10 text-center text-gray-400 italic">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                {/* Bạn có thể thêm icon Package từ lucide-react ở đây */}
                                                <span>Không có dữ liệu vật liệu cho đơn hàng này</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsCommentModalOpen(true)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    >
                        <MessageSquare size={18} /> Bình luận
                    </button>
                    <button
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-2"
                    >
                        <History size={18} /> Lịch sử chỉnh sửa
                    </button>
                    <button
                        onClick={() => navigate(`/orders/edit/${order.id}`)}
                        className="px-4 py-2 border bg-yellow-300 rounded hover:bg-yellow-500 font-medium"
                    >
                        Chỉnh sửa
                    </button>
                </div>
            </div>

            <OrderCommentModal
                isOpen={isCommentModalOpen}
                onClose={() => setIsCommentModalOpen(false)}
                orderId={order.id}
            />
            <OrderHistoryUpdateModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                orderId={order.id}
            />
        </DashboardLayout>
    );
}

// Helper functions để code sạch hơn
function Info({ label, value }) {
    return (
        <div>
            <h3 className="text-sm text-gray-500">{label}</h3>
            <p className="font-medium text-gray-900">{value || "---"}</p>
        </div>
    );
}

function formatDate(dateString) {
    if (!dateString) return "---";
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function getStatusStyle(status) {
    switch (status?.toLowerCase()) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'completed': return 'bg-emerald-100 text-emerald-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}