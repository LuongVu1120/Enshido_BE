# ENSHIDO Jewelry — Bộ tài liệu Spec-Driven Development (spec-kit)

Bộ file này được tạo từ **tài liệu mô tả phần mềm** và **8 mockup giao diện** trong `requirement/`, đóng gói sẵn theo chuẩn [GitHub spec-kit](https://github.com/github/spec-kit) để nhóm Hola Tech chạy quy trình `constitution → specify → plan → tasks → implement`.

> **Hệ thống**: Phần mềm quản lý đơn hàng sản xuất xưởng kim hoàn ENSHIDO.
> **Trục nghiệp vụ chính**: Khách hàng → Đơn hàng → Sản xuất → Trọng lượng → QC → Tồn kho.

---

## 1. Cấu trúc thư mục

```text
spec-kit/
├── README.md                      # File này
├── ROADMAP.md                     # ⭐ 5 phase + Tech Stack & Architecture (đọc trước)
├── .specify/
│   └── memory/
│       └── constitution.md        # Nguyên tắc nền tảng của dự án
└── specs/
    ├── 001-mvp-core/
    │   ├── spec.md                # Đặc tả MVP (cái GÌ + TẠI SAO)
    │   └── plan.md                # Kế hoạch kỹ thuật + data model (cái NHƯ THẾ NÀO)
    ├── 002-inventory/spec.md
    ├── 003-reports-analytics/spec.md
    ├── 004-hr-workforce/spec.md
    └── 005-automation-integrations/spec.md
```

`spec.md` chỉ mô tả **cái gì / tại sao** (tech-agnostic, theo đúng triết lý spec-kit). Toàn bộ **công nghệ** nằm ở `ROADMAP.md` (mục Tech Stack) và `001-mvp-core/plan.md`.

---

## 2. Cách dùng với spec-kit

### Bước 0 — Cài đặt & khởi tạo (1 lần)

```bash
# Cài Specify CLI (yêu cầu uv + Python 3.11+)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z

# Khởi tạo project (chọn integration là claude / copilot / ... tùy agent bạn dùng)
specify init enshido --integration claude
cd enshido
```

### Bước 1 — Nạp các file đã soạn sẵn

Copy `.specify/memory/constitution.md` và toàn bộ `specs/` từ bộ này vào project vừa `specify init`. Spec-kit sẽ tự nhận diện.

### Bước 2 — Chạy theo từng phase

Với **mỗi phase** (bắt đầu từ `001-mvp-core`), làm tuần tự:

```bash
/speckit.clarify     # (khuyến nghị) làm rõ điểm còn mơ hồ trước khi lập plan
/speckit.plan        # 001 đã có plan.md sẵn → dùng để refine; phase sau thì sinh mới
/speckit.tasks       # sinh tasks.md (chia task theo user story, có marker [P] chạy song song)
/speckit.analyze     # kiểm tra nhất quán spec ↔ plan ↔ tasks
/speckit.implement   # thực thi
```

> **Hai cách tận dụng `spec.md` có sẵn:**
> 1. Dùng trực tiếp `spec.md` trong bộ này rồi chạy thẳng `/speckit.plan`.
> 2. Hoặc lấy phần mô tả user story làm prompt cho `/speckit.specify` để spec-kit tự sinh lại theo template mới nhất.

---

## 3. Tóm tắt 5 phase

| # | Phase | Mục tiêu | Ưu tiên |
|---|-------|----------|---------|
| **001** | **MVP Core** | Luồng xương sống: Đơn hàng → Phiếu QR → Công đoạn → Trọng lượng/Hao hụt → QC → Dashboard cơ bản | 🔴 Bắt buộc trước |
| 002 | Inventory | Tồn kho vật tư/đá/phụ kiện + nhập–xuất theo đơn + kho thành phẩm | 🟠 |
| 003 | Reports & Analytics | Báo cáo nâng cao (năng suất, QC, hao hụt, tồn kho) + xuất Excel/PDF + dashboard đầy đủ | 🟡 |
| 004 | HR & Workforce | Nhân sự, chấm công, ca làm việc, lương thưởng, phân quyền nâng cao | 🟢 |
| 005 | Automation & Integrations | Cảnh báo trễ đơn, gợi ý phân công, KPI/lương theo sản lượng, giá vốn, tích hợp sàn/kế toán | 🔵 |

Chi tiết từng phase, thứ tự và phụ thuộc: xem **`ROADMAP.md`**.

---

## 4. Nguồn

- `requirement/Phần Mềm Quản Lý Đơn Hàng Sản Xuất Xưởng Kim Hoàn.docx` — tài liệu mô tả gốc.
- `requirement/*.jpg` — 8 mockup: Dashboard, Đơn hàng, Chi tiết đơn, Kanban, Phiếu sản xuất (QR), QC, Tồn kho, Nhân sự.
