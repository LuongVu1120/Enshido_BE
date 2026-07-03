// ─── @enshido/types — enum & type dùng chung FE/BE ──────────────────────────
// Nguồn sự thật duy nhất cho trạng thái đơn / công đoạn / loại lỗi.
// Tiếng Việt là ngôn ngữ chính (Hiến pháp · Additional Constraints).

// ─── Vai trò (RBAC 6 vai trò chuẩn) ─────────────────────────────────────────
export enum Role {
  ADMIN = 'ADMIN', // Admin / Chủ xưởng
  PRODUCTION_MANAGER = 'PRODUCTION_MANAGER', // Quản lý sản xuất
  WORKER = 'WORKER', // Thợ sản xuất
  QC = 'QC', // Nhân viên QC
  WAREHOUSE = 'WAREHOUSE', // Nhân viên kho
  ACCOUNTANT = 'ACCOUNTANT', // Kế toán / Hành chính
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Admin / Chủ xưởng',
  [Role.PRODUCTION_MANAGER]: 'Quản lý sản xuất',
  [Role.WORKER]: 'Thợ sản xuất',
  [Role.QC]: 'Nhân viên QC',
  [Role.WAREHOUSE]: 'Nhân viên kho',
  [Role.ACCOUNTANT]: 'Kế toán / Hành chính',
};

// ─── Vòng đời trạng thái đơn (FR-005) ───────────────────────────────────────
export enum OrderStatus {
  DRAFT = 'DRAFT', // Nháp
  PENDING_CONFIRM = 'PENDING_CONFIRM', // Chờ xác nhận
  WAITING_PRODUCTION = 'WAITING_PRODUCTION', // Chờ sản xuất
  IN_PRODUCTION = 'IN_PRODUCTION', // Đang sản xuất
  WAITING_QC = 'WAITING_QC', // Chờ QC
  QC_FAILED = 'QC_FAILED', // QC không đạt
  NEEDS_REWORK = 'NEEDS_REWORK', // Cần sửa
  PRODUCTION_DONE = 'PRODUCTION_DONE', // Hoàn thành sản xuất
  STOCKED = 'STOCKED', // Đã nhập kho TP
  DELIVERED = 'DELIVERED', // Đã bàn giao
  COMPLETED = 'COMPLETED', // Hoàn tất
  CANCELLED = 'CANCELLED', // Đã hủy
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.DRAFT]: 'Nháp',
  [OrderStatus.PENDING_CONFIRM]: 'Chờ xác nhận',
  [OrderStatus.WAITING_PRODUCTION]: 'Chờ sản xuất',
  [OrderStatus.IN_PRODUCTION]: 'Đang sản xuất',
  [OrderStatus.WAITING_QC]: 'Chờ QC',
  [OrderStatus.QC_FAILED]: 'QC không đạt',
  [OrderStatus.NEEDS_REWORK]: 'Cần sửa',
  [OrderStatus.PRODUCTION_DONE]: 'Hoàn thành sản xuất',
  [OrderStatus.STOCKED]: 'Đã nhập kho TP',
  [OrderStatus.DELIVERED]: 'Đã bàn giao',
  [OrderStatus.COMPLETED]: 'Hoàn tất',
  [OrderStatus.CANCELLED]: 'Đã hủy',
};

// Chuyển trạng thái hợp lệ (state machine) — server kiểm tra.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING_CONFIRM, OrderStatus.WAITING_PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_CONFIRM]: [OrderStatus.WAITING_PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.WAITING_PRODUCTION]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.WAITING_QC, OrderStatus.CANCELLED],
  [OrderStatus.WAITING_QC]: [OrderStatus.PRODUCTION_DONE, OrderStatus.QC_FAILED, OrderStatus.NEEDS_REWORK],
  [OrderStatus.QC_FAILED]: [OrderStatus.NEEDS_REWORK, OrderStatus.CANCELLED],
  [OrderStatus.NEEDS_REWORK]: [OrderStatus.IN_PRODUCTION, OrderStatus.WAITING_QC],
  [OrderStatus.PRODUCTION_DONE]: [OrderStatus.STOCKED, OrderStatus.DELIVERED],
  [OrderStatus.STOCKED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PENDING_CONFIRM,
  OrderStatus.WAITING_PRODUCTION,
];

export const ORDER_STATUSES: OrderStatus[] = Object.values(OrderStatus);

/**
 * Tên hiển thị của đơn (Phase 010): dùng `name` nếu có nội dung, ngược lại `code`.
 * Dùng CHUNG cho danh sách / chi tiết / Kanban / phiếu in để nhất quán FE/BE.
 */
export function orderDisplayName(o: { name?: string | null; code: string }): string {
  return o.name?.trim() ? o.name.trim() : o.code;
}

// Cột mặc định của Kanban-theo-trạng-thái-đơn (Phase 006). Admin có thể thêm/xóa/đổi tên/sắp xếp.
export const DEFAULT_BOARD_COLUMNS: { status: OrderStatus; label: string; position: number }[] = [
  { status: OrderStatus.WAITING_PRODUCTION, label: 'Chờ sản xuất', position: 1 },
  { status: OrderStatus.IN_PRODUCTION, label: 'Đang sản xuất', position: 2 },
  { status: OrderStatus.WAITING_QC, label: 'Chờ QC', position: 3 },
  { status: OrderStatus.NEEDS_REWORK, label: 'Cần sửa', position: 4 },
  { status: OrderStatus.PRODUCTION_DONE, label: 'Hoàn thành SX', position: 5 },
  { status: OrderStatus.STOCKED, label: 'Đã nhập kho', position: 6 },
];

// ─── Công đoạn sản xuất (US4) ───────────────────────────────────────────────
export enum StepName {
  DESIGN_3D = 'DESIGN_3D', // Thiết kế 3D
  WAX_PRINT = 'WAX_PRINT', // In sáp
  CASTING = 'CASTING', // Đúc
  FILING = 'FILING', // Làm nguội
  STONE_SETTING = 'STONE_SETTING', // Gắn đá
  PLATING = 'PLATING', // Xi mạ
  POLISHING = 'POLISHING', // Đánh bóng
  QC = 'QC', // QC
  STOCK_IN = 'STOCK_IN', // Nhập kho TP
}

export const STEP_LABELS: Record<StepName, string> = {
  [StepName.DESIGN_3D]: 'Thiết kế 3D',
  [StepName.WAX_PRINT]: 'In sáp',
  [StepName.CASTING]: 'Đúc',
  [StepName.FILING]: 'Làm nguội',
  [StepName.STONE_SETTING]: 'Gắn đá',
  [StepName.PLATING]: 'Xi mạ',
  [StepName.POLISHING]: 'Đánh bóng',
  [StepName.QC]: 'QC kiểm tra',
  [StepName.STOCK_IN]: 'Nhập kho TP',
};

// ─── Phase 011 — Lô sản xuất (batch: Đúc / Xi mạ làm theo mẻ) ────────────────
// Các công đoạn thường làm theo LÔ nhiều đơn một lúc; cân chênh lệch theo cả lô
// rồi PHÂN BỔ về từng đơn theo tỉ lệ khối lượng (giữ toàn vẹn hao hụt — HP III).
export const BATCHABLE_STEPS_DEFAULT: StepName[] = [StepName.CASTING, StepName.PLATING];

export enum BatchStatus {
  OPEN = 'OPEN', // đang gom đơn
  DONE = 'DONE', // đã chốt (cân + phân bổ)
  CANCELLED = 'CANCELLED', // hủy lô
}

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  [BatchStatus.OPEN]: 'Đang gom',
  [BatchStatus.DONE]: 'Đã chốt',
  [BatchStatus.CANCELLED]: 'Đã hủy',
};

export interface BatchMemberInput {
  key: string; // định danh thành viên (vd stepId)
  inputWeight: number; // KL trước công đoạn của đơn (g)
  overrideLoss?: number | null; // hao hụt nhập tay cho đơn cá biệt (g) — nếu có
}
export interface BatchMemberAllocation {
  key: string;
  inputWeight: number;
  lossWeight: number;
  outputWeight: number;
}
export interface BatchAllocationResult {
  totalInputWeight: number;
  totalLossWeight: number; // = tổng vào − tổng ra (âm nếu tăng cân, vd xi mạ)
  members: BatchMemberAllocation[];
}

/**
 * Phân bổ chênh lệch KL của cả lô về từng đơn theo TỈ LỆ KHỐI LƯỢNG (Phase 011).
 * - Đơn có `overrideLoss` (nhập tay) được giữ nguyên; phần còn lại chia theo tỉ lệ.
 * - Bảo toàn khối lượng: phần dư làm tròn dồn vào đơn (auto) có KL lớn nhất để
 *   `Σ lossWeight === totalLossWeight` khớp tuyệt đối.
 * Dùng CHUNG cho server (chốt lô) và client (xem trước phân bổ).
 */
export function allocateBatchLoss(
  members: BatchMemberInput[],
  totalOutputWeight: number,
): BatchAllocationResult {
  const totalInputWeight = round2(members.reduce((s, m) => s + (m.inputWeight || 0), 0));
  const totalLossWeight = round2(totalInputWeight - totalOutputWeight);

  const auto = members.filter((m) => m.overrideLoss == null);
  const overriddenLoss = round2(
    members.filter((m) => m.overrideLoss != null).reduce((s, m) => s + (m.overrideLoss as number), 0),
  );
  const autoBase = round2(auto.reduce((s, m) => s + (m.inputWeight || 0), 0));
  const autoLossTotal = round2(totalLossWeight - overriddenLoss);

  const result: BatchMemberAllocation[] = members.map((m) => {
    const lossWeight =
      m.overrideLoss != null
        ? round2(m.overrideLoss)
        : autoBase > 0
          ? round2(autoLossTotal * (m.inputWeight / autoBase))
          : 0;
    return {
      key: m.key,
      inputWeight: round2(m.inputWeight),
      lossWeight,
      outputWeight: round2(m.inputWeight - lossWeight),
    };
  });

  // Bảo toàn khối lượng — dồn chênh lệch làm tròn vào đơn auto có KL lớn nhất.
  const sumLoss = round2(result.reduce((s, r) => s + r.lossWeight, 0));
  const diff = round2(totalLossWeight - sumLoss);
  if (diff !== 0 && result.length) {
    const pool = auto.length ? auto : members;
    let targetKey = pool[0].key;
    let maxIn = -Infinity;
    for (const m of pool) if ((m.inputWeight || 0) > maxIn) { maxIn = m.inputWeight || 0; targetKey = m.key; }
    const r = result.find((x) => x.key === targetKey)!;
    r.lossWeight = round2(r.lossWeight + diff);
    r.outputWeight = round2(r.inputWeight - r.lossWeight);
  }
  return { totalInputWeight, totalLossWeight, members: result };
}

// Quy trình mặc định (cho phép tùy biến theo đơn).
export const DEFAULT_STEP_FLOW: StepName[] = [
  StepName.DESIGN_3D,
  StepName.WAX_PRINT,
  StepName.CASTING,
  StepName.FILING,
  StepName.STONE_SETTING,
  StepName.PLATING,
  StepName.POLISHING,
  StepName.QC,
  StepName.STOCK_IN,
];

export enum StepStatus {
  NOT_STARTED = 'NOT_STARTED', // Chưa bắt đầu
  ACCEPTED = 'ACCEPTED', // Đã tiếp nhận
  IN_PROGRESS = 'IN_PROGRESS', // Đang xử lý
  DONE = 'DONE', // Hoàn thành
  ISSUE = 'ISSUE', // Báo lỗi
  NEEDS_REWORK = 'NEEDS_REWORK', // Cần sửa (QC trả về)
}

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  [StepStatus.NOT_STARTED]: 'Chưa bắt đầu',
  [StepStatus.ACCEPTED]: 'Đã tiếp nhận',
  [StepStatus.IN_PROGRESS]: 'Đang xử lý',
  [StepStatus.DONE]: 'Hoàn thành',
  [StepStatus.ISSUE]: 'Báo lỗi',
  [StepStatus.NEEDS_REWORK]: 'Cần sửa',
};

// ─── QC (US8) ───────────────────────────────────────────────────────────────
export enum QCResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  NEEDS_REWORK = 'NEEDS_REWORK', // Cần sửa
}

export const QC_RESULT_LABELS: Record<QCResult, string> = {
  [QCResult.PASS]: 'Đạt',
  [QCResult.FAIL]: 'Không đạt',
  [QCResult.NEEDS_REWORK]: 'Cần sửa',
};

export enum DefectSeverity {
  MINOR = 'MINOR', // Nhẹ
  MAJOR = 'MAJOR', // Nặng
  CRITICAL = 'CRITICAL', // Nghiêm trọng
}

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  [DefectSeverity.MINOR]: 'Nhẹ',
  [DefectSeverity.MAJOR]: 'Nặng',
  [DefectSeverity.CRITICAL]: 'Nghiêm trọng',
};

// Bộ tiêu chí kiểm QC mặc định cho kim hoàn (Phase 009). `critical`: lỗi nghiêm trọng.
export type QcCheckValue = 'pass' | 'fail' | 'na';

export const QC_CHECKLIST: { key: string; label: string; critical?: boolean }[] = [
  { key: 'weight', label: 'Trọng lượng & hao hụt đạt định mức', critical: true },
  { key: 'size', label: 'Kích thước / size đúng yêu cầu' },
  { key: 'stone', label: 'Gắn đá chắc, đúng vị trí, không lệch', critical: true },
  { key: 'plating', label: 'Xi mạ / màu đều, đúng yêu cầu' },
  { key: 'polish', label: 'Đánh bóng / bề mặt nhẵn, không trầy xước' },
  { key: 'casting', label: 'Đúc không rỗ khí / nứt' },
  { key: 'design', label: 'Khớp mẫu thiết kế', critical: true },
  { key: 'finish', label: 'Hoàn thiện tổng thể' },
];

export const QC_CHECK_VALUE_LABELS: Record<QcCheckValue, string> = {
  pass: 'Đạt',
  fail: 'Không đạt',
  na: 'Bỏ qua',
};

export const DEFECT_TYPES = [
  'Lỗi gắn đá',
  'Lỗi đánh bóng',
  'Lỗi xi mạ',
  'Sai kích thước',
  'Lỗi đúc (rỗ/khí)',
  'Trầy xước',
  'Sai mẫu thiết kế',
  'Hao hụt vượt mức',
  'Khác',
] as const;

// ─── Kênh bán & loại đơn ────────────────────────────────────────────────────
export enum SalesChannel {
  SHOPEE = 'SHOPEE',
  LAZADA = 'LAZADA',
  TIKTOK = 'TIKTOK',
  WEBSITE = 'WEBSITE',
  STORE = 'STORE', // Cửa hàng / trực tiếp
  WHOLESALE = 'WHOLESALE', // Sỉ
}

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  [SalesChannel.SHOPEE]: 'Shopee',
  [SalesChannel.LAZADA]: 'Lazada',
  [SalesChannel.TIKTOK]: 'TikTok Shop',
  [SalesChannel.WEBSITE]: 'Website',
  [SalesChannel.STORE]: 'Cửa hàng',
  [SalesChannel.WHOLESALE]: 'Bán sỉ',
};

export enum OrderType {
  MADE_TO_ORDER = 'MADE_TO_ORDER', // Đặt làm theo yêu cầu
  STOCK = 'STOCK', // Sản xuất hàng sẵn
  REPAIR = 'REPAIR', // Sửa chữa
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  [OrderType.MADE_TO_ORDER]: 'Đặt làm',
  [OrderType.STOCK]: 'Hàng sẵn',
  [OrderType.REPAIR]: 'Sửa chữa',
};

export enum OrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  [OrderPriority.LOW]: 'Thấp',
  [OrderPriority.NORMAL]: 'Trung bình',
  [OrderPriority.HIGH]: 'Cao',
  [OrderPriority.URGENT]: 'Gấp',
};

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED', // Khóa (không xóa cứng — FR-002)
}

// ─── Hao hụt (Hiến pháp III) — công thức chuẩn ──────────────────────────────
export const DEFAULT_ALLOWED_LOSS_PERCENT = 3.0;

export interface LossCalcInput {
  previousWeight: number; // TL trước (g)
  currentWeight: number; // TL sau (g)
  initialWeight: number; // TL ban đầu của sản phẩm (g) — để tính lũy kế
  allowedLossPercent?: number; // định mức cho phép (%)
}

export interface LossCalcResult {
  lossWeight: number; // hao hụt (g) = trước - sau
  lossPercent: number; // tỷ lệ (%) = hao hụt / trước * 100
  cumulativeLossWeight: number; // lũy kế (g) = ban đầu - hiện tại
  cumulativeLossPercent: number; // lũy kế (%) = lũy kế / ban đầu * 100
  exceedsAllowed: boolean; // vượt định mức?
  isNegative: boolean; // hao hụt âm (TL sau > trước) → nghi nhập sai
  allowedLossPercent: number;
}

/** Làm tròn 2 chữ số thập phân (gram/%) — dùng nhất quán FE/BE. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Tính hao hụt theo công thức chuẩn của hiến pháp (Nguyên tắc III).
 * Dùng CHUNG cho server (lưu) và client (preview) để đảm bảo nhất quán.
 */
export function calcLoss(input: LossCalcInput): LossCalcResult {
  const allowedLossPercent = input.allowedLossPercent ?? DEFAULT_ALLOWED_LOSS_PERCENT;
  const lossWeight = round2(input.previousWeight - input.currentWeight);
  const lossPercent =
    input.previousWeight > 0 ? round2((lossWeight / input.previousWeight) * 100) : 0;
  const cumulativeLossWeight = round2(input.initialWeight - input.currentWeight);
  const cumulativeLossPercent =
    input.initialWeight > 0 ? round2((cumulativeLossWeight / input.initialWeight) * 100) : 0;
  return {
    lossWeight,
    lossPercent,
    cumulativeLossWeight,
    cumulativeLossPercent,
    exceedsAllowed: cumulativeLossPercent > allowedLossPercent,
    isNegative: lossWeight < 0,
    allowedLossPercent,
  };
}

// ─── Quy ước mã (Additional Constraints) ────────────────────────────────────
export const CODE_PREFIX = {
  ORDER: 'SX', // SX-YYYYMMDD-####
  TICKET: 'PSX', // PSX-YYYYMMDD-####
  CUSTOMER: 'KH', // KH-######
  MATERIAL: 'VT', // VT-######
  SUPPLIER: 'NCC', // NCC-######
  EMPLOYEE: 'NV', // NV-####
  BATCH: 'LSX', // LSX-YYYYMMDD-#### (lô sản xuất — Phase 011)
} as const;

// ─── Phase 004 — Nhân sự ────────────────────────────────────────────────────
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE', // Đang làm
  ON_LEAVE = 'ON_LEAVE', // Tạm nghỉ
  RESIGNED = 'RESIGNED', // Nghỉ việc
}

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: 'Đang làm',
  [EmployeeStatus.ON_LEAVE]: 'Tạm nghỉ',
  [EmployeeStatus.RESIGNED]: 'Nghỉ việc',
};

export const DEPARTMENTS = [
  'Xưởng sản xuất',
  'Thiết kế',
  'QC',
  'Kho',
  'Kinh doanh',
  'Kế toán / Hành chính',
  'Ban giám đốc',
] as const;

// ─── Phase 005 — Tự động hóa (rule-based, cấu hình được) ────────────────────
export const AUTOMATION_DEFAULTS = {
  avgDaysPerStep: 1, // số ngày TB ước tính cho 1 công đoạn
  delayRiskFactor: 1.2, // hệ số an toàn khi đánh giá nguy cơ trễ
  laborCostPerStep: 50000, // chi phí công / công đoạn (đ)
  metalPricePerGram: 2500000, // đơn giá kim loại để quy đổi hao hụt → tiền (đ/g)
  kpiRatePerStep: 30000, // đơn giá lương theo sản lượng / công đoạn (đ)
  onTimeBonusRate: 0.1, // thưởng đúng hạn (×) trên lương sản lượng
  defectPenaltyPerUnit: 20000, // phạt mỗi sản phẩm lỗi (đ)
};

export type AutomationSettings = typeof AUTOMATION_DEFAULTS;

export const AUTOMATION_SETTING_LABELS: Record<keyof AutomationSettings, string> = {
  avgDaysPerStep: 'Số ngày TB / công đoạn',
  delayRiskFactor: 'Hệ số nguy cơ trễ',
  laborCostPerStep: 'Chi phí công / công đoạn (đ)',
  metalPricePerGram: 'Đơn giá kim loại (đ/g)',
  kpiRatePerStep: 'Lương sản lượng / công đoạn (đ)',
  onTimeBonusRate: 'Tỷ lệ thưởng đúng hạn (×)',
  defectPenaltyPerUnit: 'Phạt / sản phẩm lỗi (đ)',
};

export enum DelayRisk {
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  OVERDUE = 'OVERDUE',
}

export const DELAY_RISK_LABELS: Record<DelayRisk, string> = {
  [DelayRisk.ON_TRACK]: 'Đúng tiến độ',
  [DelayRisk.AT_RISK]: 'Nguy cơ trễ',
  [DelayRisk.OVERDUE]: 'Đã quá hạn',
};

// ─── Phase 002 — Tồn kho ────────────────────────────────────────────────────

// 7 nhóm kho (FR-001).
export enum InventoryGroup {
  RAW_MATERIAL = 'RAW_MATERIAL', // Nguyên liệu (bạc, vàng)
  STONE = 'STONE', // Đá quý, đá tấm
  ACCESSORY = 'ACCESSORY', // Phụ kiện
  CHEMICAL = 'CHEMICAL', // Hóa chất xi/mạ
  PACKAGING = 'PACKAGING', // Bao bì
  SEMI_FINISHED = 'SEMI_FINISHED', // Bán thành phẩm
  FINISHED = 'FINISHED', // Thành phẩm
}

export const INVENTORY_GROUP_LABELS: Record<InventoryGroup, string> = {
  [InventoryGroup.RAW_MATERIAL]: 'Nguyên liệu',
  [InventoryGroup.STONE]: 'Đá quý, Đá tấm',
  [InventoryGroup.ACCESSORY]: 'Phụ kiện',
  [InventoryGroup.CHEMICAL]: 'Hóa chất xi/mạ',
  [InventoryGroup.PACKAGING]: 'Bao bì',
  [InventoryGroup.SEMI_FINISHED]: 'Bán thành phẩm',
  [InventoryGroup.FINISHED]: 'Thành phẩm',
};

export enum InventoryTxnType {
  IN = 'IN', // Nhập kho (từ NCC)
  OUT = 'OUT', // Xuất kho (cho đơn/công đoạn)
  TRANSFER = 'TRANSFER', // Chuyển kho
  FG_IN = 'FG_IN', // Nhập kho thành phẩm sau QC PASS
}

export const INVENTORY_TXN_LABELS: Record<InventoryTxnType, string> = {
  [InventoryTxnType.IN]: 'Nhập kho',
  [InventoryTxnType.OUT]: 'Xuất kho',
  [InventoryTxnType.TRANSFER]: 'Chuyển kho',
  [InventoryTxnType.FG_IN]: 'Nhập kho TP',
};

export enum StockStatus {
  NORMAL = 'NORMAL', // Bình thường
  LOW = 'LOW', // Sắp hết (≤ tồn tối thiểu)
  OUT = 'OUT', // Hết hàng (= 0)
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  [StockStatus.NORMAL]: 'Bình thường',
  [StockStatus.LOW]: 'Sắp hết',
  [StockStatus.OUT]: 'Hết hàng',
};

/** Trạng thái tồn theo tồn hiện tại vs tồn tối thiểu (FR-005). */
export function stockStatusOf(currentStock: number, minStock: number): StockStatus {
  if (currentStock <= 0) return StockStatus.OUT;
  if (currentStock <= minStock) return StockStatus.LOW;
  return StockStatus.NORMAL;
}
