import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2 } from 'lucide-react';
import CommentService from '@/services/CommentService'; // Đường dẫn service của bạn

export default function OrderCommentModal({ isOpen, onClose, orderId }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Lấy danh sách bình luận từ API
    useEffect(() => {
        if (isOpen && orderId) {
            fetchComments();
        }
    }, [isOpen, orderId]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await CommentService.getCommentsByOrderId(orderId);
            // Giả sử API trả về data trực tiếp hoặc trong response.data
            setComments(response.data || []);
        } catch (error) {
            console.error("Lỗi lấy bình luận:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Xử lý gửi bình luận mới
    const handleSendComment = async () => {
        if (!newComment.trim()) return;

        try {
            setIsSubmitting(true);
            // Giả sử bạn có hàm createComment trong CommentService
            // await CommentService.createComment({ orderId, content: newComment });

            // Sau khi gửi thành công:
            setNewComment("");
            fetchComments(); // Load lại danh sách
        } catch (error) {
            console.error("Lỗi gửi bình luận:", error);
            alert("Không thể gửi bình luận lúc này.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Bình luận đơn hàng</h3>
                            <p className="text-sm text-gray-500">
                                Đơn hàng #{orderId} - {loading ? "..." : comments.length} bình luận
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Danh sách bình luận (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-4 bg-gray-50/50 flex-1 min-h-75px">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                            <Loader2 className="animate-spin text-blue-600 mb-2" />
                            <p className="text-sm text-gray-400">Đang tải bình luận...</p>
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-gray-800 text-sm">{comment.author || "Người dùng"}</span>
                                    <span className="text-xs text-gray-400">
                                        {comment.time || new Date(comment.sendDateTime).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-gray-400 italic text-sm">
                            Chưa có bình luận nào cho đơn hàng này.
                        </div>
                    )}
                </div>

                {/* Footer: Thêm bình luận mới */}
                <div className="p-6 border-t bg-white rounded-b-2xl">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Thêm bình luận mới</label>
                    <textarea
                        className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all disabled:bg-gray-50"
                        rows="3"
                        placeholder="Nhập nội dung bình luận của bạn..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isSubmitting}
                    ></textarea>

                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                            Đóng
                        </button>
                        <button
                            onClick={handleSendComment}
                            disabled={!newComment.trim() || isSubmitting}
                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Gửi bình luận
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}