'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/api';
import { useAuth } from '@/lib/providers';
import { Button, Card, Field, Input } from '@/components/ui';

const DEMO = [
  { email: 'admin@enshido.vn', label: 'Admin / Chủ xưởng' },
  { email: 'quanly@enshido.vn', label: 'Quản lý sản xuất' },
  { email: 'tho1@enshido.vn', label: 'Thợ sản xuất' },
  { email: 'qc@enshido.vn', label: 'Nhân viên QC' },
  { email: 'kho@enshido.vn', label: 'Nhân viên kho' },
  { email: 'ketoan@enshido.vn', label: 'Kế toán' },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('admin@enshido.vn');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      const home = user.role === 'WORKER' ? '/my-tasks' : '/dashboard';
      router.replace(params.get('next') ?? home);
    } catch (err: any) {
      setError(err.message ?? 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-brand-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-xl text-white">
            💎
          </div>
          <div>
            <div className="text-lg font-bold">ENSHIDO Jewelry</div>
            <div className="text-xs text-slate-400">Quản lý đơn hàng sản xuất xưởng kim hoàn</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
          </Field>
          <Field label="Mật khẩu">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </Field>
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-slate-400">Đăng nhập nhanh (demo · mật khẩu 123456):</div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword('123456');
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:border-brand-300 hover:bg-brand-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
