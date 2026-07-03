'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  EDITABLE_ORDER_STATUSES,
  ORDER_PRIORITY_LABELS,
  ORDER_TYPE_LABELS,
  OrderPriority,
  OrderStatus,
  OrderType,
  SALES_CHANNEL_LABELS,
  SalesChannel,
} from '@enshido/types';
import { get, put } from '@/lib/api';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { RichText } from '@/components/rich-text';

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: order, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => get(`/orders/${id}`) });

  const [form, setForm] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setForm({
        name: order.name ?? '',
        salesChannel: order.salesChannel ?? SalesChannel.SHOPEE,
        orderType: order.orderType ?? OrderType.MADE_TO_ORDER,
        priority: order.priority ?? OrderPriority.NORMAL,
        deadline: order.deadline ? new Date(order.deadline).toISOString().slice(0, 10) : '',
        note: order.note ?? '',
      });
      setItems(order.items.map((it: any) => ({ ...it })));
    }
  }, [order]);

  if (isLoading || !order || !form) return <Spinner />;

  const editable = EDITABLE_ORDER_STATUSES.includes(order.status as OrderStatus);
  if (!editable) {
    return (
      <div className="max-w-2xl">
        <PageHeader title={`Sửa đơn ${order.code}`} />
        <Card className="p-6 text-sm text-rose-600">Đơn đã vào sản xuất — không thể sửa thông tin chính.</Card>
        <Button variant="outline" className="mt-3" onClick={() => router.back()}>Quay lại</Button>
      </div>
    );
  }

  function updItem(i: number, patch: any) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function save() {
    setErr('');
    if (items.some((it) => !it.productName?.trim())) return setErr('Mỗi sản phẩm cần có tên');
    setSaving(true);
    try {
      await put(`/orders/${id}`, {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        items: items.map((it) => ({
          id: it.id, // có id = sửa; không có = thêm
          productName: it.productName,
          category: it.category,
          quantity: Number(it.quantity) || 1,
          material: it.material,
          stoneType: it.stoneType,
          size: it.size,
          initialWeight: it.initialWeight ? Number(it.initialWeight) : undefined,
          technicalNote: it.technicalNote,
        })),
      });
      router.replace(`/orders/${id}`);
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Sửa đơn ${order.code}`} subtitle={`Khách: ${order.customer?.name}`} />
      <Card className="space-y-4 p-5">
        <Field label="Tên đơn (để trống sẽ hiển thị theo mã đơn)">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Nhẫn cưới chị Lan — bộ 2 cái" />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Kênh bán">
            <Select value={form.salesChannel} onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}>
              {Object.values(SalesChannel).map((s) => <option key={s} value={s}>{SALES_CHANNEL_LABELS[s]}</option>)}
            </Select>
          </Field>
          <Field label="Loại đơn">
            <Select value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
              {Object.values(OrderType).map((s) => <option key={s} value={s}>{ORDER_TYPE_LABELS[s]}</option>)}
            </Select>
          </Field>
          <Field label="Ưu tiên">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.values(OrderPriority).map((s) => <option key={s} value={s}>{ORDER_PRIORITY_LABELS[s]}</option>)}
            </Select>
          </Field>
          <Field label="Deadline"><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
        </div>

        <Field label="Ghi chú">
          <RichText value={form.note} onChange={(html) => setForm({ ...form, note: html })} placeholder="Ghi chú đơn (in đậm, danh sách, liên kết...)" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Sản phẩm ({items.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, { productName: '', quantity: 1, material: 'Vàng 18K' }])}>+ Thêm sản phẩm</Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={it.id ?? `new-${i}`} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">SP #{i + 1}{!it.id && <span className="ml-1 text-emerald-600">(mới)</span>}</span>
                  {items.length > 1 && <button className="text-xs text-rose-500 hover:underline" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>Xóa</button>}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Tên SP *"><Input value={it.productName ?? ''} onChange={(e) => updItem(i, { productName: e.target.value })} /></Field>
                  <Field label="Chất liệu"><Input value={it.material ?? ''} onChange={(e) => updItem(i, { material: e.target.value })} /></Field>
                  <Field label="Đá"><Input value={it.stoneType ?? ''} onChange={(e) => updItem(i, { stoneType: e.target.value })} /></Field>
                  <Field label="Size"><Input value={it.size ?? ''} onChange={(e) => updItem(i, { size: e.target.value })} /></Field>
                  <Field label="Số lượng"><Input type="number" min={1} value={it.quantity ?? 1} onChange={(e) => updItem(i, { quantity: Number(e.target.value) })} /></Field>
                  <Field label="TL ban đầu (g)"><Input type="number" step="0.01" value={it.initialWeight ?? ''} onChange={(e) => updItem(i, { initialWeight: e.target.value })} /></Field>
                  <Field label="Yêu cầu KT"><Input value={it.technicalNote ?? ''} onChange={(e) => updItem(i, { technicalNote: e.target.value })} /></Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
        </div>
      </Card>
    </div>
  );
}
