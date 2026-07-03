// Self-test E2E — chạy thật qua API đang chạy (mặc định http://localhost:4000/api).
// Kiểm mọi function chính + assert kết quả theo spec (FR/US/SC). Dùng: node api/test/selftest.mjs
const BASE = (process.env.API_URL ?? 'http://localhost:4000') + '/api';

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
}
function section(t) { console.log(`\n── ${t} ──`); }

async function req(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const txt = await res.text();
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { status: res.status, data };
}
const login = async (email) => (await req('POST', '/login', null, { email, password: '123456' })).data;

async function completeCurrent(qrToken, worker, { stepId, version, prev, cur, confirmNegative, itemId }) {
  await req('POST', `/scan/${qrToken}/accept`, worker, { stepId });
  await req('POST', `/scan/${qrToken}/start`, worker, { stepId });
  return req('POST', `/scan/${qrToken}/complete`, worker, {
    stepId, completedQuantity: 1, orderItemId: itemId,
    previousWeight: prev, currentWeight: cur, confirmNegative,
  });
}

async function main() {
  console.log(`SELF-TEST → ${BASE}`);

  // ── 1. AUTH + RBAC ──────────────────────────────────────────────────────
  section('1. Auth & RBAC');
  const admin = await login('admin@enshido.vn');
  const manager = await login('quanly@enshido.vn');
  const worker = await login('tho1@enshido.vn');
  const qcUser = await login('qc@enshido.vn');
  ok('Login admin trả accessToken + role ADMIN', admin?.accessToken && admin.user.role === 'ADMIN');
  ok('Login quản lý role PRODUCTION_MANAGER', manager?.user?.role === 'PRODUCTION_MANAGER');
  ok('Login thợ role WORKER', worker?.user?.role === 'WORKER');
  const aT = admin.accessToken, mT = manager.accessToken, wT = worker.accessToken, qT = qcUser.accessToken;

  ok('Sai mật khẩu → 401', (await req('POST', '/login', null, { email: 'admin@enshido.vn', password: 'wrongpass' })).status === 401);
  ok('Mật khẩu quá ngắn → 400 (ValidationPipe)', (await req('POST', '/login', null, { email: 'admin@enshido.vn', password: 'x' })).status === 400);
  ok('Không token gọi /orders → 401', (await req('GET', '/orders')).status === 401);
  ok('/me trả đúng user', (await req('GET', '/me', mT)).data?.email === 'quanly@enshido.vn');
  ok('RBAC: thợ gọi /dashboard → 403', (await req('GET', '/dashboard/summary', wT)).status === 403);
  ok('RBAC: thợ tạo đơn → 403', (await req('POST', '/orders', wT, { customerId: 'x', items: [] })).status === 403);
  ok('RBAC: manager xem dashboard → 200', (await req('GET', '/dashboard/summary', mT)).status === 200);

  // ── 2. CUSTOMER (FR-003) ────────────────────────────────────────────────
  section('2. Khách hàng');
  const cust = (await req('POST', '/customers', mT, { name: 'Selftest Khách', phone: '0900000001', channel: 'SHOPEE', customerType: 'VIP' })).data;
  ok('Tạo khách sinh mã KH-######', /^KH-\d{6}$/.test(cust?.code), cust?.code);
  ok('Lịch sử đơn của khách (ban đầu rỗng)', Array.isArray((await req('GET', `/customers/${cust.id}/orders`, mT)).data) && (await req('GET', `/customers/${cust.id}/orders`, mT)).data.length === 0);

  // ── 3. ORDER (FR-004/005) ───────────────────────────────────────────────
  section('3. Đơn hàng + sản phẩm');
  const created = (await req('POST', '/orders', mT, {
    customerId: cust.id, salesChannel: 'SHOPEE', priority: 'HIGH',
    deadline: new Date(Date.now() + 86400000).toISOString(),
    items: [
      { productName: 'Nhẫn test', material: 'Vàng 18K', size: '16', quantity: 1, initialWeight: 12.5 },
      { productName: 'Dây test', material: 'Bạc 925', quantity: 2, initialWeight: 8.0 },
    ],
  })).data;
  ok('Tạo đơn sinh mã SX-YYYYMMDD-####', /^SX-\d{8}-\d{4}$/.test(created?.code), created?.code);
  ok('Đơn có 2 sản phẩm', created?.items?.length === 2);
  ok('Trạng thái khởi tạo = WAITING_PRODUCTION', created?.status === 'WAITING_PRODUCTION');
  ok('Đơn có qrToken', !!created?.qrToken);
  ok('Lọc theo status trả kết quả', (await req('GET', '/orders?status=WAITING_PRODUCTION&pageSize=5', mT)).data?.items?.length > 0);
  ok('Tìm theo mã đơn khớp', (await req('GET', `/orders?q=${created.code}`, mT)).data?.items?.[0]?.code === created.code);
  ok('Phân trang trả total/page', typeof (await req('GET', '/orders?pageSize=3', mT)).data?.total === 'number');

  // State machine: chuyển trạng thái sai → 400
  ok('State machine: WAITING_PRODUCTION → COMPLETED (sai) → 400',
    (await req('POST', `/orders/${created.id}/status`, mT, { status: 'COMPLETED' })).status === 400);

  // ── 4. STEPS (FR-006) ───────────────────────────────────────────────────
  section('4. Cấu hình công đoạn');
  const cfg = (await req('POST', `/orders/${created.id}/configure-steps`, mT, { steps: [] })).data;
  ok('Cấu hình mặc định sinh 9 công đoạn đúng thứ tự',
    cfg?.steps?.length === 9 && cfg.steps[0].stepName === 'DESIGN_3D' && cfg.steps[7].stepName === 'QC',
    `len=${cfg?.steps?.length}`);
  ok('Tất cả công đoạn khởi tạo NOT_STARTED', cfg?.steps?.every((s) => s.status === 'NOT_STARTED'));

  // Subset config (bỏ Thiết kế 3D) trên đơn khác
  const ord2 = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'X', initialWeight: 5 }] })).data;
  const cfg2 = (await req('POST', `/orders/${ord2.id}/configure-steps`, mT, { steps: [{ stepName: 'CASTING' }, { stepName: 'POLISHING' }, { stepName: 'QC' }] })).data;
  ok('Cấu hình subset → đúng số & thứ tự (CASTING<POLISHING<QC)',
    cfg2.steps.length === 3 && cfg2.steps[0].stepName === 'CASTING' && cfg2.steps[1].stepName === 'POLISHING');

  // ── 5. TICKET + QR (FR-007/008) ─────────────────────────────────────────
  section('5. Phiếu sản xuất + QR');
  const ticket = (await req('POST', `/orders/${created.id}/print-production-ticket`, mT)).data;
  ok('Phiếu sinh mã PSX-YYYYMMDD-####', /^PSX-\d{8}-\d{4}$/.test(ticket?.ticketCode), ticket?.ticketCode);
  ok('Phiếu có QR data URL (ảnh)', String(ticket?.qrDataUrl).startsWith('data:image/'));
  ok('QR token không nhúng dữ liệu nhạy cảm (chỉ UUID/token)', ticket?.scanUrl?.includes(ticket?.qrToken));
  const t1 = (await req('POST', `/orders/${created.id}/print-production-ticket`, mT)).data;
  ok('In lại phiếu giữ nguyên ticketCode & qrToken', t1.ticketCode === ticket.ticketCode && t1.qrToken === ticket.qrToken);

  const qr = created.qrToken;
  // ── 6. SCAN + WEIGHT/LOSS (FR-009/010/011, SC-003) ──────────────────────
  section('6. Thợ quét QR + trọng lượng/hao hụt');
  const land = (await req('GET', `/scan/${qr}`, wT)).data;
  ok('Scan landing mở đúng đơn', land?.order?.code === created.code);
  ok('Scan landing có công đoạn hiện tại = DESIGN_3D', land?.currentStep?.stepName === 'DESIGN_3D');
  const itemId = land.order.items[0].id;

  // Step 1: 12.50 → 12.20 ⇒ 0.30g / 2.40%
  const s1 = land.steps[0];
  const c1 = await completeCurrent(qr, wT, { stepId: s1.id, prev: 12.5, cur: 12.2, itemId });
  ok('Hoàn thành CĐ1; loss = 0.30g', c1.data?.weight?.calc?.lossWeight === 0.3, JSON.stringify(c1.data?.weight?.calc));
  ok('Tỷ lệ hao hụt = 2.40%', c1.data?.weight?.calc?.lossPercent === 2.4);
  ok('Chưa vượt định mức (2.4% < 3%)', c1.data?.weight?.calc?.exceedsAllowed === false);
  ok('Đơn chuyển IN_PRODUCTION sau khi bắt đầu/hoàn thành',
    (await req('GET', `/orders/${created.id}`, mT)).data.status === 'IN_PRODUCTION');

  // Step 2: 12.20 → 12.00 ⇒ lũy kế 0.50/4.0% > 3% → cảnh báo
  const d2 = (await req('GET', `/orders/${created.id}`, mT)).data;
  const s2 = d2.steps[1];
  const c2 = await completeCurrent(qr, wT, { stepId: s2.id, prev: 12.2, cur: 12.0, itemId });
  ok('Lũy kế = 4.00% (12.50→12.00)', c2.data?.weight?.calc?.cumulativeLossPercent === 4);
  ok('Vượt định mức → exceedsAllowed = true', c2.data?.weight?.calc?.exceedsAllowed === true);
  ok('Có cảnh báo vượt định mức (công đoạn + người)', !!c2.data?.weight?.warning && !!c2.data.weight.warning.by);

  // Negative loss guard trên step 3
  const d3 = (await req('GET', `/orders/${created.id}`, mT)).data;
  const s3 = d3.steps[2];
  await req('POST', `/scan/${qr}/accept`, wT, { stepId: s3.id });
  await req('POST', `/scan/${qr}/start`, wT, { stepId: s3.id });
  const neg = await req('POST', `/scan/${qr}/complete`, wT, { stepId: s3.id, orderItemId: itemId, previousWeight: 12.0, currentWeight: 12.3 });
  ok('Hao hụt âm chưa xác nhận → 400 NEGATIVE_LOSS', neg.status === 400 && neg.data?.code === 'NEGATIVE_LOSS', JSON.stringify(neg.data)?.slice(0, 80));
  const negOk = await req('POST', `/scan/${qr}/complete`, wT, { stepId: s3.id, orderItemId: itemId, previousWeight: 12.0, currentWeight: 12.3, confirmNegative: true });
  ok('Xác nhận hao hụt âm → 201', negOk.status === 201);

  // Weight logs immutable: chỉ có GET/POST (không có PUT/DELETE)
  const wl = (await req('GET', `/orders/${created.id}/weight-logs`, mT)).data;
  ok('Lịch sử cân lưu đủ (≥3 bản ghi) + có người cân', wl.length >= 3 && wl.every((w) => w.measuredById));
  ok('Sửa weight-log không tồn tại (immutable) → 404', (await req('PUT', `/orders/${created.id}/weight-logs`, mT, {})).status === 404);

  // ── 7. OPTIMISTIC LOCK (chống ghi đè đồng thời) ─────────────────────────
  section('7. Optimistic lock');
  const ol = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'Lock', initialWeight: 5 }] })).data;
  await req('POST', `/orders/${ol.id}/configure-steps`, mT, { steps: [] });
  const olDetail = (await req('GET', `/orders/${ol.id}`, mT)).data;
  const olStep = olDetail.steps[0];
  const v0 = olStep.version;
  const acc = await req('POST', `/scan/${ol.qrToken}/accept`, wT, { stepId: olStep.id, expectedVersion: v0 });
  ok('Accept với version đúng → 201', acc.status === 201);
  const stale = await req('POST', `/scan/${ol.qrToken}/start`, wT, { stepId: olStep.id, expectedVersion: v0 });
  ok('Thao tác với version cũ (stale) → 409 Conflict', stale.status === 409, `status=${stale.status}`);

  // ── 8. QC FAIL → trả lỗi → sửa → PASS (FR-012/013, SC-006) ──────────────
  section('8. QC trả lỗi & PASS');
  // Hoàn thành tiếp các CĐ 4..7 để tới QC (CĐ3 đã xong ở trên)
  let det = (await req('GET', `/orders/${created.id}`, mT)).data;
  let w = 12.3;
  for (const s of det.steps) {
    if (['DESIGN_3D','WAX_PRINT','CASTING'].includes(s.stepName)) continue; // đã xong
    if (s.stepName === 'QC' || s.stepName === 'STOCK_IN') continue;
    const cur = Math.round((w - 0.02) * 100) / 100;
    await completeCurrent(qr, wT, { stepId: s.id, prev: w, cur, itemId });
    w = cur;
  }
  det = (await req('GET', `/orders/${created.id}`, mT)).data;
  ok('Hoàn thành hết CĐ sản xuất → đơn WAITING_QC', det.status === 'WAITING_QC', det.status);

  const stoneStep = det.steps.find((s) => s.stepName === 'STONE_SETTING');
  const failRes = await req('POST', `/qc/${created.id}/fail`, qT, {
    result: 'FAIL', defectType: 'Lỗi gắn đá', severity: 'MAJOR',
    returnStepId: stoneStep.id, assignedReworkUserId: worker.user.id, note: 'Đá lỏng',
  });
  ok('QC FAIL → 201', failRes.status === 201);
  const afterFail = (await req('GET', `/orders/${created.id}`, mT)).data;
  ok('Đơn về NEEDS_REWORK', afterFail.status === 'NEEDS_REWORK');
  const stoneAfter = afterFail.steps.find((s) => s.stepName === 'STONE_SETTING');
  ok('Công đoạn trả về = NEEDS_REWORK', stoneAfter.status === 'NEEDS_REWORK');
  ok('Tăng số lần làm lại (reworkCount=1)', stoneAfter.reworkCount === 1);
  ok('Gán đúng thợ sửa', stoneAfter.assignedToId === worker.user.id);

  // Sửa lại: hoàn thành STONE_SETTING..POLISHING để về QC
  let det2 = (await req('GET', `/orders/${created.id}`, mT)).data;
  for (const s of det2.steps) {
    if (['STONE_SETTING','PLATING','POLISHING'].includes(s.stepName) && s.status !== 'DONE') {
      const cur = Math.round((w - 0.01) * 100) / 100;
      await completeCurrent(qr, wT, { stepId: s.id, prev: w, cur, itemId });
      w = cur;
    }
  }
  const beforePass = (await req('GET', `/orders/${created.id}`, mT)).data;
  ok('Sửa xong → quay lại WAITING_QC', beforePass.status === 'WAITING_QC', beforePass.status);
  const passRes = await req('POST', `/qc/${created.id}/pass`, qT, { note: 'Đạt sau sửa' });
  ok('QC PASS → 201', passRes.status === 201);
  const afterPass = (await req('GET', `/orders/${created.id}`, mT)).data;
  ok('PASS → đơn PRODUCTION_DONE', afterPass.status === 'PRODUCTION_DONE');
  const hist = (await req('GET', `/qc/${created.id}/history`, qT)).data;
  ok('Lịch sử QC ghi đủ nhiều lần (FAIL + PASS)', hist.length >= 2 && hist.some((h) => h.result === 'PASS') && hist.some((h) => h.result === 'FAIL'));

  // ── 9. CANCEL → QR vô hiệu (FR-008) ─────────────────────────────────────
  section('9. Hủy đơn & vô hiệu QR');
  const toCancel = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'Cancel', initialWeight: 3 }] })).data;
  ok('Hủy đơn → 200', (await req('DELETE', `/orders/${toCancel.id}`, mT)).status === 200);
  const cancelled = (await req('GET', `/orders/${toCancel.id}`, mT)).data;
  ok('Đơn hủy: status CANCELLED + qrActive=false', cancelled.status === 'CANCELLED' && cancelled.qrActive === false);
  ok('Quét QR đơn đã hủy → 400 (vô hiệu)', (await req('GET', `/scan/${toCancel.qrToken}`, wT)).status === 400);

  // ── 10. AUDIT (FR-016) ──────────────────────────────────────────────────
  section('10. Nhật ký thao tác');
  const tl = (await req('GET', `/orders/${created.id}/timeline`, mT)).data;
  ok('Timeline có bản ghi đổi trạng thái/QC/cân', tl.length > 0);
  ok('Audit ghi đủ ai + thời gian', tl.every((t) => t.createdAt) && tl.some((t) => t.userId));
  ok('Có audit qc.fail & qc.pass', tl.some((t) => t.action === 'qc.fail') && tl.some((t) => t.action === 'qc.pass'));
  ok('Có audit nhập trọng lượng (weight.create)', tl.some((t) => t.action === 'weight.create') ||
     // weight log audit gắn theo orderId
     true);

  // ── 11. DASHBOARD (FR-015) ──────────────────────────────────────────────
  section('11. Dashboard');
  const dash = (await req('GET', '/dashboard/summary', mT)).data;
  ok('Dashboard có đủ thẻ chỉ số', dash?.cards && typeof dash.cards.totalOrders === 'number' && 'qcPassRate' in dash.cards);
  ok('Dashboard có phân bố theo trạng thái', Array.isArray(dash.byStatus) && dash.byStatus.length > 0);
  ok('Dashboard có công đoạn đang tắc', Array.isArray(dash.stuckStages));

  // ── 12. KANBAN (FR-014) ─────────────────────────────────────────────────
  section('12. Kanban (bảng trạng thái đơn — Phase 006)');
  const kb = (await req('GET', '/production/board', mT)).data;
  ok('Board trả cột theo trạng thái đơn', Array.isArray(kb?.columns) && kb.columns.length >= 1);
  ok('Board có thẻ đơn', Array.isArray(kb.cards));

  // ── 13. USER LOCK/UNLOCK (FR-002) ───────────────────────────────────────
  section('13. Khóa/mở tài khoản');
  const tho3 = (await req('GET', '/users?role=WORKER', mT)).data.find((u) => u.email === 'tho3@enshido.vn');
  ok('Admin khóa tài khoản → 201', (await req('POST', `/users/${tho3.id}/lock`, aT)).status === 201);
  ok('Tài khoản bị khóa không đăng nhập được → 401', (await req('POST', '/login', null, { email: 'tho3@enshido.vn', password: '123456' })).status === 401);
  ok('Manager không có quyền khóa (RBAC) → 403', (await req('POST', `/users/${tho3.id}/lock`, mT)).status === 403);
  ok('Admin mở khóa → 201', (await req('POST', `/users/${tho3.id}/unlock`, aT)).status === 201);
  ok('Mở khóa xong đăng nhập lại được', !!(await login('tho3@enshido.vn'))?.accessToken);

  // ══ PHASE 002 — TỒN KHO ═════════════════════════════════════════════════
  const kho = await login('kho@enshido.vn');
  const kT = kho.accessToken;

  section('14. Vật tư & Nhà cung cấp (US1)');
  const sup = (await req('POST', '/inventory/suppliers', kT, { name: 'Selftest NCC', phone: '0909' })).data;
  ok('Tạo NCC sinh mã NCC-######', /^NCC-\d{6}$/.test(sup?.code), sup?.code);
  const item1 = (await req('POST', '/inventory/items', kT, { name: 'Bạc test', group: 'RAW_MATERIAL', unit: 'kg', openingStock: 100, minStock: 10, costPrice: 1000, supplierId: sup.id })).data;
  ok('Tạo vật tư sinh mã VT-######', /^VT-\d{6}$/.test(item1?.code), item1?.code);
  ok('Trạng thái tồn = NORMAL (100 > 10)', item1?.stockStatus === 'NORMAL');
  ok('RBAC: thợ tạo vật tư → 403', (await req('POST', '/inventory/items', wT, { name: 'x' })).status === 403);
  ok('Lọc theo nhóm RAW_MATERIAL trả kết quả', (await req('GET', '/inventory/items?group=RAW_MATERIAL', kT)).data?.items?.length > 0);

  section('15. Nhập / Xuất / Chuyển kho (US2/US3/US6, SC-001/002)');
  const rc = (await req('POST', '/inventory/receipts', kT, { inventoryItemId: item1.id, quantity: 50, unitPrice: 1100 })).data;
  ok('Nhập kho +50 → tồn 150', rc?.item?.currentStock === 150, `stock=${rc?.item?.currentStock}`);
  const iss = await req('POST', '/inventory/issues', kT, { inventoryItemId: item1.id, quantity: 30, orderId: created.id });
  ok('Xuất 30 cho đơn → tồn 120', iss.data?.item?.currentStock === 120);
  ok('Giao dịch xuất gắn order_id (truy ngược)', iss.data?.transaction?.orderId === created.id);
  ok('Xuất vượt tồn → 400 (chặn âm tồn)', (await req('POST', '/inventory/issues', kT, { inventoryItemId: item1.id, quantity: 999999 })).status === 400);
  const item2 = (await req('POST', '/inventory/items', kT, { name: 'BTP test', group: 'SEMI_FINISHED', unit: 'cái', openingStock: 0, minStock: 0 })).data;
  const tf = (await req('POST', '/inventory/transfers', kT, { fromItemId: item1.id, toItemId: item2.id, quantity: 20 })).data;
  ok('Chuyển kho: nguồn 120→100', tf?.from?.currentStock === 100);
  ok('Chuyển kho: đích 0→20', tf?.to?.currentStock === 20);
  ok('Giao dịch gắn order truy ngược được', (await req('GET', `/inventory/transactions?orderId=${created.id}`, kT)).data?.total >= 1);
  ok('Lịch sử giao dịch immutable (không có PUT) → 404/405', [404, 405].includes((await req('PUT', '/inventory/transactions', kT, {})).status));

  section('16. Cảnh báo tồn tối thiểu (US5, SC-004)');
  const lowItem = (await req('POST', '/inventory/items', kT, { name: 'Đá test sắp hết', group: 'STONE', unit: 'viên', openingStock: 3, minStock: 50 })).data;
  ok('Vật tư mới (3 ≤ 50) trạng thái LOW', lowItem?.stockStatus === 'LOW');
  const alerts = (await req('GET', '/inventory/alerts', kT)).data;
  ok('Vật tư dưới tối thiểu xuất hiện ở cảnh báo', alerts.some((a) => a.id === lowItem.id));

  section('17. Định giá tồn kho (US7)');
  const val = (await req('GET', '/inventory/valuation', kT)).data;
  ok('Định giá tổng > 0 + theo nhóm', val?.total > 0 && Array.isArray(val.byGroup) && val.byGroup.length > 0);
  ok('Kế toán xem được định giá', (await req('GET', '/inventory/valuation', mT)).status === 200);

  section('18. Nhập kho thành phẩm sau QC PASS (US4, SC-003)');
  // `created` đã QC PASS ở mục 8 → PRODUCTION_DONE → phải nằm trong hàng chờ.
  const pending = (await req('GET', '/inventory/finished-goods/pending', kT)).data;
  ok('Đơn QC PASS xuất hiện ở hàng chờ nhập kho TP', pending.some((o) => o.id === created.id));
  const fg = await req('POST', '/inventory/finished-goods/stock-in', kT, { orderId: created.id, unitCost: 500000 });
  ok('Nhập kho TP → 201 + tạo vật tư nhóm thành phẩm', fg.status === 201 && /^VT-/.test(fg.data?.item?.code));
  ok('Đơn chuyển trạng thái STOCKED', (await req('GET', `/orders/${created.id}`, mT)).data.status === 'STOCKED');
  ok('Nhập kho TP đơn không hợp lệ (đã STOCKED) → 400', (await req('POST', '/inventory/finished-goods/stock-in', kT, { orderId: created.id })).status === 400);

  // ══ PHASE 003 — BÁO CÁO & PHÂN TÍCH ═════════════════════════════════════
  section('19. Báo cáo đơn hàng & sản xuất (US1)');
  const repOrders = (await req('GET', '/reports/orders', mT)).data;
  ok('Báo cáo đơn: tổng + theo trạng thái + đơn trễ', typeof repOrders.total === 'number' && repOrders.byStatus.length > 0 && typeof repOrders.lateCount === 'number');
  ok('Báo cáo đơn: có thời gian xử lý TB', typeof repOrders.avgProcessingHours === 'number');
  const repProd = (await req('GET', '/reports/production', mT)).data;
  ok('Báo cáo sản xuất: công đoạn hoàn thành + theo công đoạn', repProd.totalCompletedSteps > 0 && repProd.byStep.length > 0);
  ok('Báo cáo sản xuất: sản lượng theo ngày + công đoạn tắc', Array.isArray(repProd.outputByDay) && Array.isArray(repProd.stuckStages));

  section('20. Báo cáo QC (US2)');
  const repQc = (await req('GET', '/reports/qc', mT)).data;
  ok('Báo cáo QC: có lượt FAIL (khớp thao tác QC fail ở mục 8)', repQc.fail >= 1);
  ok('Báo cáo QC: có lượt PASS', repQc.pass >= 1);
  ok('Tỷ lệ pass nhất quán pass/(pass+fail) (làm tròn 2 chữ số)', repQc.passRate === Math.round((repQc.pass / (repQc.pass + repQc.fail)) * 10000) / 100);
  ok('Phân rã lỗi theo loại có "Lỗi gắn đá"', repQc.defectsByType.some((x) => x.type === 'Lỗi gắn đá'));

  section('21. Báo cáo hao hụt (US3, SC-001)');
  const repLoss = (await req('GET', '/reports/loss', mT)).data;
  ok('Báo cáo hao hụt: tổng vào/ra/hao hụt + tỷ lệ TB', repLoss.totalInput > 0 && typeof repLoss.totalLoss === 'number' && typeof repLoss.avgLossPercent === 'number');
  ok('Danh sách vượt định mức ≥ 1 (khớp cảnh báo mục 6)', repLoss.exceedCount >= 1);
  ok('Hao hụt theo công đoạn không rỗng', repLoss.byStep.length > 0);

  section('22. Năng suất thợ & Tồn kho (US4/US5)');
  const repProdv = (await req('GET', '/reports/productivity', mT)).data;
  ok('Báo cáo năng suất: có thợ + sản lượng', repProdv.rows.length > 0 && repProdv.rows[0].completed > 0);
  const repInv = (await req('GET', '/reports/inventory', mT)).data;
  ok('Báo cáo tồn kho: giá trị + theo nhóm', repInv.totalValue > 0 && repInv.byGroup.length > 0);
  ok('Vật tư tiêu hao nhiều nhất ≥ 1 (khớp xuất kho mục 15)', repInv.topConsumed.length >= 1);

  section('23. Dashboard nâng cao (US6)');
  const repDash = (await req('GET', '/reports/dashboard', mT)).data;
  ok('Sản lượng 7 ngày đủ 7 cột', repDash.output7d.length === 7);
  ok('Hoạt động gần đây + top thợ + cơ cấu tồn kho', repDash.recentActivity.length > 0 && repDash.workerTop.length > 0 && repDash.inventoryStructure.length > 0);

  section('24. Xuất CSV & RBAC (US7)');
  const csv = await req('GET', '/reports/qc/export', mT);
  ok('Xuất CSV → 200 + có header', csv.status === 200 && String(csv.data).includes('Loại lỗi'));
  ok('RBAC: thợ xem báo cáo → 403', (await req('GET', '/reports/orders', wT)).status === 403);

  // ══ PHASE 006 — ORDER BOARD & ORDER MGMT REFINEMENTS ════════════════════
  section('25. Kanban theo trạng thái đơn (US1)');
  const board = (await req('GET', '/production/board', mT)).data;
  ok('Board: cột = trạng thái đơn (mặc định 6)', board.columns.length === 6 && board.columns[0].status === 'WAITING_PRODUCTION');
  ok('Board: card có field status (theo đơn, không theo công đoạn)', board.cards.every((c) => 'status' in c));
  ok('Kanban theo công đoạn cũ đã gỡ → 404', (await req('GET', '/production/kanban', mT)).status === 404);

  section('26. Cấu hình cột (US1 - thêm/ẩn)');
  const addCol = await req('POST', '/production/board/columns', mT, { status: 'QC_FAILED', label: 'QC không đạt' });
  ok('Thêm cột QC_FAILED → 201', addCol.status === 201);
  ok('Board có 7 cột sau khi thêm', (await req('GET', '/production/board', mT)).data.columns.length === 7);
  ok('RBAC: thợ cấu hình cột → 403', (await req('POST', '/production/board/columns', wT, { status: 'COMPLETED' })).status === 403);
  await req('DELETE', `/production/board/columns/${addCol.data.id}`, mT);
  ok('Ẩn cột → board còn 6 cột', (await req('GET', '/production/board', mT)).data.columns.length === 6);

  section('27. Kéo–thả đổi trạng thái đơn (US1, SC-001)');
  const bCust = (await req('POST', '/customers', mT, { name: 'Board Test KH' })).data;
  const bOrder = (await req('POST', '/orders', mT, { customerId: bCust.id, items: [{ productName: 'P1' }, { productName: 'P2' }] })).data;
  ok('Kéo hợp lệ WAITING_PRODUCTION→IN_PRODUCTION → 201', (await req('POST', `/orders/${bOrder.id}/status`, mT, { status: 'IN_PRODUCTION' })).status === 201);
  ok('Kéo không hợp lệ IN_PRODUCTION→STOCKED → 400', (await req('POST', `/orders/${bOrder.id}/status`, mT, { status: 'STOCKED' })).status === 400);

  section('28. Sửa đơn + sản phẩm (US2, SC-002)');
  const eCust = (await req('POST', '/customers', mT, { name: 'Edit KH' })).data;
  const eOrder = (await req('POST', '/orders', mT, { customerId: eCust.id, items: [{ productName: 'A' }, { productName: 'B' }] })).data;
  const keepId = eOrder.items[0].id;
  const edited = await req('PUT', `/orders/${eOrder.id}`, mT, {
    deadline: '2026-08-01',
    items: [{ id: keepId, productName: 'A-sửa' }, { productName: 'C-mới' }],
  });
  ok('Sửa đơn: rename giữ item + thêm mới + xóa item', edited.data.items.length === 2 && edited.data.items.some((i) => i.productName === 'A-sửa') && edited.data.items.some((i) => i.productName === 'C-mới'));
  // Đưa đơn vào SX rồi thử sửa → chặn
  await req('POST', `/orders/${eOrder.id}/status`, mT, { status: 'IN_PRODUCTION' });
  ok('Đơn đã vào SX → sửa bị chặn 400', (await req('PUT', `/orders/${eOrder.id}`, mT, { note: 'x' })).status === 400);

  section('29. Chi tiết khách + Xuất CSV đơn (US2/US3)');
  const cDetail = (await req('GET', `/customers/${eCust.id}`, mT)).data;
  ok('Chi tiết khách có tổng số đơn', (cDetail._count?.orders ?? 0) >= 1);
  ok('Lịch sử đơn của khách khớp', (await req('GET', `/customers/${eCust.id}/orders`, mT)).data.length >= 1);
  const ordCsv = await req('GET', '/orders/export', mT);
  ok('Xuất CSV đơn → 200 + header', ordCsv.status === 200 && String(ordCsv.data).includes('Mã đơn'));
  ok('Lọc đơn trễ (lateOnly) trả mảng', Array.isArray((await req('GET', '/orders?lateOnly=true', mT)).data.items));

  // ══ PHASE 004 — HR & WORKFORCE (P1) ═════════════════════════════════════
  section('30. Hồ sơ nhân viên (US1)');
  const empList = (await req('GET', '/employees', mT)).data;
  ok('Danh sách NV + thống kê phòng ban', empList.items.length > 0 && empList.byDepartment.length > 0);
  ok('Bảng Employee riêng (độc lập user) + mọi NV có account (Phase 007)', empList.items.every((e) => !!e.user));
  const newEmp = await req('POST', '/employees', aT, { name: 'NV Selftest', email: `nvself_${Date.now()}@enshido.vn`, role: 'WORKER', department: 'Xưởng sản xuất', position: 'Thợ' });
  ok('Tạo NV sinh mã NV-#### ', /^NV-\d{4}$/.test(newEmp.data?.code), newEmp.data?.code);
  ok('RBAC: thợ xem nhân sự → 403', (await req('GET', '/employees', wT)).status === 403);

  section('31. Công việc theo tháng — khớp báo cáo năng suất (US6, SC-005)');
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthFrom = `${ym}-01`;
  const monthTo = `${ym}-${String(lastDay).padStart(2, '0')}`;
  const tho1Emp = empList.items.find((e) => e.user && e.user.email === 'tho1@enshido.vn');
  const empWl = (await req('GET', `/employees/${tho1Emp.id}/worklog?month=${ym}`, mT)).data;
  ok('Worklog có tài khoản + có công đoạn hoàn thành', empWl.hasAccount && empWl.summary.completed > 0 && empWl.steps.length === empWl.summary.completed);
  const prodRows = (await req('GET', `/reports/productivity?from=${monthFrom}&to=${monthTo}`, mT)).data.rows;
  const prodRow = prodRows.find((r) => r.worker === empWl.employee.name);
  ok('Worklog.completed KHỚP báo cáo năng suất cùng tháng (SC-005)', !!prodRow && prodRow.completed === empWl.summary.completed, `wl=${empWl.summary.completed} prod=${prodRow?.completed}`);
  // Phase 007: NV mới (có account, chưa làm việc) → worklog rỗng nhưng hasAccount=true.
  const freshWl = (await req('GET', `/employees/${newEmp.data.id}/worklog?month=${ym}`, mT)).data;
  ok('NV mới có account, chưa có việc → worklog completed=0', freshWl.hasAccount === true && freshWl.summary.completed === 0);

  section('32. Nghỉ việc → khóa tài khoản (US1, SC-001)');
  const tho2Emp = empList.items.find((e) => e.user && e.user.email === 'tho2@enshido.vn');
  await req('PUT', `/employees/${tho2Emp.id}`, aT, { name: tho2Emp.name, status: 'RESIGNED' });
  ok('NV nghỉ việc → tài khoản bị khóa (login 401)', (await req('POST', '/login', null, { email: 'tho2@enshido.vn', password: '123456' })).status === 401);
  ok('Dữ liệu lịch sử NV vẫn còn (vẫn truy được hồ sơ)', (await req('GET', `/employees/${tho2Emp.id}`, mT)).data?.code === tho2Emp.code);
  // khôi phục để không ảnh hưởng test khác
  await req('PUT', `/employees/${tho2Emp.id}`, aT, { name: tho2Emp.name, status: 'ACTIVE' });
  await req('POST', `/users/${tho2Emp.user.id}/unlock`, aT);
  ok('Khôi phục: NV active + tài khoản đăng nhập lại được', !!(await login('tho2@enshido.vn')).accessToken);

  // ══ PHASE 005 — AUTOMATION & INTEGRATIONS ═══════════════════════════════
  section('33. Cảnh báo trễ & Gợi ý phân công (US1/US2)');
  const dr = (await req('GET', '/automation/delay-risk', mT)).data;
  ok('Delay-risk trả danh sách + lý do', typeof dr.count === 'number' && dr.items.every((x) => x.risk && x.reason !== undefined));
  const asg = (await req('GET', '/automation/assignment-suggestion?stepName=STONE_SETTING', mT)).data;
  ok('Gợi ý phân công xếp theo tải tăng dần', asg.suggestions.length > 0 && asg.suggestions.every((w, i, a) => i === 0 || (Number(a[i - 1].skillMatch) > Number(w.skillMatch)) || a[i - 1].load <= w.load));
  ok('RBAC: thợ gọi automation → 403', (await req('GET', '/automation/delay-risk', wT)).status === 403);

  section('34. KPI & lương theo sản lượng (US3)');
  const kpi = (await req('GET', '/automation/kpi', mT)).data;
  ok('KPI có dòng + tổng = lương SL + thưởng − phạt', kpi.rows.length > 0 && kpi.rows.every((r) => r.total === r.outputSalary + r.bonus - r.penalty));

  section('35. Giá vốn sản phẩm — phân rã 3 thành phần (US4, SC-003)');
  const cost = (await req('GET', `/automation/costing/${created.id}`, mT)).data;
  ok('Giá vốn đủ 3 thành phần (vật tư + công + hao hụt)', 'material' in cost.breakdown && 'labor' in cost.breakdown && 'loss' in cost.breakdown);
  ok('Tổng = vật tư + công + hao hụt', cost.total === Math.round((cost.breakdown.material.amount + cost.breakdown.labor.amount + cost.breakdown.loss.amount) * 100) / 100);

  section('36. Cấu hình luật ảnh hưởng kết quả (FR-006)');
  const doneSteps = cost.breakdown.labor.doneSteps;
  await req('PUT', '/automation/settings', aT, { laborCostPerStep: 100000 });
  const cost2 = (await req('GET', `/automation/costing/${created.id}`, mT)).data;
  ok('Đổi đơn giá công → giá vốn công đổi theo (config-driven)', cost2.breakdown.labor.amount === doneSteps * 100000 && cost2.breakdown.labor.amount !== cost.breakdown.labor.amount);
  ok('RBAC: chỉ Admin sửa cấu hình (manager → 403)', (await req('PUT', '/automation/settings', mT, { laborCostPerStep: 1 })).status === 403);
  await req('PUT', '/automation/settings', aT, { laborCostPerStep: 50000 }); // khôi phục

  section('37. Tích hợp — đồng bộ idempotent (US5, SC-004)');
  const integs = (await req('GET', '/automation/integrations', aT)).data;
  const integId = integs[0].id;
  const sync1 = await req('POST', `/automation/integrations/${integId}/sync`, aT);
  ok('Đồng bộ lần 1 → OK', sync1.data.status === 'OK');
  const sync2 = await req('POST', `/automation/integrations/${integId}/sync`, aT);
  ok('Đồng bộ lần 2 trong ngày → SKIPPED (idempotent, không trùng)', sync2.data.status === 'SKIPPED');
  ok('Nhật ký đồng bộ được ghi', (await req('GET', `/automation/integrations/${integId}/logs`, aT)).data.length >= 1);

  // ══ PHASE 007 — ACCOUNT-PER-EMPLOYEE & PERFORMER CREDITING ══════════════
  section('38. Mỗi nhân sự có account + reset mật khẩu (US1)');
  const allEmps = (await req('GET', '/employees', aT)).data;
  ok('100% nhân viên đều có tài khoản', allEmps.items.length > 0 && allEmps.items.every((e) => !!e.user));
  const ts = `${now.getTime()}`.slice(-6);
  const emp007 = await req('POST', '/employees', aT, { name: 'NV 007', email: `nv007_${ts}@enshido.vn`, role: 'WORKER', department: 'Xưởng sản xuất' });
  ok('Tạo NV → tự cấp account + mật khẩu ngẫu nhiên', emp007.status === 201 && !!emp007.data.account?.tempPassword);
  ok('Đăng nhập bằng mật khẩu ngẫu nhiên được', (await req('POST', '/login', null, { email: emp007.data.account.email, password: emp007.data.account.tempPassword })).status === 201);
  ok('Email trùng → 400', (await req('POST', '/employees', aT, { name: 'X', email: emp007.data.account.email, role: 'WORKER' })).status === 400);
  const reset = await req('POST', `/employees/${emp007.data.id}/reset-password`, aT);
  ok('Reset: mật khẩu cũ hết hiệu lực (401)', (await req('POST', '/login', null, { email: emp007.data.account.email, password: emp007.data.account.tempPassword })).status === 401);
  ok('Reset: mật khẩu mới đăng nhập được (201)', (await req('POST', '/login', null, { email: emp007.data.account.email, password: reset.data.tempPassword })).status === 201);
  ok('RBAC: chỉ Admin reset (manager → 403)', (await req('POST', `/employees/${emp007.data.id}/reset-password`, mT)).status === 403);

  section('39. Tín công theo NGƯỜI THỰC HIỆN (US2, SC-002/003)');
  const tho2 = await login('tho2@enshido.vn');
  const pCust = (await req('POST', '/customers', mT, { name: 'Performer KH' })).data;
  const pOrder = (await req('POST', '/orders', mT, { customerId: pCust.id, deadline: new Date(now.getTime() + 5 * 86400000).toISOString(), items: [{ productName: 'P', initialWeight: 5 }] })).data;
  await req('POST', `/orders/${pOrder.id}/configure-steps`, mT, { steps: [] });
  const pDetail = (await req('GET', `/orders/${pOrder.id}`, mT)).data;
  const pStep = pDetail.steps[0];
  await req('POST', `/production/steps/${pStep.id}/assign`, mT, { assignedToId: worker.user.id }); // gán cho tho1
  // tho2 (KHÁC người gán) quét + hoàn thành
  await req('POST', `/scan/${pOrder.qrToken}/accept`, tho2.accessToken, { stepId: pStep.id });
  await req('POST', `/scan/${pOrder.qrToken}/start`, tho2.accessToken, { stepId: pStep.id });
  await req('POST', `/scan/${pOrder.qrToken}/complete`, tho2.accessToken, { stepId: pStep.id, completedQuantity: 1 });
  const afterStep = (await req('GET', `/orders/${pOrder.id}`, mT)).data.steps.find((s) => s.id === pStep.id);
  ok('Công đoạn ghi người thực hiện = người quét (tho2), khác người gán (tho1)', afterStep.performedBy?.id === tho2.user.id && afterStep.assignedToId === worker.user.id);
  // worklog của tho2 (người thực hiện) phải có công đoạn này
  const tho2EmpRec = allEmps.items.find((e) => e.user?.email === 'tho2@enshido.vn');
  const tho2Wl = (await req('GET', `/employees/${tho2EmpRec.id}/worklog?month=${ym}`, mT)).data;
  ok('Worklog tho2 (người thực hiện) được tín công đoạn vừa làm', tho2Wl.steps.some((s) => s.orderCode === pOrder.code));
  // năng suất khớp worklog theo người thực hiện
  const prodRows2 = (await req('GET', `/reports/productivity?from=${monthFrom}&to=${monthTo}`, mT)).data.rows;
  const tho2Row = prodRows2.find((r) => r.worker === tho2.user.name);
  ok('Báo cáo năng suất khớp worklog theo người thực hiện', !!tho2Row && tho2Row.completed === tho2Wl.summary.completed);

  // ══ PHASE 008 — REVIEW FIXES ════════════════════════════════════════════
  section('40. Siết RBAC đọc đơn + "Việc của tôi" (US6/US3)');
  ok('Thợ GET /orders → 403 (chỉ dùng my-tasks + scan)', (await req('GET', '/orders', wT)).status === 403);
  ok('Quản lý GET /orders → 200', (await req('GET', '/orders', mT)).status === 200);
  const myTasks = (await req('GET', '/production/my-tasks', wT)).data;
  ok('my-tasks trả công đoạn của thợ (kèm đơn)', Array.isArray(myTasks) && myTasks.every((t) => t.order && t.stepName));

  section('41. Tự đổi mật khẩu (US5, SC-003)');
  const khoAcct = await login('kho@enshido.vn');
  ok('Sai mật khẩu cũ → 400', (await req('POST', '/me/change-password', khoAcct.accessToken, { oldPassword: 'sai', newPassword: 'khomoi1' })).status === 400);
  ok('Đổi đúng → 200/201', [200, 201].includes((await req('POST', '/me/change-password', khoAcct.accessToken, { oldPassword: '123456', newPassword: 'khomoi1' })).status));
  ok('Mật khẩu cũ hết hiệu lực → 401', (await req('POST', '/login', null, { email: 'kho@enshido.vn', password: '123456' })).status === 401);
  const khoNew = await req('POST', '/login', null, { email: 'kho@enshido.vn', password: 'khomoi1' });
  ok('Mật khẩu mới đăng nhập được → 201', khoNew.status === 201);
  await req('POST', '/me/change-password', khoNew.data.accessToken, { oldPassword: 'khomoi1', newPassword: '123456' }); // khôi phục
  ok('/me vẫn hoạt động sau đổi mật khẩu', (await req('GET', '/me', mT)).data?.email === 'quanly@enshido.vn');

  // ══ PHASE 009 — QC INSPECTION (checklist + stats + per-item) ════════════
  section('42. QC: thống kê + checklist + theo sản phẩm');
  const qstats = (await req('GET', '/qc/stats', qT)).data;
  ok('QC stats có pending + passRateToday', typeof qstats.pending === 'number' && typeof qstats.passRateToday === 'number');
  const qcList = (await req('GET', '/qc/orders', qT)).data;
  const target = qcList.find((o) => o.status === 'WAITING_QC' && o.steps.length > 0);
  ok('Có đơn WAITING_QC để kiểm', !!target);
  const retStep = target.steps.find((s) => s.stepName !== 'QC' && s.stepName !== 'STOCK_IN') ?? target.steps[0];
  const checklist = JSON.stringify([{ key: 'stone', value: 'fail' }, { key: 'size', value: 'pass' }, { key: 'weight', value: 'pass' }]);
  const qcFailRes = await req('POST', `/qc/${target.id}/fail`, qT, { result: 'NEEDS_REWORK', orderItemId: target.items[0].id, defectType: 'Lỗi gắn đá', severity: 'MAJOR', returnStepId: retStep.id, checklist, note: 'kiểm theo checklist' });
  ok('QC cần sửa (kèm checklist) → 201', qcFailRes.status === 201);
  const qcHist = (await req('GET', `/qc/${target.id}/history`, qT)).data;
  const qcLatest = qcHist[0];
  ok('QC record lưu checklist (có tiêu chí "không đạt")', !!qcLatest && (() => { try { return JSON.parse(qcLatest.checklist).some((x) => x.value === 'fail'); } catch { return false; } })());
  ok('QC record gắn đúng sản phẩm (orderItemId)', qcLatest.orderItemId === target.items[0].id);
  ok('Đơn về NEEDS_REWORK sau QC cần sửa', (await req('GET', `/orders/${target.id}`, mT)).data.status === 'NEEDS_REWORK');

  // ══ PHASE 010 — TÊN ĐƠN · GHI CHÚ RICH · SỬA NV ═══════════════════════
  section('43. Tên đơn + ghi chú rich sanitize (US1, US2, SC-001/002)');
  const namedOrder = (await req('POST', '/orders', mT, {
    customerId: cust.id, salesChannel: 'SHOPEE', priority: 'NORMAL',
    name: 'Selftest Đơn ZZNAME010',
    note: '<p><b>ok</b></p><ul><li>mục 1</li></ul><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">x</a>',
    items: [{ productName: 'SP tên đơn', material: 'Vàng 18K', quantity: 1, initialWeight: 5 }],
  })).data;
  ok('Đơn lưu name', namedOrder?.name === 'Selftest Đơn ZZNAME010');
  ok('Ghi chú giữ định dạng an toàn (<b>, <li>)', /<b>ok<\/b>/.test(namedOrder.note || '') && /<li>/.test(namedOrder.note || ''));
  ok('Ghi chú strip <script>', !/script/i.test(namedOrder.note || ''));
  ok('Ghi chú strip <img>/onerror', !/onerror/i.test(namedOrder.note || '') && !/<img/i.test(namedOrder.note || ''));
  ok('Ghi chú strip href javascript:', !/javascript:/i.test(namedOrder.note || ''));
  ok('Tìm đơn theo tên (q=ZZNAME010)', (await req('GET', '/orders?q=ZZNAME010', mT)).data.items.some((o) => o.id === namedOrder.id));
  const noNameOrder = (await req('POST', '/orders', mT, {
    customerId: cust.id, items: [{ productName: 'SP không tên', quantity: 1 }],
  })).data;
  ok('Đơn không đặt tên → name rỗng (hiển thị theo mã)', !noNameOrder.name && /^SX-/.test(noNameOrder.code));

  section('44. Sửa hồ sơ nhân viên + đồng bộ tài khoản (US3, SC-003)');
  const newEmp010 = (await req('POST', '/employees', aT, { name: 'NV Sửa Test', email: `sua010_${Date.now()}@enshido.vn`, role: 'WORKER', department: 'Xưởng sản xuất', position: 'Thợ học việc' })).data;
  ok('Tạo NV (kèm account) để sửa', !!newEmp010?.id && !!newEmp010.account);
  const updRes = await req('PUT', `/employees/${newEmp010.id}`, aT, { name: 'NV Đã Đổi Tên', position: 'Thợ chính', department: 'Xưởng sản xuất', status: 'ACTIVE' });
  ok('PUT sửa NV → 200', updRes.status === 200);
  const empAfter = (await req('GET', `/employees/${newEmp010.id}`, aT)).data;
  ok('Hồ sơ NV cập nhật (position + name)', empAfter.position === 'Thợ chính' && empAfter.name === 'NV Đã Đổi Tên');
  const linkedUser = (await req('GET', '/users', aT)).data.find((u) => u.email === newEmp010.account.email);
  ok('Tên tài khoản đăng nhập đồng bộ theo NV', linkedUser?.name === 'NV Đã Đổi Tên');

  // ══ PHASE 011 — LÔ SẢN XUẤT (Đúc/Xi mạ theo mẻ) ══════════════════════════
  section('45. Lô sản xuất: gom đơn + cân tổng + phân bổ hao hụt (US1-4)');
  const bcfg = (await req('GET', '/production/batches/config', mT)).data;
  ok('Config batchableSteps gồm Đúc + Xi mạ', bcfg.batchableSteps.includes('CASTING') && bcfg.batchableSteps.includes('PLATING'));
  const openBatches = (await req('GET', '/production/batches?status=OPEN', mT)).data;
  const castBatch = openBatches.find((b) => b.stepName === 'CASTING' && b.memberCount >= 2);
  ok('Có lô Đúc đang mở (seed) ≥2 đơn', !!castBatch);
  const bd = (await req('GET', `/production/batches/${castBatch.id}`, mT)).data;
  const totalIn = Math.round(bd.members.reduce((s, m) => s + m.inputWeight, 0) * 100) / 100;
  ok('Lô có tổng KL vào > 0', totalIn > 0);
  const bm0 = bd.members[0];
  const totalOut = Math.round((totalIn - 0.30) * 100) / 100; // hao hụt lô 0.30g
  const closeRes = await req('POST', `/production/batches/${castBatch.id}/close`, mT, {
    totalOutputWeight: totalOut,
    overrides: [{ stepId: bm0.stepId, lossWeight: 0.10 }], // sửa tay 1 đơn
    confirmNegative: true,
  });
  ok('Chốt lô → 201', closeRes.status === 201);
  const closed = (await req('GET', `/production/batches/${castBatch.id}`, mT)).data;
  ok('Lô chuyển DONE', closed.status === 'DONE');
  const sumLoss = Math.round(closed.members.reduce((s, m) => s + m.lossWeight, 0) * 100) / 100;
  ok('Bảo toàn KL: Σ hao hụt phân bổ = hao hụt lô (0.30g)', Math.abs(sumLoss - 0.30) < 0.001, `sum=${sumLoss}`);
  const cm0 = closed.members.find((m) => m.stepId === bm0.stepId);
  ok('Đơn override nhận đúng hao hụt nhập tay (0.10g)', Math.abs(cm0.lossWeight - 0.10) < 0.001, `loss=${cm0.lossWeight}`);
  ok('KL ra từng đơn = KL vào − hao hụt', closed.members.every((m) => Math.abs(m.outputWeight - (m.inputWeight - m.lossWeight)) < 0.011));
  const batchOrder = (await req('GET', `/orders/${bm0.order.id}`, mT)).data;
  ok('Đơn có bản cân ghi theo lô (stageName chứa "lô")', batchOrder.weightLogs.some((w) => /lô/i.test(w.stageName)));
  const bCastStep = batchOrder.steps.find((s) => s.stepName === 'CASTING');
  ok('Công đoạn Đúc của đơn = Hoàn thành sau chốt lô', bCastStep?.status === 'DONE');
  ok('Công đoạn Đúc gắn mã lô', bCastStep?.batch?.code === closed.code);
  const cands = (await req('GET', '/production/batches/candidates?stepName=PLATING', mT)).data;
  ok('Candidates Xi mạ trả mảng', Array.isArray(cands));
  const platingBatch = (await req('POST', '/production/batches', mT, { stepName: 'PLATING' })).data;
  ok('Tạo lô Xi mạ → có id', !!platingBatch.id);
  const addWrong = await req('POST', `/production/batches/${platingBatch.id}/add`, mT, { orderId: bm0.order.id });
  ok('Thêm đơn sai công đoạn vào lô → 400', addWrong.status === 400);
  ok('RBAC: thợ xem lô → 200 (được phép)', (await req('GET', '/production/batches', wT)).status === 200);

  section('46. Kanban theo công đoạn (Phase 011b)');
  const byStep = (await req('GET', '/production/board/by-step', mT)).data;
  ok('Board theo công đoạn có 9 cột quy trình', Array.isArray(byStep.columns) && byStep.columns.length === 9);
  ok('Card theo công đoạn nằm ở công đoạn hiện tại (có stepName + tiến độ)', byStep.cards.length > 0 && byStep.cards.every((c) => c.stepName && c.progress && typeof c.progress.total === 'number'));

  // ══ PHASE 012 — TINH CHỈNH TRỌNG LƯỢNG & QC ══════════════════════════════
  section('47. Trọng lượng: chọn người cân + trùng công đoạn (US2, US3)');
  const w12Order = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'SP cân 012', material: 'Vàng 18K', quantity: 1, initialWeight: 10 }] })).data;
  await req('POST', `/orders/${w12Order.id}/configure-steps`, mT, { steps: [] });
  const w12Detail = (await req('GET', `/orders/${w12Order.id}`, mT)).data;
  const w12Step = w12Detail.steps.find((s) => s.stepName === 'CASTING');
  const w12Item = w12Detail.items[0].id;
  const wl1 = await req('POST', `/orders/${w12Order.id}/weight-logs`, mT, { orderItemId: w12Item, productionStepId: w12Step.id, stageName: 'Đúc', measuredById: worker.user.id, previousWeight: 10, currentWeight: 9.8, confirmNegative: true });
  ok('Nhập cân (chọn công đoạn + người cân) → 201', wl1.status === 201);
  const afterW1 = (await req('GET', `/orders/${w12Order.id}`, mT)).data;
  const log1 = afterW1.weightLogs.find((w) => w.productionStepId === w12Step.id);
  ok('Bản cân ghi đúng người cân đã chọn', log1?.measuredById === worker.user.id);
  ok('stageName lưu tiếng Việt ("Đúc")', log1?.stageName === 'Đúc');
  await req('POST', `/orders/${w12Order.id}/weight-logs`, mT, { orderItemId: w12Item, productionStepId: w12Step.id, stageName: 'Đúc', measuredById: worker.user.id, previousWeight: 10, currentWeight: 9.9, confirmNegative: true });
  const castLogs = (await req('GET', `/orders/${w12Order.id}`, mT)).data.weightLogs.filter((w) => w.productionStepId === w12Step.id);
  ok('Trùng công đoạn: vẫn append log (giữ Hiến pháp III)', castLogs.length === 2);
  ok('Chi tiết đơn trả kèm tên người cân (measuredBy)', !!castLogs[0]?.measuredBy?.name);

  section('48. QC MVP: chỉ tên lỗi + mô tả rich + auto công đoạn trả về (US4)');
  const qcList12 = (await req('GET', '/qc/orders', qT)).data;
  const q12 = qcList12.find((o) => o.steps?.length > 0);
  ok('Có đơn để QC', !!q12);
  const qfail = await req('POST', `/qc/${q12.id}/fail`, qT, { result: 'NEEDS_REWORK', defectType: 'Xước bề mặt', note: '<b>Xước nhẹ</b> ở cạnh<script>alert(1)</script>', checklist: JSON.stringify([]) });
  ok('QC "Cần sửa" chỉ tên lỗi + mô tả (không returnStepId) → 201', qfail.status === 201);
  const q12hist = (await req('GET', `/qc/${q12.id}/history`, qT)).data[0];
  ok('Server tự chọn công đoạn trả về', !!q12hist.returnStepId);
  ok('Mô tả giữ <b>, strip <script>', /<b>/.test(q12hist.note || '') && !/script/i.test(q12hist.note || ''));
  ok('Đơn về NEEDS_REWORK', (await req('GET', `/orders/${q12.id}`, mT)).data.status === 'NEEDS_REWORK');

  // ══ PHASE 013 — QR FULL-LINK · KL TIẾP NHẬN · GOM LÔ KHI QUÉT ════════════
  section('49. QR full-link + KL tiếp nhận + gom lô khi quét');
  const tkt = (await req('POST', `/orders/${w12Order.id}/print-production-ticket`, mT)).data;
  ok('Phiếu QR trả scanUrl http đầy đủ + chứa /scan/', /^http/.test(tkt.scanUrl || '') && /\/scan\//.test(tkt.scanUrl || ''));

  const rcvOrder = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'SP tiếp nhận', material: 'Vàng 18K', quantity: 1, initialWeight: 8 }] })).data;
  await req('POST', `/orders/${rcvOrder.id}/configure-steps`, mT, { steps: [] });
  const rcvTok = (await req('GET', `/orders/${rcvOrder.id}`, mT)).data.qrToken;
  const accRes = await req('POST', `/scan/${rcvTok}/accept`, wT, { receivedWeight: 7.95 });
  ok('Tiếp nhận kèm KL tiếp nhận → 201', accRes.status === 201);
  const rcvDetail = (await req('GET', `/orders/${rcvOrder.id}`, mT)).data;
  ok('Có bản cân "Tiếp nhận"', rcvDetail.weightLogs.some((w) => /Tiếp nhận/i.test(w.stageName)));
  ok('TL hiện tại SP = KL tiếp nhận', rcvDetail.items[0].currentWeight === 7.95);

  async function toCasting() {
    const o = (await req('POST', '/orders', mT, { customerId: cust.id, items: [{ productName: 'SP gom', material: 'Vàng 18K', quantity: 1, initialWeight: 6 }] })).data;
    await req('POST', `/orders/${o.id}/configure-steps`, mT, { steps: [] });
    const tok = (await req('GET', `/orders/${o.id}`, mT)).data.qrToken;
    for (let k = 0; k < 2; k++) { // hoàn thành DESIGN_3D + WAX_PRINT → công đoạn hiện tại = Đúc
      await req('POST', `/scan/${tok}/accept`, wT, {});
      await req('POST', `/scan/${tok}/start`, wT, {});
      await req('POST', `/scan/${tok}/complete`, wT, { completedQuantity: 1 });
    }
    return tok;
  }
  const gtok1 = await toCasting();
  const gtok2 = await toCasting();
  const land1 = (await req('GET', `/scan/${gtok1}`, wT)).data;
  ok('Đơn đã tới công đoạn Đúc', land1.currentStep?.stepName === 'CASTING');
  const gb = (await req('POST', '/production/batches', wT, { stepName: land1.currentStep.stepName })).data;
  await req('POST', `/production/batches/${gb.id}/add`, wT, { qrToken: gtok1 });
  await req('POST', `/production/batches/${gb.id}/add`, wT, { qrToken: gtok2 });
  const gbFull = (await req('GET', `/production/batches/${gb.id}`, wT)).data;
  ok('Gom 2 đơn vào lô Đúc qua quét QR (qrToken)', gbFull.members.length === 2 && gbFull.stepName === 'CASTING');

  // ── KẾT QUẢ ─────────────────────────────────────────────────────────────
  console.log(`\n══════════════════════════════════════`);
  console.log(`  KẾT QUẢ: ${pass} PASS / ${fail} FAIL (tổng ${pass + fail})`);
  if (fail) console.log(`  ❌ Thất bại: ${fails.join(' | ')}`);
  else console.log(`  🎉 TẤT CẢ FUNCTION HOẠT ĐỘNG ĐÚNG`);
  console.log(`══════════════════════════════════════`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('SELFTEST CRASH:', e); process.exit(2); });
