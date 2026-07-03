'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { Button, Card, Field, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => get('/inventory/suppliers') });

  async function create() {
    setErr('');
    if (!form.name.trim()) return setErr('Nhập tên NCC');
    setBusy(true);
    try {
      await post('/inventory/suppliers', form);
      setOpen(false); setForm({ name: '', phone: '', address: '', note: '' });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Nhà cung cấp" actions={<Button onClick={() => setOpen(true)}>+ Thêm NCC</Button>} />
      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="px-4 py-3">Mã</th><th>Tên</th><th>SĐT</th><th>Địa chỉ</th><th>Số vật tư</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-brand-600">{s.code}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.address ?? '—'}</td>
                  <td className="px-4 py-3">{s._count?.items ?? 0}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Chưa có nhà cung cấp.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

      {open && (
        <Modal title="Thêm nhà cung cấp" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Tên *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SĐT"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Địa chỉ"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Ghi chú"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={create} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
