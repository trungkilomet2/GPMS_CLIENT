import { CheckCircle2, X } from "lucide-react";

export default function OrderSuccessModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Tạo đơn hàng thành công",
  description = "Đơn hàng đã được ghi nhận trong hệ thống.",
  confirmText = "Về danh sách đơn",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div className="flex gap-3">
            <div className="p-2.5 rounded-xl border bg-emerald-50 text-emerald-600 border-emerald-100">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {description && <p className="text-sm text-slate-500">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2 rounded-b-2xl">
          <button
            onClick={onConfirm || onClose}
            className="px-6 py-2 text-white font-semibold rounded-xl transition-all bg-emerald-600 hover:bg-emerald-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
