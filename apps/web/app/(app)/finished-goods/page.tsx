'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { Button, Card, Field, Input, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { useRealtime } from '@/lib/realtime';
import { formatDate, gram } from '@/lib/format';

export default function FinishedGoodsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState('');
  const [loc, setLoc] = useState('Kho thành phẩm A');
  const [err, setErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fg-pending'],
    queryFn: () => get('/inventory/finished-goods/pending'),
    refetchInterval: 10000,
  });
  useRealtime(['order.changed'], () => qc.invalidateQueries({ queryKey: ['fg-pending'] }));

  async function stockIn(orderId: string) {
    setErr(''); setBusyId(orderId);
    try {
      await post('/inventory/finished-goods/stock-in', { orderId, location: loc });
      qc.invalidateQueries({ queryKey: ['fg-pending'] });
    } catch (e: any) { setErr(e.message); } finally { setBusyId(''); }
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Nhập kho thành phẩm" subtitle="Đơn đã QC PASS chờ nhập kho TP (FR-004)" />
      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      <Card className="mb-4 p-3">
        <Field label="Vị trí kho nhập">
          <Input value={loc} onChange={(e) => setLoc(e.target.value)} className="max-w-xs" />
        </Field>
      </Card>

      {data?.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">Không có đơn chờ nhập kho thành phẩm.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((o: any) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-600">{o.code}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">QC PASS</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {o.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.productName} ×{it.quantity}</span>
                    <span className="text-slate-400">{gram(it.currentWeight)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-400">{o.customer?.name} · deadline {formatDate(o.deadline)}</div>
              <Button className="mt-3 w-full" disabled={busyId === o.id} onClick={() => stockIn(o.id)}>
                {busyId === o.id ? 'Đang nhập...' : '🏷️ Nhập kho thành phẩm'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
