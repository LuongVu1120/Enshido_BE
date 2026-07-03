'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser, SessionUser } from './api';

const AuthContext = createContext<{
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  logout: () => void;
}>({ user: null, setUser: () => {}, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 10_000 } },
      }),
  );
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      logout: () => {
        clearSession();
        setUser(null);
        window.location.href = '/login';
      },
    }),
    [user],
  );

  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}
