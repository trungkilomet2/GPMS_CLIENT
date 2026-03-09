import React, { useState, useEffect } from 'react';
import { X, History, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import OrderService from '@/services/OrderService';

// 1. Định nghĩa bảng ánh xạ tên trường (Mapping)
const fieldLabels = {
    OS_ID: "Mã đơn hàng",
    IMAGE: "Ảnh sản phẩm",
    ORDER_NAME: "Tên đơn hàng",
    TYPE: "Loại sản phẩm",
    SIZE: "Kích thước(Size)",
    COLOR: "Màu sắc",
    START_DATE: "Ngày bắt đầu",
    END_DATE: "Ngày kết thúc",
    QUANTITY: "Số lượng",
    CPU: "CPU",
    NOTE: "Ghi chú",
};

export default function OrderHistoryUpdateModal({ isOpen, onClose, orderId }) {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 2. Hàm bổ trợ để lấy tên hiển thị
    const getFieldLabel = (fieldName) => {
        return fieldLabels[fieldName] || fieldName; // Nếu không có trong mapping thì giữ nguyên tên gốc
    };

    useEffect(() => {
        if (isOpen && orderId) {
            const fetchHistory = async () => {
                try {
                    setLoading(true);
                    setError(null);
                    const response = await OrderService.getUpdateOrderHistory(orderId);
                    setHistoryData(response.data || response);
                } catch (err) {
                    console.error("Lỗi lấy lịch sử:", err);
                    setError("Không thể tải dữ liệu lịch sử chỉnh sửa.");
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, orderId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <History size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Lịch sử chỉnh sửa</h3>
                            <p className="text-sm text-gray-500">
                                Đơn hàng #{orderId} - {!loading && `${historyData.length} lần chỉnh sửa`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Nội dung danh sách */}
                <div className="p-6 overflow-y-auto space-y-6 bg-gray-50/30 flex-1 min-h-75">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 gap-3">
                            <Loader2 className="animate-spin text-purple-600" size={32} />
                            <p className="text-gray-500">Đang lấy dữ liệu...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-red-500 gap-2">
                            <AlertCircle size={32} />
                            <p>{error}</p>
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            Chưa có lịch sử chỉnh sửa cho đơn hàng này.
                        </div>
                    ) : (
                        historyData.map((item) => (
                            <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between mb-4 border-b border-gray-50 pb-2">
                                    <span className="font-bold text-gray-800 text-sm">
                                        {item.author || item.userName || "Người dùng"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {item.time ? new Date(item.time).toLocaleString('vi-VN') : 'N/A'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-12 items-center gap-2">
                                    <div className="col-span-3">
                                        <p className="text-[10px] text-gray-400 mb-1 uppercase font-semibold">Trường sửa</p>
                                        {/* 3. Sử dụng hàm getFieldLabel ở đây */}
                                        <p className="font-bold text-purple-700 text-sm uppercase">
                                            {getFieldLabel(item.fieldName)}
                                        </p>
                                    </div>

                                    <div className="col-span-4 bg-red-50 p-2 rounded-lg text-center">
                                        <p className="text-[10px] text-red-400 uppercase font-semibold">Giá trị cũ</p>
                                        <p className="text-red-600 text-sm line-through truncate" title={item.oldValue}>
                                            {item.oldValue || "Trống"}
                                        </p>
                                    </div>

                                    <div className="col-span-1 flex justify-center text-gray-400">
                                        <ArrowRight size={18} />
                                    </div>

                                    <div className="col-span-4 bg-emerald-50 p-2 rounded-lg text-center border border-emerald-100">
                                        <p className="text-[10px] text-emerald-400 uppercase font-semibold">Giá trị mới</p>
                                        <p className="text-emerald-700 text-sm font-bold truncate" title={item.newValue}>
                                            {item.newValue || "Trống"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}