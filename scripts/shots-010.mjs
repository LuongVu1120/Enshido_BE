// Ảnh riêng cho Phase 010: editor TipTap có nội dung + modal sửa nhân viên.
// Cần API (:4000) + Web (:3000) đang chạy. Dùng: node scripts/shots-010.mjs
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
  const employees = await api('/employees', token);
  const empId = employees.items?.find((e) => e.user?.email === 'tho1@enshido.vn')?.id ?? employees.items?.[0]?.id;
  const orders = await api('/orders?pageSize=50', token);
  const named = orders.items?.find((o) => o.name?.includes('Nhẫn cưới')) ?? orders.items?.find((o) => o.name);

  const browser = await chromium.launch();
  const session = {
    'enshido.accessToken': token,
    'enshido.refreshToken': admin.refreshToken,
    'enshido.user': JSON.stringify(admin.user),
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, session);

  // 21 — Tạo đơn: nhập tên + soạn ghi chú rich content bằng TipTap.
  const p1 = await ctx.newPage();
  await p1.goto(WEB + '/orders/new', { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(1500);
  await p1.fill('input[placeholder^="VD: Nhẫn cưới"]', 'Nhẫn cưới chị Lan — bộ 2 cái');
  const editor = p1.locator('.ProseMirror');
  await editor.click();
  await p1.keyboard.type('Yêu cầu đặc biệt:');
  // In đậm dòng tiêu đề
  await p1.keyboard.press('Home');
  await p1.keyboard.down('Shift'); await p1.keyboard.press('End'); await p1.keyboard.up('Shift');
  await p1.locator('button[title="Đậm"]').click();
  await p1.keyboard.press('End');
  await p1.keyboard.press('Enter');
  // Danh sách chấm
  await p1.locator('button[title="Danh sách chấm"]').click();
  await p1.keyboard.type('Khắc tên Lan & Nam mặt trong');
  await p1.keyboard.press('Enter');
  await p1.keyboard.type('Đánh bóng gương, giao trước 25/06');
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: join(OUT, '21-order-new-richtext.png'), fullPage: true });
  console.log('✔ 21-order-new-richtext');

  // 22 — Modal sửa hồ sơ nhân viên.
  const p2 = await ctx.newPage();
  await p2.goto(WEB + `/employees/${empId}`, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1500);
  await p2.click('button:has-text("Sửa thông tin")');
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: join(OUT, '22-employee-edit.png'), fullPage: false });
  console.log('✔ 22-employee-edit');

  // 23 — Chi tiết đơn có TÊN (tiêu đề) + ghi chú rich hiển thị có định dạng.
  if (named) {
    const p3 = await ctx.newPage();
    await p3.goto(WEB + `/orders/${named.id}`, { waitUntil: 'domcontentloaded' });
    await p3.waitForTimeout(1600);
    await p3.screenshot({ path: join(OUT, '23-order-detail-named.png'), fullPage: false });
    console.log('✔ 23-order-detail-named', named.code, '·', named.name);
  } else {
    console.log('⚠ không tìm thấy đơn có tên để chụp 23');
  }

  await browser.close();
  console.log('DONE → docs/screenshots');
}
main().catch((e) => { console.error(e); process.exit(1); });
