import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

/**
 * SuccessModal - Unified version with Emerald Industrial theme
 */
export default function SuccessModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Thành công",
  message = "", // Backward compatibility with message prop
  description = "", // New prop name
  confirmText = "Hoàn tất",
  secondaryText = "Đóng",
  hideSecondary = true,
}) {
  const finalDesc = description || message;

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full flex flex-col border border-black animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          <X size={18} />
        </button>

        <div className="p-8 pb-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl border border-emerald-200 bg-emerald-50 text-[#1e6e43] flex items-center justify-center mb-6">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 leading-tight">
              {title}
            </h3>
            {finalDesc && (
              <p className="text-sm font-medium text-slate-500 italic px-2">
                {finalDesc}
              </p>
            )}
        </div>

        <div className="p-8 pt-4 flex flex-col gap-3">
          <button
            onClick={onConfirm || onClose}
            className="w-full py-3.5 border border-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 bg-[#1e6e43] hover:brightness-110 shadow-sm"
          >
            {confirmText}
          </button>
          
          {!hideSecondary && (
            <button
              onClick={onClose}
              className="w-full py-3 border border-slate-200 text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all font-mono"
            >
              {secondaryText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
