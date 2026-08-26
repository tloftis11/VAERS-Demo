import { useEffect } from "react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Generic overlay dialog — closes on Escape or a click outside the card. */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-dialog-title">
        <div className="modal-dialog__header">
          <h2 id="modal-dialog-title" className="modal-dialog__title">
            {title}
          </h2>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-dialog__body">{children}</div>
      </div>
    </div>
  );
}
