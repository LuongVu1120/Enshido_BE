'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EDITABLE_ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  orderDisplayName,
  OrderStatus,
  Role,
  STEP_LABELS,
  StepName,
} from '@enshido/types';
import { del, get, post } from '@/lib/api';
import { Button, Card, Select, Spinner } from '@/components/ui';
import { OrderStatusBadge, PriorityBadge, StepStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { RichTextView } from '@/components/rich-text';
import { formatDate, formatDateTime, gram, percent } from '@/lib/format';
import { useAuth } from '@/lib/providers';
import { TicketModal } from '@/components/ticket-modal';
import { ImageUpload, fileUrl } from '@/components/image-upload';

// Phase 012: hiển thị công đoạn bằng tiếng Việt (map mã enum cũ nếu có).
const stageLabel = (s?: string) => (s ? (STEP_LABELS as any)[s] ?? s : '—');

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wForm, setWForm] = useState<{ orderItemId: string; stepId: string; stageName: string; measuredById: string; previousWeight: string; currentWeight: string } | null>(null);
  const [wHistory, setWHistory] = useState<string>(''); // key công đoạn đang mở lịch sử cân

  const { data: order, isLoading } = useQuery({ queryKey: ['order', id], queryFn: () => get(`/orders/${id}`) });
  const { data: workers } = useQuery({ queryKey: ['workers'], queryFn: () => get('/users?role=WORKER') });
  const { data: timeline } = useQuery({ queryKey: ['timeline', id], queryFn: () => get(`/orders/${id}/timeline`) });

  const canManage = user?.role === Role.ADMIN || user?.role === Role.PRODUCTION_MANAGER;
  const canWeight = canManage || user?.role === Role.QC;

  async function submitWeight() {
    if (!wForm) return;
    await run(() => post(`/orders/${id}/weight-logs`, {
      orderItemId: wForm.orderItemId || undefined,
      productionStepId: wForm.stepId || undefined,
      stageName: wForm.stageName || 'Cân thủ công',
      measuredById: wForm.measuredById || undefined,
      previousWeight: Number(wForm.previousWeight),
      currentWeight: Number(wForm.currentWeight),
      confirmNegative: true,
    }));
    setWForm(null);
  }

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['timeline', id] });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !order) return <Spinner />;

  const nextStatuses: OrderStatus[] = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={orderDisplayName(order)}
        subtitle={`Mã ${order.code} · Khách: ${order.customer?.name} · Tạo ${formatDate(order.createdAt)}`}
        actions={
          canManage && (
            <>
              {EDITABLE_ORDER_STATUSES.includes(order.status as OrderStatus) && (
                <Link href={`/orders/${id}/edit`}>
                  <Button variant="outline">✏️ Sửa đơn</Button>
                </Link>
              )}
              {order.steps.length === 0 && (
                <Button variant="outline" disabled={busy} onClick={() => run(() => post(`/orders/${id}/configure-steps`, { steps: [] }))}>
                  Cấu hình công đoạn mặc định
                </Button>
              )}
              <Button onClick={() => run(async () => setTicket(await post(`/orders/${id}/print-production-ticket`)))} disabled={busy}>
                🖨️ In phiếu sản xuất
              </Button>
            </>
          )
        }
      />

      {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <OrderStatusBadge status={order.status} />
        <PriorityBadge priority={order.priority} />
        <span className="text-sm text-slate-500">Deadline: <b>{formatDate(order.deadline)}</b></span>
        {canManage && nextStatuses.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Select
              className="max-w-[200px]"
              defaultValue=""
              disabled={busy}
              onChange={(e) => e.target.value && run(() => post(`/orders/${id}/status`, { status: e.target.value }))}
            >
              <option value="">Chuyển trạng thái →</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
              ))}
            </Select>
            {order.status !== OrderStatus.CANCELLED && (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm('Hủy đơn này? QR sẽ bị vô hiệu hóa.') && run(() => del(`/orders/${id}`))}>
                Hủy đơn
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Ghi chú đơn (rich content — Phase 010) */}
      <Card className="mt-4 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Ghi chú đơn</h2>
          {canManage && EDITABLE_ORDER_STATUSES.includes(order.status as OrderStatus) && (
            <Link href={`/orders/${id}/edit`} className="text-xs text-brand-600 hover:underline">✏️ Sửa</Link>
          )}
        </div>
        <RichTextView html={order.note} />
      </Card>

      {/* Sản phẩm */}
      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Sản phẩm ({order.items.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Tên</th><th>Chất liệu</th><th>Đá</th><th>Size</th><th>SL</th>
                <th>TL ban đầu</th><th>TL hiện tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it: any) => (
                <tr key={it.id}>
                  <td className="py-2 font-medium">{it.productName}</td>
                  <td>{it.material ?? '—'}</td>
                  <td>{it.stoneType ?? '—'}</td>
                  <td>{it.size ?? '—'}</td>
                  <td>{it.quantity}</td>
                  <td>{gram(it.initialWeight)}</td>
                  <td>{gram(it.currentWeight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Công đoạn */}
      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Quy trình sản xuất</h2>
        {order.steps.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa cấu hình công đoạn. {canManage && 'Bấm "Cấu hình công đoạn mặc định" ở trên.'}</p>
        ) : (
          <div className="space-y-2">
            {order.steps.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{s.stepOrder}</span>
                <span className="w-32 text-sm font-medium">{STEP_LABELS[s.stepName as StepName] ?? s.stepName}</span>
                <StepStatusBadge status={s.status} />
                {s.lossPercent != null && <span className="text-xs text-slate-400">hao hụt {percent(s.lossPercent)}</span>}
                {s.batch && (
                  <Link href="/batches" className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-700 hover:underline">🔥 Lô {s.batch.code}</Link>
                )}
                {s.reworkCount > 0 && <span className="text-xs text-rose-500">làm lại {s.reworkCount}×</span>}
                {s.performedBy && s.performedBy.id !== s.assignedToId && (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">Thực hiện: {s.performedBy.name}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {canManage ? (
                    <Select
                      className="max-w-[180px] py-1 text-xs"
                      value={s.assignedToId ?? ''}
                      disabled={busy}
                      onChange={(e) => run(() => post(`/production/steps/${s.id}/assign`, { assignedToId: e.target.value }))}
                    >
                      <option value="">— Gán thợ —</option>
                      {workers?.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-500">{s.assignedTo?.name ?? 'Chưa gán'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Trọng lượng & hao hụt */}
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Theo dõi trọng lượng & hao hụt</h2>
          {canWeight && (
            <Button variant="outline" size="sm" onClick={() => setWForm(wForm ? null : { orderItemId: order.items[0]?.id ?? '', stepId: '', stageName: '', measuredById: '', previousWeight: '', currentWeight: '' })}>
              {wForm ? 'Đóng' : '+ Nhập cân'}
            </Button>
          )}
        </div>
        {wForm && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-6">
            <Select value={wForm.orderItemId} onChange={(e) => setWForm({ ...wForm, orderItemId: e.target.value })}>
              {order.items.map((it: any) => <option key={it.id} value={it.id}>{it.productName}</option>)}
            </Select>
            <Select
              value={wForm.stepId}
              onChange={(e) => {
                const st = order.steps.find((s: any) => s.id === e.target.value);
                // Trùng công đoạn = chỉnh sửa: prefill số từ lần cân mới nhất của công đoạn.
                const prev = order.weightLogs.filter((w: any) => w.productionStepId === e.target.value);
                const last = prev[prev.length - 1];
                setWForm({
                  ...wForm,
                  stepId: e.target.value,
                  stageName: st ? stageLabel(st.stepName) : wForm.stageName,
                  previousWeight: last ? String(last.previousWeight) : wForm.previousWeight,
                  currentWeight: last ? String(last.currentWeight) : wForm.currentWeight,
                });
              }}
            >
              <option value="">— Chọn công đoạn —</option>
              {order.steps.map((s: any) => <option key={s.id} value={s.id}>{s.stepOrder}. {stageLabel(s.stepName)}</option>)}
            </Select>
            <Select value={wForm.measuredById} onChange={(e) => setWForm({ ...wForm, measuredById: e.target.value })}>
              <option value="">Người cân: Tôi</option>
              {workers?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            <input type="number" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="TL trước (g)" value={wForm.previousWeight} onChange={(e) => setWForm({ ...wForm, previousWeight: e.target.value })} />
            <input type="number" step="0.01" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="TL sau (g)" value={wForm.currentWeight} onChange={(e) => setWForm({ ...wForm, currentWeight: e.target.value })} />
            <Button onClick={submitWeight} disabled={busy || !wForm.previousWeight || !wForm.currentWeight}>Lưu cân</Button>
          </div>
        )}
        {order.weightLogs.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu cân.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr><th className="py-2">Công đoạn</th><th>TL trước</th><th>TL sau</th><th>Hao hụt</th><th>%</th><th>Lũy kế %</th><th>Người cân</th><th>Lúc</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  // Gộp 1 dòng/công đoạn (bản ghi mới nhất); giữ log cũ để xem lịch sử.
                  const groups = new Map<string, any[]>();
                  for (const w of order.weightLogs) {
                    const key = w.productionStepId || w.stageName;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(w);
                  }
                  const rows: any[] = [];
                  for (const [key, logs] of groups) {
                    const latest = logs[logs.length - 1];
                    const open = wHistory === key;
                    rows.push(
                      <tr key={key} className={latest.exceedsAllowed ? 'bg-rose-50' : ''}>
                        <td className="py-2">
                          {stageLabel(latest.stageName)}
                          {logs.length > 1 && (
                            <button onClick={() => setWHistory(open ? '' : key)} className="ml-2 text-[10px] text-brand-600 hover:underline">{open ? 'ẩn' : `đã cân ${logs.length}×`}</button>
                          )}
                        </td>
                        <td>{gram(latest.previousWeight)}</td>
                        <td>{gram(latest.currentWeight)}</td>
                        <td>{gram(latest.lossWeight)}</td>
                        <td>{percent(latest.lossPercent)}</td>
                        <td className={latest.exceedsAllowed ? 'font-bold text-rose-600' : ''}>{percent(latest.cumulativeLossPercent)}{latest.exceedsAllowed && ' ⚠️'}</td>
                        <td className="text-slate-500">{latest.measuredBy?.name}</td>
                        <td className="text-slate-400">{formatDateTime(latest.measuredAt)}</td>
                      </tr>,
                    );
                    if (open) {
                      for (const h of logs.slice(0, -1)) {
                        rows.push(
                          <tr key={h.id} className="bg-slate-50 text-slate-400">
                            <td className="py-1 pl-4 text-xs italic">↳ lần cân trước</td>
                            <td className="text-xs">{gram(h.previousWeight)}</td>
                            <td className="text-xs">{gram(h.currentWeight)}</td>
                            <td className="text-xs">{gram(h.lossWeight)}</td>
                            <td className="text-xs">{percent(h.lossPercent)}</td>
                            <td className="text-xs">{percent(h.cumulativeLossPercent)}</td>
                            <td className="text-xs">{h.measuredBy?.name}</td>
                            <td className="text-xs">{formatDateTime(h.measuredAt)}</td>
                          </tr>,
                        );
                      }
                    }
                  }
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ảnh đính kèm (mẫu SP / ảnh lỗi) */}
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Ảnh đính kèm ({order.attachments?.length ?? 0})</h2>
          <ImageUpload
            objectType="order"
            objectId={order.id}
            orderId={order.id}
            label="Tải ảnh"
            onUploaded={() => qc.invalidateQueries({ queryKey: ['order', id] })}
          />
        </div>
        {order.attachments?.length ? (
          <div className="flex flex-wrap gap-3">
            {order.attachments.map((a: any) => (
              <a key={a.id} href={fileUrl(a.fileUrl)} target="_blank" rel="noreferrer">
                <img src={fileUrl(a.fileUrl)} alt="" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Chưa có ảnh. Bấm "Tải ảnh" để thêm ảnh mẫu/ảnh lỗi.</p>
        )}
      </Card>

      {/* QC + Timeline */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Lịch sử QC</h2>
          {order.qcRecords.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có lần QC nào.</p>
          ) : (
            <div className="space-y-2">
              {order.qcRecords.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Lần {r.attempt} · {r.result}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>
                  </div>
                  {r.defectType && <div className="text-xs text-rose-600">Lỗi: {r.defectType} ({r.severity})</div>}
                  {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                  <div className="text-xs text-slate-400">QC: {r.qcUser?.name}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Nhật ký thao tác</h2>
          <div className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
            {(timeline ?? []).map((t: any) => (
              <div key={t.id} className="flex gap-2 text-xs">
                <span className="text-slate-400">{formatDateTime(t.createdAt)}</span>
                <span className="font-medium text-slate-600">{t.user?.name ?? 'Hệ thống'}</span>
                <span className="text-slate-500">{t.action}</span>
              </div>
            ))}
            {(!timeline || timeline.length === 0) && <p className="text-sm text-slate-400">Chưa có nhật ký.</p>}
          </div>
        </Card>
      </div>

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  );
}
