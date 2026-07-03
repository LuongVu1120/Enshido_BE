// Ảnh Phase 012: form nhập cân (chọn công đoạn + người cân, tiếng Việt) & QC form rút gọn.
// Cần API (:4000) + Web (:3000) đang chạy. Dùng: node scripts/shots-012.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });
const API = 'http://localhost:4000/api';
const WEB = 'http://localhost:3000';

const api = async (path, token, opts = {}) => {
  const res = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) } });
  return res.json();
};

async function main() {
  const admin = await api('/login', null, { method: 'POST', body: JSON.stringify({ email: 'admin@enshido.vn', password: '123456' }) });
  const token = admin.accessToken;
  const orders = await api('/orders?pageSize=50', token);
  const named = orders.items.find((o) => o.name?.includes('Nhẫn cưới')) ?? orders.items.find((o) => o.status === 'IN_PRODUCTION') ?? orders.items[0];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    'enshido.accessToken': token, 'enshido.refreshToken': admin.refreshToken, 'enshido.user': JSON.stringify(admin.user),
  });

  // 26 — Chi tiết đơn: bảng trọng lượng tiếng Việt + form nhập cân (select công đoạn + người cân).
  const p1 = await ctx.newPage();
  await p1.goto(WEB + `/orders/${named.id}`, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(1400);
  const addBtn = p1.locator('button:has-text("Nhập cân")');
  if (await addBtn.count()) { await addBtn.first().click(); await p1.waitForTimeout(500); }
  // cuộn tới khối trọng lượng
  await p1.evaluate(() => { const el = Array.from(document.querySelectorAll('h2')).find((h) => h.textContent?.includes('trọng lượng')); el?.scrollIntoView({ block: 'center' }); });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: join(OUT, '26-weight-entry.png'), fullPage: false });
  console.log('✔ 26-weight-entry', named.code);

  // 27 — QC form rút gọn: bấm "Cần sửa" → tên lỗi + mô tả rich + ảnh.
  const p2 = await ctx.newPage();
  await p2.goto(WEB + '/qc', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1500);
  const card = p2.locator('div.cursor-pointer').first();
  if (await card.count()) { await card.click(); await p2.waitForTimeout(900); }
  const needBtn = p2.locator('button:has-text("Cần sửa")');
  if (await needBtn.count()) { await needBtn.first().click(); await p2.waitForTimeout(700); }
  // gõ mô tả rich
  const editor = p2.locator('.ProseMirror');
  if (await editor.count()) { await editor.click(); await p2.keyboard.type('Xước nhẹ ở cạnh trong, cần đánh bóng lại.'); await p2.waitForTimeout(400); }
  await p2.screenshot({ path: join(OUT, '27-qc-simple-fail.png'), fullPage: false });
  console.log('✔ 27-qc-simple-fail');

  await browser.close();
  console.log('DONE → docs/screenshots');
}
main().catch((e) => { console.error(e); process.exit(1); });
