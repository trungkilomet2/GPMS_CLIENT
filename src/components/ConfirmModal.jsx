import React, { useEffect, useState } from "react";
import { X, AlertTriangle, ClipboardCheck, HelpCircle } from "lucide-react";

/**
 * Unified ConfirmModal (Replacing OrderStatusReasonModal)
 * Supports both standard confirmation and reason-based confirmation with Emerald Industrial theme.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm, // Support standard prop
  onSubmit,  // Support reason-based prop
  title = "Xác nhận",
  description = "",
  primaryLabel = "Xác nhận", // Support standard prop
  confirmText = "",          // Support reason-based prop
  secondaryLabel = "Hủy bỏ",
  loading = false,
  variant = "success", // 'danger' | 'warning' | 'success'
  tone = "",           // alias for variant
  requireReason = false,
  confirmIcon = null,  // New support for custom icon
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const finalVariant = tone || variant;
  const finalConfirmText = confirmText || primaryLabel;

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toneStyles =
    finalVariant === "danger"
      ? {
        badge: "bg-rose-50 text-rose-500 border-rose-100",
        button: "bg-rose-500 text-white border-black/10 hover:brightness-105",
        border: "focus:ring-rose-500/20 focus:border-rose-400",
        icon: confirmIcon || <AlertTriangle size={32} strokeWidth={2.5} />
      }
      : finalVariant === "warning"
        ? {
          badge: "bg-amber-50 text-amber-600 border-amber-200",
          button: "bg-amber-500 text-white border-black hover:brightness-110",
          border: "focus:ring-amber-500 focus:border-amber-500",
          icon: confirmIcon || <AlertTriangle size={32} strokeWidth={2.5} />
        }
        : {
          badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
          button: "bg-[#1e6e43] text-white border-black hover:brightness-110",
          border: "focus:ring-emerald-500 focus:border-emerald-500",
          icon: confirmIcon || <ClipboardCheck size={32} strokeWidth={2.5} />
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

    // Call both handlers for maximum compatibility
    if (requireReason) {
      onSubmit?.(trimmed);
      onConfirm?.(trimmed);
    } else {
      onSubmit?.();
      onConfirm?.();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full flex flex-col border border-black animate-in zoom-in-95 duration-200 overflow-hidden relative">
        {/* Header */}
        <div className="p-8 pb-4 flex flex-col items-center text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            disabled={loading}
          >
            <X size={18} />
          </button>

          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-6 shadow-sm ${toneStyles.badge}`}>
            {(() => {
              const IconComponent = toneStyles.icon;
              return React.isValidElement(IconComponent)
                ? IconComponent
                : (IconComponent ? <IconComponent size={32} strokeWidth={2.5} /> : null);
            })()}
          </div>

          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm font-medium text-slate-500 px-4 italic">{description}</p>
          )}
        </div>

        {/* Body - Reason Input */}
        {requireReason && (
          <div className="px-8 py-4 space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Lý do thực hiện <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-bold ${reason.length < 5 || (reason.length > 150) ? 'text-rose-500' : 'text-slate-300'}`}>
                {reason.length}/150
              </span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              maxLength={150}
              placeholder="Vui lòng nhập lý do cụ thể..."
              className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 ${toneStyles.border} ${error ? 'border-rose-300 bg-rose-50/30' : ''}`}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-rose-600 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertTriangle size={14} />
                <p className="text-[10px] font-black uppercase tracking-wider">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-8 pt-4 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3.5 border border-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-sm ${toneStyles.button} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? "Đang xử lý..." : finalConfirmText}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-slate-200 text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all font-mono"
            disabled={loading}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
