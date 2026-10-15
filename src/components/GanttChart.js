// ============================================
// GANTT CHART COMPONENT (Frappe Gantt + Bulletproof Native Fallback)
// ============================================
import { updateProject, getState } from '../state.js';
import { showToast } from './ProjectFormModal.js';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../data/constants.js';
import { formatLocalDate } from '../utils/formatters.js';

let ganttInstance = null;

/**
 * Render the container for Frappe Gantt
 */
export function renderGanttChart(projects, scale = 'month') {
  if (!projects || projects.length === 0) {
    return `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Không có dữ liệu dự án.</div>`;
  }

  return `
    <div class="gantt-container" id="gantt-main-container" style="width: 100%; overflow-x: auto; min-height: 280px; position: relative;">
      <svg id="frappe-gantt-chart" style="width: 100%; min-height: 280px;"></svg>
    </div>
  `;
}

/**
 * Initialize Frappe Gantt with Drag & Drop events
 */
export function initGanttEvents(onRefresh) {
  const container = document.getElementById('gantt-main-container');
  const svgEl = document.getElementById('frappe-gantt-chart');
  if (!container || !svgEl) return;

  const { projects = [], currentUserRole } = getState();
  const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole);

  if (projects.length === 0) return;

  // Prepare and sanitize tasks for Frappe Gantt
  const tasks = projects.map((p, idx) => {
    let customClass = 'gantt-bar-blue';
    if (p.type === 'bridge') customClass = 'gantt-bar-green';
    if (p.type === 'tunnel') customClass = 'gantt-bar-purple';
    if (p.type === 'interchange') customClass = 'gantt-bar-orange';
    if (p.status === 'overdue') customClass = 'gantt-bar-red';
    if (p.status === 'completed') customClass = 'gantt-bar-gray';

    // Safe date parsing to YYYY-MM-DD
    let startStr = p.startDate ? p.startDate.split('T')[0] : '2026-01-01';
    let endStr = p.endDate ? p.endDate.split('T')[0] : '2027-12-31';

    let dStart = new Date(startStr);
    let dEnd = new Date(endStr);
    if (isNaN(dStart.getTime())) dStart = new Date('2026-01-01');
    if (isNaN(dEnd.getTime()) || dEnd <= dStart) {
      dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 90);
    }

    startStr = formatLocalDate(dStart);
    endStr = formatLocalDate(dEnd);

    return {
      id: p.id || `proj-${idx}`,
      name: p.name || p.id,
      start: startStr,
      end: endStr,
      progress: Math.min(100, Math.max(0, Number(p.progress) || 0)),
      custom_class: customClass
    };
  });

  // Get current scale from select dropdown
  const scaleSelect = document.getElementById('gantt-scale-select');
  let viewMode = 'Month';
  if (scaleSelect) {
    const val = scaleSelect.value.toLowerCase();
    if (val === 'day') viewMode = 'Day';
    else if (val === 'week') viewMode = 'Week';
    else if (val === 'quarter' || val === 'year') viewMode = 'Year';
    else viewMode = 'Month';
  }

  // Inject Custom CSS for dark/light themes and custom bars
  injectGanttStyles();

  // Check if Gantt library is loaded on window
  const GanttClass = window.Gantt || (typeof Gantt !== 'undefined' ? Gantt : null);

  if (!GanttClass) {
    console.warn("Gantt library not found on window, using native timeline fallback.");
    renderNativeTimeline(container, projects, onRefresh);
    return;
  }

  try {
    // Clear any previous chart SVG children to prevent duplicates
    svgEl.innerHTML = '';

    ganttInstance = new GanttClass("#frappe-gantt-chart", tasks, {
      header_height: 50,
      column_width: viewMode === 'Month' ? 45 : (viewMode === 'Day' ? 38 : (viewMode === 'Week' ? 55 : 85)),
      step: 24,
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
      bar_height: 22,
      bar_corner_radius: 4,
      arrow_curve: 5,
      padding: 16,
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      language: 'en', // CRITICAL FIX: Frappe Gantt does not have 'vi' in its month_names dictionary, causing fatal TypeError. 'en' works reliably.
      readonly: !isManager, // Only managers can drag & drop
      on_date_change: function(task, start, end) {
        if (!isManager) {
          showToast('Bạn không có quyền dời lịch dự án', 'warning');
          return;
        }

        const newStart = formatLocalDate(start);
        const newEnd = formatLocalDate(end);
        
        updateProject(task.id, {
          startDate: newStart,
          endDate: newEnd
        });

        showToast(`✅ Đã dời lịch dự án "${task.name}": ${newStart} → ${newEnd}`);
        if (onRefresh) onRefresh();
      },
      on_progress_change: function(task, progress) {
        if (!isManager) return;
        updateProject(task.id, { progress });
        showToast(`✅ Đã cập nhật tiến độ ${progress}% cho "${task.name}"`);
        if (onRefresh) onRefresh();
      }
    });

  } catch (error) {
    console.error("Frappe Gantt Initialization Error, falling back to Native Timeline:", error);
    renderNativeTimeline(container, projects, onRefresh);
  }
}

/**
 * Inject custom styling for Gantt chart (Colors, Contrast, Dark Mode support)
 */
function injectGanttStyles() {
  const styleId = 'frappe-gantt-custom-colors';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      .gantt-container {
        background: var(--bg-card, #0f1729);
        border: 1px solid var(--border-default, rgba(148, 163, 184, 0.12));
        border-radius: var(--radius-sm, 8px);
      }
      .gantt .grid-header {
        fill: var(--bg-tertiary, #1e293b) !important;
        stroke: var(--border-subtle, rgba(148, 163, 184, 0.15)) !important;
      }
      .gantt .grid-row {
        fill: transparent !important;
      }
      .gantt .grid-row:nth-child(even) {
        fill: rgba(148, 163, 184, 0.03) !important;
      }
      .gantt .row-line {
        stroke: var(--border-subtle, rgba(148, 163, 184, 0.12)) !important;
      }
      .gantt .tick {
        stroke: var(--border-subtle, rgba(148, 163, 184, 0.12)) !important;
      }
      .gantt text {
        fill: var(--text-primary, #f1f5f9) !important;
        font-family: 'Inter', system-ui, sans-serif !important;
        font-size: 11px !important;
      }
      .gantt .lower-text {
        fill: var(--text-secondary, #94a3b8) !important;
      }
      .gantt .upper-text {
        fill: var(--text-primary, #f1f5f9) !important;
        font-weight: 600 !important;
      }
      .gantt .bar-label {
        fill: #ffffff !important;
        font-weight: 700 !important;
        font-size: 11px !important;
      }
      .gantt .bar {
        rx: 4px;
        ry: 4px;
        cursor: pointer;
      }
      .gantt-bar-blue .bar { fill: #3b82f6 !important; }
      .gantt-bar-blue .bar-progress { fill: #1d4ed8 !important; }
      .gantt-bar-green .bar { fill: #10b981 !important; }
      .gantt-bar-green .bar-progress { fill: #047857 !important; }
      .gantt-bar-purple .bar { fill: #8b5cf6 !important; }
      .gantt-bar-purple .bar-progress { fill: #6d28d9 !important; }
      .gantt-bar-orange .bar { fill: #f59e0b !important; }
      .gantt-bar-orange .bar-progress { fill: #b45309 !important; }
      .gantt-bar-red .bar { fill: #ef4444 !important; }
      .gantt-bar-red .bar-progress { fill: #b91c1c !important; }
      .gantt-bar-gray .bar { fill: #64748b !important; }
      .gantt-bar-gray .bar-progress { fill: #475569 !important; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Bulletproof Native HTML/CSS Timeline Fallback
 * Renders if Frappe Gantt library is unavailable or throws errors.
 */
function renderNativeTimeline(container, projects, onRefresh) {
  if (!container) return;

  // Calculate timeline bounds
  let minDate = new Date('2026-01-01').getTime();
  let maxDate = new Date('2027-12-31').getTime();

  projects.forEach(p => {
    if (p.startDate) {
      const s = new Date(p.startDate).getTime();
      if (!isNaN(s) && s < minDate) minDate = s;
    }
    if (p.endDate) {
      const e = new Date(p.endDate).getTime();
      if (!isNaN(e) && e > maxDate) maxDate = e;
    }
  });

  const totalDuration = maxDate - minDate;

  // Month markers
  const months = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur.getTime() <= maxDate) {
    months.push({
      label: `T${cur.getMonth() + 1}/${cur.getFullYear().toString().slice(2)}`,
      time: cur.getTime()
    });
    cur.setMonth(cur.getMonth() + 2); // Every 2 months
  }

  container.innerHTML = `
    <div style="padding: 12px; min-width: 800px;">
      <!-- Timeline Header Months -->
      <div style="display: flex; border-bottom: 1px solid var(--border-default); padding-bottom: 8px; margin-bottom: 12px; margin-left: 230px;">
        ${months.map(m => {
          const leftPct = ((m.time - minDate) / totalDuration) * 100;
          return `
            <div style="flex: 1; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-align: left; border-left: 1px dashed var(--border-subtle); padding-left: 4px;">
              ${m.label}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Project Timeline Rows -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${projects.map(p => {
          const typeInfo = PROJECT_TYPES[p.type] || {};
          const statusInfo = PROJECT_STATUSES[p.status] || {};
          
          let pStart = p.startDate ? new Date(p.startDate).getTime() : minDate;
          let pEnd = p.endDate ? new Date(p.endDate).getTime() : (minDate + 180*24*60*60*1000);
          if (isNaN(pStart)) pStart = minDate;
          if (isNaN(pEnd) || pEnd <= pStart) pEnd = pStart + 90*24*60*60*1000;

          const leftPct = Math.max(0, Math.min(95, ((pStart - minDate) / totalDuration) * 100));
          const widthPct = Math.max(5, Math.min(100 - leftPct, ((pEnd - pStart) / totalDuration) * 100));

          const barColors = {
            road: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            bridge: 'linear-gradient(90deg, #10b981, #34d399)',
            tunnel: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
            interchange: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
          };
          const bgGradient = barColors[p.type] || 'linear-gradient(90deg, #3b82f6, #1d4ed8)';

          return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 4px 0; border-bottom: 1px solid var(--border-subtle);">
              <!-- Project Label -->
              <div style="width: 218px; flex-shrink: 0; overflow: hidden; cursor: pointer;" onclick="window.location.hash='project-detail/${p.id}'" title="Xem chi tiết: ${p.name}">
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${typeInfo.icon || '📁'} ${p.name}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; font-size: 0.7rem; color: var(--text-muted); margin-top: 1px;">
                  <span>${p.code || p.id}</span> · 
                  <span class="badge ${statusInfo.class}" style="font-size: 0.62rem; padding: 0 4px;">${statusInfo.label}</span>
                </div>
              </div>

              <!-- Bar Track -->
              <div style="flex: 1; height: 26px; background: rgba(148, 163, 184, 0.05); border-radius: 4px; position: relative; overflow: hidden; border: 1px solid var(--border-subtle);">
                <div style="position: absolute; left: ${leftPct}%; width: ${widthPct}%; height: 100%; background: ${bgGradient}; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; color: #fff; font-size: 0.72rem; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer;" 
                     onclick="window.location.hash='project-detail/${p.id}'"
                     title="${p.name} (${p.startDate || '—'} → ${p.endDate || '—'}) · Tiến độ: ${p.progress || 0}%">
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">${p.name}</span>
                  <span>${p.progress || 0}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
