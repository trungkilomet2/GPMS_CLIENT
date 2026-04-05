import { useEffect, useState } from "react";
import { X, AlertTriangle, ClipboardCheck } from "lucide-react";

export default function OrderStatusReasonModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  confirmText = "Xác nhận",
  loading = false,
  tone = "warning",
  requireReason = true,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const icon =
    tone === "danger" ? (
      <AlertTriangle size={22} />
    ) : (
      <ClipboardCheck size={22} />
    );

  const toneStyles =
    tone === "danger"
      ? {
        badge: "bg-red-50 text-red-600 border-red-100",
        button: "bg-red-600 hover:bg-red-700",
        border: "focus:ring-red-500 focus:border-red-500",
      }
      : {
        badge: "bg-amber-50 text-amber-600 border-amber-100",
        button: "bg-amber-600 hover:bg-amber-700",
        border: "focus:ring-amber-500 focus:border-amber-500",
      };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (requireReason && !trimmed) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    if (requireReason && trimmed.length < 5) {
      setError("Lý do quá ngắn (tối thiểu 5 ký tự).");
      return;
    }
    if (trimmed.length > 150) {
      setError("Lý do không được vượt quá 150 ký tự.");
      return;
    }
    onSubmit?.(requireReason ? trimmed : "");
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start text-left">
          <div className="flex gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${toneStyles.badge}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {title || "Cập nhật trạng thái"}
              </h3>
              {description && (
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors shrink-0"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {requireReason && (
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-left">
                Lý do <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-bold ${reason.length < 5 || reason.length > 150 ? 'text-red-500' : 'text-slate-400'}`}>
                {reason.length}/150
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              rows={4}
              maxLength={150}
              placeholder="Nhập lý do (từ 5 đến 150 ký tự)..."
              className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 ${toneStyles.border} ${error ? 'border-red-300 bg-red-50/30' : ''}`}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle size={14} />
                <p className="text-xs font-bold uppercase">{error}</p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-2 text-white font-semibold rounded-xl transition-all disabled:opacity-60 ${toneStyles.button}`}
            disabled={loading}
          >
            {loading ? "Đang gửi..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
