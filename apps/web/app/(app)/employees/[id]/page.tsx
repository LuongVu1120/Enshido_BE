'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEPARTMENTS, EMPLOYEE_STATUS_LABELS, EmployeeStatus, Role, ROLE_LABELS } from '@enshido/types';
import { get, post, put } from '@/lib/api';
import { Button, Card, Field, Input, Select, Spinner, Stat } from '@/components/ui';
import { EmployeeStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';
import { formatDate, formatDateTime, gram } from '@/lib/format';
import { useAuth } from '@/lib/providers';

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const canWrite = user?.role === Role.ADMIN || user?.role === Role.ACCOUNTANT;
  const [month, setMonth] = useState(thisMonth());
  const [resetPw, setResetPw] = useState<{ email: string; tempPassword: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [editErr, setEditErr] = useState('');

  const { data: emp, isLoading } = useQuery({ queryKey: ['employee', id], queryFn: () => get(`/employees/${id}`) });
  const { data: wl } = useQuery({ queryKey: ['worklog', id, month], queryFn: () => get(`/employees/${id}/worklog?month=${month}`) });

  async function doReset() {
    if (!confirm('Reset mật khẩu nhân viên này? Mật khẩu cũ sẽ mất hiệu lực.')) return;
    setBusy(true);
    try { setResetPw(await post(`/employees/${id}/reset-password`)); } finally { setBusy(false); }
  }

  function openEdit() {
    setEditErr('');
    setForm({
      name: emp.name ?? '',
      phone: emp.phone ?? '',
      email: emp.email ?? '',
      department: emp.department ?? DEPARTMENTS[0],
      position: emp.position ?? '',
      joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().slice(0, 10) : '',
      status: emp.status ?? EmployeeStatus.ACTIVE,
      skills: emp.skills ?? '',
      note: emp.note ?? '',
    });
    setEdit(true);
  }

  async function saveEdit() {
    setEditErr('');
    if (!form.name?.trim() || form.name.trim().length < 2) return setEditErr('Họ tên tối thiểu 2 ký tự');
    setBusy(true);
    try {
      await put(`/employees/${id}`, { ...form, joinDate: form.joinDate ? new Date(form.joinDate).toISOString() : undefined });
      setEdit(false);
      qClient.invalidateQueries({ queryKey: ['employee', id] });
      qClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (e: any) { setEditErr(e.message); } finally { setBusy(false); }
  }

  if (isLoading || !emp) return <Spinner />;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={emp.name}
        subtitle={`${emp.code} · ${emp.position ?? ''} · ${emp.department ?? ''}`}
        actions={canWrite && <Button variant="outline" onClick={openEdit}>✏️ Sửa thông tin</Button>}
      />

      {/* Hồ sơ */}
      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div><span className="text-slate-400">Trạng thái:</span> <EmployeeStatusBadge status={emp.status} /></div>
          <div><span className="text-slate-400">Vào làm:</span> <b>{formatDate(emp.joinDate)}</b></div>
          <div><span className="text-slate-400">SĐT:</span> {emp.phone ?? '—'}</div>
          <div><span className="text-slate-400">Email:</span> {emp.email ?? '—'}</div>
          <div>
            <span className="text-slate-400">Tài khoản:</span>{' '}
            {emp.user ? <span className="text-emerald-600">{emp.user.email} ({ROLE_LABELS[emp.user.role as keyof typeof ROLE_LABELS] ?? emp.user.role})</span> : <span className="text-slate-400">Không có tài khoản đăng nhập</span>}
          </div>
          {emp.skills && <div><span className="text-slate-400">Kỹ năng:</span> {emp.skills}</div>}
          {isAdmin && emp.user && (
            <Button variant="outline" size="sm" disabled={busy} onClick={doReset}>🔑 Reset mật khẩu</Button>
          )}
        </div>
      </Card>

      {resetPw && (
        <Modal title="🔑 Đã reset mật khẩu" onClose={() => setResetPw(null)}>
          <p className="text-sm text-slate-600"><b>Sao chép mật khẩu mới — chỉ hiển thị 1 lần.</b></p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">Email: <b>{resetPw.email}</b></div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 font-mono text-sm">Mật khẩu mới: <b>{resetPw.tempPassword}</b></div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { navigator.clipboard?.writeText(`${resetPw.email} / ${resetPw.tempPassword}`); setResetPw(null); }}>Sao chép & đóng</Button>
          </div>
        </Modal>
      )}

      {edit && form && (
        <Modal title={`Sửa hồ sơ — ${emp.code}`} onClose={() => setEdit(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Họ tên *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SĐT"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email (hồ sơ)"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phòng ban">
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {!DEPARTMENTS.includes(form.department) && form.department && <option value={form.department}>{form.department}</option>}
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Chức vụ"><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="Ngày vào làm"><Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></Field>
            <Field label="Trạng thái">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.values(EmployeeStatus).map((s) => <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Kỹ năng (phân cách ,)"><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
            <div className="col-span-2"><Field label="Ghi chú"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field></div>
          </div>
          {form.status === EmployeeStatus.RESIGNED && emp.user && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Lưu ý: đặt "Nghỉ việc" sẽ <b>khóa tài khoản đăng nhập</b> liên kết.</div>
          )}
          {editErr && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{editErr}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEdit(false)}>Hủy</Button>
            <Button onClick={saveEdit} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </div>
        </Modal>
      )}

      {/* Công việc theo tháng */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Công việc trong tháng</h2>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
      </div>

      {!wl ? (
        <Spinner />
      ) : !wl.hasAccount ? (
        <Card className="p-6 text-center text-sm text-slate-400">{wl.note}</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Stat label="Công đoạn hoàn thành" value={wl.summary.completed} tone="blue" />
            <Stat label="Sản lượng" value={wl.summary.output} tone="green" />
            <Stat label="Đúng hạn" value={`${wl.summary.onTimeRate}%`} tone="green" />
            <Stat label="Tỷ lệ lỗi" value={`${wl.summary.defectRate}%`} tone={wl.summary.defectRate > 0 ? 'amber' : 'slate'} />
            <Stat label="Lượt QC" value={wl.summary.qcCount} />
            <Stat label="Hao hụt gây ra" value={gram(wl.summary.lossCaused)} tone="red" />
          </div>

          <Card className="mt-4 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Chi tiết công việc — tháng {wl.month} ({wl.steps.length} công đoạn)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr><th className="px-4 py-3">Đơn</th><th>Công đoạn</th><th>SL</th><th>Lỗi</th><th>Hoàn thành lúc</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wl.steps.map((s: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-brand-600">{s.orderCode}</td>
                    <td className="px-4 py-3">{s.step}</td>
                    <td className="px-4 py-3">{s.quantity}</td>
                    <td className="px-4 py-3">{s.defect > 0 ? <span className="text-rose-600">{s.defect}</span> : '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(s.completedAt)}</td>
                  </tr>
                ))}
                {wl.steps.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Không có công việc trong tháng này.</td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
