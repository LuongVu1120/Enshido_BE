'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFECT_TYPES,
  QC_CHECKLIST,
  QCResult,
  STEP_LABELS,
  StepName,
  type QcCheckValue,
} from '@enshido/types';
import { get, post } from '@/lib/api';
import { Badge, Button, Card, Field, Input, Spinner, Stat } from '@/components/ui';
import { OrderStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { ImageUpload, fileUrl } from '@/components/image-upload';
import { RichText, RichTextView } from '@/components/rich-text';
import { daysLeft, formatDateTime, gram, percent } from '@/lib/format';

const ALLOWED_LOSS = 3; // % cảnh báo (mặc định)

export default function QCPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [itemId, setItemId] = useState<string>('');
  const [checklist, setChecklist] = useState<Record<string, QcCheckValue>>({});
  const [mode, setMode] = useState<null | 'fail'>(null);
  const [failResult, setFailResult] = useState<string>(QCResult.NEEDS_REWORK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [fail, setFail] = useState({ defectType: DEFECT_TYPES[0] as string, note: '' });
  const [images, setImages] = useState<string[]>([]);

  const { data: orders, isLoading } = useQuery({ queryKey: ['qc-orders'], queryFn: () => get('/qc/orders'), refetchInterval: 10000 });
  const { data: stats } = useQuery({ queryKey: ['qc-stats'], queryFn: () => get('/qc/stats'), refetchInterval: 10000 });
  const { data: history } = useQuery({ queryKey: ['qc-history', selected?.id], queryFn: () => get(`/qc/${selected.id}/history`), enabled: !!selected });

  function open(order: any) {
    setSelected(order);
    setItemId(order.items?.[0]?.id ?? '');
    setChecklist(Object.fromEntries(QC_CHECKLIST.map((c) => [c.key, 'na'])) as Record<string, QcCheckValue>);
    setMode(null);
    setErr('');
    setImages([]);
    setFail({ defectType: DEFECT_TYPES[0], note: '' });
  }

  const checklistArr = () => QC_CHECKLIST.map((c) => ({ key: c.key, label: c.label, value: checklist[c.key] ?? 'na' }));
  const failedCriteria = useMemo(() => QC_CHECKLIST.filter((c) => checklist[c.key] === 'fail'), [checklist]);
  const criticalFailed = failedCriteria.some((c) => c.critical);

  const item = selected?.items?.find((i: any) => i.id === itemId) ?? selected?.items?.[0];
  const lossPct = item?.initialWeight ? Math.round(((item.initialWeight - (item.currentWeight ?? item.initialWeight)) / item.initialWeight) * 1000) / 10 : 0;

  async function doPass() {
    if (failedCriteria.length > 0 && !confirm(`Có ${failedCriteria.length} tiêu chí KHÔNG đạt. Vẫn xác nhận ĐẠT?`)) return;
    setBusy(true); setErr('');
    try {
      await post(`/qc/${selected.id}/pass`, { orderItemId: itemId || undefined, note: 'Đạt QC', checklist: JSON.stringify(checklistArr()) });
      queryClient.invalidateQueries({ queryKey: ['qc-orders'] });
      queryClient.invalidateQueries({ queryKey: ['qc-stats'] });
      setSelected(null);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  function startFail(result: string) {
    setFailResult(result);
    setMode('fail');
    // gợi ý loại lỗi từ tiêu chí không đạt đầu tiên
    if (failedCriteria[0]) {
      const map: Record<string, string> = { stone: 'Lỗi gắn đá', polish: 'Lỗi đánh bóng', plating: 'Lỗi xi mạ', size: 'Sai kích thước', casting: 'Lỗi đúc (rỗ/khí)', design: 'Sai mẫu thiết kế', weight: 'Hao hụt vượt mức' };
      const suggested = map[failedCriteria[0].key];
      if (suggested) setFail((f) => ({ ...f, defectType: suggested }));
    }
  }

  async function doFail() {
    setErr('');
    if (!fail.defectType?.trim()) return setErr('Nhập tên lỗi');
    setBusy(true);
    try {
      // MVP (Phase 012): chỉ tên lỗi + mô tả (rich) + ảnh. Server tự chọn công đoạn trả về.
      await post(`/qc/${selected.id}/fail`, {
        result: failResult,
        orderItemId: itemId || undefined,
        defectType: fail.defectType,
        note: fail.note,
        imageUrls: images,
        checklist: JSON.stringify(checklistArr()),
      });
      queryClient.invalidateQueries({ queryKey: ['qc-orders'] });
      queryClient.invalidateQueries({ queryKey: ['qc-stats'] });
      setSelected(null);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="QC kiểm tra" subtitle="Kiểm định chất lượng theo bộ tiêu chí" />

      {/* Thống kê */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Đơn chờ QC" value={stats?.pending ?? '—'} tone="amber" />
        <Stat label="Đã kiểm hôm nay" value={(stats?.passedToday ?? 0) + (stats?.failedToday ?? 0)} />
        <Stat label="Đạt hôm nay" value={stats?.passedToday ?? 0} tone="green" />
        <Stat label="Tỷ lệ đạt hôm nay" value={`${stats?.passRateToday ?? 0}%`} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Danh sách đơn chờ */}
        <div className="space-y-2 lg:col-span-1">
          {orders?.length === 0 && <Card className="p-6 text-center text-sm text-slate-400">Không có đơn chờ QC.</Card>}
          {orders?.map((o: any) => {
            const dl = daysLeft(o.deadline);
            const lossWarn = o.weightLogs?.some((w: any) => w.exceedsAllowed);
            return (
              <Card key={o.id} className={`cursor-pointer p-4 transition ${selected?.id === o.id ? 'ring-2 ring-brand-400' : 'hover:border-brand-200'}`} onClick={() => open(o)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-600">{o.code}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-1 text-sm">{o.items?.[0]?.productName}{o.items?.length > 1 && <span className="text-slate-400"> +{o.items.length - 1}</span>}</div>
                <div className="text-xs text-slate-400">{o.customer?.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {dl.overdue && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">⏰ {dl.label}</span>}
                  {lossWarn && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">⚠️ hao hụt</span>}
                  {o.qcRecords?.length > 0 && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">đã kiểm {o.qcRecords.length}×</span>}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Phiếu kiểm */}
        <div className="lg:col-span-2">
          {!selected ? (
            <Card className="p-10 text-center text-slate-400">Chọn một đơn để mở phiếu kiểm QC.</Card>
          ) : (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{selected.code}</div>
                  <div className="text-sm text-slate-500">{selected.customer?.name}</div>
                </div>
                <OrderStatusBadge status={selected.status} />
              </div>

              {/* Chọn sản phẩm nếu đơn nhiều SP */}
              {selected.items?.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selected.items.map((it: any) => (
                    <button key={it.id} onClick={() => setItemId(it.id)} className={`rounded-lg px-3 py-1.5 text-sm ${itemId === it.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{it.productName}</button>
                  ))}
                </div>
              )}

              {/* Thông tin sản phẩm cần kiểm */}
              <div className="mb-4 flex gap-4 rounded-lg border border-slate-100 p-3">
                {item?.imageUrl ? <img src={fileUrl(item.imageUrl)} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-2xl">💍</div>}
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{item?.productName}</div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span>Chất liệu: <b className="text-slate-700">{item?.material ?? '—'}</b></span>
                    <span>Đá: <b className="text-slate-700">{item?.stoneType ?? '—'} {item?.stoneSize ?? ''}</b></span>
                    <span>Size: <b className="text-slate-700">{item?.size ?? '—'}</b></span>
                    <span>Xi/màu: <b className="text-slate-700">{item?.platingColor ?? '—'}</b></span>
                    <span>TL ban đầu: <b className="text-slate-700">{gram(item?.initialWeight)}</b></span>
                    <span>TL hiện tại: <b className="text-slate-700">{gram(item?.currentWeight)}</b></span>
                    <span className={lossPct > ALLOWED_LOSS ? 'text-rose-600' : ''}>Hao hụt: <b>{percent(lossPct)}</b>{lossPct > ALLOWED_LOSS && ' ⚠️ vượt định mức'}</span>
                  </div>
                  {item?.technicalNote && <div className="mt-1 text-xs text-slate-500">Yêu cầu KT: {item.technicalNote}</div>}
                </div>
              </div>

              {err && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}

              {/* Checklist tiêu chí */}
              <div className="mb-4">
                <div className="mb-2 text-sm font-semibold text-slate-700">Tiêu chí kiểm ({failedCriteria.length > 0 ? <span className="text-rose-600">{failedCriteria.length} không đạt</span> : 'chưa có lỗi'})</div>
                <div className="space-y-1">
                  {QC_CHECKLIST.map((c) => (
                    <div key={c.key} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                      <span className="flex-1">{c.label}{c.critical && <span className="ml-1 text-[10px] text-rose-500">●</span>}</span>
                      {(['pass', 'fail', 'na'] as QcCheckValue[]).map((v) => (
                        <button key={v} onClick={() => setChecklist((cl) => ({ ...cl, [c.key]: v }))}
                          className={`rounded px-2 py-0.5 text-xs ${checklist[c.key] === v ? (v === 'pass' ? 'bg-emerald-500 text-white' : v === 'fail' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white') : 'bg-slate-100 text-slate-500'}`}>
                          {v === 'pass' ? 'Đạt' : v === 'fail' ? 'Lỗi' : 'Bỏ'}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">● = tiêu chí nghiêm trọng</div>
              </div>

              {/* Kết quả */}
              {!mode ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="success" size="lg" disabled={busy} onClick={doPass}>✓ Đạt</Button>
                  <Button variant="warning" size="lg" onClick={() => startFail(QCResult.NEEDS_REWORK)}>✎ Cần sửa</Button>
                  <Button variant="danger" size="lg" onClick={() => startFail(QCResult.FAIL)}>✗ Không đạt</Button>
                  {criticalFailed && <span className="self-center text-xs text-rose-600">⚠️ Có tiêu chí nghiêm trọng không đạt</span>}
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <div className="text-sm font-semibold text-rose-700">{failResult === QCResult.NEEDS_REWORK ? 'Cần sửa' : 'Không đạt'} — mô tả lỗi</div>
                  <Field label="Tên lỗi *">
                    <Input value={fail.defectType} onChange={(e) => setFail({ ...fail, defectType: e.target.value })} placeholder="VD: Lỗi gắn đá / Xước bề mặt..." list="qc-defect-suggestions" />
                    <datalist id="qc-defect-suggestions">{DEFECT_TYPES.map((d) => <option key={d} value={d} />)}</datalist>
                  </Field>
                  <Field label="Mô tả">
                    <RichText value={fail.note} onChange={(html) => setFail({ ...fail, note: html })} placeholder="Mô tả chi tiết lỗi (in đậm, danh sách, liên kết...)" />
                  </Field>
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500">Ảnh lỗi — tùy chọn ({images.length})</span>
                      <ImageUpload objectType="qc_record" objectId={selected.id} orderId={selected.id} label="Tải ảnh lỗi" onUploaded={(url) => setImages((a) => [...a, url])} />
                    </div>
                    {images.length > 0 && <div className="flex flex-wrap gap-2">{images.map((u) => <img key={u} src={fileUrl(u)} alt="" className="h-16 w-16 rounded border border-slate-200 object-cover" />)}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={doFail} disabled={busy}>{busy ? 'Đang lưu...' : 'Xác nhận'}</Button>
                    <Button variant="outline" onClick={() => setMode(null)}>Quay lại</Button>
                  </div>
                  <p className="text-[11px] text-slate-400">Đơn sẽ về "Cần sửa"; hệ thống tự chọn công đoạn trả về (công đoạn vừa xong gần nhất).</p>
                </div>
              )}

              {/* Lịch sử QC */}
              {history && history.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2 text-sm font-semibold text-slate-700">Lịch sử kiểm ({history.length})</div>
                  <div className="space-y-2">
                    {history.map((r: any) => {
                      const imgs: string[] = (() => { try { return JSON.parse(r.imageUrls || '[]'); } catch { return []; } })();
                      const cl: any[] = (() => { try { return JSON.parse(r.checklist || '[]'); } catch { return []; } })();
                      const nFail = cl.filter((x) => x.value === 'fail').length;
                      const tone = r.result === 'PASS' ? 'green' : r.result === 'NEEDS_REWORK' ? 'amber' : 'red';
                      return (
                        <div key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><b>Lần {r.attempt}</b> <Badge tone={tone as any}>{r.result}</Badge></span>
                            <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>
                          </div>
                          {r.defectType && <div className="text-xs text-rose-600">Lỗi: {r.defectType}{r.severity ? ` (${r.severity})` : ''}{r.returnStep?.stepName ? ` → ${STEP_LABELS[r.returnStep.stepName as StepName] ?? r.returnStep.stepName}` : ''}</div>}
                          {nFail > 0 && <div className="text-xs text-slate-500">{nFail} tiêu chí không đạt</div>}
                          {r.note && <RichTextView html={r.note} className="text-xs text-slate-500" />}
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-slate-400">QC: {r.qcUser?.name}{r.reworkUser ? ` · sửa: ${r.reworkUser.name}` : ''}</span>
                            {imgs.length > 0 && <div className="flex gap-1">{imgs.map((u) => <img key={u} src={fileUrl(u)} alt="" className="h-10 w-10 rounded border border-slate-200 object-cover" />)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
