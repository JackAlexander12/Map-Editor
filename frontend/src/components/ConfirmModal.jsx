import React, { useEffect } from 'react';
import Button from './ui/button';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };

    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-[min(520px,92vw)] rounded-xl border border-gray-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-3">
          <div className="text-lg font-semibold text-[#ea6300]">{title}</div>
          <button
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 text-sm text-gray-700">
          {message}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-3">
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
