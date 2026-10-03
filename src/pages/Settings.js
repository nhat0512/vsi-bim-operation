// ============================================
// SETTINGS — System Configuration
// ============================================

export function render() {
  return `
    <div class="animate-fade-in-up">
      <div class="section-header">
        <div>
          <h1 class="section-title">⚙️ Cài đặt hệ thống</h1>
          <div class="section-subtitle">Cấu hình nền tảng BIM TransPM</div>
        </div>
      </div>

      <div class="grid-2" style="grid-template-columns: 1fr 1fr;">
        <!-- General Settings -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🏢 Thông tin tổ chức</h3>
          </div>
          <div class="form-group">
            <label class="form-label">Tên công ty</label>
            <input class="form-input" type="text" value="BIM Vietnam Infrastructure JSC" />
          </div>
          <div class="form-group">
            <label class="form-label">Mã tổ chức</label>
            <input class="form-input" type="text" value="BIMVN-INFRA" />
          </div>
          <div class="form-group">
            <label class="form-label">Địa chỉ</label>
            <input class="form-input" type="text" value="Tòa nhà Landmark 81, Q. Bình Thạnh, TP.HCM" />
          </div>
          <div class="form-group">
            <label class="form-label">BIM Manager trưởng</label>
            <input class="form-input" type="text" value="Nguyễn Văn An" />
          </div>
        </div>

        <!-- BIM Standards -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📐 Tiêu chuẩn BIM</h3>
          </div>
          <div class="form-group">
            <label class="form-label">Hệ tọa độ</label>
            <select class="form-select">
              <option selected>VN-2000 / UTM Zone 48N</option>
              <option>VN-2000 / UTM Zone 49N</option>
              <option>WGS 84</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">BEP Template mặc định</label>
            <select class="form-select">
              <option selected>BEP Transport v2.0 (TCVN)</option>
              <option>BEP Bridge v1.5</option>
              <option>ISO 19650 Template</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">LOD mặc định cho dự án mới</label>
            <select class="form-select">
              <option>LOD 200</option>
              <option selected>LOD 300</option>
              <option>LOD 350</option>
              <option>LOD 400</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Định dạng trao đổi model</label>
            <select class="form-select">
              <option selected>IFC 4.0 (buildingSMART)</option>
              <option>IFC 2x3</option>
              <option>RVT (native)</option>
            </select>
          </div>
        </div>

        <!-- Notification Settings -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔔 Thông báo</h3>
          </div>
          <div class="form-group flex items-center justify-between">
            <span class="form-label" style="margin: 0;">Cảnh báo quá tải nguồn lực</span>
            <label style="position: relative; width: 44px; height: 24px; cursor: pointer;">
              <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; inset: 0; background: var(--accent-secondary); border-radius: 12px; transition: 0.3s;">
                <span style="position: absolute; left: 22px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s;"></span>
              </span>
            </label>
          </div>
          <div class="form-group flex items-center justify-between">
            <span class="form-label" style="margin: 0;">Cảnh báo clash mới</span>
            <label style="position: relative; width: 44px; height: 24px; cursor: pointer;">
              <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; inset: 0; background: var(--accent-secondary); border-radius: 12px; transition: 0.3s;">
                <span style="position: absolute; left: 22px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s;"></span>
              </span>
            </label>
          </div>
          <div class="form-group flex items-center justify-between">
            <span class="form-label" style="margin: 0;">Nhắc deadline task</span>
            <label style="position: relative; width: 44px; height: 24px; cursor: pointer;">
              <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; inset: 0; background: var(--accent-secondary); border-radius: 12px; transition: 0.3s;">
                <span style="position: absolute; left: 22px; top: 2px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: 0.3s;"></span>
              </span>
            </label>
          </div>
          <div class="form-group">
            <label class="form-label">Ngưỡng cảnh báo utilization (%)</label>
            <input class="form-input" type="number" value="100" min="50" max="150" />
          </div>
        </div>

        <!-- Integration -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔗 Tích hợp</h3>
          </div>
          <div class="form-group">
            <label class="form-label">Autodesk BIM 360 / ACC</label>
            <div class="flex gap-sm items-center">
              <input class="form-input" type="text" placeholder="Hub ID" style="flex: 1;" />
              <button class="btn btn-secondary btn-sm">Kết nối</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">CDE URL</label>
            <input class="form-input" type="url" placeholder="https://your-cde.example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Power BI Report URL</label>
            <input class="form-input" type="url" placeholder="https://app.powerbi.com/..." />
          </div>
          <div class="mt-lg">
            <button class="btn btn-primary">💾 Lưu cài đặt</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function init() {}
export function destroy() {}
