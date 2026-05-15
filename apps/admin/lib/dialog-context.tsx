'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type DialogVariant = 'info' | 'success' | 'warning' | 'error';
type DialogType = 'alert' | 'confirm';

export type DialogOptions = {
  type?: DialogType;
  title?: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
};

type ActiveDialog = Required<Pick<DialogOptions, 'message'>> &
  Omit<Required<DialogOptions>, 'message'> & {
    open: boolean;
    openedAt: number;
    resolve: (value: boolean) => void;
  };

type DialogApi = {
  alert: (options: Omit<DialogOptions, 'type'> & { type?: 'alert' }) => Promise<void>;
  confirm: (options: Omit<DialogOptions, 'type'> & { type?: 'confirm' }) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

function getDefaultTitle(variant: DialogVariant): string {
  switch (variant) {
    case 'success':
      return 'Success';
    case 'warning':
      return 'Attention';
    case 'error':
      return 'Error';
    default:
      return 'Info';
  }
}

function getVariantClasses(variant: DialogVariant) {
  switch (variant) {
    case 'success':
      return { badge: 'bg-green-100 text-green-800', button: 'bg-green-600 hover:bg-green-700' };
    case 'warning':
      return { badge: 'bg-yellow-100 text-yellow-800', button: 'bg-yellow-600 hover:bg-yellow-700' };
    case 'error':
      return { badge: 'bg-red-100 text-red-800', button: 'bg-red-600 hover:bg-red-700' };
    default:
      return { badge: 'bg-blue-100 text-blue-800', button: 'bg-blue-600 hover:bg-blue-700' };
  }
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);

  const openDialog = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      const variant: DialogVariant = options.variant || 'info';
      const type: DialogType = options.type || 'alert';
      const next: ActiveDialog = {
        open: true,
        type,
        variant,
        title: options.title || getDefaultTitle(variant),
        message: options.message,
        confirmText: options.confirmText || (type === 'confirm' ? 'Confirm' : 'OK'),
        cancelText: options.cancelText || 'Cancel',
        openedAt: Date.now(),
        resolve,
      };

      // Defer mounting the dialog until the current event finishes.
      // Prevents "instant close" when the opening click lands on the overlay.
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => setActive(next));
      } else {
        setTimeout(() => setActive(next), 0);
      }
    });
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: async (options) => {
        await openDialog({ ...options, type: 'alert' });
      },
      confirm: async (options) => {
        return await openDialog({ ...options, type: 'confirm' });
      },
    }),
    [openDialog]
  );

  const close = useCallback(
    (result: boolean) => {
      if (!active) return;
      active.resolve(result);
      setActive(null);
    },
    [active]
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active?.open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                // Prevent "instant dismiss" when the opening click lands on the overlay.
                if (!active) return;
                if (active.type === 'alert') return;
                if (Date.now() - active.openedAt < 350) return;
                close(false);
              }}
            />
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getVariantClasses(
                        active.variant
                      ).badge}`}
                    >
                      {active.variant.toUpperCase()}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-gray-900">{active.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                    aria-label="Close dialog"
                  >
                    ✕
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{active.message}</p>

                <div className="mt-6 flex justify-end gap-3">
                  {active.type === 'confirm' && (
                    <button
                      type="button"
                      onClick={() => close(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      {active.cancelText}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${getVariantClasses(
                      active.variant
                    ).button}`}
                  >
                    {active.confirmText}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}
