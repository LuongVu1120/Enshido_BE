// Chụp ảnh tất cả màn hình → docs/screenshots/*.png (cho REPORT.md).
// Cần API (:4000) + Web (:3000) đang chạy. Dùng: node scripts/shots.mjs
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
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  return res.json();
};

async function main() {
  // Lấy token + dữ liệu mẫu.
  const admin = await api('/login', null, { method: 'POST', body: JSON.stringify({ email: 'admin@enshido.vn', password: '123456' }) });
  const token = admin.accessToken;
  const orders = await api('/orders?pageSize=50', token);
  const inProd = orders.items.find((o) => o.status === 'IN_PRODUCTION') ?? orders.items[0];
  const detail = await api(`/orders/${inProd.id}`, token);
  const qrToken = detail.qrToken;
  const customers = await api('/customers?pageSize=5', token);
  const custId = customers.items?.[0]?.id;
  const employees = await api('/employees', token);
  const empId = employees.items?.find((e) => e.user?.email === 'tho1@enshido.vn')?.id ?? employees.items?.[0]?.id;
  console.log('order:', detail.code, 'qr:', qrToken, 'cust:', custId, 'emp:', empId);

  const browser = await chromium.launch();
  const session = {
    'enshido.accessToken': token,
    'enshido.refreshToken': admin.refreshToken,
    'enshido.user': JSON.stringify(admin.user),
  };

  async function shot(name, path, { mobile = false, wait = 2600, full = true } = {}) {
    const ctx = await browser.newContext({
      viewport: mobile ? { width: 402, height: 860 } : { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    // Nạp session vào localStorage trước khi app chạy (trừ trang login).
    if (!name.startsWith('01')) {
      await ctx.addInitScript((s) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      }, session);
    }
    const page = await ctx.newPage();
    await page.goto(WEB + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full && !mobile });
    await ctx.close();
    console.log('✔', name);
  }

  await shot('01-login', '/login', { full: false });
  await shot('02-dashboard', '/dashboard');
  await shot('03-orders', '/orders');
  await shot('04-order-new', '/orders/new');
  await shot('05-order-detail', `/orders/${inProd.id}`);
  await shot('06-kanban', '/kanban', { full: false });
  if (custId) await shot('16-customer-detail', `/customers/${custId}`);
  await shot('17-employees', '/employees');
  if (empId) await shot('18-employee-worklog', `/employees/${empId}`);
  await shot('07-qc', '/qc');
  await shot('08-customers', '/customers');
  await shot('09-inventory', '/inventory');
  await shot('10-finished-goods', '/finished-goods');
  await shot('11-suppliers', '/suppliers');
  await shot('12-scan-worker', `/scan/${qrToken}`, { mobile: true, full: false });

  // Báo cáo (Phase 003) — chụp theo tab.
  async function shotReport(name, tabText) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, session);
    const page = await ctx.newPage();
    await page.goto(WEB + '/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    if (tabText) { await page.click(`button:has-text("${tabText}")`); await page.waitForTimeout(1500); }
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await ctx.close();
    console.log('✔', name);
  }
  await shotReport('13-reports-orders', null);
  await shotReport('14-reports-loss', 'Hao hụt');
  await shotReport('15-reports-inventory', 'Tồn kho');

  // Tự động hóa (Phase 005) — chụp theo tab.
  async function shotAuto(name, tabText) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, session);
    const page = await ctx.newPage();
    await page.goto(WEB + '/automation', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    if (tabText) { await page.click(`button:has-text("${tabText}")`); await page.waitForTimeout(1400); }
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    await ctx.close();
    console.log('✔', name);
  }
  await shotAuto('19-automation-delay', null);
  await shotAuto('20-automation-kpi', 'KPI & lương');

  await browser.close();
  console.log('DONE → docs/screenshots');
}

main().catch((e) => { console.error(e); process.exit(1); });
