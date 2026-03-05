import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ArrowLeft, FileText, MessageSquare, History } from 'lucide-react';
import OrderCommentModal from '@/components/OrderCommentModal';
import OrderHistoryUpdateModal from '@/components/OrderHistoryUpdateModal';

// Mock dữ liệu chi tiết đơn hàng
const mockDetail = {
    id: 'DH003',
    product: 'Áo phông',
    size: 'M',
    color: 'Đỏ',
    quantity: 200,
    startDate: '01/03/2024',
    endDate: '10/03/2024',
    price: '20,000/chiếc',
    status: 'pending',
    note: 'Yêu cầu kiểm tra kỹ đường may cổ áo. Khách hàng cần gấp cho sự kiện cuối tháng.',
    customer: 'Khách hàng X',
    materials: [
        { name: 'Vải', qty: 200, uom: 'Mét' },
        { name: 'Cúc áo', qty: 200, uom: 'Cái' },
        { name: 'Chỉ', qty: 20, uom: 'Cuộn' },
        { name: 'Nhãn mác', qty: 200, uom: 'Cái' },
        { name: 'Bao bì đóng gói', qty: 200, uom: 'Cái' },
    ],
    files: [
        { name: 'thiet-ke-ao-phong.pdf', size: '2.4 MB' },
        { name: 'thiet-ke-ao-phong.pdf', size: '2.4 MB' },
    ],
};

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const order = mockDetail; // sau này thay bằng API getOrderById(id)

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
                    <span className="px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">
                        Chờ xác nhận
                    </span>
                </div>

                {/* Thông tin đơn hàng */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Thông tin đơn hàng</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Info label="Mã đơn hàng" value={order.id} />
                        <Info label="Loại đơn hàng" value={order.product} />
                        <Info label="Kích thước" value={order.size} />
                        <Info label="Màu sắc" value={order.color} />
                        <Info label="Số lượng" value={order.quantity} />
                        <Info label="Ngày bắt đầu" value={order.startDate} />
                        <Info label="Ngày kết thúc" value={order.endDate} />
                        <Info label="Giá mong muốn" value={order.price} />
                    </div>
                    <div className="mt-4">
                        <h3 className="text-sm text-gray-500">Ghi chú</h3>
                        <p className="text-gray-700">{order.note}</p>
                    </div>
                </div>

                {/* Mẫu thiết kế */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Mẫu thiết kế</h2>
                    <p className="text-sm text-gray-700 mb-2">Số lượng bản cứng: 2</p>
                    <ul className="space-y-2">
                        {order.files.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                <FileText size={16} className="text-gray-500" />
                                {f.name} <span className="text-gray-400">({f.size})</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Danh sách vật liệu */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Danh sách vật liệu</h2>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Tên vật liệu</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">Số lượng</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">UoM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {order.materials.map((m, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-2">{m.name}</td>
                                    <td className="px-4 py-2">{m.qty}</td>
                                    <td className="px-4 py-2">{m.uom}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsCommentModalOpen(true)} // Mở modal khi click
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    >
                        <MessageSquare size={18} /> Bình luận
                    </button>
                    <button
                        onClick={() => setIsHistoryModalOpen(true)} // Mở modal lịch sử
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 flex items-center gap-2"
                    >
                        <History size={18} /> Lịch sử chỉnh sửa
                    </button>
                    <button className="px-4 py-2 border bg-yellow-300 rounded hover:bg-yellow-500">Chỉnh sửa</button>
                    {/* <button className="px-4 py-2 border rounded hover:bg-gray-100 text-red-600">Từ chối</button>
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">Nhận đơn</button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Hoàn thành, giao đơn</button> */}
                </div>
            </div>
            {/* Gọi Modal ở đây */}
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

function Info({ label, value }) {
    return (
        <div>
            <h3 className="text-sm text-gray-500">{label}</h3>
            <p className="font-medium text-gray-900">{value}</p>
        </div>
    );
}