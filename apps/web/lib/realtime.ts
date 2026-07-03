'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    socket = io(url, { transports: ['websocket', 'polling'], reconnection: true });
  }
  return socket;
}

// Lắng nghe sự kiện realtime (Kanban/Dashboard cập nhật khi thợ báo xong — Hiến pháp VII).
export function useRealtime(events: string[], onEvent: () => void) {
  useEffect(() => {
    let s: Socket;
    try {
      s = getSocket();
    } catch {
      return;
    }
    const handler = () => onEvent();
    events.forEach((e) => s.on(e, handler));
    return () => {
      events.forEach((e) => s.off(e, handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
