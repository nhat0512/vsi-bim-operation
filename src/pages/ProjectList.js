import { getState, setState, subscribe, deleteProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES, LOD_LEVELS } from '../data/constants.js';
import { openProjectForm, showToast } from '../components/ProjectFormModal.js';
import { openModal, closeModal } from '../components/Modal.js';
import { formatDisplayName, parseBudgetValue } from '../utils/formatters.js';

let currentViewMode = 'table'; // 'table' | 'cards'
let localSearch = '';
let localType = 'all';
let localStatus = 'all'; // 'all' | 'active' | 'planning' | 'on-hold' | 'completed' | 'risk'
let localTeamLead = 'all';
let localSortBy = 'id'; // 'id' | 'name' | 'progress' | 'budget' | 'endDate' | 'modelHealth'
let localSortOrder = 'asc'; // 'asc' | 'desc'

/**
 * Kiểm tra xem dự án có thuộc diện "Cần chú ý / Rủi ro" không
 */
function isProjectAtRisk(p) {
  if (!p) return false;
  if (p.status === 'overdue') return true;
  
  const now = new Date();
  if (p.endDate) {
    const end = new Date(p.endDate);
    if (p.status !== 'completed' && end < now) return true;
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 45 && (p.progress || 0) < 65) return true;
  }
  
  if (typeof p.modelHealth === 'number' && p.modelHealth < 70) return true;
  const unresolvedClashes = (p.clashesTotal || 0) - (p.clashesResolved || 0);
  if (unresolvedClashes > 60) return true;
  
  return false;
}



/**
 * Định dạng ngày hiển thị dd/mm/yyyy
 */
function formatDateVN(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch(e) {
    return dateStr;
  }
}

/**
 * Lấy Badge Trạng thái dự án
 */
function getStatusBadge(status) {
  switch (status) {
    case 'active': 
      return '<span class="badge active" style="font-weight: 600;"><span class="badge-dot"></span>Đang chạy</span>';
    case 'planning': 
      return '<span class="badge planning" style="font-weight: 600;"><span class="badge-dot"></span>Lập kế hoạch</span>';
    case 'completed': 
      return '<span class="badge completed" style="font-weight: 600;"><span class="badge-dot"></span>Hoàn thành</span>';
    case 'on-hold': 
      return '<span class="badge on-hold" style="font-weight: 600;"><span class="badge-dot"></span>Tạm dừng</span>';
    case 'overdue': 
      return '<span class="badge red" style="font-weight: 600;"><span class="badge-dot"></span>Quá hạn</span>';
    default: 
      return `<span class="badge">${status}</span>`;
  }
}

/**
 * Lấy nhãn Giai đoạn BIM
 */
function getPhaseBadge(phaseId) {
  if (!phaseId) return '<span class="badge" style="background: var(--bg-tertiary); color: var(--text-muted); font-size: 0.72rem;">—</span>';
  const phaseObj = BIM_PHASES.find(ph => ph.id === phaseId);
  const label = phaseObj ? `${phaseObj.icon} ${phaseObj.label}` : phaseId.toUpperCase();
  return `<span class="badge blue" style="font-size: 0.72rem; padding: 2px 7px; font-weight: 600;">${label}</span>`;
}

/**
 * Xuất danh mục dự án ra file Excel (CSV UTF-8 BOM)
 */
function exportProjectsToExcel() {
  const { projects } = getState();
  if (!projects || projects.length === 0) {
    alert('Không có dữ liệu dự án để xuất.');
    return;
  }

  let csvContent = '\uFEFF'; // UTF-8 BOM cho Excel
  csvContent += 'Mã dự án,Tên dự án,Loại hình,Chủ đầu tư,Địa điểm,Chủ nhiệm (Team Lead),Quy mô đội ngũ,Giai đoạn BIM,Tiến độ (%),Sức khỏe mô hình (%),LOD mục tiêu,Clash chưa xử lý,Ngân sách,Ngày bắt đầu,Ngày kết thúc,Trạng thái\n';

  projects.forEach(p => {
    const typeLabel = PROJECT_TYPES[p.type]?.label || p.type || '';
    const statusLabel = PROJECT_STATUSES[p.status]?.label || p.status || '';
    const phaseLabel = BIM_PHASES.find(ph => ph.id === p.currentPhase)?.label || p.currentPhase || '';
    const unresolvedClashes = (p.clashesTotal || 0) - (p.clashesResolved || 0);

    const row = [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${typeLabel}"`,
      `"${(p.client || '').replace(/"/g, '""')}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      `"${(p.teamLead || '').replace(/"/g, '""')}"`,
      `"${p.teamSize || (p.team ? p.team.length : '') || ''}"`,
      `"${phaseLabel}"`,
      `"${p.progress || 0}%"`,
      `"${p.modelHealth || 0}%"`,
      `"LOD ${p.lodTarget || ''}"`,
      `"${unresolvedClashes}"`,
      `"${(p.budget || '').replace(/"/g, '""')}"`,
      `"${formatDateVN(p.startDate)}"`,
      `"${formatDateVN(p.endDate)}"`,
      `"${statusLabel}"`
    ];

    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VSI_BIM_Projects_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Hộp thoại xác nhận xóa dự án an toàn (Cam kết an toàn dữ liệu, tự động tạo Snapshot)
 */
export function promptSafeDeleteProject(projectId, onDone) {
  const { projects } = getState();
  const project = (projects || []).find(p => p.id === projectId);
  if (!project) return;

  const taskCount = (project.tasks || []).length;
  const memberCount = (project.team || []).length || project.teamSize || 0;

  const html = `
    <div style="text-align: center; padding: 16px 8px;">
      <div style="font-size: 3rem; margin-bottom: 12px;">⚠️</div>
      <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--accent-danger, #ef4444); margin: 0 0 8px 0;">
        Xác nhận xóa dự án
      </h3>
      <div style="font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
        ${project.name}
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
        Mã: <strong>${project.code || project.id}</strong> · CĐT: ${project.client || '—'} · Quy mô: ${taskCount} công việc (${memberCount} nhân sự)
      </div>
      
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 14px; margin-bottom: 20px; text-align: left; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
        <div style="font-weight: 700; color: var(--accent-danger, #ef4444); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          🛡️ Cam kết an toàn dữ liệu:
        </div>
        • Hệ thống <strong>tự động lưu Điểm phục hồi (Snapshot)</strong> ngay lập tức trước khi xóa.<br/>
        • Bạn có thể <strong>khôi phục lại nguyên vẹn</strong> dự án bất kỳ lúc nào tại mục <em>Điểm phục hồi</em> ở thanh công cụ.<br/>
        • Hồ sơ nhân sự và toàn bộ các dự án khác hoàn toàn được bảo vệ, không bị ảnh hưởng.
      </div>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button type="button" class="btn btn-ghost" id="confirm-del-proj-cancel" style="min-width: 110px;">Hủy bỏ</button>
        <button type="button" class="btn" id="confirm-del-proj-submit" style="background: var(--accent-danger, #ef4444); color: white; min-width: 140px; font-weight: 600;">
          🗑️ Xác nhận xóa
        </button>
      </div>
    </div>
  `;

  openModal('Xác nhận xóa dự án', html);

  setTimeout(() => {
    document.getElementById('confirm-del-proj-cancel')?.addEventListener('click', closeModal);
    document.getElementById('confirm-del-proj-submit')?.addEventListener('click', () => {
      const success = deleteProject(projectId);
      closeModal();
      if (success) {
        showToast(`Đã xóa dự án "${project.name}". Điểm phục hồi đã được lưu an toàn.`);
        if (onDone) onDone();
      } else {
        showToast('Không thể xóa dự án. Vui lòng thử lại.', 'danger');
      }
    });
  }, 50);
}

export function render() {
  const { projects, currentUserRole, currentUser } = getState();
  const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole || currentUser?.role);

  // Thống kê cho 5 thẻ KPI
  const totalCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'active').length;
  const planningCount = projects.filter(p => p.status === 'planning').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const riskCount = projects.filter(p => isProjectAtRisk(p)).length;

  // Thu thập danh sách Chủ nhiệm (Team Leads) không trùng lặp
  const teamLeadsSet = new Set();
  projects.forEach(p => {
    if (p.teamLead && p.teamLead.trim()) teamLeadsSet.add(p.teamLead.trim());
  });
  const allTeamLeads = Array.from(teamLeadsSet).sort();

  // Lọc dữ liệu
  let filteredProjects = [...projects];

  // 1. Lọc theo tìm kiếm từ khóa
  if (localSearch) {
    const q = localSearch.toLowerCase();
    filteredProjects = filteredProjects.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.client && p.client.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q)) ||
      (p.teamLead && p.teamLead.toLowerCase().includes(q))
    );
  }

  // 2. Lọc theo loại hình
  if (localType !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.type === localType);
  }

  // 3. Lọc theo trạng thái & KPI click
  if (localStatus === 'risk') {
    filteredProjects = filteredProjects.filter(p => isProjectAtRisk(p));
  } else if (localStatus !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.status === localStatus);
  }

  // 4. Lọc theo Team Lead
  if (localTeamLead !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.teamLead === localTeamLead);
  }

  // 5. Sắp xếp dữ liệu
  filteredProjects.sort((a, b) => {
    let comp = 0;
    if (localSortBy === 'name') {
      comp = (a.name || '').localeCompare(b.name || '');
    } else if (localSortBy === 'progress') {
      comp = (a.progress || 0) - (b.progress || 0);
    } else if (localSortBy === 'budget') {
      comp = parseBudgetValue(a.budget) - parseBudgetValue(b.budget);
    } else if (localSortBy === 'endDate') {
      const dA = a.endDate ? new Date(a.endDate).getTime() : 0;
      const dB = b.endDate ? new Date(b.endDate).getTime() : 0;
      comp = dA - dB;
    } else if (localSortBy === 'modelHealth') {
      comp = (a.modelHealth || 0) - (b.modelHealth || 0);
    } else {
      // 'id' mặc định
      comp = (a.id || '').localeCompare(b.id || '');
    }
    return localSortOrder === 'desc' ? -comp : comp;
  });

  /**
   * RENDER BẢNG DỮ LIỆU THÔNG MINH (TABLE VIEW)
   */
  const renderTable = (projectsToRender) => {
    if (projectsToRender.length === 0) {
      return `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
          <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">Không tìm thấy dự án phù hợp</div>
          <div style="font-size: 0.85rem;">Hãy thử xóa bộ lọc tìm kiếm hoặc chọn lại trạng thái khác.</div>
          <button type="button" class="btn btn-outline btn-sm btn-clear-filters" style="margin-top: 14px;">Xóa bộ lọc</button>
        </div>
      `;
    }

    return `
      <div style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; min-width: 1100px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); background: var(--bg-secondary);">
              <th style="padding: 12px 14px; text-align: left; width: 280px; cursor: pointer;" class="sort-header" data-sort="name">
                Dự án ${localSortBy === 'name' ? (localSortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style="padding: 12px 12px; text-align: left; width: 170px;">Chủ đầu tư</th>
              <th style="padding: 12px 12px; text-align: left; width: 150px;">Chủ nhiệm (PM)</th>
              <th style="padding: 12px 10px; text-align: center; width: 100px;">Giai đoạn</th>
              <th style="padding: 12px 12px; text-align: left; width: 130px; cursor: pointer;" class="sort-header" data-sort="progress">
                Tiến độ ${localSortBy === 'progress' ? (localSortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style="padding: 12px 10px; text-align: center; width: 130px; cursor: pointer;" class="sort-header" data-sort="modelHealth">
                Chỉ số BIM ${localSortBy === 'modelHealth' ? (localSortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style="padding: 12px 12px; text-align: right; width: 120px; cursor: pointer;" class="sort-header" data-sort="budget">
                Ngân sách ${localSortBy === 'budget' ? (localSortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style="padding: 12px 12px; text-align: center; width: 120px; cursor: pointer;" class="sort-header" data-sort="endDate">
                Hạn nộp ${localSortBy === 'endDate' ? (localSortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style="padding: 12px 12px; text-align: center; width: 120px;">Trạng thái</th>
              <th style="padding: 12px 12px; text-align: center; width: 100px;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${projectsToRender.map(p => {
              const icon = p.type === 'bridge' ? '🌉' : p.type === 'tunnel' ? '🚇' : p.type === 'interchange' ? '🔀' : '🛣️';
              const isRisk = isProjectAtRisk(p);
              const unresolvedClashes = (p.clashesTotal || 0) - (p.clashesResolved || 0);

              // Cảnh báo hạn
              let deadlineNotice = '';
              if (p.endDate) {
                const now = new Date();
                const end = new Date(p.endDate);
                const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                if (p.status !== 'completed') {
                  if (days < 0) {
                    deadlineNotice = `<span class="badge red" style="font-size: 0.65rem; padding: 1px 4px; display: block; margin-top: 2px;">Trễ ${Math.abs(days)}d</span>`;
                  } else if (days <= 30) {
                    deadlineNotice = `<span class="badge orange" style="font-size: 0.65rem; padding: 1px 4px; display: block; margin-top: 2px;">Còn ${days}d</span>`;
                  }
                }
              }

              // Màu model health
              const mh = p.modelHealth || 0;
              const mhColor = mh >= 80 ? '#10b981' : mh >= 65 ? '#f59e0b' : '#ef4444';

              return `
                <tr class="row-project-link" data-id="${p.id}" style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                  <!-- Cột Dự án -->
                  <td style="padding: 12px 14px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="font-size: 1.5rem; width: 36px; height: 36px; border-radius: 8px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--border-subtle);">
                        ${icon}
                      </div>
                      <div style="overflow: hidden;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <span class="font-bold text-accent" style="font-size: 0.88rem; color: var(--accent-primary); line-height: 1.25;">
                            ${p.name}
                          </span>
                          ${p.priority === 'critical' ? '<span class="badge red" style="font-size: 0.62rem; padding: 1px 4px;">Gấp</span>' : ''}
                          ${isRisk ? '<span title="Dự án cần chú ý đặc biệt" style="font-size: 0.8rem;">⚠️</span>' : ''}
                        </div>
                        <div class="text-xs text-muted" style="margin-top: 3px; font-size: 0.75rem;">
                          <strong>${p.id}</strong>${p.code ? ` · ${p.code}` : ''} ${p.location ? `· ${p.location}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Chủ đầu tư -->
                  <td style="padding: 12px 12px; font-size: 0.82rem; color: var(--text-secondary);">
                    ${p.client || '—'}
                  </td>

                  <!-- Chủ nhiệm (Team Lead) -->
                  <td style="padding: 12px 12px; font-size: 0.82rem;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="font-size: 0.95rem;">👤</span>
                      <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${p.teamLead || 'Chưa gán'}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">${p.teamSize ? `${p.teamSize} thành viên` : ''}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Giai đoạn BIM -->
                  <td style="padding: 12px 10px; text-align: center;">
                    ${getPhaseBadge(p.currentPhase)}
                  </td>

                  <!-- Tiến độ -->
                  <td style="padding: 12px 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="progress-bar" style="flex: 1; height: 6px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill ${p.progress >= 80 ? 'green' : p.progress >= 40 ? '' : 'orange'}" style="width: ${p.progress || 0}%; height: 100%;"></div>
                      </div>
                      <span class="text-xs font-bold" style="width: 32px; text-align: right; font-size: 0.82rem;">${p.progress || 0}%</span>
                    </div>
                  </td>

                  <!-- Chỉ số BIM (Model Health + Clash) -->
                  <td style="padding: 12px 10px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem;">
                      <span style="font-weight: 700; color: ${mhColor};" title="Sức khỏe mô hình">${mh}%</span>
                      ${p.lodTarget ? `<span class="badge" style="font-size: 0.65rem; padding: 1px 4px; background: var(--bg-tertiary);">LOD ${p.lodTarget}</span>` : ''}
                      ${unresolvedClashes > 0 ? `<span class="badge ${unresolvedClashes > 30 ? 'red' : 'orange'}" style="font-size: 0.65rem; padding: 1px 4px;" title="Số Clash chưa xử lý">⚡${unresolvedClashes}</span>` : ''}
                    </div>
                  </td>

                  <!-- Ngân sách -->
                  <td style="padding: 12px 12px; text-align: right; font-size: 0.82rem; font-weight: 600; color: var(--text-primary);">
                    ${p.budget || '—'}
                  </td>

                  <!-- Hạn hoàn thành -->
                  <td style="padding: 12px 12px; text-align: center; font-size: 0.78rem;">
                    <div>${formatDateVN(p.endDate)}</div>
                    ${deadlineNotice}
                  </td>

                  <!-- Trạng thái -->
                  <td style="padding: 12px 12px; text-align: center;">
                    ${getStatusBadge(p.status)}
                  </td>

                  <!-- Thao tác nhanh -->
                  <td style="padding: 12px 12px; text-align: center; white-space: nowrap;">
                    <div style="display: flex; gap: 4px; justify-content: center; align-items: center;" onclick="event.stopPropagation();">
                      ${(p.drawingData || p.id === 'P007') ? `
                        <button type="button" class="btn btn-ghost btn-xs btn-open-drawings" data-id="${p.id}" title="Theo dõi tiến độ bản vẽ" style="padding: 3px 6px; color: #0284c7;">
                          📐
                        </button>
                      ` : ''}
                      <a href="#project-detail/${p.id}" class="btn btn-ghost btn-xs text-primary" title="Xem chi tiết dự án" style="padding: 3px 6px;">
                        →
                      </a>
                      ${isManager ? `
                        <button type="button" class="btn btn-ghost btn-xs text-danger btn-delete-project-action" data-id="${p.id}" title="Xóa dự án (Cam kết an toàn dữ liệu)" style="padding: 3px 6px; color: var(--accent-danger, #ef4444);">
                          🗑️
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  /**
   * RENDER CHẾ ĐỘ THẺ DỰ ÁN TRỰC QUAN (CARD GRID VIEW)
   */
  const renderCards = (projectsToRender) => {
    if (projectsToRender.length === 0) {
      return `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
          <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Không tìm thấy dự án phù hợp</div>
          <button type="button" class="btn btn-outline btn-sm btn-clear-filters" style="margin-top: 14px;">Xóa bộ lọc</button>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; padding: 4px 0;">
        ${projectsToRender.map(p => {
          const icon = p.type === 'bridge' ? '🌉' : p.type === 'tunnel' ? '🚇' : p.type === 'interchange' ? '🔀' : '🛣️';
          const isRisk = isProjectAtRisk(p);
          const unresolvedClashes = (p.clashesTotal || 0) - (p.clashesResolved || 0);
          const mh = p.modelHealth || 0;
          const mhColor = mh >= 80 ? '#10b981' : mh >= 65 ? '#f59e0b' : '#ef4444';

          return `
            <div class="card project-card-item row-project-link" data-id="${p.id}" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; border: ${isRisk ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)'};" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)';">
              <div>
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 1.6rem; width: 42px; height: 42px; border-radius: 10px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-subtle);">
                      ${icon}
                    </div>
                    <div>
                      <div class="font-bold text-accent" style="font-size: 0.95rem; line-height: 1.3; color: var(--text-primary);">
                        ${p.name}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                        <strong>${p.id}</strong> · ${p.location || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                  <div>
                    ${getStatusBadge(p.status)}
                  </div>
                </div>

                <!-- Meta Details -->
                <div style="background: var(--bg-tertiary); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Chủ đầu tư:</span>
                    <strong style="color: var(--text-primary); text-align: right; max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.client || '—'}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-muted);">Chủ nhiệm:</span>
                    <span style="color: var(--text-primary); font-weight: 600;">👤 ${p.teamLead || 'Chưa gán'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-muted);">Giai đoạn:</span>
                    <span>${getPhaseBadge(p.currentPhase)}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">Tiến độ hoàn thành</span>
                    <span style="font-size: 0.85rem; font-weight: 800; color: var(--accent-primary);">${p.progress || 0}%</span>
                  </div>
                  <div class="progress-bar" style="height: 7px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                    <div class="progress-bar-fill ${p.progress >= 80 ? 'green' : p.progress >= 40 ? '' : 'orange'}" style="width: ${p.progress || 0}%; height: 100%;"></div>
                  </div>
                </div>

                <!-- BIM Metrics Chips -->
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;">
                  <span class="badge" style="font-size: 0.7rem; padding: 2px 7px; background: rgba(16, 185, 129, 0.1); color: ${mhColor}; border: 1px solid rgba(16, 185, 129, 0.2);">
                    Model: <strong>${mh}%</strong>
                  </span>
                  ${p.lodTarget ? `
                    <span class="badge" style="font-size: 0.7rem; padding: 2px 7px; background: var(--bg-secondary); border: 1px solid var(--border-subtle);">
                      📐 LOD ${p.lodTarget}
                    </span>
                  ` : ''}
                  ${unresolvedClashes > 0 ? `
                    <span class="badge ${unresolvedClashes > 30 ? 'red' : 'orange'}" style="font-size: 0.7rem; padding: 2px 7px;">
                      ⚡ ${unresolvedClashes} Clash
                    </span>
                  ` : ''}
                  ${p.budget ? `
                    <span class="badge" style="font-size: 0.7rem; padding: 2px 7px; background: var(--bg-secondary); border: 1px solid var(--border-subtle);">
                      💰 ${p.budget}
                    </span>
                  ` : ''}
                </div>
              </div>

              <!-- Card Footer Action -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 10px; margin-top: 6px;" onclick="event.stopPropagation();">
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                  📅 Hạn: ${formatDateVN(p.endDate)}
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  ${(p.drawingData || p.id === 'P007') ? `
                    <button type="button" class="btn btn-outline btn-xs btn-open-drawings" data-id="${p.id}" style="font-size: 0.75rem; padding: 3px 8px; color: #0284c7; border-color: rgba(2, 132, 199, 0.3);">
                      📐 Bản vẽ
                    </button>
                  ` : ''}
                  <a href="#project-detail/${p.id}" class="btn btn-primary btn-xs" style="font-size: 0.75rem; padding: 3px 10px;">
                    Chi tiết →
                  </a>
                  ${isManager ? `
                    <button type="button" class="btn btn-ghost btn-xs text-danger btn-delete-project-action" data-id="${p.id}" title="Xóa dự án (Cam kết an toàn dữ liệu)" style="font-size: 0.85rem; padding: 3px 6px; color: var(--accent-danger, #ef4444);">
                      🗑️
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  // Lưu hàm render vào window để hàm init có thể tái sử dụng
  window.__projectListRenderContent = () => {
    return currentViewMode === 'table' ? renderTable(filteredProjects) : renderCards(filteredProjects);
  };

  return `
    <div class="animate-fade-in-up">
      <!-- Section Header -->
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
        <div>
          <h1 class="section-title" style="margin: 0; display: flex; align-items: center; gap: 8px;">
            📁 Danh mục Dự án BIM
          </h1>
          <div class="section-subtitle" style="margin-top: 4px;">
            Quản lý danh mục portfolio dự án hạ tầng giao thông · Tiến độ & Chỉ số sức khỏe mô hình
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <!-- Switch Bảng / Thẻ -->
          <div style="background: var(--bg-tertiary); padding: 3px; border-radius: 8px; border: 1px solid var(--border-subtle); display: flex; gap: 2px;">
            <button type="button" class="btn btn-xs ${currentViewMode === 'table' ? 'btn-primary' : 'btn-ghost'} btn-view-mode" data-mode="table" style="font-size: 0.75rem; padding: 4px 10px; font-weight: 600;">
              📋 Bảng
            </button>
            <button type="button" class="btn btn-xs ${currentViewMode === 'cards' ? 'btn-primary' : 'btn-ghost'} btn-view-mode" data-mode="cards" style="font-size: 0.75rem; padding: 4px 10px; font-weight: 600;">
              🗂️ Thẻ
            </button>
          </div>

          <!-- Nút Xuất Excel -->
          <button type="button" class="btn btn-outline btn-sm" id="btn-export-projects-excel" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4); display: flex; align-items: center; gap: 5px; font-weight: 600;" title="Xuất danh sách ra file Excel">
            📥 Xuất Excel
          </button>

          <!-- Nút Tạo dự án mới (Chỉ hiện cho cấp quản lý) -->
          ${isManager ? `
            <button type="button" class="btn btn-primary btn-sm" id="btn-create-project-top" style="display: flex; align-items: center; gap: 5px; font-weight: 600;">
              <span style="font-size: 1rem;">+</span> Tạo dự án mới
            </button>
          ` : ''}
        </div>
      </div>

      <!-- 5 Thẻ KPI Tương tác 1-Click (Interactive Filter Cards) -->
      <div class="kpi-grid mb-lg" style="grid-template-columns: repeat(5, 1fr); gap: 12px;">
        <!-- 1. Tất cả dự án -->
        <div class="kpi-card blue kpi-filter-card ${localStatus === 'all' ? 'active-kpi-card' : ''}" data-filter-status="all" style="cursor: pointer; transition: all 0.2s; position: relative;" title="Bấm để xem tất cả dự án">
          <div class="kpi-card-value">${totalCount}</div>
          <div class="kpi-card-label">Tổng dự án</div>
          ${localStatus === 'all' ? '<span style="position: absolute; top: 6px; right: 8px; font-size: 0.65rem; color: var(--accent-primary); font-weight: 700;">● Đang lọc</span>' : ''}
        </div>

        <!-- 2. Đang triển khai -->
        <div class="kpi-card green kpi-filter-card ${localStatus === 'active' ? 'active-kpi-card' : ''}" data-filter-status="active" style="cursor: pointer; transition: all 0.2s; position: relative;" title="Bấm để lọc dự án đang triển khai">
          <div class="kpi-card-value">${activeCount}</div>
          <div class="kpi-card-label">Đang triển khai</div>
          ${localStatus === 'active' ? '<span style="position: absolute; top: 6px; right: 8px; font-size: 0.65rem; color: #10b981; font-weight: 700;">● Đang lọc</span>' : ''}
        </div>

        <!-- 3. Đang lập kế hoạch -->
        <div class="kpi-card orange kpi-filter-card ${localStatus === 'planning' ? 'active-kpi-card' : ''}" data-filter-status="planning" style="cursor: pointer; transition: all 0.2s; position: relative;" title="Bấm để lọc dự án đang lập kế hoạch">
          <div class="kpi-card-value">${planningCount}</div>
          <div class="kpi-card-label">Đang lập kế hoạch</div>
          ${localStatus === 'planning' ? '<span style="position: absolute; top: 6px; right: 8px; font-size: 0.65rem; color: #f59e0b; font-weight: 700;">● Đang lọc</span>' : ''}
        </div>

        <!-- 4. Cần chú ý / Rủi ro -->
        <div class="kpi-card red kpi-filter-card ${localStatus === 'risk' ? 'active-kpi-card' : ''}" data-filter-status="risk" style="cursor: pointer; transition: all 0.2s; position: relative;" title="Bấm để lọc các dự án có rủi ro / sắp trễ hạn / Clash cao">
          <div class="kpi-card-value" style="color: #ef4444;">${riskCount}</div>
          <div class="kpi-card-label">Cần chú ý / Rủi ro ⚠️</div>
          ${localStatus === 'risk' ? '<span style="position: absolute; top: 6px; right: 8px; font-size: 0.65rem; color: #ef4444; font-weight: 700;">● Đang lọc</span>' : ''}
        </div>

        <!-- 5. Đã hoàn thành -->
        <div class="kpi-card purple kpi-filter-card ${localStatus === 'completed' ? 'active-kpi-card' : ''}" data-filter-status="completed" style="cursor: pointer; transition: all 0.2s; position: relative;" title="Bấm để lọc dự án đã hoàn thành">
          <div class="kpi-card-value">${completedCount}</div>
          <div class="kpi-card-label">Đã hoàn thành</div>
          ${localStatus === 'completed' ? '<span style="position: absolute; top: 6px; right: 8px; font-size: 0.65rem; color: #8b5cf6; font-weight: 700;">● Đang lọc</span>' : ''}
        </div>
      </div>

      <!-- Filters & Sorting Toolbar -->
      <div class="card mb-md" style="padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border-subtle);">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <!-- Tìm kiếm từ khóa -->
          <div style="flex: 1; min-width: 220px; position: relative;">
            <input type="text" id="pl-search" class="form-input" placeholder="🔍 Tìm kiếm theo tên, mã, CĐT, địa điểm, chủ nhiệm..." value="${localSearch}" style="width: 100%; padding-right: 28px;">
            ${localSearch ? '<button type="button" id="btn-clear-search" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.85rem;">✕</button>' : ''}
          </div>

          <!-- Lọc Loại hình -->
          <select id="pl-type" class="form-select" style="width: 140px; font-size: 0.82rem;">
            <option value="all" ${localType === 'all' ? 'selected' : ''}>Mọi loại hình</option>
            <option value="road" ${localType === 'road' ? 'selected' : ''}>🛣️ Đường bộ</option>
            <option value="bridge" ${localType === 'bridge' ? 'selected' : ''}>🌉 Cầu</option>
            <option value="tunnel" ${localType === 'tunnel' ? 'selected' : ''}>🚇 Hầm</option>
            <option value="interchange" ${localType === 'interchange' ? 'selected' : ''}>🔀 Nút giao</option>
          </select>

          <!-- Lọc Trạng thái -->
          <select id="pl-status" class="form-select" style="width: 150px; font-size: 0.82rem;">
            <option value="all" ${localStatus === 'all' ? 'selected' : ''}>Mọi trạng thái</option>
            <option value="active" ${localStatus === 'active' ? 'selected' : ''}>🟢 Đang chạy</option>
            <option value="planning" ${localStatus === 'planning' ? 'selected' : ''}>🟡 Lập kế hoạch</option>
            <option value="risk" ${localStatus === 'risk' ? 'selected' : ''}>🔴 Cần chú ý (Rủi ro)</option>
            <option value="on-hold" ${localStatus === 'on-hold' ? 'selected' : ''}>⚪ Tạm dừng</option>
            <option value="completed" ${localStatus === 'completed' ? 'selected' : ''}>🟣 Hoàn thành</option>
          </select>

          <!-- Lọc Chủ nhiệm (Team Lead) -->
          <select id="pl-team-lead" class="form-select" style="width: 160px; font-size: 0.82rem;">
            <option value="all" ${localTeamLead === 'all' ? 'selected' : ''}>Tất cả chủ nhiệm</option>
            ${allTeamLeads.map(lead => `<option value="${lead}" ${localTeamLead === lead ? 'selected' : ''}>👤 ${lead}</option>`).join('')}
          </select>

          <!-- Sắp xếp theo -->
          <div style="display: flex; align-items: center; gap: 4px;">
            <select id="pl-sort-by" class="form-select" style="width: 150px; font-size: 0.82rem;">
              <option value="id" ${localSortBy === 'id' ? 'selected' : ''}>Mã dự án</option>
              <option value="name" ${localSortBy === 'name' ? 'selected' : ''}>Tên dự án</option>
              <option value="progress" ${localSortBy === 'progress' ? 'selected' : ''}>Tiến độ</option>
              <option value="modelHealth" ${localSortBy === 'modelHealth' ? 'selected' : ''}>Chỉ số BIM</option>
              <option value="budget" ${localSortBy === 'budget' ? 'selected' : ''}>Ngân sách</option>
              <option value="endDate" ${localSortBy === 'endDate' ? 'selected' : ''}>Hạn hoàn thành</option>
            </select>
            <button type="button" class="btn btn-outline btn-sm btn-toggle-sort-order" style="padding: 5px 8px;" title="Đảo thứ tự Tăng/Giảm">
              ${localSortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>

          <!-- Nút xóa nhanh tất cả bộ lọc nếu đang lọc -->
          ${(localSearch || localType !== 'all' || localStatus !== 'all' || localTeamLead !== 'all') ? `
            <button type="button" class="btn btn-ghost btn-sm text-danger btn-clear-filters" style="font-size: 0.78rem; padding: 5px 8px;">
              ✕ Xóa lọc
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Khung hiển thị kết quả -->
      <div class="card p-0" id="pl-content-container" style="background: var(--bg-card); border: 1px solid var(--border-subtle); overflow: hidden;">
        ${currentViewMode === 'table' ? renderTable(filteredProjects) : renderCards(filteredProjects)}
      </div>

      <style>
        .active-kpi-card {
          box-shadow: 0 0 0 2px var(--accent-primary) !important;
          transform: translateY(-2px);
        }
        .sort-header:hover {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
        }
      </style>
    </div>
  `;
}

export function init() {
  const container = document.getElementById('page-content');
  if (!container) return;

  // Gán sự kiện click vào từng dòng dự án để điều hướng
  const bindNavigationEvents = () => {
    document.querySelectorAll('.row-project-link').forEach(row => {
      row.addEventListener('click', (e) => {
        // Tránh kích hoạt nếu click vào nút bên trong
        if (e.target.closest('button') || e.target.closest('a')) return;
        const pId = row.dataset.id;
        if (pId) window.location.hash = '#project-detail/' + pId;
      });
    });

    // Nút mở trang Theo dõi tiến độ bản vẽ
    document.querySelectorAll('.btn-open-drawings').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = e.currentTarget.dataset.id;
        const { setState } = getState();
        // Cập nhật selectedProjectId và chuyển trang
        import('../state.js').then(mod => {
          mod.setState('selectedProjectId', pId);
          window.location.hash = '#project-detail/' + pId;
        });
      });
    });

    // Nút xóa dự án an toàn (chỉ hiển thị cho Manager/Admin)
    document.querySelectorAll('.btn-delete-project-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = e.currentTarget.dataset.id;
        promptSafeDeleteProject(pId, refreshList);
      });
    });
  };

  bindNavigationEvents();

  // Hàm refresh nhanh nội dung không tải lại toàn trang
  const refreshList = () => {
    const parentContainer = document.getElementById('page-content');
    if (parentContainer) {
      parentContainer.innerHTML = render();
      init();
    }
  };

  // 1. Tìm kiếm từ khóa
  let searchTimeout;
  document.getElementById('pl-search')?.addEventListener('input', (e) => {
    localSearch = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(refreshList, 250);
  });

  // Nút xóa nhanh ô tìm kiếm
  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    localSearch = '';
    refreshList();
  });

  // 2. Lọc loại hình
  document.getElementById('pl-type')?.addEventListener('change', (e) => {
    localType = e.target.value;
    refreshList();
  });

  // 3. Lọc trạng thái
  document.getElementById('pl-status')?.addEventListener('change', (e) => {
    localStatus = e.target.value;
    refreshList();
  });

  // 4. Lọc theo Chủ nhiệm (Team Lead)
  document.getElementById('pl-team-lead')?.addEventListener('change', (e) => {
    localTeamLead = e.target.value;
    refreshList();
  });

  // 5. Thay đổi cột sắp xếp
  document.getElementById('pl-sort-by')?.addEventListener('change', (e) => {
    localSortBy = e.target.value;
    refreshList();
  });

  // Đảo chiều sắp xếp (Asc / Desc)
  document.querySelector('.btn-toggle-sort-order')?.addEventListener('click', () => {
    localSortOrder = localSortOrder === 'asc' ? 'desc' : 'asc';
    refreshList();
  });

  // Bấm vào tiêu đề cột trên bảng để sort nhanh
  document.querySelectorAll('.sort-header').forEach(th => {
    th.addEventListener('click', (e) => {
      const sortKey = e.currentTarget.dataset.sort;
      if (localSortBy === sortKey) {
        localSortOrder = localSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        localSortBy = sortKey;
        localSortOrder = 'asc';
      }
      refreshList();
    });
  });

  // 6. Click trực tiếp vào 5 thẻ KPI để lọc 1-Click
  document.querySelectorAll('.kpi-filter-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const targetStatus = e.currentTarget.dataset.filterStatus;
      if (localStatus === targetStatus && targetStatus !== 'all') {
        localStatus = 'all'; // Click lần 2 để reset
      } else {
        localStatus = targetStatus;
      }
      refreshList();
    });
  });

  // 7. Chuyển đổi Bảng (Table) / Thẻ (Cards)
  document.querySelectorAll('.btn-view-mode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentViewMode = e.currentTarget.dataset.mode;
      refreshList();
    });
  });

  // 8. Xóa tất cả bộ lọc
  document.querySelectorAll('.btn-clear-filters').forEach(btn => {
    btn.addEventListener('click', () => {
      localSearch = '';
      localType = 'all';
      localStatus = 'all';
      localTeamLead = 'all';
      refreshList();
    });
  });

  // 9. Nút xuất Excel
  document.getElementById('btn-export-projects-excel')?.addEventListener('click', exportProjectsToExcel);

  // 10. Nút tạo dự án mới
  document.getElementById('btn-create-project-top')?.addEventListener('click', () => {
    openProjectForm('add', null, () => {
      refreshList();
    });
  });
}

export function destroy() {
  delete window.__projectListRenderContent;
}

