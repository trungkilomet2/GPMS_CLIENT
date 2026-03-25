import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, MessageSquare, Send, Loader2, User } from 'lucide-react';
import CommentService from '@/services/CommentService';
import BASE_URL from '@/lib/apiconfig';
import { getAuthItem, getStoredUser } from '@/lib/authStorage';

const normalizeId = (value) => String(value ?? '').trim();

const getSenderId = (comment) => (
  comment?.fromUserId
  ?? comment?.fromUserID
  ?? comment?.userId
  ?? comment?.userID
  ?? comment?.senderId
  ?? comment?.senderID
  ?? comment?.createdBy
  ?? null
);

const sortBySendTimeAsc = (list) => [...list].sort((a, b) => {
  const at = new Date(a?.sendDateTime ?? 0).getTime();
  const bt = new Date(b?.sendDateTime ?? 0).getTime();
  return at - bt;
});

export default function OrderCommentModal({ isOpen, onClose, orderId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollRef = useRef(null);

  const user = getStoredUser() || {};
  const tokenUserId = getAuthItem('userId');
  const CURRENT_USER_ID = user.userId ?? user.id ?? tokenUserId ?? null;
  const currentUserIdNormalized = normalizeId(CURRENT_USER_ID);
  const currentUserDisplayName = user.fullName ?? user.name ?? user.userName ?? 'Bạn';

  const wsRef = useRef(null);

  const fetchComments = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const response = await CommentService.getCommentsByOrderId(orderId);
      const fetched = Array.isArray(response?.data) ? response.data : [];
      setComments(sortBySendTimeAsc(fetched));
    } catch (error) {
      console.error('Lỗi lấy bình luận:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) fetchComments();
  }, [fetchComments, isOpen, orderId]);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    const base = BASE_URL?.replace(/^http/i, 'ws');
    const token = getAuthItem('token');
    const qs = new URLSearchParams({
      orderId: String(orderId),
      userId: String(CURRENT_USER_ID ?? ''),
      ...(token ? { token } : {}),
    }).toString();
    const wsUrl = (import.meta?.env?.VITE_COMMENT_WS_URL || `${base}/ws/comments`) + `?${qs}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ type: 'subscribe', orderId, userId: CURRENT_USER_ID }));
      } catch (_err) {
        // ignore if server doesn't need subscribe message
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const list = Array.isArray(data) ? data : [data];
        list.forEach((msg) => {
          const msgOrderId = msg.toOrderId ?? msg.orderId ?? msg.OrderId;
          if (String(msgOrderId) !== String(orderId)) return;

          setComments((prev) => {
            const exists = prev.some((c) => c.id && msg.id && c.id === msg.id);
            if (exists) return prev;
            return sortBySendTimeAsc([...prev, msg]);
          });
        });
      } catch (_err) {
        // if server sends plain text, ignore
      }
    };

    ws.onerror = () => {
      // fallback: do nothing, keep manual fetch
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [isOpen, orderId, CURRENT_USER_ID]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, loading]);

  const handleSendComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const parts = formatter.formatToParts(now);
      const getPart = (type) => parts.find((p) => p.type === type)?.value || '00';
      const localDateTime = `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

      const commentPayload = {
        fromUserId: CURRENT_USER_ID,
        fromUserName: currentUserDisplayName,
        toOrderId: orderId,
        content: newComment.trim(),
        sendDateTime: localDateTime,
      };

      await CommentService.createComment(commentPayload);

      setNewComment('');
      setComments((prev) => sortBySendTimeAsc([...prev, commentPayload]));
      await fetchComments();
    } catch (error) {
      console.error('Lỗi gửi bình luận:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <MessageSquare size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold leading-none text-gray-900">Thảo luận đơn hàng</h3>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-500 font-sans">
                Đơn hàng #{orderId} • {comments.length} tin nhắn
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto bg-[#f0f2f5] p-4 font-sans scroll-smooth md:p-6">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Loader2 className="mb-2 animate-spin text-emerald-600" />
              <p className="text-xs font-medium text-gray-400">Đang tải tin nhắn...</p>
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment, index) => {
              const senderId = normalizeId(getSenderId(comment));
              const previousSenderId = normalizeId(getSenderId(comments[index - 1]));
              const isMine = Boolean(senderId) && senderId === currentUserIdNormalized;
              const showName = index === 0 || previousSenderId !== senderId;

              const parsedTime = new Date(comment?.sendDateTime);
              const timeLabel = Number.isNaN(parsedTime.getTime())
                ? '--:--'
                : parsedTime.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });

              return (
                <div key={comment.id || `${senderId}-${index}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`flex max-w-[80%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <span className={`mb-1 flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-widest ${isMine ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {!isMine && <User size={10} />}
                        {isMine ? 'Bạn' : (comment.fromUserName || 'Đối tác')}
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed shadow-sm ${
                        isMine
                          ? 'rounded-tr-none bg-emerald-600 text-white'
                          : 'rounded-tl-none border border-gray-100 bg-white text-gray-800'
                      }`}
                    >
                      {comment.content}
                    </div>

                    <span className="mt-1.5 px-1 text-[10px] font-medium italic text-gray-400">{timeLabel}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-400 opacity-60">
              <MessageSquare size={48} strokeWidth={1} className="mb-3" />
              <p className="text-sm font-medium italic">Bắt đầu cuộc hội thoại cho đơn hàng này</p>
            </div>
          )}
        </div>

        <div className="rounded-b-2xl border-t bg-white p-4">
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 shadow-inner transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-200">
            <textarea
              className="w-full resize-none border-none bg-transparent p-4 text-sm outline-none focus:ring-0 min-h-140px max-h-250px disabled:opacity-50 font-sans"
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
            />

            <div className="flex items-center justify-between border-t border-gray-200/50 p-3">
              <div className="ml-2 text-[10px] font-medium text-gray-400 font-sans">
                <span className="hidden sm:inline">
                  Nhấn <b>Enter</b> gửi • <b>Shift+Enter</b> xuống dòng
                </span>
              </div>
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim() || isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-100 transition-all active:scale-95 hover:bg-emerald-700 disabled:bg-gray-300 disabled:shadow-none font-sans"
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
