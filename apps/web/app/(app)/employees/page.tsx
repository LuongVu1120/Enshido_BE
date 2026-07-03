'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEPARTMENTS, EMPLOYEE_STATUS_LABELS, EmployeeStatus, Role, ROLE_LABELS } from '@enshido/types';
import { get, post } from '@/lib/api';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { EmployeeStatusBadge } from '@/components/status';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/lib/providers';

const empty = () => ({ name: '', phone: '', email: '', role: Role.WORKER as string, department: DEPARTMENTS[0] as string, position: '', joinDate: '', status: EmployeeStatus.ACTIVE as string, skills: '' });

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canWrite = user?.role === Role.ADMIN || user?.role === Role.ACCOUNTANT;
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', q, department, status, page],
    queryFn: () => get(`/employees?q=${encodeURIComponent(q)}&department=${encodeURIComponent(department)}&status=${status}&page=${page}&pageSize=${pageSize}`),
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  async function create() {
    setErr('');
    if (!form.name.trim()) return setErr('Nhập tên nhân viên');
    if (!form.email.trim()) return setErr('Email là bắt buộc (để cấp tài khoản)');
    setBusy(true);
    try {
      const res = await post('/employees', { ...form, joinDate: form.joinDate ? new Date(form.joinDate).toISOString() : undefined });
      setOpen(false); setForm(empty());
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (res?.account) setCreated(res.account); // hiện mật khẩu ngẫu nhiên 1 lần
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader
        title="Quản lý nhân sự"
        subtitle="Hồ sơ nhân viên + công việc theo tháng"
        actions={canWrite && <Button onClick={() => setOpen(true)}>+ Thêm nhân viên</Button>}
      />

      {/* Thống kê theo phòng ban */}
      <div className="mb-4 flex flex-wrap gap-2">
        {data?.byDepartment?.map((d: any) => (
          <div key={d.department} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="text-slate-500">{d.department}</span> <span className="font-bold text-brand-600">{d.count}</span>
          </div>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Tìm tên / mã NV..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="max-w-[200px]">
            <option value="">Tất cả phòng ban</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-[160px]">
            <option value="">Mọi trạng thái</option>
            {Object.values(EmployeeStatus).map((s) => <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr><th className="px-4 py-3">Mã NV</th><th>Họ tên</th><th>Phòng ban</th><th>Chức vụ</th><th>Vào làm</th><th>Tài khoản</th><th>Trạng thái</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.items?.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/employees/${e.id}`} className="font-semibold text-brand-600 hover:underline">{e.code}</Link></td>
                  <td className="px-4 py-3"><Link href={`/employees/${e.id}`} className="hover:underline">{e.name}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{e.department ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.position ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(e.joinDate)}</td>
                  <td className="px-4 py-3">{e.user ? <span className="text-xs text-emerald-600">{e.user.email}</span> : <span className="text-xs text-slate-400">Không có</span>}</td>
                  <td className="px-4 py-3"><EmployeeStatusBadge status={e.status} /></td>
                </tr>
              ))}
              {data?.items?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Không có nhân viên.</td></tr>}
            </tbody>
          </table>
        )}
        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>Tổng {data.total} nhân viên</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Trước</Button>
              <span>{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau ›</Button>
            </div>
          </div>
        )}
      </Card>

      {open && (
        <Modal title="Thêm nhân viên" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Họ tên *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SĐT"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email * (cấp tài khoản)"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Vai trò tài khoản">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.values(Role).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </Field>
            <Field label="Phòng ban">
              <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
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
          </div>
          {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
            <Button onClick={create} disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu & cấp tài khoản'}</Button>
          </div>
        </Modal>
      )}

      {created && (
        <Modal title="✅ Đã cấp tài khoản" onClose={() => setCreated(null)}>
          <p className="text-sm text-slate-600">Tài khoản đăng nhập đã được tạo. <b>Hãy sao chép mật khẩu — chỉ hiển thị 1 lần.</b></p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">Email: <b>{created.email}</b></div>
            <div className="rounded-lg bg-amber-50 px-3 py-2 font-mono text-sm">Mật khẩu: <b>{created.tempPassword}</b></div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { navigator.clipboard?.writeText(`${created.email} / ${created.tempPassword}`); setCreated(null); }}>Sao chép & đóng</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
