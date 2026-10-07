// ============================================
// DASHBOARD — Portfolio Overview
// ============================================
import { getState, setState, deleteProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES } from '../data/constants.js';
import { openProjectForm, showToast } from '../components/ProjectFormModal.js';
import { openModal, closeModal } from '../components/Modal.js';
import { renderKanbanBoard, initKanbanEvents } from '../components/KanbanBoard.js';
import { initCounters, staggerFadeIn } from '../utils/animations.js';
import { initContextMenu, showContextMenu, hideContextMenu } from '../components/ContextMenu.js';
import { renderGanttChart, initGanttEvents } from '../components/GanttChart.js';

export function render() {
  const { projects, personnel, activityLog, qualityData, dashboardView, ganttScale, isEditingLayout, dashboardLayout, widgetSpans } = getState();

  // Widget Renderers
  const renderers = {
    kpi: () => `
      <div class="kpi-grid stagger-children widget col-span-${widgetSpans.kpi}" data-id="kpi" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="kpi">⇹</div>` : ''}
        ${renderKPI('📁', 'Tổng dự án', projects.length, `${projects.filter(p => p.status === 'active').length} đang triển khai`, 'blue', '', '')}
        ${renderKPI('📊', 'Tiến độ TB', `${Math.round(projects.reduce((s, p) => s + p.progress, 0) / (projects.length||1))}%`, 'Đúng tiến độ', 'green', '↑', 'up')}
        ${renderKPI('👥', 'Nhân sự', personnel.length, 'Ổn định', 'cyan', '', '')}
        ${renderKPI('⚡', 'Clash mới', qualityData?.clashSummary?.reduce((s, c) => s + c.newClashes, 0) || 0, 'Cần xử lý', 'orange', '', '')}
        ${renderKPI('💚', 'Model Health', `${Math.round(projects.reduce((s, p) => s + p.modelHealth, 0) / (projects.length||1))}%`, 'Tốt', 'green', '', '')}
        ${(() => {
          const overdueCount = projects.filter(p => p.status === 'overdue' || (p.status !== 'completed' && p.endDate && new Date(p.endDate) < new Date() && p.progress < 100)).length;
          return renderKPI('🔴', 'Overdue', overdueCount, overdueCount === 0 ? 'Không có' : 'Cần xử lý ngay', overdueCount === 0 ? 'green' : 'red', '', '');
        })()}
      </div>
    `,
    projects: () => `
      <div class="card widget ${dashboardView === 'kanban' ? 'col-span-3' : `col-span-${widgetSpans.projects}`}" data-id="projects" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="projects">⇹</div>` : ''}
        <div class="card-header">
          <h3 class="card-title">🏗️ Dự án đang triển khai</h3>
          <div class="flex gap-sm">
            <div class="view-toggle mr-md">
              <button class="view-toggle-btn ${dashboardView === 'list' ? 'active' : ''}" data-view="list">Dạng danh sách</button>
              <button class="view-toggle-btn ${dashboardView === 'kanban' ? 'active' : ''}" data-view="kanban">Kanban</button>
            </div>
            ${dashboardView === 'list' ? `
              <div class="flex gap-sm">
                <div class="search-input-wrapper">
                  <span class="search-icon">🔍</span>
                  <input type="text" id="live-search" class="form-input" placeholder="Tìm tên/mã..." style="width: 200px; padding-left: 32px;" value="${getState().searchQuery || ''}">
                </div>
                <select class="form-select" id="filter-type" style="width: 130px;">
                  <option value="all">Mọi loại hình</option>
                  <option value="road">Đường bộ</option>
                  <option value="bridge">Cầu</option>
                </select>
                <button class="filter-chip active" data-filter="all" id="filter-all">Tất cả</button>
                <button class="filter-chip" data-filter="active" id="filter-active">Đang chạy</button>
              </div>
            ` : ''}
          </div>
        </div>
        <div id="projects-list" class="stagger-list">
          ${dashboardView === 'kanban' ? renderKanbanBoard(projects) : renderProjectsList(projects)}
        </div>
      </div>
    `,
    sidebar: () => dashboardView === 'list' ? `
      <div class="flex flex-col gap-md widget col-span-${widgetSpans.sidebar}" data-id="sidebar" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="sidebar">⇹</div>` : ''}
        <div class="card">
          <div class="card-header"><h3 class="card-title">👥 Nguồn lực</h3></div>
          ${renderResourceQuick(personnel)}
        </div>
        <div class="card" style="flex: 1;">
          <div class="card-header"><h3 class="card-title">📋 Hoạt động gần đây</h3></div>
          <div style="max-height: 350px; overflow-y: auto;">
            ${activityLog.map(a => `
              <div class="activity-item">
                <div class="activity-dot" style="background: ${a.dotColor};"></div>
                <div class="activity-content">
                  <div class="activity-text"><strong>${a.user}</strong> ${a.action}</div>
                  <div class="activity-time">${a.time}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : '',
    gantt: () => `
      <div class="card widget col-span-${widgetSpans.gantt || 3}" data-id="gantt" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? `<div class="resize-handle" data-target="gantt" title="Kéo để co giãn độ rộng">⇹</div>` : ''}
        <div class="card-header">
          <h3 class="card-title">📅 Timeline tổng quan (Kéo thả để dời lịch)</h3>
          <div class="flex items-center gap-sm">
            <select id="gantt-scale-select" class="form-select" style="width: 120px; padding: 4px 10px; font-size: 0.8rem; font-weight: 600;">
              <option value="day" ${ganttScale === 'day' ? 'selected' : ''}>DAY</option>
              <option value="week" ${ganttScale === 'week' ? 'selected' : ''}>WEEK</option>
              <option value="month" ${ganttScale === 'month' ? 'selected' : ''}>MONTH</option>
              <option value="quarter" ${ganttScale === 'quarter' ? 'selected' : ''}>QUARTER</option>
            </select>
          </div>
        </div>
        ${renderGanttChart(projects, ganttScale)}
      </div>
    `,
    analytics: () => `
      <div class="card widget col-span-${widgetSpans.analytics || 3}" data-id="analytics" draggable="${isEditingLayout}" style="${isEditingLayout ? 'border: 2px dashed var(--accent-primary); cursor: grab; position: relative;' : ''}">
        ${isEditingLayout ? '<div class="resize-handle" data-target="analytics" title="Kéo để co giãn độ rộng">⇹</div>' : ''}
        <div class="card-header">
          <h3 class="card-title">📈 Phân tích dữ liệu (Analytics)</h3>
        </div>
        <div style="display: flex; gap: var(--space-lg); flex-wrap: wrap; padding: var(--space-md);">
          <div style="flex: 1; min-width: 300px;">
            <canvas id="healthTrendChart"></canvas>
          </div>
          <div style="flex: 1; min-width: 300px;">
            <canvas id="resourceAllocationChart"></canvas>
          </div>
        </div>
      </div>
    `
  };

  return `
    <div class="animate-fade-in-up">
      <!-- Dashboard Header -->
      <div class="section-header mb-lg" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 class="section-title">📊 Tổng quan dự án</h1>
          <div class="section-subtitle">Quản lý portfolio dự án BIM hạ tầng giao thông</div>
        </div>
        <div class="flex gap-md">
          <button class="btn btn-outline" id="btn-export-pdf" title="Xuất báo cáo PDF/Excel">
            🖨️ Xuất báo cáo
          </button>
          ${['BIM Manager', 'Project Manager'].includes(getState().currentUserRole) ? `
            <button class="btn ${isEditingLayout ? 'btn-primary' : 'btn-outline'}" id="btn-edit-layout">
              ${isEditingLayout ? '✅ Hoàn tất lưu' : '⚙️ Chỉnh sửa bố cục'}
            </button>
            <button class="btn btn-primary" id="btn-add-project">
              <span style="font-size: 1.1rem;">+</span> Tạo dự án mới
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

function renderKPI(icon, label, value, sub, color, trendIcon, trendDir) {
  // Check if value is a number or string with %
  let displayValue = value;
  let countAttr = '';
  let suffix = '';
  
  if (typeof value === 'number') {
    displayValue = '0'; // Initial state for animation
    countAttr = `data-count="${value}"`;
  } else if (typeof value === 'string' && value.endsWith('%')) {
    displayValue = '0%';
    countAttr = `data-count="${value.replace('%', '')}" data-suffix="%"`;
  }

  return `
    <div class="kpi-card ${color} animate-fade-in-up">
      <div class="kpi-card-top">
        <div class="kpi-card-icon">${icon}</div>
        ${trendIcon ? `<span class="kpi-card-trend ${trendDir}">${trendIcon}</span>` : ''}
      </div>
      <div class="kpi-card-value" ${countAttr}>${displayValue}</div>
      <div class="kpi-card-label">${label}</div>
      <div class="text-xs text-muted mt-md">${sub}</div>
    </div>
  `;
}

function renderProjectsList(projects) {
  return `
    <div class="project-cards-grid">
      ${projects.map(p => {
        const typeInfo = PROJECT_TYPES[p.type] || {};
        const statusInfo = PROJECT_STATUSES[p.status] || {};
        const progressColor = p.progress >= 70 ? 'green' : p.progress >= 40 ? '' : 'orange';

        return `
          <div class="project-card ${p.type}" data-project-id="${p.id}">
            <!-- Action buttons (visible on hover) -->
            ${['BIM Manager', 'Project Manager'].includes(getState().currentUserRole) ? `
              <div class="project-card-actions">
                <button class="card-action-btn" data-edit-id="${p.id}" title="Chỉnh sửa">✏️</button>
                <button class="card-action-btn danger" data-delete-id="${p.id}" title="Xóa">🗑️</button>
              </div>
            ` : ''}
            <div class="project-card-header" onclick="window.location.hash='project-detail/${p.id}'" style="cursor: pointer;">
              <div>
                <div class="project-card-name">${p.name}</div>
                <div class="project-card-code">${p.code}</div>
              </div>
              <div class="project-card-icon">${typeInfo.icon || '📁'}</div>
            </div>
            <div class="flex items-center gap-sm mb-sm">
              <span class="badge ${statusInfo.class}">
                <span class="badge-dot"></span>
                ${statusInfo.label}
              </span>
              <span class="text-xs text-muted">LOD ${p.lodCurrent}/${p.lodTarget}</span>
            </div>
            <div class="mb-sm">
              <div class="flex justify-between mb-xs">
                <span class="text-xs text-muted">Tiến độ</span>
                <span class="text-xs font-semibold">${p.progress}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill ${progressColor}" style="width: ${p.progress}%;"></div>
              </div>
            </div>
            <div class="project-card-meta">
              <div class="project-card-meta-item">📍 ${p.location}</div>
              <div class="project-card-meta-item">📏 ${p.length}</div>
            </div>
            <div class="project-card-footer" onclick="window.location.hash='project-detail/${p.id}'" style="cursor: pointer;">
              <div class="project-card-team">
                ${generateTeamAvatars(p.teamSize)}
              </div>
              <div class="project-card-progress">
                <span class="text-xs text-muted">Health</span>
                <span style="color: ${p.modelHealth >= 80 ? 'var(--accent-secondary)' : p.modelHealth >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)'};">
                  ${p.modelHealth}%
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
  const colors = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-cyan)'];
  const show = Math.min(count, 4);
  let html = '';
  for (let i = 0; i < show; i++) {
    html += `<div class="project-card-team-avatar" style="background: ${colors[i % colors.length]};">👤</div>`;
  }
  if (count > 4) {
    html += `<div class="project-card-team-avatar" style="background: var(--bg-tertiary); font-size: 0.6rem;">+${count - 4}</div>`;
  }
  return html;
}

function renderResourceQuick(personnel) {
  const total = personnel.length;
  const overloaded = personnel.filter(p => p.totalAllocation > 100);
  const available = personnel.filter(p => p.totalAllocation < 70);
  const avgUtil = total > 0 ? Math.round(personnel.reduce((s, p) => s + p.totalAllocation, 0) / total) : 0;

  return `
    <div class="mb-md">
      <div class="flex justify-between items-center mb-sm">
        <span class="text-sm">Tải trung bình</span>
        <span class="text-sm font-bold" style="color: ${avgUtil > 90 ? 'var(--accent-warning)' : 'var(--accent-secondary)'};">${avgUtil}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill ${avgUtil > 90 ? 'orange' : 'green'}" style="width: ${Math.min(avgUtil, 100)}%;"></div>
      </div>
    </div>
    ${overloaded.length > 0 ? `
      <div class="mb-md" style="padding: 10px; background: var(--accent-danger-glow); border-radius: var(--radius-md); border: 1px solid rgba(239,68,68,0.2);">
        <div class="text-xs font-bold text-danger mb-xs">⚠️ Quá tải (${overloaded.length})</div>
        ${overloaded.map(p => `
          <div class="text-xs" style="color: var(--text-secondary); padding: 2px 0;">${p.name} — <strong class="text-danger">${p.totalAllocation}%</strong></div>
        `).join('')}
      </div>
    ` : ''}
    ${available.length > 0 ? `
      <div style="padding: 10px; background: var(--accent-secondary-glow); border-radius: var(--radius-md); border: 1px solid rgba(16,185,129,0.2);">
        <div class="text-xs font-bold text-success mb-xs">✅ Có thể phân bổ thêm (${available.length})</div>
        ${available.map(p => `
          <div class="text-xs" style="color: var(--text-secondary); padding: 2px 0;">${p.name} — <strong class="text-success">${p.totalAllocation}%</strong></div>
        `).join('')}
      </div>
    ` : ''}
  `;
}



/**
 * Refresh the entire dashboard (KPIs + project list + activity + gantt)
 */
function refreshDashboard() {
  const container = document.getElementById('page-content');
  if (!container) return;
  // Re-import and render
  container.innerHTML = render();
  init();
}

/**
 * Confirm and delete a project
 */
function confirmDeleteProject(projectId) {
  const { projects } = getState();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const html = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
      <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">
        Xóa dự án "${project.name}"?
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
        Mã: <strong>${project.code}</strong> · ${project.location}<br/>
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

export function init() {
  // Initialize animations, context menu and gantt chart
  initCounters();
  initContextMenu(refreshDashboard);
  initGanttEvents(refreshDashboard);

  // Apply stagger fade in for list items if in list view
  const { dashboardView } = getState();
  if (dashboardView === 'list') {
    const cards = document.querySelectorAll('.project-card');
    staggerFadeIn(cards);
  }

  // Add project button
  document.getElementById('btn-add-project')?.addEventListener('click', () => {
    openProjectForm('add', null, refreshDashboard);
  });

  // Common function to apply all filters
  const applyFilters = () => {
    const { projects, dashboardView, filterStatus, filterType, searchQuery } = getState();
    
    if (dashboardView === 'list') {
      let filtered = projects;
      
      if (filterStatus !== 'all') {
        filtered = filtered.filter(p => p.status === filterStatus);
      }
      if (filterType !== 'all') {
        filtered = filtered.filter(p => p.type === filterType);
      }
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(lowerQ) || 
          p.code.toLowerCase().includes(lowerQ)
        );
      }

      const list = document.getElementById('projects-list');
      if (list) {
        list.innerHTML = renderProjectsList(filtered);
        staggerFadeIn(document.querySelectorAll('.project-card'));
        bindCardActions();
      }
    }
  };

  // Filter Status buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setState('filterStatus', btn.dataset.filter);
      applyFilters();
    });
  });

  // Filter Type Dropdown
  document.getElementById('filter-type')?.addEventListener('change', (e) => {
    setState('filterType', e.target.value);
    applyFilters();
  });

  // Gantt Scale Toggle
  document.getElementById('gantt-scale-select')?.addEventListener('change', (e) => {
    setState('ganttScale', e.target.value);
    refreshDashboard();
  });

  // Live Search Input
  document.getElementById('live-search')?.addEventListener('input', (e) => {
    setState('searchQuery', e.target.value);
    applyFilters();
  });

  // View toggle buttons
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      setState('dashboardView', view);
      refreshDashboard();
    });
  });

  // Edit Layout Toggle
  document.getElementById('btn-edit-layout')?.addEventListener('click', () => {
    const isEditing = getState().isEditingLayout;
    setState('isEditingLayout', !isEditing);
    if (isEditing) {
      showToast('Đã lưu cấu hình bộ cục thành công!');
    }
    refreshDashboard();
  });

  // Export PDF (Print)
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    window.print();
  });


  // Layout Drag and Drop Events
  if (dashboardView) {
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
          // Reorder logic
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

    // Resize Logic
    document.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetId = handle.dataset.target;
        const widget = document.querySelector(`.widget[data-id="${targetId}"]`);
        if (!widget) return;
        
        const startX = e.clientX;
        const initialWidth = widget.offsetWidth;
        const containerWidth = container.offsetWidth;
        const colWidth = (containerWidth + 24) / 3; // roughly 33% (24 is gap)
        
        const onMouseMove = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const newWidth = initialWidth + dx;
          
          let newSpan = Math.max(1, Math.min(3, Math.round(newWidth / colWidth)));
          
          // Apply visual feedback instantly
          widget.className = widget.className.replace(/col-span-\d/g, '');
          widget.classList.add(`col-span-${newSpan}`);
        };
        
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          // Save new span to state
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

  // Init drag and drop events if in kanban view
  if (dashboardView === 'kanban') {
    initKanbanEvents(refreshDashboard);
  }

  // Initialize Analytics Charts if present
  if (document.getElementById('healthTrendChart')) {
    initAnalyticsCharts();
    
    // Listen for theme changes to redraw charts with correct colors
    window.addEventListener('themeChanged', () => {
      // Use requestAnimationFrame to ensure CSS classes have applied
      requestAnimationFrame(initAnalyticsCharts);
    });
  }

  // Bind card actions
  bindCardActions();
}

function initAnalyticsCharts() {
  if (!window.Chart) return;
  
  const { theme } = getState();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  // 1. Health Trend Line Chart
  const ctxHealth = document.getElementById('healthTrendChart').getContext('2d');
  if (window.healthChartInstance) window.healthChartInstance.destroy();
  window.healthChartInstance = new window.Chart(ctxHealth, {
    type: 'line',
    data: {
      labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'],
      datasets: [{
        label: 'Model Health trung bình (%)',
        data: [65, 68, 70, 75, 78, 82],
        borderColor: '#10b981', // green
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: true, text: 'Xu hướng Chất lượng Mô hình', color: textColor }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor }, min: 0, max: 100 }
      }
    }
  });

  // 2. Resource Allocation Bar Chart
  const ctxRes = document.getElementById('resourceAllocationChart').getContext('2d');
  if (window.resChartInstance) window.resChartInstance.destroy();
  window.resChartInstance = new window.Chart(ctxRes, {
    type: 'bar',
    data: {
      labels: ['BIM Coord', 'Thiết kế', 'Giám sát', 'QA/QC'],
      datasets: [{
        label: 'Số giờ làm việc/tuần',
        data: [120, 350, 180, 90],
        backgroundColor: '#3b82f6', // blue
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: true, text: 'Phân bổ Nguồn lực', color: textColor }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });
}

/**
 * Bind edit/delete action buttons on project cards
 */
function bindCardActions() {
  // Edit buttons
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.editId;
      const { projects } = getState();
      const project = projects.find(p => p.id === id);
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
      e.preventDefault(); // Prevent default browser menu
      
      // Get project ID
      const id = card.dataset.id || card.dataset.projectId;
      
      // Determine click coordinates (with scroll adjustment if needed)
      const x = e.clientX;
      const y = e.clientY;
      
      if (id) {
        showContextMenu(x, y, id);
      }
    });
  });
}

export function destroy() {}
