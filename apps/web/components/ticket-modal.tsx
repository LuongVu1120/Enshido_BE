'use client';

import { STEP_LABELS, StepName } from '@enshido/types';
import { Button } from './ui';
import { formatDate } from '@/lib/format';

// US5 — Phiếu sản xuất + QR. In bằng window.print() (PROD: render PDF qua Puppeteer).
export function TicketModal({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const o = ticket.order;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">Phiếu sản xuất {ticket.ticketCode}</h3>
          <div className="flex gap-2">
            <Button onClick={() => window.print()}>🖨️ In</Button>
            <Button variant="outline" onClick={onClose}>Đóng</Button>
          </div>
        </div>

        <div className="p-6" id="ticket-print">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💎</span>
                <span className="text-lg font-bold">ENSHIDO JEWELRY</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">Phiếu sản xuất · {ticket.ticketCode}</div>
            </div>
            <div className="max-w-[150px] text-right">
              <img src={ticket.qrDataUrl} alt="QR" className="ml-auto h-28 w-28" />
              <div className="text-[10px] text-slate-400">Quét để cập nhật công đoạn</div>
              {ticket.scanUrl && (
                <a href={ticket.scanUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[9px] leading-tight text-brand-600 underline">
                  {ticket.scanUrl}
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-4 text-sm">
            {o.name?.trim() && <div className="col-span-2"><span className="text-slate-400">Tên đơn:</span> <b>{o.name}</b></div>}
            <div><span className="text-slate-400">Mã đơn:</span> <b>{o.code}</b></div>
            <div><span className="text-slate-400">Khách:</span> {o.customer.name}</div>
            <div><span className="text-slate-400">Deadline:</span> {formatDate(o.deadline)}</div>
            <div><span className="text-slate-400">Ưu tiên:</span> {o.priority}</div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-1">Sản phẩm</th><th>Chất liệu</th><th>Đá</th><th>Size</th><th>SL</th><th>TL ban đầu</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it: any) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="py-1.5">{it.productName}</td>
                  <td>{it.material ?? '—'}</td>
                  <td>{it.stoneType ?? '—'}</td>
                  <td>{it.size ?? '—'}</td>
                  <td>{it.quantity}</td>
                  <td>{it.initialWeight ? `${it.initialWeight}g` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Công đoạn</div>
            <div className="flex flex-wrap gap-1.5">
              {o.steps.map((s: any) => (
                <span key={s.stepOrder} className="rounded border border-slate-200 px-2 py-0.5 text-xs">
                  {s.stepOrder}. {STEP_LABELS[s.stepName as StepName] ?? s.stepName}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Bảng theo dõi trọng lượng</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-y border-slate-200 text-left text-slate-400">
                  <th className="py-1">Công đoạn</th><th>TL trước</th><th>TL sau</th><th>Hao hụt</th><th>Ký</th>
                </tr>
              </thead>
              <tbody>
                {o.steps.map((s: any) => (
                  <tr key={s.stepOrder} className="border-b border-slate-100">
                    <td className="py-2">{STEP_LABELS[s.stepName as StepName] ?? s.stepName}</td>
                    <td className="text-slate-300">______</td>
                    <td className="text-slate-300">______</td>
                    <td className="text-slate-300">______</td>
                    <td className="text-slate-300">______</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
