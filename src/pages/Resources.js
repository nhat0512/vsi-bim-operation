// ============================================
// RESOURCES — Personnel, Software, Hardware Management
// ============================================
import { getState, setState } from '../state.js';

export function render() {
  const { personnel, softwareAssets, hardwareAssets, projects } = getState();

  return `
    <div class="animate-fade-in-up">
      <div class="section-header">
        <div>
          <h1 class="section-title">👥 Quản lý nguồn lực</h1>
          <div class="section-subtitle">Nhân sự, phần mềm, thiết bị — phân bổ theo dự án</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline admin-only" id="btn-clean-mock" title="Xóa toàn bộ nhân sự chưa đăng ký tài khoản thật">🧹 Dọn dẹp Mock</button>
          <button class="btn btn-primary admin-only" id="btn-add-resource">+ Thêm nguồn lực</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="resource-tabs">
        <button class="tab active" data-tab="personnel">👤 Nhân sự (${personnel.length})</button>
        <button class="tab" data-tab="software">💻 Phần mềm (${softwareAssets.length})</button>
        <button class="tab" data-tab="hardware">🖥️ Thiết bị (${hardwareAssets.length})</button>
        <button class="tab" data-tab="allocation">📊 Ma trận phân bổ</button>
      </div>

      <div id="resource-tab-content">
        ${renderPersonnelTab(personnel)}
      </div>
    </div>
  `;
}

let searchPersonnel = '';
let filterSkill = '';
let activeTab = 'personnel';

function renderPersonnelTab(personnel) {
  let filtered = personnel;
  if (searchPersonnel) {
    const q = searchPersonnel.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));
  }
  if (filterSkill) {
    const q = filterSkill.toLowerCase();
    filtered = filtered.filter(p => p.skills.some(s => s.toLowerCase().includes(q)));
  }

  return `
    <!-- Filters Toolbar -->
    <div class="card mb-md" style="padding: 12px 16px;">
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <input type="text" id="res-search-personnel" class="form-input" placeholder="🔍 Tìm nhân sự, vai trò..." value="${searchPersonnel}" style="flex: 1; min-width: 200px;">
        <input type="text" id="res-filter-skill" class="form-input" placeholder="💡 Lọc theo kỹ năng (vd: Revit)..." value="${filterSkill}" style="width: 250px;">
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="kpi-grid mb-lg" style="grid-template-columns: repeat(4, 1fr);">
      <div class="kpi-card green">
        <div class="kpi-card-value">${personnel.filter(p => p.totalAllocation <= 100 && p.totalAllocation >= 50).length}</div>
        <div class="kpi-card-label">Tải phù hợp</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-card-value">${personnel.filter(p => p.totalAllocation > 100).length}</div>
        <div class="kpi-card-label">Quá tải</div>
      </div>
      <div class="kpi-card cyan">
        <div class="kpi-card-value">${personnel.filter(p => p.totalAllocation < 50).length}</div>
        <div class="kpi-card-label">Có thể nhận thêm</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-card-value">${personnel.length ? Math.round(personnel.reduce((s, p) => s + p.totalAllocation, 0) / personnel.length) : 0}%</div>
        <div class="kpi-card-label">TB Utilization</div>
      </div>
    </div>

    <!-- Personnel Table -->
    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nhân sự</th>
            <th>Vai trò</th>
            <th>Kỹ năng</th>
            <th>Phân bổ</th>
            <th>Tải</th>
            <th>Trạng thái</th>
            <th style="width: 80px;"></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map((p, idx) => {
            const utilColor = p.totalAllocation > 100 ? 'var(--accent-danger)' : p.totalAllocation >= 80 ? 'var(--accent-warning)' : 'var(--accent-secondary)';
            const statusClass = p.totalAllocation > 100 ? 'overdue' : 'active';
            const statusLabel = p.totalAllocation > 100 ? 'Quá tải' : 'Hoạt động';
            
            // Reallocation button if overloaded
            const reallocBtn = p.totalAllocation > 100 ? 
              `<button class="btn btn-ghost btn-sm text-warning btn-reallocate" data-idx="${idx}" title="Gợi ý san sẻ nguồn lực">💡</button>` : '';

            return `
              <tr>
                <td>
                  <div class="cell-project">
                    <div class="sidebar-avatar" style="width: 36px; height: 36px; font-size: 0.7rem;">${p.avatar}</div>
                    <div>
                      <input type="text" class="form-input inline-edit edit-p-name" data-idx="${idx}" value="${p.name}" style="padding: 2px 4px; height: 24px; font-weight: bold;">
                      <input type="text" class="form-input inline-edit edit-p-email text-xs text-muted" data-idx="${idx}" value="${p.email}" style="padding: 2px 4px; height: 20px; width: 100%; border: none; background: transparent;">
                    </div>
                  </div>
                </td>
                <td>
                  <input type="text" class="form-input inline-edit edit-p-role" data-idx="${idx}" value="${p.role}" style="padding: 2px 4px; height: 24px; font-weight: 600; font-size: 0.85rem; margin-bottom: 2px;">
                  <input type="text" class="form-input inline-edit edit-p-level text-xs text-muted" data-idx="${idx}" value="${p.level}" style="padding: 2px 4px; height: 20px; border: none; background: transparent;">
                </td>
                <td>
                  <input type="text" class="form-input inline-edit edit-p-skills" data-idx="${idx}" value="${p.skills.join(', ')}" style="padding: 2px 4px; height: 24px; font-size: 0.8rem;" title="Phân cách bằng dấu phẩy">
                </td>
                <td>
                  <div class="resource-alloc-bar" style="width: 160px;">
                    ${p.allocation.map((a, i) => {
                      const colors = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-cyan)'];
                      return `<div class="resource-alloc-segment" style="width: ${a.percentage}%; background: ${colors[i % colors.length]};" title="${a.projectName}: ${a.percentage}%">${a.percentage > 15 ? a.percentage + '%' : ''}</div>`;
                    }).join('')}
                  </div>
                  <div class="text-xs text-muted mt-xs">${p.allocation.map(a => a.projectName.substring(0, 12)).join(' · ')}</div>
                </td>
                <td>
                  <span class="text-sm font-bold" style="color: ${utilColor};">${p.totalAllocation}%</span>
                </td>
                <td>
                  <span class="badge ${statusClass}">
                    <span class="badge-dot"></span>
                    ${statusLabel}
                  </span>
                </td>
                <td>
                  <div class="flex gap-xs">
                    ${reallocBtn}
                    <button class="btn btn-ghost btn-sm text-danger btn-delete-personnel" data-idx="${idx}" title="Xóa">🗑️</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') : `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">Không tìm thấy nhân sự</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderSoftwareTab(software) {
  return `
    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Phần mềm</th>
            <th>Loại</th>
            <th>License</th>
            <th>Sử dụng</th>
            <th>Hết hạn</th>
            <th>Chi phí/năm</th>
          </tr>
        </thead>
        <tbody>
          ${software.map(sw => {
            const usedPct = Math.round((sw.usedLicenses / sw.totalLicenses) * 100);
            return `
              <tr>
                <td class="font-semibold">${sw.name}</td>
                <td><span class="badge planning">${sw.type}</span></td>
                <td class="text-sm">${sw.totalLicenses} licenses</td>
                <td>
                  <div class="flex items-center gap-sm">
                    <div class="progress-bar" style="width: 80px;">
                      <div class="progress-bar-fill ${usedPct >= 90 ? 'red' : usedPct >= 70 ? 'orange' : 'green'}" style="width: ${usedPct}%;"></div>
                    </div>
                    <span class="text-xs">${sw.usedLicenses}/${sw.totalLicenses}</span>
                  </div>
                </td>
                <td class="text-sm">${formatDate(sw.expiryDate)}</td>
                <td class="text-sm font-semibold">${sw.costPerYear}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHardwareTab(hardware) {
  return `
    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Thiết bị</th>
            <th>Loại</th>
            <th>Số lượng</th>
            <th>Đang dùng</th>
            <th>Thông số</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${hardware.map(hw => `
            <tr>
              <td class="font-semibold">${hw.name}</td>
              <td><span class="badge planning">${hw.type}</span></td>
              <td class="text-sm">${hw.quantity}</td>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="progress-bar" style="width: 60px;">
                    <div class="progress-bar-fill" style="width: ${Math.round(hw.assigned / hw.quantity * 100)}%;"></div>
                  </div>
                  <span class="text-xs">${hw.assigned}/${hw.quantity}</span>
                </div>
              </td>
              <td class="text-xs text-muted">${hw.specs}</td>
              <td><span class="badge active"><span class="badge-dot"></span> ${hw.status === 'active' ? 'Hoạt động' : 'Bảo trì'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAllocationMatrix(personnel, projects) {
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📊 Ma trận phân bổ nguồn lực — Dự án</h3>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table" style="min-width: 800px;">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; background: var(--bg-tertiary); z-index: 5;">Nhân sự</th>
              ${projects.map(p => `<th style="text-align: center; font-size: 0.65rem; max-width: 100px; white-space: normal;">${p.name.substring(0, 20)}</th>`).join('')}
              <th style="text-align: center;">Tổng</th>
            </tr>
          </thead>
          <tbody>
            ${personnel.map(p => {
              return `
                <tr>
                  <td style="position: sticky; left: 0; background: var(--bg-secondary); z-index: 5;">
                    <div class="font-semibold text-sm">${p.name}</div>
                    <div class="text-xs text-muted">${p.role}</div>
                  </td>
                  ${projects.map(proj => {
                    const alloc = p.allocation.find(a => a.projectId === proj.id);
                    const val = alloc ? alloc.percentage : 0;
                    let cellClass = 'empty';
                    if (val > 0 && val <= 30) cellClass = 'low';
                    else if (val > 30 && val <= 60) cellClass = 'medium';
                    else if (val > 60 && val <= 100) cellClass = 'high';
                    else if (val > 100) cellClass = 'over';
                    return `<td><div class="heatmap-cell ${cellClass}" style="margin: 2px;">${val > 0 ? val + '%' : '—'}</div></td>`;
                  }).join('')}
                  <td>
                    <div class="heatmap-cell ${p.totalAllocation > 100 ? 'over' : p.totalAllocation >= 80 ? 'high' : 'medium'}" style="margin: 2px; font-weight: 700;">
                      ${p.totalAllocation}%
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function init() {
  const bindPersonnelEvents = () => {
    // Filters
    const searchInput = document.getElementById('res-search-personnel');
    const skillInput = document.getElementById('res-filter-skill');
    
    const refresh = () => {
      searchPersonnel = searchInput?.value || '';
      filterSkill = skillInput?.value || '';
      const container = document.getElementById('resource-tab-content');
      if (container) {
        container.innerHTML = renderPersonnelTab(getState().personnel);
        bindPersonnelEvents(); // Re-bind after render
      }
    };

    searchInput?.addEventListener('input', refresh);
    skillInput?.addEventListener('input', refresh);

    // Inline Edits
    document.querySelectorAll('.inline-edit').forEach(input => {
      input.addEventListener('change', () => {
        const personnel = [...getState().personnel];
        const pNames = document.querySelectorAll('.edit-p-name');
        const pEmails = document.querySelectorAll('.edit-p-email');
        const pRoles = document.querySelectorAll('.edit-p-role');
        const pLevels = document.querySelectorAll('.edit-p-level');
        const pSkills = document.querySelectorAll('.edit-p-skills');

        pNames.forEach((el, idx) => {
          personnel[idx].name = el.value;
          personnel[idx].email = pEmails[idx].value;
          personnel[idx].role = pRoles[idx].value;
          personnel[idx].level = pLevels[idx].value;
          personnel[idx].skills = pSkills[idx].value.split(',').map(s => s.trim()).filter(s => s);
        });

        setState('personnel', personnel);
        refresh();
      });
    });

    // Delete
    document.querySelectorAll('.btn-delete-personnel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!confirm('Bạn có chắc muốn xóa nhân sự này?')) return;
        const idx = parseInt(e.currentTarget.dataset.idx);
        const personnel = [...getState().personnel];
        personnel.splice(idx, 1);
        setState('personnel', personnel);
        refresh();
      });
    });

    // Smart Reallocation (Suggest)
    document.querySelectorAll('.btn-reallocate').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const personnel = getState().personnel;
        const target = personnel[idx];
        
        // Find people with < 50% allocation and similar role or skills
        const candidates = personnel.filter(p => 
          p.id !== target.id && 
          p.totalAllocation < 50 && 
          (p.role === target.role || p.skills.some(s => target.skills.includes(s)))
        );

        try {
          const { showToast } = await import('../components/ProjectFormModal.js');
          if (candidates.length > 0) {
            const names = candidates.map(c => `${c.name} (${c.totalAllocation}%)`).join(', ');
            showToast(`💡 Gợi ý san sẻ công việc sang: ${names}`, 'info');
          } else {
            showToast(`💡 Không tìm thấy nhân sự nào rảnh (cùng vai trò/kỹ năng) để gán thay thế.`, 'warning');
          }
        } catch(err) {}
      });
    });
  };

  // Add Button
  document.getElementById('btn-add-resource')?.addEventListener('click', () => {
    if (activeTab === 'personnel') {
      const email = prompt("Nhập địa chỉ Email của nhân sự mới:\\n(Tài khoản của họ sẽ tự động liên kết khi đăng nhập lần đầu bằng email này)");
      if (!email || !email.includes('@')) {
        if (email !== null) alert("Email không hợp lệ!");
        return;
      }

      const { personnel } = getState();
      if (personnel.find(p => p.email === email)) {
        alert('Email này đã tồn tại trong danh sách!');
        return;
      }

      const name = email.split('@')[0];
      const newPerson = {
        id: `p-${Date.now()}`,
        name: name,
        email: email,
        avatar: '👤',
        role: 'Guest',
        level: 'New',
        skills: [],
        allocation: [],
        totalAllocation: 0
      };

      const updated = [newPerson, ...personnel];
      setState('personnel', updated);
      
      const container = document.getElementById('resource-tab-content');
      if (container) {
        container.innerHTML = renderPersonnelTab(updated);
        bindPersonnelEvents();
      }
    } else {
      // Future: add for Software/Hardware
      alert('Chức năng thêm mới Phần mềm/Thiết bị đang được cập nhật.');
    }
  });

  // Clean Mock Data Button
  document.getElementById('btn-clean-mock')?.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ nhân sự chưa đăng ký tài khoản thật (mock data)? Hành động này không thể hoàn tác!')) {
      const { personnel } = getState();
      // Giữ lại những nhân sự được tạo bởi hệ thống Firebase (id dài) hoặc các nhân sự mới tự thêm có id bắt đầu bằng p-timestamp
      const cleanedPersonnel = personnel.filter(p => !/^R\d{3}$/.test(p.id));
      setState('personnel', cleanedPersonnel);
      const container = document.getElementById('resource-tab-content');
      if (container && activeTab === 'personnel') {
        container.innerHTML = renderPersonnelTab(cleanedPersonnel);
        bindPersonnelEvents();
      }
    }
  });

  // Tab switching
  document.querySelectorAll('#resource-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#resource-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;

      const { personnel, softwareAssets, hardwareAssets, projects } = getState();
      const container = document.getElementById('resource-tab-content');
      if (!container) return;

      switch (activeTab) {
        case 'personnel':
          container.innerHTML = renderPersonnelTab(personnel);
          bindPersonnelEvents();
          break;
        case 'software':
          container.innerHTML = renderSoftwareTab(softwareAssets);
          break;
        case 'hardware':
          container.innerHTML = renderHardwareTab(hardwareAssets);
          break;
        case 'allocation':
          container.innerHTML = renderAllocationMatrix(personnel, projects);
          break;
      }
    });
  });

  // Initial bind if personnel is active
  if (activeTab === 'personnel') {
    bindPersonnelEvents();
  }
}

export function destroy() {}
