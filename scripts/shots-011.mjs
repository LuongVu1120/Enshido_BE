// Ảnh Phase 011: màn Lô sản xuất + xem trước phân bổ hao hụt.
// Cần API (:4000) + Web (:3000) đang chạy. Dùng: node scripts/shots-011.mjs
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
  const batches = await api('/production/batches?status=OPEN', token);
  const open = batches.find((b) => b.stepName === 'CASTING') ?? batches[0];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    'enshido.accessToken': token,
    'enshido.refreshToken': admin.refreshToken,
    'enshido.user': JSON.stringify(admin.user),
  });
  const page = await ctx.newPage();
  await page.goto(WEB + '/batches', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Chọn lô → nhập tổng KL ra để hiện xem trước phân bổ.
  await page.click(`text=${open.code}`);
  await page.waitForTimeout(900);
  const totalOut = String(Math.round(((11.0) - 0.3) * 100) / 100); // demo: hao hụt 0.30g
  const input = page.locator('input[placeholder="g"]');
  if (await input.count()) { await input.first().fill(totalOut); await page.waitForTimeout(700); }
  await page.screenshot({ path: join(OUT, '24-batch-allocate.png'), fullPage: true });
  console.log('✔ 24-batch-allocate', open.code);

  // 25 — Kanban theo công đoạn.
  const kp = await ctx.newPage();
  await kp.goto(WEB + '/kanban', { waitUntil: 'domcontentloaded' });
  await kp.waitForTimeout(1400);
  await kp.click('button:has-text("Theo công đoạn")');
  await kp.waitForTimeout(1200);
  await kp.screenshot({ path: join(OUT, '25-kanban-by-step.png'), fullPage: false });
  console.log('✔ 25-kanban-by-step');

  await browser.close();
  console.log('DONE → docs/screenshots');
}
main().catch((e) => { console.error(e); process.exit(1); });
