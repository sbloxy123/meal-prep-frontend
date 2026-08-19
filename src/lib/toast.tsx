"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Undo toast (§8.4). Deleting an item is optimistic: the item disappears and a
// toast offers Undo for ~6s. If undone, onUndo restores it and nothing is
// persisted. If the toast expires, onCommit runs (the real delete). This keeps
// deletes reversible without needing a backend "restore".
interface UndoToastSpec {
  message: string;
  onUndo: () => void;
  onCommit: () => void;
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  duration: number;
  onUndo?: () => void;
  onCommit?: () => void;
}

interface ToastValue {
  showUndo: (spec: UndoToastSpec) => void;
  /** A plain, auto-dismissing confirmation toast (no undo). */
  show: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showUndo = useCallback((spec: UndoToastSpec) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, duration: 6000, ...spec }]);
  }, []);

  const show = useCallback((message: string, duration = 4000) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showUndo, show }}>
      {children}
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onRemove={remove} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      toast.onCommit?.();
      onRemove(toast.id);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div className="toast" role="status">
      <span className="toast-msg">{toast.message}</span>
      {toast.onUndo && (
        <button
          type="button"
          className="btn btn-ghost toast-undo"
          onClick={() => {
            toast.onUndo?.();
            onRemove(toast.id);
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
