"use client";

import { useRef, useState, type ReactNode } from "react";
import { useModalA11y } from "@/lib/use-modal";

interface ConfirmDialogProps {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Async — the dialog shows a pending state while it runs and keeps itself
      open with an error if it rejects. On success the parent unmounts it. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  useModalA11y(ref, onClose);

  async function confirm() {
    setPending(true);
    setError(false);
    try {
      await onConfirm();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        ref={ref}
      >
        <h2 id="confirm-title" className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{body}</div>
        {error && (
          <p className="sc-error" role="alert" style={{ margin: 0 }}>
            Something went wrong. Please try again.
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
