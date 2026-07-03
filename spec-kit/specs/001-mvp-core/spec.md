# Feature Specification: MVP Core — Đơn hàng → Sản xuất → Trọng lượng → QC

**Feature Branch**: `001-mvp-core`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Tài liệu mô tả phần mềm + mockup (Dashboard, Đơn hàng, Chi tiết đơn, Kanban, Phiếu QR, QC). Phạm vi "Giai đoạn 1: MVP lõi".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đăng nhập & phân quyền cơ bản (Priority: P1)

Nhân viên đăng nhập và chỉ thấy chức năng theo vai trò của mình (Admin/Chủ xưởng, Quản lý sản xuất, Thợ, QC, Kho, Kế toán).

**Why this priority**: Nền tảng bảo mật cho mọi màn hình; không có thì không thể phân tách trách nhiệm và audit.

**Independent Test**: Tạo tài khoản 6 vai trò, đăng nhập từng vai trò và xác nhận menu/endpoint bị giới hạn đúng.

**Acceptance Scenarios**:

1. **Given** tài khoản hợp lệ vai trò "Thợ", **When** đăng nhập, **Then** chỉ thấy màn hình việc của tôi / quét QR, không thấy báo cáo hay phân quyền.
2. **Given** người dùng chưa đăng nhập, **When** mở một URL nội bộ, **Then** bị chuyển về màn hình đăng nhập.
3. **Given** Admin, **When** khóa một tài khoản, **Then** tài khoản đó không đăng nhập được nhưng dữ liệu lịch sử vẫn còn.

---

### User Story 2 - Quản lý khách hàng (Priority: P1)

Quản lý sản xuất tạo và tra cứu khách hàng, xem lịch sử đơn của khách.

**Why this priority**: Mỗi đơn phải gắn với một khách; cần trước khi tạo đơn.

**Independent Test**: Tạo khách mới (sinh mã `KH-######`), mở chi tiết, xem danh sách đơn của khách (rỗng ban đầu).

**Acceptance Scenarios**:

1. **Given** form khách hàng, **When** lưu với tên + SĐT + kênh bán + nhóm khách, **Then** hệ thống sinh mã `KH-######` và hiển thị trong danh sách.
2. **Given** một khách đã có đơn, **When** mở chi tiết khách, **Then** thấy lịch sử đơn và tổng số đơn.

---

### User Story 3 - Tạo & quản lý đơn hàng (Priority: P1)

Quản lý tạo đơn gồm 1+ sản phẩm, chọn kênh bán, loại đơn, deadline, mức ưu tiên; hệ thống sinh mã đơn.

**Why this priority**: Đây là module trung tâm; mọi luồng sản xuất bắt đầu từ đơn.

**Independent Test**: Tạo đơn có 2 sản phẩm, kiểm tra sinh mã `SX-YYYYMMDD-####`, trạng thái khởi tạo, hiển thị ở danh sách và lọc được theo trạng thái/kênh/ngày.

**Acceptance Scenarios**:

1. **Given** đã chọn khách + nhập sản phẩm (loại, chất liệu, đá, size, số lượng, ảnh mẫu, yêu cầu kỹ thuật), **When** lưu đơn, **Then** sinh mã `SX-YYYYMMDD-####` và đơn ở trạng thái "Chờ sản xuất".
2. **Given** danh sách đơn, **When** lọc theo trạng thái/kênh bán/khoảng ngày hoặc tìm theo mã/khách/sản phẩm, **Then** kết quả đúng và phân trang.
3. **Given** đơn chưa vào sản xuất, **When** sửa hoặc hủy đơn, **Then** trạng thái cập nhật và ghi nhật ký người thao tác.

---

### User Story 4 - Cấu hình quy trình & công đoạn cho đơn (Priority: P1)

Quản lý chọn các công đoạn áp dụng cho đơn (Thiết kế 3D, In sáp, Đúc, Làm nguội, Gắn đá, Xi mạ, Đánh bóng, QC, Nhập kho TP), gán thứ tự và người phụ trách.

**Why this priority**: Không phải đơn nào cũng qua mọi công đoạn; quy trình quyết định Kanban và luồng cập nhật của thợ.

**Independent Test**: Tạo đơn, bỏ chọn "Thiết kế 3D", xác nhận đơn chỉ chạy qua các công đoạn đã chọn theo đúng thứ tự.

**Acceptance Scenarios**:

1. **Given** đơn mới, **When** chọn tập công đoạn áp dụng và gán thợ, **Then** hệ thống tạo chuỗi công đoạn theo thứ tự với trạng thái "Chưa bắt đầu".
2. **Given** đơn đang sản xuất, **When** hoàn thành một công đoạn, **Then** công đoạn kế tiếp được mở để tiếp nhận.

---

### User Story 5 - Phiếu sản xuất + mã QR (Priority: P1)

Sau khi tạo đơn, in được phiếu sản xuất kèm mã QR (mã `PSX-YYYYMMDD-####`) để đi cùng khay sản phẩm.

**Why this priority**: Là cầu nối vật lý giữa sản phẩm và hệ thống; thợ quét QR để cập nhật.

**Independent Test**: Mở đơn, bấm in phiếu, kiểm tra phiếu hiển thị đủ thông tin đơn/sản phẩm/công đoạn/bảng trọng lượng và QR quét ra đúng đơn.

**Acceptance Scenarios**:

1. **Given** đơn đã tạo, **When** bấm "In phiếu sản xuất", **Then** phiếu có logo, mã đơn, deadline, ưu tiên, sản phẩm, danh sách công đoạn, bảng theo dõi trọng lượng & QR token.
2. **Given** phiếu đã in, **When** quét QR khi chưa đăng nhập, **Then** hệ thống yêu cầu đăng nhập rồi mở đúng đơn.
3. **Given** đơn bị hủy, **When** quét QR cũ, **Then** QR bị vô hiệu hóa.

---

### User Story 6 - Thợ quét QR & cập nhật công đoạn (mobile) (Priority: P1)

Thợ dùng điện thoại quét QR để tiếp nhận việc, bắt đầu, hoàn thành công đoạn, nhập trọng lượng, báo lỗi, upload ảnh.

**Why this priority**: Đây là điểm nhập liệu chính của sản xuất; quyết định tính realtime của toàn hệ thống.

**Independent Test**: Trên màn hình mobile, quét QR → tiếp nhận → bắt đầu → nhập số lượng + trọng lượng sau công đoạn → hoàn thành, và xác nhận trạng thái đổi + thời gian được ghi.

**Acceptance Scenarios**:

1. **Given** thợ được gán công đoạn hiện tại, **When** quét QR và bấm "Tiếp nhận" rồi "Bắt đầu", **Then** công đoạn chuyển "Đang xử lý" và ghi thời gian + người nhận.
2. **Given** đang xử lý, **When** bấm "Hoàn thành" và nhập số lượng hoàn thành + trọng lượng sau công đoạn, **Then** hệ thống lưu và chuyển công đoạn kế tiếp.
3. **Given** gặp sự cố, **When** bấm "Báo lỗi / cần hỗ trợ" kèm ghi chú/ảnh, **Then** công đoạn chuyển "Báo lỗi" và quản lý nhận được cảnh báo.

---

### User Story 7 - Theo dõi trọng lượng & hao hụt (Priority: P1)

Hệ thống lưu trọng lượng qua từng công đoạn, tự tính hao hụt gram/%, hao hụt lũy kế và cảnh báo khi vượt định mức.

**Why this priority**: Kiểm soát thất thoát kim loại quý — mục tiêu sống còn của xưởng.

**Independent Test**: Nhập chuỗi trọng lượng giảm dần qua các công đoạn, kiểm tra giá trị hao hụt từng bước và lũy kế khớp công thức; vượt định mức thì hiện cảnh báo.

**Acceptance Scenarios**:

1. **Given** trọng lượng trước = 12.50g và sau = 12.20g, **When** lưu, **Then** hao hụt = 0.30g và tỷ lệ = 2.40%.
2. **Given** hao hụt lũy kế vượt định mức cho phép (vd > 3%), **When** lưu công đoạn, **Then** hệ thống cảnh báo nêu công đoạn + người thực hiện + chênh lệch.
3. **Given** một bản ghi cân, **When** xem lại, **Then** thấy người cân và thời gian cân (không cho sửa lịch sử, chỉ tạo điều chỉnh có lý do).

---

### User Story 8 - QC: PASS / FAIL / CẦN SỬA & trả lỗi (Priority: P1)

QC kiểm tra sản phẩm, chọn kết quả; nếu lỗi thì chọn loại lỗi, mức độ, công đoạn trả về và người xử lý lại.

**Why this priority**: Cổng chất lượng trước khi hoàn thành; định tuyến trả lỗi ảnh hưởng trực tiếp tiến độ.

**Independent Test**: Đưa một đơn tới QC, chọn FAIL với loại lỗi + công đoạn trả về, xác nhận đơn quay lại đúng công đoạn ở trạng thái "Cần sửa".

**Acceptance Scenarios**:

1. **Given** đơn ở "Chờ QC", **When** QC chọn PASS, **Then** đơn chuyển "Hoàn thành sản xuất".
2. **Given** QC chọn FAIL/CẦN SỬA, **When** chọn loại lỗi + mức độ + công đoạn trả về + người xử lý + deadline + ảnh lỗi, **Then** đơn về trạng thái "Cần sửa" tại đúng công đoạn và tạo việc sửa.
3. **Given** đơn đã sửa xong, **When** quay lại QC, **Then** lịch sử QC ghi đủ các lần kiểm.

---

### User Story 9 - Kanban sản xuất (Priority: P2)

Quản lý theo dõi trực quan các đơn theo cột công đoạn, kéo–thả, lọc và mở chi tiết.

**Why this priority**: Tăng khả năng giám sát nhưng luồng sản xuất vẫn chạy được qua màn hình đơn + thợ nếu chưa có Kanban.

**Independent Test**: Mở Kanban, kéo một thẻ sang cột kế, xác nhận trạng thái công đoạn cập nhật; lọc theo thợ/deadline.

**Acceptance Scenarios**:

1. **Given** bảng Kanban theo công đoạn, **When** kéo thẻ đơn sang cột kế tiếp, **Then** công đoạn cập nhật và ghi nhật ký.
2. **Given** nhiều đơn, **When** lọc theo công đoạn/thợ/deadline/trạng thái hoặc tìm mã đơn, **Then** chỉ hiển thị thẻ khớp.
3. **Given** đơn trễ hạn hoặc hao hụt vượt mức, **When** xem thẻ, **Then** thẻ có cảnh báo tương ứng.

---

### User Story 10 - Dashboard cơ bản (Priority: P2)

Chủ xưởng xem nhanh chỉ số vận hành: tổng đơn, đang sản xuất, trễ hạn, hoàn thành hôm nay, QC không đạt, tỷ lệ QC đạt.

**Why this priority**: Giá trị quản trị cao nhưng không chặn luồng sản xuất.

**Independent Test**: Tạo dữ liệu mẫu rồi mở dashboard, đối chiếu các con số với dữ liệu thực.

**Acceptance Scenarios**:

1. **Given** có đơn ở nhiều trạng thái, **When** mở dashboard, **Then** các thẻ chỉ số và biểu đồ cốt lõi (tiến độ theo công đoạn, tỷ lệ QC) hiển thị đúng.
2. **Given** có công đoạn nhiều đơn ùn, **When** xem dashboard, **Then** mục "Công đoạn đang tắc" liệt kê đúng.

---

### User Story 11 - Nhật ký thao tác (Priority: P2)

Hệ thống ghi nhật ký mọi thay đổi trạng thái và dữ liệu nhạy cảm, không cho xóa/sửa.

**Why this priority**: Yêu cầu bảo mật & truy vết; có thể bổ sung ngay sau khi luồng chính chạy.

**Independent Test**: Thực hiện vài thao tác (đổi trạng thái, nhập trọng lượng, QC), mở nhật ký và xác nhận đủ bản ghi với người + thời gian.

**Acceptance Scenarios**:

1. **Given** một đơn đổi trạng thái, **When** xem nhật ký, **Then** thấy ai đổi, từ trạng thái nào sang trạng thái nào, lúc nào.
2. **Given** bản ghi nhật ký, **When** thử sửa/xóa, **Then** hệ thống không cho phép.

### Edge Cases

- Nhập trọng lượng sau **lớn hơn** trọng lượng trước (hao hụt âm) → cảnh báo nhập sai, yêu cầu xác nhận.
- Hai thợ cùng quét một QR / cập nhật một công đoạn đồng thời → chống ghi đè, giữ bản ghi nhất quán.
- Đơn nhiều sản phẩm với công đoạn khác nhau → theo dõi trọng lượng/QC theo từng `order_item`.
- Mất mạng khi thợ đang thao tác trên PWA → cho thử lại, không tạo bản ghi trùng.
- QC trả về công đoạn rồi lại FAIL nhiều lần → đếm số lần làm lại.
- In lại phiếu nhiều lần → QR token không đổi cho cùng đơn (trừ khi chủ động vô hiệu hóa).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép đăng nhập và phân quyền theo 6 vai trò; kiểm soát quyền ở phía server.
- **FR-002**: Hệ thống MUST cho phép khóa tài khoản (không xóa cứng) và giữ nguyên dữ liệu lịch sử.
- **FR-003**: Hệ thống MUST quản lý khách hàng (CRUD) và sinh mã `KH-######`; hiển thị lịch sử đơn theo khách.
- **FR-004**: Hệ thống MUST cho tạo đơn với 1+ sản phẩm, sinh mã `SX-YYYYMMDD-####`, lưu kênh bán/loại đơn/deadline/ưu tiên/ghi chú/đính kèm.
- **FR-005**: Hệ thống MUST quản lý vòng đời trạng thái đơn (Nháp → Chờ xác nhận → Chờ sản xuất → Đang sản xuất → Chờ QC → QC không đạt → Cần sửa → Hoàn thành sản xuất → Đã nhập kho TP → Đã bàn giao → Hoàn tất → Đã hủy).
- **FR-006**: Hệ thống MUST cho chọn tập công đoạn áp dụng cho từng đơn và gán thứ tự + người phụ trách.
- **FR-007**: Hệ thống MUST in phiếu sản xuất (mã `PSX-YYYYMMDD-####`) gồm thông tin đơn/sản phẩm/công đoạn/bảng trọng lượng và mã QR.
- **FR-008**: QR MUST dùng token, không nhúng dữ liệu nhạy cảm; chưa đăng nhập thì yêu cầu đăng nhập; phải vô hiệu hóa được khi hủy đơn; ghi nhận ai quét.
- **FR-009**: Hệ thống MUST cung cấp màn hình thợ (mobile-first) để tiếp nhận / bắt đầu / hoàn thành công đoạn, nhập số lượng & trọng lượng, báo lỗi, upload ảnh.
- **FR-010**: Hệ thống MUST lưu trọng lượng theo từng công đoạn và tự tính hao hụt gram, tỷ lệ %, hao hụt lũy kế theo công thức chuẩn.
- **FR-011**: Hệ thống MUST cảnh báo khi hao hụt vượt định mức cho phép, nêu công đoạn + người thực hiện + chênh lệch.
- **FR-012**: Hệ thống MUST cho QC chọn PASS/FAIL/CẦN SỬA; khi lỗi phải nhập loại lỗi, mức độ, công đoạn trả về, người xử lý lại, deadline, ảnh lỗi.
- **FR-013**: Khi QC trả lỗi, hệ thống MUST đưa đơn về đúng công đoạn ở trạng thái "Cần sửa" và tạo việc sửa; lưu lịch sử QC nhiều lần.
- **FR-014**: Hệ thống MUST cung cấp Kanban sản xuất (kéo–thả, lọc theo công đoạn/thợ/deadline/trạng thái, tìm kiếm, cảnh báo trễ/hao hụt trên thẻ).
- **FR-015**: Hệ thống MUST hiển thị dashboard cơ bản với các chỉ số và biểu đồ cốt lõi.
- **FR-016**: Hệ thống MUST ghi `activity_logs` append-only cho mọi đổi trạng thái đơn, người nhập trọng lượng, người QC, người sửa dữ liệu; không cho xóa/sửa.
- **FR-017**: Hệ thống MUST hỗ trợ upload và lưu ảnh sản phẩm / ảnh lỗi QC / file thiết kế gắn với đơn hoặc bản ghi tương ứng.

### Key Entities

- **User**: nhân viên đăng nhập; có vai trò, trạng thái (đang làm/khóa).
- **Role**: vai trò + tập quyền.
- **Customer**: khách hàng (mã, tên, SĐT, kênh bán, nhóm khách, lịch sử đơn).
- **Order**: đơn sản xuất (mã, khách, kênh, loại, trạng thái, ưu tiên, deadline, QR token, người tạo).
- **OrderItem**: sản phẩm trong đơn (loại, chất liệu, đá, size, số lượng, ảnh mẫu, yêu cầu kỹ thuật).
- **ProductionStep**: công đoạn của đơn/sản phẩm (tên, thứ tự, người phụ trách, trạng thái, thời gian, số lượng vào/ra/lỗi, trọng lượng vào/ra, hao hụt).
- **QCRecord**: bản ghi QC (kết quả, loại lỗi, mức độ, công đoạn trả về, người xử lý, deadline, ảnh).
- **WeightLog**: lịch sử cân theo công đoạn (TL trước/sau, hao hụt, lũy kế, định mức, người cân, thời gian).
- **ActivityLog**: nhật ký thao tác append-only (người, hành động, đối tượng, giá trị cũ/mới).
- **Attachment**: file/ảnh đính kèm (đối tượng, loại, người upload).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Thợ hoàn tất một thao tác cập nhật công đoạn (từ lúc mở màn hình tới khi lưu) trong **≤ 5 giây**.
- **SC-002**: 100% bản ghi đổi trạng thái đơn, nhập trọng lượng và QC đều có vết nhật ký truy được người + thời gian.
- **SC-003**: Hao hụt gram/% và lũy kế tính đúng 100% so với công thức trên tập dữ liệu kiểm thử.
- **SC-004**: Quét QR mở đúng đơn & đúng công đoạn hiện tại trong **≤ 3 giây** (mạng xưởng bình thường).
- **SC-005**: Quản lý tạo một đơn 1 sản phẩm và in được phiếu QR trong **≤ 2 phút**.
- **SC-006**: Đơn QC FAIL quay về đúng công đoạn được chọn trong 100% trường hợp kiểm thử.
- **SC-007**: Danh sách đơn ~300 bản ghi tải trang đầu (phân trang) trong **≤ 1 giây** ở điều kiện bình thường.

## Assumptions

- Dùng chung **stack chuẩn** trong `ROADMAP.md` (Next.js + NestJS + PostgreSQL + Redis + S3/MinIO).
- Tồn kho, báo cáo nâng cao, nhân sự đầy đủ, tự động hóa thuộc các phase **002–005**, ngoài phạm vi MVP.
- Mỗi đơn gắn đúng một khách; danh mục công đoạn mặc định theo tài liệu nhưng cho phép tùy biến theo đơn.
- Cân điện tử nhập trọng lượng **thủ công** ở MVP (chưa tích hợp cân tự động).
- Công nợ/giá trị đơn (kế toán) chưa bắt buộc ở MVP.
