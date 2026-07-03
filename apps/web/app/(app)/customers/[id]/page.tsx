'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SALES_CHANNEL_LABELS } from '@enshido/types';
import { get } from '@/lib/api';
import { Card, Spinner, Stat } from '@/components/ui';
import { OrderStatusBadge, PriorityBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { formatDate } from '@/lib/format';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useQuery({ queryKey: ['customer', id], queryFn: () => get(`/customers/${id}`) });
  const { data: orders } = useQuery({ queryKey: ['customer-orders', id], queryFn: () => get(`/customers/${id}/orders`) });

  if (isLoading || !customer) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <PageHeader title={customer.name} subtitle={`${customer.code} · ${customer.phone ?? 'không SĐT'}`} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Tổng đơn" value={customer._count?.orders ?? orders?.length ?? 0} tone="blue" />
        <Stat label="Kênh bán" value={SALES_CHANNEL_LABELS[customer.channel as keyof typeof SALES_CHANNEL_LABELS] ?? customer.channel ?? '—'} />
        <Stat label="Nhóm khách" value={customer.customerType ?? '—'} />
        <Stat label="Ngày tạo" value={formatDate(customer.createdAt)} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Lịch sử đơn hàng</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-3">Mã đơn</th><th>Sản phẩm</th><th>Ưu tiên</th><th>Deadline</th><th>Trạng thái</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders?.map((o: any) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><Link href={`/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">{o.code}</Link></td>
                <td className="px-4 py-3 text-slate-600">{o.items?.[0]?.productName}{o.items?.length > 1 && <span className="text-slate-400"> +{o.items.length - 1}</span>}</td>
                <td className="px-4 py-3"><PriorityBadge priority={o.priority} /></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(o.deadline)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
              </tr>
            ))}
            {orders?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Khách chưa có đơn nào.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
