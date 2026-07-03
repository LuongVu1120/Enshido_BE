'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SALES_CHANNEL_LABELS, SalesChannel } from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', channel: SalesChannel.SHOPEE as string, customerType: 'Lẻ', address: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['customers', q], queryFn: () => get(`/customers?q=${encodeURIComponent(q)}`) });

  async function create() {
    setErr('');
    if (!form.name.trim()) return setErr('Nhập tên khách hàng');
    setSaving(true);
    try {
      await post('/customers', form);
      setOpen(false);
      setForm({ name: '', phone: '', channel: SalesChannel.SHOPEE, customerType: 'Lẻ', address: '' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        actions={<Button onClick={() => setOpen(true)}>+ Thêm khách hàng</Button>}
      />

      <Card className="mb-4 p-3">
        <Input placeholder="Tìm tên / SĐT / mã KH..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="px-4 py-3">Mã KH</th><th>Tên</th><th>SĐT</th><th>Kênh</th><th>Nhóm</th><th>Số đơn</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items?.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="font-semibold text-brand-600 hover:underline">{c.code}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{SALES_CHANNEL_LABELS[c.channel as keyof typeof SALES_CHANNEL_LABELS] ?? c.channel ?? '—'}</td>
                  <td className="px-4 py-3">{c.customerType ?? '—'}</td>
                  <td className="px-4 py-3">{c._count?.orders ?? 0}</td>
                </tr>
              ))}
              {data?.items?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Chưa có khách hàng.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-5">
            <h3 className="mb-4 font-semibold">Thêm khách hàng</h3>
            <div className="space-y-3">
              <Field label="Tên *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="SĐT"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kênh bán">
                  <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    {Object.values(SalesChannel).map((s) => (<option key={s} value={s}>{SALES_CHANNEL_LABELS[s]}</option>))}
                  </Select>
                </Field>
                <Field label="Nhóm khách">
                  <Select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
                    <option>Lẻ</option><option>Sỉ</option><option>VIP</option>
                  </Select>
                </Field>
              </div>
              <Field label="Địa chỉ"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
              {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={create} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
