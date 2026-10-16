// ============================================
// DASHBOARD — Portfolio Overview (Executive Command Center)
// Fully Upgraded: Interactive 1-Click KPIs, Live Analytics with Real Data,
// Executive Smart Alert Banner, Advanced Card Filters & Sidebar Sync.
// ============================================
import { getState, setState, deleteProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES, LOD_LEVELS } from '../data/constants.js';
import { openProjectForm, showToast } from '../components/ProjectFormModal.js';
import { openModal, closeModal } from '../components/Modal.js';
import { renderKanbanBoard, initKanbanEvents } from '../components/KanbanBoard.js';
import { initCounters, staggerFadeIn } from '../utils/animations.js';
import { initContextMenu, showContextMenu, hideContextMenu } from '../components/ContextMenu.js';
import { renderGanttChart, initGanttEvents } from '../components/GanttChart.js';

// Local UI state
let activeKPIFilter = 'all'; // 'all' | 'overdue' | 'active' | 'clashes' | 'health' | 'progress'
let currentSort = 'default'; // 'default' | 'progress-desc' | 'progress-asc' | 'health-desc' | 'deadline-asc'
let isFocusMode = false; // Filter only at-risk projects
let activeChartTab = 'health'; // 'health' | 'progress' | 'timesheet'

/**
 * Lấy danh sách các lý do rủi ro / cảnh báo cụ thể của dự án
 * @param {Object} p - Dự án
 * @returns {Array<{ type: string, text: string, severity: 'danger'|'warning', icon: string }>}
 */
function getProjectRiskReasons(p) {
  if (!p) return [];
  const reasons = [];

  // 1. Quá hạn tiến độ
  if (p.status === 'overdue') {
    reasons.push({ type: 'overdue', text: 'Trạng thái dự án quá hạn', severity: 'danger', icon: '🚨' });
  }

  const now = new Date();
  if (p.endDate) {
    const end = new Date(p.endDate);
    if (p.status !== 'completed' && end < now) {
      const daysOver = Math.ceil((now - end) / (1000 * 60 * 60 * 24));
      reasons.push({ type: 'overdue', text: `Đã quá hạn ${daysOver} ngày`, severity: 'danger', icon: '⚠️' });
    } else if (p.status !== 'completed') {
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 45 && (p.progress || 0) < 65) {
        reasons.push({ type: 'progress_lag', text: `Hạn chót còn ${daysLeft} ngày (Tiến độ ${p.progress || 0}% < 65%)`, severity: 'warning', icon: '⏳' });
      }
    }
  }

  // 2. Model Health dưới ngưỡng an toàn (< 70%)
  if (typeof p.modelHealth === 'number' && p.modelHealth < 70) {
    reasons.push({ type: 'low_health', text: `BIM Health thấp (${p.modelHealth}% < 70%)`, severity: 'danger', icon: '⚡' });
  }

  // 3. Xung đột mô hình (Clash) tồn đọng cao (> 60)
  const unresolvedClashes = Math.max(0, (p.clashesTotal || 0) - (p.clashesResolved || 0));
  if (unresolvedClashes > 60) {
    reasons.push({ type: 'high_clash', text: `${unresolvedClashes} Clash tồn đọng (> 60)`, severity: 'warning', icon: '💥' });
  }

  return reasons;
}

/**
 * Kiểm tra xem dự án có thuộc diện rủi ro / cần chú ý không
 */
function isProjectAtRisk(p) {
  return getProjectRiskReasons(p).length > 0;
}

/**
 * Kiểm tra xem dự án có bị quá hạn không
 */
function isProjectOverdue(p) {
  if (!p) return false;
  if (p.status === 'overdue') return true;
  if (p.status !== 'completed' && p.endDate) {
    const end = new Date(p.endDate);
    const now = new Date();
    if (end < now && (p.progress || 0) < 100) return true;
  }
  return false;
}

/**
 * Kiểm tra xem dự án có hạn nộp trong 30 ngày tới không
 */
function isDeadlineSoon(p) {
  if (!p || p.status === 'completed' || !p.endDate) return false;
  const end = new Date(p.endDate);
  const now = new Date();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

/**
 * Định dạng nhãn đếm ngược hạn nộp
 */
function getDeadlineBadge(p) {
  if (!p) return '';
  if (p.status === 'completed') {
    return `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.68rem; padding: 1px 6px;">✅ Hoàn thành</span>`;
  }
  if (!p.endDate) return '';
  const end = new Date(p.endDate);
  const now = new Date();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.68rem; padding: 1px 6px; font-weight: 700;">Trễ ${Math.abs(diffDays)}d</span>`;
  }
  if (diffDays <= 30) {
    return `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 0.68rem; padding: 1px 6px; font-weight: 600;">Còn ${diffDays}d</span>`;
  }
  return `<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: var(--text-muted); font-size: 0.68rem; padding: 1px 6px;">${diffDays}d nữa</span>`;
}

/**
 * Định dạng thời gian tương đối thân thiện
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Vừa xong';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 172800) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch(e) {
    return dateStr;
  }
}

export function render() {
  const { projects = [], personnel = [], activityLog = [], qualityData, dashboardView, ganttScale, isEditingLayout, dashboardLayout, widgetSpans } = getState();

  // Thống kê nhanh
  const overdueCount = projects.filter(p => isProjectOverdue(p)).length;
  const atRiskCount = projects.filter(p => isProjectAtRisk(p)).length;
  const deadlineSoonCount = projects.filter(p => {
    if (!p || p.status === 'completed' || !p.endDate) return false;
    const diff = Math.ceil((new Date(p.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 45 && (p.progress || 0) < 65;
  }).length;
  const lowHealthCount = projects.filter(p => (p.modelHealth || 0) < 70).length;
  const highClashCount = projects.filter(p => ((p.clashesTotal || 0) - (p.clashesResolved || 0)) > 60).length;
  const totalClashes = qualityData?.clashSummary?.reduce((s, c) => s + (c.newClashes || 0), 0) || 
                       projects.reduce((s, p) => s + ((p.clashesTotal || 0) - (p.clashesResolved || 0)), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0;
  const avgHealth = projects.length ? Math.round(projects.reduce((s, p) => s + (p.modelHealth || 0), 0) / projects.length) : 0;

  // Widget Renderers
  const renderers = {
    // 1. KPI Grid & Executive Smart Banner
    kpi: () => `
      <div class="widget col-span-${widgetSpans.kpi}" data-id="kpi" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="kpi">⇹</div>` : ''}
        
        <!-- Interactive 1-Click KPI Cards -->
        <div class="kpi-grid stagger-children" style="grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 14px;">
          <!-- KPI 1: Tổng dự án -->
          <div class="kpi-card blue kpi-interactive-card ${activeKPIFilter === 'all' && !isFocusMode ? 'active-kpi' : ''}" 
               data-kpi="all" title="Click để xem toàn bộ danh mục dự án" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'all' && !isFocusMode ? 'box-shadow: 0 0 0 2px var(--accent-primary); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">📁</div>
              ${activeKPIFilter === 'all' && !isFocusMode ? '<span style="font-size: 0.65rem; color: var(--accent-primary); font-weight: bold;">● Tất cả</span>' : ''}
            </div>
            <div class="kpi-card-value" data-count="${projects.length}">${projects.length}</div>
            <div class="kpi-card-label">Tổng dự án</div>
            <div class="text-xs text-muted mt-xs">${projects.filter(p => p.status === 'active').length} đang chạy</div>
          </div>

          <!-- KPI 2: Tiến độ TB -->
          <div class="kpi-card green kpi-interactive-card ${activeKPIFilter === 'progress' ? 'active-kpi' : ''}" 
               data-kpi="progress" title="Click để lọc các dự án đã đạt tiến độ từ 50% trở lên" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'progress' ? 'box-shadow: 0 0 0 2px var(--accent-secondary); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">📊</div>
              <span class="kpi-card-trend up">↑</span>
            </div>
            <div class="kpi-card-value" data-count="${avgProgress}" data-suffix="%">${avgProgress}%</div>
            <div class="kpi-card-label">Tiến độ TB</div>
            <div class="text-xs text-muted mt-xs">${activeKPIFilter === 'progress' ? 'Đang lọc ≥50%' : 'Đúng tiến độ'}</div>
          </div>

          <!-- KPI 3: Nhân sự -->
          <div class="kpi-card cyan kpi-interactive-card ${activeKPIFilter === 'personnel' ? 'active-kpi' : ''}" 
               data-kpi="personnel" title="Click để xem tổng quan phân bổ nguồn lực" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'personnel' ? 'box-shadow: 0 0 0 2px var(--accent-cyan); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">👥</div>
            </div>
            <div class="kpi-card-value" data-count="${personnel.length}">${personnel.length}</div>
            <div class="kpi-card-label">Nhân sự BIM</div>
            <div class="text-xs text-muted mt-xs">Đang tham gia</div>
          </div>

          <!-- KPI 4: Xung đột (Clash) -->
          <div class="kpi-card orange kpi-interactive-card ${activeKPIFilter === 'clashes' ? 'active-kpi' : ''}" 
               data-kpi="clashes" title="Click để lọc các dự án có xung đột mô hình chưa xử lý" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'clashes' ? 'box-shadow: 0 0 0 2px var(--accent-warning); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">⚡</div>
              ${totalClashes > 50 ? '<span class="badge red" style="font-size: 0.6rem; padding: 1px 4px;">Cần xử lý</span>' : ''}
            </div>
            <div class="kpi-card-value" data-count="${totalClashes}">${totalClashes}</div>
            <div class="kpi-card-label">Clash cần xử lý</div>
            <div class="text-xs text-muted mt-xs">${activeKPIFilter === 'clashes' ? 'Đang lọc Clash' : 'Toàn portfolio'}</div>
          </div>

          <!-- KPI 5: Model Health -->
          <div class="kpi-card ${avgHealth >= 75 ? 'green' : 'orange'} kpi-interactive-card ${activeKPIFilter === 'health' ? 'active-kpi' : ''}" 
               data-kpi="health" title="Click để lọc các dự án có Model Health cần chú ý (<75%)" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'health' ? 'box-shadow: 0 0 0 2px var(--accent-warning); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">💚</div>
            </div>
            <div class="kpi-card-value" data-count="${avgHealth}" data-suffix="%">${avgHealth}%</div>
            <div class="kpi-card-label">Model Health TB</div>
            <div class="text-xs text-muted mt-xs">${activeKPIFilter === 'health' ? 'Đang lọc <75%' : (avgHealth >= 75 ? 'Đạt chuẩn' : 'Cần chú ý')}</div>
          </div>

          <!-- KPI 6: Overdue -->
          <div class="kpi-card ${overdueCount === 0 ? 'green' : 'red'} kpi-interactive-card ${activeKPIFilter === 'overdue' ? 'active-kpi' : ''}" 
               data-kpi="overdue" title="Click để lọc các dự án trễ hạn hoặc quá hạn nộp" 
               style="cursor: pointer; position: relative; transition: all 0.2s; ${activeKPIFilter === 'overdue' ? 'box-shadow: 0 0 0 2px var(--accent-danger); transform: translateY(-2px);' : ''}">
            <div class="kpi-card-top">
              <div class="kpi-card-icon">🔴</div>
              ${overdueCount > 0 ? '<span class="badge red" style="font-size: 0.6rem; padding: 1px 4px;">Gấp</span>' : ''}
            </div>
            <div class="kpi-card-value" data-count="${overdueCount}">${overdueCount}</div>
            <div class="kpi-card-label">Trễ hạn (Overdue)</div>
            <div class="text-xs text-muted mt-xs">${overdueCount === 0 ? 'Không có' : 'Cần can thiệp ngay'}</div>
          </div>
        </div>

        <!-- Executive Smart Alert Banner -->
        ${renderExecutiveBanner(projects, overdueCount, atRiskCount, deadlineSoonCount, lowHealthCount, highClashCount)}
      </div>
    `,

    // 2. Live Analytics Charts
    analytics: () => `
      <div class="card widget col-span-${widgetSpans.analytics || 3}" data-id="analytics" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? '<div class="resize-handle" data-target="analytics" title="Kéo để co giãn độ rộng">⇹</div>' : ''}
        
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 class="card-title" style="margin-bottom: 2px;">📈 Phân tích dữ liệu danh mục dự án (Portfolio Analytics)</h3>
            <div class="text-xs text-muted">Biểu đồ đồng bộ thời gian thực theo dữ liệu dự án, sức khỏe mô hình & giờ làm thực tế</div>
          </div>
          
          <!-- Chart View Switcher Tabs -->
          <div style="display: inline-flex; border: 1px solid var(--border-default); border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-tertiary);">
            <button class="btn btn-sm btn-chart-tab ${activeChartTab === 'health' ? 'btn-primary' : 'btn-ghost'}" data-chart-tab="health" style="border-radius: 0; padding: 5px 12px; font-size: 0.78rem;">
              🎯 Sức khỏe & Clash
            </button>
            <button class="btn btn-sm btn-chart-tab ${activeChartTab === 'progress' ? 'btn-primary' : 'btn-ghost'}" data-chart-tab="progress" style="border-radius: 0; padding: 5px 12px; font-size: 0.78rem;">
              📊 Tiến độ thực tế
            </button>
            <button class="btn btn-sm btn-chart-tab ${activeChartTab === 'timesheet' ? 'btn-primary' : 'btn-ghost'}" data-chart-tab="timesheet" style="border-radius: 0; padding: 5px 12px; font-size: 0.78rem;">
              ⏱️ Giờ làm (Timesheet)
            </button>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-lg); flex-wrap: wrap; padding: var(--space-md);">
          <div style="flex: 1.2; min-width: 320px; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 12px; border: 1px solid var(--border-subtle);">
            <canvas id="healthTrendChart" height="220"></canvas>
          </div>
          <div style="flex: 1; min-width: 280px; background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 12px; border: 1px solid var(--border-subtle);">
            <canvas id="resourceAllocationChart" height="220"></canvas>
          </div>
        </div>
      </div>
    `,

    // 3. Projects List / Kanban Board
    projects: () => {
      const filteredProjects = getFilteredProjects(projects);
      return `
      <div class="card widget ${dashboardView === 'kanban' ? 'col-span-3' : `col-span-${widgetSpans.projects}`}" data-id="projects" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="projects">⇹</div>` : ''}
        
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 class="card-title" style="margin: 0;">🏗️ Dự án đang triển khai</h3>
            <span class="badge ${isFocusMode ? 'red' : ''}" id="project-count-badge" style="${isFocusMode ? 'background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 700;' : 'background: var(--bg-tertiary);'} font-size: 0.72rem; padding: 2px 7px;">
              ${isFocusMode ? `${filteredProjects.length} / ${projects.length} dự án trọng tâm` : `${filteredProjects.length} dự án`}
            </span>
            ${isFocusMode ? '<span class="badge red" style="font-size: 0.7rem; background: var(--accent-danger); color: #fff;">🎯 Đang bật Chế độ tập trung</span>' : ''}
            ${activeKPIFilter !== 'all' ? `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); font-size: 0.7rem;">Lọc theo KPI</span>` : ''}
          </div>

          <div class="flex gap-sm" style="flex-wrap: wrap; align-items: center;">
            <div class="view-toggle mr-md">
              <button class="view-toggle-btn ${dashboardView === 'list' ? 'active' : ''}" data-view="list">Dạng danh sách</button>
              <button class="view-toggle-btn ${dashboardView === 'kanban' ? 'active' : ''}" data-view="kanban">Kanban</button>
            </div>

            ${dashboardView === 'list' ? `
              <div class="flex gap-sm" style="flex-wrap: wrap; align-items: center;">
                <!-- Search -->
                <div class="search-input-wrapper">
                  <span class="search-icon">🔍</span>
                  <input type="text" id="live-search" class="form-input" placeholder="Tìm tên, mã, chủ đầu tư..." style="width: 190px; padding-left: 32px;" value="${getState().searchQuery || ''}">
                </div>

                <!-- Type Filter -->
                <select class="form-select" id="filter-type" style="width: 130px; font-size: 0.8rem;">
                  <option value="all">Mọi loại hình</option>
                  <option value="road">Đường bộ</option>
                  <option value="bridge">Cầu</option>
                  <option value="tunnel">Hầm</option>
                  <option value="interchange">Nút giao</option>
                </select>

                <!-- Sort Filter -->
                <select class="form-select" id="filter-sort" style="width: 165px; font-size: 0.8rem;">
                  <option value="default" ${currentSort === 'default' ? 'selected' : ''}>Sắp xếp: Mặc định</option>
                  <option value="progress-desc" ${currentSort === 'progress-desc' ? 'selected' : ''}>Tiến độ: Cao → Thấp</option>
                  <option value="progress-asc" ${currentSort === 'progress-asc' ? 'selected' : ''}>Tiến độ: Thấp → Cao</option>
                  <option value="health-desc" ${currentSort === 'health-desc' ? 'selected' : ''}>Model Health: Cao → Thấp</option>
                  <option value="deadline-asc" ${currentSort === 'deadline-asc' ? 'selected' : ''}>Hạn nộp: Gần nhất</option>
                </select>

                <!-- Status Filter Chips -->
                <button class="filter-chip ${getState().filterStatus === 'all' && !isFocusMode ? 'active' : ''}" data-filter="all">Tất cả</button>
                <button class="filter-chip ${getState().filterStatus === 'active' ? 'active' : ''}" data-filter="active">Đang chạy</button>
                <button class="filter-chip ${isFocusMode ? 'active' : ''}" id="btn-toggle-focus" title="Lọc các dự án có rủi ro hoặc cần chú ý" style="${isFocusMode ? 'background: var(--accent-danger); color: #fff;' : ''}">
                  ⚠️ Rủi ro (${atRiskCount})
                </button>

                ${(activeKPIFilter !== 'all' || isFocusMode || getState().filterStatus !== 'all' || getState().searchQuery) ? `
                  <button id="btn-reset-dash-filters" class="btn btn-ghost btn-xs text-muted" title="Xóa toàn bộ bộ lọc">
                    🔄
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <div id="projects-list" class="stagger-list">
          ${dashboardView === 'kanban' ? renderKanbanBoard(filteredProjects) : renderProjectsList(filteredProjects)}
        </div>
      </div>
      `;
    },

    // 4. Right Sidebar: Quick Resources & Real-time Activities
    sidebar: () => dashboardView === 'list' ? `
      <div class="flex flex-col gap-md widget col-span-${widgetSpans.sidebar}" data-id="sidebar" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="sidebar">⇹</div>` : ''}
        
        <!-- Resource Quick Card -->
        <div class="card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">👥 Nguồn lực dự án</h3>
            <a href="#resources" class="text-xs text-accent font-semibold" style="text-decoration: none;">Xem tất cả →</a>
          </div>
          ${renderResourceQuick(personnel)}
        </div>

        <!-- Recent Activities Card -->
        <div class="card" style="flex: 1;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">📋 Hoạt động gần đây</h3>
            <span class="text-xs text-muted">${activityLog.length} bản ghi</span>
          </div>
          <div style="max-height: 380px; overflow-y: auto;">
            ${activityLog.length ? activityLog.slice(0, 10).map(a => `
              <div class="activity-item" style="padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
                <div class="activity-dot" style="background: ${a.dotColor || 'var(--accent-primary)'}; width: 8px; height: 8px; border-radius: 50%; margin-top: 5px;"></div>
                <div class="activity-content" style="flex: 1;">
                  <div class="activity-text" style="font-size: 0.8rem; line-height: 1.35;">
                    <strong style="color: var(--text-primary);">${a.user || 'Hệ thống'}</strong> 
                    <span style="color: var(--text-secondary);">${a.action}</span>
                  </div>
                  <div class="activity-time text-xs text-muted" style="font-size: 0.7rem; margin-top: 2px;">
                    ${formatRelativeTime(a.time || a.timestamp)}
                  </div>
                </div>
              </div>
            `).join('') : '<div class="text-xs text-muted" style="text-align: center; padding: 24px;">Chưa có hoạt động nào được ghi nhận</div>'}
          </div>
        </div>
      </div>
    ` : '',

    // 5. Gantt Timeline Chart
    gantt: () => {
      const ganttProjects = isFocusMode ? projects.filter(p => isProjectAtRisk(p)) : projects;
      return `
      <div class="card widget col-span-${widgetSpans.gantt || 3}" data-id="gantt" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="gantt" title="Kéo để co giãn độ rộng">⇹</div>` : ''}
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 class="card-title">📅 Timeline tổng quan</h3>
            ${isFocusMode ? `<span class="badge red" style="font-size: 0.7rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 700;">🎯 ${ganttProjects.length} Dự án trọng tâm</span>` : '<span class="text-xs text-muted">(Kéo thả để dời lịch)</span>'}
          </div>
          <div class="flex items-center gap-sm">
            <select id="gantt-scale-select" class="form-select" style="width: 120px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600;">
              <option value="day" ${ganttScale === 'day' ? 'selected' : ''}>DAY</option>
              <option value="week" ${ganttScale === 'week' ? 'selected' : ''}>WEEK</option>
              <option value="month" ${ganttScale === 'month' ? 'selected' : ''}>MONTH</option>
              <option value="quarter" ${ganttScale === 'quarter' ? 'selected' : ''}>QUARTER</option>
            </select>
          </div>
        </div>
        ${renderGanttChart(ganttProjects, ganttScale)}
      </div>
      `;
    }
  };

  return `
    <div class="animate-fade-in-up">
      <!-- Dashboard Section Header -->
      <div class="section-header mb-md" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 class="section-title">📊 Tổng quan dự án</h1>
          <div class="section-subtitle">Trung tâm điều phối portfolio BIM hạ tầng giao thông & phân tích vận hành</div>
        </div>
        <div class="flex gap-sm" style="flex-wrap: wrap;">
          <button class="btn btn-outline" id="btn-export-pdf" title="Xuất báo cáo tổng quan (PDF / In)">
            🖨️ Xuất báo cáo
          </button>
          ${['BIM Manager', 'Project Manager', 'Admin'].includes(getState().currentUserRole) ? `
            <button class="btn ${isEditingLayout ? 'btn-primary' : 'btn-outline'}" id="btn-edit-layout">
              ${isEditingLayout ? '✅ Hoàn tất lưu' : '⚙️ Chỉnh sửa bố cục'}
            </button>
            <button class="btn btn-primary" id="btn-add-project">
              <span style="font-size: 1.1rem; line-height: 1;">+</span> Tạo dự án mới
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Widget Grid Layout -->
      <div class="dashboard-grid" id="dashboard-grid">
        ${dashboardLayout.map(widgetId => renderers[widgetId] ? renderers[widgetId]() : '').join('')}
      </div>
    </div>
  `;
}

/**
 * Render Executive Smart Alert Banner
 */
function renderExecutiveBanner(projects, overdueCount, atRiskCount, deadlineSoonCount, lowHealthCount, highClashCount = 0) {
  if (overdueCount === 0 && atRiskCount === 0 && deadlineSoonCount === 0 && lowHealthCount === 0 && highClashCount === 0) {
    return '';
  }

  // Find 14D project
  const p14D = projects.find(p => p.id === 'P007' || p.name.includes('14D'));
  let p14DText = '';
  if (p14D) {
    p14DText = `📐 <strong>Bản vẽ 14D:</strong> Tiến độ ${p14D.progress || 0}%`;
  }

  const highlightParts = [];
  if (overdueCount > 0) {
    highlightParts.push(`<span style="color: #f87171; font-weight: 600;">⚠️ ${overdueCount} dự án quá hạn</span>`);
  }
  if (lowHealthCount > 0) {
    highlightParts.push(`<span style="color: #fca5a5; font-weight: 600;">⚡ ${lowHealthCount} dự án có Model Health &lt; 70%</span>`);
  }
  if (highClashCount > 0) {
    highlightParts.push(`<span style="color: #fdba74; font-weight: 600;">💥 ${highClashCount} dự án Clash tồn đọng (&gt;60)</span>`);
  }
  if (deadlineSoonCount > 0) {
    highlightParts.push(`<span style="color: #fde047; font-weight: 600;">⏳ ${deadlineSoonCount} dự án chậm tiến độ so với hạn nộp</span>`);
  }
  if (p14DText) {
    highlightParts.push(p14DText);
  }

  return `
    <div class="card mb-md" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95)); border-left: 4px solid ${overdueCount > 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'}; padding: 12px 18px; border-radius: var(--radius-sm); border-top: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 1.4rem; background: rgba(239, 68, 68, 0.15); width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">🎯</div>
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <span>Thông tin điều hành trọng tâm (Executive Highlights)</span>
              ${overdueCount > 0 ? '<span class="badge red" style="font-size: 0.65rem;">Cần can thiệp gấp</span>' : '<span class="badge orange" style="font-size: 0.65rem;">Chú ý</span>'}
              ${isFocusMode ? '<span class="badge red" style="font-size: 0.65rem; background: var(--accent-danger); color: #fff;">Đang bật Chế độ tập trung</span>' : ''}
            </div>
            <div class="text-xs text-muted" style="margin-top: 4px; line-height: 1.45;">
              ${highlightParts.join(' · ')}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-sm ${isFocusMode ? 'btn-primary' : 'btn-outline'}" id="btn-banner-focus" style="font-size: 0.8rem; padding: 5px 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; ${isFocusMode ? 'box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);' : ''}">
            ${isFocusMode ? '👁️ Xem toàn bộ dự án' : `🎯 Bật Chế độ tập trung (${atRiskCount})`}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Filter & Sort projects based on all active criteria
 */
function getFilteredProjects(projects) {
  const { filterStatus = 'all', filterType = 'all', searchQuery = '' } = getState();
  let list = [...projects];

  // 1. Focus mode filter
  if (isFocusMode) {
    list = list.filter(p => isProjectAtRisk(p));
  }

  // 2. Interactive KPI filter
  if (activeKPIFilter === 'overdue') {
    list = list.filter(p => isProjectOverdue(p));
  } else if (activeKPIFilter === 'progress') {
    list = list.filter(p => (p.progress || 0) >= 50);
  } else if (activeKPIFilter === 'clashes') {
    list = list.filter(p => ((p.clashesTotal || 0) - (p.clashesResolved || 0)) > 0);
  } else if (activeKPIFilter === 'health') {
    list = list.filter(p => (p.modelHealth || 0) < 75);
  }

  // 3. Status filter
  if (filterStatus && filterStatus !== 'all' && !isFocusMode) {
    list = list.filter(p => p.status === filterStatus);
  }

  // 4. Type filter
  if (filterType && filterType !== 'all') {
    list = list.filter(p => p.type === filterType);
  }

  // 5. Search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) || 
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q)) ||
      (p.client && p.client.toLowerCase().includes(q)) ||
      (p.teamLead && p.teamLead.toLowerCase().includes(q))
    );
  }

  // 6. Sorting
  if (currentSort === 'progress-desc') {
    list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  } else if (currentSort === 'progress-asc') {
    list.sort((a, b) => (a.progress || 0) - (b.progress || 0));
  } else if (currentSort === 'health-desc') {
    list.sort((a, b) => (b.modelHealth || 0) - (a.modelHealth || 0));
  } else if (currentSort === 'deadline-asc') {
    list.sort((a, b) => {
      const dateA = a.endDate ? new Date(a.endDate).getTime() : 9999999999999;
      const dateB = b.endDate ? new Date(b.endDate).getTime() : 9999999999999;
      return dateA - dateB;
    });
  }

  return list;
}

/**
 * Render Project Cards List
 */
function renderProjectsList(projects) {
  if (!projects || projects.length === 0) {
    return `
      <div style="text-align: center; padding: 48px 20px; background: var(--bg-tertiary); border-radius: var(--radius-sm); margin: 12px 0;">
        <div style="font-size: 2.2rem; margin-bottom: 8px;">🔍</div>
        <div class="font-bold text-base mb-xs">Không tìm thấy dự án phù hợp</div>
        <div class="text-xs text-muted mb-md">Thử thay đổi từ khóa tìm kiếm hoặc bấm nút đặt lại bộ lọc bên dưới.</div>
        <button class="btn btn-outline btn-sm" id="btn-empty-reset-dash">🔄 Đặt lại bộ lọc</button>
      </div>
    `;
  }

  return `
    <div class="project-cards-grid">
      ${projects.map(p => {
        const typeInfo = PROJECT_TYPES[p.type] || {};
        const statusInfo = PROJECT_STATUSES[p.status] || {};
        const progressColor = p.progress >= 70 ? 'green' : p.progress >= 40 ? '' : 'orange';
        const isRisk = isProjectAtRisk(p);
        const riskReasons = getProjectRiskReasons(p);
        const deadlineBadge = getDeadlineBadge(p);
        const is14D = p.id === 'P007' || p.name.includes('14D');

        return `
          <div class="project-card ${p.type}" data-project-id="${p.id}" style="${isRisk ? (isFocusMode ? 'border-top: 3.5px solid var(--accent-danger); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.15);' : 'border-top: 3px solid var(--accent-warning);') : ''}">
            <!-- Action buttons (visible on hover) -->
            ${['BIM Manager', 'Project Manager', 'Admin'].includes(getState().currentUserRole) ? `
              <div class="project-card-actions">
                <button class="card-action-btn" data-edit-id="${p.id}" title="Chỉnh sửa">✏️</button>
                <button class="card-action-btn danger" data-delete-id="${p.id}" title="Xóa">🗑️</button>
              </div>
            ` : ''}

            <!-- Header -->
            <div class="project-card-header" onclick="window.location.hash='project-detail/${p.id}'" style="cursor: pointer;">
              <div>
                <div class="project-card-name" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span>${p.name}</span>
                  ${isRisk ? '<span class="badge red" style="font-size: 0.65rem; padding: 1px 5px;" title="Dự án có rủi ro hoặc cần chú ý">⚠️ Rủi ro</span>' : ''}
                </div>
                <div class="project-card-code" style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                  <span>${p.code || p.id}</span>
                  ${p.client ? `<span>· 🏢 ${p.client}</span>` : ''}
                </div>
              </div>
              <div class="project-card-icon">${typeInfo.icon || '📁'}</div>
            </div>

            <!-- Risk reasons alert box if project has risks -->
            ${riskReasons.length > 0 ? `
              <div class="project-risk-reasons mb-sm" style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid var(--accent-danger); padding: 6px 10px; border-radius: 4px; font-size: 0.72rem;">
                <div style="font-weight: 700; color: #ef4444; margin-bottom: 3px; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.3px;">
                  ⚠️ Yếu tố rủi ro cần xử lý:
                </div>
                ${riskReasons.map(r => `
                  <div style="display: flex; align-items: center; gap: 5px; color: ${r.severity === 'danger' ? '#ef4444' : '#f59e0b'}; font-weight: 600; line-height: 1.35;">
                    <span>${r.icon}</span> <span>${r.text}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Badges Row -->
            <div class="flex items-center gap-sm mb-sm" style="flex-wrap: wrap;">
              <span class="badge ${statusInfo.class}">
                <span class="badge-dot"></span>
                ${statusInfo.label}
              </span>
              ${deadlineBadge}
              <span class="text-xs text-muted" style="margin-left: auto;">LOD ${p.lodCurrent || 200}/${p.lodTarget || 350}</span>
            </div>

            <!-- Progress Bar -->
            <div class="mb-sm">
              <div class="flex justify-between mb-xs">
                <span class="text-xs text-muted">Tiến độ thực tế</span>
                <span class="text-xs font-semibold">${p.progress || 0}%</span>
              </div>
              <div class="progress-bar" style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                <div class="progress-bar-fill ${progressColor}" style="width: ${p.progress || 0}%; height: 100%;"></div>
              </div>
            </div>

            <!-- Meta info (Location, Length, Team Lead) -->
            <div class="project-card-meta" style="font-size: 0.75rem; margin-bottom: 8px;">
              <div class="project-card-meta-item">📍 ${p.location || 'Việt Nam'}</div>
              ${p.length ? `<div class="project-card-meta-item">📏 ${p.length}</div>` : ''}
              ${p.teamLead ? `<div class="project-card-meta-item">👤 ${p.teamLead}</div>` : ''}
            </div>

            <!-- 14D Shortcut badge if applicable -->
            ${is14D ? `
              <div style="margin-bottom: 8px;">
                <a href="#drawing-progress" class="badge" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); font-size: 0.7rem; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                  📐 Mở bảng theo dõi bản vẽ 14D →
                </a>
              </div>
            ` : ''}

            <!-- Footer: Team & Model Health -->
            <div class="project-card-footer" onclick="window.location.hash='project-detail/${p.id}'" style="cursor: pointer; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <div class="project-card-team">
                ${generateTeamAvatars(p.teamSize || 4)}
              </div>
              <div class="project-card-progress" style="display: flex; align-items: center; gap: 6px;">
                <span class="text-xs text-muted">BIM Health:</span>
                <span style="font-weight: 700; font-size: 0.82rem; color: ${(p.modelHealth || 0) >= 80 ? 'var(--accent-secondary)' : (p.modelHealth || 0) >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)'};">
                  ${p.modelHealth || 0}%
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function generateTeamAvatars(count) {
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
  const show = Math.min(count, 4);
  let html = '';
  for (let i = 0; i < show; i++) {
    html += `<div class="project-card-team-avatar" style="background: ${colors[i % colors.length]}; color: #fff; width: 24px; height: 24px; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; border-radius: 50%;">👤</div>`;
  }
  if (count > 4) {
    html += `<div class="project-card-team-avatar" style="background: var(--bg-tertiary); font-size: 0.65rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--text-muted);">+${count - 4}</div>`;
  }
  return html;
}

function renderResourceQuick(personnel) {
  const total = (personnel || []).length;
  const overloaded = (personnel || []).filter(p => (p.totalAllocation || 0) > 100);
  const available = (personnel || []).filter(p => (p.totalAllocation || 0) < 50);
  const avgUtil = total > 0 ? Math.round(personnel.reduce((s, p) => s + (p.totalAllocation || 0), 0) / total) : 0;

  return `
    <div class="mb-md">
      <div class="flex justify-between items-center mb-xs">
        <span class="text-xs font-semibold text-muted">Tải trung bình toàn đội</span>
        <span class="text-sm font-bold" style="color: ${avgUtil > 90 ? 'var(--accent-danger)' : avgUtil > 75 ? 'var(--accent-warning)' : 'var(--accent-secondary)'};">${avgUtil}%</span>
      </div>
      <div class="progress-bar" style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
        <div class="progress-bar-fill ${avgUtil > 90 ? 'red' : avgUtil > 75 ? 'orange' : 'green'}" style="width: ${Math.min(avgUtil, 100)}%; height: 100%;"></div>
      </div>
    </div>

    ${overloaded.length > 0 ? `
      <div class="mb-md" style="padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(239, 68, 68, 0.25);">
        <div class="text-xs font-bold text-danger mb-xs" style="display: flex; align-items: center; gap: 4px;">
          <span>🔥</span> Quá tải (${overloaded.length})
        </div>
        ${overloaded.slice(0, 3).map(p => `
          <div class="text-xs" style="color: var(--text-secondary); padding: 3px 0; display: flex; justify-content: space-between;">
            <span>${p.name}</span>
            <strong class="text-danger">${p.totalAllocation}%</strong>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${available.length > 0 ? `
      <div style="padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.25);">
        <div class="text-xs font-bold text-success mb-xs" style="display: flex; align-items: center; gap: 4px;">
          <span>✅</span> Sẵn sàng nhận việc (${available.length})
        </div>
        ${available.slice(0, 4).map(p => `
          <div class="text-xs" style="color: var(--text-secondary); padding: 3px 0; display: flex; justify-content: space-between;">
            <span>${p.name}</span>
            <strong class="text-success">${p.totalAllocation || 0}%</strong>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

/**
 * Refresh the entire dashboard
 */
function refreshDashboard() {
  const container = document.getElementById('page-content');
  if (!container) return;
  container.innerHTML = render();
  init();
}

/**
 * Confirm and delete a project
 */
function confirmDeleteProject(projectId) {
  const { projects } = getState();
  const project = (projects || []).find(p => p.id === projectId);
  if (!project) return;

  const html = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
      <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
        Xóa dự án "${project.name}"?
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
        Mã: <strong>${project.code || project.id}</strong> · ${project.location || ''}<br/>
        Hành động này không thể hoàn tác.
      </div>
      <div class="flex justify-center gap-sm">
        <button class="btn btn-ghost" id="confirm-cancel">Hủy</button>
        <button class="btn" id="confirm-delete" style="background: var(--accent-danger); color: white;">🗑️ Xóa dự án</button>
      </div>
    </div>
  `;

  openModal('Xác nhận xóa', html);

  setTimeout(() => {
    document.getElementById('confirm-cancel')?.addEventListener('click', closeModal);
    document.getElementById('confirm-delete')?.addEventListener('click', () => {
      deleteProject(projectId);
      closeModal();
      showToast(`Đã xóa dự án "${project.name}"`);
      refreshDashboard();
    });
  }, 50);
}

// ============================================
// LIVE ANALYTICS CHARTS (REAL DATA ENGINE)
// ============================================

function initAnalyticsCharts() {
  if (!window.Chart) return;
  
  const { theme, projects = [], personnel = [], timesheets = [] } = getState();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const textMutedColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  const canvas1 = document.getElementById('healthTrendChart');
  const canvas2 = document.getElementById('resourceAllocationChart');
  if (!canvas1 || !canvas2) return;

  const ctx1 = canvas1.getContext('2d');
  const ctx2 = canvas2.getContext('2d');

  if (window.healthChartInstance) {
    window.healthChartInstance.destroy();
    window.healthChartInstance = null;
  }
  if (window.resChartInstance) {
    window.resChartInstance.destroy();
    window.resChartInstance = null;
  }

  // Lấy danh sách tên viết tắt của các dự án thực tế (thu hẹp vào dự án trọng tâm nếu đang ở Focus Mode)
  const chartProjects = isFocusMode ? projects.filter(p => isProjectAtRisk(p)) : projects;
  const projectLabels = chartProjects.map(p => {
    const name = p.name || p.id;
    return name.length > 15 ? name.substring(0, 14) + '…' : name;
  });

  if (activeChartTab === 'health') {
    // 1A. Model Health Bar Chart for each project
    const healthData = chartProjects.map(p => p.modelHealth || 75);
    window.healthChartInstance = new window.Chart(ctx1, {
      type: 'bar',
      data: {
        labels: projectLabels,
        datasets: [{
          label: 'Sức khỏe mô hình (BIM Health %)',
          data: healthData,
          backgroundColor: healthData.map(val => val >= 80 ? 'rgba(16, 185, 129, 0.75)' : val >= 65 ? 'rgba(245, 158, 11, 0.75)' : 'rgba(239, 68, 68, 0.75)'),
          borderColor: healthData.map(val => val >= 80 ? '#10b981' : val >= 65 ? '#f59e0b' : '#ef4444'),
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          title: { display: true, text: isFocusMode ? `Chỉ số Sức khỏe Mô hình (${chartProjects.length} Dự án Trọng tâm)` : 'Chỉ số Sức khỏe Mô hình (Model Health) theo Dự án', color: textColor, font: { size: 13, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: textMutedColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textMutedColor }, grid: { color: gridColor }, min: 0, max: 100 }
        }
      }
    });

    // 1B. Unresolved Clashes per project
    const clashesData = chartProjects.map(p => Math.max(0, (p.clashesTotal || 0) - (p.clashesResolved || 0)));
    window.resChartInstance = new window.Chart(ctx2, {
      type: 'bar',
      data: {
        labels: projectLabels,
        datasets: [{
          label: 'Số Clash chưa xử lý',
          data: clashesData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          title: { display: true, text: isFocusMode ? `Xung đột mô hình (${chartProjects.length} Dự án Trọng tâm)` : 'Xung đột mô hình (Clashes) cần rà soát', color: textColor, font: { size: 13, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: textMutedColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textMutedColor }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });

  } else if (activeChartTab === 'progress') {
    // 2A. Project Progress vs Target
    const progressData = chartProjects.map(p => p.progress || 0);
    window.healthChartInstance = new window.Chart(ctx1, {
      type: 'line',
      data: {
        labels: projectLabels,
        datasets: [{
          label: 'Tiến độ thực tế (%)',
          data: progressData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          title: { display: true, text: isFocusMode ? `Tiến độ Thực tế (${chartProjects.length} Dự án Trọng tâm)` : 'Tiến độ Thực tế Dự án (%)', color: textColor, font: { size: 13, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: textMutedColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textMutedColor }, grid: { color: gridColor }, min: 0, max: 100 }
        }
      }
    });

    // 2B. Status Distribution (Doughnut)
    const statusCounts = {
      active: chartProjects.filter(p => p.status === 'active').length,
      planning: chartProjects.filter(p => p.status === 'planning').length,
      'on-hold': chartProjects.filter(p => p.status === 'on-hold').length,
      completed: chartProjects.filter(p => p.status === 'completed').length,
      overdue: chartProjects.filter(p => isProjectOverdue(p)).length
    };
    window.resChartInstance = new window.Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Đang chạy', 'Kế hoạch', 'Tạm dừng', 'Hoàn thành', 'Quá hạn'],
        datasets: [{
          data: [statusCounts.active, statusCounts.planning, statusCounts['on-hold'], statusCounts.completed, statusCounts.overdue],
          backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'],
          borderWidth: 2,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 } } },
          title: { display: true, text: isFocusMode ? `Phân bố Trạng thái (${chartProjects.length} Dự án Trọng tâm)` : 'Phân bố Trạng thái Portfolio', color: textColor, font: { size: 13, weight: 'bold' } }
        }
      }
    });

  } else if (activeChartTab === 'timesheet') {
    // 3A. Real Hours Logged per Project from state.timesheets
    const projHoursMap = {};
    chartProjects.forEach(p => { projHoursMap[p.id] = 0; });
    (timesheets || []).forEach(ts => {
      if (ts.isActual && ts.projectId) {
        projHoursMap[ts.projectId] = (projHoursMap[ts.projectId] || 0) + (parseFloat(ts.hours) || 0);
      }
    });

    const hoursData = chartProjects.map(p => projHoursMap[p.id] || 0);
    window.healthChartInstance = new window.Chart(ctx1, {
      type: 'bar',
      data: {
        labels: projectLabels,
        datasets: [{
          label: 'Tổng giờ làm việc thực tế đã ghi nhận (Giờ)',
          data: hoursData,
          backgroundColor: 'rgba(6, 182, 212, 0.75)',
          borderColor: '#06b6d4',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          title: { display: true, text: isFocusMode ? `Số giờ làm việc (${chartProjects.length} Dự án Trọng tâm)` : 'Số giờ làm việc thực tế từ Timesheets (theo Dự án)', color: textColor, font: { size: 13, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: textMutedColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textMutedColor }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });

    // 3B. Personnel Workload Allocation by Role
    const roleMap = {};
    (personnel || []).forEach(p => {
      const r = p.role || 'Khác';
      if (!roleMap[r]) roleMap[r] = { total: 0, count: 0 };
      roleMap[r].total += (p.totalAllocation || 0);
      roleMap[r].count += 1;
    });

    const roleLabels = Object.keys(roleMap);
    const roleAvgData = roleLabels.map(r => Math.round(roleMap[r].total / (roleMap[r].count || 1)));

    window.resChartInstance = new window.Chart(ctx2, {
      type: 'bar',
      data: {
        labels: roleLabels,
        datasets: [{
          label: 'Tải trung bình (%)',
          data: roleAvgData,
          backgroundColor: 'rgba(139, 92, 246, 0.75)',
          borderColor: '#8b5cf6',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor, font: { size: 11 } } },
          title: { display: true, text: 'Tỷ lệ tải công việc theo Vai trò chuyên môn', color: textColor, font: { size: 13, weight: 'bold' } }
        },
        scales: {
          x: { ticks: { color: textMutedColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textMutedColor }, grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }
}

// ============================================
// EVENTS & BINDINGS
// ============================================

export function init() {
  // Initialize animations, context menu and gantt chart
  initCounters();
  initContextMenu(refreshDashboard);
  initGanttEvents(refreshDashboard, isFocusMode ? (getState().projects || []).filter(p => isProjectAtRisk(p)) : null);

  const { dashboardView, projects = [] } = getState();
  if (dashboardView === 'list') {
    const cards = document.querySelectorAll('.project-card');
    staggerFadeIn(cards);
  }

  // Common function to apply all filters & sorting
  const applyFilters = () => {
    const { dashboardView, projects = [] } = getState();
    const filtered = getFilteredProjects(projects);
    const countBadge = document.getElementById('project-count-badge');
    if (countBadge) {
      countBadge.textContent = isFocusMode ? `${filtered.length} / ${projects.length} dự án trọng tâm` : `${filtered.length} dự án`;
      if (isFocusMode) {
        countBadge.classList.add('red');
        countBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        countBadge.style.color = '#ef4444';
        countBadge.style.fontWeight = '700';
      } else {
        countBadge.classList.remove('red');
        countBadge.style.background = 'var(--bg-tertiary)';
        countBadge.style.color = '';
        countBadge.style.fontWeight = '';
      }
    }
    const list = document.getElementById('projects-list');
    if (list) {
      if (dashboardView === 'kanban') {
        list.innerHTML = renderKanbanBoard(filtered);
        initKanbanEvents(refreshDashboard);
      } else {
        list.innerHTML = renderProjectsList(filtered);
        staggerFadeIn(document.querySelectorAll('.project-card'));
        bindCardActions();
      }
    }
  };

  // 1. Interactive KPI Clicks
  document.querySelectorAll('.kpi-interactive-card').forEach(card => {
    card.addEventListener('click', () => {
      const kpi = card.dataset.kpi;
      isFocusMode = false;
      if (activeKPIFilter === kpi && kpi !== 'all') {
        activeKPIFilter = 'all'; // Toggle back to all
      } else {
        activeKPIFilter = kpi;
      }
      refreshDashboard();
    });
  });

  // 2. Executive Banner Focus Mode Trigger
  document.getElementById('btn-banner-focus')?.addEventListener('click', () => {
    isFocusMode = !isFocusMode;
    activeKPIFilter = 'all';
    refreshDashboard();
  });

  // 3. Focus button in project toolbar
  document.getElementById('btn-toggle-focus')?.addEventListener('click', () => {
    isFocusMode = !isFocusMode;
    activeKPIFilter = 'all';
    refreshDashboard();
  });

  // 4. Reset All Filters
  document.getElementById('btn-reset-dash-filters')?.addEventListener('click', () => {
    isFocusMode = false;
    activeKPIFilter = 'all';
    currentSort = 'default';
    setState('filterStatus', 'all');
    setState('filterType', 'all');
    setState('searchQuery', '');
    refreshDashboard();
  });

  document.getElementById('btn-empty-reset-dash')?.addEventListener('click', () => {
    isFocusMode = false;
    activeKPIFilter = 'all';
    currentSort = 'default';
    setState('filterStatus', 'all');
    setState('filterType', 'all');
    setState('searchQuery', '');
    refreshDashboard();
  });

  // 5. Chart View Switcher
  document.querySelectorAll('.btn-chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.chartTab;
      if (activeChartTab !== tab) {
        activeChartTab = tab;
        document.querySelectorAll('.btn-chart-tab').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-ghost');
        });
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
        initAnalyticsCharts();
      }
    });
  });

  // 6. Search Input
  document.getElementById('live-search')?.addEventListener('input', (e) => {
    setState('searchQuery', e.target.value);
    applyFilters();
  });

  // 7. Filter Type Dropdown
  document.getElementById('filter-type')?.addEventListener('change', (e) => {
    setState('filterType', e.target.value);
    applyFilters();
  });

  // 8. Sort Dropdown
  document.getElementById('filter-sort')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });

  // 9. Filter Status Buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      isFocusMode = false;
      setState('filterStatus', btn.dataset.filter);
      applyFilters();
    });
  });

  // 10. View Mode Toggle (List vs Kanban)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setState('dashboardView', view);
      refreshDashboard();
    });
  });

  // 11. Gantt Scale Select
  document.getElementById('gantt-scale-select')?.addEventListener('change', (e) => {
    setState('ganttScale', e.target.value);
    refreshDashboard();
  });

  // 12. Add Project Button
  document.getElementById('btn-add-project')?.addEventListener('click', () => {
    openProjectForm('add', null, refreshDashboard);
  });

  // 13. Edit Layout Toggle
  document.getElementById('btn-edit-layout')?.addEventListener('click', () => {
    const isEditing = getState().isEditingLayout;
    setState('isEditingLayout', !isEditing);
    if (isEditing) {
      showToast('Đã lưu cấu hình bố cục thành công!');
    }
    refreshDashboard();
  });

  // 14. Export PDF (Print)
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    window.print();
  });

  // 15. Drag and Drop Layout & Resize Events
  bindLayoutDragAndResize();

  // 16. Kanban Events
  if (dashboardView === 'kanban') {
    initKanbanEvents(refreshDashboard);
  }

  // 17. Analytics Charts
  if (document.getElementById('healthTrendChart')) {
    initAnalyticsCharts();
    window.addEventListener('themeChanged', () => {
      requestAnimationFrame(initAnalyticsCharts);
    });
  }

  // 18. Bind Card Action Buttons
  bindCardActions();
}

/**
 * Drag and Drop & Resize Layout Binding
 */
function bindLayoutDragAndResize() {
  const container = document.getElementById('dashboard-grid');
  const widgets = container?.querySelectorAll('.widget');
  let draggedWidget = null;

  widgets?.forEach(widget => {
    widget.addEventListener('dragstart', (e) => {
      if (!getState().isEditingLayout) {
        e.preventDefault();
        return;
      }
      draggedWidget = widget;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => widget.classList.add('dragging'), 0);
    });

    widget.addEventListener('dragend', () => {
      draggedWidget = null;
      widget.classList.remove('dragging');
      widgets.forEach(w => w.classList.remove('drag-over'));
    });

    widget.addEventListener('dragover', (e) => {
      if (!getState().isEditingLayout) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return false;
    });

    widget.addEventListener('dragenter', (e) => {
      if (!getState().isEditingLayout) return;
      if (widget !== draggedWidget) {
        widget.classList.add('drag-over');
      }
    });

    widget.addEventListener('dragleave', () => {
      widget.classList.remove('drag-over');
    });

    widget.addEventListener('drop', (e) => {
      if (!getState().isEditingLayout) return;
      e.stopPropagation();
      widget.classList.remove('drag-over');

      if (draggedWidget !== widget) {
        const layout = [...getState().dashboardLayout];
        const draggedId = draggedWidget.dataset.id;
        const targetId = widget.dataset.id;
        
        const draggedIndex = layout.indexOf(draggedId);
        const targetIndex = layout.indexOf(targetId);
        
        if (draggedIndex > -1 && targetIndex > -1) {
          layout.splice(draggedIndex, 1);
          layout.splice(targetIndex, 0, draggedId);
          
          setState('dashboardLayout', layout);
          refreshDashboard();
        }
      }
      return false;
    });
  });

  // Resize Handle
  document.querySelectorAll('.resize-handle').forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const targetId = handle.dataset.target;
      const widget = document.querySelector(`.widget[data-id="${targetId}"]`);
      if (!widget || !container) return;
      
      const startX = e.clientX;
      const initialWidth = widget.offsetWidth;
      const containerWidth = container.offsetWidth;
      const colWidth = (containerWidth + 24) / 3;
      
      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const newWidth = initialWidth + dx;
        let newSpan = Math.max(1, Math.min(3, Math.round(newWidth / colWidth)));
        widget.className = widget.className.replace(/col-span-\d/g, '');
        widget.classList.add(`col-span-${newSpan}`);
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        const currentSpan = parseInt(widget.className.match(/col-span-(\d)/)?.[1] || 1);
        const spans = { ...getState().widgetSpans };
        spans[targetId] = currentSpan;
        setState('widgetSpans', spans);
        refreshDashboard();
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

/**
 * Bind edit/delete action buttons and context menus
 */
function bindCardActions() {
  // Edit buttons
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.editId;
      const { projects } = getState();
      const project = (projects || []).find(p => p.id === id);
      if (project) {
        openProjectForm('edit', project, refreshDashboard);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteProject(btn.dataset.deleteId);
    });
  });

  // Right-click Context Menu
  document.querySelectorAll('.project-card, .kanban-card').forEach(card => {
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const id = card.dataset.id || card.dataset.projectId;
      const x = e.clientX;
      const y = e.clientY;
      if (id) {
        showContextMenu(x, y, id);
      }
    });
  });
}

export function destroy() {
  if (window.healthChartInstance) {
    window.healthChartInstance.destroy();
    window.healthChartInstance = null;
  }
  if (window.resChartInstance) {
    window.resChartInstance.destroy();
    window.resChartInstance = null;
  }
}
