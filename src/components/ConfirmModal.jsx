import { useEffect } from "react";
import { AlertTriangle, Trash2, CheckCircle, Info, HelpCircle } from "lucide-react";
import "@/styles/SuccessModal.css";

/**
 * ConfirmModal
 * @param {string} variant - 'danger' | 'warning' | 'success' | 'info'
 */
export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  description = "Bạn có chắc chắn muốn thực hiện hành động này?",
  primaryLabel = "Xác nhận",
  secondaryLabel = "Hủy",
  onConfirm,
  onClose,
  confirmIcon: ConfirmIconProp,
  showConfirmIcon = true,
  variant = "danger", // default to 'danger' for backward compatibility but encourage override
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

  // Determine icon and color based on variant
  let BigIcon = AlertTriangle;
  let iconClass = "gpms-modal__icon--danger";
  let btnClass = "gpms-modal__btn--primary"; // this often maps to red in current CSS

  if (variant === "success") {
    BigIcon = CheckCircle;
    iconClass = "gpms-modal__icon--success";
    btnClass = "gpms-modal__btn--success";
  } else if (variant === "info" || variant === "warning") {
    BigIcon = variant === "info" ? Info : HelpCircle;
    iconClass = `gpms-modal__icon--${variant}`;
    btnClass = `gpms-modal__btn--${variant}`;
  }

  // Determine the small icon inside the button
  const FinalConfirmIcon = ConfirmIconProp || (variant === "danger" ? Trash2 : null);

  return (
    <div className="gpms-modal" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="gpms-modal__card" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="gpms-modal__x" onClick={onClose} aria-label="Đóng">
          ×
        </button>

        <div className={`gpms-modal__icon ${iconClass}`} aria-hidden="true">
          <BigIcon size={28} strokeWidth={2.5} />
        </div>
        
        <h3 className="gpms-modal__title">{title}</h3>
        {description ? <p className="gpms-modal__desc">{description}</p> : null}

        <div className="gpms-modal__actions">
          <button type="button" className="gpms-modal__btn gpms-modal__btn--ghost" onClick={onClose}>
            {secondaryLabel}
          </button>
          <button type="button" className={`gpms-modal__btn ${btnClass}`} onClick={onConfirm}>
            {showConfirmIcon && FinalConfirmIcon && <FinalConfirmIcon size={18} />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
