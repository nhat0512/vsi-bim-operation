// ============================================
// RESOURCES — Personnel, Software, Hardware Management
// Fully Upgraded: Smart Table, Profile Cards, 1-Click KPI Filters,
// Detail Modals, Workload Rebalancer & Excel Export.
// ============================================
import { getState, setState } from '../state.js';
import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/ProjectFormModal.js';

// Local UI state
let activeTab = 'personnel'; // 'personnel' | 'software' | 'hardware' | 'allocation'
let currentViewMode = 'table'; // 'table' | 'cards'
let searchPersonnel = '';
let filterSkill = '';
let filterRole = 'all';
let filterWorkload = 'all'; // 'all' | 'suitable' | 'overloaded' | 'available'

const POPULAR_SKILLS = ['Revit', 'Civil 3D', 'Navisworks', 'AutoCAD', 'Dynamo', 'InfraWorks', 'BIM 360'];

export function render() {
  const { personnel, softwareAssets, hardwareAssets } = getState();

  return `
    <div class="animate-fade-in-up" id="resources-page-container">
      <!-- Section Header -->
      <div class="section-header" style="margin-bottom: 16px;">
        <div>
          <h1 class="section-title">👥 Quản lý nguồn lực</h1>
          <div class="section-subtitle">Nhân sự, phần mềm bản quyền, thiết bị máy trạm & ma trận phân bổ dự án</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-outline" id="btn-export-excel" title="Xuất danh sách nhân sự sang file Excel (CSV UTF-8)">
            📥 Xuất Excel
          </button>
          <button class="btn btn-outline admin-only" id="btn-sync-firebase-users" title="Đồng bộ bảng nhân sự theo danh sách tài khoản Firebase Authentication" style="color: var(--accent-primary); border-color: var(--accent-primary);">
            🔄 Đồng bộ từ Firebase
          </button>
          <button class="btn btn-outline admin-only" id="btn-clean-mock" title="Xóa toàn bộ nhân sự chưa đăng ký tài khoản thật">
            🧹 Dọn dẹp Mock
          </button>
          <button class="btn btn-primary" id="btn-add-resource">
            + Thêm nguồn lực
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs" id="resource-tabs" style="margin-bottom: 20px;">
        <button class="tab ${activeTab === 'personnel' ? 'active' : ''}" data-tab="personnel">
          👤 Nhân sự (<span id="tab-count-personnel">${(personnel || []).length}</span>)
        </button>
        <button class="tab ${activeTab === 'software' ? 'active' : ''}" data-tab="software">
          💻 Phần mềm (<span id="tab-count-software">${(softwareAssets || []).length}</span>)
        </button>
        <button class="tab ${activeTab === 'hardware' ? 'active' : ''}" data-tab="hardware">
          🖥️ Thiết bị (<span id="tab-count-hardware">${(hardwareAssets || []).length}</span>)
        </button>
        <button class="tab ${activeTab === 'allocation' ? 'active' : ''}" data-tab="allocation">
          📊 Ma trận phân bổ
        </button>
      </div>

      <!-- Tab Content Container -->
      <div id="resource-tab-content">
        ${renderCurrentTabContent()}
      </div>
    </div>
  `;
}

/**
 * Render content based on activeTab
 */
function renderCurrentTabContent() {
  const { personnel, softwareAssets, hardwareAssets, projects } = getState();

  switch (activeTab) {
    case 'personnel':
      return renderPersonnelTab(personnel || []);
    case 'software':
      return renderSoftwareTab(softwareAssets || []);
    case 'hardware':
      return renderHardwareTab(hardwareAssets || []);
    case 'allocation':
      return renderAllocationMatrix(personnel || [], projects || []);
    default:
      return renderPersonnelTab(personnel || []);
  }
}

// ============================================
// TAB 1: PERSONNEL MANAGEMENT
// ============================================

function renderPersonnelTab(personnel) {
  // Apply filters
  let filtered = [...personnel];

  if (searchPersonnel) {
    const q = searchPersonnel.toLowerCase().trim();
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.email && p.email.toLowerCase().includes(q)) || 
      (p.role && p.role.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }

  if (filterSkill) {
    const q = filterSkill.toLowerCase().trim();
    filtered = filtered.filter(p => 
      Array.isArray(p.skills) && p.skills.some(s => s.toLowerCase().includes(q))
    );
  }

  if (filterRole && filterRole !== 'all') {
    filtered = filtered.filter(p => p.role === filterRole);
  }

  if (filterWorkload === 'suitable') {
    filtered = filtered.filter(p => (p.totalAllocation || 0) >= 50 && (p.totalAllocation || 0) <= 100);
  } else if (filterWorkload === 'overloaded') {
    filtered = filtered.filter(p => (p.totalAllocation || 0) > 100);
  } else if (filterWorkload === 'available') {
    filtered = filtered.filter(p => (p.totalAllocation || 0) < 50);
  }

  // Calculate quick stats
  const totalCount = personnel.length;
  const suitableCount = personnel.filter(p => (p.totalAllocation || 0) >= 50 && (p.totalAllocation || 0) <= 100).length;
  const overloadedCount = personnel.filter(p => (p.totalAllocation || 0) > 100).length;
  const availableCount = personnel.filter(p => (p.totalAllocation || 0) < 50).length;
  const avgUtil = totalCount ? Math.round(personnel.reduce((s, p) => s + (p.totalAllocation || 0), 0) / totalCount) : 0;

  // Extract available roles
  const roles = Array.from(new Set(personnel.map(p => p.role).filter(Boolean)));

  return `
    <!-- Interactive 1-Click KPI Cards -->
    <div class="kpi-grid mb-md" style="grid-template-columns: repeat(4, 1fr); gap: 14px;">
      <!-- KPI 1: Tải phù hợp -->
      <div class="kpi-card green kpi-filter-card ${filterWorkload === 'suitable' ? 'active-kpi' : ''}" 
           data-kpi="suitable" title="Nhấp để lọc nhân sự có tải phù hợp (50% - 100%)" 
           style="cursor: pointer; transition: all 0.2s; position: relative; ${filterWorkload === 'suitable' ? 'box-shadow: 0 0 0 2px var(--accent-secondary); transform: translateY(-2px);' : ''}">
        <div class="kpi-card-value" style="display: flex; align-items: baseline; gap: 6px;">
          <span>${suitableCount}</span>
          <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">/ ${totalCount}</span>
        </div>
        <div class="kpi-card-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Tải phù hợp (50-100%)</span>
          ${filterWorkload === 'suitable' ? '<span style="font-size: 0.7rem; color: var(--accent-secondary); font-weight: bold;">● Đang lọc</span>' : ''}
        </div>
      </div>

      <!-- KPI 2: Quá tải -->
      <div class="kpi-card red kpi-filter-card ${filterWorkload === 'overloaded' ? 'active-kpi' : ''}" 
           data-kpi="overloaded" title="Nhấp để lọc nhân sự đang bị quá tải (>100%)" 
           style="cursor: pointer; transition: all 0.2s; position: relative; ${filterWorkload === 'overloaded' ? 'box-shadow: 0 0 0 2px var(--accent-danger); transform: translateY(-2px);' : ''}">
        <div class="kpi-card-value" style="display: flex; align-items: baseline; gap: 6px;">
          <span>${overloadedCount}</span>
          <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">/ ${totalCount}</span>
        </div>
        <div class="kpi-card-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Quá tải (>100%)</span>
          ${filterWorkload === 'overloaded' ? '<span style="font-size: 0.7rem; color: var(--accent-danger); font-weight: bold;">● Đang lọc</span>' : ''}
        </div>
      </div>

      <!-- KPI 3: Có thể nhận thêm -->
      <div class="kpi-card cyan kpi-filter-card ${filterWorkload === 'available' ? 'active-kpi' : ''}" 
           data-kpi="available" title="Nhấp để lọc nhân sự còn rảnh (<50%) để giao việc" 
           style="cursor: pointer; transition: all 0.2s; position: relative; ${filterWorkload === 'available' ? 'box-shadow: 0 0 0 2px var(--accent-cyan); transform: translateY(-2px);' : ''}">
        <div class="kpi-card-value" style="display: flex; align-items: baseline; gap: 6px;">
          <span>${availableCount}</span>
          <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">/ ${totalCount}</span>
        </div>
        <div class="kpi-card-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Có thể nhận thêm (&lt;50%)</span>
          ${filterWorkload === 'available' ? '<span style="font-size: 0.7rem; color: var(--accent-cyan); font-weight: bold;">● Đang lọc</span>' : ''}
        </div>
      </div>

      <!-- KPI 4: TB Utilization & Reset -->
      <div class="kpi-card blue kpi-filter-card ${filterWorkload === 'all' ? 'active-kpi' : ''}" 
           data-kpi="all" title="Nhấp để xem toàn bộ danh sách nhân sự" 
           style="cursor: pointer; transition: all 0.2s; position: relative;">
        <div class="kpi-card-value">${avgUtil}%</div>
        <div class="kpi-card-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>TB Utilization (${totalCount} NS)</span>
          <span style="font-size: 0.7rem; color: var(--accent-primary); font-weight: bold;">Xem tất cả</span>
        </div>
      </div>
    </div>

    <!-- Smart Toolbar & Filters -->
    <div class="card mb-md" style="padding: 14px 16px;">
      <!-- Row 1: Search, Role filter, View Switcher -->
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 10px;">
        <div style="flex: 1; min-width: 220px; position: relative;">
          <input type="text" id="res-search-personnel" class="form-input" 
                 placeholder="🔍 Tìm nhân sự theo tên, vai trò, email, SĐT..." 
                 value="${searchPersonnel}" style="width: 100%;">
          ${searchPersonnel ? `<button id="btn-clear-search" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer;">✕</button>` : ''}
        </div>

        <select id="res-filter-role" class="form-select" style="min-width: 170px;">
          <option value="all" ${filterRole === 'all' ? 'selected' : ''}>Tất cả vai trò (${roles.length})</option>
          ${roles.map(r => `<option value="${r}" ${filterRole === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>

        <!-- View Mode Switcher -->
        <div style="display: inline-flex; border: 1px solid var(--border-default); border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-tertiary);">
          <button id="btn-view-table" class="btn btn-sm ${currentViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" 
                  style="border-radius: 0; padding: 6px 12px; font-size: 0.8rem;" title="Xem dạng bảng chi tiết">
            📋 Bảng
          </button>
          <button id="btn-view-cards" class="btn btn-sm ${currentViewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}" 
                  style="border-radius: 0; padding: 6px 12px; font-size: 0.8rem;" title="Xem dạng thẻ danh thiếp">
            🗂️ Danh thiếp
          </button>
        </div>
      </div>

      <!-- Row 2: Quick Skill Filter Pills -->
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
        <span class="text-xs text-muted" style="font-weight: 600;">💡 Lọc nhanh kỹ năng:</span>
        <button class="skill-pill-btn ${!filterSkill ? 'active' : ''}" data-skill="" 
                style="padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; border: 1px solid ${!filterSkill ? 'var(--accent-primary)' : 'var(--border-default)'}; background: ${!filterSkill ? 'var(--accent-primary)' : 'transparent'}; color: ${!filterSkill ? '#fff' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.15s;">
          Tất cả
        </button>
        ${POPULAR_SKILLS.map(skill => {
          const isActive = filterSkill.toLowerCase() === skill.toLowerCase();
          return `
            <button class="skill-pill-btn ${isActive ? 'active' : ''}" data-skill="${skill}" 
                    style="padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}; background: ${isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}; color: ${isActive ? '#fff' : 'var(--text-primary)'}; cursor: pointer; transition: all 0.15s;">
              ${skill}
            </button>
          `;
        }).join('')}

        ${(filterSkill && !POPULAR_SKILLS.some(s => s.toLowerCase() === filterSkill.toLowerCase())) ? `
          <button class="skill-pill-btn active" data-skill="${filterSkill}" 
                  style="padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; border: 1px solid var(--accent-primary); background: var(--accent-primary); color: #fff; cursor: pointer;">
            "${filterSkill}" ✕
          </button>
        ` : ''}

        ${(filterWorkload !== 'all' || filterRole !== 'all' || searchPersonnel || filterSkill) ? `
          <button id="btn-reset-all-filters" class="btn btn-ghost btn-xs text-muted" style="margin-left: auto;">
            🔄 Xóa bộ lọc
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Personnel Main View: Table or Cards -->
    ${currentViewMode === 'table' ? renderPersonnelTableView(filtered) : renderPersonnelCardsView(filtered)}
  `;
}

/**
 * Render personnel list as a modern data table
 */
function renderPersonnelTableView(personnel) {
  if (!personnel || personnel.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 48px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
        <div class="font-bold text-lg mb-xs">Không tìm thấy nhân sự phù hợp</div>
        <div class="text-sm text-muted mb-md">Thử điều chỉnh từ khóa tìm kiếm hoặc bấm xóa bộ lọc.</div>
        <button class="btn btn-outline btn-sm" id="btn-empty-reset">🔄 Xóa bộ lọc</button>
      </div>
    `;
  }

  return `
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="overflow-x: auto;">
        <table class="data-table" style="margin: 0; width: 100%;">
          <thead>
            <tr>
              <th style="padding: 12px 16px;">Nhân sự</th>
              <th style="padding: 12px 14px;">Vai trò & Cấp bậc</th>
              <th style="padding: 12px 14px;">Kỹ năng cốt lõi</th>
              <th style="padding: 12px 14px; min-width: 180px;">Phân bổ dự án</th>
              <th style="padding: 12px 14px; text-align: center; width: 100px;">Tải</th>
              <th style="padding: 12px 14px; text-align: center; width: 110px;">Trạng thái</th>
              <th style="padding: 12px 16px; text-align: right; width: 130px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${personnel.map((p, idx) => {
              const totalAlloc = Number(p.totalAllocation) || 0;
              const isOverloaded = totalAlloc > 100;
              const statusClass = isOverloaded ? 'overdue' : 'active';
              const statusLabel = isOverloaded ? 'Quá tải' : 'Hoạt động';
              const avatarText = getAvatarText(p.name, p.avatar);

              return `
                <tr class="personnel-row" data-id="${p.id}" style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;">
                  <!-- Nhân sự -->
                  <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div class="sidebar-avatar" style="width: 38px; height: 38px; font-size: 0.8rem; font-weight: bold; background: ${getAvatarGradient(p.name)}; color: #fff; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                        ${avatarText}
                      </div>
                      <div style="overflow: hidden;">
                        <div class="btn-view-person-detail font-bold text-accent" data-id="${p.id}" 
                             style="cursor: pointer; font-size: 0.9rem; line-height: 1.3;" title="Xem hồ sơ chi tiết">
                          ${p.name}
                        </div>
                        <div class="text-xs text-muted" style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                          <span>✉️ ${p.email || 'Chưa có email'}</span>
                          ${p.phone ? `<span>· 📞 ${p.phone}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Vai trò & Cấp bậc -->
                  <td style="padding: 12px 14px;">
                    <div class="font-semibold text-sm" style="color: var(--text-primary); margin-bottom: 3px;">
                      ${p.role || 'Chưa phân vai trò'}
                    </div>
                    <div>
                      ${getLevelBadge(p.level)}
                    </div>
                  </td>

                  <!-- Kỹ năng -->
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; max-width: 250px;">
                      ${(p.skills && p.skills.length) ? p.skills.map(s => renderSkillBadge(s)).join('') : '<span class="text-xs text-muted">—</span>'}
                    </div>
                  </td>

                  <!-- Phân bổ dự án -->
                  <td style="padding: 12px 14px;">
                    <div class="resource-alloc-bar" style="width: 100%; max-width: 190px; height: 8px; border-radius: 4px; overflow: hidden; background: var(--bg-tertiary); display: flex;">
                      ${(p.allocation && p.allocation.length) ? p.allocation.map((a, i) => {
                        const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
                        return `<div class="resource-alloc-segment" style="width: ${Math.min(a.percentage, 100)}%; background: ${colors[i % colors.length]}; height: 100%;" title="${a.projectName}: ${a.percentage}%"></div>`;
                      }).join('') : '<div style="width: 100%; height: 100%; background: transparent;"></div>'}
                    </div>
                    <div class="text-xs text-muted mt-xs" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${(p.allocation && p.allocation.length) ? p.allocation.map(a => `<span title="${a.projectName}: ${a.percentage}%">${a.projectName.substring(0, 10)} (${a.percentage}%)</span>`).join(' · ') : 'Chưa gán dự án'}
                    </div>
                  </td>

                  <!-- Tải -->
                  <td style="padding: 12px 14px; text-align: center;">
                    ${getWorkloadBadge(totalAlloc)}
                  </td>

                  <!-- Trạng thái -->
                  <td style="padding: 12px 14px; text-align: center;">
                    <span class="badge ${statusClass}">
                      <span class="badge-dot"></span>
                      ${statusLabel}
                    </span>
                  </td>

                  <!-- Thao tác -->
                  <td style="padding: 12px 16px; text-align: right;">
                    <div style="display: inline-flex; gap: 4px; justify-content: flex-end;">
                      <button class="btn btn-ghost btn-sm btn-view-person-detail" data-id="${p.id}" title="Xem chi tiết & giờ làm">
                        👁️
                      </button>
                      <button class="btn btn-ghost btn-sm btn-edit-person" data-id="${p.id}" title="Chỉnh sửa hồ sơ">
                        ✏️
                      </button>
                      ${isOverloaded ? `
                        <button class="btn btn-ghost btn-sm text-warning btn-reallocate" data-id="${p.id}" title="San sẻ tải thông minh sang nhân sự rảnh">
                          💡
                        </button>
                      ` : ''}
                      <button class="btn btn-ghost btn-sm text-danger btn-delete-personnel" data-id="${p.id}" title="Xóa nhân sự">
                        🗑️
                      </button>
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

/**
 * Render personnel list as a Profile Cards Grid
 */
function renderPersonnelCardsView(personnel) {
  if (!personnel || personnel.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 48px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
        <div class="font-bold text-lg mb-xs">Không tìm thấy nhân sự phù hợp</div>
        <div class="text-sm text-muted mb-md">Thử điều chỉnh từ khóa tìm kiếm hoặc bấm xóa bộ lọc.</div>
        <button class="btn btn-outline btn-sm" id="btn-empty-reset">🔄 Xóa bộ lọc</button>
      </div>
    `;
  }

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;">
      ${personnel.map(p => {
        const totalAlloc = Number(p.totalAllocation) || 0;
        const isOverloaded = totalAlloc > 100;
        const statusClass = isOverloaded ? 'overdue' : 'active';
        const statusLabel = isOverloaded ? 'Quá tải' : 'Hoạt động';
        const avatarText = getAvatarText(p.name, p.avatar);

        return `
          <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; border: 1px solid ${isOverloaded ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-default)'};">
            <!-- Top Card Header -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                  <div class="sidebar-avatar" style="width: 44px; height: 44px; font-size: 0.95rem; font-weight: bold; background: ${getAvatarGradient(p.name)}; color: #fff; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
                    ${avatarText}
                  </div>
                  <div>
                    <div class="font-bold text-base text-accent btn-view-person-detail" data-id="${p.id}" 
                         style="cursor: pointer; line-height: 1.25;" title="Xem hồ sơ chi tiết">
                      ${p.name}
                    </div>
                    <div class="text-xs text-muted" style="margin-top: 2px;">
                      ${p.role || 'Chưa phân vai trò'} · ${getLevelBadge(p.level)}
                    </div>
                  </div>
                </div>

                <span class="badge ${statusClass}" style="font-size: 0.7rem;">
                  <span class="badge-dot"></span> ${statusLabel}
                </span>
              </div>

              <!-- Contact Info -->
              <div style="background: var(--bg-tertiary); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 0.78rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <span>✉️</span>
                  <span>${p.email || 'Chưa cập nhật'}</span>
                </div>
                ${p.phone ? `
                  <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary);">
                    <span>📞</span>
                    <span>${p.phone}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Workload Progress -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                  <span class="text-xs font-semibold text-muted">Tỷ lệ tải công việc:</span>
                  ${getWorkloadBadge(totalAlloc)}
                </div>
                <div class="progress-bar" style="height: 7px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                  <div class="progress-bar-fill ${totalAlloc > 100 ? 'red' : totalAlloc >= 80 ? 'orange' : 'green'}" 
                       style="width: ${Math.min(totalAlloc, 100)}%; height: 100%;"></div>
                </div>
              </div>

              <!-- Projects Allocation Badges -->
              <div style="margin-bottom: 12px;">
                <div class="text-xs font-semibold text-muted mb-xs">Dự án tham gia:</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  ${(p.allocation && p.allocation.length) ? p.allocation.map(a => `
                    <span class="badge" style="background: var(--bg-tertiary); font-size: 0.72rem; padding: 2px 7px; border: 1px solid var(--border-subtle);" title="${a.projectName}: ${a.percentage}%">
                      ${a.projectName.substring(0, 16)} <strong>(${a.percentage}%)</strong>
                    </span>
                  `).join('') : '<span class="text-xs text-muted font-italic">Chưa tham gia dự án nào</span>'}
                </div>
              </div>

              <!-- Skills Badges -->
              <div style="margin-bottom: 16px;">
                <div class="text-xs font-semibold text-muted mb-xs">Kỹ năng:</div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${(p.skills && p.skills.length) ? p.skills.map(s => renderSkillBadge(s)).join('') : '<span class="text-xs text-muted">—</span>'}
                </div>
              </div>
            </div>

            <!-- Card Actions Footer -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-subtle); margin-top: auto;">
              <button class="btn btn-outline btn-sm btn-view-person-detail" data-id="${p.id}" style="font-size: 0.78rem;">
                👁️ Xem hồ sơ
              </button>
              <div style="display: flex; gap: 4px;">
                ${isOverloaded ? `
                  <button class="btn btn-ghost btn-sm text-warning btn-reallocate" data-id="${p.id}" title="San sẻ tải thông minh">
                    💡
                  </button>
                ` : ''}
                <button class="btn btn-ghost btn-sm btn-edit-person" data-id="${p.id}" title="Sửa thông tin">
                  ✏️
                </button>
                <button class="btn btn-ghost btn-sm text-danger btn-delete-personnel" data-id="${p.id}" title="Xóa">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================
// TAB 2: SOFTWARE MANAGEMENT
// ============================================

function renderSoftwareTab(software) {
  const totalCost = software.reduce((acc, sw) => {
    const costNum = parseFloat((sw.costPerYear || '').replace(/[^\d.-]/g, '')) || 0;
    return acc + costNum;
  }, 0);

  return `
    <!-- Software Summary Cards -->
    <div class="kpi-grid mb-md" style="grid-template-columns: repeat(3, 1fr); gap: 14px;">
      <div class="kpi-card blue">
        <div class="kpi-card-value">${software.length}</div>
        <div class="kpi-card-label">Bộ phần mềm bản quyền</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-card-value">${software.reduce((s, sw) => s + (sw.usedLicenses || 0), 0)} / ${software.reduce((s, sw) => s + (sw.totalLicenses || 0), 0)}</div>
        <div class="kpi-card-label">Tổng giấy phép đang dùng</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-card-value">${software.filter(sw => isExpiringSoon(sw.expiryDate)).length}</div>
        <div class="kpi-card-label">Sắp hết hạn trong 60 ngày</div>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="overflow-x: auto;">
        <table class="data-table" style="margin: 0; width: 100%;">
          <thead>
            <tr>
              <th style="padding: 12px 16px;">Phần mềm</th>
              <th style="padding: 12px 14px;">Loại</th>
              <th style="padding: 12px 14px; text-align: center;">Tổng License</th>
              <th style="padding: 12px 14px; min-width: 170px;">Tỷ lệ sử dụng</th>
              <th style="padding: 12px 14px;">Hạn bản quyền</th>
              <th style="padding: 12px 14px; text-align: right;">Chi phí/năm</th>
              <th style="padding: 12px 16px; text-align: right; width: 80px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${software.map((sw, idx) => {
              const usedPct = sw.totalLicenses ? Math.round((sw.usedLicenses / sw.totalLicenses) * 100) : 0;
              const expiring = isExpiringSoon(sw.expiryDate);

              return `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 12px 16px;">
                    <div class="font-bold text-sm text-primary" style="display: flex; align-items: center; gap: 8px;">
                      <span>💻</span>
                      <span>${sw.name}</span>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span class="badge planning">${sw.type || 'BIM'}</span>
                  </td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600;">
                    ${sw.totalLicenses} licenses
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-bar" style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill ${usedPct >= 90 ? 'red' : usedPct >= 70 ? 'orange' : 'green'}" style="width: ${usedPct}%; height: 100%;"></div>
                      </div>
                      <span class="text-xs font-semibold" style="width: 48px; text-align: right;">${sw.usedLicenses}/${sw.totalLicenses}</span>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span class="text-sm ${expiring ? 'text-warning font-bold' : ''}">
                      ${formatDate(sw.expiryDate)}
                      ${expiring ? ' ⚠️' : ''}
                    </span>
                  </td>
                  <td style="padding: 12px 14px; text-align: right; font-weight: bold; color: var(--accent-primary);">
                    ${sw.costPerYear || '—'}
                  </td>
                  <td style="padding: 12px 16px; text-align: right;">
                    <button class="btn btn-ghost btn-sm text-danger btn-delete-software" data-idx="${idx}" title="Xóa phần mềm">
                      🗑️
                    </button>
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

// ============================================
// TAB 3: HARDWARE MANAGEMENT
// ============================================

function renderHardwareTab(hardware) {
  return `
    <!-- Hardware Summary Cards -->
    <div class="kpi-grid mb-md" style="grid-template-columns: repeat(3, 1fr); gap: 14px;">
      <div class="kpi-card blue">
        <div class="kpi-card-value">${hardware.reduce((s, hw) => s + (hw.quantity || 0), 0)}</div>
        <div class="kpi-card-label">Tổng số lượng thiết bị</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-card-value">${hardware.reduce((s, hw) => s + (hw.assigned || 0), 0)}</div>
        <div class="kpi-card-label">Đang bàn giao sử dụng</div>
      </div>
      <div class="kpi-card cyan">
        <div class="kpi-card-value">${hardware.filter(hw => hw.status === 'active').length} / ${hardware.length}</div>
        <div class="kpi-card-label">Chủng loại đang hoạt động tốt</div>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="overflow-x: auto;">
        <table class="data-table" style="margin: 0; width: 100%;">
          <thead>
            <tr>
              <th style="padding: 12px 16px;">Thiết bị & Chủng loại</th>
              <th style="padding: 12px 14px;">Phân loại</th>
              <th style="padding: 12px 14px; text-align: center;">Số lượng</th>
              <th style="padding: 12px 14px; min-width: 170px;">Đang cấp phát</th>
              <th style="padding: 12px 14px;">Cấu hình thông số</th>
              <th style="padding: 12px 14px; text-align: center;">Trạng thái</th>
              <th style="padding: 12px 16px; text-align: right; width: 80px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${hardware.map((hw, idx) => {
              const utilPct = hw.quantity ? Math.round((hw.assigned / hw.quantity) * 100) : 0;
              return `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="padding: 12px 16px;">
                    <div class="font-bold text-sm text-primary" style="display: flex; align-items: center; gap: 8px;">
                      <span>🖥️</span>
                      <span>${hw.name}</span>
                    </div>
                  </td>
                  <td style="padding: 12px 14px;">
                    <span class="badge planning">${hw.type || 'Workstation'}</span>
                  </td>
                  <td style="padding: 12px 14px; text-align: center; font-weight: 600;">
                    ${hw.quantity} chiếc
                  </td>
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-bar" style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill green" style="width: ${utilPct}%; height: 100%;"></div>
                      </div>
                      <span class="text-xs font-semibold" style="width: 48px; text-align: right;">${hw.assigned}/${hw.quantity}</span>
                    </div>
                  </td>
                  <td style="padding: 12px 14px; font-size: 0.8rem; color: var(--text-secondary); max-width: 250px;">
                    ${hw.specs || '—'}
                  </td>
                  <td style="padding: 12px 14px; text-align: center;">
                    <span class="badge ${hw.status === 'active' ? 'active' : 'on-hold'}">
                      <span class="badge-dot"></span>
                      ${hw.status === 'active' ? 'Hoạt động' : 'Bảo trì'}
                    </span>
                  </td>
                  <td style="padding: 12px 16px; text-align: right;">
                    <button class="btn btn-ghost btn-sm text-danger btn-delete-hardware" data-idx="${idx}" title="Xóa thiết bị">
                      🗑️
                    </button>
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

// ============================================
// TAB 4: ALLOCATION MATRIX
// ============================================

function renderAllocationMatrix(personnel, projects) {
  return `
    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="card-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 class="card-title" style="margin-bottom: 4px;">📊 Ma trận phân bổ nguồn lực — Dự án</h3>
          <div class="text-xs text-muted">Bản đồ nhiệt (Heatmap) thể hiện tỷ lệ % thời gian cam kết của từng nhân sự vào các dự án</div>
        </div>
        <div style="display: flex; gap: 8px; font-size: 0.75rem; align-items: center;">
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(59, 130, 246, 0.2);"></span> 1-30%</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(16, 185, 129, 0.4);"></span> 31-60%</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(245, 158, 11, 0.4);"></span> 61-100%</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 2px; background: rgba(239, 68, 68, 0.5);"></span> >100%</span>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="data-table" style="min-width: 850px; margin: 0;">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; background: var(--bg-tertiary); z-index: 5; padding: 12px 16px; min-width: 200px;">Nhân sự</th>
              ${(projects || []).map(p => `
                <th style="text-align: center; font-size: 0.72rem; max-width: 110px; white-space: normal; padding: 8px;">
                  <div title="${p.name}">${p.name.substring(0, 18)}</div>
                  <div class="text-xs text-muted" style="font-weight: normal;">${p.id}</div>
                </th>
              `).join('')}
              <th style="text-align: center; width: 100px; padding: 12px 16px;">Tổng tải</th>
            </tr>
          </thead>
          <tbody>
            ${(personnel || []).map(p => {
              const totalAlloc = Number(p.totalAllocation) || 0;
              return `
                <tr style="border-bottom: 1px solid var(--border-subtle);">
                  <td style="position: sticky; left: 0; background: var(--bg-secondary); z-index: 5; padding: 10px 16px;">
                    <div class="font-semibold text-sm text-primary">${p.name}</div>
                    <div class="text-xs text-muted">${p.role || ''} · ${p.level || ''}</div>
                  </td>
                  ${(projects || []).map(proj => {
                    const alloc = (p.allocation || []).find(a => a.projectId === proj.id);
                    const val = alloc ? alloc.percentage : 0;
                    let bgStyle = 'transparent';
                    let textColor = 'var(--text-muted)';
                    if (val > 0 && val <= 30) { bgStyle = 'rgba(59, 130, 246, 0.15)'; textColor = '#60a5fa'; }
                    else if (val > 30 && val <= 60) { bgStyle = 'rgba(16, 185, 129, 0.2)'; textColor = '#34d399'; }
                    else if (val > 60 && val <= 100) { bgStyle = 'rgba(245, 158, 11, 0.25)'; textColor = '#fbbf24'; }
                    else if (val > 100) { bgStyle = 'rgba(239, 68, 68, 0.35)'; textColor = '#f87171'; }

                    return `
                      <td style="text-align: center; padding: 6px;">
                        <div style="background: ${bgStyle}; color: ${textColor}; padding: 6px 2px; border-radius: 4px; font-weight: ${val > 0 ? '600' : 'normal'}; font-size: 0.8rem;">
                          ${val > 0 ? val + '%' : '—'}
                        </div>
                      </td>
                    `;
                  }).join('')}
                  <td style="text-align: center; padding: 10px 16px;">
                    ${getWorkloadBadge(totalAlloc)}
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

// ============================================
// MODALS: ADD / EDIT / DETAIL / REBALANCER
// ============================================

/**
 * Open Modal: Add or Edit Personnel
 */
function openPersonnelFormModal(person = null) {
  const isEdit = !!person;
  const projects = getState().projects || [];
  const title = isEdit ? `✏️ Chỉnh sửa hồ sơ — ${person.name}` : '🆕 Thêm nhân sự nguồn lực mới';

  const defaultSkills = person?.skills ? person.skills.join(', ') : '';
  const currentProjects = person?.allocation || [];

  const html = `
    <form id="form-personnel" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Họ và tên *</label>
          <input type="text" id="p-name" class="form-input" required placeholder="Ví dụ: Nguyễn Văn An" value="${person?.name || ''}">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Email công việc *</label>
          <input type="email" id="p-email" class="form-input" required placeholder="an.nguyen@bimvn.com" value="${person?.email || ''}">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Vai trò chính</label>
          <select id="p-role" class="form-select">
            <option value="BIM Manager" ${person?.role === 'BIM Manager' ? 'selected' : ''}>BIM Manager</option>
            <option value="BIM Coordinator" ${person?.role === 'BIM Coordinator' ? 'selected' : ''}>BIM Coordinator</option>
            <option value="BIM Modeler" ${person?.role === 'BIM Modeler' ? 'selected' : ''}>BIM Modeler</option>
            <option value="CAD Technician" ${person?.role === 'CAD Technician' ? 'selected' : ''}>CAD Technician</option>
            <option value="CIM Modeler" ${person?.role === 'CIM Modeler' ? 'selected' : ''}>CIM Modeler</option>
            <option value="Project Engineer" ${person?.role === 'Project Engineer' ? 'selected' : ''}>Project Engineer</option>
            <option value="Guest" ${person?.role === 'Guest' ? 'selected' : ''}>Guest / Khác</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Cấp bậc kinh nghiệm</label>
          <select id="p-level" class="form-select">
            <option value="Senior" ${person?.level?.toLowerCase() === 'senior' ? 'selected' : ''}>Senior</option>
            <option value="Mid" ${person?.level?.toLowerCase() === 'mid' ? 'selected' : ''}>Mid-level</option>
            <option value="Junior" ${person?.level?.toLowerCase() === 'junior' ? 'selected' : ''}>Junior</option>
            <option value="New" ${person?.level?.toLowerCase() === 'new' ? 'selected' : ''}>New / Tập sự</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Số điện thoại</label>
          <input type="text" id="p-phone" class="form-input" placeholder="0901-234-567" value="${person?.phone || ''}">
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Chứng chỉ BIM / Giấy phép</label>
          <input type="text" id="p-certifications" class="form-input" placeholder="Autodesk Certified, openBIM..." value="${(person?.certifications || []).join(', ')}">
        </div>
      </div>

      <div>
        <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Kỹ năng chuyên môn (cách nhau bằng dấu phẩy)</label>
        <input type="text" id="p-skills" class="form-input mb-xs" placeholder="Revit, Civil 3D, Navisworks, AutoCAD, Dynamo..." value="${defaultSkills}">
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span class="text-xs text-muted" style="align-self: center;">Thêm nhanh:</span>
          ${POPULAR_SKILLS.map(s => `
            <button type="button" class="btn-add-skill-chip" data-skill="${s}" 
                    style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: 12px; padding: 2px 8px; font-size: 0.72rem; cursor: pointer; color: var(--text-secondary);">
              + ${s}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Project Allocation Section -->
      <div style="background: var(--bg-tertiary); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <label class="form-label" style="font-weight: 600; margin-bottom: 0;">Phân bổ dự án (% thời gian)</label>
          <button type="button" id="btn-add-alloc-row" class="btn btn-outline btn-xs">+ Thêm dự án</button>
        </div>

        <div id="alloc-rows-container" style="display: flex; flex-direction: column; gap: 8px;">
          ${(currentProjects.length ? currentProjects : [{ projectId: '', projectName: '', percentage: 0 }]).map((a, i) => `
            <div class="alloc-row" style="display: flex; gap: 10px; align-items: center;">
              <select class="form-select alloc-proj-select" style="flex: 1;">
                <option value="">-- Chọn dự án --</option>
                ${(projects || []).map(proj => `<option value="${proj.id}" data-name="${proj.name}" ${proj.id === a.projectId ? 'selected' : ''}>${proj.name} (${proj.id})</option>`).join('')}
              </select>
              <div style="display: flex; align-items: center; gap: 4px; width: 110px;">
                <input type="number" min="0" max="150" class="form-input alloc-percent-input" value="${a.percentage || 0}" style="text-align: right;">
                <span class="text-sm font-bold">%</span>
              </div>
              <button type="button" class="btn btn-ghost btn-sm text-danger btn-remove-alloc" style="padding: 4px 8px;">✕</button>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border-subtle);">
          <span class="text-xs text-muted">Tổng tỷ lệ phân bổ:</span>
          <span id="preview-total-alloc" style="font-weight: bold; font-size: 0.95rem; color: var(--accent-primary);">0%</span>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button type="button" class="btn btn-outline" id="btn-cancel-modal">Hủy</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Cập nhật hồ sơ' : 'Tạo mới nhân sự'}</button>
      </div>
    </form>
  `;

  openModal(title, html, { size: 'wide' });

  // Event binding for the form
  setTimeout(() => {
    const form = document.getElementById('form-personnel');
    const container = document.getElementById('alloc-rows-container');
    const previewTotal = document.getElementById('preview-total-alloc');
    const skillsInput = document.getElementById('p-skills');

    // Calculate total preview
    const updateTotalPreview = () => {
      let sum = 0;
      document.querySelectorAll('.alloc-percent-input').forEach(inp => {
        sum += (parseFloat(inp.value) || 0);
      });
      if (previewTotal) {
        previewTotal.textContent = `${sum}%`;
        previewTotal.style.color = sum > 100 ? 'var(--accent-danger)' : sum >= 80 ? 'var(--accent-warning)' : 'var(--accent-secondary)';
      }
    };
    updateTotalPreview();

    // Skill chip click
    document.querySelectorAll('.btn-add-skill-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const skill = btn.dataset.skill;
        const current = skillsInput.value ? skillsInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!current.includes(skill)) {
          current.push(skill);
          skillsInput.value = current.join(', ');
        }
      });
    });

    // Add allocation row
    document.getElementById('btn-add-alloc-row')?.addEventListener('click', () => {
      const newRow = document.createElement('div');
      newRow.className = 'alloc-row';
      newRow.style.cssText = 'display: flex; gap: 10px; align-items: center;';
      newRow.innerHTML = `
        <select class="form-select alloc-proj-select" style="flex: 1;">
          <option value="">-- Chọn dự án --</option>
          ${(projects || []).map(proj => `<option value="${proj.id}" data-name="${proj.name}">${proj.name} (${proj.id})</option>`).join('')}
        </select>
        <div style="display: flex; align-items: center; gap: 4px; width: 110px;">
          <input type="number" min="0" max="150" class="form-input alloc-percent-input" value="30" style="text-align: right;">
          <span class="text-sm font-bold">%</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm text-danger btn-remove-alloc" style="padding: 4px 8px;">✕</button>
      `;
      container.appendChild(newRow);
      newRow.querySelector('.alloc-percent-input').addEventListener('input', updateTotalPreview);
      newRow.querySelector('.btn-remove-alloc').addEventListener('click', () => {
        newRow.remove();
        updateTotalPreview();
      });
      updateTotalPreview();
    });

    // Delegate inputs on change
    container?.addEventListener('input', (e) => {
      if (e.target.classList.contains('alloc-percent-input')) {
        updateTotalPreview();
      }
    });

    container?.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-alloc')) {
        e.target.closest('.alloc-row')?.remove();
        updateTotalPreview();
      }
    });

    // Cancel
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Submit
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('p-name')?.value?.trim();
      const email = document.getElementById('p-email')?.value?.trim();
      const role = document.getElementById('p-role')?.value;
      const level = document.getElementById('p-level')?.value;
      const phone = document.getElementById('p-phone')?.value?.trim();
      const certRaw = document.getElementById('p-certifications')?.value || '';
      const skillsRaw = document.getElementById('p-skills')?.value || '';

      if (!name || !email) {
        showToast('Vui lòng nhập đầy đủ Họ tên và Email!', 'warning');
        return;
      }

      // Collect allocations
      const allocation = [];
      let totalAllocation = 0;
      document.querySelectorAll('.alloc-row').forEach(row => {
        const select = row.querySelector('.alloc-proj-select');
        const percentInp = row.querySelector('.alloc-percent-input');
        const projId = select?.value;
        const selectedOpt = select?.options[select.selectedIndex];
        const projName = selectedOpt?.dataset?.name || projId;
        const pct = parseFloat(percentInp?.value) || 0;

        if (projId && pct > 0) {
          allocation.push({ projectId: projId, projectName: projName, percentage: pct });
          totalAllocation += pct;
        }
      });

      const skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const certifications = certRaw.split(',').map(s => s.trim()).filter(Boolean);
      const status = totalAllocation > 100 ? 'overloaded' : 'active';

      const { personnel } = getState();
      let updated = [...personnel];

      if (isEdit) {
        const idx = updated.findIndex(p => p.id === person.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            name,
            email,
            role,
            level,
            phone,
            skills,
            certifications,
            allocation,
            totalAllocation,
            status
          };
          showToast(`Đã cập nhật hồ sơ ${name}!`);
        }
      } else {
        // Check duplicate email
        if (updated.some(p => p.email && p.email.toLowerCase() === email.toLowerCase())) {
          showToast('Email này đã tồn tại trong danh sách nhân sự!', 'warning');
          return;
        }

        const newPerson = {
          id: `p-${Date.now()}`,
          name,
          email,
          role,
          level,
          phone,
          avatar: getAvatarText(name),
          skills,
          certifications,
          allocation,
          totalAllocation,
          status,
          joinDate: new Date().toISOString().slice(0, 10)
        };
        updated.unshift(newPerson);
        showToast(`Đã thêm mới nhân sự ${name}!`);
      }

      setState('personnel', updated);
      closeModal();
      refreshPage();
    });
  }, 50);
}

/**
 * Open Modal: Personnel Detail & Workload / Timesheets / Tasks
 */
function openPersonnelDetailModal(person) {
  if (!person) return;
  const { timesheets, projects } = getState();

  // Find logged hours for this person
  const userTimesheets = (timesheets || []).filter(ts => {
    return (ts.userId && ts.userId === person.id) ||
           (ts.userEmail && ts.userEmail.toLowerCase() === (person.email || '').toLowerCase()) ||
           (ts.userName && ts.userName.toLowerCase() === (person.name || '').toLowerCase());
  });

  const totalActualHours = userTimesheets.filter(ts => ts.isActual).reduce((sum, ts) => sum + (parseFloat(ts.hours) || 0), 0);
  const totalPlannedHours = userTimesheets.filter(ts => !ts.isActual).reduce((sum, ts) => sum + (parseFloat(ts.hours) || 0), 0);

  // Find assigned tasks in projects
  const assignedTasks = [];
  (projects || []).forEach(proj => {
    (proj.tasks || []).forEach(t => {
      const match = (t.assignee && t.assignee.toLowerCase() === person.name.toLowerCase()) ||
                    (t.assignedTo && (t.assignedTo === person.id || t.assignedTo.toLowerCase() === person.name.toLowerCase()));
      if (match) {
        assignedTasks.push({ ...t, projectName: proj.name, projectId: proj.id });
      }
    });
  });

  const totalAlloc = Number(person.totalAllocation) || 0;
  const isOverloaded = totalAlloc > 100;
  const avatarText = getAvatarText(person.name, person.avatar);

  const html = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Profile Header Summary -->
      <div style="display: flex; gap: 16px; align-items: center; background: var(--bg-tertiary); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
        <div class="sidebar-avatar" style="width: 56px; height: 56px; font-size: 1.2rem; font-weight: bold; background: ${getAvatarGradient(person.name)}; color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ${avatarText}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary);">${person.name}</h2>
            ${getLevelBadge(person.level)}
            <span class="badge ${isOverloaded ? 'overdue' : 'active'}">
              <span class="badge-dot"></span> ${isOverloaded ? 'Quá tải' : 'Hoạt động'}
            </span>
          </div>
          <div class="text-sm text-muted" style="margin-top: 4px;">
            <span>${person.role || 'Chuyên viên BIM'}</span> · 
            <span>✉️ ${person.email || '—'}</span> 
            ${person.phone ? `· <span>📞 ${person.phone}</span>` : ''}
          </div>
        </div>
        <div>
          ${getWorkloadBadge(totalAlloc)}
        </div>
      </div>

      <!-- Grid 2 Columns: Skills & Projects Allocation -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <!-- Card Left: Skills & Certifications -->
        <div class="card" style="padding: 14px;">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>💡</span> Kỹ năng & Chứng chỉ chuyên môn
          </h4>
          <div style="margin-bottom: 12px;">
            <div class="text-xs text-muted mb-xs font-semibold">Kỹ năng công cụ:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${(person.skills && person.skills.length) ? person.skills.map(s => renderSkillBadge(s)).join('') : '<span class="text-xs text-muted">Chưa khai báo kỹ năng</span>'}
            </div>
          </div>
          <div>
            <div class="text-xs text-muted mb-xs font-semibold">Chứng chỉ đào tạo:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${(person.certifications && person.certifications.length) ? person.certifications.map(c => `
                <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); font-size: 0.75rem;">
                  🏆 ${c}
                </span>
              `).join('') : '<span class="text-xs text-muted">Chưa có chứng chỉ ghi nhận</span>'}
            </div>
          </div>
        </div>

        <!-- Card Right: Current Projects Allocation -->
        <div class="card" style="padding: 14px;">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>📊</span> Phân bổ thời gian dự án
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(person.allocation && person.allocation.length) ? person.allocation.map(a => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 3px;">
                  <span class="font-semibold text-primary">${a.projectName}</span>
                  <span class="font-bold text-accent">${a.percentage}%</span>
                </div>
                <div class="progress-bar" style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                  <div class="progress-bar-fill" style="width: ${Math.min(a.percentage, 100)}%; height: 100%;"></div>
                </div>
              </div>
            `).join('') : '<div class="text-xs text-muted" style="padding: 12px 0;">Hiện chưa được gán vào dự án nào.</div>'}
          </div>
        </div>
      </div>

      <!-- Real Timesheets Data Section -->
      <div class="card" style="padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px;">
            <span>⏱️</span> Ghi nhận giờ làm (Timesheet) trong hệ thống
          </h4>
          <div style="display: flex; gap: 8px;">
            <span class="badge green" style="font-size: 0.75rem;">Thực tế: ${totalActualHours}h</span>
            <span class="badge planning" style="font-size: 0.75rem;">Kế hoạch: ${totalPlannedHours}h</span>
          </div>
        </div>

        ${userTimesheets.length ? `
          <div style="max-height: 180px; overflow-y: auto;">
            <table class="data-table" style="font-size: 0.78rem; margin: 0;">
              <thead>
                <tr>
                  <th style="padding: 6px 10px;">Ngày</th>
                  <th style="padding: 6px 10px;">Dự án / Nhiệm vụ</th>
                  <th style="padding: 6px 10px; text-align: center;">Số giờ</th>
                  <th style="padding: 6px 10px; text-align: center;">Loại</th>
                </tr>
              </thead>
              <tbody>
                ${userTimesheets.slice(0, 8).map(ts => `
                  <tr>
                    <td style="padding: 6px 10px;">${ts.dateString || ts.date || '—'}</td>
                    <td style="padding: 6px 10px;">${ts.taskName || ts.projectId || 'Công việc'}</td>
                    <td style="padding: 6px 10px; text-align: center; font-weight: bold;">${ts.hours}h</td>
                    <td style="padding: 6px 10px; text-align: center;">
                      <span class="badge ${ts.isActual ? 'active' : 'planning'}" style="font-size: 0.65rem;">
                        ${ts.isActual ? 'Thực tế' : 'Kế hoạch'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-xs text-muted" style="padding: 16px; text-align: center; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
            Chưa có bản ghi chấm giờ nào được lưu trữ cho nhân sự này.
          </div>
        `}
      </div>

      <!-- Assigned Tasks Section -->
      <div class="card" style="padding: 14px;">
        <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> Các đầu việc & bản vẽ đang phụ trách (${assignedTasks.length})
        </h4>
        ${assignedTasks.length ? `
          <div style="max-height: 160px; overflow-y: auto;">
            <table class="data-table" style="font-size: 0.78rem; margin: 0;">
              <thead>
                <tr>
                  <th style="padding: 6px 10px;">Đầu việc / Bản vẽ</th>
                  <th style="padding: 6px 10px;">Dự án</th>
                  <th style="padding: 6px 10px; text-align: center;">Tiến độ</th>
                  <th style="padding: 6px 10px; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${assignedTasks.map(t => `
                  <tr>
                    <td style="padding: 6px 10px; font-weight: 600;">${t.name}</td>
                    <td style="padding: 6px 10px; color: var(--text-muted);">${t.projectName}</td>
                    <td style="padding: 6px 10px; text-align: center;">${t.progress || 0}%</td>
                    <td style="padding: 6px 10px; text-align: center;">
                      <span class="badge ${t.status === 'completed' ? 'completed' : 'active'}" style="font-size: 0.65rem;">
                        ${t.status || 'Đang làm'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-xs text-muted" style="padding: 16px; text-align: center; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
            Không có đầu việc nào được chỉ định trực tiếp cho nhân sự này trong danh mục dự án.
          </div>
        `}
      </div>

      <!-- Action Footer -->
      <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 6px;">
        <button class="btn btn-outline" id="btn-modal-close-action">Đóng</button>
        <button class="btn btn-primary" id="btn-modal-edit-action" data-id="${person.id}">✏️ Chỉnh sửa thông tin</button>
      </div>
    </div>
  `;

  openModal(`👤 Hồ sơ nhân sự — ${person.name}`, html, { size: 'wide' });

  setTimeout(() => {
    document.getElementById('btn-modal-close-action')?.addEventListener('click', closeModal);
    document.getElementById('btn-modal-edit-action')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openPersonnelFormModal(person), 100);
    });
  }, 50);
}

/**
 * Open Modal: Smart Workload Rebalancer
 */
function openRebalancerModal(person) {
  if (!person) return;
  const personnel = getState().personnel || [];

  // Find people with < 50% allocation and similar role or skills
  const candidates = personnel.filter(p => 
    p.id !== person.id && 
    (p.totalAllocation || 0) < 80
  );

  const html = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; gap: 12px; align-items: center;">
        <span style="font-size: 1.5rem;">💡</span>
        <div>
          <div style="font-weight: 700; color: var(--accent-warning);">Trợ lý điều phối nguồn lực thông minh</div>
          <div class="text-xs text-muted" style="margin-top: 2px;">
            Nhân sự <strong>${person.name}</strong> hiện đang có tỷ lệ tải <strong>${person.totalAllocation}%</strong>. Hãy chọn dự án cần san sẻ và nhân sự tiếp nhận.
          </div>
        </div>
      </div>

      <form id="form-rebalance" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">1. Chọn dự án cần chuyển giao bớt tải:</label>
          <select id="reb-project" class="form-select" required>
            ${(person.allocation || []).map(a => `
              <option value="${a.projectId}" data-name="${a.projectName}" data-pct="${a.percentage}">
                ${a.projectName} (Hiện đang gán: ${a.percentage}%)
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          <div>
            <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">2. Tỷ lệ % muốn chuyển bớt:</label>
            <input type="number" id="reb-percent" class="form-input" min="5" max="100" value="20" required>
          </div>
          <div>
            <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">3. Nhân sự tiếp nhận phù hợp:</label>
            <select id="reb-target" class="form-select" required>
              ${candidates.length ? candidates.map(c => `
                <option value="${c.id}">
                  ${c.name} — ${c.role} (Tải hiện tại: ${c.totalAllocation || 0}%)
                </option>
              `).join('') : '<option value="">Không có nhân sự nào rảnh</option>'}
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
          <button type="button" class="btn btn-outline" id="btn-reb-cancel">Hủy</button>
          <button type="submit" class="btn btn-primary" ${!candidates.length ? 'disabled' : ''}>⚡ Thực hiện điều phối tải</button>
        </div>
      </form>
    </div>
  `;

  openModal(`💡 San sẻ nguồn lực — ${person.name}`, html, { size: 'normal' });

  setTimeout(() => {
    document.getElementById('btn-reb-cancel')?.addEventListener('click', closeModal);
    document.getElementById('form-rebalance')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const projSelect = document.getElementById('reb-project');
      const projId = projSelect?.value;
      const projName = projSelect?.options[projSelect.selectedIndex]?.dataset?.name || projId;
      const transferPct = parseFloat(document.getElementById('reb-percent')?.value) || 0;
      const targetId = document.getElementById('reb-target')?.value;

      if (!projId || !targetId || transferPct <= 0) {
        showToast('Vui lòng chọn thông tin điều phối hợp lệ!', 'warning');
        return;
      }

      const { personnel } = getState();
      const updated = [...personnel];
      const srcIdx = updated.findIndex(p => p.id === person.id);
      const tgtIdx = updated.findIndex(p => p.id === targetId);

      if (srcIdx === -1 || tgtIdx === -1) return;

      const srcPerson = updated[srcIdx];
      const tgtPerson = updated[tgtIdx];

      // Decrease from srcPerson
      const srcAlloc = (srcPerson.allocation || []).find(a => a.projectId === projId);
      if (!srcAlloc) return;

      const actualTransfer = Math.min(srcAlloc.percentage, transferPct);
      srcAlloc.percentage -= actualTransfer;
      if (srcAlloc.percentage <= 0) {
        srcPerson.allocation = srcPerson.allocation.filter(a => a.projectId !== projId);
      }
      srcPerson.totalAllocation = srcPerson.allocation.reduce((s, a) => s + (a.percentage || 0), 0);
      srcPerson.status = srcPerson.totalAllocation > 100 ? 'overloaded' : 'active';

      // Increase for tgtPerson
      if (!tgtPerson.allocation) tgtPerson.allocation = [];
      const tgtAlloc = tgtPerson.allocation.find(a => a.projectId === projId);
      if (tgtAlloc) {
        tgtAlloc.percentage += actualTransfer;
      } else {
        tgtPerson.allocation.push({ projectId: projId, projectName: projName, percentage: actualTransfer });
      }
      tgtPerson.totalAllocation = tgtPerson.allocation.reduce((s, a) => s + (a.percentage || 0), 0);
      tgtPerson.status = tgtPerson.totalAllocation > 100 ? 'overloaded' : 'active';

      setState('personnel', updated);
      closeModal();
      refreshPage();
      showToast(`💡 Đã san sẻ thành công ${actualTransfer}% dự án "${projName}" sang ${tgtPerson.name}!`);
    });
  }, 50);
}

/**
 * Open Modal: Add Software License
 */
function openSoftwareFormModal() {
  const html = `
    <form id="form-software" style="display: flex; flex-direction: column; gap: 14px;">
      <div>
        <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Tên phần mềm *</label>
        <input type="text" id="sw-name" class="form-input" required placeholder="Ví dụ: Autodesk AEC Collection, Trimble Connect...">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Phân loại</label>
          <select id="sw-type" class="form-select">
            <option value="BIM Authoring">BIM Authoring</option>
            <option value="BIM Coordination">BIM Coordination</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="CDE / Cloud">CDE / Cloud Platform</option>
            <option value="CAD Design">CAD Design</option>
            <option value="Analysis">Analysis / Calculation</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Chi phí hàng năm</label>
          <input type="text" id="sw-cost" class="form-input" placeholder="Ví dụ: 85.000.000 VNĐ">
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Tổng số License *</label>
          <input type="number" id="sw-total" class="form-input" min="1" value="5" required>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Đang dùng *</label>
          <input type="number" id="sw-used" class="form-input" min="0" value="1" required>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Ngày hết hạn *</label>
          <input type="date" id="sw-expiry" class="form-input" required value="${new Date(Date.now() + 365*24*60*60*1000).toISOString().slice(0, 10)}">
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button type="button" class="btn btn-outline" id="btn-sw-cancel">Hủy</button>
        <button type="submit" class="btn btn-primary">Lưu phần mềm</button>
      </div>
    </form>
  `;

  openModal('💻 Thêm bản quyền phần mềm mới', html, { size: 'normal' });

  setTimeout(() => {
    document.getElementById('btn-sw-cancel')?.addEventListener('click', closeModal);
    document.getElementById('form-software')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('sw-name')?.value?.trim();
      const type = document.getElementById('sw-type')?.value;
      const costPerYear = document.getElementById('sw-cost')?.value?.trim() || '—';
      const totalLicenses = parseInt(document.getElementById('sw-total')?.value) || 1;
      const usedLicenses = parseInt(document.getElementById('sw-used')?.value) || 0;
      const expiryDate = document.getElementById('sw-expiry')?.value;

      if (!name) return;

      const { softwareAssets } = getState();
      const newSw = {
        id: `sw-${Date.now()}`,
        name,
        type,
        totalLicenses,
        usedLicenses,
        expiryDate,
        costPerYear
      };

      const updated = [newSw, ...(softwareAssets || [])];
      setState('softwareAssets', updated);
      closeModal();
      refreshPage();
      showToast(`Đã thêm phần mềm ${name}!`);
    });
  }, 50);
}

/**
 * Open Modal: Add Hardware Asset
 */
function openHardwareFormModal() {
  const html = `
    <form id="form-hardware" style="display: flex; flex-direction: column; gap: 14px;">
      <div>
        <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Tên thiết bị / Model *</label>
        <input type="text" id="hw-name" class="form-input" required placeholder="Ví dụ: Dell Precision 3660, HP Z2 Tower...">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Loại thiết bị</label>
          <select id="hw-type" class="form-select">
            <option value="Workstation">Workstation Đồ Họa</option>
            <option value="Laptop">Laptop Kỹ Sư</option>
            <option value="Server">Máy Chủ / NAS</option>
            <option value="Monitor">Màn Hình Chuyên Dụng</option>
            <option value="VR / AR">Kính VR / Thực Tế Ảo</option>
            <option value="Khác">Thiết bị khác</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Trạng thái</label>
          <select id="hw-status" class="form-select">
            <option value="active">Hoạt động bình thường</option>
            <option value="maintenance">Đang bảo trì / Nâng cấp</option>
          </select>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Tổng số lượng *</label>
          <input type="number" id="hw-qty" class="form-input" min="1" value="2" required>
        </div>
        <div>
          <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Đang bàn giao sử dụng *</label>
          <input type="number" id="hw-assigned" class="form-input" min="0" value="1" required>
        </div>
      </div>

      <div>
        <label class="form-label" style="font-weight: 600; margin-bottom: 4px; display: block;">Thông số kỹ thuật / Cấu hình</label>
        <input type="text" id="hw-specs" class="form-input" placeholder="Ví dụ: Core i9-13900K, 64GB RAM, RTX A4000 16GB, 1TB SSD...">
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
        <button type="button" class="btn btn-outline" id="btn-hw-cancel">Hủy</button>
        <button type="submit" class="btn btn-primary">Lưu thiết bị</button>
      </div>
    </form>
  `;

  openModal('🖥️ Thêm thiết bị / Máy trạm mới', html, { size: 'normal' });

  setTimeout(() => {
    document.getElementById('btn-hw-cancel')?.addEventListener('click', closeModal);
    document.getElementById('form-hardware')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('hw-name')?.value?.trim();
      const type = document.getElementById('hw-type')?.value;
      const status = document.getElementById('hw-status')?.value;
      const specs = document.getElementById('hw-specs')?.value?.trim() || '—';
      const quantity = parseInt(document.getElementById('hw-qty')?.value) || 1;
      const assigned = parseInt(document.getElementById('hw-assigned')?.value) || 0;

      if (!name) return;

      const { hardwareAssets } = getState();
      const newHw = {
        id: `hw-${Date.now()}`,
        name,
        type,
        quantity,
        assigned,
        specs,
        status
      };

      const updated = [newHw, ...(hardwareAssets || [])];
      setState('hardwareAssets', updated);
      closeModal();
      refreshPage();
      showToast(`Đã thêm thiết bị ${name}!`);
    });
  }, 50);
}

// ============================================
// EXPORT TO EXCEL (CSV UTF-8 BOM)
// ============================================

function exportPersonnelToExcel() {
  const { personnel } = getState();
  if (!personnel || personnel.length === 0) {
    showToast('Không có dữ liệu nhân sự để xuất!', 'warning');
    return;
  }

  const headers = ['Mã NV', 'Họ và tên', 'Email', 'Số điện thoại', 'Vai trò', 'Cấp bậc', 'Kỹ năng', 'Dự án phân bổ', 'Tổng tải (%)', 'Trạng thái'];
  const rows = personnel.map(p => [
    `"${(p.id || '').replace(/"/g, '""')}"`,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${(p.email || '').replace(/"/g, '""')}"`,
    `"${(p.phone || '').replace(/"/g, '""')}"`,
    `"${(p.role || '').replace(/"/g, '""')}"`,
    `"${(p.level || '').replace(/"/g, '""')}"`,
    `"${(p.skills || []).join('; ').replace(/"/g, '""')}"`,
    `"${(p.allocation || []).map(a => `${a.projectName}: ${a.percentage}%`).join('; ').replace(/"/g, '""')}"`,
    `"${p.totalAllocation || 0}%"`,
    `"${(p.totalAllocation || 0) > 100 ? 'Quá tải' : 'Hoạt động'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Danh_sach_nhan_su_BIM_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 Đã xuất danh sách nhân sự sang Excel thành công!');
}

// ============================================
// UI HELPERS & FORMATTERS
// ============================================

function renderSkillBadge(skill) {
  if (!skill) return '';
  const s = skill.toLowerCase();
  let bg = 'rgba(99, 102, 241, 0.15)';
  let color = '#818cf8';
  let border = 'rgba(99, 102, 241, 0.3)';

  if (s.includes('revit')) {
    bg = 'rgba(59, 130, 246, 0.15)'; color = '#60a5fa'; border = 'rgba(59, 130, 246, 0.3)';
  } else if (s.includes('civil')) {
    bg = 'rgba(16, 185, 129, 0.15)'; color = '#34d399'; border = 'rgba(16, 185, 129, 0.3)';
  } else if (s.includes('navis')) {
    bg = 'rgba(139, 92, 246, 0.15)'; color = '#a78bfa'; border = 'rgba(139, 92, 246, 0.3)';
  } else if (s.includes('dynamo')) {
    bg = 'rgba(245, 158, 11, 0.15)'; color = '#fbbf24'; border = 'rgba(245, 158, 11, 0.3)';
  } else if (s.includes('cad') || s.includes('autocad')) {
    bg = 'rgba(100, 116, 139, 0.2)'; color = '#94a3b8'; border = 'rgba(148, 163, 184, 0.3)';
  } else if (s.includes('infra')) {
    bg = 'rgba(6, 182, 212, 0.15)'; color = '#22d3ee'; border = 'rgba(6, 182, 212, 0.3)';
  } else if (s.includes('360') || s.includes('acc') || s.includes('cloud')) {
    bg = 'rgba(234, 88, 12, 0.15)'; color = '#fb923c'; border = 'rgba(234, 88, 12, 0.3)';
  }

  return `
    <span class="badge" style="background: ${bg}; color: ${color}; border: 1px solid ${border}; font-size: 0.72rem; padding: 1px 7px; border-radius: 12px; font-weight: 500;">
      ${skill}
    </span>
  `;
}

function getLevelBadge(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('senior')) {
    return '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.7rem; font-weight: 600;">Senior</span>';
  }
  if (l.includes('mid')) {
    return '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); font-size: 0.7rem; font-weight: 600;">Mid-level</span>';
  }
  if (l.includes('junior')) {
    return '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.7rem; font-weight: 600;">Junior</span>';
  }
  return `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); font-size: 0.7rem; font-weight: 600;">${level || 'New'}</span>`;
}

function getWorkloadBadge(total) {
  const pct = Number(total) || 0;
  if (pct > 100) {
    return `<span class="badge red" style="font-weight: 700; font-size: 0.78rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Quá tải">🔥 ${pct}%</span>`;
  }
  if (pct >= 80) {
    return `<span class="badge orange" style="font-weight: 700; font-size: 0.78rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Tải cao">⚡ ${pct}%</span>`;
  }
  if (pct >= 50) {
    return `<span class="badge green" style="font-weight: 700; font-size: 0.78rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Phù hợp">✅ ${pct}%</span>`;
  }
  return `<span class="badge" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); font-weight: 700; font-size: 0.78rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;" title="Sẵn sàng nhận việc">💡 ${pct}%</span>`;
}

function getAvatarText(name, avatar) {
  if (avatar && avatar.length <= 4 && !avatar.includes('http') && !avatar.includes('/')) return avatar;
  if (!name) return '👤';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function getAvatarGradient(name) {
  const gradients = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #b45309)',
    'linear-gradient(135deg, #06b6d4, #0e7490)',
    'linear-gradient(135deg, #ec4899, #be185d)'
  ];
  let sum = 0;
  for (let i = 0; i < (name || '').length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

function formatDate(str) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch(e) {
    return str;
  }
}

function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;
  try {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 60 && diffDays >= 0;
  } catch(e) {
    return false;
  }
}

// ============================================
// EVENTS & BINDINGS
// ============================================

function refreshPage() {
  const container = document.getElementById('resource-tab-content');
  if (container) {
    container.innerHTML = renderCurrentTabContent();
    bindTabEvents();
  }
  // Update header tab counts
  const { personnel, softwareAssets, hardwareAssets } = getState();
  const pCount = document.getElementById('tab-count-personnel');
  const sCount = document.getElementById('tab-count-software');
  const hCount = document.getElementById('tab-count-hardware');
  if (pCount) pCount.textContent = (personnel || []).length;
  if (sCount) sCount.textContent = (softwareAssets || []).length;
  if (hCount) hCount.textContent = (hardwareAssets || []).length;
}

function bindTabEvents() {
  if (activeTab === 'personnel') {
    bindPersonnelEvents();
  } else if (activeTab === 'software') {
    bindSoftwareEvents();
  } else if (activeTab === 'hardware') {
    bindHardwareEvents();
  }
}

function bindPersonnelEvents() {
  // Search input
  const searchInput = document.getElementById('res-search-personnel');
  searchInput?.addEventListener('input', (e) => {
    searchPersonnel = e.target.value;
    refreshPage();
  });

  // Clear search
  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    searchPersonnel = '';
    refreshPage();
  });

  // Role filter
  const roleSelect = document.getElementById('res-filter-role');
  roleSelect?.addEventListener('change', (e) => {
    filterRole = e.target.value;
    refreshPage();
  });

  // View Mode Switcher
  document.getElementById('btn-view-table')?.addEventListener('click', () => {
    if (currentViewMode !== 'table') {
      currentViewMode = 'table';
      refreshPage();
    }
  });

  document.getElementById('btn-view-cards')?.addEventListener('click', () => {
    if (currentViewMode !== 'cards') {
      currentViewMode = 'cards';
      refreshPage();
    }
  });

  // Interactive 1-Click KPI Cards
  document.querySelectorAll('.kpi-filter-card').forEach(card => {
    card.addEventListener('click', () => {
      const kpi = card.dataset.kpi;
      if (filterWorkload === kpi && kpi !== 'all') {
        filterWorkload = 'all'; // Toggle back to all
      } else {
        filterWorkload = kpi;
      }
      refreshPage();
    });
  });

  // Quick Skill Pills
  document.querySelectorAll('.skill-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.dataset.skill;
      if (filterSkill === skill) {
        filterSkill = '';
      } else {
        filterSkill = skill;
      }
      refreshPage();
    });
  });

  // Reset all filters
  document.getElementById('btn-reset-all-filters')?.addEventListener('click', () => {
    searchPersonnel = '';
    filterSkill = '';
    filterRole = 'all';
    filterWorkload = 'all';
    refreshPage();
  });

  document.getElementById('btn-empty-reset')?.addEventListener('click', () => {
    searchPersonnel = '';
    filterSkill = '';
    filterRole = 'all';
    filterWorkload = 'all';
    refreshPage();
  });

  // Personnel detail modal triggers
  document.querySelectorAll('.btn-view-person-detail').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const { personnel } = getState();
      const person = (personnel || []).find(p => p.id === id);
      if (person) openPersonnelDetailModal(person);
    });
  });

  // Edit personnel triggers
  document.querySelectorAll('.btn-edit-person').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const { personnel } = getState();
      const person = (personnel || []).find(p => p.id === id);
      if (person) openPersonnelFormModal(person);
    });
  });

  // Smart Reallocation trigger
  document.querySelectorAll('.btn-reallocate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const { personnel } = getState();
      const person = (personnel || []).find(p => p.id === id);
      if (person) openRebalancerModal(person);
    });
  });

  // Delete personnel trigger
  document.querySelectorAll('.btn-delete-personnel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const { personnel } = getState();
      const person = (personnel || []).find(p => p.id === id);
      if (!person) return;

      if (!confirm(`Bạn có chắc chắn muốn xóa nhân sự "${person.name}" khỏi danh sách nguồn lực?`)) return;

      const updated = personnel.filter(p => p.id !== id);
      setState('personnel', updated);
      refreshPage();
      showToast(`Đã xóa nhân sự ${person.name}.`);
    });
  });
}

function bindSoftwareEvents() {
  document.querySelectorAll('.btn-delete-software').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      const { softwareAssets } = getState();
      if (!confirm('Bạn có chắc chắn muốn xóa bản quyền phần mềm này?')) return;
      const updated = [...softwareAssets];
      const removed = updated.splice(idx, 1);
      setState('softwareAssets', updated);
      refreshPage();
      showToast(`Đã xóa phần mềm ${removed[0]?.name || ''}.`);
    });
  });
}

function bindHardwareEvents() {
  document.querySelectorAll('.btn-delete-hardware').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(btn.dataset.idx);
      const { hardwareAssets } = getState();
      if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này khỏi danh mục?')) return;
      const updated = [...hardwareAssets];
      const removed = updated.splice(idx, 1);
      setState('hardwareAssets', updated);
      refreshPage();
      showToast(`Đã xóa thiết bị ${removed[0]?.name || ''}.`);
    });
  });
}

export function init() {
  // Add button click (changes behavior based on active tab)
  document.getElementById('btn-add-resource')?.addEventListener('click', () => {
    if (activeTab === 'personnel') {
      openPersonnelFormModal(null);
    } else if (activeTab === 'software') {
      openSoftwareFormModal();
    } else if (activeTab === 'hardware') {
      openHardwareFormModal();
    } else {
      openPersonnelFormModal(null);
    }
  });

  // Export to Excel
  document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    exportPersonnelToExcel();
  });

  // Đồng bộ nhân sự theo Firebase Authentication
  document.getElementById('btn-sync-firebase-users')?.addEventListener('click', async () => {
    if (confirm('Bạn có muốn đồng bộ bảng nhân sự chuẩn 100% theo các tài khoản thực trên Firebase Authentication không? Các tài khoản mẫu (mock) sẽ được dọn sạch.')) {
      const { personnelItems } = await import('../data/resources.js');
      const { syncToFirestore } = await import('../state.js');
      setState('personnel', personnelItems);
      await syncToFirestore();
      refreshPage();
      showToast('Đã đồng bộ bảng nhân sự theo Firebase Authentication thành công!');
    }
  });

  // Clean Mock Data Button (Safely removes R001-R005 demo records if requested)
  document.getElementById('btn-clean-mock')?.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn dọn dẹp các tài khoản nhân sự mẫu (mock data)? Hành động này không thể hoàn tác!')) {
      const { personnel } = getState();
      const cleanedPersonnel = (personnel || []).filter(p => !/^R\d{3}$/.test(p.id));
      setState('personnel', cleanedPersonnel);
      refreshPage();
      showToast('Đã dọn dẹp các tài khoản nhân sự mẫu thành công!');
    }
  });

  // Tab switching
  document.querySelectorAll('#resource-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#resource-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      refreshPage();
    });
  });

  // Initial event bindings
  bindTabEvents();
}

export function destroy() {
  // Clean up if needed
}
