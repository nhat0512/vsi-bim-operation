// ============================================
// GANTT CHART COMPONENT (Interactive)
// ============================================
import { updateProject, getState } from '../state.js';
import { showToast } from './ProjectFormModal.js';

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  return new Date(dateStr);
}

// Helpers for Month/Quarter/Day math
const BASE_DATE = new Date(2026, 0, 1);
const MAX_MONTHS = 36; 
const MAX_DAYS = 1095; // roughly 3 years

function monthDiff(d1, d2) {
  let months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
}

function dayDiff(d1, d2) {
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Generate Headers based on Scale
function generateHeaders(scale) {
  let html = '';
  
  if (scale === 'quarter') {
    let topTierHtml = '';
    let bottomTierHtml = '';
    
    // 3 Years (2026, 2027, 2028)
    for (let y = 0; y < 3; y++) {
      const year = 2026 + y;
      topTierHtml += `<div style="min-width: 400px; text-align: left; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
        ${year}
      </div>`;
      
      for (let q = 1; q <= 4; q++) {
        bottomTierHtml += `<div style="min-width: 100px; text-align: center; padding: 6px 0; font-size: 0.7rem; font-weight: 500; color: var(--text-primary); border-right: 1px solid var(--border-subtle);">
          Q${q}
        </div>`;
      }
    }
    
    html = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        <div style="display: flex; width: 100%;">${topTierHtml}</div>
        <div style="display: flex; width: 100%;">${bottomTierHtml}</div>
      </div>
    `;
  } else if (scale === 'month') {
    let topTierHtml = '';
    let bottomTierHtml = '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 3 Years (2026, 2027, 2028)
    for (let y = 0; y < 3; y++) {
      const year = 2026 + y;
      topTierHtml += `<div style="min-width: 600px; text-align: left; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
        ${year}
      </div>`;
      
      for (let m = 0; m < 12; m++) {
        bottomTierHtml += `<div style="min-width: 50px; text-align: center; padding: 6px 0; font-size: 0.7rem; font-weight: 500; color: var(--text-primary); border-right: 1px solid var(--border-subtle);">
          ${monthNames[m]}
        </div>`;
      }
    }
    
    html = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        <div style="display: flex; width: 100%;">${topTierHtml}</div>
        <div style="display: flex; width: 100%;">${bottomTierHtml}</div>
      </div>
    `;
  } else if (scale === 'day') {
    let topTierHtml = '';
    let bottomTierHtml = '';
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const totalWeeks = Math.ceil(MAX_DAYS / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = new Date(2026, 0, 1 + w * 7);
      const mName = monthNames[weekStart.getMonth()];
      const y = weekStart.getFullYear();
      
      topTierHtml += `<div style="min-width: 280px; text-align: left; padding: 4px; font-size: 0.7rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
        ${mName} ${y} W${w + 1}
      </div>`;
      
      for (let d = 0; d < 7; d++) {
        const date = new Date(2026, 0, 1 + w * 7 + d);
        if (date.getFullYear() > 2028) break;
        
        const dayName = dayNames[date.getDay()];
        const dayNum = date.getDate();
        
        bottomTierHtml += `<div style="min-width: 40px; text-align: center; padding: 4px 0; font-size: 0.65rem; color: var(--text-muted); border-right: 1px solid var(--border-subtle);">
          <div style="font-weight: 700; margin-bottom: 2px;">${dayNum}</div>
          <div>${dayName}</div>
        </div>`;
      }
    }
    
    html = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        <div style="display: flex; width: 100%;">${topTierHtml}</div>
        <div style="display: flex; width: 100%;">${bottomTierHtml}</div>
      </div>
    `;
  } else if (scale === 'week') {
    let topTierHtml = '';
    let bottomTierHtml = '';
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const totalWeeks = Math.ceil(MAX_DAYS / 7);
    for (let w = 0; w < totalWeeks; w++) {
      const weekStart = new Date(2026, 0, 1 + w * 7);
      const mName = monthNames[weekStart.getMonth()];
      const y = weekStart.getFullYear();
      
      topTierHtml += `<div style="min-width: 280px; text-align: left; padding: 4px; font-size: 0.7rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
        ${mName} ${y} W${w + 1}
      </div>`;
      
      for (let d = 0; d < 7; d++) {
        const date = new Date(2026, 0, 1 + w * 7 + d);
        if (date.getFullYear() > 2028) break;
        
        const dayName = dayNames[date.getDay()];
        const dayNum = date.getDate();
        
        bottomTierHtml += `<div style="min-width: 40px; text-align: center; padding: 4px 0; font-size: 0.65rem; color: var(--text-muted); border-right: 1px solid var(--border-subtle);">
          <div style="font-weight: 700; margin-bottom: 2px;">${dayNum}</div>
          <div>${dayName}</div>
        </div>`;
      }
    }
    
    html = `
      <div style="display: flex; flex-direction: column; width: 100%;">
        <div style="display: flex; width: 100%;">${topTierHtml}</div>
        <div style="display: flex; width: 100%;">${bottomTierHtml}</div>
      </div>
    `;
  }
  
  return html;
}

export function renderGanttChart(projects, scale = 'month') {
  const barColors = { road: 'blue', bridge: 'green', tunnel: 'purple', interchange: 'orange' };
  
  const config = {
    quarter: { cellWidth: 100, totalWidth: 12 * 100 },
    month: { cellWidth: 50, totalWidth: 36 * 50 },
    week: { cellWidth: 40, totalWidth: 1095 * 40 },
    day: { cellWidth: 40, totalWidth: 1095 * 40 }
  };
  
  const c = config[scale];

  return `
    <div class="gantt-container" style="max-height: 300px; position: relative;" data-scale="${scale}">
      <div class="gantt-header">
        <div class="gantt-label" style="background: var(--bg-tertiary); font-weight: 700; font-size: var(--font-xs); color: var(--text-muted);">Dự án</div>
        <div style="display: flex; flex: 1; width: ${c.totalWidth}px;">
          ${generateHeaders(scale)}
        </div>
      </div>
      <div class="gantt-body">
        ${projects.map(p => {
          const start = parseDate(p.startDate);
          const end = parseDate(p.endDate);
          
          // Mock baseline if not explicitly set
          const bStart = p.baselineStart ? parseDate(p.baselineStart) : new Date(start.getTime() - 15*24*60*60*1000); 
          const bEnd = p.baselineEnd ? parseDate(p.baselineEnd) : new Date(end.getTime() - 30*24*60*60*1000);

          let startOffset = 0, duration = 1;
          let bStartOffset = 0, bDuration = 1;
          
          if (scale === 'quarter') {
            startOffset = monthDiff(BASE_DATE, start) / 3;
            duration = Math.max(monthDiff(start, end) / 3, 0.5);
            bStartOffset = monthDiff(BASE_DATE, bStart) / 3;
            bDuration = Math.max(monthDiff(bStart, bEnd) / 3, 0.5);
          } else if (scale === 'month') {
            startOffset = monthDiff(BASE_DATE, start);
            duration = Math.max(monthDiff(start, end), 1);
            bStartOffset = monthDiff(BASE_DATE, bStart);
            bDuration = Math.max(monthDiff(bStart, bEnd), 1);
          } else if (scale === 'week' || scale === 'day') {
            startOffset = dayDiff(BASE_DATE, start);
            duration = Math.max(dayDiff(start, end), 1);
            bStartOffset = dayDiff(BASE_DATE, bStart);
            bDuration = Math.max(dayDiff(bStart, bEnd), 1);
          }
          
          const left = startOffset * c.cellWidth;
          const width = duration * c.cellWidth;
          const bLeft = bStartOffset * c.cellWidth;
          const bWidth = bDuration * c.cellWidth;
          
          const color = barColors[p.type] || 'blue';
          
          return `
            <div class="gantt-row">
              <div class="gantt-label" title="${p.name}">${p.name}</div>
              <div class="gantt-bars" style="min-width: ${c.totalWidth}px;">
                <!-- Baseline shadow bar -->
                <div class="gantt-bar-baseline" style="left: ${bLeft}px; width: ${bWidth}px;" title="Kế hoạch gốc: ${bStart.toLocaleDateString('vi-VN')} - ${bEnd.toLocaleDateString('vi-VN')}"></div>
                <!-- Actual progress bar -->
                <div class="gantt-bar ${color}" 
                     data-id="${p.id}"
                     data-start="${startOffset}"
                     data-duration="${duration}"
                     draggable="true" 
                     style="left: ${left}px; width: ${width}px; cursor: grab;"
                     title="Thực tế: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}">
                  <span class="gantt-bar-label">${p.progress}%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Initialize Gantt drag and drop events for bars
 */
export function initGanttEvents(onRefresh) {
  const container = document.querySelector('.gantt-container');
  if (!container) return;
  const scale = container.dataset.scale || 'month';
  
  const scaleConfigs = {
    quarter: { cellWidth: 100, unit: 'quarter' },
    month: { cellWidth: 50, unit: 'month' },
    week: { cellWidth: 40, unit: 'day' },
    day: { cellWidth: 40, unit: 'day' }
  };
  const c = scaleConfigs[scale];
  
  const bars = document.querySelectorAll('.gantt-bar');
  let draggedBar = null;
  let startX = 0;
  let initialLeft = 0;
  let projectId = null;

  bars.forEach(bar => {
    bar.addEventListener('dragstart', (e) => e.preventDefault());

    bar.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const { currentUserRole } = getState();
      if (!['BIM Manager', 'Project Manager'].includes(currentUserRole)) {
        showToast('Bạn không có quyền thay đổi tiến độ tổng', 'error');
        return;
      }
      
      draggedBar = bar;
      projectId = bar.dataset.id;
      startX = e.clientX;
      initialLeft = parseFloat(bar.style.left) || 0;
      
      bar.style.cursor = 'grabbing';
      bar.style.opacity = '0.8';
      bar.style.zIndex = '10';
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  function onMouseMove(e) {
    if (!draggedBar) return;
    const dx = e.clientX - startX;
    
    let newLeft = initialLeft + dx;
    if (newLeft < 0) newLeft = 0; 
    
    draggedBar.style.left = `${newLeft}px`;
  }

  function onMouseUp(e) {
    if (!draggedBar) return;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    draggedBar.style.cursor = 'grab';
    draggedBar.style.opacity = '1';
    draggedBar.style.zIndex = '1';
    
    const finalLeft = parseFloat(draggedBar.style.left);
    let newStartOffset = Math.round(finalLeft / c.cellWidth);
    if (newStartOffset < 0) newStartOffset = 0;
    
    // Snap visually
    draggedBar.style.left = `${newStartOffset * c.cellWidth}px`;
    
    const oldStartOffset = parseFloat(draggedBar.dataset.start);
    const duration = parseFloat(draggedBar.dataset.duration);
    
    if (newStartOffset !== oldStartOffset) {
      // Calculate new dates based on scale
      const newStartDate = new Date(BASE_DATE);
      const newEndDate = new Date(BASE_DATE);
      
      if (scale === 'quarter') {
        newStartDate.setMonth(BASE_DATE.getMonth() + (newStartOffset * 3));
        newEndDate.setMonth(newStartDate.getMonth() + (duration * 3));
      } else if (scale === 'month') {
        newStartDate.setMonth(BASE_DATE.getMonth() + newStartOffset);
        newEndDate.setMonth(newStartDate.getMonth() + duration);
      } else if (scale === 'week' || scale === 'day') {
        newStartDate.setDate(BASE_DATE.getDate() + newStartOffset);
        newEndDate.setDate(newStartDate.getDate() + duration);
      }
      
      updateProject(projectId, {
        startDate: newStartDate.toISOString().split('T')[0],
        endDate: newEndDate.toISOString().split('T')[0]
      });
      
      showToast('Đã cập nhật lịch trình dự án');
      if (onRefresh) onRefresh();
    }
    
    draggedBar = null;
    projectId = null;
  }
}
