'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { INVENTORY_GROUP_LABELS, InventoryGroup } from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Field, Input, Select } from '@/components/ui';
import { Modal } from '@/components/modal';

type ModalProps = { onClose: () => void; onDone: () => void };

function Err({ msg }: { msg: string }) {
  return msg ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{msg}</div> : null;
}

export function ReceiptModal({ items, onClose, onDone }: ModalProps & { items: any[] }) {
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => get('/inventory/suppliers') });
  const [form, setForm] = useState({ inventoryItemId: '', quantity: '', unitPrice: '', supplierId: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!form.inventoryItemId || !form.quantity) return setErr('Chọn vật tư & nhập số lượng');
    setBusy(true);
    try {
      await post('/inventory/receipts', {
        inventoryItemId: form.inventoryItemId,
        quantity: Number(form.quantity),
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
        supplierId: form.supplierId || undefined,
        note: form.note,
      });
      onDone(); onClose();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="↓ Phiếu nhập kho" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Vật tư *">
          <Select value={form.inventoryItemId} onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}>
            <option value="">— Chọn —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name} (tồn {i.currentStock})</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số lượng *"><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Đơn giá nhập"><Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></Field>
        </div>
        <Field label="Nhà cung cấp">
          <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">— Chọn —</option>
            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Ghi chú"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Err msg={err} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu...' : 'Nhập kho'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function IssueModal({ items, onClose, onDone }: ModalProps & { items: any[] }) {
  const { data: orders } = useQuery({ queryKey: ['orders-for-issue'], queryFn: () => get('/orders?pageSize=50') });
  const [form, setForm] = useState({ inventoryItemId: '', quantity: '', orderId: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!form.inventoryItemId || !form.quantity) return setErr('Chọn vật tư & nhập số lượng');
    setBusy(true);
    try {
      await post('/inventory/issues', {
        inventoryItemId: form.inventoryItemId,
        quantity: Number(form.quantity),
        orderId: form.orderId || undefined,
        note: form.note,
      });
      onDone(); onClose();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="↑ Phiếu xuất kho (cho đơn sản xuất)" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Vật tư *">
          <Select value={form.inventoryItemId} onChange={(e) => setForm({ ...form, inventoryItemId: e.target.value })}>
            <option value="">— Chọn —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name} (tồn {i.currentStock})</option>)}
          </Select>
        </Field>
        <Field label="Số lượng *"><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        <Field label="Xuất cho đơn">
          <Select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}>
            <option value="">— Không gắn đơn —</option>
            {orders?.items?.map((o: any) => <option key={o.id} value={o.id}>{o.code} · {o.customer?.name}</option>)}
          </Select>
        </Field>
        <Field label="Ghi chú"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Err msg={err} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant="danger" onClick={submit} disabled={busy}>{busy ? 'Đang lưu...' : 'Xuất kho'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function TransferModal({ items, onClose, onDone }: ModalProps & { items: any[] }) {
  const [form, setForm] = useState({ fromItemId: '', toItemId: '', quantity: '', note: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!form.fromItemId || !form.toItemId || !form.quantity) return setErr('Chọn vật tư nguồn/đích & số lượng');
    setBusy(true);
    try {
      await post('/inventory/transfers', { fromItemId: form.fromItemId, toItemId: form.toItemId, quantity: Number(form.quantity), note: form.note });
      onDone(); onClose();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="⇄ Chuyển kho" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Từ vật tư (nguồn) *">
          <Select value={form.fromItemId} onChange={(e) => setForm({ ...form, fromItemId: e.target.value })}>
            <option value="">— Chọn —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name} (tồn {i.currentStock})</option>)}
          </Select>
        </Field>
        <Field label="Sang vật tư (đích) *">
          <Select value={form.toItemId} onChange={(e) => setForm({ ...form, toItemId: e.target.value })}>
            <option value="">— Chọn —</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}
          </Select>
        </Field>
        <Field label="Số lượng *"><Input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
        <Field label="Ghi chú"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Err msg={err} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu...' : 'Chuyển kho'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ItemModal({ onClose, onDone }: ModalProps) {
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => get('/inventory/suppliers') });
  const [form, setForm] = useState({ name: '', group: InventoryGroup.RAW_MATERIAL as string, unit: 'cái', minStock: '', costPrice: '', openingStock: '', supplierId: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!form.name.trim()) return setErr('Nhập tên vật tư');
    setBusy(true);
    try {
      await post('/inventory/items', {
        name: form.name, group: form.group, unit: form.unit,
        minStock: form.minStock ? Number(form.minStock) : 0,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        openingStock: form.openingStock ? Number(form.openingStock) : 0,
        supplierId: form.supplierId || undefined,
      });
      onDone(); onClose();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <Modal title="+ Thêm vật tư" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Tên vật tư *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nhóm kho">
            <Select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })}>
              {Object.values(InventoryGroup).map((g) => <option key={g} value={g}>{INVENTORY_GROUP_LABELS[g]}</option>)}
            </Select>
          </Field>
          <Field label="Đơn vị tính"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          <Field label="Tồn ban đầu"><Input type="number" step="0.01" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} /></Field>
          <Field label="Tồn tối thiểu"><Input type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></Field>
          <Field label="Giá vốn"><Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></Field>
          <Field label="NCC">
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">— Chọn —</option>
              {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        <Err msg={err} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu vật tư'}</Button>
        </div>
      </div>
    </Modal>
  );
}
