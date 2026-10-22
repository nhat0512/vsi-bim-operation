# Project Costing (Báo Giá & Tính Toán Chi Phí) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng module Báo giá & Tính toán Chi phí dự án (Project Costing) dạng bảng tính (spreadsheet-like), tự động tính chi phí theo đơn giá nhân sự/cấp bậc từ Nguồn lực, quản lý danh mục hạng mục linh hoạt, và gắn liền với từng dự án cụ thể.

**Architecture:** Tạo module trang `ProjectCosting.js` độc lập kết hợp `costing.css` để render bảng tính inline-editable và modal quản lý đơn giá/hạng mục; dữ liệu được quản lý và lưu trữ hoàn toàn tách biệt trong `localStorage` (`bimTransPM_CostingData`); tích hợp định tuyến trong `router.js`, menu điều hướng trong `Sidebar.js` và nút truy cập nhanh trong `ProjectDetail.js`.

**Tech Stack:** Vanilla JavaScript (ES6 Modules), CSS3 (Spreadsheet grid, Glassmorphism, animations), HTML5, LocalStorage API, Blob CSV Export.

**Spec:** `docs/superpowers/specs/2026-10-22-project-costing-design.md`

## Global Constraints
- **Không can thiệp hay sửa đổi logic cốt lõi** của `state.js`, Firestore sync, hay cách tính EVM/chấm công trong `MyTasks.js`.
- **Dữ liệu costing lưu trữ riêng** trong `localStorage` với key `bimTransPM_CostingData`.
- **Không cài đặt thư viện bên thứ ba**; sử dụng HTML table / CSS grid thuần.
- **Hỗ trợ định dạng số tiền VNĐ** có dấu phẩy phân cách hàng nghìn rõ ràng (`1,950,000 ₫`).
- **Tương thích hoàn toàn** với danh sách dự án hiện có (`state.projects`) và nguồn lực (`state.personnel`).

## Review Focus
- Trường hợp dự án mới chưa có bản ghi chi phí nào: Khởi tạo bảng tính rỗng với giao diện thân thiện, nút bấm thêm dòng rõ ràng.
- Giá trị nhập vào số Km hoặc Số giờ rỗng / không hợp lệ (NaN, âm): Xử lý fallback về 0 an toàn mà không làm sập tính toán tổng.
- Người dùng xóa cấp bậc nhân sự đang được dòng chi phí sử dụng: Giữ nguyên hiển thị mã/tên cũ hoặc fallback thông báo nhẹ nhàng, không lỗi runtime.
- Xuất file CSV tiếng Việt có dấu: Phải thêm tiền tố BOM (`\uFEFF`) để Microsoft Excel hiển thị đúng font tiếng Việt.
- Chuyển đổi giữa các dự án: Tự động lưu bảng tính của dự án hiện tại trước khi tải dữ liệu của dự án mới.

---

### Task 1: Tạo Schema Helper & Costing Storage Manager

**Files:**
- Create: `src/utils/costingStorage.js`

**Interfaces:**
- Produces:
  - `loadCostingData(): CostingData`
  - `saveCostingData(data: CostingData): void`
  - `getProjectCosting(projectId: string): ProjectCostingData`
  - `saveProjectCosting(projectId: string, entries: Array): void`
  - `calculateRowCost(entry: Object, rates: Array): { cost: number, costAfterTax: number }`

- [ ] **Step 1: Định nghĩa cấu trúc mặc định và hàm đọc/ghi `costingStorage.js`**
  Khởi tạo schema mặc định bao gồm:
  - `categories`: `['ATGT', 'Đường', 'Cầu', 'Hầm', 'Thoát nước', 'Chiếu sáng', 'Cảnh quan', 'Nút giao', 'Khác']`
  - `rates`:
    - `R001`: Modeler 1 (Senior) - 150,000 VND
    - `R002`: Modeler 2 (Mid) - 120,000 VND
    - `R003`: Modeler 3 (Junior) - 100,000 VND
    - `R004`: BIM Coordinator (Senior) - 250,000 VND
    - `R005`: BIM Manager (Senior) - 350,000 VND
  - `projects`: Lưu trữ theo `{ [projectId]: { entries: [...] } }`

- [ ] **Step 2: Viết logic tính toán chi phí realtime**
  - Công thức: `cost = Math.round(hoursPerKm * rate)`
  - Thuế 10%: `costAfterTax = Math.round(cost * 0.9)`
  - Hàm format tiền tệ: `formatVND(num)` có dấu phân cách hàng nghìn.

---

### Task 2: Tạo Bộ Phong Cách CSS Cho Bảng Tính (Spreadsheet Style)

**Files:**
- Create: `src/styles/costing.css`

**Interfaces:**
- Produces: CSS classes cho bảng tính (`.costing-grid`, `.costing-cell-editable`, `.costing-summary-card`, `.costing-badge`, `.category-tag`, `.costing-header-actions`).

- [ ] **Step 1: Viết CSS cho layout tổng thể, KPI summary cards & bảng tính**
  - Card tổng hợp: Tổng chi phí, Chi phí sau thuế, Tổng giờ làm, Số Km.
  - Table: Header cố định nhẹ, dòng xen kẽ (zebra), hover highlight, cell padding chuẩn nghiệp vụ dự toán.
  - Input & Select controls: Hiển thị tối giản, không viền cồng kềnh, focus hiển thị rõ ràng như Excel/Sheets.
  - Modal quản lý Hạng mục & Đơn giá: Gọn gàng, hiện đại.

---

### Task 3: Xây Dựng Trang `src/pages/ProjectCosting.js`

**Files:**
- Create: `src/pages/ProjectCosting.js`

**Interfaces:**
- Consumes:
  - `getState()` từ `src/state.js`
  - `costingStorage.js`
- Produces:
  - `render(): string`
  - `init(): void`
  - `destroy(): void`

- [ ] **Step 1: Xây dựng template HTML render**
  - Thanh tiêu đề trang: Tiêu đề `💰 Báo Giá & Tính Toán Chi Phí Dự Án` + Dropdown chọn Dự án (`#costing-project-select`).
  - Hàng nút hành động: `+ Thêm dòng`, `📋 Quản lý Đơn giá`, `🏷️ Quản lý Hạng mục`, `📥 Xuất Excel (CSV)`, `🗑️ Xóa dòng chọn`.
  - Bộ thẻ KPI tổng hợp (Tổng giá trị dự toán, Sau thuế 10%, Tổng giờ, Chi phí trung bình / Km).
  - Bảng tính chi phí Data Grid với các cột `#`, `Hạng mục`, `Nhân sự / Cấp bậc`, `Số Km`, `Giờ / Km`, `Chi phí (VNĐ)`, `Chi phí (-10%)`, `Thao tác`.
  - Hàng tổng (Footer row) tự động cộng dồn toàn bộ cột chi phí và giờ.

- [ ] **Step 2: Xử lý tương tác sự kiện (Event Handlers) trong `init()`**
  - Chọn dự án: Cập nhật state nội bộ và render lại bảng tính tương ứng với dự án được chọn.
  - Thêm dòng mới: Thêm 1 row rỗng vào mảng `entries` của dự án và tự động focus.
  - Sửa trực tiếp (Inline Change): Thay đổi Hạng mục, Nhân sự, Số Km, Số Giờ -> Tự động tính lại Chi phí và cập nhật ngay vào `localStorage`.
  - Xóa dòng: Xác nhận xóa nhanh và recalculate tổng.
  - Modal Quản lý Đơn giá (Rate Table CRUD): Xem danh sách, thêm cấp bậc mới, sửa giá, xóa.
  - Modal Quản lý Hạng mục (Categories CRUD): Thêm mới hạng mục tùy biến, xóa hạng mục không dùng.
  - Xuất file CSV: UTF-8 với tiền tố BOM `\uFEFF`, tên file dạng `Bao_gia_chi_phi_[ProjectCode]_[Date].csv`.

---

### Task 4: Tích Hợp Định Tuyến, Sidebar & Chuyển Hướng Dự Án

**Files:**
- Modify: `src/router.js`
- Modify: `src/components/Sidebar.js`
- Modify: `src/pages/ProjectDetail.js`

**Interfaces:**
- Consumes: `ProjectCosting.js`

- [ ] **Step 1: Đăng ký route trong `src/router.js`**
  - Thêm route `'project-costing': () => import('./pages/ProjectCosting.js')`.
  - Đảm bảo admin/quản lý có quyền truy cập.

- [ ] **Step 2: Thêm nav item trong `src/components/Sidebar.js`**
  - Thêm mục `Báo giá Chi phí` (`icon: '💰'`, `id: 'project-costing'`) dưới nhóm `Quản lý dự án`.

- [ ] **Step 3: Thêm nút liên kết nhanh trong `src/pages/ProjectDetail.js`**
  - Thêm nút `💰 Báo giá Chi phí` tại phần header/actions của trang Chi tiết dự án, dẫn thẳng tới `#project-costing/${project.id}`.

---

### Task 5: Kiểm Thử Toàn Diện & Nghiệm Thu (Verification)

**Files:**
- Test thủ công toàn bộ luồng trực tiếp trên trình duyệt.

- [ ] **Step 1: Kiểm thử chuyển đổi dự án**
  - Kiểm tra xem dữ liệu chi phí của Dự án A và Dự án B có hoàn toàn riêng biệt không.
- [ ] **Step 2: Kiểm thử logic tính toán và định dạng VNĐ**
  - Test trường hợp: 13 giờ * 150,000 = 1,950,000 VNĐ; Sau thuế = 1,755,000 VNĐ.
- [ ] **Step 3: Kiểm thử thêm/xóa hạng mục và CRUD đơn giá**
  - Thêm hạng mục mới, chọn trong dropdown bảng tính; đổi đơn giá Modeler 1 và kiểm tra tính toán cập nhật realtime.
- [ ] **Step 4: Kiểm thử xuất CSV**
  - Tải file CSV và kiểm tra bảng mã tiếng Việt hiển thị chính xác.
