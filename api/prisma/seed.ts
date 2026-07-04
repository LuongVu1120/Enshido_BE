import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  AUTOMATION_DEFAULTS,
  BatchStatus,
  calcLoss,
  DEFAULT_BOARD_COLUMNS,
  DEFAULT_STEP_FLOW,
  DefectSeverity,
  EmployeeStatus,
  InventoryGroup,
  InventoryTxnType,
  OrderPriority,
  OrderStatus,
  QCResult,
  Role,
  ROLE_LABELS,
  SalesChannel,
  STEP_LABELS,
  StepName,
  StepStatus,
} from '@enshido/types';

const prisma = new PrismaClient();

function ymd(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log('🌱 Seeding ENSHIDO...');

  // Xóa dữ liệu cũ (thứ tự phụ thuộc).
  await prisma.activityLog.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.qCRecord.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.productionStep.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.integrationLog.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.role.deleteMany();

  // ─── Roles ────────────────────────────────────────────────────────────────
  for (const r of Object.values(Role)) {
    await prisma.role.create({
      data: { name: r, label: ROLE_LABELS[r], permissions: JSON.stringify(['*']) },
    });
  }

  // ─── Users (mật khẩu chung: 123456) ────────────────────────────────────────
  const passwordHash = await argon2.hash('123456');
  const mk = (name: string, email: string, role: Role) => ({ name, email, role, passwordHash });
  const usersData = [
    mk('Phạm Viễn Chí', 'admin@enshido.vn', Role.ADMIN),
    mk('Nguyễn Quản Lý', 'quanly@enshido.vn', Role.PRODUCTION_MANAGER),
    mk('Lê Văn Hùng (Thợ)', 'tho1@enshido.vn', Role.WORKER),
    mk('Nguyễn Thị Lan (Thợ)', 'tho2@enshido.vn', Role.WORKER),
    mk('Hoàng Văn Nam (Thợ)', 'tho3@enshido.vn', Role.WORKER),
    mk('Trần Thị QC', 'qc@enshido.vn', Role.QC),
    mk('Vũ Văn Kho', 'kho@enshido.vn', Role.WAREHOUSE),
    mk('Đỗ Thị Kế Toán', 'ketoan@enshido.vn', Role.ACCOUNTANT),
  ];
  const users: Record<string, { id: string }> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({ data: u });
    users[u.email] = created;
  }

  // ─── Hồ sơ nhân viên (Phase 004): tạo cho mỗi user + vài NV không account ──
  const roleDept: Record<string, [string, string]> = {
    [Role.ADMIN]: ['Ban giám đốc', 'Quản trị viên'],
    [Role.PRODUCTION_MANAGER]: ['Xưởng sản xuất', 'Quản lý sản xuất'],
    [Role.WORKER]: ['Xưởng sản xuất', 'Thợ kim hoàn'],
    [Role.QC]: ['QC', 'Nhân viên QC'],
    [Role.WAREHOUSE]: ['Kho', 'Nhân viên kho'],
    [Role.ACCOUNTANT]: ['Kế toán / Hành chính', 'Kế toán'],
  };
  let nv = 1;
  for (const u of usersData) {
    const [dept, pos] = roleDept[u.role] ?? ['Xưởng sản xuất', 'Nhân viên'];
    const emp = await prisma.employee.create({
      data: {
        code: `NV-${String(nv++).padStart(4, '0')}`,
        name: u.name,
        email: u.email,
        department: dept,
        position: pos,
        joinDate: daysFromNow(-200),
        status: EmployeeStatus.ACTIVE,
      },
    });
    await prisma.user.update({ where: { id: users[u.email].id }, data: { employeeId: emp.id } });
  }
  // Phase 007: MỌI nhân sự đều có account (kể cả thợ phụ). Demo dùng mật khẩu 123456.
  const hoa = await prisma.employee.create({
    data: { code: `NV-${String(nv++).padStart(4, '0')}`, name: 'Phạm Thị Hoa (thợ phụ)', email: 'hoa@enshido.vn', department: 'Xưởng sản xuất', position: 'Thợ phụ', joinDate: daysFromNow(-60), status: EmployeeStatus.ACTIVE, skills: 'Gắn đá,Đánh bóng' },
  });
  const hoaUser = await prisma.user.create({ data: { name: hoa.name, email: 'hoa@enshido.vn', passwordHash, role: Role.WORKER, employeeId: hoa.id } });
  const tai = await prisma.employee.create({
    data: { code: `NV-${String(nv++).padStart(4, '0')}`, name: 'Lê Văn Tài (đã nghỉ)', email: 'tai@enshido.vn', department: 'Xưởng sản xuất', position: 'Thợ', joinDate: daysFromNow(-400), status: EmployeeStatus.RESIGNED },
  });
  // NV nghỉ việc → tài khoản khóa.
  await prisma.user.create({ data: { name: tai.name, email: 'tai@enshido.vn', passwordHash, role: Role.WORKER, status: 'LOCKED', employeeId: tai.id } });
  void hoaUser;

  const tho1 = users['tho1@enshido.vn'].id;
  const tho2 = users['tho2@enshido.vn'].id;
  const tho3 = users['tho3@enshido.vn'].id;
  const manager = users['quanly@enshido.vn'].id;

  // ─── Customers ─────────────────────────────────────────────────────────────
  const customersData = [
    { name: 'Trần Minh Tuấn', phone: '0905123456', channel: SalesChannel.SHOPEE, customerType: 'VIP' },
    { name: 'Nguyễn Thanh An', phone: '0912988777', channel: SalesChannel.STORE, customerType: 'Lẻ' },
    { name: 'Công ty Vàng Bạc Kim Phát', phone: '02838221100', channel: SalesChannel.WHOLESALE, customerType: 'Sỉ' },
    { name: 'Lê Thị Hà', phone: '0978554433', channel: SalesChannel.TIKTOK, customerType: 'Lẻ' },
  ];
  const customers: { id: string }[] = [];
  let ci = 1;
  for (const c of customersData) {
    const created = await prisma.customer.create({
      data: { ...c, code: `KH-${String(ci++).padStart(6, '0')}` },
    });
    customers.push(created);
  }

  // ─── Helper: tạo đơn + items + steps, mô phỏng tiến độ ─────────────────────
  let orderSeq = 1;
  async function createOrder(opts: {
    customerIdx: number;
    productName: string;
    material: string;
    stoneType?: string;
    initialWeight: number;
    priority?: OrderPriority;
    channel?: SalesChannel;
    deadlineDays: number;
    completedSteps: number; // số công đoạn đã hoàn thành
    status: OrderStatus;
    assign?: string[];
    name?: string; // tên đơn dễ đọc (Phase 010)
    note?: string; // ghi chú rich content (HTML)
  }) {
    const code = `SX-${ymd()}-${String(orderSeq++).padStart(4, '0')}`;
    const order = await prisma.order.create({
      data: {
        code,
        name: opts.name ?? null,
        note: opts.note ?? null,
        customerId: customers[opts.customerIdx].id,
        salesChannel: opts.channel ?? SalesChannel.SHOPEE,
        priority: opts.priority ?? OrderPriority.NORMAL,
        deadline: daysFromNow(opts.deadlineDays),
        status: opts.status,
        createdById: manager,
        qrToken: `qr-${code}`,
        items: {
          create: [
            {
              productName: opts.productName,
              productCode: `SP-${orderSeq}`,
              category: 'Nhẫn',
              quantity: 1,
              material: opts.material,
              stoneType: opts.stoneType,
              size: '16',
              initialWeight: opts.initialWeight,
              currentWeight: opts.initialWeight,
            },
          ],
        },
      },
      include: { items: true },
    });

    const flow = DEFAULT_STEP_FLOW;
    const assignees = opts.assign ?? [tho1, tho2, tho3];
    let weight = opts.initialWeight;
    for (let i = 0; i < flow.length; i++) {
      const done = i < opts.completedSteps;
      const isCurrent = i === opts.completedSteps;
      const step = await prisma.productionStep.create({
        data: {
          orderId: order.id,
          orderItemId: order.items[0].id,
          stepName: flow[i],
          stepOrder: i + 1,
          assignedToId: assignees[i % assignees.length],
          // Phase 007: người thực hiện thực tế (seed = người được gán cho công đoạn đã xong)
          performedById: done ? assignees[i % assignees.length] : null,
          status: done ? StepStatus.DONE : StepStatus.NOT_STARTED,
          startedAt: done ? daysFromNow(-3 + i) : null,
          completedAt: done ? daysFromNow(-3 + i) : null,
          completedQuantity: done ? 1 : null,
        },
      });

      // Mô phỏng hao hụt cho các công đoạn vật lý đã xong (sau In sáp).
      if (done && i >= 2 && flow[i] !== StepName.QC && flow[i] !== StepName.STOCK_IN) {
        const prev = weight;
        const cur = Math.round((weight - 0.05 - Math.random() * 0.08) * 100) / 100;
        const calc = calcLoss({
          previousWeight: prev,
          currentWeight: cur,
          initialWeight: opts.initialWeight,
          allowedLossPercent: 3,
        });
        await prisma.weightLog.create({
          data: {
            orderId: order.id,
            orderItemId: order.items[0].id,
            productionStepId: step.id,
            stageName: STEP_LABELS[flow[i]] ?? flow[i],
            previousWeight: prev,
            currentWeight: cur,
            lossWeight: calc.lossWeight,
            lossPercent: calc.lossPercent,
            cumulativeLossWeight: calc.cumulativeLossWeight,
            cumulativeLossPercent: calc.cumulativeLossPercent,
            allowedLossPercent: 3,
            exceedsAllowed: calc.exceedsAllowed,
            measuredById: step.assignedToId!,
          },
        });
        weight = cur;
        await prisma.orderItem.update({
          where: { id: order.items[0].id },
          data: { currentWeight: cur },
        });
      }
    }
    return order;
  }

  // ─── Đơn mẫu trải đều trạng thái (cho Kanban + Dashboard) ──────────────────
  const order1 = await createOrder({
    customerIdx: 0, productName: 'Nhẫn Moissanite 6.5mm', material: 'Vàng 18K', stoneType: 'Moissanite',
    initialWeight: 12.5, priority: OrderPriority.HIGH, channel: SalesChannel.SHOPEE,
    deadlineDays: 1, completedSteps: 4, status: OrderStatus.IN_PRODUCTION,
    name: 'Nhẫn cưới chị Lan — bộ 2 cái',
    note: '<p><strong>Yêu cầu đặc biệt:</strong></p><ul><li>Khắc tên <em>Lan &amp; Nam</em> mặt trong</li><li>Đánh bóng <u>gương</u></li></ul><p>Liên hệ: <a href="https://zalo.me/0900">Zalo khách</a></p>',
  });
  await createOrder({
    customerIdx: 1, productName: 'Dây chuyền vàng', material: 'Vàng 10K',
    initialWeight: 8.2, priority: OrderPriority.NORMAL, deadlineDays: 3,
    completedSteps: 2, status: OrderStatus.IN_PRODUCTION,
  });
  await createOrder({
    customerIdx: 2, productName: 'Lắc tay bạc', material: 'Bạc 925',
    initialWeight: 15.0, priority: OrderPriority.LOW, channel: SalesChannel.WHOLESALE,
    deadlineDays: 7, completedSteps: 0, status: OrderStatus.WAITING_PRODUCTION,
  });
  const qcOrder = await createOrder({
    customerIdx: 3, productName: 'Bông tai kim cương', material: 'Vàng 14K', stoneType: 'Kim cương',
    initialWeight: 5.4, priority: OrderPriority.URGENT, channel: SalesChannel.TIKTOK,
    deadlineDays: 0, completedSteps: 7, status: OrderStatus.WAITING_QC,
    name: 'Bông tai cô dâu — gấp giao 20/6',
  });
  await createOrder({
    customerIdx: 0, productName: 'Nhẫn nam vàng', material: 'Vàng 18K',
    initialWeight: 20.1, priority: OrderPriority.NORMAL, deadlineDays: 5,
    completedSteps: 9, status: OrderStatus.PRODUCTION_DONE,
  });

  // ─── Phase 011 — Lô sản xuất (demo): 2 đơn đang chờ Đúc, gom vào 1 lô mở ────
  const castA = await createOrder({
    customerIdx: 1, productName: 'Nhẫn trơn vàng 18K', material: 'Vàng 18K',
    initialWeight: 6.8, priority: OrderPriority.NORMAL, deadlineDays: 4,
    completedSteps: 2, status: OrderStatus.IN_PRODUCTION, name: 'Lô đúc — nhẫn trơn A',
  });
  const castB = await createOrder({
    customerIdx: 2, productName: 'Mặt dây chuyền vàng', material: 'Vàng 18K',
    initialWeight: 4.2, priority: OrderPriority.HIGH, deadlineDays: 3,
    completedSteps: 2, status: OrderStatus.IN_PRODUCTION, name: 'Lô đúc — mặt dây B',
  });
  const castBatch = await prisma.productionBatch.create({
    data: { code: `LSX-${ymd()}-0001`, stepName: StepName.CASTING, status: BatchStatus.OPEN, performedById: tho1, note: 'Gom đúc mẻ sáng' },
  });
  for (const o of [castA, castB]) {
    const step = await prisma.productionStep.findFirst({ where: { orderId: o.id, stepName: StepName.CASTING } });
    if (step) await prisma.productionStep.update({ where: { id: step.id }, data: { batchId: castBatch.id, status: StepStatus.IN_PROGRESS, startedAt: daysFromNow(-1), performedById: tho1 } });
  }

  // ─── Một bản ghi QC PASS để dashboard có tỷ lệ ─────────────────────────────
  await prisma.qCRecord.create({
    data: {
      orderId: qcOrder.id,
      qcUserId: users['qc@enshido.vn'].id,
      result: QCResult.PASS,
      note: 'Đạt — bề mặt sáng, đá chắc.',
      attempt: 1,
    },
  });

  // ─── Phase 002 — Nhà cung cấp + Vật tư tồn kho ─────────────────────────────
  const supData = [
    { name: 'Cty Vàng Bạc Phú Quý', phone: '02839991111' },
    { name: 'Đá quý Minh Châu', phone: '02838882222' },
    { name: 'Phụ kiện & Bao bì An Khang', phone: '02837773333' },
  ];
  const suppliers: { id: string }[] = [];
  let si = 1;
  for (const s of supData) {
    suppliers.push(
      await prisma.supplier.create({ data: { ...s, code: `NCC-${String(si++).padStart(6, '0')}` } }),
    );
  }

  // group, name, unit, current, min, cost, supplierIdx
  const itemData: [InventoryGroup, string, string, number, number, number, number][] = [
    [InventoryGroup.RAW_MATERIAL, 'Bạc 925 thỏi', 'kg', 12.45, 2, 18_500_000, 0],
    [InventoryGroup.RAW_MATERIAL, 'Vàng 18K thỏi', 'lượng', 8.25, 1, 67_200_000, 0],
    [InventoryGroup.STONE, 'Moissanite 6.5mm D-F VVS1', 'viên', 356, 100, 78_000, 1],
    [InventoryGroup.STONE, 'Đá CZ 3.0mm', 'viên', 2450, 500, 2_000, 1],
    [InventoryGroup.STONE, 'Kim cương 4.0mm', 'viên', 5, 10, 1_850_000, 1], // dưới tối thiểu → cảnh báo
    [InventoryGroup.ACCESSORY, 'Chấu 4 chân 6.5mm', 'cái', 1020, 200, 3_500, 2],
    [InventoryGroup.ACCESSORY, 'Khóa dây chuyền', 'cái', 7, 20, 12_000, 2], // dưới tối thiểu
    [InventoryGroup.CHEMICAL, 'Dung dịch xi vàng', 'lít', 18, 5, 1_250_000, 2],
    [InventoryGroup.PACKAGING, 'Hộp nhẫn nhung', 'cái', 0, 50, 15_000, 2], // hết hàng
    [InventoryGroup.SEMI_FINISHED, 'Phôi nhẫn trơn nam 3mm', 'cái', 35, 10, 1_250_000, 0],
  ];
  let vi = 1;
  for (const [group, name, unit, cur, min, cost, supIdx] of itemData) {
    await prisma.inventoryItem.create({
      data: {
        code: `VT-${String(vi++).padStart(6, '0')}`,
        name,
        group,
        unit,
        currentStock: cur,
        minStock: min,
        costPrice: cost,
        supplierId: suppliers[supIdx].id,
      },
    });
  }

  // ─── Dữ liệu cho báo cáo (Phase 003): 1 QC FAIL + vài giao dịch xuất kho ──
  const khoId = users['kho@enshido.vn'].id;
  const o1Steps = await prisma.productionStep.findMany({ where: { orderId: order1.id } });
  const stoneStep = o1Steps.find((s) => s.stepName === StepName.STONE_SETTING);
  await prisma.qCRecord.create({
    data: {
      orderId: order1.id,
      qcUserId: users['qc@enshido.vn'].id,
      result: QCResult.FAIL,
      defectType: 'Lỗi gắn đá',
      severity: DefectSeverity.MAJOR,
      returnStepId: stoneStep?.id,
      assignedReworkUserId: tho2,
      note: 'Đá lỏng, cần gắn lại.',
      attempt: 1,
    },
  });

  // Một vài phiếu xuất kho cho đơn (để báo cáo "vật tư tiêu hao" + nhập/xuất hôm nay).
  const rawItems = await prisma.inventoryItem.findMany({
    where: { group: { in: [InventoryGroup.RAW_MATERIAL, InventoryGroup.STONE] } },
    take: 3,
  });
  let tx = 1;
  for (const it of rawItems) {
    const qty = Math.max(1, Math.round(it.currentStock * 0.05));
    await prisma.inventoryItem.update({ where: { id: it.id }, data: { currentStock: { decrement: qty } } });
    await prisma.inventoryTransaction.create({
      data: {
        code: `PX-${ymd()}-${String(tx++).padStart(4, '0')}`,
        type: InventoryTxnType.OUT,
        inventoryItemId: it.id,
        orderId: order1.id,
        quantity: qty,
        performedById: khoId,
        note: 'Xuất cho sản xuất',
      },
    });
  }

  // ─── Cột Kanban theo trạng thái đơn (Phase 006) ───────────────────────────
  for (const c of DEFAULT_BOARD_COLUMNS) {
    await prisma.boardColumn.create({ data: { status: c.status, label: c.label, position: c.position } });
  }

  // ─── Phase 005: cấu hình tự động hóa + tích hợp mẫu ───────────────────────
  for (const [key, value] of Object.entries(AUTOMATION_DEFAULTS)) {
    await prisma.setting.create({ data: { key, value: JSON.stringify(value) } });
  }
  await prisma.integration.create({ data: { name: 'Shopee Shop', provider: 'SHOPEE', status: 'DISCONNECTED' } });
  await prisma.integration.create({ data: { name: 'Phần mềm kế toán MISA', provider: 'ACCOUNTING', status: 'DISCONNECTED' } });

  console.log('✅ Seed xong.');
  console.log('   Đăng nhập: admin@enshido.vn / quanly@enshido.vn / tho1@enshido.vn / qc@enshido.vn ...');
  console.log('   Mật khẩu chung: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
