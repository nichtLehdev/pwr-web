"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "success", duration),
    [addToast],
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "error", duration),
    [addToast],
  );

  const warning = useCallback(
    (message: string, duration?: number) =>
      addToast(message, "warning", duration),
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => addToast(message, "info", duration),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 200);
  };

  const typeStyles: Record<
    ToastType,
    { bg: string; icon: React.ReactNode; border: string }
  > = {
    // Bedeutung tragen Rand und Icon. Farben auf Kontrast gewählt; „info“ in
    // Tinte, weil Orange auf hellem Grund den Kontrast nicht erreicht.
    success: {
      bg: "bg-paper dark:bg-night-raised",
      border: "border-green-700 dark:border-green-400",
      icon: (
        <CheckCircle className="h-5 w-5 text-green-700 dark:text-green-400" />
      ),
    },
    error: {
      bg: "bg-paper dark:bg-night-raised",
      border: "border-red-700 dark:border-red-400",
      icon: <XCircle className="h-5 w-5 text-red-700 dark:text-red-400" />,
    },
    warning: {
      bg: "bg-paper dark:bg-night-raised",
      border: "border-yellow-600 dark:border-yellow-400",
      icon: (
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      ),
    },
    info: {
      bg: "bg-paper dark:bg-night-raised",
      border: "border-ink dark:border-night-text",
      icon: <Info className="text-ink dark:text-night-text h-5 w-5" />,
    },
  };

  const styles = typeStyles[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border-2 p-4 transition-all duration-200 ease-out ${styles.bg} ${styles.border} ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"} `}
    >
      <div className="shrink-0">{styles.icon}</div>
      <div className="flex-1 pt-0.5">
        <p className="text-ink dark:text-night-text text-sm font-medium">
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        aria-label="Meldung schließen"
        className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text shrink-0 p-1 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-0 z-100 flex flex-col items-end justify-start gap-3 p-4 sm:p-6"
    >
      <div className="flex w-full flex-col items-end gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
