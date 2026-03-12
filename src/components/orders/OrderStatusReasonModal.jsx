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
          badge: "bg-red-50 text-red-600",
          button: "bg-red-600 hover:bg-red-700",
          border: "focus:ring-red-500 focus:border-red-500",
        }
      : {
          badge: "bg-amber-50 text-amber-600",
          button: "bg-amber-600 hover:bg-amber-700",
          border: "focus:ring-amber-500 focus:border-amber-500",
        };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    onSubmit?.(trimmed);
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col">
        <div className="p-5 border-b flex justify-between items-start">
          <div className="flex gap-3">
            <div className={`p-2.5 rounded-xl ${toneStyles.badge}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {title || "Cập nhật trạng thái"}
              </h3>
              {description && (
                <p className="text-sm text-gray-500">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Lý do
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            rows={4}
            placeholder="Nhập lý do cập nhật trạng thái..."
            className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 ${toneStyles.border}`}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t bg-white flex justify-end gap-2 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-all"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-2 text-white font-semibold rounded-lg transition-all disabled:opacity-60 ${toneStyles.button}`}
            disabled={loading}
          >
            {loading ? "Đang gửi..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
