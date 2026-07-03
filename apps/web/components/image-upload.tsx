'use client';

import { useState } from 'react';
import { API_BASE, post } from '@/lib/api';
import { Button } from './ui';

// Upload ảnh (mẫu SP / ảnh lỗi QC) → /attachments (FR-017/006-FR-004).
export function ImageUpload({
  objectType,
  objectId,
  orderId,
  onUploaded,
  label = 'Tải ảnh lên',
}: {
  objectType: string;
  objectId: string;
  orderId?: string;
  onUploaded?: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (file.size > 10 * 1024 * 1024) return setErr('File vượt quá 10MB');
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const att = await post('/attachments', { dataUrl, objectType, objectId, orderId });
      onUploaded?.(att.fileUrl);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <label>
        <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          📷 {busy ? 'Đang tải...' : label}
        </span>
      </label>
      {err && <div className="mt-1 text-xs text-rose-600">{err}</div>}
    </div>
  );
}

// Hiển thị ảnh đã lưu (đường dẫn /uploads/... phục vụ từ API origin).
export function fileUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_BASE.replace('/api', '') + url;
}
