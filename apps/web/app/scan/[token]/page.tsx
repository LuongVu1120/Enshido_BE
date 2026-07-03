'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  STEP_LABELS,
  StepName,
  StepStatus,
  calcLoss,
} from '@enshido/types';
import { get, getToken, post } from '@/lib/api';
import { Button, Card, Field, Input, Spinner } from '@/components/ui';
import { StepStatusBadge } from '@/components/status';
import { gram, percent } from '@/lib/format';

export default function ScanWorkerPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [form, setForm] = useState({ completedQuantity: 1, previousWeight: '', currentWeight: '', note: '' });
  const [received, setReceived] = useState(''); // KL tiếp nhận (Phase 013, tùy chọn)
  const [issue, setIssue] = useState('');
  const [showIssue, setShowIssue] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      // Chưa đăng nhập → apiFetch tự chuyển về /login?next=... (FR-008)
      if (!getToken()) {
        window.location.href = `/login?next=/scan/${token}`;
        return;
      }
      const res = await get(`/scan/${token}`);
      setData(res);
      const item = res.order?.items?.[0];
      setForm((f) => ({ ...f, previousWeight: String(item?.currentWeight ?? item?.initialWeight ?? '') }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function act(action: string, body?: any) {
    setBusy(true);
    setError('');
    try {
      await post(`/scan/${token}/${action}`, body ?? {});
      await load();
      setShowComplete(false);
      setShowIssue(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(confirmNegative = false) {
    const prev = Number(form.previousWeight);
    const cur = Number(form.currentWeight);
    await act('complete', {
      completedQuantity: Number(form.completedQuantity) || 1,
      orderItemId: data.order.items?.[0]?.id,
      stageName: STEP_LABELS[data.currentStep?.stepName as StepName] ?? data.currentStep?.stepName,
      previousWeight: form.previousWeight ? prev : undefined,
      currentWeight: form.currentWeight ? cur : undefined,
      confirmNegative,
      note: form.note,
    });
  }

  if (loading) return <Spinner label="Đang mở phiếu..." />;

  if (error && !data) {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card className="p-6 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="mt-2 text-rose-600">{error}</p>
          <Link href="/scan" className="mt-4 inline-block text-brand-600 underline">← Quét phiếu khác</Link>
        </Card>
      </div>
    );
  }

  const o = data.order;
  const step = data.currentStep;
  const item = o.items?.[0];

  // Preview hao hụt realtime khi nhập (US7).
  const preview =
    form.previousWeight && form.currentWeight
      ? calcLoss({
          previousWeight: Number(form.previousWeight),
          currentWeight: Number(form.currentWeight),
          initialWeight: item?.initialWeight ?? Number(form.previousWeight),
          allowedLossPercent: 3,
        })
      : null;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
        <Link href="/scan" className="text-xl">←</Link>
        <div className="flex-1">
          <div className="text-sm font-bold">{o.code}</div>
          <div className="text-xs text-brand-100">{ORDER_STATUS_LABELS[o.status as OrderStatus]}</div>
        </div>
        <div className="text-2xl">💎</div>
      </div>

      <div className="space-y-3 p-4">
        {error && <div className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</div>}

        {/* Sản phẩm */}
        <Card className="p-4">
          <div className="text-xs text-slate-400">Sản phẩm</div>
          <div className="font-semibold">{item?.productName}</div>
          <div className="mt-1 text-sm text-slate-500">
            {item?.material} {item?.stoneType ? `· ${item.stoneType}` : ''} {item?.size ? `· Size ${item.size}` : ''}
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <span>TL ban đầu: <b>{gram(item?.initialWeight)}</b></span>
            <span>TL hiện tại: <b>{gram(item?.currentWeight)}</b></span>
          </div>
        </Card>

        {/* Công đoạn hiện tại */}
        {!step ? (
          <Card className="p-6 text-center">
            <div className="text-3xl">🎉</div>
            <p className="mt-2 font-medium text-emerald-600">Đơn đã qua hết công đoạn sản xuất.</p>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Công đoạn hiện tại</div>
                <div className="text-lg font-bold">{STEP_LABELS[step.stepName as StepName] ?? step.stepName}</div>
              </div>
              <StepStatusBadge status={step.status} />
            </div>
            {step.assignedTo && <div className="mt-1 text-xs text-slate-400">Phụ trách: {step.assignedTo.name}</div>}

            {/* Hành động theo trạng thái — nút lớn, một tay (Hiến pháp IV) */}
            <div className="mt-4 space-y-2">
              {[StepStatus.NOT_STARTED, StepStatus.NEEDS_REWORK].includes(step.status) && (
                <>
                  <Field label="KL tiếp nhận (g) — tùy chọn">
                    <Input type="number" step="0.01" inputMode="decimal" placeholder="Cân khi nhận (nếu có)" value={received} onChange={(e) => setReceived(e.target.value)} />
                  </Field>
                  <Button size="lg" className="w-full" disabled={busy} onClick={() => { act('accept', { stepId: step.id, expectedVersion: step.version, orderItemId: item?.id, receivedWeight: received ? Number(received) : undefined }); setReceived(''); }}>
                    ✋ Tiếp nhận
                  </Button>
                </>
              )}
              {[StepStatus.ACCEPTED, StepStatus.NOT_STARTED, StepStatus.NEEDS_REWORK].includes(step.status) && (
                <Button size="lg" variant="outline" className="w-full" disabled={busy} onClick={() => act('start', { stepId: step.id, expectedVersion: step.version })}>
                  ▶️ Bắt đầu
                </Button>
              )}
              {[StepStatus.IN_PROGRESS, StepStatus.ACCEPTED].includes(step.status) && !showComplete && (
                <Button size="lg" variant="success" className="w-full" onClick={() => setShowComplete(true)}>
                  ✓ Hoàn thành công đoạn
                </Button>
              )}

              {showComplete && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <Field label="Số lượng hoàn thành">
                    <Input type="number" min={1} value={form.completedQuantity} onChange={(e) => setForm({ ...form, completedQuantity: Number(e.target.value) })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="TL trước (g)">
                      <Input type="number" step="0.01" inputMode="decimal" value={form.previousWeight} onChange={(e) => setForm({ ...form, previousWeight: e.target.value })} />
                    </Field>
                    <Field label="TL sau (g)">
                      <Input type="number" step="0.01" inputMode="decimal" value={form.currentWeight} onChange={(e) => setForm({ ...form, currentWeight: e.target.value })} />
                    </Field>
                  </div>
                  {preview && (
                    <div className={`rounded-lg px-3 py-2 text-sm ${preview.isNegative || preview.exceedsAllowed ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-600'}`}>
                      Hao hụt: <b>{gram(preview.lossWeight)}</b> ({percent(preview.lossPercent)}) · Lũy kế {percent(preview.cumulativeLossPercent)}
                      {preview.isNegative && ' · ⚠️ TL sau > trước'}
                      {preview.exceedsAllowed && ' · ⚠️ vượt định mức'}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="success" className="flex-1" disabled={busy} onClick={() => complete(false)}>
                      Lưu hoàn thành
                    </Button>
                    {preview?.isNegative && (
                      <Button variant="danger" disabled={busy} onClick={() => complete(true)}>Xác nhận dù âm</Button>
                    )}
                    <Button variant="outline" onClick={() => setShowComplete(false)}>Hủy</Button>
                  </div>
                </div>
              )}

              {!showIssue ? (
                <Button size="lg" variant="ghost" className="w-full text-rose-600" onClick={() => setShowIssue(true)}>
                  ⚠️ Báo lỗi / cần hỗ trợ
                </Button>
              ) : (
                <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <Field label="Mô tả sự cố">
                    <Input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="vd: gãy chấu, thiếu đá..." />
                  </Field>
                  <div className="flex gap-2">
                    <Button variant="danger" className="flex-1" disabled={busy || !issue.trim()} onClick={() => act('report-issue', { stepId: step.id, expectedVersion: step.version, note: issue })}>
                      Gửi báo lỗi
                    </Button>
                    <Button variant="outline" onClick={() => setShowIssue(false)}>Hủy</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Tiến độ công đoạn */}
        <Card className="p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Tiến độ</div>
          <div className="space-y-1.5">
            {data.steps.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${s.status === StepStatus.DONE ? 'bg-emerald-500 text-white' : s.id === step?.id ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {s.stepOrder}
                </span>
                <span className={s.id === step?.id ? 'font-semibold' : 'text-slate-500'}>
                  {STEP_LABELS[s.stepName as StepName] ?? s.stepName}
                </span>
                <span className="ml-auto"><StepStatusBadge status={s.status} /></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
