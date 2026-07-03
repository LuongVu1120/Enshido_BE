'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ORDER_PRIORITY_LABELS,
  ORDER_TYPE_LABELS,
  OrderPriority,
  OrderType,
  SALES_CHANNEL_LABELS,
  SalesChannel,
} from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { RichText } from '@/components/rich-text';

interface ItemForm {
  productName: string;
  category: string;
  quantity: number;
  material: string;
  stoneType: string;
  size: string;
  initialWeight?: number;
  technicalNote: string;
}

const emptyItem = (): ItemForm => ({
  productName: '',
  category: 'Nhẫn',
  quantity: 1,
  material: 'Vàng 18K',
  stoneType: '',
  size: '',
  initialWeight: undefined,
  technicalNote: '',
});

export default function NewOrderPage() {
  const router = useRouter();
  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => get('/customers?pageSize=100') });

  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [salesChannel, setSalesChannel] = useState<string>(SalesChannel.SHOPEE);
  const [orderType, setOrderType] = useState<string>(OrderType.MADE_TO_ORDER);
  const [priority, setPriority] = useState<string>(OrderPriority.NORMAL);
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, patch: Partial<ItemForm>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function submit() {
    setError('');
    if (!customerId) return setError('Vui lòng chọn khách hàng');
    if (items.some((it) => !it.productName.trim())) return setError('Mỗi sản phẩm cần có tên');
    setSaving(true);
    try {
      const order = await post('/orders', {
        customerId,
        name: name.trim() || undefined,
        salesChannel,
        orderType,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        note,
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity) || 1,
          initialWeight: it.initialWeight ? Number(it.initialWeight) : undefined,
        })),
      });
      router.replace(`/orders/${order.id}`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Tạo đơn hàng" subtitle="Mã đơn SX-YYYYMMDD-#### sẽ tự sinh khi lưu" />

      <Card className="space-y-4 p-5">
        <Field label="Tên đơn (để trống sẽ hiển thị theo mã đơn)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nhẫn cưới chị Lan — bộ 2 cái" />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Khách hàng *">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Chọn khách —</option>
              {customers?.items?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kênh bán">
            <Select value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)}>
              {Object.values(SalesChannel).map((s) => (
                <option key={s} value={s}>{SALES_CHANNEL_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Loại đơn">
            <Select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
              {Object.values(OrderType).map((s) => (
                <option key={s} value={s}>{ORDER_TYPE_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mức ưu tiên">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.values(OrderPriority).map((s) => (
                <option key={s} value={s}>{ORDER_PRIORITY_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline">
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>

        <Field label="Ghi chú">
          <RichText value={note} onChange={setNote} placeholder="Ghi chú đơn (in đậm, danh sách, liên kết...)" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Sản phẩm ({items.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, emptyItem()])}>
              + Thêm sản phẩm
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Sản phẩm #{i + 1}</span>
                  {items.length > 1 && (
                    <button
                      className="text-xs text-rose-500 hover:underline"
                      onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Tên sản phẩm *">
                    <Input value={it.productName} onChange={(e) => updateItem(i, { productName: e.target.value })} />
                  </Field>
                  <Field label="Loại">
                    <Input value={it.category} onChange={(e) => updateItem(i, { category: e.target.value })} />
                  </Field>
                  <Field label="Chất liệu">
                    <Input value={it.material} onChange={(e) => updateItem(i, { material: e.target.value })} />
                  </Field>
                  <Field label="Đá">
                    <Input value={it.stoneType} onChange={(e) => updateItem(i, { stoneType: e.target.value })} />
                  </Field>
                  <Field label="Size">
                    <Input value={it.size} onChange={(e) => updateItem(i, { size: e.target.value })} />
                  </Field>
                  <Field label="Số lượng">
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                  </Field>
                  <Field label="TL ban đầu (g)">
                    <Input type="number" step="0.01" value={it.initialWeight ?? ''} onChange={(e) => updateItem(i, { initialWeight: e.target.value ? Number(e.target.value) : undefined })} />
                  </Field>
                  <Field label="Yêu cầu kỹ thuật">
                    <Input value={it.technicalNote} onChange={(e) => updateItem(i, { technicalNote: e.target.value })} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu đơn hàng'}</Button>
        </div>
      </Card>
    </div>
  );
}
