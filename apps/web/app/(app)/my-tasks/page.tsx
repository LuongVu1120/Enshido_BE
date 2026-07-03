'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ORDER_STATUS_LABELS, OrderStatus, STEP_LABELS, StepName } from '@enshido/types';
import { get } from '@/lib/api';
import { Button, Card, Spinner } from '@/components/ui';
import { PriorityBadge, StepStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { daysLeft } from '@/lib/format';

export default function MyTasksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => get('/production/my-tasks'),
    refetchInterval: 10000,
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Việc của tôi" subtitle="Công đoạn đang được giao cho bạn" />
      {data.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">Hiện chưa có công đoạn nào được giao cho bạn. 🎉</Card>
      ) : (
        <div className="space-y-3">
          {data.map((t: any) => {
            const dl = daysLeft(t.order.deadline);
            return (
              <Card key={t.stepId} className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/scan/${t.order.qrToken}`} className="font-semibold text-brand-600 hover:underline">{t.order.code}</Link>
                    <PriorityBadge priority={t.order.priority} />
                    {dl.overdue && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">⏰ {dl.label}</span>}
                  </div>
                  <div className="mt-1 text-sm">
                    Công đoạn: <b>{STEP_LABELS[t.stepName as StepName] ?? t.stepName}</b>{' '}
                    <StepStatusBadge status={t.status} />
                  </div>
                  <div className="text-xs text-slate-400">{t.order.customer?.name} · {ORDER_STATUS_LABELS[t.order.status as OrderStatus]}</div>
                </div>
                <Link href={`/scan/${t.order.qrToken}`}>
                  <Button>📷 Mở & cập nhật</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
