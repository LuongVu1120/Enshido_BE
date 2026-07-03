// Tiện ích hiển thị tiếng Việt.
export function formatDate(d?: string | Date | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d?: string | Date | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function gram(n?: number | null) {
  if (n == null) return '—';
  return `${n.toFixed(2)}g`;
}

export function percent(n?: number | null) {
  if (n == null) return '—';
  return `${n.toFixed(2)}%`;
}

export function daysLeft(deadline?: string | Date | null): { label: string; overdue: boolean } {
  if (!deadline) return { label: '—', overdue: false };
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `Trễ ${Math.abs(diff)} ngày`, overdue: true };
  if (diff === 0) return { label: 'Hôm nay', overdue: false };
  return { label: `Còn ${diff} ngày`, overdue: false };
}
