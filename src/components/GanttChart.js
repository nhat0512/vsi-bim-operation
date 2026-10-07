// ============================================
// GANTT CHART COMPONENT (Frappe Gantt Integration)
// ============================================
import { updateProject, getState } from '../state.js';
import { showToast } from './ProjectFormModal.js';

let ganttInstance = null;

/**
 * Render the container for Frappe Gantt
 */
export function renderGanttChart(projects, scale = 'Month') {
  if (!projects || projects.length === 0) {
    return `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Không có dữ liệu dự án.</div>`;
  }

  // The actual initialization happens in initGanttEvents
  return `
    <div class="gantt-container" style="width: 100%; overflow-x: auto;">
      <svg id="frappe-gantt-chart" style="width: 100%; min-height: 300px;"></svg>
    </div>
  `;
}

/**
 * Initialize Frappe Gantt with Drag & Drop events
 */
export function initGanttEvents(onRefresh) {
  const svgEl = document.getElementById('frappe-gantt-chart');
  if (!svgEl) return;

  const { projects, currentUserRole } = getState();
  const isManager = ['BIM Manager', 'Project Manager'].includes(currentUserRole);

  // Map projects to Frappe Gantt task format
  const tasks = projects.map(p => {
    // Determine colors
    let customClass = 'gantt-bar-blue';
    if (p.type === 'bridge') customClass = 'gantt-bar-green';
    if (p.type === 'tunnel') customClass = 'gantt-bar-purple';
    if (p.status === 'overdue') customClass = 'gantt-bar-red';
    if (p.status === 'completed') customClass = 'gantt-bar-gray';

    return {
      id: p.id,
      name: p.name,
      start: p.startDate ? p.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      end: p.endDate ? p.endDate.split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      progress: p.progress || 0,
      custom_class: customClass
    };
  });

  if (tasks.length === 0) return;

  // Get current scale from select dropdown
  const scaleSelect = document.getElementById('gantt-scale-select');
  let viewMode = 'Month';
  if (scaleSelect) {
    const val = scaleSelect.value;
    if (val === 'day') viewMode = 'Day';
    if (val === 'week') viewMode = 'Week';
    if (val === 'quarter') viewMode = 'Year'; // Frappe uses Year or Month for larger scales
  }

  // Initialize Frappe Gantt
  try {
    ganttInstance = new Gantt("#frappe-gantt-chart", tasks, {
      header_height: 50,
      column_width: viewMode === 'Month' ? 30 : (viewMode === 'Day' ? 38 : 60),
      step: 24,
      view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
      bar_height: 20,
      bar_corner_radius: 3,
      arrow_curve: 5,
      padding: 18,
      view_mode: viewMode,
      date_format: 'YYYY-MM-DD',
      language: 'vi', // Custom or default
      readonly: !isManager, // Only managers can drag & drop
      on_date_change: function(task, start, end) {
        if (!isManager) {
          showToast('Bạn không có quyền dời lịch dự án', 'error');
          return;
        }

        const newStart = start.toISOString().split('T')[0];
        const newEnd = end.toISOString().split('T')[0];
        
        updateProject(task.id, {
          startDate: newStart,
          endDate: newEnd
        });

        showToast(`✅ Đã cập nhật tiến độ dự án ${task.name}`);
        if (onRefresh) onRefresh();
      },
      on_progress_change: function(task, progress) {
        if (!isManager) return;
        updateProject(task.id, { progress });
        showToast(`✅ Đã cập nhật ${progress}% cho ${task.name}`);
        if (onRefresh) onRefresh();
      }
    });

    // Add custom CSS for our bar colors because Frappe Gantt relies on custom_class styling
    const styleId = 'frappe-gantt-custom-colors';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .gantt-bar-blue .bar { fill: #3b82f6 !important; }
        .gantt-bar-blue .bar-progress { fill: #2563eb !important; }
        .gantt-bar-green .bar { fill: #10b981 !important; }
        .gantt-bar-green .bar-progress { fill: #059669 !important; }
        .gantt-bar-purple .bar { fill: #8b5cf6 !important; }
        .gantt-bar-purple .bar-progress { fill: #7c3aed !important; }
        .gantt-bar-red .bar { fill: #ef4444 !important; }
        .gantt-bar-red .bar-progress { fill: #dc2626 !important; }
        .gantt-bar-gray .bar { fill: #9ca3af !important; }
        .gantt-bar-gray .bar-progress { fill: #6b7280 !important; }
        .gantt .bar-label { fill: #fff; font-weight: bold; font-size: 11px; }
      `;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.error("Frappe Gantt Initialization Error:", error);
  }
}
