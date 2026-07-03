'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allocateBatchLoss,
  BATCH_STATUS_LABELS,
  BatchStatus,
  orderDisplayName,
  STEP_LABELS,
  StepName,
} from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Card, Input, Select, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';
import { QrScanner } from '@/components/qr-scanner';
import { gram, formatDate } from '@/lib/format';

const stepLabel = (s: string) => STEP_LABELS[s as StepName] ?? s;

export default function BatchesPage() {
  const qc = useQueryClient();
  const [selId, setSelId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const { data: cfg } = useQuery({ queryKey: ['batch-config'], queryFn: () => get('/production/batches/config') });
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches', statusFilter],
    queryFn: () => get(`/production/batches${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 8000,
  });

  async function run(fn: () => Promise<any>) {
    setErr('');
    try { await fn(); qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['batch', selId] }); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title="Lô sản xuất"
        subtitle="Gom nhiều đơn cùng công đoạn (Đúc / Xi mạ) — cân & phân bổ hao hụt theo lô"
        actions={<Button onClick={() => setCreating(true)}>+ Tạo lô</Button>}
      />

      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        {/* Danh sách lô */}
        <div>
          <div className="mb-2 flex gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[180px]">
              <option value="">Tất cả trạng thái</option>
              {Object.values(BatchStatus).map((s) => <option key={s} value={s}>{BATCH_STATUS_LABELS[s]}</option>)}
            </Select>
          </div>
          {isLoading ? <Spinner /> : (
            <div className="space-y-2">
              {(batches ?? []).map((b: any) => (
                <Card key={b.id} onClick={() => setSelId(b.id)} className={`cursor-pointer p-3 transition hover:shadow ${selId === b.id ? 'ring-2 ring-brand-300' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-600">{b.code}</span>
                    <BatchBadge status={b.status} />
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{stepLabel(b.stepName)} · {b.memberCount} đơn</div>
                  <div className="text-xs text-slate-400">
                    {b.status === BatchStatus.DONE
                      ? `Hao hụt lô ${gram(b.totalLossWeight)} · ${formatDate(b.closedAt)}`
                      : `Tạo ${formatDate(b.createdAt)}`}
                  </div>
                </Card>
              ))}
              {(batches ?? []).length === 0 && <Card className="p-6 text-center text-sm text-slate-400">Chưa có lô nào.</Card>}
            </div>
          )}
        </div>

        {/* Chi tiết lô */}
        <div>
          {selId ? <BatchDetail id={selId} onChanged={() => run(async () => {})} /> : (
            <Card className="p-10 text-center text-sm text-slate-400">Chọn một lô ở bên trái để xem chi tiết, thêm đơn và chốt lô.</Card>
          )}
        </div>
      </div>

      {creating && (
        <CreateBatchModal
          batchableSteps={cfg?.batchableSteps ?? []}
          onClose={() => setCreating(false)}
          onCreated={(id) => { setCreating(false); setSelId(id); qc.invalidateQueries({ queryKey: ['batches'] }); }}
        />
      )}
    </div>
  );
}

function BatchBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    DONE: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] ?? 'bg-slate-100'}`}>{BATCH_STATUS_LABELS[status as BatchStatus] ?? status}</span>;
}

function CreateBatchModal({ batchableSteps, onClose, onCreated }: { batchableSteps: string[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [stepName, setStepName] = useState(batchableSteps[0] ?? StepName.CASTING);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function create() {
    setBusy(true); setErr('');
    try { const b = await post('/production/batches', { stepName }); onCreated(b.id); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="Tạo lô sản xuất" onClose={onClose}>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">Công đoạn chạy theo lô</span>
        <Select value={stepName} onChange={(e) => setStepName(e.target.value)}>
          {batchableSteps.map((s) => <option key={s} value={s}>{stepLabel(s)}</option>)}
        </Select>
      </label>
      {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Hủy</Button>
        <Button onClick={create} disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo lô'}</Button>
      </div>
    </Modal>
  );
}

function BatchDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const qc = useQueryClient();
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [scan, setScan] = useState(false);
  const [totalOut, setTotalOut] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const { data: batch, isLoading } = useQuery({ queryKey: ['batch', id], queryFn: () => get(`/production/batches/${id}`), refetchInterval: 6000 });

  async function run(fn: () => Promise<any>) {
    setErr(''); setBusy(true);
    try { await fn(); qc.invalidateQueries({ queryKey: ['batch', id] }); qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['batch-candidates'] }); onChanged(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  // Xem trước phân bổ (dùng CHUNG hàm allocateBatchLoss với server).
  const preview = useMemo(() => {
    if (!batch?.members?.length || !totalOut) return null;
    const members = batch.members.map((m: any) => ({
      key: m.stepId,
      inputWeight: Number(m.inputWeight) || 0,
      overrideLoss: overrides[m.stepId] !== undefined && overrides[m.stepId] !== '' ? Number(overrides[m.stepId]) : null,
    }));
    return allocateBatchLoss(members, Number(totalOut));
  }, [batch, totalOut, overrides]);

  if (isLoading || !batch) return <Spinner />;
  const isOpen = batch.status === BatchStatus.OPEN;
  const totalInput = (batch.members ?? []).reduce((s: number, m: any) => s + (Number(m.inputWeight) || 0), 0);

  async function close() {
    const overridesArr = Object.entries(overrides).filter(([, v]) => v !== '').map(([stepId, v]) => ({ stepId, lossWeight: Number(v) }));
    await run(() => post(`/production/batches/${id}/close`, { totalOutputWeight: Number(totalOut), overrides: overridesArr, confirmNegative: true }));
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">{batch.code}</span>
            <BatchBadge status={batch.status} />
          </div>
          <div className="text-sm text-slate-500">{stepLabel(batch.stepName)} · {batch.members?.length ?? 0} đơn · Tổng KL vào {gram(totalInput)}</div>
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding((a) => !a)}>{adding ? 'Đóng danh sách' : '+ Thêm đơn'}</Button>
            <Button variant="outline" size="sm" onClick={() => setScan((s) => !s)}>📷 Quét QR</Button>
            <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm('Hủy lô này?') && run(() => post(`/production/batches/${id}/cancel`, {}))}>Hủy lô</Button>
          </div>
        )}
      </div>

      {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      {scan && isOpen && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-sm font-medium">Quét QR đơn để thêm vào lô</div>
          <QrScanner onResult={(token) => { setScan(false); run(() => post(`/production/batches/${id}/add`, { qrToken: token })); }} />
        </div>
      )}

      {adding && isOpen && <Candidates stepName={batch.stepName} onAdd={(orderId) => run(() => post(`/production/batches/${id}/add`, { orderId }))} busy={busy} />}

      {/* Bảng thành viên */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="py-2">Đơn</th><th>Sản phẩm</th><th>KL vào</th>
              {batch.status === BatchStatus.DONE ? <><th>KL ra</th><th>Hao hụt</th></> : <><th>Hao hụt (xem trước)</th>{isOpen && <th></th>}</>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(batch.members ?? []).map((m: any) => {
              const pv = preview?.members.find((x: any) => x.key === m.stepId);
              return (
                <tr key={m.stepId}>
                  <td className="py-2">
                    <Link href={`/orders/${m.order?.id}`} className="font-medium text-brand-600 hover:underline">{m.order ? orderDisplayName(m.order) : '—'}</Link>
                    <div className="text-xs text-slate-400">{m.order?.customer?.name}</div>
                  </td>
                  <td>{m.orderItem?.productName ?? '—'}</td>
                  <td>{gram(m.inputWeight)}</td>
                  {batch.status === BatchStatus.DONE ? (
                    <>
                      <td>{gram(m.outputWeight)}</td>
                      <td className={m.lossWeight < 0 ? 'text-emerald-600' : ''}>{gram(m.lossWeight)}</td>
                    </>
                  ) : (
                    <>
                      <td className={pv && pv.lossWeight < 0 ? 'text-emerald-600' : ''}>{pv ? gram(pv.lossWeight) : '—'}</td>
                      {isOpen && (
                        <td>
                          <Input
                            className="w-24 py-1 text-xs" type="number" step="0.01" placeholder="sửa tay"
                            value={overrides[m.stepId] ?? ''}
                            onChange={(e) => setOverrides((o) => ({ ...o, [m.stepId]: e.target.value }))}
                          />
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
            {(batch.members ?? []).length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Chưa có đơn trong lô. Bấm "+ Thêm đơn" hoặc "Quét QR".</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Chốt lô */}
      {isOpen ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-700">Chốt lô — cân tổng cả lô</div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Tổng KL vào</span>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium">{gram(totalInput)}</div>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Tổng KL ra (cân sau lô) *</span>
              <Input className="w-40" type="number" step="0.01" placeholder="g" value={totalOut} onChange={(e) => setTotalOut(e.target.value)} />
            </label>
            {preview && (
              <div className="text-sm">
                <span className="text-slate-500">Hao hụt lô: </span>
                <b className={preview.totalLossWeight < 0 ? 'text-emerald-600' : 'text-rose-600'}>{gram(preview.totalLossWeight)}</b>
                {preview.totalLossWeight < 0 && <span className="ml-1 text-xs text-emerald-600">(tăng cân)</span>}
              </div>
            )}
            <Button disabled={busy || !totalOut || !(batch.members?.length)} onClick={close}>Chốt lô & phân bổ</Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Chênh lệch được chia về từng đơn theo tỉ lệ khối lượng (có thể sửa tay cột "hao hụt"). Mỗi đơn ghi một bản cân bất biến.</p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Tổng vào <b>{gram(batch.totalInputWeight)}</b> → tổng ra <b>{gram(batch.totalOutputWeight)}</b> · hao hụt lô <b className={batch.totalLossWeight < 0 ? 'text-emerald-600' : 'text-rose-600'}>{gram(batch.totalLossWeight)}</b>
          {batch.performedBy && <> · người chạy: {batch.performedBy.name}</>}
        </div>
      )}
    </Card>
  );
}

function Candidates({ stepName, onAdd, busy }: { stepName: string; onAdd: (orderId: string) => void; busy: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['batch-candidates', stepName], queryFn: () => get(`/production/batches/candidates?stepName=${stepName}`) });
  return (
    <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
      <div className="mb-2 text-sm font-medium text-slate-700">Đơn đang chờ {stepLabel(stepName)} (chọn để thêm)</div>
      {isLoading ? <Spinner /> : (
        <div className="space-y-1">
          {(data ?? []).map((c: any) => (
            <div key={c.stepId} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1.5 text-sm">
              <div>
                <span className="font-medium">{c.name?.trim() ? c.name : c.code}</span>
                <span className="ml-2 text-xs text-slate-400">{c.customerName} · {c.productName} · {gram(c.inputWeight)}</span>
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAdd(c.orderId)}>+ Thêm</Button>
            </div>
          ))}
          {(data ?? []).length === 0 && <div className="py-3 text-center text-xs text-slate-400">Không có đơn nào đang chờ công đoạn này.</div>}
        </div>
      )}
    </div>
  );
}
