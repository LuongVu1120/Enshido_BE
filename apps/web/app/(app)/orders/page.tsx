'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ORDER_PRIORITY_LABELS, ORDER_STATUS_LABELS, orderDisplayName, OrderPriority, OrderStatus, SALES_CHANNEL_LABELS } from '@enshido/types';
import { downloadFile, get } from '@/lib/api';
import { Button, Card, Input, Select, Spinner } from '@/components/ui';
import { OrderStatusBadge, PriorityBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { daysLeft, formatDate } from '@/lib/format';

export default function OrdersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [lateOnly, setLateOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const qs = `q=${encodeURIComponent(q)}&status=${status}&priority=${priority}&lateOnly=${lateOnly}`;
  const { data, isLoading } = useQuery({
    queryKey: ['orders', q, status, priority, lateOnly, page],
    queryFn: () => get(`/orders?${qs}&page=${page}&pageSize=${pageSize}`),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const reset = () => setPage(1);

  return (
    <div>
      <PageHeader
        title="Đơn hàng"
        subtitle="Quản lý đơn sản xuất"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadFile(`/orders/export?${qs}`, 'don-hang.csv')}>⬇ Xuất CSV</Button>
            <Link href="/orders/new">
              <Button>+ Tạo đơn hàng</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tìm mã đơn, khách, sản phẩm..."
            value={q}
            onChange={(e) => { setQ(e.target.value); reset(); }}
            className="max-w-xs"
          />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); reset(); }} className="max-w-[180px]">
            <option value="">Tất cả trạng thái</option>
            {Object.values(OrderStatus).map((s) => (<option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>))}
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); reset(); }} className="max-w-[150px]">
            <option value="">Mọi ưu tiên</option>
            {Object.values(OrderPriority).map((s) => (<option key={s} value={s}>{ORDER_PRIORITY_LABELS[s]}</option>))}
          </Select>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={lateOnly} onChange={(e) => { setLateOnly(e.target.checked); reset(); }} />
            Chỉ đơn trễ
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tên đơn / Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Kênh</th>
                  <th className="px-4 py-3">Ưu tiên</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((o: any) => {
                  const dl = daysLeft(o.deadline);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">
                          {orderDisplayName(o)}
                        </Link>
                        {o.name?.trim() && <div className="text-xs text-slate-400">{o.code}</div>}
                      </td>
                      <td className="px-4 py-3">{o.customer?.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.items?.[0]?.productName}
                        {o.items?.length > 1 && <span className="text-slate-400"> +{o.items.length - 1}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {SALES_CHANNEL_LABELS[o.salesChannel as keyof typeof SALES_CHANNEL_LABELS] ?? o.salesChannel ?? '—'}
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={o.priority} /></td>
                      <td className="px-4 py-3">
                        <span className={dl.overdue ? 'font-medium text-rose-600' : 'text-slate-600'}>
                          {formatDate(o.deadline)}
                        </span>
                        <div className={`text-xs ${dl.overdue ? 'text-rose-500' : 'text-slate-400'}`}>{dl.label}</div>
                      </td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    </tr>
                  );
                })}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Không có đơn hàng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Tổng {data.total} đơn</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Trước
              </Button>
              <span>
                {page}/{totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau ›
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
