'use client';

import { Card } from './ui';

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-5`}>
        <div onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

export function money(n?: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';
}
