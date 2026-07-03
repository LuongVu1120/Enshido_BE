'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AUTOMATION_SETTING_LABELS,
  DELAY_RISK_LABELS,
  DelayRisk,
  Role,
  STEP_LABELS,
  StepName,
} from '@enshido/types';
import { get, post, put } from '@/lib/api';
import { Badge, Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { Modal, money } from '@/components/modal';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAuth } from '@/lib/providers';

const TABS = [
  { key: 'delay', label: '⏰ Cảnh báo trễ đơn' },
  { key: 'assign', label: '🧑‍🔧 Gợi ý phân công' },
  { key: 'kpi', label: '💰 KPI & lương' },
  { key: 'costing', label: '🧮 Giá vốn' },
  { key: 'integrations', label: '🔌 Tích hợp' },
];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export default function AutomationPage() {
  const { user } = useAuth();
  const canAdmin = user?.role === Role.ADMIN;
  const [tab, setTab] = useState('delay');
  const [config, setConfig] = useState(false);

  return (
    <div>
      <PageHeader
        title="Tự động hóa & Tích hợp"
        subtitle="Cảnh báo · gợi ý phân công · KPI/lương · giá vốn · tích hợp (rule-based)"
        actions={canAdmin && <Button variant="outline" onClick={() => setConfig(true)}>⚙️ Cấu hình luật</Button>}
      />
      <Card className="mb-4 p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'delay' && <DelayTab />}
      {tab === 'assign' && <AssignTab />}
      {tab === 'kpi' && <KpiTab />}
      {tab === 'costing' && <CostingTab />}
      {tab === 'integrations' && <IntegrationsTab canAdmin={canAdmin} />}

      {config && <SettingsModal onClose={() => setConfig(false)} />}
    </div>
  );
}

function riskBadge(r: string) {
  const tone = r === DelayRisk.OVERDUE ? 'red' : r === DelayRisk.AT_RISK ? 'amber' : 'green';
  return <Badge tone={tone as any}>{DELAY_RISK_LABELS[r as DelayRisk] ?? r}</Badge>;
}

function DelayTab() {
  const { data, isLoading } = useQuery({ queryKey: ['delay-risk'], queryFn: () => get('/automation/delay-risk'), refetchInterval: 15000 });
  if (isLoading || !data) return <Spinner />;
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{data.count} đơn có nguy cơ trễ / quá hạn</div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr><th className="px-4 py-3">Mã đơn</th><th>Khách</th><th>Deadline</th><th>Còn lại</th><th>CĐ còn</th><th>Mức độ</th><th>Lý do</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.map((o: any) => (
            <tr key={o.orderId} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-brand-600">{o.code}</td>
              <td className="px-4 py-3">{o.customerName}</td>
              <td className="px-4 py-3">{formatDate(o.deadline)}</td>
              <td className={`px-4 py-3 ${o.daysLeft < 0 ? 'font-medium text-rose-600' : ''}`}>{o.daysLeft < 0 ? `Trễ ${-o.daysLeft}d` : `${o.daysLeft}d`}</td>
              <td className="px-4 py-3">{o.remainingSteps}</td>
              <td className="px-4 py-3">{riskBadge(o.risk)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{o.reason}</td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Không có đơn nguy cơ trễ.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function AssignTab() {
  const [stepName, setStepName] = useState<string>(StepName.STONE_SETTING);
  const { data } = useQuery({ queryKey: ['assign', stepName], queryFn: () => get(`/automation/assignment-suggestion?stepName=${stepName}`) });
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-500">Gợi ý thợ cho công đoạn:</span>
        <Select value={stepName} onChange={(e) => setStepName(e.target.value)} className="max-w-[200px]">
          {Object.values(StepName).map((s) => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        {data?.suggestions?.map((w: any, i: number) => (
          <div key={w.workerId} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
            <span className="flex-1 font-medium">{w.name}</span>
            {w.skillMatch && <Badge tone="green">Khớp kỹ năng</Badge>}
            <span className="text-slate-500">Tải hiện tại: <b>{w.load}</b> công đoạn</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">Xếp hạng theo: khớp kỹ năng → tải việc thấp nhất.</p>
    </Card>
  );
}

function KpiTab() {
  const [month, setMonth] = useState(thisMonth());
  const { data } = useQuery({ queryKey: ['kpi', month], queryFn: () => get(`/automation/kpi?month=${month}`) });
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">Lương theo sản lượng — tháng {data?.month}</span>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
          <tr><th className="px-4 py-3">Thợ</th><th>Hoàn thành</th><th>Đúng hạn</th><th>Lỗi</th><th>Lương SL</th><th>Thưởng</th><th>Phạt</th><th>Tổng</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data?.rows?.map((r: any) => (
            <tr key={r.worker} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{r.worker}</td>
              <td className="px-4 py-3">{r.completed}</td>
              <td className="px-4 py-3">{r.onTimeRate}%</td>
              <td className="px-4 py-3">{r.defectRate}%</td>
              <td className="px-4 py-3">{money(r.outputSalary)}</td>
              <td className="px-4 py-3 text-emerald-600">+{money(r.bonus)}</td>
              <td className="px-4 py-3 text-rose-600">-{money(r.penalty)}</td>
              <td className="px-4 py-3 font-bold text-brand-600">{money(r.total)}</td>
            </tr>
          ))}
          {data?.rows?.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Chưa có dữ liệu tháng này.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

function CostingTab() {
  const { data: orders } = useQuery({ queryKey: ['orders-costing'], queryFn: () => get('/orders?pageSize=50') });
  const [orderId, setOrderId] = useState('');
  const { data } = useQuery({ queryKey: ['costing', orderId], queryFn: () => get(`/automation/costing/${orderId}`), enabled: !!orderId });
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-500">Tính giá vốn cho đơn:</span>
        <Select value={orderId} onChange={(e) => setOrderId(e.target.value)} className="max-w-[280px]">
          <option value="">— Chọn đơn —</option>
          {orders?.items?.map((o: any) => <option key={o.id} value={o.id}>{o.code} · {o.customer?.name}</option>)}
        </Select>
      </div>
      {!orderId ? <p className="text-sm text-slate-400">Chọn một đơn để xem phân rã giá vốn.</p> : !data ? <Spinner /> : (
        <div className="max-w-lg space-y-2">
          <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3"><span>🔩 Vật tư ({data.breakdown.material.items.length} loại)</span><b>{money(data.breakdown.material.amount)}</b></div>
          <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3"><span>🛠️ Công thợ ({data.breakdown.labor.doneSteps} công đoạn)</span><b>{money(data.breakdown.labor.amount)}</b></div>
          <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3"><span>⚖️ Hao hụt kim loại ({data.breakdown.loss.grams}g)</span><b>{money(data.breakdown.loss.amount)}</b></div>
          <div className="flex justify-between rounded-lg bg-brand-50 px-4 py-3 text-brand-700"><span className="font-semibold">Tổng giá vốn</span><b className="text-lg">{money(data.total)}</b></div>
        </div>
      )}
    </Card>
  );
}

function IntegrationsTab({ canAdmin }: { canAdmin: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['integrations'], queryFn: () => get('/automation/integrations') });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  async function sync(id: string) {
    setBusy(id); setMsg('');
    try { const r = await post(`/automation/integrations/${id}/sync`); setMsg(`${r.status}: ${r.message}`); qc.invalidateQueries({ queryKey: ['integrations'] }); }
    finally { setBusy(''); }
  }
  return (
    <div>
      {msg && <div className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{msg}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data?.map((it: any) => (
          <Card key={it.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{it.name}</div>
                <div className="text-xs text-slate-400">{it.provider} · {it._count?.logs ?? 0} lần đồng bộ</div>
              </div>
              <Badge tone={it.status === 'CONNECTED' ? 'green' : 'slate'}>{it.status === 'CONNECTED' ? 'Đã kết nối' : 'Chưa kết nối'}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-400">Đồng bộ gần nhất: {it.lastSyncAt ? formatDateTime(it.lastSyncAt) : '—'}</div>
            {canAdmin && <Button size="sm" className="mt-3" disabled={busy === it.id} onClick={() => sync(it.id)}>{busy === it.id ? 'Đang đồng bộ...' : '🔄 Đồng bộ ngay'}</Button>}
          </Card>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">* Tích hợp đang ở dạng giả lập (stub) có nhật ký idempotent — đồng bộ lại trong ngày sẽ bỏ qua (SKIPPED).</p>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['automation-settings'], queryFn: () => get('/automation/settings') });
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  if (data && !form) setForm({ ...data });

  async function save() {
    setBusy(true);
    try {
      const numeric: any = {};
      for (const k of Object.keys(form)) numeric[k] = Number(form[k]);
      await put('/automation/settings', numeric);
      qc.invalidateQueries();
      onClose();
    } finally { setBusy(false); }
  }

  return (
    <Modal title="Cấu hình luật tự động hóa" onClose={onClose}>
      {!form ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {Object.keys(AUTOMATION_SETTING_LABELS).map((k) => (
              <Field key={k} label={(AUTOMATION_SETTING_LABELS as any)[k]}>
                <Input type="number" step="any" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu cấu hình'}</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
