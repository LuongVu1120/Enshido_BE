'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INVENTORY_GROUP_LABELS,
  INVENTORY_TXN_LABELS,
  InventoryGroup,
  StockStatus,
  STOCK_STATUS_LABELS,
} from '@enshido/types';
import { get } from '@/lib/api';
import { Button, Card, Input, Select, Spinner } from '@/components/ui';
import { StockStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { Modal, money } from '@/components/modal';
import { useAuth } from '@/lib/providers';
import { Role } from '@enshido/types';
import { ReceiptModal, IssueModal, TransferModal, ItemModal } from './modals';

export default function InventoryPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canWrite = user?.role === Role.WAREHOUSE || user?.role === Role.ADMIN;
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [modal, setModal] = useState<null | 'receipt' | 'issue' | 'transfer' | 'item' | 'txns'>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inv-items', group, status, q, page],
    queryFn: () => get(`/inventory/items?group=${group}&status=${status}&q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`),
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const { data: summary } = useQuery({ queryKey: ['inv-summary'], queryFn: () => get('/inventory/summary'), refetchInterval: 15000 });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['inv-items'] });
    qc.invalidateQueries({ queryKey: ['inv-summary'] });
  }

  return (
    <div>
      <PageHeader
        title="Quản lý tồn kho"
        subtitle="Vật tư · đá · phụ kiện · hóa chất · bao bì · BTP · thành phẩm"
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setModal('item')}>+ Vật tư</Button>
              <Button variant="outline" onClick={() => setModal('transfer')}>⇄ Chuyển kho</Button>
              <Button variant="outline" onClick={() => setModal('issue')}>↑ Xuất kho</Button>
              <Button onClick={() => setModal('receipt')}>↓ Nhập kho</Button>
            </>
          )
        }
      />

      {/* Summary cards theo nhóm */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs uppercase text-slate-400">Tổng giá trị tồn</div>
          <div className="mt-1 text-xl font-bold text-brand-600">{money(summary?.totalValue)}</div>
        </Card>
        {summary?.byGroup?.slice(0, 4).map((g: any) => (
          <Card key={g.group} className="p-4">
            <div className="text-xs uppercase text-slate-400">{INVENTORY_GROUP_LABELS[g.group as InventoryGroup] ?? g.group}</div>
            <div className="mt-1 text-lg font-bold">{money(g.value)}</div>
            <div className="text-xs text-slate-400">{g.count} mặt hàng</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Bảng tồn */}
        <div className="lg:col-span-3">
          <Card className="mb-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Tìm theo tên, mã SKU..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
              <Select value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }} className="max-w-[180px]">
                <option value="">Tất cả nhóm</option>
                {Object.values(InventoryGroup).map((g) => (<option key={g} value={g}>{INVENTORY_GROUP_LABELS[g]}</option>))}
              </Select>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-[160px]">
                <option value="">Trạng thái tồn</option>
                {Object.values(StockStatus).map((s) => (<option key={s} value={s}>{STOCK_STATUS_LABELS[s]}</option>))}
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setModal('txns')}>Lịch sử giao dịch →</Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {isLoading ? (
              <Spinner />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Mã</th><th>Tên</th><th>Nhóm</th><th>ĐVT</th>
                      <th className="text-right">Tồn</th><th className="text-right">Tối thiểu</th>
                      <th className="text-right">Giá vốn</th><th className="text-right">Giá trị</th><th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.items?.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-brand-600">{it.code}</td>
                        <td className="px-4 py-3">{it.name}</td>
                        <td className="px-4 py-3 text-slate-500">{INVENTORY_GROUP_LABELS[it.group as InventoryGroup] ?? it.group ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{it.unit ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{it.currentStock}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{it.minStock}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{money(it.costPrice)}</td>
                        <td className="px-4 py-3 text-right">{money((it.currentStock ?? 0) * (it.costPrice ?? 0))}</td>
                        <td className="px-4 py-3"><StockStatusBadge status={it.stockStatus} /></td>
                      </tr>
                    ))}
                    {data?.items?.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Không có vật tư.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {data && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>Tổng {data.total} mặt hàng</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</Button>
                  <span>{page}/{totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: cảnh báo + nhập xuất hôm nay */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">⚠️ Cảnh báo tồn kho</h3>
            {summary?.alerts?.length ? (
              <div className="space-y-2">
                {summary.alerts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-slate-400">Tồn: {a.currentStock} / tối thiểu {a.minStock}</div>
                    </div>
                    <StockStatusBadge status={a.stockStatus} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Không có cảnh báo.</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Nhập xuất hôm nay</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 p-3">
                <div className="text-2xl font-bold text-emerald-600">{summary?.today?.in ?? 0}</div>
                <div className="text-xs text-slate-400">phiếu nhập</div>
              </div>
              <div className="rounded-lg bg-rose-50 p-3">
                <div className="text-2xl font-bold text-rose-600">{summary?.today?.out ?? 0}</div>
                <div className="text-xs text-slate-400">phiếu xuất</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {modal === 'receipt' && <ReceiptModal items={data?.items ?? []} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'issue' && <IssueModal items={data?.items ?? []} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'transfer' && <TransferModal items={data?.items ?? []} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'item' && <ItemModal onClose={() => setModal(null)} onDone={refresh} />}
      {modal === 'txns' && <TxnsModal onClose={() => setModal(null)} />}
    </div>
  );
}

function TxnsModal({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['inv-txns'], queryFn: () => get('/inventory/transactions?pageSize=40') });
  return (
    <Modal title="Lịch sử giao dịch kho" onClose={onClose} maxWidth="max-w-3xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="py-2">Mã</th><th>Loại</th><th>Vật tư</th><th className="text-right">SL</th><th>Đơn</th><th>Người</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items?.map((t: any) => (
              <tr key={t.id}>
                <td className="py-2 font-medium text-brand-600">{t.code}</td>
                <td>{INVENTORY_TXN_LABELS[t.type as keyof typeof INVENTORY_TXN_LABELS] ?? t.type}</td>
                <td>{t.inventoryItem?.name}</td>
                <td className="text-right">{t.quantity} {t.inventoryItem?.unit ?? ''}</td>
                <td className="text-slate-400">{t.orderId ? '✓' : '—'}</td>
                <td className="text-slate-500">{t.performedBy?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
