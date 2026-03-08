import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Loader2, User } from 'lucide-react';
import CommentService from '@/services/CommentService';

export default function OrderCommentModal({ isOpen, onClose, orderId }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const CURRENT_USER_ID = user.id || 1;

    useEffect(() => {
        if (isOpen && orderId) {
            fetchComments();
        }
    }, [isOpen, orderId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments, loading]);

    const fetchComments = async () => {
        try {
            setLoading(true);
            const response = await CommentService.getCommentsByOrderId(orderId);
            setComments(response.data || []);
        } catch (error) {
            console.error("Lỗi lấy bình luận:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- HÀM TẠO CHUỖI THỜI GIAN LOCAL CHÍNH XÁC ---
    const getLocalISOString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - offset);
        // Thay thế toISOString bằng cách thủ công hoặc xử lý chuỗi để giữ nguyên giờ địa phương
        return new Date(now.getTime() - offset).toISOString().replace('Z', '');
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || isSubmitting) return;

        try {
            setIsSubmitting(true);

            // --- LẤY THỜI GIAN HIỆN TẠI THEO MÚI GIỜ VIỆT NAM ---
            const now = new Date();

            // Format sang chuỗi ISO cục bộ cho Việt Nam (YYYY-MM-DDTHH:mm:ss)
            const formatter = new Intl.DateTimeFormat('sv-SE', { // 'sv-SE' trả về định dạng gần giống ISO: YYYY-MM-DD HH:mm:ss
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            const parts = formatter.formatToParts(now);
            const getPart = (type) => parts.find(p => p.type === type).value;

            // Tạo chuỗi đúng định dạng LocalDateTime cho Backend (ISO 8601 không có Z)
            const localDateTime = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

            const commentPayload = {
                fromUserId: CURRENT_USER_ID,
                toOrderId: orderId,
                content: newComment.trim(),
                sendDateTime: localDateTime // Kết quả sẽ luôn là giờ VN: ví dụ 2024-05-20T23:57:00
            };

            await CommentService.createComment(commentPayload);

            setNewComment("");
            await fetchComments();
        } catch (error) {
            console.error("Lỗi gửi bình luận:", error);
            alert("Không thể gửi tin nhắn. Vui lòng thử lại!");
        } finally {
            setIsSubmitting(false);
        }
    };
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[85vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-white rounded-t-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <MessageSquare size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 text-base leading-none">Thảo luận đơn hàng</h3>
                            <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-medium font-sans">
                                Đơn hàng #{orderId} • {comments.length} tin nhắn
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Nội dung Chat */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#f0f2f5] scroll-smooth font-sans">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="animate-spin text-emerald-600 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">Đang tải tin nhắn...</p>
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map((comment, index) => {
                            const isMine = comment.fromUserId === CURRENT_USER_ID;
                            const showName = index === 0 || comments[index - 1].fromUserId !== comment.fromUserId;

                            return (
                                <div key={comment.id || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                        {showName && (
                                            <span className={`text-[10px] font-bold mb-1 px-1 flex items-center gap-1 uppercase tracking-widest ${isMine ? 'text-emerald-700' : 'text-gray-500'}`}>
                                                {!isMine && <User size={10} />}
                                                {isMine ? "Bạn" : (comment.fromUserName || "Đối tác")}
                                            </span>
                                        )}
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed text-left ${isMine
                                            ? 'bg-emerald-600 text-white rounded-tr-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                            }`}>
                                            {comment.content}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1.5 px-1 font-medium italic">
                                            {new Date(comment.sendDateTime).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: false
                                            })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                            <MessageSquare size={48} strokeWidth={1} className="mb-3" />
                            <p className="text-sm italic font-medium">Bắt đầu cuộc hội thoại cho đơn hàng này</p>
                        </div>
                    )}
                </div>

                {/* Input nhập tin nhắn */}
                <div className="p-4 border-t bg-white rounded-b-2xl">
                    <div className="flex flex-col gap-2 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200 transition-all shadow-inner">
                        <textarea
                            className="w-full bg-transparent border-none p-4 text-sm focus:ring-0 outline-none resize-none min-h-140px max-h-250px disabled:opacity-50 font-sans"
                            placeholder="Nhập nội dung phản hồi hoặc ghi chú đơn hàng..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendComment();
                                }
                            }}
                            disabled={isSubmitting}
                        ></textarea>

                        <div className="flex justify-between items-center p-3 border-t border-gray-200/50">
                            <div className="text-[10px] text-gray-400 ml-2 font-medium font-sans">
                                <span className="hidden sm:inline">Nhấn <b>Enter</b> gửi • <b>Shift+Enter</b> xuống dòng</span>
                            </div>
                            <button
                                onClick={handleSendComment}
                                disabled={!newComment.trim() || isSubmitting}
                                className="px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95 transition-all disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide font-sans"
                            >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Gửi trao đổi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}