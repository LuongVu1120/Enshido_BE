'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { downloadFile, get } from '@/lib/api';
import { Button, Card, Input, Spinner, Stat } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { money } from '@/components/modal';
import { gram, percent } from '@/lib/format';

const TABS = [
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'production', label: 'Sản xuất' },
  { key: 'qc', label: 'QC' },
  { key: 'loss', label: 'Hao hụt' },
  { key: 'productivity', label: 'Năng suất thợ' },
  { key: 'inventory', label: 'Tồn kho' },
];
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#0ea5e9', '#64748b', '#ec4899'];
const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </Card>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-400">
          <tr>{cols.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="py-2 pr-3">{c}</td>)}</tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} className="py-6 text-center text-slate-400">Không có dữ liệu trong khoảng này.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const HBar = ({ data, x, y, color = '#6366f1' }: any) => (
  <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
    <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
      <XAxis type="number" allowDecimals={false} hide />
      <YAxis type="category" dataKey={y} width={110} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey={x} fill={color} radius={[0, 6, 6, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default function ReportsPage() {
  const [tab, setTab] = useState('orders');
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const noDate = tab === 'inventory';
  const qs = noDate ? '' : `?from=${from}&to=${to}`;

  const { data, isLoading } = useQuery({
    queryKey: ['report', tab, from, to],
    queryFn: () => get(`/reports/${tab}${qs}`),
  });

  return (
    <div>
      <PageHeader
        title="Báo cáo & Phân tích"
        subtitle="Tổng hợp vận hành, QC, hao hụt, năng suất, tồn kho"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadFile(`/reports/${tab}/export${qs}`, `bao-cao-${tab}.csv`)}>⬇ Xuất CSV</Button>
            <Button variant="outline" onClick={() => window.print()}>🖨️ In PDF</Button>
          </>
        }
      />

      <Card className="mb-4 p-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {!noDate && (
            <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
              <span>Từ</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
              <span>đến</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
            </div>
          )}
        </div>
      </Card>

      {isLoading || !data ? <Spinner /> : (
        <div className="space-y-4">
          {tab === 'orders' && <OrdersReport d={data} />}
          {tab === 'production' && <ProductionReport d={data} />}
          {tab === 'qc' && <QcReport d={data} />}
          {tab === 'loss' && <LossReport d={data} />}
          {tab === 'productivity' && <ProductivityReport d={data} />}
          {tab === 'inventory' && <InventoryReport d={data} />}
        </div>
      )}
    </div>
  );
}

function OrdersReport({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Tổng đơn (kỳ)" value={d.total} />
        <Stat label="Đơn trễ hạn" value={d.lateCount} tone="red" />
        <Stat label="Thời gian xử lý TB" value={`${d.avgProcessingHours}h`} tone="blue" />
        <Stat label="Số kênh bán" value={d.byChannel.length} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Đơn theo trạng thái"><HBar data={d.byStatus} x="count" y="label" /></Section>
        <Section title="Đơn theo kênh bán">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={d.byChannel} dataKey="count" nameKey="channel" innerRadius={50} outerRadius={90}>
                {d.byChannel.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>
        <Section title="Top khách hàng"><Table cols={['Khách', 'Số đơn']} rows={d.byCustomer.map((c: any) => [c.name, c.count])} /></Section>
        <Section title="Đơn trễ hạn"><Table cols={['Khách', 'Trạng thái', 'Deadline']} rows={d.lateOrders.map((o: any) => [o.customer, o.status, new Date(o.deadline).toLocaleDateString('vi-VN')])} /></Section>
      </div>
    </>
  );
}

function ProductionReport({ d }: { d: any }) {
  return (
    <>
      <Stat label="Công đoạn hoàn thành (kỳ)" value={d.totalCompletedSteps} tone="green" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Sản lượng theo ngày">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d.outputByDay.map((x: any) => ({ ...x, day: x.day.slice(5) }))}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Section>
        <Section title="Sản lượng theo công đoạn"><HBar data={d.byStep} x="count" y="label" color="#10b981" /></Section>
        <Section title="Công đoạn đang tắc"><HBar data={d.stuckStages} x="count" y="label" color="#f59e0b" /></Section>
        <Section title="Thời gian TB mỗi công đoạn"><Table cols={['Công đoạn', 'Giờ TB']} rows={d.avgHoursPerStep.map((s: any) => [s.label, s.avgHours])} /></Section>
      </div>
    </>
  );
}

function QcReport({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Tỷ lệ QC đạt" value={`${d.passRate}%`} tone="green" />
        <Stat label="Đạt" value={d.pass} tone="green" />
        <Stat label="Không đạt" value={d.fail} tone="red" />
        <Stat label="Lượt làm lại" value={d.reworkCount} tone="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Lỗi theo loại"><HBar data={d.defectsByType} x="count" y="type" color="#ef4444" /></Section>
        <Section title="Lỗi theo công đoạn"><Table cols={['Công đoạn', 'Số lỗi']} rows={d.defectsByStep.map((x: any) => [x.label, x.count])} /></Section>
        <Section title="Lỗi theo thợ"><Table cols={['Thợ', 'Số lỗi']} rows={d.defectsByWorker.map((x: any) => [x.worker, x.count])} /></Section>
      </div>
    </>
  );
}

function LossReport({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Tổng KL đưa vào" value={gram(d.totalInput)} />
        <Stat label="Tổng KL còn lại" value={gram(d.totalOutput)} tone="blue" />
        <Stat label="Tổng hao hụt" value={gram(d.totalLoss)} tone="red" />
        <Stat label="Hao hụt TB" value={percent(d.avgLossPercent)} tone="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Hao hụt theo công đoạn (g)"><HBar data={d.byStep} x="lossWeight" y="label" color="#ef4444" /></Section>
        <Section title="Hao hụt theo thợ (g)"><Table cols={['Thợ', 'Hao hụt (g)']} rows={d.byWorker.map((x: any) => [x.worker, x.lossWeight])} /></Section>
        <Section title="Hao hụt theo loại sản phẩm (g)"><Table cols={['Loại SP', 'Hao hụt (g)']} rows={d.byProduct.map((x: any) => [x.product, x.lossWeight])} /></Section>
        <Section title={`Đơn vượt định mức (${d.exceedCount})`}><Table cols={['Đơn', 'Công đoạn', 'Người', 'Lũy kế %']} rows={d.exceedList.map((x: any) => [x.order, x.stage, x.by, percent(x.cumulativePercent)])} /></Section>
      </div>
    </>
  );
}

function ProductivityReport({ d }: { d: any }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="Sản lượng theo thợ"><HBar data={d.rows.map((r: any) => ({ ...r, label: r.worker }))} x="completed" y="label" /></Section>
      <Section title="Bảng xếp hạng năng suất">
        <Table cols={['Thợ', 'Hoàn thành', 'Đúng hạn %', 'Tỷ lệ lỗi %']} rows={d.rows.map((r: any) => [r.worker, r.completed, r.onTimeRate, r.defectRate])} />
      </Section>
    </div>
  );
}

function InventoryReport({ d }: { d: any }) {
  return (
    <>
      <Stat label="Tổng giá trị tồn" value={money(d.totalValue)} tone="blue" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Cơ cấu tồn kho theo nhóm">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.byGroup} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95}>
                {d.byGroup.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => money(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
        <Section title={`Vật tư sắp hết (${d.lowStockCount})`}><Table cols={['Mã', 'Tên', 'Tồn', 'Tối thiểu']} rows={d.lowStock.map((x: any) => [x.code, x.name, x.currentStock, x.minStock])} /></Section>
        <Section title="Vật tư tiêu hao nhiều nhất"><Table cols={['Vật tư', 'Đã xuất']} rows={d.topConsumed.map((x: any) => [x.name, x.quantity])} /></Section>
        <Section title="Giá trị tồn theo nhóm"><Table cols={['Nhóm', 'Mặt hàng', 'Giá trị']} rows={d.byGroup.map((x: any) => [x.label, x.count, money(x.value)])} /></Section>
      </div>
    </>
  );
}
