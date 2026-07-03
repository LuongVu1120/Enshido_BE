// Ảnh Phase 013: phiếu QR có URL đích + màn quét chế độ Gom lô.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });
const API = 'http://localhost:4000/api';
const WEB = 'http://localhost:3000';
const api = async (p, t, o = {}) => (await fetch(API + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(o.headers || {}) } })).json();

async function main() {
  const admin = await api('/login', null, { method: 'POST', body: JSON.stringify({ email: 'admin@enshido.vn', password: '123456' }) });
  const token = admin.accessToken;
  const orders = await api('/orders?pageSize=50', token);
  const ord = orders.items.find((o) => o.status === 'WAITING_PRODUCTION' || o.status === 'IN_PRODUCTION') ?? orders.items[0];

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    'enshido.accessToken': token, 'enshido.refreshToken': admin.refreshToken, 'enshido.user': JSON.stringify(admin.user),
  });

  // 28 — Phiếu QR (modal) có URL đích.
  const p1 = await ctx.newPage();
  await p1.goto(WEB + `/orders/${ord.id}`, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(1400);
  const printBtn = p1.locator('button:has-text("In phiếu sản xuất")');
  if (await printBtn.count()) { await printBtn.first().click(); await p1.waitForTimeout(1200); }
  await p1.screenshot({ path: join(OUT, '28-ticket-qr-url.png'), fullPage: false });
  console.log('✔ 28-ticket-qr-url');

  // 29 — Màn quét: chế độ Gom lô.
  const p2 = await ctx.newPage();
  await p2.goto(WEB + '/scan', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1200);
  const gatherBtn = p2.locator('button:has-text("Gom lô")');
  if (await gatherBtn.count()) { await gatherBtn.first().click(); await p2.waitForTimeout(600); }
  await p2.screenshot({ path: join(OUT, '29-scan-gather.png'), fullPage: false });
  console.log('✔ 29-scan-gather');

  await browser.close();
  console.log('DONE');
}
main().catch((e) => { console.error(e); process.exit(1); });
