'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, getToken } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) return router.replace('/login');
    router.replace(getStoredUser()?.role === 'WORKER' ? '/my-tasks' : '/dashboard');
  }, [router]);
  return null;
}
