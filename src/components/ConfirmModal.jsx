import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import "@/styles/SuccessModal.css";

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  description = "Bạn có chắc chắn muốn thực hiện hành động này? Hành động này không thể hoàn tác.",
  primaryLabel = "Xác nhận xóa",
  secondaryLabel = "Hủy",
  onConfirm,
  onClose,
  confirmIcon: ConfirmIcon = Trash2,
  showConfirmIcon = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="gpms-modal" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="gpms-modal__card" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="gpms-modal__x" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        <div className="gpms-modal__icon gpms-modal__icon--danger" aria-hidden="true">
          <AlertTriangle size={28} strokeWidth={2.5} />
        </div>
        
        <h3 className="gpms-modal__title">{title}</h3>
        {description ? <p className="gpms-modal__desc">{description}</p> : null}

        <div className="gpms-modal__actions">
          <button type="button" className="gpms-modal__btn gpms-modal__btn--ghost" onClick={onClose}>
            {secondaryLabel}
          </button>
          <button type="button" className="gpms-modal__btn gpms-modal__btn--primary" onClick={onConfirm}>
            {showConfirmIcon && ConfirmIcon && <ConfirmIcon size={18} />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
