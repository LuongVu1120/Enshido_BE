'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUSES,
  orderDisplayName,
  OrderStatus,
  STEP_LABELS,
  StepName,
} from '@enshido/types';
import { del, get, post, put } from '@/lib/api';
import { Button, Card, Input, Spinner } from '@/components/ui';
import { PriorityBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';
import { daysLeft } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useAuth } from '@/lib/providers';
import { Role } from '@enshido/types';

export default function BoardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === Role.ADMIN || user?.role === Role.PRODUCTION_MANAGER;
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'status' | 'step'>('status');
  const [dragging, setDragging] = useState<any>(null);
  const [hoverCol, setHoverCol] = useState<string>('');
  const [err, setErr] = useState('');
  const [config, setConfig] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['board', q],
    queryFn: () => get(`/production/board?q=${encodeURIComponent(q)}`),
    refetchInterval: 10000,
  });
  useRealtime(['order.changed', 'production.step.changed'], () =>
    queryClient.invalidateQueries({ queryKey: ['board'] }),
  );

  function canDrop(card: any, targetStatus: string) {
    return card && card.status !== targetStatus &&
      (ORDER_STATUS_TRANSITIONS[card.status as OrderStatus] ?? []).includes(targetStatus as OrderStatus);
  }

  async function onDrop(targetStatus: string) {
    const card = dragging;
    setDragging(null);
    setHoverCol('');
    setErr('');
    if (!card || card.status === targetStatus) return;
    if (!canDrop(card, targetStatus)) {
      setErr(`Không thể chuyển ${card.code}: ${ORDER_STATUS_LABELS[card.status as OrderStatus]} → ${ORDER_STATUS_LABELS[targetStatus as OrderStatus]}`);
      return;
    }
    try {
      await post(`/orders/${card.orderId}/status`, { status: targetStatus });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (isLoading || !data) return <Spinner />;

  const columns: any[] = data.columns;
  const byCol: Record<string, any[]> = {};
  columns.forEach((c) => (byCol[c.status] = []));
  data.cards.forEach((card: any) => byCol[card.status]?.push(card));

  return (
    <div>
      <PageHeader
        title="Bảng đơn hàng (Kanban)"
        subtitle={mode === 'status' ? 'Kéo thẻ đơn giữa các cột trạng thái để cập nhật tiến độ' : 'Mỗi đơn ở cột công đoạn hiện tại — kéo sang công đoạn kế để đánh dấu hoàn thành'}
        actions={
          <>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <button onClick={() => setMode('status')} className={`px-3 py-1.5 text-sm ${mode === 'status' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Theo trạng thái đơn</button>
              <button onClick={() => setMode('step')} className={`px-3 py-1.5 text-sm ${mode === 'step' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Theo công đoạn</button>
            </div>
            <Input placeholder="Tìm mã đơn / khách..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            {canManage && mode === 'status' && <Button variant="outline" onClick={() => setConfig(true)}>⚙️ Cấu hình cột</Button>}
          </>
        }
      />

      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      {mode === 'step' && <StepBoard q={q} canManage={canManage} />}

      {mode === 'status' && (
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {columns.map((col) => {
          const valid = dragging ? canDrop(dragging, col.status) : false;
          const isHover = hoverCol === col.status;
          return (
            <div
              key={col.id}
              className="w-72 shrink-0"
              onDragOver={(e) => { e.preventDefault(); setHoverCol(col.status); }}
              onDragLeave={() => setHoverCol((h) => (h === col.status ? '' : h))}
              onDrop={() => onDrop(col.status)}
            >
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
                <span className="text-sm font-semibold text-slate-600">{col.label}</span>
                <span className="rounded-full bg-white px-2 text-xs font-bold text-slate-500">{byCol[col.status]?.length ?? 0}</span>
              </div>
              <div className={`min-h-[80px] space-y-2 rounded-lg p-1 transition ${dragging && isHover ? (valid ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-rose-50 ring-2 ring-rose-200') : ''}`}>
                {(byCol[col.status] ?? []).map((card) => {
                  const dl = daysLeft(card.deadline);
                  return (
                    <div
                      key={card.orderId}
                      draggable
                      onDragStart={() => setDragging(card)}
                      onDragEnd={() => { setDragging(null); setHoverCol(''); }}
                      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/orders/${card.orderId}`} className="text-sm font-semibold text-brand-600 hover:underline">{orderDisplayName(card)}</Link>
                        <PriorityBadge priority={card.priority} />
                      </div>
                      {card.name?.trim() && <div className="text-[10px] text-slate-400">{card.code}</div>}
                      <div className="mt-1 text-xs text-slate-600">{card.item?.productName}{card.itemCount > 1 && <span className="text-slate-400"> +{card.itemCount - 1}</span>}</div>
                      <div className="text-xs text-slate-400">{card.customerName}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {card.currentStepLabel && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{card.currentStepLabel}</span>}
                        {card.overdue && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">⏰ {dl.label}</span>}
                        {card.lossExceeded && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">⚠️ hao hụt</span>}
                      </div>
                    </div>
                  );
                })}
                {(byCol[col.status]?.length ?? 0) === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {config && <ColumnConfig onClose={() => setConfig(false)} onChanged={() => queryClient.invalidateQueries({ queryKey: ['board'] })} />}
    </div>
  );
}

// ─── Kanban THEO CÔNG ĐOẠN (Phase 011b) — kéo sang cột kế = hoàn thành công đoạn ─
function StepBoard({ q, canManage }: { q: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<any>(null);
  const [hoverCol, setHoverCol] = useState<string>('');
  const [err, setErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['board-by-step', q],
    queryFn: () => get(`/production/board/by-step?q=${encodeURIComponent(q)}`),
    refetchInterval: 10000,
  });
  useRealtime(['order.changed', 'production.step.changed'], () => queryClient.invalidateQueries({ queryKey: ['board-by-step'] }));

  if (isLoading || !data) return <Spinner />;

  const columns: any[] = data.columns;
  const idxOf = (stepName: string) => columns.findIndex((c) => c.stepName === stepName);
  const byCol: Record<string, any[]> = {};
  columns.forEach((c) => (byCol[c.stepName] = []));
  data.cards.forEach((card: any) => byCol[card.stepName]?.push(card));

  async function onDrop(targetStep: string) {
    const card = dragging;
    setDragging(null); setHoverCol(''); setErr('');
    if (!card || card.stepName === targetStep) return;
    // Chỉ cho kéo sang công đoạn KẾ TIẾP (hoàn thành công đoạn hiện tại).
    if (idxOf(targetStep) !== idxOf(card.stepName) + 1) {
      setErr(`Chỉ kéo sang công đoạn kế tiếp để đánh dấu hoàn thành "${STEP_LABELS[card.stepName as StepName] ?? card.stepName}".`);
      return;
    }
    try {
      await put(`/production/steps/${card.stepId}`, { status: 'DONE' });
      queryClient.invalidateQueries({ queryKey: ['board-by-step'] });
      queryClient.invalidateQueries({ queryKey: ['board'] });
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {columns.map((col) => {
          const isNext = dragging ? idxOf(col.stepName) === idxOf(dragging.stepName) + 1 : false;
          const isHover = hoverCol === col.stepName;
          return (
            <div
              key={col.stepName}
              className="w-64 shrink-0"
              onDragOver={(e) => { e.preventDefault(); setHoverCol(col.stepName); }}
              onDragLeave={() => setHoverCol((h) => (h === col.stepName ? '' : h))}
              onDrop={() => onDrop(col.stepName)}
            >
              <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
                <span className="text-sm font-semibold text-slate-600">{col.label}</span>
                <span className="rounded-full bg-white px-2 text-xs font-bold text-slate-500">{byCol[col.stepName]?.length ?? 0}</span>
              </div>
              <div className={`min-h-[80px] space-y-2 rounded-lg p-1 transition ${dragging && isHover ? (isNext ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-rose-50 ring-2 ring-rose-200') : ''}`}>
                {(byCol[col.stepName] ?? []).map((card) => (
                  <div
                    key={card.orderId}
                    draggable={canManage}
                    onDragStart={() => setDragging(card)}
                    onDragEnd={() => { setDragging(null); setHoverCol(''); }}
                    className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/orders/${card.orderId}`} className="text-sm font-semibold text-brand-600 hover:underline">{orderDisplayName(card)}</Link>
                      <PriorityBadge priority={card.priority} />
                    </div>
                    {card.name?.trim() && <div className="text-[10px] text-slate-400">{card.code}</div>}
                    <div className="mt-1 text-xs text-slate-600">{card.item?.productName}{card.itemCount > 1 && <span className="text-slate-400"> +{card.itemCount - 1}</span>}</div>
                    <div className="text-xs text-slate-400">{card.customerName}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Tiến độ {card.progress.done}/{card.progress.total}</span>
                      {card.inBatch && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-700">🔥 trong lô</span>}
                      {card.overdue && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">⏰ trễ</span>}
                      {card.lossExceeded && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">⚠️ hao hụt</span>}
                    </div>
                  </div>
                ))}
                {(byCol[col.stepName]?.length ?? 0) === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ColumnConfig({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ['board-columns'], queryFn: () => get('/production/board/columns') });
  const [addStatus, setAddStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    try { await fn(); await refetch(); onChanged(); } finally { setBusy(false); }
  }

  const cols: any[] = data ?? [];
  const usedStatuses = new Set(cols.map((c) => c.status));
  const available = ORDER_STATUSES.filter((s) => !usedStatuses.has(s));

  return (
    <Modal title="Cấu hình cột bảng đơn" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-2">
        {cols.sort((a, b) => a.position - b.position).map((c, idx) => (
          <div key={c.id} className={`flex items-center gap-2 rounded-lg border p-2 ${c.visible ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
            <span className="flex flex-col">
              <button disabled={idx === 0 || busy} onClick={() => run(() => Promise.all([
                put(`/production/board/columns/${c.id}`, { position: cols[idx - 1].position }),
                put(`/production/board/columns/${cols[idx - 1].id}`, { position: c.position }),
              ]))} className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30">▲</button>
              <button disabled={idx === cols.length - 1 || busy} onClick={() => run(() => Promise.all([
                put(`/production/board/columns/${c.id}`, { position: cols[idx + 1].position }),
                put(`/production/board/columns/${cols[idx + 1].id}`, { position: c.position }),
              ]))} className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30">▼</button>
            </span>
            <input
              defaultValue={c.label}
              onBlur={(e) => e.target.value !== c.label && run(() => put(`/production/board/columns/${c.id}`, { label: e.target.value }))}
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
            />
            <span className="text-xs text-slate-400">{ORDER_STATUS_LABELS[c.status as OrderStatus]}</span>
            <button disabled={busy} onClick={() => run(() => put(`/production/board/columns/${c.id}`, { visible: !c.visible }))}
              className={`rounded px-2 py-1 text-xs ${c.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {c.visible ? 'Hiện' : 'Ẩn'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-4">
        <select value={addStatus} onChange={(e) => setAddStatus(e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">+ Thêm cột (chọn trạng thái)...</option>
          {available.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
        </select>
        <Button disabled={!addStatus || busy} onClick={() => run(async () => { await post('/production/board/columns', { status: addStatus }); setAddStatus(''); })}>Thêm</Button>
      </div>
    </Modal>
  );
}
