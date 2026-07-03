// ─── Sanitize rich-text (Phase 010) — Hiến pháp VI (Security by default) ─────
// Ghi chú đơn nhập bằng TipTap ở client → KHÔNG tin client. Hàm này chạy ở
// server khi create/update để chỉ giữ lại whitelist tag/thuộc tính an toàn,
// loại bỏ mọi <script>, thuộc tính on*, style, và href javascript:/data:.
// Tự viết (0 dependency) — whitelist hẹp, có test payload ở selftest (SC-002).

// Tag cho phép (định dạng cơ bản cho ghi chú xưởng).
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre',
]);

// Tag mà toàn bộ NỘI DUNG bên trong phải bị bỏ (không chỉ thẻ).
const VOID_DANGEROUS = /<\s*(script|style|iframe|object|embed|noscript|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
// Thẻ mở/đóng tự đóng của các tag nguy hiểm còn sót (vd <script src=...>).
const DANGEROUS_SELFCLOSE = /<\s*\/?\s*(script|style|iframe|object|embed|noscript|svg|math)\b[^>]*>/gi;

function safeHref(raw: string): string | null {
  const v = raw.trim().replace(/&amp;/g, '&');
  // Chỉ cho phép liên kết http/https/mailto (tránh javascript:, data:, vbscript:).
  if (/^(https?:\/\/|mailto:)/i.test(v)) return v;
  return null;
}

function cleanAttributes(tag: string, rawAttrs: string): string {
  if (tag === 'a') {
    const hrefMatch = rawAttrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch ? safeHref(hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? '') : null;
    if (!href) return ''; // link không hợp lệ → bỏ thuộc tính (giữ thẻ <a> rỗng)
    const escaped = href.replace(/"/g, '&quot;');
    return ` href="${escaped}" target="_blank" rel="noopener nofollow"`;
  }
  // Mọi tag khác: bỏ TẤT CẢ thuộc tính (loại on*, style, class, id, srcset...).
  return '';
}

/**
 * Sanitize HTML ghi chú về whitelist an toàn. Trả undefined nếu đầu vào rỗng.
 */
export function sanitizeRichText(input?: string | null): string | undefined {
  if (input == null) return undefined;
  let html = String(input);
  if (!html.trim()) return undefined;

  // 1) Bỏ hẳn các khối nguy hiểm (kèm nội dung) + comment.
  html = html.replace(VOID_DANGEROUS, '').replace(DANGEROUS_SELFCLOSE, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2) Duyệt từng thẻ: giữ thẻ whitelist (đã làm sạch thuộc tính), bỏ thẻ khác.
  html = html.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (_m, slash, rawName, rawAttrs) => {
    const name = String(rawName).toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return ''; // bỏ thẻ, giữ text con
    if (slash) return `</${name}>`;
    return `<${name}${cleanAttributes(name, rawAttrs)}>`;
  });

  // 3) Loại bỏ thuộc tính dạng sự kiện còn sót lẫn trong text (an toàn kép).
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  return html.trim() || undefined;
}
