import { useEffect, useState } from "react";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

let toastCounter = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let currentToasts: Toast[] = [];

export function showToast(type: Toast["type"], message: string) {
  const id = `toast-${++toastCounter}`;
  currentToasts = [...currentToasts, { id, type, message }];
  listeners.forEach((fn) => fn(currentToasts));

  setTimeout(() => {
    currentToasts = currentToasts.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(currentToasts));
  }, 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };

  const colors = {
    success: { bg: "oklch(20% 0.03 165)", border: "oklch(64% 0.22 165 / 0.3)", text: "oklch(78% 0.18 165)" },
    error: { bg: "oklch(18% 0.03 25)", border: "oklch(55% 0.22 25 / 0.3)", text: "oklch(75% 0.18 25)" },
    info: { bg: "oklch(18% 0.03 250)", border: "oklch(58% 0.23 250 / 0.3)", text: "oklch(78% 0.1 250)" },
    warning: { bg: "oklch(18% 0.03 80)", border: "oklch(78% 0.18 80 / 0.3)", text: "oklch(82% 0.15 80)" },
  };

  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => {
        const c = colors[toast.type];
        return (
          <div
            key={toast.id}
            className="toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              minWidth: "280px",
              maxWidth: "400px",
              backdropFilter: "blur(12px)",
            }}
            role="alert"
          >
            <span style={{ flexShrink: 0 }}>{icons[toast.type]}</span>
            <p className="text-sm flex-1">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
