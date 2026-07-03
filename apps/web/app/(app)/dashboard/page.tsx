'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ORDER_STATUS_LABELS, OrderStatus } from '@enshido/types';
import { get } from '@/lib/api';
import { Card, Spinner, Stat } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { money } from '@/components/modal';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/lib/providers';
import { Role } from '@enshido/types';

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#0ea5e9', '#64748b'];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => get('/dashboard/summary'),
    refetchInterval: 15000,
  });
  const { data: adv } = useQuery({
    queryKey: ['dashboard-advanced'],
    queryFn: () => get('/reports/dashboard'),
    refetchInterval: 20000,
  });
  const { user } = useAuth();
  const canOps = user?.role === Role.ADMIN || user?.role === Role.PRODUCTION_MANAGER;
  const { data: delay } = useQuery({
    queryKey: ['dashboard-delay'],
    queryFn: () => get('/automation/delay-risk'),
    enabled: canOps,
    refetchInterval: 20000,
  });

  if (isLoading || !data) return <Spinner />;
  const c = data.cards;

  const statusData = data.byStatus.map((s: any) => ({
    name: ORDER_STATUS_LABELS[s.status as OrderStatus] ?? s.status,
    value: s.count,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Tổng quan vận hành xưởng" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Tổng đơn" value={c.totalOrders} tone="slate" />
        <Stat label="Đang sản xuất" value={c.inProduction} tone="blue" />
        <Stat label="Trễ hạn" value={c.overdue} tone="red" />
        <Stat label="Chờ QC" value={c.waitingQC} tone="amber" />
        <Stat label="Hoàn thành hôm nay" value={c.completedToday} tone="green" />
        <Stat label="Tỷ lệ QC đạt" value={`${c.qcPassRate}%`} tone="green" hint={`${c.qcFail} lượt không đạt`} />
        {canOps && delay && <Stat label="Nguy cơ trễ" value={delay.count} tone="red" hint="đơn cần chú ý" />}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Phân bố đơn theo trạng thái</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {statusData.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            {statusData.map((s: any, i: number) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Công đoạn đang tắc</h2>
          {data.stuckStages.length === 0 ? (
            <p className="text-sm text-slate-400">Không có công đoạn ùn ứ.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.stuckStages} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Dashboard nâng cao (Phase 003) */}
      {adv && (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Sản lượng 7 ngày (công đoạn hoàn thành)</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={adv.output7d}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Cơ cấu tồn kho</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={adv.inventoryStructure} dataKey="value" nameKey="label" innerRadius={45} outerRadius={85}>
                  {adv.inventoryStructure.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Top thợ (sản lượng)</h2>
            <div className="space-y-2">
              {adv.workerTop.map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
                  <span className="flex-1">{w.worker}</span>
                  <span className="text-slate-500">{w.completed} CĐ · đúng hạn {w.onTimeRate}%</span>
                </div>
              ))}
              {adv.workerTop.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Hoạt động gần đây</h2>
            <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
              {adv.recentActivity.map((a: any, i: number) => (
                <div key={i} className="text-xs">
                  <span className="text-slate-400">{formatDateTime(a.at)}</span>{' '}
                  <span className="font-medium text-slate-600">{a.user}</span>{' '}
                  <span className="text-slate-500">{a.action}</span>
                  {a.order && <span className="text-brand-600"> · {a.order}</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
