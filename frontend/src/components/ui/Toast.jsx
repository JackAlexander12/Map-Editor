import React from 'react';

export default function Toasts({ items = [], onClose }) {
  return (
    <div className="fixed right-3 bottom-3 space-y-2 z-50">
      {items.map(t => (
        <div
          key={t.id}
          className={`rounded shadow px-3 py-2 text-sm border
            ${t.type === 'error' ? 'bg-red-50 border-red-300 text-red-700'
              : t.type === 'success' ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-gray-300 text-gray-800'}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">{t.message}</div>
            <button
              className="text-xs text-gray-500 hover:text-gray-800"
              onClick={() => onClose?.(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

