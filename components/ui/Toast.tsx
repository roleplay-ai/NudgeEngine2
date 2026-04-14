'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error:   (msg: string) => void;
    info:    (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#F0FFF4', border: '#23CE68', icon: '✓' },
  error:   { bg: '#FFF3F3', border: '#ED4551', icon: '✕' },
  info:    { bg: '#F0F7FF', border: '#3699FC', icon: 'ℹ' },
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error:   (msg: string) => addToast(msg, 'error'),
    info:    (msg: string) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-semibold shadow-lg animate-[notifSlide_0.3s_ease]"
              style={{ background: c.bg, border: `1.5px solid ${c.border}`, minWidth: 240 }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: c.border }}
              >
                {c.icon}
              </span>
              <span className="text-brand-dark">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
