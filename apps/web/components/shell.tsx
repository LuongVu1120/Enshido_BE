'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Role, ROLE_LABELS } from '@enshido/types';
import { useAuth } from '@/lib/providers';
import { post } from '@/lib/api';
import { Modal } from './modal';
import { Button, Field, Input } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: Role[]; // nếu undefined: mọi vai trò
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT] },
  { href: '/orders', label: 'Đơn hàng', icon: '🧾', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT, Role.QC, Role.WAREHOUSE] },
  { href: '/kanban', label: 'Kanban sản xuất', icon: '🗂️', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER] },
  { href: '/batches', label: 'Lô sản xuất', icon: '🔥', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.WORKER] },
  { href: '/qc', label: 'QC kiểm tra', icon: '✅', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.QC] },
  { href: '/inventory', label: 'Tồn kho', icon: '📦', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.WAREHOUSE, Role.ACCOUNTANT] },
  { href: '/finished-goods', label: 'Nhập kho TP', icon: '🏷️', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.WAREHOUSE] },
  { href: '/suppliers', label: 'Nhà cung cấp', icon: '🏭', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.WAREHOUSE] },
  { href: '/customers', label: 'Khách hàng', icon: '👤', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT] },
  { href: '/employees', label: 'Nhân sự', icon: '🧑‍🏭', roles: [Role.ADMIN, Role.ACCOUNTANT, Role.PRODUCTION_MANAGER] },
  { href: '/reports', label: 'Báo cáo', icon: '📈', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT] },
  { href: '/automation', label: 'Tự động hóa', icon: '🤖', roles: [Role.ADMIN, Role.PRODUCTION_MANAGER, Role.ACCOUNTANT] },
  { href: '/my-tasks', label: 'Việc của tôi', icon: '📋', roles: [Role.WORKER, Role.PRODUCTION_MANAGER, Role.ADMIN] },
  { href: '/scan', label: 'Quét QR (Thợ)', icon: '📷' }, // mọi vai trò
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    // Bảo vệ route phía client: chưa đăng nhập → /login (US1.2)
    if (user === null && typeof window !== 'undefined') {
      const stored = localStorage.getItem('enshido.accessToken');
      if (!stored) router.replace('/login');
    }
  }, [user, router]);

  const role = (user?.role as Role) ?? Role.WORKER;
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role) || role === Role.ADMIN);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white">
            💎
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">ENSHIDO</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Jewelry</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              {user?.name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.name}</div>
              <div className="truncate text-xs text-slate-400">{ROLE_LABELS[role]}</div>
            </div>
          </div>
          <button
            onClick={() => setPwOpen(true)}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            🔑 Đổi mật khẩu
          </button>
          <button
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (newPassword.length < 4) return setErr('Mật khẩu mới tối thiểu 4 ký tự');
    setBusy(true);
    try {
      await post('/me/change-password', { oldPassword, newPassword });
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Đổi mật khẩu" onClose={onClose}>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-600">✅ Đã đổi mật khẩu thành công.</p>
          <div className="flex justify-end"><Button onClick={onClose}>Đóng</Button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Mật khẩu hiện tại"><Input type="password" value={oldPassword} onChange={(e) => setOld(e.target.value)} /></Field>
          <Field label="Mật khẩu mới"><Input type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} /></Field>
          {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{err}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Hủy</Button>
            <Button onClick={submit} disabled={busy}>{busy ? 'Đang lưu...' : 'Đổi mật khẩu'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
