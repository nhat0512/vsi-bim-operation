// ============================================
// PROJECT DETAIL — Single project view
// ============================================
import { getState, updateProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES } from '../data/constants.js';
import { showItemDetailModal } from '../components/ItemDetailModal.js';
import { formatDisplayName, formatLocalDate } from '../utils/formatters.js';

let hoursOverTimeChartInstance = null;
let hoursByPhaseChartInstance = null;
let hoursByMemberChartInstance = null;
let currentHoursTimeView = 'week';
let currentProjectTab = 'overview'; // 'overview' | 'tasks' | 'segments' | 'rfis' | 'all'
let currentTaskViewMode = 'table'; // 'table' | 'kanban'
let hoursSummaryCache = { key: '', data: null };

function getIsEditing() {
  const { currentUserRole, currentUser } = getState();
  const role = currentUser?.role || currentUserRole;
  return ['BIM Manager', 'Project Manager', 'Admin'].includes(role);
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('project-detail-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'project-detail-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      padding: 12px 24px; border-radius: 12px;
      font-size: 0.875rem; font-weight: 600;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      transform: translateY(100px); opacity: 0;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : type === 'danger' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  toast.style.color = '#fff';
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3000);
}

function formatCurrency(val) {
  if (val >= 1000000000) return (val / 1000000000).toFixed(2) + ' Tỷ';
  if (val >= 1000000) return (val / 1000000).toFixed(0) + ' Tr';
  return Math.round(val).toLocaleString('vi-VN') + ' ₫';
}

function computeProjectMetrics(project, personnel, timesheets) {
  const budgetStr = String(project.budget || '0');
  let BAC = parseFloat(budgetStr.replace(/[^\d.-]/g, ''));
  if (budgetStr.toLowerCase().includes('tỷ')) BAC *= 1000000000;
  else if (budgetStr.toLowerCase().includes('triệu')) BAC *= 1000000;
  if (isNaN(BAC) || BAC === 0) BAC = 5000000000;

  const EV = BAC * (project.progress / 100);
  const today = new Date().getTime();
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  let timeProgress = 0;
  if (today >= end) timeProgress = 1;
  else if (today > start) timeProgress = (today - start) / (end - start);
  const PV = BAC * timeProgress;

  const projectTimesheets = (timesheets || []).filter(t => t.projectId === project.id);
  
  let totalHours = 0;
  let laborCost = 0;
  const rateMap = {
    'BIM Manager': 350000,
    'Project Manager': 350000,
    'BIM Coordinator': 250000,
    'BIM Engineer': 200000,
    'BIM Modeler': 150000
  };

  projectTimesheets.forEach(t => {
     const hrs = Number(t.hours) || 0;
     totalHours += hrs;
     const person = (personnel || []).find(p => p.id === t.userId || p.email === t.email || p.name === t.userName);
     const role = person ? person.role : 'BIM Modeler';
     const rate = rateMap[role] || 150000;
     laborCost += hrs * rate;
  });

  // Bổ sung thêm giờ thực tế từ tasks nếu có
  (project.tasks || []).forEach(task => {
    if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
      Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
        const hNum = Number(hrs) || 0;
        if (hNum > 0) {
          const inTs = projectTimesheets.some(ts => 
            (ts.taskId === task.id || ts.taskName === task.name) && 
            (ts.dateString === dStr || ts.date === dStr) && 
            ts.isActual
          );
          if (!inTs) {
            totalHours += hNum;
            const person = (personnel || []).find(p => p.name === task.assignee);
            const role = person ? person.role : 'BIM Modeler';
            const rate = rateMap[role] || 150000;
            laborCost += hNum * rate;
          }
        }
      });
    }
  });

  totalHours = Math.round(totalHours * 10) / 10;
  let AC = laborCost + (BAC * 0.4 * (project.progress / 100));
  if (AC === 0 && EV > 0) AC = EV * 0.95; 
  
  const SPI = PV > 0 ? (EV / PV) : 1;
  const CPI = AC > 0 ? (EV / AC) : 1;
  const EAC = CPI > 0 ? (BAC / CPI) : BAC;
  const ETC = Math.max(0, EAC - AC);

  return { BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, projectTimesheets };
}

export function render() {
  const { projects, selectedProjectId, personnel, timesheets } = getState();
  const project = projects.find(p => p.id === selectedProjectId);
  const isEditing = getIsEditing();

  if (!project) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <div class="empty-state__text">Chưa chọn dự án</div>
        <div class="empty-state__subtext">Vui lòng chọn một dự án từ Dashboard</div>
        <a href="#dashboard" class="btn btn-primary mt-lg">← Về Dashboard</a>
      </div>
    `;
  }

  const typeInfo = PROJECT_TYPES[project.type] || {};
  const statusInfo = PROJECT_STATUSES[project.status] || {};
  const clashResRate = project.clashesTotal > 0 ? Math.round((project.clashesResolved / project.clashesTotal) * 100) : 0;

  // EVM Calculations
  const metrics = computeProjectMetrics(project, personnel, timesheets);
  const { BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, projectTimesheets } = metrics;

  return `
    <div class="animate-fade-in-up">
      <!-- Back button + Project Header -->
      <div class="flex items-center gap-md mb-lg">
        <a href="#dashboard" class="btn btn-ghost btn-sm">← Quay lại</a>
        <div style="flex: 1;">
          ${isEditing ? `
            <input type="text" id="edit-name" class="form-input" style="font-size: 1.5rem; font-weight: 700; width: 100%; margin-bottom: 4px;" value="${project.name}" title="Tên dự án">
            <div class="flex gap-sm">
              <input type="text" id="edit-code" class="form-input" style="width: 150px; padding: 4px 8px;" value="${project.code}" title="Mã dự án">
            </div>
          ` : `
            <h1 class="section-title">${typeInfo.icon || ''} ${project.name}</h1>
            <div class="text-sm text-muted">${project.code} · ${project.client} · ${project.location}</div>
          `}
        </div>
        
        ${isEditing ? `
          <select id="edit-status" class="form-select" style="width: 150px; margin-right: 12px;">
            ${Object.entries(PROJECT_STATUSES).map(([k, v]) => `<option value="${k}" ${k === project.status ? 'selected' : ''}>${v.label}</option>`).join('')}
          </select>
        ` : `
          <span class="badge ${statusInfo.class}" style="font-size: var(--font-sm); padding: 6px 16px; margin-right: 12px;">
            <span class="badge-dot"></span>
            ${statusInfo.label}
          </span>
          ${getIsEditing() ? `<button class="btn btn-outline" id="btn-edit-project">✏️ Chỉnh sửa</button>` : ''}
        `}
      </div>

      <!-- Sticky Edit Action Bar -->
      ${isEditing ? `
        <div style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;">
          <div id="auto-save-indicator" style="display: none; background: var(--bg-primary); padding: 8px 16px; border-radius: 50px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid var(--border-default); align-items: center; gap: 8px;">
            <span class="spinner" style="width: 14px; height: 14px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>
            <span style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);">Đang lưu...</span>
          </div>
        </div>
      ` : ''}

      <!-- Project KPIs (6 thẻ thống kê nhanh) -->
      <div class="kpi-grid stagger-children mb-lg" style="grid-template-columns: repeat(6, 1fr);">
        <div class="kpi-card blue"><div class="kpi-card-value" id="proj-kpi-progress">${project.progress}%</div><div class="kpi-card-label">Tiến độ</div></div>
        <div class="kpi-card green"><div class="kpi-card-value">${project.modelHealth}%</div><div class="kpi-card-label">Model Health</div></div>
        <div class="kpi-card purple"><div class="kpi-card-value">LOD ${project.lodCurrent}</div><div class="kpi-card-label">LOD hiện tại</div></div>
        <div class="kpi-card cyan"><div class="kpi-card-value">${project.teamSize}</div><div class="kpi-card-label">Thành viên</div></div>
        <div class="kpi-card orange"><div class="kpi-card-value">${project.clashesTotal - project.clashesResolved}</div><div class="kpi-card-label">Clash chưa xử lý</div></div>
        <div class="kpi-card ${clashResRate >= 70 ? 'green' : 'red'}"><div class="kpi-card-value">${clashResRate}%</div><div class="kpi-card-label">Clash resolved</div></div>
      </div>

      <!-- Navigation Tabs (Thanh điều hướng chuyên nghiệp giải quyết hiển thị quá tải) -->
      <div class="tabs mb-lg" style="border-bottom: 2px solid var(--border-color); display: flex; gap: 4px; overflow-x: auto; background: var(--bg-card); padding: 8px 16px 0 16px; border-radius: 8px 8px 0 0; box-shadow: var(--shadow-sm);">
        <button class="tab ${currentProjectTab === 'overview' ? 'tab--active' : ''} btn-proj-tab" data-tab="overview" style="font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>📊</span> <span>Tổng quan & Giờ làm</span>
        </button>
        <button class="tab ${currentProjectTab === 'tasks' ? 'tab--active' : ''} btn-proj-tab" data-tab="tasks" style="font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>📌</span> <span>Công việc (${(project.tasks || []).length})</span>
        </button>
        <button class="tab ${currentProjectTab === 'segments' ? 'tab--active' : ''} btn-proj-tab" data-tab="segments" style="font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>📍</span> <span>Ma trận Phân đoạn (${(project.segments || []).length})</span>
        </button>
        <button class="tab ${currentProjectTab === 'rfis' ? 'tab--active' : ''} btn-proj-tab" data-tab="rfis" style="font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>❓</span> <span>Yêu cầu RFI (${(project.rfis || []).length})</span>
        </button>
        <button class="tab ${currentProjectTab === 'all' ? 'tab--active' : ''} btn-proj-tab" data-tab="all" style="font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>📄</span> <span>Xem tất cả</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content" id="proj-tab-content-container">
        ${renderTabContentHTML(currentProjectTab, project)}
      </div>
    </div>
  `;
}

/**
 * RENDER NỘI DUNG TỪNG TAB RIÊNG BIỆT (CHO PHÉP CHUYỂN TAB 0MS KHÔNG RE-RENDER TOÀN TRANG)
 */
function renderTabContentHTML(tabName, project) {
  const { personnel, timesheets } = getState();
  const isEditing = getIsEditing();
  const typeInfo = PROJECT_TYPES[project.type] || {};
  const metrics = computeProjectMetrics(project, personnel, timesheets);
  const { BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, projectTimesheets } = metrics;

  switch (tabName) {
    case 'overview':
      return `
        ${renderHoursSummary(project, projectTimesheets)}
        ${renderEvmSection(project, BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, formatCurrency)}
        <div class="grid-2 mb-lg" style="grid-template-columns: 3fr 2fr;">
          <div class="card">
            <div class="card-header"><h3 class="card-title">📅 Giai đoạn dự án</h3></div>
            ${renderPhases(project)}
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">📋 Thông tin dự án</h3></div>
            ${renderProjectInfo(project, isEditing, typeInfo, personnel, formatDate)}
          </div>
        </div>
        ${renderDisciplinesSection(project)}
      `;
    case 'tasks':
      return renderTasksSection(project, isEditing, personnel, formatDate);
    case 'segments':
      return renderSegmentsSection(project, isEditing);
    case 'rfis':
      return renderRfisSection(project, isEditing, personnel, formatDate);
    case 'all':
    default:
      return `
        ${renderHoursSummary(project, projectTimesheets)}
        ${renderEvmSection(project, BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, formatCurrency)}
        <div class="grid-2 mb-lg" style="grid-template-columns: 3fr 2fr;">
          <div class="card">
            <div class="card-header"><h3 class="card-title">📅 Giai đoạn dự án</h3></div>
            ${renderPhases(project)}
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">📋 Thông tin dự án</h3></div>
            ${renderProjectInfo(project, isEditing, typeInfo, personnel, formatDate)}
          </div>
        </div>
        ${renderSegmentsSection(project, isEditing)}
        ${renderTasksSection(project, isEditing, personnel, formatDate)}
        ${renderRfisSection(project, isEditing, personnel, formatDate)}
        ${renderDisciplinesSection(project)}
      `;
  }
}

// ============================================
// CÁC HÀM TÍNH TOÁN VÀ DỰNG GIAO DIỆN
// ============================================

/**
 * TÍNH TOÁN GIỜ LÀM VIỆC DỰ ÁN 100% ĐỘNG (KHÔNG HARDCODE)
 */
function computeProjectHoursSummary(project, projectTimesheets) {
  const cacheKey = `${project.id}_${(project.tasks || []).length}_${(projectTimesheets || []).length}`;
  if (hoursSummaryCache.key === cacheKey && hoursSummaryCache.data) {
    return hoursSummaryCache.data;
  }

  let totalHours = 0;
  const memberMap = {};
  const weekMap = {};
  const monthMap = {};
  const phaseMap = {};

  // 1. Quét từ timesheets thực tế
  (projectTimesheets || []).forEach(ts => {
    const hrs = Number(ts.hours) || 0;
    if (hrs <= 0) return;
    totalHours += hrs;

    const mName = ts.userName || 'Nhân sự BIM';
    memberMap[mName] = (memberMap[mName] || 0) + hrs;

    const ph = ts.phase || project.currentPhase || 'Design';
    phaseMap[ph] = (phaseMap[ph] || 0) + hrs;

    const dStr = ts.dateString || ts.date;
    if (dStr) {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const mKey = `Thg ${d.getMonth() + 1}`;
        monthMap[mKey] = (monthMap[mKey] || 0) + hrs;

        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d - startOfYear) / 86400000;
        const wNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        const wKey = `W${wNum}`;
        weekMap[wKey] = (weekMap[wKey] || 0) + hrs;
      }
    }
  });

  // 2. Bổ sung thêm giờ thực tế từ task nếu chưa nằm trong timesheets
  (project.tasks || []).forEach(task => {
    const assignee = task.assignee || 'Nhân sự BIM';
    const ph = task.phase || project.currentPhase || 'Design';

    if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
      Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
        const hNum = Number(hrs) || 0;
        if (hNum <= 0) return;
        const alreadyInTs = (projectTimesheets || []).some(ts => 
          (ts.taskId === task.id || ts.taskName === task.name) && 
          (ts.dateString === dStr || ts.date === dStr) && 
          ts.isActual
        );
        if (!alreadyInTs) {
          totalHours += hNum;
          memberMap[assignee] = (memberMap[assignee] || 0) + hNum;
          phaseMap[ph] = (phaseMap[ph] || 0) + hNum;

          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
            const mKey = `Thg ${d.getMonth() + 1}`;
            monthMap[mKey] = (monthMap[mKey] || 0) + hNum;
            const startOfYear = new Date(d.getFullYear(), 0, 1);
            const pastDays = (d - startOfYear) / 86400000;
            const wNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
            weekMap[`W${wNum}`] = (weekMap[`W${wNum}`] || 0) + hNum;
          }
        }
      });
    }
  });

  // Phân loại và sắp xếp
  const sortedPhases = Object.entries(phaseMap)
    .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);

  const topPhaseObj = sortedPhases[0] || { name: 'Chưa có', hours: 0 };

  const sortedMembers = Object.entries(memberMap)
    .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);

  const sortedWeeks = Object.entries(weekMap)
    .map(([label, hours]) => ({ label, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => {
      const numA = parseInt(a.label.replace('W', ''), 10) || 0;
      const numB = parseInt(b.label.replace('W', ''), 10) || 0;
      return numA - numB;
    });

  const sortedMonths = Object.entries(monthMap)
    .map(([label, hours]) => ({ label, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => {
      const numA = parseInt(a.label.replace('Thg ', ''), 10) || 0;
      const numB = parseInt(b.label.replace('Thg ', ''), 10) || 0;
      return numA - numB;
    });

  const result = {
    totalHours: Math.round(totalHours * 10) / 10,
    activeWeeks: Object.keys(weekMap).length,
    phasesCount: Object.keys(phaseMap).length,
    topPhase: topPhaseObj.hours > 0 ? `${topPhaseObj.name} · ${topPhaseObj.hours}h` : 'Chưa có dữ liệu',
    weeksData: sortedWeeks,
    monthsData: sortedMonths,
    phasesData: sortedPhases,
    membersData: sortedMembers
  };

  hoursSummaryCache = { key: cacheKey, data: result };
  return result;
}

/**
 * HIỂN THỊ WIDGET HOURS SUMMARY THEO GIAO DIỆN HỆ THỐNG
 */
function renderHoursSummary(project, projectTimesheets) {
  const summary = computeProjectHoursSummary(project, projectTimesheets);
  const isWeek = currentHoursTimeView === 'week';

  return `
    <div class="card mb-lg" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px 24px; box-shadow: var(--shadow-sm);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); color: #10b981;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0;">Hours summary (Tổng hợp Giờ làm việc Dự án)</h3>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Dữ liệu tính toán tự động theo thời gian thực từ nhật ký công việc & chấm công</div>
          </div>
        </div>
        <span class="badge ${summary.totalHours > 0 ? 'green' : ''}" style="font-size: 0.8rem; padding: 4px 12px;">
          ${summary.totalHours > 0 ? `Đã ghi nhận ${summary.totalHours}h` : 'Chưa có giờ làm'}
        </span>
      </div>

      <!-- KPI Summary Cards -->
      <div class="hours-summary-kpis" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px;">
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px;">
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Total hours</div>
          <div style="font-size: 1.85rem; font-weight: 800; color: #10b981; line-height: 1.1;">${summary.totalHours}h</div>
        </div>

        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px;">
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Active weeks</div>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-primary); line-height: 1.1;">${summary.activeWeeks}</div>
        </div>

        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px;">
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Phases</div>
          <div style="font-size: 1.85rem; font-weight: 800; color: var(--text-primary); line-height: 1.1;">${summary.phasesCount}</div>
        </div>

        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px;">
          <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Top phase</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; word-break: break-word;">${summary.topPhase}</div>
        </div>
      </div>

      <!-- Bottom Charts Row -->
      <div class="hours-summary-charts" style="display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 16px;">
        <!-- Chart 1: Hours over time -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Hours over time</span>
            <div style="display: inline-flex; background: var(--bg-primary); border-radius: 20px; padding: 2px; border: 1px solid var(--border-color);">
              <button id="hours-toggle-week" type="button" style="padding: 3px 12px; font-size: 0.75rem; font-weight: 600; border-radius: 14px; border: none; cursor: pointer; background: ${isWeek ? '#10b981' : 'transparent'}; color: ${isWeek ? '#ffffff' : 'var(--text-muted)'}; transition: all 0.2s;">Week</button>
              <button id="hours-toggle-month" type="button" style="padding: 3px 12px; font-size: 0.75rem; font-weight: 600; border-radius: 14px; border: none; cursor: pointer; background: ${!isWeek ? '#10b981' : 'transparent'}; color: ${!isWeek ? '#ffffff' : 'var(--text-muted)'}; transition: all 0.2s;">Month</button>
            </div>
          </div>
          <div style="position: relative; flex: 1; height: 210px; width: 100%;">
            <canvas id="chart-hours-over-time"></canvas>
          </div>
        </div>

        <!-- Chart 2: Hours by phase -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px; display: flex; flex-direction: column;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Hours by phase</span>
          </div>
          <div style="position: relative; flex: 1; height: 210px; width: 100%;">
            <canvas id="chart-hours-by-phase"></canvas>
          </div>
        </div>

        <!-- Chart 3: Hours by member -->
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px 18px; display: flex; flex-direction: column;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">Hours by member</span>
          </div>
          <div style="position: relative; flex: 1; height: 210px; width: 100%;">
            <canvas id="chart-hours-by-member"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * QUẢN LÝ DANH SÁCH CÔNG VIỆC (ĐẦY ĐỦ TÍNH NĂNG XÓA, TÌM KIẾM, PHÂN CÔNG)
 */
function renderTasksSection(project, isEditing, personnel, formatDate) {
  const completedCount = (project.tasks || []).filter(t => t.progress >= 100).length;
  const activeCount = (project.tasks || []).length - completedCount;

  return `
    <div class="card mb-lg">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div>
            <h3 class="card-title">📌 Quản lý Danh sách Công việc (Tasks)</h3>
            <div class="text-xs text-muted" style="margin-top: 2px;">
              Tổng cộng: <strong>${(project.tasks || []).length}</strong> công việc · Đang làm: <strong style="color: var(--accent-primary);">${activeCount}</strong> · Hoàn thành: <strong style="color: var(--accent-success);">${completedCount}</strong>
            </div>
          </div>

          <!-- Chế độ xem: Bảng vs Kanban -->
          <div style="display: inline-flex; background: var(--bg-tertiary); border-radius: 6px; padding: 2px; border: 1px solid var(--border-color); margin-left: 8px;">
            <button id="btn-view-table" type="button" class="btn btn-sm ${currentTaskViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">📋 Bảng</button>
            <button id="btn-view-kanban" type="button" class="btn btn-sm ${currentTaskViewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">📊 Kanban</button>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" id="btn-export-tasks" title="Xuất danh sách công việc ra file CSV/Excel">
            📥 Xuất CSV
          </button>
          <button class="btn btn-outline btn-sm" id="btn-import-tasks-trigger" title="Nhập danh sách công việc từ CSV">
            📤 Nhập CSV
          </button>
          <input type="file" id="input-import-tasks-file" accept=".csv" style="display: none;">
          <button class="btn btn-primary btn-sm" id="btn-add-task">
            ➕ Thêm công việc
          </button>
          ${(project.tasks && project.tasks.length > 0) ? `
            <button class="btn btn-outline btn-sm text-danger" id="btn-delete-all-tasks" title="Xóa toàn bộ công việc để làm mới" style="border-color: rgba(239, 68, 68, 0.4);">
              🗑️ Xóa tất cả
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Thanh Thao tác Hàng loạt (Floating Bulk Toolbar) -->
      <div id="tasks-bulk-toolbar" class="bulk-toolbar" style="display: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge blue" id="bulk-selected-count">Đã chọn 0</span>
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">Thao tác hàng loạt:</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select id="bulk-assignee-select" class="form-select" style="font-size: 0.8rem; padding: 4px 8px; width: 160px;">
            <option value="">👥 Đổi nhân sự...</option>
            ${(personnel || []).map(p => `<option value="${p.name}">${formatDisplayName(p.name)}</option>`).join('')}
          </select>
          <select id="bulk-progress-select" class="form-select" style="font-size: 0.8rem; padding: 4px 8px; width: 150px;">
            <option value="">🎯 Đổi tiến độ...</option>
            <option value="0">0% (Chưa làm)</option>
            <option value="25">25% (Bắt đầu)</option>
            <option value="50">50% (Đang dựng)</option>
            <option value="75">75% (Gần xong)</option>
            <option value="100">100% (Hoàn thành)</option>
          </select>
          <button class="btn btn-outline btn-sm text-danger" id="bulk-delete-btn" style="padding: 4px 10px;">
            🗑️ Xóa đã chọn
          </button>
          <button class="btn btn-ghost btn-sm" id="bulk-clear-btn" style="padding: 4px 8px;">
            ✖ Bỏ chọn
          </button>
        </div>
      </div>

      ${currentTaskViewMode === 'kanban' ? `
        ${renderTasksKanban(project, personnel, formatDate)}
      ` : `
        <!-- Search & Filters -->
        <div style="padding: 10px 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px;">
            <input type="text" id="task-search-input" class="form-input" placeholder="🔍 Tìm kiếm công việc..." style="width: 100%; padding: 6px 12px; font-size: 0.85rem;">
          </div>
          <div style="min-width: 180px;">
            <select id="task-assignee-filter" class="form-select" style="width: 100%; padding: 6px 10px; font-size: 0.85rem;">
              <option value="">-- Tất cả nhân sự --</option>
              ${[...new Set((project.tasks || []).map(t => t.assignee).filter(Boolean))].map(name => `
                <option value="${name}">${formatDisplayName(name)}</option>
              `).join('')}
            </select>
          </div>
        </div>

      <!-- Task Table -->
      <div style="overflow-x: auto;">
        ${(project.tasks || []).length > 0 ? `
          <table class="data-table" id="project-tasks-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;"><input type="checkbox" id="chk-select-all-tasks" title="Chọn tất cả"></th>
                <th style="min-width: 240px;">Tên công việc / Hạng mục</th>
                <th style="width: 170px;">Phụ trách</th>
                <th style="width: 130px;">Tiến độ</th>
                <th style="width: 140px;">Hạn chót</th>
                <th style="width: 100px; text-align: center;">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              ${(project.tasks || []).map((t, idx) => {
                const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'completed';
                const taskId = t.id || `t_${idx}`;
                return `
                  <tr class="task-row" data-id="${taskId}" data-name="${(t.name || '').toLowerCase()}" data-assignee="${t.assignee || ''}">
                    <td style="text-align: center;">
                      <input type="checkbox" class="task-select-chk" data-id="${taskId}" data-idx="${idx}">
                    </td>
                    <td>
                      ${isEditing ? `
                        <input type="text" class="form-input edit-task-name" data-id="${taskId}" data-idx="${idx}" value="${t.name || ''}" placeholder="Nhập tên công việc..." style="width: 100%; font-weight: 600; margin-bottom: 4px;">
                        <div class="flex items-center gap-xs" style="flex-wrap: wrap;">
                          <div class="flex items-center" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
                            <span style="font-size: 0.65rem; margin-right: 4px;">🏷️</span>
                            <select class="edit-task-segment" data-id="${taskId}" data-idx="${idx}" style="font-size: 0.72rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
                              <option value="-1">-- Phân đoạn --</option>
                              ${project.segments.map((s, sIdx) => {
                                let html = `<option value="${sIdx}" ${t.segmentIdx === sIdx && t.subSegmentIdx == null ? 'selected' : ''}>▶ ${s.name}</option>`;
                                if (s.subSegments && s.subSegments.length > 0) {
                                  s.subSegments.forEach((sub, subIdx) => {
                                    html += `<option value="${sIdx}_${subIdx}" ${t.segmentIdx === sIdx && t.subSegmentIdx === subIdx ? 'selected' : ''}>&nbsp;&nbsp;↳ ${sub.name}</option>`;
                                  });
                                }
                                return html;
                              }).join('')}
                            </select>
                          </div>
                          <div class="flex items-center" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
                            <span style="font-size: 0.65rem; margin-right: 4px;">🎯</span>
                            <select class="edit-task-milestone" data-id="${taskId}" data-idx="${idx}" style="font-size: 0.72rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
                              <option value="-1">-- Cột mốc --</option>
                              ${(project.milestones || []).map((m, mIdx) => `
                                <option value="${mIdx}" ${t.milestoneIdx === mIdx ? 'selected' : ''}>${m.name}</option>
                              `).join('')}
                            </select>
                          </div>
                        </div>
                      ` : `
                        <div class="font-semibold text-sm">${t.name}</div>
                        <div class="flex items-center gap-xs" style="margin-top: 4px;">
                          ${t.segmentIdx !== null && t.segmentIdx !== undefined && project.segments[t.segmentIdx] ? `
                            <span class="badge" style="font-size: 0.68rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle);">
                              🏷️ ${project.segments[t.segmentIdx].name}${t.subSegmentIdx != null && project.segments[t.segmentIdx].subSegments?.[t.subSegmentIdx] ? ` / ${project.segments[t.segmentIdx].subSegments[t.subSegmentIdx].name}` : ''}
                            </span>
                          ` : ''}
                          ${t.milestoneIdx !== null && t.milestoneIdx !== undefined && (project.milestones || [])[t.milestoneIdx] ? `
                            <span class="badge" style="font-size: 0.68rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle);">
                              🎯 ${(project.milestones || [])[t.milestoneIdx].name}
                            </span>
                          ` : ''}
                        </div>
                      `}
                    </td>
                    <td class="text-sm">
                      ${isEditing ? `
                        <select class="form-select edit-task-assignee" data-id="${taskId}" data-idx="${idx}" style="font-size: 0.8rem; padding: 4px 8px;">
                          <option value="">-- Chọn --</option>
                          ${t.assignee && !(personnel || []).some(m => m.name === t.assignee) ? `
                            <option value="${t.assignee}" selected>👤 ${formatDisplayName(t.assignee)}</option>
                          ` : ''}
                          ${(personnel || []).map(m => {
                            let label = formatDisplayName(m.name);
                            const alloc = m.totalAllocation || 0;
                            if (alloc >= 100) label += ' [⚠️ Quá tải]';
                            else label += ` [✅ Rảnh ${100 - alloc}%]`;
                            return `<option value="${m.name}" ${t.assignee === m.name ? 'selected' : ''}>${label}</option>`;
                          }).join('')}
                        </select>
                      ` : `
                        <div class="flex items-center gap-xs">
                          ${t.assignee ? (() => {
                            const member = (personnel || []).find(m => m.name === t.assignee);
                            if (member) {
                              return `<img src="${(member.avatar && member.avatar.length > 5) ? member.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(member.name))}&background=random`}" style="width: 22px; height: 22px; border-radius: 50%;"> <span>${formatDisplayName(t.assignee)}</span>`;
                            }
                            return `<span>${formatDisplayName(t.assignee)}</span>`;
                          })() : '<span class="text-muted italic">Chưa gán</span>'}
                        </div>
                      `}
                    </td>
                    <td>
                      ${isEditing ? `
                        <div class="flex items-center gap-xs">
                          <input type="number" class="form-input edit-task-progress" data-id="${taskId}" data-idx="${idx}" value="${t.progress || 0}" min="0" max="100" style="width: 65px; font-weight: bold; text-align: center;">
                          <span class="text-xs font-semibold">%</span>
                        </div>
                      ` : `
                        <div class="flex items-center gap-sm">
                          <div class="progress-bar" style="width: 75px; height: 6px;">
                            <div class="progress-bar-fill ${t.progress >= 100 ? 'green' : t.progress >= 50 ? '' : 'orange'}" style="width: ${t.progress}%;"></div>
                          </div>
                          <span class="text-xs font-bold" style="color: ${t.progress >= 100 ? 'var(--text-success)' : 'inherit'};">${t.progress}%</span>
                        </div>
                      `}
                    </td>
                    <td>
                      ${isEditing ? `
                        <input type="date" class="form-input edit-task-due" data-id="${taskId}" data-idx="${idx}" value="${(t.dueDate || '').split('T')[0]}" style="font-size: 0.8rem; padding: 4px 6px;">
                      ` : `
                        <span class="text-xs ${isOverdue ? 'text-danger font-bold' : 'text-muted'}">${formatDate(t.dueDate)}${isOverdue ? ' ⚠️' : ''}</span>
                      `}
                    </td>
                    <td style="text-align: center;">
                      <div class="flex items-center justify-center gap-xs">
                        <button class="btn btn-ghost btn-sm text-primary btn-task-detail" data-id="${taskId}" data-idx="${idx}" title="Xem & chỉnh sửa chi tiết" style="padding: 4px 6px;">
                          🔍
                        </button>
                        <button class="btn btn-ghost btn-sm text-danger btn-delete-task" data-id="${taskId}" data-idx="${idx}" title="Xóa công việc này" style="padding: 4px 6px;">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state" style="padding: 32px 16px;">
            <div class="empty-state__icon">📌</div>
            <div class="empty-state__text">Chưa có công việc nào</div>
            <div class="empty-state__subtext">Hãy bấm "+ Thêm công việc" để tạo mới nhiệm vụ cho dự án</div>
          </div>
        `}
      </div>
      `}
    </div>
  `;
}

/**
 * GIAO DIỆN BẢNG KANBAN TIẾN ĐỘ CÔNG VIỆC
 */
function renderTasksKanban(project, personnel, formatDate) {
  const tasks = project.tasks || [];
  
  const cols = [
    { id: 'todo', title: '📋 Chờ thực hiện', color: '#64748b', filter: t => (t.progress || 0) === 0 && t.status !== 'completed' },
    { id: 'in_progress', title: '🚀 Đang thực hiện', color: '#3b82f6', filter: t => (t.progress || 0) > 0 && (t.progress || 0) < 80 && t.status !== 'completed' },
    { id: 'review', title: '🔍 Kiểm tra QA/QC', color: '#f59e0b', filter: t => (t.progress || 0) >= 80 && (t.progress || 0) < 100 && t.status !== 'completed' },
    { id: 'completed', title: '✅ Hoàn thành', color: '#10b981', filter: t => (t.progress || 0) >= 100 || t.status === 'completed' }
  ];

  return `
    <div class="kanban-board" style="padding: 16px; gap: 16px; overflow-x: auto; display: flex; min-height: 480px;">
      ${cols.map(col => {
        const colTasks = tasks.map((t, idx) => ({ ...t, originalIndex: idx })).filter(col.filter);
        return `
          <div class="kanban-col" data-col="${col.id}" style="flex: 1; min-width: 280px; background: var(--bg-tertiary); border-radius: 10px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column;">
            <div class="kanban-col-header" style="padding: 12px 16px; border-bottom: 2px solid ${col.color}; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${col.title}</span>
              <span class="badge" style="font-weight: 700; background: var(--bg-card);">${colTasks.length}</span>
            </div>
            
            <div class="kanban-dropzone" data-col="${col.id}" style="padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 350px;">
              ${colTasks.length > 0 ? colTasks.map(t => {
                const segName = t.segmentIdx != null && project.segments[t.segmentIdx] ? project.segments[t.segmentIdx].name : '';
                const mlName = t.milestoneIdx != null && (project.milestones || [])[t.milestoneIdx] ? project.milestones[t.milestoneIdx].name : '';
                const member = (personnel || []).find(m => m.name === t.assignee);
                const avatar = (member && member.avatar && member.avatar.length > 5) ? member.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(t.assignee || 'BIM'))}&background=random`;

                return `
                  <div class="kanban-card" draggable="true" data-id="${t.id}" data-idx="${t.originalIndex}" data-col="${col.id}" style="background: var(--bg-card); border: 1px solid var(--border-default); border-left: 3.5px solid ${col.color}; border-radius: 8px; padding: 12px; cursor: grab; box-shadow: var(--shadow-sm); transition: transform 0.15s, box-shadow 0.15s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                      <div class="flex items-center gap-xs" style="flex-wrap: wrap;">
                        <span class="badge" style="font-size: 0.65rem; padding: 2px 5px; background: var(--bg-tertiary);">${t.lod || 'LOD 300'}</span>
                        <span class="badge" style="font-size: 0.65rem; padding: 2px 5px; background: var(--bg-tertiary);">${t.phase || 'BVTC'}</span>
                      </div>
                      ${t.cloudLinks ? `
                        <a href="${t.cloudLinks.split('\n')[0].trim()}" target="_blank" rel="noopener" class="badge blue" style="font-size: 0.65rem; padding: 2px 6px; text-decoration: none;" title="Mở mô hình 3D trên Cloud">🌐 3D</a>
                      ` : ''}
                    </div>

                    <div class="kanban-card-title btn-task-detail" data-id="${t.id}" data-idx="${t.originalIndex}" style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); cursor: pointer; margin-bottom: 6px;" title="Bấm để xem & sửa chi tiết">
                      ${t.name}
                    </div>

                    ${(segName || mlName) ? `
                      <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 8px;">
                        ${segName ? `🏷️ ${segName}` : ''} ${mlName ? `· 🎯 ${mlName}` : ''}
                      </div>
                    ` : ''}

                    <div class="flex items-center gap-xs" style="margin-bottom: 8px;">
                      <div class="progress-bar" style="flex: 1; height: 5px;">
                        <div class="progress-bar-fill ${t.progress >= 100 ? 'green' : t.progress >= 50 ? '' : 'orange'}" style="width: ${t.progress || 0}%;"></div>
                      </div>
                      <span style="font-size: 0.72rem; font-weight: 700; color: ${t.progress >= 100 ? 'var(--text-success)' : 'inherit'};">${t.progress || 0}%</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; font-size: 0.75rem;">
                      <div class="flex items-center gap-xs" title="${t.assignee || 'Chưa gán'}">
                        <img src="${avatar}" style="width: 20px; height: 20px; border-radius: 50%;">
                        <span style="font-weight: 500; color: var(--text-secondary); max-width: 95px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${formatDisplayName(t.assignee) || 'Chưa gán'}</span>
                      </div>

                      <div class="flex items-center gap-xs">
                        ${t.progress < 100 ? `
                          <button class="btn btn-ghost btn-sm btn-quick-advance" data-id="${t.id}" data-idx="${t.originalIndex}" data-step="25" title="Tăng +25% tiến độ" style="padding: 2px 6px; font-size: 0.7rem;">+25%</button>
                          <button class="btn btn-ghost btn-sm btn-quick-done text-success" data-id="${t.id}" data-idx="${t.originalIndex}" title="Đánh dấu hoàn thành" style="padding: 2px 6px; font-size: 0.7rem;">✔</button>
                        ` : ''}
                        <button class="btn btn-ghost btn-sm text-danger btn-delete-task" data-id="${t.id}" data-idx="${t.originalIndex}" title="Xóa công việc này" style="padding: 2px 5px; font-size: 0.7rem;">🗑️</button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="kanban-empty" style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.8rem; border: 2px dashed var(--border-subtle); border-radius: 8px;">
                  Chưa có công việc
                </div>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * QUẢN LÝ MA TRẬN TIẾN ĐỘ (SEGMENTS X MILESTONES)
 */
function renderSegmentsSection(project, isEditing) {
  return `
    <div class="card mb-lg">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h3 class="card-title">📍 Ma trận Tiến độ (Segments x Milestones)</h3>
          <span class="badge active">${project.segments.length} phân đoạn</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" id="btn-export-matrix" title="Xuất ma trận tiến độ ra file Excel CSV">📥 Xuất Excel Ma trận</button>
        </div>
      </div>
      <div class="matrix-scroll-wrapper">
        <table class="data-table matrix-table" style="min-width: 800px;">
          <thead>
            <tr>
              <th class="matrix-th-corner" style="min-width: 250px;">
                Phân đoạn (Segments)
              </th>
              ${(project.milestones || []).map((m, mIdx) => `
                <th class="matrix-th-sticky" style="min-width: 180px; text-align: center; border-right: 1px solid var(--border-subtle); padding: 8px;">
                  <div class="flex items-center gap-xs justify-between" style="width: 100%;">
                    ${isEditing ? `
                      <input type="text" class="form-input edit-milestone-name inline-edit" value="${m.name}" title="${m.name}" style="font-weight: bold; padding: 4px 8px; font-size: 0.85rem; flex: 1; text-align: center; min-width: 0;">
                      <button class="btn btn-ghost btn-sm text-danger btn-delete-milestone" data-idx="${mIdx}" style="padding: 4px; flex-shrink: 0;" title="Xóa mốc này">🗑️</button>
                    ` : `<span style="font-weight: bold; font-size: 0.85rem;">${m.name}</span>`}
                  </div>
                  ${isEditing ? `
                    <input type="date" class="form-input edit-milestone-date inline-edit" value="${m.date.split('T')[0]}" style="font-size: 0.75rem; padding: 4px 8px; margin-top: 6px; text-align: center; width: 100%;">
                  ` : `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">📅 ${formatDate(m.date)}</div>`}
                </th>
              `).join('')}
              ${isEditing ? `
                <th class="matrix-th-sticky" style="width: 100px; text-align: center;">
                  <button class="btn btn-outline btn-sm" id="btn-add-milestone">+ Mốc</button>
                </th>
              ` : ''}
            </tr>
          </thead>
          <tbody id="edit-segments-list">
            ${project.segments.map((s, sIdx) => {
              if (!s.progresses) s.progresses = [];
              if (!s.subSegments) s.subSegments = [];
              const hasSub = s.subSegments.length > 0;
              
              let html = `
              <tr>
                <td class="matrix-td-segment">
                  <div class="flex items-center gap-xs">
                    <button class="btn btn-ghost btn-sm btn-toggle-sub" data-sidx="${sIdx}" style="padding: 2px;">${hasSub ? '▼' : '▶'}</button>
                    ${isEditing ? `
                      <input type="text" class="form-input edit-segment-name inline-edit" value="${s.name}" style="width: 100%; font-weight: bold;">
                      <button class="btn btn-ghost btn-sm text-primary btn-add-subsegment" data-sidx="${sIdx}" title="Thêm phân đoạn nhỏ" style="padding: 2px;">➕</button>
                      <button class="btn btn-ghost btn-sm text-danger btn-delete-segment" data-idx="${sIdx}" style="padding: 2px;">🗑️</button>
                    ` : `<span style="font-weight: bold;">${s.name}</span>`}
                  </div>
                </td>
                ${(project.milestones || []).map((m, mIdx) => {
                  if (s.progresses[mIdx] === undefined) {
                    s.progresses[mIdx] = (mIdx === 0 && s.progress !== undefined) ? s.progress : 0;
                  }
                  
                  let pValue = s.progresses[mIdx];
                  if (hasSub) {
                    const sum = s.subSegments.reduce((acc, sub) => acc + (sub.progresses?.[mIdx] || 0), 0);
                    pValue = Math.round(sum / s.subSegments.length);
                  }
                  
                  const deadline = s.deadlines?.[mIdx] || '';
                  
                  return `
                    <td style="border-right: 1px solid var(--border-subtle); text-align: center; padding: 6px;">
                      ${hasSub ? `
                        <div class="flex items-center gap-xs justify-center" title="Tiến độ trung bình từ các đoạn nhỏ">
                          <div class="progress-bar" style="width: 70px; height: 6px;">
                            <div class="progress-bar-fill parent-progress-fill-${sIdx}-${mIdx} ${pValue >= 100 ? 'green' : ''}" style="width: ${pValue}%;"></div>
                          </div>
                          <span class="text-xs font-bold parent-progress-text-${sIdx}-${mIdx}" style="width: 35px; text-align: right; color: ${pValue >= 100 ? 'var(--text-success)' : 'inherit'};">${pValue}%</span>
                        </div>
                        <input type="hidden" class="edit-segment-matrix-progress" id="parent-hidden-${sIdx}-${mIdx}" data-sidx="${sIdx}" data-midx="${mIdx}" value="${pValue}">
                      ` : `
                        ${isEditing ? `
                          <div class="flex items-center gap-xs justify-center">
                            <input type="range" class="edit-segment-matrix-progress" data-sidx="${sIdx}" data-midx="${mIdx}" value="${pValue}" min="0" max="100" style="width: 70px; cursor: pointer; accent-color: var(--accent-primary);">
                            <span class="text-xs font-bold matrix-progress-label" style="width: 35px; text-align: right; color: ${pValue >= 100 ? 'var(--text-success)' : 'inherit'}; cursor: pointer;" title="Kéo thanh trượt hoặc nhấp đúp để nhập %">${pValue}%</span>
                          </div>
                        ` : `
                          <div class="flex items-center gap-xs justify-center">
                            <div class="progress-bar" style="width: 70px; height: 6px;">
                              <div class="progress-bar-fill ${pValue >= 100 ? 'green' : ''}" style="width: ${pValue}%;"></div>
                            </div>
                            <span class="text-xs font-bold" style="width: 35px; text-align: right;">${pValue}%</span>
                          </div>
                        `}
                      `}
                      ${isEditing ? `
                        <input type="date" class="form-input edit-segment-matrix-date inline-edit" data-sidx="${sIdx}" data-midx="${mIdx}" value="${deadline}" style="font-size: 0.7rem; padding: 2px 4px; margin-top: 4px; text-align: center; width: 100%;">
                      ` : (deadline ? `<div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">📅 ${deadline}</div>` : '')}
                    </td>
                  `;
                }).join('')}
                ${isEditing ? `<td></td>` : ''}
              </tr>
              `;

              // Subsegments
              if (hasSub) {
                s.subSegments.forEach((sub, subIdx) => {
                  html += `
                    <tr class="sub-of-${sIdx}" style="background: var(--bg-tertiary);">
                      <td class="matrix-td-segment" style="padding-left: 28px; background: var(--bg-tertiary) !important;">
                        <div class="flex items-center gap-xs">
                          <span class="text-muted" style="font-size: 0.8rem;">↳</span>
                          ${isEditing ? `
                            <input type="text" class="form-input edit-subsegment-name inline-edit" data-sidx="${sIdx}" data-subidx="${subIdx}" value="${sub.name}" style="width: 100%; font-size: 0.85rem;">
                            <button class="btn btn-ghost btn-sm text-danger btn-delete-subsegment" data-sidx="${sIdx}" data-subidx="${subIdx}" style="padding: 2px;">🗑️</button>
                          ` : `<span style="font-size: 0.85rem;">${sub.name}</span>`}
                        </div>
                      </td>
                      ${(project.milestones || []).map((m, mIdx) => {
                        const subPValue = sub.progresses?.[mIdx] || 0;
                        const subDeadline = sub.deadlines?.[mIdx] || '';
                        return `
                          <td style="border-right: 1px solid var(--border-subtle); text-align: center; padding: 6px;">
                            ${isEditing ? `
                              <div class="flex items-center gap-xs justify-center">
                                <input type="range" class="edit-subsegment-matrix-progress" data-sidx="${sIdx}" data-subidx="${subIdx}" data-midx="${mIdx}" value="${subPValue}" min="0" max="100" style="width: 70px; cursor: pointer; accent-color: var(--accent-primary);">
                                <span class="text-xs font-bold matrix-progress-label" style="width: 35px; text-align: right; color: ${subPValue >= 100 ? 'var(--text-success)' : 'inherit'}; cursor: pointer;" title="Kéo thanh trượt hoặc nhấp đúp để nhập %">${subPValue}%</span>
                              </div>
                              <input type="date" class="form-input edit-subsegment-matrix-date inline-edit" data-sidx="${sIdx}" data-subidx="${subIdx}" data-midx="${mIdx}" value="${subDeadline}" style="font-size: 0.7rem; padding: 2px 4px; margin-top: 4px; text-align: center; width: 100%;">
                            ` : `
                              <div class="flex items-center gap-xs justify-center">
                                <div class="progress-bar" style="width: 70px; height: 6px;">
                                  <div class="progress-bar-fill ${subPValue >= 100 ? 'green' : ''}" style="width: ${subPValue}%;"></div>
                                </div>
                                <span class="text-xs font-bold" style="width: 35px; text-align: right;">${subPValue}%</span>
                              </div>
                              ${subDeadline ? `<div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">📅 ${subDeadline}</div>` : ''}
                            `}
                          </td>
                        `;
                      }).join('')}
                      ${isEditing ? `<td></td>` : ''}
                    </tr>
                  `;
                });
              }

              return html;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${isEditing ? `
        <div style="padding: 12px 16px; border-top: 1px solid var(--border-default);">
          <button class="btn btn-outline btn-sm" id="btn-add-segment">+ Thêm phân đoạn mới</button>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * QUẢN LÝ RFI
 */
function renderRfisSection(project, isEditing, personnel, formatDate) {
  return `
    <div class="card mb-lg">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title">❓ Quản lý RFI (Request For Information)</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="badge ${((project.rfis || []).filter(r => r.status === 'Open' || r.status === 'Overdue').length > 0) ? 'danger' : 'active'}">${(project.rfis || []).length} RFI</span>
          ${isEditing ? `<button class="btn btn-primary btn-sm admin-only" id="btn-add-rfi">+ Thêm RFI</button>` : ''}
        </div>
      </div>
      <div style="overflow-x: auto;">
        ${(project.rfis || []).length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 100px;">Mã RFI</th>
                <th style="min-width: 250px;">Tiêu đề</th>
                <th style="width: 120px;">Ưu tiên</th>
                <th style="width: 130px;">Trạng thái</th>
                <th style="width: 180px;">Phụ trách</th>
                <th style="width: 130px;">Hạn chót</th>
                <th style="width: 80px; text-align: center;">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${(project.rfis || []).map((rfi, idx) => {
                const isOverdue = new Date(rfi.dueDate) < new Date() && rfi.status !== 'Closed' && rfi.status !== 'Answered';
                return `
                  <tr>
                    <td class="font-bold text-sm">
                      ${isEditing ? `<input type="text" class="form-input edit-rfi-code inline-edit" data-idx="${idx}" value="${rfi.code}" style="width: 90px; font-size: 0.75rem; padding: 2px 4px;">` : rfi.code}
                    </td>
                    <td>
                      ${isEditing ? `<input type="text" class="form-input edit-rfi-title inline-edit" data-idx="${idx}" value="${rfi.title}" style="width: 100%; font-size: 0.8rem; font-weight: 600;">` : `<div class="font-semibold text-sm">${rfi.title}</div>`}
                    </td>
                    <td>
                      ${isEditing ? `
                        <select class="form-select edit-rfi-priority inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px;">
                          <option value="High" ${rfi.priority === 'High' ? 'selected' : ''}>Cao 🔴</option>
                          <option value="Medium" ${rfi.priority === 'Medium' ? 'selected' : ''}>Trung bình 🟡</option>
                          <option value="Low" ${rfi.priority === 'Low' ? 'selected' : ''}>Thấp 🟢</option>
                        </select>
                      ` : rfi.priority}
                    </td>
                    <td>
                      ${isEditing ? `
                        <select class="form-select edit-rfi-status inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px;">
                          <option value="Open" ${rfi.status === 'Open' ? 'selected' : ''}>Mở (Open)</option>
                          <option value="Answered" ${rfi.status === 'Answered' ? 'selected' : ''}>Đã trả lời</option>
                          <option value="Closed" ${rfi.status === 'Closed' ? 'selected' : ''}>Đã đóng</option>
                          <option value="Overdue" ${rfi.status === 'Overdue' ? 'selected' : ''}>Trễ hạn ⚠️</option>
                        </select>
                      ` : `<span class="badge ${rfi.status === 'Closed' ? 'green' : rfi.status === 'Answered' ? 'blue' : 'orange'}">${rfi.status}</span>`}
                    </td>
                    <td class="text-sm">
                      ${isEditing ? `
                        <select class="form-select edit-rfi-assignee inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; width: 100%;">
                          <option value="">-- Chọn --</option>
                          ${(personnel || []).map(p => `<option value="${p.name}" ${rfi.assignee === p.name ? 'selected' : ''}>${formatDisplayName(p.name)}</option>`).join('')}
                        </select>
                      ` : (rfi.assignee || '—')}
                    </td>
                    <td>
                      ${isEditing ? `<input type="date" class="form-input edit-rfi-due inline-edit" data-idx="${idx}" value="${(rfi.dueDate || '').split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px; width: 100%;">` : formatDate(rfi.dueDate)}
                    </td>
                    <td style="text-align: center;">
                      <div class="flex items-center justify-center gap-xs">
                        <button class="btn btn-ghost btn-sm text-primary btn-rfi-detail" data-idx="${idx}" title="Xem chi tiết" style="padding: 2px 6px;">🔍</button>
                        ${isEditing ? `<button class="btn btn-ghost btn-sm text-danger btn-delete-rfi" data-idx="${idx}" style="padding: 2px 6px;">🗑️</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : `<div class="empty-state" style="padding: 32px 16px;"><div class="empty-state__icon">❓</div><div class="empty-state__text">Chưa có RFI nào</div></div>`}
      </div>
    </div>
  `;
}

/**
 * QUẢN LÝ CHI PHÍ (5D BIM & EVM)
 */
function renderEvmSection(project, BAC, PV, EV, AC, SPI, CPI, EAC, ETC, totalHours, formatCurrency) {
  return `
    <div class="card mb-lg" style="background: var(--bg-card); border-left: 4px solid var(--accent-primary); border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); box-shadow: var(--shadow-sm);">
      <div class="card-header" style="border-bottom: 1px dashed var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title">💰 Quản trị Chi phí (5D BIM & EVM)</h3>
        <span class="badge" style="background: var(--bg-tertiary); color: var(--text-primary); font-weight: 600;">Ngân sách (BAC): ${formatCurrency(BAC)}</span>
      </div>
      <div style="padding: 20px;">
        <div class="grid-3 gap-lg mb-md">
          <div>
            <div class="text-sm text-muted mb-xs font-semibold">Giá trị Kế hoạch (PV)</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${formatCurrency(PV)}</div>
            <div class="text-xs text-muted mt-xs">Kỳ vọng theo lịch trình</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-xs font-semibold">Giá trị Đạt được (EV)</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-primary);">${formatCurrency(EV)}</div>
            <div class="text-xs text-muted mt-xs">Khối lượng thực tế x Đơn giá</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-xs font-semibold">Chi phí Thực tế (AC)</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--accent-warning);">${formatCurrency(AC)}</div>
            <div class="text-xs text-muted mt-xs">Giờ làm (${totalHours}h) + Khác</div>
          </div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
          <div style="flex: 1; min-width: 250px;">
            <div class="flex justify-between items-center mb-xs">
              <span class="text-sm font-semibold">Hiệu suất Tiến độ (SPI)</span>
              <span class="badge" style="background: ${SPI >= 1 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${SPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'}; border: 1px solid ${SPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${SPI.toFixed(2)}</span>
            </div>
            <div class="progress-bar" style="height: 6px; border-radius: 3px;">
              <div class="progress-bar-fill" style="width: ${Math.min(SPI * 50, 100)}%; background: ${SPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'};"></div>
            </div>
            <div class="text-xs text-muted mt-xs">${SPI >= 1 ? '✅ Nhanh hơn kế hoạch' : '⚠️ Chậm tiến độ (Cần tăng tốc)'}</div>
          </div>
          
          <div style="flex: 1; min-width: 250px;">
            <div class="flex justify-between items-center mb-xs">
              <span class="text-sm font-semibold">Hiệu suất Chi phí (CPI)</span>
              <span class="badge" style="background: ${CPI >= 1 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${CPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'}; border: 1px solid ${CPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${CPI.toFixed(2)}</span>
            </div>
            <div class="progress-bar" style="height: 6px; border-radius: 3px;">
              <div class="progress-bar-fill" style="width: ${Math.min(CPI * 50, 100)}%; background: ${CPI >= 1 ? 'var(--accent-success)' : 'var(--accent-danger)'};"></div>
            </div>
            <div class="text-xs text-muted mt-xs">${CPI >= 1 ? '✅ Trong ngân sách (Lãi)' : '⚠️ Vượt ngân sách (Lỗ)'}</div>
          </div>
          
          <div style="flex: 1; min-width: 250px;">
            <div class="flex justify-between items-center mb-xs">
              <span class="text-sm font-semibold">Dự báo Tổng chi phí (EAC)</span>
              <span class="text-sm font-bold" style="color: ${EAC > BAC ? 'var(--text-danger)' : 'var(--text-success)'}">${formatCurrency(EAC)}</span>
            </div>
            <div class="text-xs text-muted mt-xs" style="line-height: 1.5;">
              <span style="font-weight: 600;">Cần thêm (ETC):</span> <span style="color: var(--accent-primary); font-weight: bold;">${formatCurrency(ETC)}</span> để hoàn thành.<br>
              ${EAC > BAC ? `⚠️ Dự kiến sẽ <strong style="color:var(--text-danger)">vượt ngân sách ${formatCurrency(EAC - BAC)}</strong>.` : `✅ Dự kiến <strong style="color:var(--text-success)">tiết kiệm được ${formatCurrency(BAC - EAC)}</strong>.`}
            </div>
          </div>
        </div>

        <!-- Chẩn đoán Thông minh 5D BIM -->
        ${renderEvmDiagnostic(SPI, CPI, BAC, EV, PV, AC, EAC, totalHours, formatCurrency)}
      </div>
    </div>
  `;
}

/**
 * CHẨN ĐOÁN THÔNG MINH EVM & SỨC KHỎE DỰ ÁN
 */
function renderEvmDiagnostic(SPI, CPI, BAC, EV, PV, AC, EAC, totalHours, formatCurrency) {
  const SV = EV - PV;
  const CV = EV - AC;
  
  let statusClass = 'status-good';
  let statusIcon = '🟢';
  let statusTitle = 'Dự án đang kiểm soát hiệu quả (Tiến độ & Chi phí đạt chuẩn)';
  let scheduleText = '';
  let costText = '';
  let advice = '';

  if (SPI >= 1.0) {
    scheduleText = `Tiến độ vượt kế hoạch (+${Math.round((SPI - 1) * 100)}%). Khối lượng đạt được (EV) vượt kỳ vọng.`;
  } else {
    scheduleText = `Tiến độ đang chậm ${Math.round((1 - SPI) * 100)}% so với kế hoạch mốc (SV = ${formatCurrency(SV)}).`;
  }

  if (CPI >= 1.0) {
    costText = `Chi phí thực tế tiết kiệm ${Math.round((CPI - 1) * 100)}% so với định mức (CV = +${formatCurrency(CV)}).`;
  } else {
    costText = `Chi phí đang vượt định mức ${Math.round((1 - CPI) * 100)}% (CV = ${formatCurrency(CV)}).`;
  }

  if (SPI < 0.85 || CPI < 0.85) {
    statusClass = 'status-danger';
    statusIcon = '🔴';
    statusTitle = 'Cảnh báo Nguy cơ Cao (Cần hành động can thiệp)';
    advice = 'Khuyến nghị: Tổ chức đợt kiểm điểm tiến độ và xử lý xung đột (Clash Sprint). Cân nhắc bổ sung 1-2 BIM Modeler cho phân đoạn đường găng và giải quyết nhanh các yêu cầu RFI.';
  } else if (SPI < 0.95 || CPI < 0.95) {
    statusClass = 'status-warning';
    statusIcon = '🟡';
    statusTitle = 'Cần lưu ý kiểm soát Tiến độ / Chi phí';
    advice = 'Khuyến nghị: Rà soát lại việc phân bổ nhân sự và số giờ làm thực tế theo tuần. Đôn đốc giải quyết các thắc mắc RFI để tránh ách tắc giai đoạn tiếp theo.';
  } else {
    statusClass = 'status-good';
    statusIcon = '🟢';
    statusTitle = 'Dự án đang kiểm soát hiệu quả (Tiến độ & Chi phí đạt chuẩn)';
    advice = 'Khuyến nghị: Duy trì nhịp độ giao nộp theo các cột mốc đề ra và tiếp tục giám sát sát sao chỉ số Model Health.';
  }

  return `
    <div class="evm-diagnostic-card ${statusClass}">
      <div style="font-size: 1.5rem; flex-shrink: 0; line-height: 1;">${statusIcon}</div>
      <div style="flex: 1;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
          Chẩn đoán 5D BIM & Tiến độ: ${statusTitle}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px;">
          • <strong>Tiến độ:</strong> ${scheduleText} &nbsp;|&nbsp; <strong>Ngân sách:</strong> ${costText}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 600; background: var(--bg-card); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          💡 ${advice}
        </div>
      </div>
    </div>
  `;
}

/**
 * THÔNG TIN DỰ ÁN
 */
function renderProjectInfo(project, isEditing, typeInfo, personnel, formatDate) {
  return `
    <table class="data-table">
      <tbody>
        <tr>
          <td class="text-muted">Loại</td>
          <td class="font-semibold">
            ${isEditing ? `
              <select id="edit-type" class="form-select">
                ${Object.entries(PROJECT_TYPES).map(([k, v]) => `<option value="${k}" ${k === project.type ? 'selected' : ''}>${v.label}</option>`).join('')}
              </select>
            ` : typeInfo.label}
          </td>
        </tr>
        <tr>
          <td class="text-muted">Chủ đầu tư</td>
          <td class="font-semibold">${isEditing ? `<input type="text" id="edit-client" class="form-input" value="${project.client}">` : project.client}</td>
        </tr>
        <tr>
          <td class="text-muted">Vị trí</td>
          <td class="font-semibold">${isEditing ? `<input type="text" id="edit-location" class="form-input" value="${project.location}">` : project.location}</td>
        </tr>
        <tr>
          <td class="text-muted">Chiều dài</td>
          <td class="font-semibold">${isEditing ? `<input type="text" id="edit-length" class="form-input" value="${project.length}">` : project.length}</td>
        </tr>
        <tr>
          <td class="text-muted">Ngân sách</td>
          <td class="font-semibold">${isEditing ? `<input type="text" id="edit-budget" class="form-input" value="${project.budget}">` : project.budget}</td>
        </tr>
        <tr>
          <td class="text-muted">LOD Target</td>
          <td class="font-semibold">${isEditing ? `<input type="number" id="edit-lod" class="form-input" value="${project.lodTarget}">` : `LOD ${project.lodTarget}`}</td>
        </tr>
        <tr>
          <td class="text-muted">Team Lead</td>
          <td class="font-semibold">
            ${isEditing ? `
              <select id="edit-lead" class="form-select">
                <option value="">-- Chọn --</option>
                ${project.teamLead && !(personnel || []).some(m => m.name === project.teamLead) ? `
                  <option value="${project.teamLead}" selected>👤 ${project.teamLead}</option>
                ` : ''}
                ${(personnel || []).map(m => {
                  let label = m.name;
                  const alloc = m.totalAllocation || 0;
                  if (alloc >= 100) label += ' [⚠️ Quá tải]';
                  else label += ` [✅ Rảnh ${100 - alloc}%]`;
                  return `<option value="${m.name}" ${project.teamLead === m.name ? 'selected' : ''}>${label}</option>`;
                }).join('')}
              </select>
            ` : project.teamLead || '<span class="text-muted italic">Chưa gán</span>'}
          </td>
        </tr>
        <tr>
          <td class="text-muted">Bắt đầu</td>
          <td class="font-semibold">${isEditing ? `<input type="date" id="edit-start" class="form-input" value="${project.startDate.split('T')[0]}">` : formatDate(project.startDate)}</td>
        </tr>
        <tr>
          <td class="text-muted">Kết thúc</td>
          <td class="font-semibold">${isEditing ? `<input type="date" id="edit-end" class="form-input" value="${project.endDate.split('T')[0]}">` : formatDate(project.endDate)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * GIAI ĐOẠN DỰ ÁN
 */
function renderPhases(project) {
  const isEditing = getIsEditing();
  return `
    <div class="flex flex-col gap-sm">
      ${project.phases.map((phase, idx) => {
        const phaseInfo = BIM_PHASES.find(p => p.id === phase.id) || {};
        const isActive = phase.status === 'active';
        const isCompleted = phase.status === 'completed';
        const borderColor = isActive ? 'var(--accent-primary)' : isCompleted ? 'var(--accent-secondary)' : 'var(--border-default)';
        
        return `
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-md); border: 1px solid ${borderColor}; background: ${isActive ? 'var(--accent-primary-glow)' : 'transparent'}; transition: all 0.2s;">
            <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; background: ${isCompleted ? 'var(--accent-secondary-glow)' : isActive ? 'var(--accent-primary-glow)' : 'var(--bg-tertiary)'}; flex-shrink: 0;">
              ${phaseInfo.icon || '📌'}
            </div>
            ${isEditing ? `
              <div style="flex: 1; min-width: 150px;">
                <div class="text-sm font-semibold">${phaseInfo.label || phase.id}</div>
                <div class="flex items-center gap-xs mt-xs">
                  <input type="date" class="form-input edit-phase-start" data-idx="${idx}" value="${phase.startDate.split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px;">
                  <span class="text-xs text-muted">→</span>
                  <input type="date" class="form-input edit-phase-end" data-idx="${idx}" value="${phase.endDate.split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px;">
                </div>
              </div>
              <div class="flex items-center gap-sm">
                <select class="form-select edit-phase-status" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; width: 110px;">
                  <option value="planning" ${phase.status === 'planning' ? 'selected' : ''}>Kế hoạch</option>
                  <option value="active" ${phase.status === 'active' ? 'selected' : ''}>Đang chạy</option>
                  <option value="completed" ${phase.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
                </select>
                <div class="flex items-center gap-xs">
                  <input type="range" class="edit-phase-progress" data-idx="${idx}" value="${phase.progress}" min="0" max="100" style="width: 70px; cursor: pointer; accent-color: var(--accent-primary);">
                  <span class="text-xs font-bold edit-phase-progress-label" style="width: 30px; text-align: right;">${phase.progress}%</span>
                </div>
              </div>
            ` : `
              <div style="flex: 1;">
                <div class="text-sm font-semibold">${phaseInfo.label || phase.id}</div>
                <div class="text-xs text-muted">${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}</div>
              </div>
              <div style="width: 80px;">
                <div class="progress-bar" style="height: 5px;">
                  <div class="progress-bar-fill ${isCompleted ? 'green' : ''}" style="width: ${phase.progress}%;"></div>
                </div>
              </div>
              <span class="text-xs font-bold" style="width: 35px; text-align: right;">${phase.progress}%</span>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * BỘ MÔN THIẾT KẾ
 */
function renderDisciplinesSection(project) {
  return `
    <div class="card mb-lg">
      <div class="card-header">
        <h3 class="card-title">🔧 Bộ môn thiết kế</h3>
      </div>
      <div class="flex gap-sm flex-wrap">
        ${project.disciplines.map(d => {
          const disc = { road: '🛣️ Đường', bridge: '🌉 Cầu', tunnel: '🚇 Hầm', drainage: '💧 Thoát nước', lighting: '💡 Chiếu sáng', traffic: '🚦 Tín hiệu GT', landscape: '🌳 Cảnh quan', geotechnical: '🪨 Địa kỹ thuật' };
          return `<span class="filter-chip">${disc[d] || d}</span>`;
        }).join('')}
      </div>
    </div>
  `;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function refreshDetail() {
  const container = document.getElementById('page-content');
  if (container) {
    container.innerHTML = render();
    init();
  }
}

function switchProjectTab(targetTab) {
  currentProjectTab = targetTab;

  document.querySelectorAll('.btn-proj-tab').forEach(btn => {
    if (btn.dataset.tab === targetTab) {
      btn.classList.add('tab--active');
    } else {
      btn.classList.remove('tab--active');
    }
  });

  const container = document.getElementById('proj-tab-content-container');
  const { projects, selectedProjectId } = getState();
  const project = projects.find(p => p.id === selectedProjectId);
  if (!container || !project) {
    refreshDetail();
    return;
  }

  destroy();
  container.innerHTML = renderTabContentHTML(targetTab, project);

  if (targetTab === 'overview' || targetTab === 'all') {
    const projectTimesheets = (getState().timesheets || []).filter(t => t.projectId === project.id);
    const hoursSummaryData = computeProjectHoursSummary(project, projectTimesheets);
    initHoursSummaryCharts(hoursSummaryData);
    bindOverviewActions();
  }
  if (targetTab === 'tasks' || targetTab === 'all') {
    bindTaskActions();
  }
  if (targetTab === 'segments' || targetTab === 'all') {
    bindSegmentActions();
  }
  if (targetTab === 'rfis' || targetTab === 'all') {
    bindRfiActions();
  }
}

let projectAutoSaveTimer = null;
function triggerProjectAutoSave() {
  clearTimeout(projectAutoSaveTimer);
  projectAutoSaveTimer = setTimeout(() => {
    performSilentSave();
  }, 400);
}

function handleMatrixSliderInput(slider) {
  if (!slider) return;
  const val = Math.min(100, Math.max(0, parseInt(slider.value) || 0));

  // 1. Cập nhật nhãn text bên cạnh slider ngay lập tức
  const label = slider.parentElement?.querySelector('.matrix-progress-label') || slider.nextElementSibling;
  if (label) {
    label.textContent = `${val}%`;
    label.style.color = val >= 100 ? 'var(--text-success)' : 'inherit';
  }

  // 2. Nếu là phân đoạn con (subsegment): tự động tính lại tiến độ trung bình của phân đoạn cha
  if (slider.classList.contains('edit-subsegment-matrix-progress')) {
    const sIdx = slider.dataset.sidx;
    const mIdx = slider.dataset.midx;
    const subSliders = document.querySelectorAll(`.edit-subsegment-matrix-progress[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
    if (subSliders.length > 0) {
      let sum = 0;
      subSliders.forEach(sub => {
        sum += Math.min(100, Math.max(0, parseInt(sub.value) || 0));
      });
      const avg = Math.round(sum / subSliders.length);

      // Cập nhật thanh tiến độ cha
      const parentFill = document.querySelector(`.parent-progress-fill-${sIdx}-${mIdx}`);
      if (parentFill) {
        parentFill.style.width = `${avg}%`;
        if (avg >= 100) parentFill.classList.add('green');
        else parentFill.classList.remove('green');
      }

      // Cập nhật số % của cha
      const parentText = document.querySelector(`.parent-progress-text-${sIdx}-${mIdx}`);
      if (parentText) {
        parentText.textContent = `${avg}%`;
        parentText.style.color = avg >= 100 ? 'var(--text-success)' : 'inherit';
      }

      // Cập nhật input hidden của cha để lưu đúng
      const parentHidden = document.getElementById(`parent-hidden-${sIdx}-${mIdx}`);
      if (parentHidden) {
        parentHidden.value = avg;
      }
    }
  }

  // 3. Tự động lưu ngầm
  triggerProjectAutoSave();
}

function handlePhaseSliderInput(slider) {
  if (!slider) return;
  const val = Math.min(100, Math.max(0, parseInt(slider.value) || 0));
  const label = slider.parentElement?.querySelector('.edit-phase-progress-label') || slider.nextElementSibling;
  if (label) {
    label.textContent = `${val}%`;
  }
  triggerProjectAutoSave();
}

function bindOverviewActions() {
  document.querySelectorAll('.edit-phase-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      handlePhaseSliderInput(e.target);
    });
    slider.addEventListener('change', (e) => {
      handlePhaseSliderInput(e.target);
      triggerProjectAutoSave();
    });
  });
}

function performSilentSave() {
  const { selectedProjectId } = getState();
  const currentProject = getState().projects.find(p => p.id === selectedProjectId);
  if (!currentProject) return;

  const indicator = document.getElementById('auto-save-indicator');
  if (indicator) indicator.style.display = 'flex';

  const updates = {};
  const nameEl = document.getElementById('edit-name');
  if (nameEl && nameEl.value) updates.name = nameEl.value;
  const codeEl = document.getElementById('edit-code');
  if (codeEl && codeEl.value) updates.code = codeEl.value;
  const statusEl = document.getElementById('edit-status');
  if (statusEl) updates.status = statusEl.value;
  const typeEl = document.getElementById('edit-type');
  if (typeEl) updates.type = typeEl.value;
  const clientEl = document.getElementById('edit-client');
  if (clientEl) updates.client = clientEl.value;
  const locationEl = document.getElementById('edit-location');
  if (locationEl) updates.location = locationEl.value;
  const lengthEl = document.getElementById('edit-length');
  if (lengthEl) updates.length = lengthEl.value;
  const budgetEl = document.getElementById('edit-budget');
  if (budgetEl) updates.budget = budgetEl.value;
  const lodEl = document.getElementById('edit-lod');
  if (lodEl) updates.lodTarget = parseInt(lodEl.value) || 300;
  const leadEl = document.getElementById('edit-lead');
  if (leadEl && leadEl.value) updates.teamLead = leadEl.value;
  const startEl = document.getElementById('edit-start');
  if (startEl && startEl.value) updates.startDate = startEl.value;
  const endEl = document.getElementById('edit-end');
  if (endEl && endEl.value) updates.endDate = endEl.value;

  // Cột mốc
  const milestoneNames = document.querySelectorAll('.edit-milestone-name');
  const milestoneDates = document.querySelectorAll('.edit-milestone-date');
  if (milestoneNames.length > 0) {
    const newMilestones = [];
    milestoneNames.forEach((el, idx) => {
      newMilestones.push({
        id: (currentProject.milestones || [])[idx]?.id || `M${Date.now()}_${idx}`,
        name: el.value,
        date: milestoneDates[idx]?.value || (currentProject.milestones || [])[idx]?.date || ''
      });
    });
    updates.milestones = newMilestones;
  }

  // Phân đoạn & ma trận
  const segmentNames = document.querySelectorAll('.edit-segment-name');
  if (segmentNames.length > 0) {
    const newSegments = [];
    const activeMilestones = (updates.milestones || currentProject.milestones || []);
    segmentNames.forEach((el, sIdx) => {
      const segName = el.value;
      const progresses = [];
      const deadlines = [];
      activeMilestones.forEach((m, mIdx) => {
        const slider = document.querySelector(`.edit-segment-matrix-progress[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
        progresses.push(slider ? parseInt(slider.value) : (currentProject.segments?.[sIdx]?.progresses?.[mIdx] || 0));
        const dateInput = document.querySelector(`.edit-segment-matrix-date[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
        deadlines.push(dateInput ? dateInput.value : (currentProject.segments?.[sIdx]?.deadlines?.[mIdx] || ''));
      });
      
      const subSegments = [];
      const subNameInputs = document.querySelectorAll(`.edit-subsegment-name[data-sidx="${sIdx}"]`);
      subNameInputs.forEach((subEl, subIdx) => {
        const subProgresses = [];
        const subDeadlines = [];
        activeMilestones.forEach((m, mIdx) => {
          const subSlider = document.querySelector(`.edit-subsegment-matrix-progress[data-sidx="${sIdx}"][data-subidx="${subIdx}"][data-midx="${mIdx}"]`);
          subProgresses.push(subSlider ? parseInt(subSlider.value) : (currentProject.segments?.[sIdx]?.subSegments?.[subIdx]?.progresses?.[mIdx] || 0));
          const subDateInput = document.querySelector(`.edit-subsegment-matrix-date[data-sidx="${sIdx}"][data-subidx="${subIdx}"][data-midx="${mIdx}"]`);
          subDeadlines.push(subDateInput ? subDateInput.value : (currentProject.segments?.[sIdx]?.subSegments?.[subIdx]?.deadlines?.[mIdx] || ''));
        });
        subSegments.push({
          id: currentProject.segments?.[sIdx]?.subSegments?.[subIdx]?.id || `Sub_${Date.now()}_${sIdx}_${subIdx}`,
          name: subEl.value,
          progresses: subProgresses,
          deadlines: subDeadlines
        });
      });
      
      if (subSegments.length > 0) {
        activeMilestones.forEach((m, mIdx) => {
          const sum = subSegments.reduce((acc, sub) => acc + (sub.progresses[mIdx] || 0), 0);
          progresses[mIdx] = Math.round(sum / subSegments.length);
        });
      }
      
      const avgProgress = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
      newSegments.push({
        id: currentProject.segments?.[sIdx]?.id || `S${Date.now()}_${sIdx}`,
        name: segName,
        progress: avgProgress,
        progresses: progresses,
        deadlines: deadlines,
        subSegments: subSegments
      });
    });
    updates.segments = newSegments;
    if (newSegments.length > 0) {
      const totalSegProgress = newSegments.reduce((sum, s) => sum + (s.progress || 0), 0);
      updates.progress = Math.round(totalSegProgress / newSegments.length);
    }
  }

  // Tasks (chỉ cập nhật danh sách task hiện có, KHÔNG BAO GIỜ tự nối lại task đã xóa)
  const taskNames = document.querySelectorAll('.edit-task-name');
  if (taskNames.length > 0) {
    const taskAssignees = document.querySelectorAll('.edit-task-assignee');
    const taskProgresses = document.querySelectorAll('.edit-task-progress');
    const taskDues = document.querySelectorAll('.edit-task-due');
    const taskSegments = document.querySelectorAll('.edit-task-segment');
    const taskMilestones = document.querySelectorAll('.edit-task-milestone');
    const newTasks = [];

    taskNames.forEach((el, idx) => {
      const taskId = el.dataset.id || currentProject.tasks?.[idx]?.id;
      const prevTask = (taskId ? currentProject.tasks?.find(t => t.id === taskId) : null) || currentProject.tasks?.[idx] || {};

      // Nếu task này đã bị xóa khỏi currentProject.tasks, không phục hồi lại từ DOM
      if (taskId && currentProject.tasks && !currentProject.tasks.some(t => t.id === taskId)) {
        return;
      }

      const segEl = (taskId ? document.querySelector(`.edit-task-segment[data-id="${taskId}"]`) : null) || taskSegments[idx];
      const segValStr = segEl?.value || "-1";
      const mlEl = (taskId ? document.querySelector(`.edit-task-milestone[data-id="${taskId}"]`) : null) || taskMilestones[idx];
      const mlVal = parseInt(mlEl?.value);
      let sIdx = null, subIdx = null;
      if (segValStr !== "-1") {
        const parts = segValStr.split('_');
        sIdx = parseInt(parts[0]);
        if (parts.length > 1) subIdx = parseInt(parts[1]);
      }

      const assigneeEl = (taskId ? document.querySelector(`.edit-task-assignee[data-id="${taskId}"]`) : null) || taskAssignees[idx];
      const chosenAssignee = assigneeEl ? assigneeEl.value : (prevTask.assignee || '');

      const progEl = (taskId ? document.querySelector(`.edit-task-progress[data-id="${taskId}"]`) : null) || taskProgresses[idx];
      const progVal = progEl ? (parseInt(progEl.value) || 0) : (prevTask.progress || 0);

      const dueEl = (taskId ? document.querySelector(`.edit-task-due[data-id="${taskId}"]`) : null) || taskDues[idx];
      const dueVal = dueEl ? dueEl.value : (prevTask.dueDate || '');

      const cleanName = el.value !== undefined ? el.value : (prevTask.name || '');

      newTasks.push({
        id: taskId || prevTask.id || `t_${Date.now()}_${idx}`,
        name: cleanName || '(Chưa đặt tên)',
        assignee: chosenAssignee,
        progress: progVal,
        dueDate: dueVal,
        status: progVal === 100 ? 'completed' : 'active',
        segmentIdx: sIdx,
        subSegmentIdx: subIdx,
        milestoneIdx: mlVal >= 0 ? mlVal : null,
        phase: prevTask.phase || 'BVTC',
        lod: prevTask.lod || 'LOD 300',
        chainage: prevTask.chainage || '',
        dailyHours_planned: prevTask.dailyHours_planned || {},
        dailyHours_actual: prevTask.dailyHours_actual || {},
        description: prevTask.description || '',
        cloudLinks: prevTask.cloudLinks || ''
      });
    });
    updates.tasks = newTasks;
    if (updates.progress === undefined && newTasks.length > 0) {
      const totalTaskProgress = newTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
      updates.progress = Math.round(totalTaskProgress / newTasks.length);
    }
  }

  // Phases
  const phaseStarts = document.querySelectorAll('.edit-phase-start');
  if (phaseStarts.length > 0) {
    const phaseEnds = document.querySelectorAll('.edit-phase-end');
    const phaseStatuses = document.querySelectorAll('.edit-phase-status');
    const phaseProgresses = document.querySelectorAll('.edit-phase-progress');
    const newPhases = [];
    phaseStarts.forEach((el, idx) => {
      newPhases.push({
        id: (currentProject.phases || [])[idx]?.id || `phase-${idx}`,
        startDate: el.value,
        endDate: phaseEnds[idx]?.value || '',
        status: phaseStatuses[idx]?.value || 'not_started',
        progress: parseInt(phaseProgresses[idx]?.value) || 0
      });
    });
    updates.phases = newPhases;
  }

  // RFIs
  const rfiCodes = document.querySelectorAll('.edit-rfi-code');
  if (rfiCodes.length > 0) {
    const rfiTitles = document.querySelectorAll('.edit-rfi-title');
    const rfiPriorities = document.querySelectorAll('.edit-rfi-priority');
    const rfiStatuses = document.querySelectorAll('.edit-rfi-status');
    const rfiAssignees = document.querySelectorAll('.edit-rfi-assignee');
    const rfiDues = document.querySelectorAll('.edit-rfi-due');
    const rfiSegments = document.querySelectorAll('.edit-rfi-segment');
    const rfiMilestones = document.querySelectorAll('.edit-rfi-milestone');
    const newRfis = [];
    rfiCodes.forEach((el, idx) => {
      let sIdx = null, subIdx = null;
      if (rfiSegments[idx]) {
        const segValStr = rfiSegments[idx].value;
        if (segValStr !== "-1") {
          const parts = segValStr.split('_');
          sIdx = parseInt(parts[0]);
          if (parts.length > 1) subIdx = parseInt(parts[1]);
        }
      }
      let mIdx = null;
      if (rfiMilestones[idx]) {
        const mlVal = parseInt(rfiMilestones[idx].value);
        if (mlVal >= 0) mIdx = mlVal;
      }
      const prevRfi = (currentProject.rfis || [])[idx] || {};
      const chosenRfiAssignee = (rfiAssignees[idx] && rfiAssignees[idx].value) ? rfiAssignees[idx].value : (prevRfi.assignee || '');
      newRfis.push({
        id: prevRfi.id || `rfi-${Date.now()}-${idx}`,
        code: el.value || prevRfi.code,
        title: rfiTitles[idx]?.value || prevRfi.title,
        priority: rfiPriorities[idx]?.value || prevRfi.priority || 'Medium',
        status: rfiStatuses[idx]?.value || prevRfi.status || 'Open',
        assignee: chosenRfiAssignee,
        dueDate: rfiDues[idx]?.value || prevRfi.dueDate || '',
        segmentIdx: sIdx,
        subSegmentIdx: subIdx,
        milestoneIdx: mIdx,
        description: prevRfi.description || '',
        cloudLinks: prevRfi.cloudLinks || ''
      });
    });
    updates.rfis = newRfis;
  }

  updateProject(selectedProjectId, updates);

  if (updates.progress !== undefined) {
    const kpiEl = document.getElementById('proj-kpi-progress');
    if (kpiEl) kpiEl.textContent = `${updates.progress}%`;
  }

  setTimeout(() => {
    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) {
      indicator.innerHTML = '<span style="font-size: 0.8rem; font-weight: bold; color: var(--text-success);">✅ Đã lưu</span>';
      setTimeout(() => {
        indicator.style.display = 'none';
        indicator.innerHTML = `
          <span class="spinner" style="width: 14px; height: 14px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span>
          <span style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);">Đang lưu...</span>
        `;
      }, 1500);
    }
  }, 400);
}

// ============================================
// KHỞI TẠO VÀ XỬ LÝ SỰ KIỆN (INIT)
// ============================================

export function init() {
  const { projects, selectedProjectId } = getState();
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;
  
  // Dọn dẹp các chart cũ
  destroy();

  // 1. Chuyển Tab Navigation (Phản hồi 0ms không nháy trang)
  document.querySelectorAll('.btn-proj-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      if (currentProjectTab === targetTab) return;
      switchProjectTab(targetTab);
    });
  });

  // 2. Khởi tạo Hours Summary Charts (nếu đang ở tab overview hoặc all)
  if (currentProjectTab === 'overview' || currentProjectTab === 'all') {
    const projectTimesheets = (getState().timesheets || []).filter(t => t.projectId === project.id);
    const hoursSummaryData = computeProjectHoursSummary(project, projectTimesheets);
    initHoursSummaryCharts(hoursSummaryData);
    bindOverviewActions();
  }

  // 3. Khởi tạo sự kiện Công việc (nếu ở tab tasks hoặc all)
  if (currentProjectTab === 'tasks' || currentProjectTab === 'all') {
    bindTaskActions();
  }

  // 4. Khởi tạo sự kiện Phân đoạn (nếu ở tab segments hoặc all)
  if (currentProjectTab === 'segments' || currentProjectTab === 'all') {
    bindSegmentActions();
  }

  // 5. Khởi tạo sự kiện RFI (nếu ở tab rfis hoặc all)
  if (currentProjectTab === 'rfis' || currentProjectTab === 'all') {
    bindRfiActions();
  }

  // 6. Xử lý chỉnh sửa chung (General Edit)
  const isEditing = getIsEditing();
  if (isEditing) {
    const container = document.getElementById('page-content');
    if (container && !container.dataset.hasProjectDetailSaveListener) {
      container.dataset.hasProjectDetailSaveListener = "true";
      
      container.addEventListener('change', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') return;
        if (e.target.classList.contains('task-select-chk') || e.target.id === 'chk-select-all-tasks') return;
        triggerProjectAutoSave();
      });

      // Lắng nghe realtime khi kéo thanh trượt (input event)
      container.addEventListener('input', (e) => {
        if (e.target.type === 'range') {
          if (e.target.classList.contains('edit-subsegment-matrix-progress') || e.target.classList.contains('edit-segment-matrix-progress')) {
            handleMatrixSliderInput(e.target);
          } else if (e.target.classList.contains('edit-phase-progress')) {
            handlePhaseSliderInput(e.target);
          }
        }
      });
    }
  }

  // Nút chỉnh sửa dự án
  document.getElementById('btn-edit-project')?.addEventListener('click', async () => {
    try {
      const { openProjectModal } = await import('../components/ProjectFormModal.js');
      openProjectModal(project);
    } catch(err) {
      console.error(err);
    }
  });
}

/**
 * XUẤT DANH SÁCH CÔNG VIỆC RA FILE CSV
 */
function exportTasksToCSV(project) {
  const tasks = project.tasks || [];
  if (!tasks.length) {
    showToast('Dự án chưa có công việc để xuất!', 'warning');
    return;
  }
  const headers = ['Mã ID', 'Tên công việc', 'Phụ trách', 'Tiến độ (%)', 'Hạn chót', 'Giai đoạn', 'LOD', 'Phân đoạn', 'Cột mốc', 'Mô hình 3D', 'Ghi chú'];
  const rows = tasks.map(t => {
    const seg = t.segmentIdx != null && project.segments[t.segmentIdx] ? project.segments[t.segmentIdx].name : '';
    const ml = t.milestoneIdx != null && (project.milestones || [])[t.milestoneIdx] ? project.milestones[t.milestoneIdx].name : '';
    return [
      `"${t.id || ''}"`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${t.assignee || ''}"`,
      t.progress || 0,
      `"${(t.dueDate || '').split('T')[0]}"`,
      `"${t.phase || ''}"`,
      `"${t.lod || ''}"`,
      `"${seg}"`,
      `"${ml}"`,
      `"${(t.cloudLinks || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ];
  });
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tasks_${project.code || 'BIM'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 Đã xuất file CSV thành công!');
}

/**
 * XUẤT MA TRẬN PHÂN ĐOẠN RA FILE CSV
 */
function exportMatrixToCSV(project) {
  const segments = project.segments || [];
  const milestones = project.milestones || [];
  if (!segments.length) {
    showToast('Chưa có phân đoạn để xuất!', 'warning');
    return;
  }
  const headers = ['Phân đoạn', 'Đoạn nhỏ', ...milestones.map(m => `"${m.name} (${(m.date || '').split('T')[0]})"`)];
  const rows = [];
  segments.forEach(s => {
    const parentRow = [
      `"${s.name}"`,
      '""',
      ...milestones.map((m, mIdx) => s.progresses?.[mIdx] !== undefined ? `${s.progresses[mIdx]}%` : '0%')
    ];
    rows.push(parentRow.join(','));
    if (s.subSegments && s.subSegments.length > 0) {
      s.subSegments.forEach(sub => {
        const subRow = [
          `"${s.name}"`,
          `"${sub.name}"`,
          ...milestones.map((m, mIdx) => sub.progresses?.[mIdx] !== undefined ? `${sub.progresses[mIdx]}%` : '0%')
        ];
        rows.push(subRow.join(','));
      });
    }
  });
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ma_tran_tien_do_${project.code || 'BIM'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 Đã xuất ma trận tiến độ thành công!');
}

/**
 * NHẬP DANH SÁCH CÔNG VIỆC TỪ FILE CSV
 */
function importTasksFromCSV(file, project) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        showToast('File CSV không có dữ liệu!', 'warning');
        return;
      }
      
      const newTasks = [...(project.tasks || [])];
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
        if (!row[1] || row[1].length === 0) continue;

        newTasks.push({
          id: `t_${Date.now()}_${i}`,
          name: row[1] || 'Công việc mới',
          assignee: row[2] || '',
          progress: parseInt(row[3]) || 0,
          dueDate: row[4] || formatLocalDate(new Date()),
          status: parseInt(row[3]) >= 100 ? 'completed' : 'active',
          phase: row[5] || 'BVTC',
          lod: row[6] || 'LOD 300',
          cloudLinks: row[9] || '',
          description: row[10] || ''
        });
        importedCount++;
      }

      if (importedCount > 0) {
        updateProject(project.id, { tasks: newTasks });
        showToast(`📤 Đã nhập thành công ${importedCount} công việc từ CSV!`);
        refreshDetail();
      } else {
        showToast('Không đọc được công việc hợp lệ từ file!', 'warning');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi đọc file CSV!', 'danger');
    }
  };
  reader.readAsText(file);
}

/**
 * GẮN SỰ KIỆN TAB CÔNG VIỆC
 */
function bindTaskActions() {
  const { selectedProjectId } = getState();

  // Chuyển đổi chế độ xem Bảng / Kanban
  document.getElementById('btn-view-table')?.addEventListener('click', () => {
    if (currentTaskViewMode === 'table') return;
    currentTaskViewMode = 'table';
    refreshDetail();
  });
  document.getElementById('btn-view-kanban')?.addEventListener('click', () => {
    if (currentTaskViewMode === 'kanban') return;
    currentTaskViewMode = 'kanban';
    refreshDetail();
  });

  // Xuất & Nhập CSV
  document.getElementById('btn-export-tasks')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (currentProj) exportTasksToCSV(currentProj);
  });

  document.getElementById('btn-import-tasks-trigger')?.addEventListener('click', () => {
    document.getElementById('input-import-tasks-file')?.click();
  });

  document.getElementById('input-import-tasks-file')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (file && currentProj) importTasksFromCSV(file, currentProj);
  });

  // 1. Tìm kiếm công việc thời gian thực
  document.getElementById('task-search-input')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.task-row').forEach(row => {
      const name = row.dataset.name || '';
      row.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // 2. Lọc theo nhân sự
  document.getElementById('task-assignee-filter')?.addEventListener('change', (e) => {
    const val = e.target.value;
    document.querySelectorAll('.task-row').forEach(row => {
      const assignee = row.dataset.assignee || '';
      row.style.display = (!val || assignee === val) ? '' : 'none';
    });
  });

  // 3. Floating Bulk Toolbar logic
  const updateBulkToolbar = () => {
    const checked = document.querySelectorAll('.task-select-chk:checked');
    const toolbar = document.getElementById('tasks-bulk-toolbar');
    const countEl = document.getElementById('bulk-selected-count');
    if (!toolbar) return;
    if (checked.length > 0) {
      toolbar.style.display = 'flex';
      if (countEl) countEl.textContent = `Đã chọn ${checked.length}`;
    } else {
      toolbar.style.display = 'none';
    }
  };

  document.querySelectorAll('.task-select-chk').forEach(cb => {
    cb.addEventListener('change', updateBulkToolbar);
  });

  document.getElementById('chk-select-all-tasks')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.task-select-chk').forEach(cb => cb.checked = checked);
    updateBulkToolbar();
  });

  // Bulk Assign
  document.getElementById('bulk-assignee-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    const checkedBoxes = document.querySelectorAll('.task-select-chk:checked');
    if (!checkedBoxes.length) return;
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj || !currentProj.tasks) return;

    checkedBoxes.forEach(cb => {
      const taskId = cb.dataset.id;
      const idx = parseInt(cb.dataset.idx, 10);
      const target = (taskId ? currentProj.tasks.find(t => t.id === taskId) : null) || currentProj.tasks[idx];
      if (target) {
        target.assignee = val;
      }
    });
    updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
    showToast(`👥 Đã phân công ${checkedBoxes.length} việc cho ${formatDisplayName(val)}!`);
    refreshDetail();
  });

  // Bulk Progress
  document.getElementById('bulk-progress-select')?.addEventListener('change', (e) => {
    const valStr = e.target.value;
    if (valStr === '') return;
    const pVal = parseInt(valStr, 10);
    const checkedBoxes = document.querySelectorAll('.task-select-chk:checked');
    if (!checkedBoxes.length) return;
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj || !currentProj.tasks) return;

    checkedBoxes.forEach(cb => {
      const taskId = cb.dataset.id;
      const idx = parseInt(cb.dataset.idx, 10);
      const target = (taskId ? currentProj.tasks.find(t => t.id === taskId) : null) || currentProj.tasks[idx];
      if (target) {
        target.progress = pVal;
        target.status = pVal >= 100 ? 'completed' : 'active';
      }
    });
    updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
    showToast(`🎯 Đã cập nhật tiến độ ${pVal}% cho ${checkedBoxes.length} việc!`);
    refreshDetail();
  });

  // Bulk Delete (Trực tiếp, không phụ thuộc nút phụ)
  document.getElementById('bulk-delete-btn')?.addEventListener('click', () => {
    const checkedBoxes = document.querySelectorAll('.task-select-chk:checked');
    if (checkedBoxes.length === 0) {
      alert('Vui lòng tích chọn ít nhất một công việc để xóa!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa ${checkedBoxes.length} công việc đã chọn? Thao tác này sẽ xóa vĩnh viễn khỏi hệ thống!`)) {
      const selectedIds = new Set(Array.from(checkedBoxes).map(cb => cb.dataset.id).filter(Boolean));
      const selectedIndices = new Set(Array.from(checkedBoxes).map(cb => parseInt(cb.dataset.idx, 10)));
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks) return;

      currentProj.tasks = currentProj.tasks.filter((t, idx) => {
        if (t.id && selectedIds.has(t.id)) return false;
        if (selectedIndices.has(idx)) return false;
        return true;
      });
      updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
      showToast(`🗑️ Đã xóa thành công ${checkedBoxes.length} công việc!`);
      refreshDetail();
    }
  });

  // Bulk Clear
  document.getElementById('bulk-clear-btn')?.addEventListener('click', () => {
    document.querySelectorAll('.task-select-chk').forEach(cb => cb.checked = false);
    const allChk = document.getElementById('chk-select-all-tasks');
    if (allChk) allChk.checked = false;
    updateBulkToolbar();
  });

  // 4. Thêm công việc mới
  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj) return;
    if (!currentProj.tasks) currentProj.tasks = [];
    currentProj.tasks.push({ 
      id: `t_${Date.now()}`,
      name: 'Công việc mới', 
      assignee: currentProj.teamLead || '', 
      progress: 0, 
      dueDate: formatLocalDate(new Date()),
      status: 'active',
      phase: 'BVTC',
      lod: 'LOD 300'
    });
    updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
    showToast('➕ Đã thêm công việc mới!');
    refreshDetail();
  });

  // 5. XÓA TỪNG CÔNG VIỆC (Định danh theo ID & Index an toàn)
  document.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = e.currentTarget.dataset.id;
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks) return;

      const targetTask = (taskId ? currentProj.tasks.find(t => t.id === taskId) : null) || currentProj.tasks[idx];
      if (!targetTask) return;

      const taskName = targetTask.name || 'công việc này';
      if (confirm(`Bạn có chắc chắn muốn xóa "${taskName}" khỏi dự án?`)) {
        currentProj.tasks = currentProj.tasks.filter(t => (taskId ? t.id !== taskId : t !== targetTask));
        updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
        showToast(`🗑️ Đã xóa "${taskName}"!`);
        refreshDetail();
      }
    });
  });

  // 6. XÓA TOÀN BỘ CÔNG VIỆC
  document.getElementById('btn-delete-all-tasks')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj || !currentProj.tasks || currentProj.tasks.length === 0) return;
    if (confirm(`⚠️ CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa TOÀN BỘ ${currentProj.tasks.length} công việc của dự án này? Thao tác này sẽ làm sạch danh sách công việc!`)) {
      currentProj.tasks = [];
      updateProject(selectedProjectId, { tasks: [] });
      showToast('🗑️ Đã xóa toàn bộ công việc của dự án!');
      refreshDetail();
    }
  });

  // 7. Xem & sửa modal chi tiết công việc
  document.querySelectorAll('.btn-task-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.dataset.id;
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks) return;
      const targetTask = (taskId ? currentProj.tasks.find(t => t.id === taskId) : null) || currentProj.tasks[idx];
      const targetIdx = targetTask ? currentProj.tasks.indexOf(targetTask) : idx;
      if (targetTask && targetIdx >= 0) {
        showItemDetailModal(targetTask, targetIdx, 'task', currentProj, refreshDetail);
      }
    });
  });

  // 9. Quick Advance +25% cho thẻ Kanban
  document.querySelectorAll('.btn-quick-advance').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const step = parseInt(e.currentTarget.dataset.step, 10) || 25;
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks || !currentProj.tasks[idx]) return;

      const newProg = Math.min(100, (currentProj.tasks[idx].progress || 0) + step);
      currentProj.tasks[idx].progress = newProg;
      if (newProg >= 100) currentProj.tasks[idx].status = 'completed';
      updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
      showToast(`⏩ Đã tăng tiến độ "${currentProj.tasks[idx].name}" lên ${newProg}%!`);
      refreshDetail();
    });
  });

  // 10. Quick Done 100% cho thẻ Kanban
  document.querySelectorAll('.btn-quick-done').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks || !currentProj.tasks[idx]) return;

      currentProj.tasks[idx].progress = 100;
      currentProj.tasks[idx].status = 'completed';
      updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
      showToast(`✅ Đã hoàn thành 100% "${currentProj.tasks[idx].name}"!`);
      refreshDetail();
    });
  });

  // 11. KANBAN DRAG & DROP
  let draggedTaskIdx = null;

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedTaskIdx = parseInt(e.currentTarget.dataset.idx, 10);
      e.dataTransfer.setData('text/plain', String(draggedTaskIdx));
      e.currentTarget.classList.add('dragging');
    });

    card.addEventListener('dragend', (e) => {
      e.currentTarget.classList.remove('dragging');
      document.querySelectorAll('.kanban-dropzone').forEach(dz => dz.classList.remove('drag-over'));
    });
  });

  document.querySelectorAll('.kanban-dropzone').forEach(dropzone => {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const targetCol = dropzone.dataset.col;
      const idx = draggedTaskIdx;
      if (idx === null || isNaN(idx)) return;

      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (!currentProj || !currentProj.tasks || !currentProj.tasks[idx]) return;

      let newProgress = currentProj.tasks[idx].progress || 0;
      let newStatus = currentProj.tasks[idx].status || 'active';

      if (targetCol === 'todo') {
        newProgress = 0;
        newStatus = 'active';
      } else if (targetCol === 'in_progress') {
        if (newProgress <= 0 || newProgress >= 80) newProgress = 50;
        newStatus = 'active';
      } else if (targetCol === 'review') {
        if (newProgress < 80 || newProgress >= 100) newProgress = 90;
        newStatus = 'active';
      } else if (targetCol === 'completed') {
        newProgress = 100;
        newStatus = 'completed';
      }

      currentProj.tasks[idx].progress = newProgress;
      currentProj.tasks[idx].status = newStatus;
      updateProject(selectedProjectId, { tasks: [...currentProj.tasks] });
      showToast(`📌 Đã chuyển "${currentProj.tasks[idx].name}" sang ${targetCol}!`);
      refreshDetail();
    });
  });
}

/**
 * GẮN SỰ KIỆN PHÂN ĐOẠN & MA TRẬN
 */
function bindSegmentActions() {
  const { selectedProjectId } = getState();

  // Xuất ma trận tiến độ ra CSV
  document.getElementById('btn-export-matrix')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (currentProj) exportMatrixToCSV(currentProj);
  });

  // Thêm phân đoạn
  document.getElementById('btn-add-segment')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj.segments) currentProj.segments = [];
    currentProj.segments.push({ 
      id: `S${Date.now()}`,
      name: 'Phân đoạn mới', 
      progress: 0,
      progresses: [],
      subSegments: []
    });
    updateProject(selectedProjectId, { segments: currentProj.segments });
    refreshDetail();
  });

  // Xóa phân đoạn
  document.querySelectorAll('.btn-delete-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      if (confirm(`Bạn có chắc muốn xóa phân đoạn "${currentProj.segments[idx]?.name}"?`)) {
        currentProj.segments.splice(idx, 1);
        updateProject(selectedProjectId, { segments: currentProj.segments });
        refreshDetail();
      }
    });
  });

  // Thêm cột mốc
  document.getElementById('btn-add-milestone')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj.milestones) currentProj.milestones = [];
    currentProj.milestones.push({ 
      id: `M${Date.now()}`,
      name: 'Mốc giao nộp mới', 
      date: formatLocalDate(new Date())
    });
    updateProject(selectedProjectId, { milestones: currentProj.milestones });
    refreshDetail();
  });

  // Xóa cột mốc
  document.querySelectorAll('.btn-delete-milestone').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      if (confirm(`Bạn có chắc muốn xóa cột mốc "${currentProj.milestones[idx]?.name}"?`)) {
        currentProj.milestones.splice(idx, 1);
        updateProject(selectedProjectId, { milestones: currentProj.milestones });
        refreshDetail();
      }
    });
  });

  // Ẩn / Hiện phân đoạn nhỏ
  document.querySelectorAll('.btn-toggle-sub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sIdx = e.currentTarget.dataset.sidx;
      const rows = document.querySelectorAll(`.sub-of-${sIdx}`);
      if (!rows.length) return;
      const isHidden = rows[0].style.display === 'none';
      rows.forEach(r => r.style.display = isHidden ? '' : 'none');
      e.currentTarget.textContent = isHidden ? '▼' : '▶';
    });
  });

  // Thêm đoạn nhỏ
  document.querySelectorAll('.btn-add-subsegment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const sIdx = parseInt(e.currentTarget.dataset.sidx, 10);
      if (!currentProj.segments[sIdx].subSegments) currentProj.segments[sIdx].subSegments = [];
      currentProj.segments[sIdx].subSegments.push({
        id: `Sub_${Date.now()}_${sIdx}`,
        name: 'Đoạn nhỏ mới',
        progresses: []
      });
      updateProject(selectedProjectId, { segments: currentProj.segments });
      refreshDetail();
    });
  });

  // Xóa đoạn nhỏ
  document.querySelectorAll('.btn-delete-subsegment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const sIdx = parseInt(e.currentTarget.dataset.sidx, 10);
      const subIdx = parseInt(e.currentTarget.dataset.subidx, 10);
      currentProj.segments[sIdx].subSegments.splice(subIdx, 1);
      updateProject(selectedProjectId, { segments: currentProj.segments });
      refreshDetail();
    });
  });

  // Lắng nghe sự kiện kéo thanh trượt ma trận tiến độ trực tiếp (Realtime phản hồi 0ms)
  document.querySelectorAll('.edit-subsegment-matrix-progress, input[type="range"].edit-segment-matrix-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      handleMatrixSliderInput(e.target);
    });
    slider.addEventListener('change', (e) => {
      handleMatrixSliderInput(e.target);
      triggerProjectAutoSave();
    });
  });

  // Cho phép nhấp vào số % để nhập trực tiếp giá trị (VD: gõ 50 thay vì phải kéo thanh trượt)
  document.querySelectorAll('.matrix-progress-label').forEach(label => {
    label.addEventListener('click', (e) => {
      const container = e.currentTarget.parentElement;
      const slider = container?.querySelector('input[type="range"]');
      if (!slider) return;
      const currentVal = slider.value || '0';
      const inputVal = prompt('Nhập tiến độ mới (0 - 100%):', currentVal);
      if (inputVal !== null && inputVal.trim() !== '') {
        const num = Math.min(100, Math.max(0, parseInt(inputVal) || 0));
        slider.value = num;
        handleMatrixSliderInput(slider);
        triggerProjectAutoSave();
      }
    });
  });

  // Lắng nghe thay đổi ngày hạn chót trong ma trận
  document.querySelectorAll('.edit-segment-matrix-date, .edit-subsegment-matrix-date, .edit-milestone-date').forEach(dateInput => {
    dateInput.addEventListener('change', () => {
      triggerProjectAutoSave();
    });
  });

  // Lắng nghe thay đổi tên mốc / phân đoạn
  document.querySelectorAll('.edit-milestone-name, .edit-segment-name, .edit-subsegment-name').forEach(nameInput => {
    nameInput.addEventListener('change', () => {
      triggerProjectAutoSave();
    });
  });
}

/**
 * GẮN SỰ KIỆN RFI
 */
function bindRfiActions() {
  const { selectedProjectId } = getState();

  document.getElementById('btn-add-rfi')?.addEventListener('click', () => {
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj.rfis) currentProj.rfis = [];
    const newCode = `RFI-${String(currentProj.rfis.length + 1).padStart(3, '0')}`;
    currentProj.rfis.push({ 
      id: `rfi-${Date.now()}`,
      code: newCode,
      title: 'Yêu cầu thông tin mới', 
      priority: 'Medium', 
      status: 'Open',
      assignee: '',
      dueDate: formatLocalDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    });
    updateProject(selectedProjectId, { rfis: currentProj.rfis });
    showToast('➕ Đã thêm yêu cầu RFI!');
    refreshDetail();
  });

  document.querySelectorAll('.btn-delete-rfi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      if (confirm('Bạn có chắc muốn xóa RFI này?')) {
        currentProj.rfis.splice(idx, 1);
        updateProject(selectedProjectId, { rfis: currentProj.rfis });
        showToast('🗑️ Đã xóa RFI!');
        refreshDetail();
      }
    });
  });

  document.querySelectorAll('.btn-rfi-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      if (currentProj && currentProj.rfis && currentProj.rfis[idx]) {
        showItemDetailModal(currentProj.rfis[idx], idx, 'rfi', currentProj, refreshDetail);
      }
    });
  });
}

/**
 * KHỞI TẠO BIỂU ĐỒ HOURS SUMMARY THEO GIAO DIỆN HỆ THỐNG
 */
function initHoursSummaryCharts(hoursSummary) {
  if (!window.Chart) {
    setTimeout(() => initHoursSummaryCharts(hoursSummary), 250);
    return;
  }

  const { theme } = getState();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const textPrimary = isDark ? '#ffffff' : '#0f172a';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const tooltipBg = isDark ? '#1e293b' : '#0f172a';

  // Value label plugin for horizontal bar charts
  const valueLabelPlugin = {
    id: 'valueLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden) return;
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (val === undefined || val === null || val <= 0) return;
          ctx.fillStyle = textPrimary;
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const xPos = element.x + 8;
          const yPos = element.y;
          ctx.fillText(`${val}h`, xPos, yPos);
        });
      });
      ctx.restore();
    }
  };

  // 1. Biểu đồ Hours over time
  const canvasOverTime = document.getElementById('chart-hours-over-time');
  if (canvasOverTime) {
    const ctx = canvasOverTime.getContext('2d');
    const isWeek = currentHoursTimeView === 'week';
    const activeData = isWeek ? hoursSummary.weeksData : hoursSummary.monthsData;
    const maxVal = Math.max(...activeData.map(d => d.hours), 8);
    const chartMax = Math.ceil((maxVal * 1.25) / 5) * 5;

    hoursOverTimeChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: activeData.length > 0 ? activeData.map(d => d.label) : ['Chưa có'],
        datasets: [{
          data: activeData.length > 0 ? activeData.map(d => d.hours) : [0],
          backgroundColor: '#6366f1',
          hoverBackgroundColor: '#4f46e5',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderWidth: 0,
            callbacks: {
              label: (ctx) => `Giờ làm: ${ctx.parsed.y}h`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            min: 0,
            max: chartMax,
            ticks: {
              stepSize: Math.max(1, Math.round(chartMax / 5)),
              color: textColor,
              font: { size: 10 }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          }
        }
      }
    });

    // Nút toggle Week / Month
    const btnWeek = document.getElementById('hours-toggle-week');
    const btnMonth = document.getElementById('hours-toggle-month');
    if (btnWeek && btnMonth) {
      btnWeek.onclick = () => {
        if (currentHoursTimeView === 'week') return;
        currentHoursTimeView = 'week';
        btnWeek.style.background = '#10b981';
        btnWeek.style.color = '#ffffff';
        btnMonth.style.background = 'transparent';
        btnMonth.style.color = 'var(--text-muted)';
        if (hoursOverTimeChartInstance) {
          const wData = hoursSummary.weeksData;
          const mVal = Math.max(...wData.map(d => d.hours), 8);
          const cMax = Math.ceil((mVal * 1.25) / 5) * 5;
          hoursOverTimeChartInstance.data.labels = wData.length > 0 ? wData.map(d => d.label) : ['Chưa có'];
          hoursOverTimeChartInstance.data.datasets[0].data = wData.length > 0 ? wData.map(d => d.hours) : [0];
          hoursOverTimeChartInstance.options.scales.y.max = cMax;
          hoursOverTimeChartInstance.options.scales.y.ticks.stepSize = Math.max(1, Math.round(cMax / 5));
          hoursOverTimeChartInstance.update();
        }
      };

      btnMonth.onclick = () => {
        if (currentHoursTimeView === 'month') return;
        currentHoursTimeView = 'month';
        btnMonth.style.background = '#10b981';
        btnMonth.style.color = '#ffffff';
        btnWeek.style.background = 'transparent';
        btnWeek.style.color = 'var(--text-muted)';
        if (hoursOverTimeChartInstance) {
          const mData = hoursSummary.monthsData;
          const mVal = Math.max(...mData.map(d => d.hours), 8);
          const cMax = Math.ceil((mVal * 1.25) / 5) * 5;
          hoursOverTimeChartInstance.data.labels = mData.length > 0 ? mData.map(d => d.label) : ['Chưa có'];
          hoursOverTimeChartInstance.data.datasets[0].data = mData.length > 0 ? mData.map(d => d.hours) : [0];
          hoursOverTimeChartInstance.options.scales.y.max = cMax;
          hoursOverTimeChartInstance.options.scales.y.ticks.stepSize = Math.max(1, Math.round(cMax / 5));
          hoursOverTimeChartInstance.update();
        }
      };
    }
  }

  // 2. Biểu đồ Hours by phase
  const canvasPhase = document.getElementById('chart-hours-by-phase');
  if (canvasPhase) {
    const ctx = canvasPhase.getContext('2d');
    const phases = hoursSummary.phasesData.length > 0 ? hoursSummary.phasesData : [{ name: 'Chưa có', hours: 0 }];
    const maxVal = Math.max(...phases.map(p => p.hours), 8);
    const chartMax = Math.ceil((maxVal * 1.25) / 10) * 10;

    hoursByPhaseChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: phases.map(p => p.name),
        datasets: [{
          data: phases.map(p => p.hours),
          backgroundColor: '#6366f1',
          hoverBackgroundColor: '#4f46e5',
          borderRadius: 4,
          barThickness: 20
        }]
      },
      plugins: [valueLabelPlugin],
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 35, top: 10, bottom: 10 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderWidth: 0,
            callbacks: {
              label: (ctx) => `Giờ: ${ctx.parsed.x}h`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: chartMax,
            ticks: {
              stepSize: Math.max(1, Math.round(chartMax / 5)),
              color: textColor,
              font: { size: 10 }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: textPrimary,
              font: { size: 11, weight: '500' }
            }
          }
        }
      }
    });
  }

  // 3. Biểu đồ Hours by member
  const canvasMember = document.getElementById('chart-hours-by-member');
  if (canvasMember) {
    const ctx = canvasMember.getContext('2d');
    const members = hoursSummary.membersData.length > 0 ? hoursSummary.membersData : [{ name: 'Chưa có', hours: 0 }];
    const maxVal = Math.max(...members.map(m => m.hours), 8);
    const chartMax = Math.ceil((maxVal * 1.25) / 10) * 10;

    hoursByMemberChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: members.map(m => m.name),
        datasets: [{
          data: members.map(m => m.hours),
          backgroundColor: '#0284c7',
          hoverBackgroundColor: '#0369a1',
          borderRadius: 4,
          barThickness: 18
        }]
      },
      plugins: [valueLabelPlugin],
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 35, top: 10, bottom: 10 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderWidth: 0,
            callbacks: {
              label: (ctx) => `Giờ: ${ctx.parsed.x}h`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: chartMax,
            ticks: {
              stepSize: Math.max(1, Math.round(chartMax / 5)),
              color: textColor,
              font: { size: 10 }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: textPrimary,
              font: { size: 11, weight: '500' }
            }
          }
        }
      }
    });
  }
}

export function destroy() {
  if (hoursOverTimeChartInstance) {
    try { hoursOverTimeChartInstance.destroy(); } catch (e) {}
    hoursOverTimeChartInstance = null;
  }
  if (hoursByPhaseChartInstance) {
    try { hoursByPhaseChartInstance.destroy(); } catch (e) {}
    hoursByPhaseChartInstance = null;
  }
  if (hoursByMemberChartInstance) {
    try { hoursByMemberChartInstance.destroy(); } catch (e) {}
    hoursByMemberChartInstance = null;
  }
}
