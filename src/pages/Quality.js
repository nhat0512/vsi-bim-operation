// ============================================
// QUALITY — BIM Quality Control & Clash Detection (Dark Theme)
// Deep Navy (#0F1B3D), Card (#132047), Accent Amber (#F5A623)
// ============================================
import { getState, setState, updateProject } from '../state.js';
import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/ProjectFormModal.js';
import { formatLocalDate } from '../utils/formatters.js';

let clashChartInstance = null;
let currentSubTab = 'clashes'; // 'clashes' | 'lod' | 'bep'
let currentActiveProjectId = null;

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if a clash belongs to a project (supports ID, Code, Name substring, and clashSummary cross-matching)
 */
function isClashBelongToProject(c, project, clashSummary = []) {
  if (!project) return true;
  if (c.projectId && c.projectId === project.id) return true;
  if (c.project === project.id || c.project === project.code) return true;
  if (!c.project) return false;

  const cName = String(c.project).toLowerCase().trim();
  const pName = String(project.name || '').toLowerCase().trim();
  const pCode = String(project.code || '').toLowerCase().trim();

  if (cName === pName || (pCode && cName === pCode)) return true;
  if (pName.includes(cName) || cName.includes(pName)) return true;

  // Cross check with clashSummary entries
  const matchedSummary = clashSummary.find(s => s.projectId === project.id || (s.projectName && pName.includes(String(s.projectName).toLowerCase())));
  if (matchedSummary && matchedSummary.projectName) {
    const sName = String(matchedSummary.projectName).toLowerCase();
    if (cName.includes(sName) || sName.includes(cName)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter and compute Quality Data based on project context
 */
function getProjectQualityContext(projectId) {
  const { qualityData, projects } = getState();
  if (!qualityData) return null;

  const project = projectId ? (projects || []).find(p => p.id === projectId) : null;
  const isSingleProject = Boolean(project);

  // Filter clash summaries
  let clashSummary = qualityData.clashSummary || [];
  if (isSingleProject) {
    const summaryItem = clashSummary.find(s => s.projectId === project.id || s.projectName === project.name || (project.name && project.name.includes(s.projectName)));
    clashSummary = summaryItem ? [summaryItem] : [{
      projectId: project.id,
      projectName: project.name,
      total: project.clashesTotal || 0,
      newClashes: Math.max(0, (project.clashesTotal || 0) - (project.clashesResolved || 0)),
      inProgress: 0,
      resolved: project.clashesResolved || 0,
      critical: 0
    }];
  }

  // Filter recent clashes
  let recentClashes = qualityData.recentClashes || [];
  if (isSingleProject) {
    recentClashes = recentClashes.filter(c => isClashBelongToProject(c, project, qualityData.clashSummary || []));
  }

  // Filter LOD tracking
  let lodTracking = qualityData.lodTracking || [];
  if (isSingleProject) {
    lodTracking = lodTracking.filter(l => l.projectId === project.id);
  }

  // Checklist
  const bepChecklist = qualityData.bepChecklist || [];

  // Recompute scores for single project or use global scores
  let overallScore = qualityData.overallScore || 80;
  let bepCompliance = qualityData.bepCompliance || 85;
  let lodCompliance = qualityData.lodCompliance || 75;
  let modelConsistency = qualityData.modelConsistency || 82;
  let clashScore = qualityData.clashScore || 78;

  if (isSingleProject) {
    const totalC = clashSummary[0]?.total || 0;
    const resC = clashSummary[0]?.resolved || 0;
    clashScore = totalC > 0 ? Math.round((resC / totalC) * 100) : 90;

    if (lodTracking.length > 0) {
      const sumLod = lodTracking.reduce((acc, cur) => acc + (cur.compliance || 0), 0);
      lodCompliance = Math.round(sumLod / lodTracking.length);
    } else if (project.lodCurrent && project.lodTarget) {
      lodCompliance = Math.min(100, Math.round((project.lodCurrent / project.lodTarget) * 100));
    }

    if (bepChecklist.length > 0) {
      const passCount = bepChecklist.filter(b => b.status === 'pass').length;
      bepCompliance = Math.round((passCount / bepChecklist.length) * 100);
    }

    overallScore = Math.round((clashScore * 0.4) + (lodCompliance * 0.35) + (bepCompliance * 0.25));
  }

  return {
    isSingleProject,
    project,
    clashSummary,
    recentClashes,
    lodTracking,
    bepChecklist,
    overallScore,
    bepCompliance,
    lodCompliance,
    modelConsistency,
    clashScore
  };
}

/**
 * Render KPI Ring Card (Dark Mode Navy & Amber)
 */
function renderScoreCard(label, score, icon, subtitle = '') {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F5A623' : '#EF4444';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return `
    <div class="quality-kpi-card">
      <div class="quality-ring-wrapper">
        <div class="quality-ring">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle class="quality-ring-bg" cx="45" cy="45" r="40"/>
            <circle class="quality-ring-fill" cx="45" cy="45" r="40" stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
          </svg>
          <div class="quality-ring-value">
            <div class="quality-ring-number">${score}%</div>
          </div>
        </div>
      </div>
      <div style="font-size: 0.88rem; font-weight: 700; color: #F1F5F9; margin-top: 10px; display: flex; align-items: center; gap: 6px;">
        <span>${icon}</span> <span>${label}</span>
      </div>
      ${subtitle ? `<div style="font-size: 0.72rem; color: #94A3B8; margin-top: 2px;">${subtitle}</div>` : ''}
    </div>
  `;
}

/**
 * Render Header Banner with Project Selector Dropdown
 */
function renderHeaderBanner(currentProjId, projects, isEmbedded = false) {
  if (isEmbedded) {
    return ''; // Project is already fixed when embedded inside ProjectDetail
  }

  return `
    <div class="quality-header-banner">
      <div>
        <h1 style="font-size: 1.4rem; font-weight: 800; color: #F1F5F9; margin: 0; display: flex; align-items: center; gap: 8px;">
          <span>⚡</span> <span>Chất lượng BIM & Clash Detection</span>
        </h1>
        <div style="font-size: 0.82rem; color: #94A3B8; margin-top: 4px;">
          Hệ thống kiểm soát chất lượng mô hình, ma trận xung đột và liên kết tự động WBS
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <label for="quality-proj-select" style="font-size: 0.82rem; font-weight: 600; color: #F5A623;">Dự án:</label>
          <select id="quality-proj-select" class="quality-project-select">
            <option value="" ${!currentProjId ? 'selected' : ''}>🌐 Tất cả dự án (Toàn hệ thống)</option>
            ${(projects || []).map(p => `
              <option value="${p.id}" ${p.id === currentProjId ? 'selected' : ''}>
                ${escapeHtml(p.name)} (${p.code})
              </option>
            `).join('')}
          </select>
        </div>

        <div>
          <input type="file" id="import-bcf-file" accept=".bcf,.csv,.xml" style="display: none;">
          <button class="btn-amber-gradient" id="btn-import-bcf" title="Import file từ Navisworks / Solibri">
            <span>📥</span> <span>Import BCF / CSV</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Sub-tabs bar
 */
function renderSubTabsBar(activeTab) {
  return `
    <div class="quality-tabs-bar" id="quality-subtabs">
      <button class="quality-tab-btn ${activeTab === 'clashes' ? 'active' : ''}" data-qtab="clashes">
        <span>⚡</span> <span>Clash Matrix & Xung đột</span>
      </button>
      <button class="quality-tab-btn ${activeTab === 'lod' ? 'active' : ''}" data-qtab="lod">
        <span>📐</span> <span>LOD Tracking</span>
      </button>
      <button class="quality-tab-btn ${activeTab === 'bep' ? 'active' : ''}" data-qtab="bep">
        <span>📋</span> <span>BEP Compliance Checklist</span>
      </button>
    </div>
  `;
}

/**
 * Render Clash Matrix Tab
 */
function renderClashTab(ctx) {
  const { isSingleProject, project, clashSummary, recentClashes } = ctx;
  const newCount = recentClashes.filter(c => c.status === 'new').length;
  const inProgressCount = recentClashes.filter(c => c.status === 'in-progress').length;
  const resolvedCount = recentClashes.filter(c => c.status === 'resolved').length;

  return `
    <!-- Clash Trend Chart Card -->
    <div class="quality-card">
      <div class="quality-card-header">
        <h3 class="quality-card-title">
          <span>📈</span> <span>Biểu đồ xu hướng xử lý Clash (4 tuần gần đây)</span>
        </h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="q-badge q-badge-critical">${newCount} Mới</span>
          <span class="q-badge q-badge-high">${inProgressCount} Đang xử lý</span>
          <span class="q-badge q-badge-low">${resolvedCount} Đã giải quyết</span>
        </div>
      </div>
      <div style="padding: 16px; height: 260px; position: relative;">
        <canvas id="clashTrendChart"></canvas>
      </div>
    </div>

    <!-- Summary per Project (Only shown when viewing all projects) -->
    ${!isSingleProject ? `
      <div class="quality-card">
        <div class="quality-card-header">
          <h3 class="quality-card-title">
            <span>📊</span> <span>Tổng hợp Clash theo từng dự án</span>
          </h3>
          <span style="font-size: 0.78rem; color: #94A3B8;">${clashSummary.length} dự án được ghi nhận</span>
        </div>
        <div class="quality-table-wrapper">
          <table class="quality-borderless-table">
            <thead>
              <tr>
                <th>Dự án</th>
                <th style="text-align: center;">Tổng số</th>
                <th style="text-align: center;">Mới</th>
                <th style="text-align: center;">Đang xử lý</th>
                <th style="text-align: center;">Đã xử lý</th>
                <th style="text-align: center;">Nghiêm trọng</th>
                <th style="width: 180px;">Tỷ lệ giải quyết</th>
                <th style="text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${clashSummary.map(c => {
                const rate = c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0;
                return `
                  <tr>
                    <td style="font-weight: 700; color: #F1F5F9;">${escapeHtml(c.projectName)}</td>
                    <td style="text-align: center; font-weight: 600;">${c.total}</td>
                    <td style="text-align: center;"><span class="q-badge q-badge-critical">${c.newClashes}</span></td>
                    <td style="text-align: center;"><span class="q-badge q-badge-high">${c.inProgress || 0}</span></td>
                    <td style="text-align: center;"><span class="q-badge q-badge-low">${c.resolved}</span></td>
                    <td style="text-align: center;"><span class="q-badge ${c.critical > 5 ? 'q-badge-critical' : 'q-badge-high'}">${c.critical}</span></td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="quality-progress-track" style="flex: 1;">
                          <div class="quality-progress-fill" style="width: ${rate}%;"></div>
                        </div>
                        <span style="font-size: 0.78rem; font-weight: 700; color: #F5A623; min-width: 35px;">${rate}%</span>
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <button class="btn-amber-outline btn-filter-project-clash" data-project-id="${c.projectId || ''}" data-project-name="${escapeHtml(c.projectName)}">
                        <span>🔍</span> <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- Recent Clashes Table -->
    <div class="quality-card">
      <div class="quality-card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h3 class="quality-card-title">
            <span>🔍</span> <span>Danh sách Clash & Xung đột ${isSingleProject ? `— ${escapeHtml(project?.name || '')}` : ''}</span>
          </h3>
          <span class="q-badge q-badge-critical">${newCount} cần gán Task</span>
        </div>
        ${isSingleProject ? `
          <div>
            <input type="file" id="import-bcf-file-local" accept=".bcf,.csv,.xml" style="display: none;">
            <button class="btn-amber-gradient" id="btn-import-bcf-local" title="Import BCF vào riêng dự án này">
              <span>📥</span> <span>Import BCF Dự án</span>
            </button>
          </div>
        ` : ''}
      </div>
      
      <div class="quality-table-wrapper">
        <table class="quality-borderless-table">
          <thead>
            <tr>
              <th style="width: 80px;">Mã ID</th>
              ${!isSingleProject ? '<th>Dự án</th>' : ''}
              <th>Loại</th>
              <th>Bộ môn</th>
              <th style="min-width: 260px;">Mô tả va chạm</th>
              <th>Mức độ</th>
              <th>Phụ trách</th>
              <th>Trạng thái</th>
              <th style="text-align: right; min-width: 140px;">Thao tác WBS</th>
            </tr>
          </thead>
          <tbody>
            ${recentClashes.length === 0 ? `
              <tr>
                <td colspan="${!isSingleProject ? '9' : '8'}" style="text-align: center; padding: 32px; color: #94A3B8;">
                  🎉 Chưa phát hiện va chạm nào trong dự án này!
                </td>
              </tr>
            ` : recentClashes.map(c => {
              const sevBadge = {
                critical: 'q-badge-critical',
                high: 'q-badge-high',
                medium: 'q-badge-medium',
                low: 'q-badge-low'
              };
              const sevLabel = {
                critical: 'Nghiêm trọng',
                high: 'Cao',
                medium: 'Trung bình',
                low: 'Thấp'
              };
              const statBadge = {
                'new': 'q-badge-new',
                'in-progress': 'q-badge-in-progress',
                'resolved': 'q-badge-resolved'
              };
              const statLabel = {
                'new': 'Mới',
                'in-progress': 'Đang xử lý',
                'resolved': 'Đã xử lý'
              };

              return `
                <tr id="clash-row-${c.id}">
                  <td style="font-family: monospace; font-weight: 700; color: #F5A623;">${c.id}</td>
                  ${!isSingleProject ? `<td style="font-size: 0.82rem; font-weight: 600; color: #CBD5E1;">${escapeHtml(c.project)}</td>` : ''}
                  <td>
                    <span class="q-badge ${c.type === 'Hard' ? 'q-badge-critical' : 'q-badge-medium'}">
                      ${c.type || 'Hard'}
                    </span>
                  </td>
                  <td style="font-size: 0.82rem; color: #94A3B8;">${escapeHtml(c.disciplines || 'General')}</td>
                  <td style="font-size: 0.84rem; color: #F1F5F9; line-height: 1.4;">${escapeHtml(c.description)}</td>
                  <td>
                    <span class="q-badge ${sevBadge[c.severity] || 'q-badge-medium'}">
                      ${sevLabel[c.severity] || c.severity}
                    </span>
                  </td>
                  <td style="font-size: 0.84rem; font-weight: 500; color: #CBD5E1;">${escapeHtml(c.assignee || 'Chưa gán')}</td>
                  <td>
                    <span class="q-badge ${statBadge[c.status] || 'q-badge-new'}">
                      ${statLabel[c.status] || c.status}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${c.status === 'new' ? `
                      <button class="btn-amber-gradient btn-create-clash-task" 
                              data-clash-id="${c.id}" 
                              data-project="${escapeHtml(c.project)}" 
                              data-project-id="${c.projectId || ''}" 
                              data-disciplines="${escapeHtml(c.disciplines || '')}" 
                              data-severity="${c.severity || 'high'}" 
                              data-assignee="${escapeHtml(c.assignee || '')}" 
                              data-desc="${escapeHtml(c.description)}">
                        <span>⚡</span> <span>Tạo Task</span>
                      </button>
                    ` : c.status === 'in-progress' ? `
                      <span class="q-badge q-badge-in-progress">⏳ Đang xử lý</span>
                    ` : `
                      <span class="q-badge q-badge-resolved">✅ Đã giải quyết</span>
                    `}
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
 * Render LOD Tracking Tab
 */
function renderLODTab(ctx) {
  const { lodTracking, isSingleProject } = ctx;
  const { projects } = getState();

  return `
    <div class="quality-card">
      <div class="quality-card-header">
        <h3 class="quality-card-title">
          <span>📐</span> <span>Theo dõi độ chi tiết hình học & thông tin (LOD Tracking)</span>
        </h3>
        <span style="font-size: 0.78rem; color: #94A3B8;">Tiêu chuẩn LOD 100 - LOD 500 theo BIM Protocol</span>
      </div>
      <div class="quality-table-wrapper">
        <table class="quality-borderless-table">
          <thead>
            <tr>
              ${!isSingleProject ? '<th>Dự án</th>' : ''}
              <th>Bộ môn / Hạng mục</th>
              <th style="text-align: center;">LOD Mục tiêu</th>
              <th style="text-align: center;">LOD Hiện tại</th>
              <th style="width: 220px;">Mức độ đáp ứng (Compliance)</th>
              <th style="text-align: center;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${lodTracking.length === 0 ? `
              <tr>
                <td colspan="${!isSingleProject ? '6' : '5'}" style="text-align: center; padding: 32px; color: #94A3B8;">
                  Chưa có dữ liệu theo dõi LOD cho bộ lọc hiện tại.
                </td>
              </tr>
            ` : lodTracking.map(l => {
              const proj = (projects || []).find(p => p.id === l.projectId);
              const comp = l.compliance || 0;
              const statusBadge = comp >= 80 ? 'q-badge-low' : comp >= 50 ? 'q-badge-high' : 'q-badge-critical';
              const statusLabel = comp >= 80 ? '✅ Đạt chuẩn' : comp >= 50 ? '⚠️ Cần hoàn thiện' : '❌ Chậm tiến độ';

              return `
                <tr>
                  ${!isSingleProject ? `
                    <td style="font-weight: 700; color: #F1F5F9;">
                      ${escapeHtml(proj ? proj.name : l.projectId)}
                    </td>
                  ` : ''}
                  <td style="font-weight: 600; color: #CBD5E1;">${escapeHtml(l.discipline)}</td>
                  <td style="text-align: center;">
                    <span class="q-badge q-badge-medium">LOD ${l.targetLOD}</span>
                  </td>
                  <td style="text-align: center;">
                    <span class="q-badge ${comp >= 80 ? 'q-badge-low' : 'q-badge-high'}">LOD ${l.currentLOD}</span>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div class="quality-progress-track" style="flex: 1;">
                        <div class="quality-progress-fill" style="width: ${comp}%;"></div>
                      </div>
                      <span style="font-size: 0.78rem; font-weight: 700; color: #F5A623; min-width: 35px;">${comp}%</span>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <span class="q-badge ${statusBadge}">${statusLabel}</span>
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
 * Render BEP Compliance Checklist Tab
 */
function renderBEPTab(ctx) {
  const { bepChecklist } = ctx;
  const passed = bepChecklist.filter(b => b.status === 'pass').length;
  const warnings = bepChecklist.filter(b => b.status === 'warning').length;
  const failed = bepChecklist.filter(b => b.status === 'fail').length;

  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px;">
      <div class="quality-kpi-card" style="border-color: rgba(16, 185, 129, 0.3);">
        <div style="font-size: 1.8rem; font-weight: 800; color: #10B981;">${passed}</div>
        <div style="font-size: 0.85rem; font-weight: 600; color: #F1F5F9; margin-top: 4px;">✅ Đạt chuẩn BEP</div>
      </div>
      <div class="quality-kpi-card" style="border-color: rgba(245, 166, 35, 0.3);">
        <div style="font-size: 1.8rem; font-weight: 800; color: #F5A623;">${warnings}</div>
        <div style="font-size: 0.85rem; font-weight: 600; color: #F1F5F9; margin-top: 4px;">⚠️ Cảnh báo & Lưu ý</div>
      </div>
      <div class="quality-kpi-card" style="border-color: rgba(239, 68, 68, 0.3);">
        <div style="font-size: 1.8rem; font-weight: 800; color: #EF4444;">${failed}</div>
        <div style="font-size: 0.85rem; font-weight: 600; color: #F1F5F9; margin-top: 4px;">❌ Chưa đạt yêu cầu</div>
      </div>
    </div>

    <div class="quality-card">
      <div class="quality-card-header">
        <h3 class="quality-card-title">
          <span>📋</span> <span>BIM Execution Plan (BEP) Compliance Checklist</span>
        </h3>
        <span style="font-size: 0.78rem; color: #94A3B8;">Căn cứ theo kế hoạch triển khai BIM dự án</span>
      </div>
      <div class="quality-table-wrapper">
        <table class="quality-borderless-table">
          <thead>
            <tr>
              <th style="width: 80px;">Mã</th>
              <th>Hạng mục kiểm tra</th>
              <th style="width: 140px; text-align: center;">Trạng thái</th>
              <th>Ghi chú & Biện pháp khắc phục</th>
            </tr>
          </thead>
          <tbody>
            ${bepChecklist.map(b => {
              const statusBadge = b.status === 'pass' ? 'q-badge-low' : b.status === 'warning' ? 'q-badge-high' : 'q-badge-critical';
              const statusLabel = b.status === 'pass' ? '✅ Đạt' : b.status === 'warning' ? '⚠️ Cảnh báo' : '❌ Chưa đạt';
              return `
                <tr>
                  <td style="font-family: monospace; font-weight: 700; color: #F5A623;">${b.id}</td>
                  <td style="font-weight: 600; color: #F1F5F9;">${escapeHtml(b.item)}</td>
                  <td style="text-align: center;"><span class="q-badge ${statusBadge}">${statusLabel}</span></td>
                  <td style="font-size: 0.82rem; color: #94A3B8;">${escapeHtml(b.notes || '—')}</td>
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
 * Main Render function
 */
export function render(projectId = null) {
  // Read project ID from argument, or URL hash (e.g. #quality/P002)
  let targetProjId = projectId;
  if (!targetProjId) {
    const hash = window.location.hash.slice(1) || '';
    const parts = hash.split('/');
    if (parts[0] === 'quality' && parts[1]) {
      targetProjId = parts[1];
    }
  }

  currentActiveProjectId = targetProjId;

  const ctx = getProjectQualityContext(targetProjId);
  if (!ctx) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">⏳</div>
        <div class="empty-state__text">Đang tải dữ liệu Quản lý chất lượng...</div>
      </div>
    `;
  }

  const { projects } = getState();

  return `
    <div class="quality-page quality-dark-theme animate-fade-in-up" id="quality-root">
      ${renderHeaderBanner(targetProjId, projects, false)}

      <!-- Quality Score Overview (5 Dark KPI Cards) -->
      <div class="quality-kpi-grid">
        ${renderScoreCard('Chất lượng chung', ctx.overallScore, '🏆', 'Điểm tổng hợp')}
        ${renderScoreCard('BEP Compliance', ctx.bepCompliance, '📋', 'Tuân thủ BEP')}
        ${renderScoreCard('LOD Compliance', ctx.lodCompliance, '📐', 'Độ chi tiết mô hình')}
        ${renderScoreCard('Tính đồng nhất', ctx.modelConsistency, '🔗', 'Model Consistency')}
        ${renderScoreCard('Điểm Clash', ctx.clashScore, '⚡', 'Tỷ lệ xử lý')}
      </div>

      <!-- Sub Tabs Bar -->
      ${renderSubTabsBar(currentSubTab)}

      <!-- Tab Content Area -->
      <div id="quality-tab-content-area">
        ${currentSubTab === 'clashes' ? renderClashTab(ctx) : currentSubTab === 'lod' ? renderLODTab(ctx) : renderBEPTab(ctx)}
      </div>
    </div>
  `;
}

/**
 * Render Project Quality section specifically for embedding inside ProjectDetail.js
 */
export function renderQualitySection(project) {
  if (!project) return '<div class="empty-state">Không tìm thấy thông tin dự án.</div>';
  
  currentActiveProjectId = project.id;
  const ctx = getProjectQualityContext(project.id);
  if (!ctx) return '';

  return `
    <div class="quality-page quality-dark-theme" id="project-quality-embedded-root" style="padding-top: 8px;">
      <!-- Project Quality KPI Grid -->
      <div class="quality-kpi-grid">
        ${renderScoreCard('Chất lượng dự án', ctx.overallScore, '🏆', escapeHtml(project.name))}
        ${renderScoreCard('LOD Compliance', ctx.lodCompliance, '📐', `Hiện tại: LOD ${project.lodCurrent || 300}`)}
        ${renderScoreCard('BEP Tuân thủ', ctx.bepCompliance, '📋', 'Theo BEP dự án')}
        ${renderScoreCard('Tỷ lệ giải quyết', ctx.clashScore, '⚡', `${ctx.clashSummary[0]?.resolved || 0}/${ctx.clashSummary[0]?.total || 0} Clash`)}
      </div>

      <!-- Sub Tabs Bar -->
      ${renderSubTabsBar(currentSubTab)}

      <!-- Tab Content Area -->
      <div id="project-quality-tab-content">
        ${currentSubTab === 'clashes' ? renderClashTab(ctx) : currentSubTab === 'lod' ? renderLODTab(ctx) : renderBEPTab(ctx)}
      </div>
    </div>
  `;
}

/**
 * Chart.js Dark Mode Line Chart Initialization
 */
function initTrendChart(ctxData) {
  const canvas = document.getElementById('clashTrendChart');
  if (!canvas || !window.Chart) return;

  if (clashChartInstance) {
    clashChartInstance.destroy();
    clashChartInstance = null;
  }

  // Create chart datasets
  const ctx = canvas.getContext('2d');
  const isSingle = ctxData?.isSingleProject;
  
  const newClashesSeries = isSingle ? [24, 18, 9, 3] : [120, 85, 45, 15];
  const inProgressSeries = isSingle ? [8, 12, 10, 6] : [35, 48, 52, 38];
  const resolvedSeries = isSingle ? [12, 28, 42, 65] : [40, 95, 160, 210];

  clashChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
      datasets: [
        {
          label: 'Phát hiện mới',
          data: newClashesSeries,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#EF4444',
          pointBorderColor: '#0F1B3D',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Đang xử lý (WBS)',
          data: inProgressSeries,
          borderColor: '#F5A623',
          backgroundColor: 'rgba(245, 166, 35, 0.12)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#F5A623',
          pointBorderColor: '#0F1B3D',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Đã giải quyết',
          data: resolvedSeries,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#0F1B3D',
          pointBorderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#F1F5F9',
            font: { family: 'Inter', size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#0F1B3D',
          titleColor: '#F5A623',
          bodyColor: '#F1F5F9',
          borderColor: 'rgba(245, 166, 35, 0.4)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { family: 'Inter', size: 11 } },
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Handle "Tạo Task" Button Click & Open Modal
 */
function handleCreateTaskClick(btn) {
  const clashId = btn.dataset.clashId;
  const { qualityData, projects, personnel } = getState();
  if (!qualityData) return;

  const clash = (qualityData.recentClashes || []).find(c => c.id === clashId);
  if (!clash) {
    alert('Không tìm thấy thông tin xung đột tương ứng!');
    return;
  }

  // Find target project
  let targetProj = null;
  if (btn.dataset.projectId) {
    targetProj = (projects || []).find(p => p.id === btn.dataset.projectId);
  }
  if (!targetProj && btn.dataset.project) {
    targetProj = (projects || []).find(p => p.name === btn.dataset.project || p.id === btn.dataset.project);
  }
  if (!targetProj && currentActiveProjectId) {
    targetProj = (projects || []).find(p => p.id === currentActiveProjectId);
  }
  if (!targetProj) {
    targetProj = (projects || [])[0];
  }

  // Collect potential assignees from project team or global personnel
  const teamList = (targetProj?.team || []).map(m => m.name);
  const globalList = (personnel || []).map(p => p.name);
  const assigneeSet = new Set([...teamList, ...globalList]);
  if (clash.assignee) assigneeSet.add(clash.assignee);
  const assignees = Array.from(assigneeSet);

  // Suggested default due date: 3 business days from now
  const defaultDueDate = formatLocalDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

  // Segments dropdown if available
  const segments = targetProj?.segments || [];

  const modalContent = `
    <div style="color: #F1F5F9;">
      <div style="background: rgba(245, 166, 35, 0.08); border: 1px solid rgba(245, 166, 35, 0.25); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-family: monospace; font-weight: 700; color: #F5A623;">${clash.id}</span>
          <span class="q-badge q-badge-${clash.severity === 'critical' ? 'critical' : 'high'}">${clash.severity?.toUpperCase()}</span>
        </div>
        <div style="font-size: 0.88rem; font-weight: 600; color: #F1F5F9; margin-bottom: 4px;">
          ${escapeHtml(clash.description)}
        </div>
        <div style="font-size: 0.76rem; color: #94A3B8;">
          Bộ môn: <strong style="color: #CBD5E1;">${escapeHtml(clash.disciplines || 'N/A')}</strong> · Dự án: <strong style="color: #CBD5E1;">${escapeHtml(targetProj?.name || clash.project)}</strong>
        </div>
      </div>

      <form id="clash-task-form" onsubmit="return false;">
        <div class="form-group mb-md">
          <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
            Tên Task WBS <span style="color: #EF4444;">*</span>
          </label>
          <input type="text" id="modal-task-name" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;" 
                 value="[Rework - Clash] ${escapeHtml(clash.description)}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div class="form-group">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
              Dự án WBS đích
            </label>
            <select id="modal-task-project" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;">
              ${(projects || []).map(p => `
                <option value="${p.id}" ${targetProj && p.id === targetProj.id ? 'selected' : ''}>
                  ${escapeHtml(p.name)} (${p.code})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
              Nhân sự phụ trách (Modeler) <span style="color: #EF4444;">*</span>
            </label>
            <select id="modal-task-assignee" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;" required>
              ${assignees.map(name => `
                <option value="${escapeHtml(name)}" ${clash.assignee === name ? 'selected' : ''}>
                  ${escapeHtml(name)}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
          <div class="form-group">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
              Dự kiến số giờ xử lý (Estimated Hours) <span style="color: #EF4444;">*</span>
            </label>
            <input type="number" id="modal-task-hours" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;" 
                   value="8" min="1" max="200" step="0.5" required>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 4px;">Sẽ được phân bổ vào kế hoạch Timesheet dự án</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
              Hạn hoàn thành (Due Date) <span style="color: #EF4444;">*</span>
            </label>
            <input type="date" id="modal-task-duedate" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;" 
                   value="${defaultDueDate}" required>
          </div>
        </div>

        ${segments.length > 0 ? `
          <div class="form-group mb-md">
            <label class="form-label" style="font-weight: 600; font-size: 0.85rem; color: #F1F5F9; margin-bottom: 6px; display: block;">
              Gán phân đoạn (Segment / Tuyến)
            </label>
            <select id="modal-task-segment" class="form-input" style="width: 100%; padding: 8px 12px; border-radius: 6px;">
              <option value="">-- Không gán phân đoạn cụ thể --</option>
              ${segments.map((seg, sIdx) => `
                <option value="${sIdx}">
                  Phân đoạn ${sIdx + 1}: ${escapeHtml(seg.name || seg.code || `Km ${seg.startKm || ''} - Km ${seg.endKm || ''}`)}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <button type="button" class="btn btn-ghost" id="modal-btn-cancel">Hủy</button>
          <button type="button" class="btn-amber-gradient" id="modal-btn-submit-task">
            <span>⚡</span> <span>Đưa vào WBS Dự án</span>
          </button>
        </div>
      </form>
    </div>
  `;

  openModal(`⚡ Tạo Task WBS từ Clash [${clash.id}]`, modalContent, { size: 'normal' });

  // Attach modal events
  setTimeout(() => {
    const cancelBtn = document.getElementById('modal-btn-cancel');
    const submitBtn = document.getElementById('modal-btn-submit-task');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const taskName = document.getElementById('modal-task-name')?.value?.trim();
        const chosenProjId = document.getElementById('modal-task-project')?.value;
        const assignee = document.getElementById('modal-task-assignee')?.value?.trim();
        const hours = parseFloat(document.getElementById('modal-task-hours')?.value) || 8;
        const dueDate = document.getElementById('modal-task-duedate')?.value;
        const segmentIdxVal = document.getElementById('modal-task-segment')?.value;

        if (!taskName) {
          alert('Vui lòng nhập tên công việc!');
          return;
        }
        if (!assignee) {
          alert('Vui lòng chọn nhân sự thực hiện!');
          return;
        }

        const currentProjects = getState().projects || [];
        const projectObj = currentProjects.find(p => p.id === chosenProjId) || targetProj;
        if (!projectObj) {
          alert('Không xác định được dự án đích!');
          return;
        }

        let finalTaskName = taskName;
        if (!finalTaskName.startsWith('[Rework - Clash]')) {
          finalTaskName = `[Rework - Clash] ${finalTaskName}`;
        }

        // Create new Task conforming 100% to WBS Schema
        const newTaskId = `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const newTask = {
          id: newTaskId,
          name: finalTaskName,
          clashId: clash.id,
          description: `[Nguồn gốc Clash: ${clash.id} - ${clash.disciplines || 'General'} - Mức độ: ${clash.severity || 'Medium'}] ${clash.description}`,
          assignee: assignee,
          status: 'active',
          progress: 0, // Must be 0 to avoid NaN in EVM rollup
          dueDate: dueDate || defaultDueDate,
          estimatedHours: hours,
          dailyHours_planned: dueDate ? { [dueDate]: hours } : {},
          dailyHours_actual: {},
          segmentIdx: segmentIdxVal !== '' && segmentIdxVal != null ? parseInt(segmentIdxVal, 10) : null,
          subSegmentIdx: null,
          milestoneIdx: null,
          phase: projectObj.currentPhase || 'BVTC',
          lod: projectObj.lodTarget ? `LOD ${projectObj.lodTarget}` : 'LOD 300',
          chainage: clash.chainage || ''
        };

        // Dispatch task into Project WBS
        const updatedTasks = [...(projectObj.tasks || []), newTask];
        updateProject(projectObj.id, { tasks: updatedTasks });

        // Update task count in tab button if present
        const taskTabBtn = document.querySelector('.btn-proj-tab[data-tab="tasks"]');
        if (taskTabBtn) {
          taskTabBtn.innerHTML = `<span>📌</span> <span>Công việc (${updatedTasks.length})</span>`;
        }

        // Update Clash in Quality Data
        clash.status = 'in-progress';
        clash.assignedTask = newTaskId;
        clash.assignee = assignee;

        // Update summary
        const summary = qualityData.clashSummary?.find(s => s.projectId === projectObj.id || s.projectName === projectObj.name);
        if (summary) {
          if (summary.newClashes > 0) summary.newClashes--;
          summary.inProgress = (summary.inProgress || 0) + 1;
        }

        setState('qualityData', qualityData);

        // Update UI
        closeModal();
        showToast(`⚡ Đã tạo thành công task "${taskName}" vào WBS dự án "${projectObj.name}"!`);

        // Update row DOM
        const row = document.getElementById(`clash-row-${clash.id}`);
        if (row) {
          const actionCell = row.querySelector('td:last-child');
          if (actionCell) {
            actionCell.innerHTML = `<span class="q-badge q-badge-in-progress">⏳ Đang xử lý</span>`;
          }
          const statusCell = row.querySelector('td:nth-last-child(2)');
          if (statusCell) {
            statusCell.innerHTML = `<span class="q-badge q-badge-in-progress">Đang xử lý</span>`;
          }
        }
      });
    }
  }, 50);
}

/**
 * Handle BCF / CSV file upload simulation
 */
function handleBcfFileUpload(fileInput, btn) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    btn.innerHTML = '<span>⏳</span> <span>Đang nạp BCF...</span>';
    btn.disabled = true;

    setTimeout(() => {
      const { qualityData, projects, personnel } = getState();
      if (!qualityData) return;

      const targetProj = currentActiveProjectId 
        ? (projects || []).find(p => p.id === currentActiveProjectId) 
        : (projects || []).find(p => p.status === 'active') || (projects || [])[0];

      const projName = targetProj ? targetProj.name : 'Dự án mặc định';
      const projId = targetProj ? targetProj.id : 'P001';
      const randomUser = (personnel && personnel.length > 0) ? personnel[0].name : 'Admin';

      const mockClashes = [
        {
          id: `BCF-${Math.floor(100 + Math.random() * 900)}`,
          projectId: projId,
          project: projName,
          type: 'Hard',
          disciplines: 'Structure vs MEP',
          description: `[Từ ${file.name}] Xung đột ống thông gió và dầm bản sàn tầng 3`,
          severity: 'critical',
          assignee: randomUser,
          status: 'new',
          date: formatLocalDate()
        },
        {
          id: `BCF-${Math.floor(100 + Math.random() * 900)}`,
          projectId: projId,
          project: projName,
          type: 'Hard',
          disciplines: 'Road vs Drainage',
          description: `[Từ ${file.name}] Giao cắt hố ga thoát nước và móng trụ đèn`,
          severity: 'high',
          assignee: randomUser,
          status: 'new',
          date: formatLocalDate()
        },
        {
          id: `BCF-${Math.floor(100 + Math.random() * 900)}`,
          projectId: projId,
          project: projName,
          type: 'Soft',
          disciplines: 'Arch vs Lighting',
          description: `[Từ ${file.name}] Khoảng cách tĩnh không biển báo và dây cáp chiếu sáng`,
          severity: 'medium',
          assignee: randomUser,
          status: 'new',
          date: formatLocalDate()
        }
      ];

      qualityData.recentClashes = [...mockClashes, ...(qualityData.recentClashes || [])];

      // Update clash summary
      const summary = (qualityData.clashSummary || []).find(s => s.projectId === projId || s.projectName === projName);
      if (summary) {
        summary.total += 3;
        summary.newClashes += 3;
        summary.critical += 1;
      } else {
        qualityData.clashSummary = qualityData.clashSummary || [];
        qualityData.clashSummary.push({
          projectId: projId,
          projectName: projName,
          total: 3,
          newClashes: 3,
          inProgress: 0,
          resolved: 0,
          critical: 1
        });
      }

      setState('qualityData', qualityData);
      showToast(`✅ Đã import thành công file ${file.name} và nạp 3 va chạm mới!`);

      btn.innerHTML = '<span>📥</span> <span>Import BCF / CSV</span>';
      btn.disabled = false;

      // Re-render subtab
      refreshCurrentView();
    }, 1200);
  });
}

/**
 * Refresh current view smoothly
 */
function refreshCurrentView() {
  const container = document.getElementById('quality-tab-content-area') || document.getElementById('project-quality-tab-content');
  if (!container) return;

  const ctx = getProjectQualityContext(currentActiveProjectId);
  if (!ctx) return;

  if (currentSubTab === 'clashes') {
    container.innerHTML = renderClashTab(ctx);
    initTrendChart(ctx);
    bindClashEvents();
  } else if (currentSubTab === 'lod') {
    container.innerHTML = renderLODTab(ctx);
  } else {
    container.innerHTML = renderBEPTab(ctx);
  }
}

/**
 * Bind Clash Tab Interaction Events
 */
function bindClashEvents() {
  // Bind "Tạo Task" buttons
  document.querySelectorAll('.btn-create-clash-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.btn-create-clash-task');
      if (targetBtn) handleCreateTaskClick(targetBtn);
    });
  });

  // Bind "Chi tiết" filter buttons on summary table
  document.querySelectorAll('.btn-filter-project-clash').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projId = e.currentTarget.dataset.projectId;
      if (projId) {
        window.location.hash = `quality/${projId}`;
      }
    });
  });

  // Bind local import button if present
  const localImportBtn = document.getElementById('btn-import-bcf-local');
  const localFileInput = document.getElementById('import-bcf-file-local');
  if (localImportBtn && localFileInput) {
    localImportBtn.addEventListener('click', () => localFileInput.click());
    handleBcfFileUpload(localFileInput, localImportBtn);
  }
}

/**
 * Initialize Standalone Quality Page
 */
export function init(projectId = null) {
  if (projectId) {
    currentActiveProjectId = projectId;
  }

  const ctx = getProjectQualityContext(currentActiveProjectId);

  // Sub-tabs switching
  document.querySelectorAll('#quality-subtabs .quality-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.qtab;
      if (currentSubTab === targetTab) return;
      currentSubTab = targetTab;

      document.querySelectorAll('#quality-subtabs .quality-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      refreshCurrentView();
    });
  });

  // Project selector change
  const projSelect = document.getElementById('quality-proj-select');
  if (projSelect) {
    projSelect.addEventListener('change', (e) => {
      const chosen = e.target.value;
      if (chosen) {
        window.location.hash = `quality/${chosen}`;
      } else {
        window.location.hash = 'quality';
      }
    });
  }

  // Import button
  const importBtn = document.getElementById('btn-import-bcf');
  const fileInput = document.getElementById('import-bcf-file');
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());
    handleBcfFileUpload(fileInput, importBtn);
  }

  // Initial tab setup
  setTimeout(() => {
    if (currentSubTab === 'clashes') {
      initTrendChart(ctx);
      bindClashEvents();
    }
  }, 100);
}

/**
 * Initialize Project Quality Section inside ProjectDetail.js
 */
export function initQualitySection(project) {
  if (!project) return;
  currentActiveProjectId = project.id;
  const ctx = getProjectQualityContext(project.id);

  // Sub-tabs switching inside embedded view
  document.querySelectorAll('#quality-subtabs .quality-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.qtab;
      if (currentSubTab === targetTab) return;
      currentSubTab = targetTab;

      document.querySelectorAll('#quality-subtabs .quality-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      refreshCurrentView();
    });
  });

  // Initialize chart & events
  setTimeout(() => {
    if (currentSubTab === 'clashes') {
      initTrendChart(ctx);
      bindClashEvents();
    }
  }, 100);
}

/**
 * Cleanup on page leave
 */
export function destroy() {
  if (clashChartInstance) {
    clashChartInstance.destroy();
    clashChartInstance = null;
  }
}
