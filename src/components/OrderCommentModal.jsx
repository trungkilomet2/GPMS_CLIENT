import React from 'react';
import { X, MessageSquare, Send } from 'lucide-react';

export default function OrderCommentModal({ isOpen, onClose, orderId }) {
    if (!isOpen) return null;

    // Mock dữ liệu bình luận (Sau này sẽ gọi API theo orderId)
    const comments = [
        { id: 1, author: "Nguyễn Văn A", time: "10:30 AM - 05/02/2024", content: "Đơn hàng này cần ưu tiên vì khách hàng yêu cầu gấp." },
        { id: 2, author: "Trần Thị B", time: "02:15 PM - 05/02/2024", content: "Đã kiểm tra vật liệu, tất cả đều sẵn sàng trong kho." },
        { id: 3, author: "Lê Văn C", time: "04:45 PM - 05/02/2024", content: "Cần xác nhận lại màu sắc với khách hàng trước khi sản xuất." },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Bình luận đơn hàng</h3>
                            <p className="text-sm text-gray-500">Đơn hàng #{orderId} - {comments.length} bình luận</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Danh sách bình luận (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/50 flex-1">
                    {comments.map((comment) => (
                        <div key={comment.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="font-bold text-gray-800 text-sm">{comment.author}</span>
                                <span className="text-xs text-gray-400">{comment.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                        </div>
                    ))}
                </div>

                {/* Footer: Thêm bình luận mới */}
                <div className="p-6 border-t bg-white rounded-b-2xl">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Thêm bình luận mới</label>
                    <textarea
                        className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                        rows="3"
                        placeholder="Nhập nội dung bình luận của bạn..."
                    ></textarea>

                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            Đóng
                        </button>
                        <button
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            <Send size={16} /> Gửi bình luận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}