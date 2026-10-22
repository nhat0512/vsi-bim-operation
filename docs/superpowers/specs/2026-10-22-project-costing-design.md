# Báo Giá & Tính Toán Chi Phí Dự Án (Project Costing) Spec & Design

## 1. Intent & Context
Xây dựng module **Báo Giá & Tính Toán Chi Phí** (Project Costing) độc lập cho hệ thống Web Quản lý dự án & nguồn lực hạ tầng BIM. Module này phục vụ mục đích tính toán, dự toán chi phí nội bộ theo khối lượng Km, định mức giờ kỹ sư và đơn giá cấp bậc kỹ sư, đồng thời liên kết trực tiếp với từng dự án cụ thể.

## 2. Goals & Non-Goals
### Goals
- **Bảng Đơn giá tham chiếu (Rate Table - CRUD)**:
  - Khởi tạo mặc định:
    - Modeler 1 (Senior): 150,000 VND/giờ
    - Modeler 2 (Mid): 120,000 VND/giờ
    - Modeler 3 (Junior): 100,000 VND/giờ
  - Mở rộng liên kết cấp bậc từ "Nguồn lực" (BIM Coordinator: 250,000 VND/h, BIM Manager: 350,000 VND/h...).
  - Cho phép thêm mới, chỉnh sửa đơn giá, xóa cấp bậc linh hoạt.
- **Danh mục Hạng mục linh hoạt**:
  - Mặc định: `ATGT`, `Đường`, `Cầu`, `Hầm`, `Thoát nước`, `Chiếu sáng`, `Cảnh quan`, `Nút giao`, `Khác`.
  - Cho phép người dùng thêm/xóa hạng mục theo ý muốn ngay trên giao diện.
- **Bảng Tính Chi Phí (Spreadsheet-like Grid)**:
  - Từng dự án trong hệ thống đều có bảng tính chi phí riêng biệt (`projectId`).
  - Giao diện nhập liệu trơn tru dạng bảng tính Excel.
  - Các cột:
    1. `#` (STT)
    2. `Hạng mục` (Dropdown từ danh sách hạng mục linh hoạt)
    3. `Nhân sự / Cấp bậc` (Dropdown từ Bảng đơn giá tham chiếu)
    4. `Số Km` (Number/Float)
    5. `Số giờ thực tế theo Km` (Number/Float)
    6. `Chi phí` (Auto-calculated realtime = `Số giờ thực tế theo Km` * `Đơn giá` của Nhân sự)
    7. `Chi phí (-10% thuế)` (Auto-calculated realtime = `Chi phí` * 0.9)
    8. `Thao tác` (Xóa dòng)
  - Hàng tổng cộng (Footer) tính tổng Chi phí, tổng Chi phí sau thuế, tổng số giờ, số Km.
  - Các nút: `+ Thêm dòng`, `🗑️ Xóa dòng`, `📥 Xuất Excel (CSV UTF-8)`, `Quản lý Hạng mục`.
- **Liên kết Dự án (Per-project Linkage)**:
  - Selector chọn dự án ở đầu trang: Chuyển đổi qua lại giữa các dự án (P001, P006, P007...) lưu độc lập.
  - Hỗ trợ URL hash `#project-costing` và `#project-costing/:projectId`.
  - Nút/Tab chuyển hướng nhanh từ `ProjectDetail.js` sang trang Chi phí của dự án đó.
- **Độc lập và An toàn**:
  - Toàn bộ dữ liệu costing lưu trong `localStorage` với key riêng `bimTransPM_CostingData`.
  - Không sửa đổi hay làm xung đột state Firestore / WBS / Timesheet của ứng dụng.

### Non-Goals
- Không ghi đè hay thay đổi cách tính EVM/AC hiện tại trong `ProjectDetail.js`.
- Không cài đặt thư viện grid nặng của bên thứ ba (sử dụng native CSS Grid / HTML Table thuần).

## 3. Data Schema (`localStorage: bimTransPM_CostingData`)
```javascript
{
  "categories": [
    "ATGT", "Đường", "Cầu", "Hầm", "Thoát nước", 
    "Chiếu sáng", "Cảnh quan", "Nút giao", "Khác"
  ],
  "rates": [
    { "id": "R001", "name": "Modeler 1 (Senior)", "role": "BIM Modeler", "level": "senior", "rate": 150000 },
    { "id": "R002", "name": "Modeler 2 (Mid)", "role": "BIM Modeler", "level": "mid", "rate": 120000 },
    { "id": "R003", "name": "Modeler 3 (Junior)", "role": "BIM Modeler", "level": "junior", "rate": 100000 },
    { "id": "R004", "name": "BIM Coordinator", "role": "BIM Coordinator", "level": "senior", "rate": 250000 },
    { "id": "R005", "name": "BIM Manager", "role": "BIM Manager", "level": "senior", "rate": 350000 }
  ],
  "projects": {
    "P007": {
      "entries": [
        {
          "id": "ce_1",
          "category": "ATGT",
          "rateId": "R001",
          "km": 5.2,
          "hoursPerKm": 13
        }
      ]
    }
  }
}
```

## 4. UI Architecture & Components
1. `src/pages/ProjectCosting.js`: Toàn bộ logic giao diện bảng tính, CRUD đơn giá, CRUD hạng mục, chuyển đổi dự án, xuất CSV.
2. `src/styles/costing.css`: Styling dạng spreadsheet hiện đại, tối ưu giao diện bảng, responsive, hiệu ứng hover, badge trạng thái.
3. `src/router.js`: Thêm route `'project-costing': () => import('./pages/ProjectCosting.js')`.
4. `src/components/Sidebar.js`: Thêm menu item `{ id: 'project-costing', label: 'Báo giá Chi phí', icon: '💰', adminOnly: true }`.
5. `src/pages/ProjectDetail.js`: Bổ sung nút liên kết nhanh `💰 Báo giá Chi phí` mở trực tiếp `#project-costing/${project.id}`.
