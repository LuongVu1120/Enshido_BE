'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STEP_LABELS, StepName, orderDisplayName } from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { QrScanner } from '@/components/qr-scanner';

function extractToken(text: string) {
  // QR chứa URL .../scan/<token> hoặc chỉ token.
  const m = text.match(/scan\/([^/?#]+)/);
  return m ? m[1] : text.trim();
}
const stageLabel = (s?: string) => (s ? (STEP_LABELS as any)[s] ?? s : '');

export default function ScanIndexPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'open' | 'gather'>('open');
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);

  // ─── Gom lô ────────────────────────────────────────────────────────────────
  const [batch, setBatch] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState<'ok' | 'err'>('ok');
  const seen = useRef<Set<string>>(new Set());

  function go(text: string) {
    const token = extractToken(text);
    if (token) router.push(`/scan/${token}`);
  }

  async function gather(text: string) {
    const token = extractToken(text);
    if (!token || seen.current.has(token)) return;
    seen.current.add(token);
    try {
      if (!batch) {
        const landing = await get(`/scan/${token}`);
        const stepName = landing.currentStep?.stepName;
        if (!stepName) throw new Error(`${landing.order?.code}: đơn không còn công đoạn để gom`);
        const b = await post('/production/batches', { stepName }); // lỗi nếu công đoạn không chạy lô
        await post(`/production/batches/${b.id}/add`, { qrToken: token });
        const full = await get(`/production/batches/${b.id}`);
        setBatch(full); setMsgTone('ok'); setMsg(`Đã tạo lô ${full.code} (${stageLabel(stepName)}) · gom 1 đơn`);
      } else {
        await post(`/production/batches/${batch.id}/add`, { qrToken: token });
        const full = await get(`/production/batches/${batch.id}`);
        setBatch(full); setMsgTone('ok'); setMsg(`Đã gom ${full.members.length} đơn`);
      }
    } catch (e: any) {
      setMsgTone('err'); setMsg(e.message);
      seen.current.delete(token); // cho quét lại nếu lỗi tạm
    }
  }

  function resetGather() {
    setBatch(null); setMsg(''); seen.current = new Set(); setScanning(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Quét QR phiếu sản xuất" subtitle="Dành cho thợ — cập nhật công đoạn / gom lô" />

      {/* Chuyển chế độ */}
      <div className="mb-3 flex overflow-hidden rounded-lg border border-slate-300">
        <button onClick={() => { setMode('open'); setScanning(false); }} className={`flex-1 px-3 py-2 text-sm ${mode === 'open' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}>Mở đơn</button>
        <button onClick={() => { setMode('gather'); setScanning(false); }} className={`flex-1 px-3 py-2 text-sm ${mode === 'gather' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}>🔥 Gom lô (Đúc/Xi mạ)</button>
      </div>

      {mode === 'open' ? (
        <Card className="p-5">
          {scanning ? <QrScanner onResult={go} /> : (
            <Button size="lg" className="w-full" onClick={() => setScanning(true)}>📷 Mở camera quét QR</Button>
          )}
          <div className="my-4 text-center text-xs text-slate-400">— hoặc nhập mã phiếu / token —</div>
          <div className="flex gap-2">
            <Input placeholder="vd: qr-SX-20260610-0001" value={manual} onChange={(e) => setManual(e.target.value)} />
            <Button onClick={() => go(manual)} disabled={!manual.trim()}>Mở</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="mb-3 text-sm text-slate-500">Quét lần lượt nhiều QR để gom vào một lô. Lô tự tạo theo công đoạn của đơn quét đầu tiên (Đúc/Xi mạ).</p>
          {scanning ? <QrScanner continuous onResult={gather} /> : (
            <Button size="lg" className="w-full" onClick={() => setScanning(true)}>📷 Bắt đầu quét gom</Button>
          )}
          <div className="my-3 flex gap-2">
            <Input placeholder="hoặc nhập mã đơn/token rồi Gom" value={manual} onChange={(e) => setManual(e.target.value)} />
            <Button onClick={() => { gather(manual); setManual(''); }} disabled={!manual.trim()}>Gom</Button>
          </div>
          {msg && <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${msgTone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg}</div>}

          {batch && (
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-600">{batch.code}</span>
                <span className="text-xs text-slate-500">{stageLabel(batch.stepName)} · {batch.members?.length ?? 0} đơn</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {batch.members?.map((m: any) => (
                  <li key={m.stepId} className="flex justify-between rounded border border-slate-100 px-2 py-1">
                    <span>{m.order ? orderDisplayName(m.order) : m.stepId}</span>
                    <span className="text-xs text-slate-400">{m.order?.customer?.name}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Link href="/batches" className="flex-1"><Button className="w-full">Mở lô để chốt →</Button></Link>
                <Button variant="outline" onClick={resetGather}>Lô mới</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
