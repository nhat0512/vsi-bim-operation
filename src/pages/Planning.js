import { getState, setState, deleteTimesheet, updateProject, saveLocalSnapshot } from '../state.js';
import { formatDisplayName } from '../utils/formatters.js';

// Module-level persistent UI states
let currentOffset = 0;
let currentViewMode = 'detailed'; // 'detailed' | 'heatmap'
let filterSearch = '';
let filterMemberId = '';
let filterProjectId = '';
let filterOnlyActive = false;
let currentDisplayLevel = 'level-2'; // 'level-1' | 'level-2' | 'level-3'
let currentWorkloadFilter = 'all'; // 'all' | 'overload' | 'underload' | 'balanced' | 'has_hours'
let isInitializedLevel = false;
let collapsedMembers = new Set();
let collapsedProjects = new Set();

// Helper chuẩn hóa so khớp người dùng trong Timesheet
export function matchUserTs(t, userId, personnel = []) {
  if (!t) return false;
  if (t.userId === userId) return true;
  const person = (personnel || []).find(p => p.id === userId);
  if (!person) return false;
  const pName = (person.name || '').toLowerCase();
  const pEmail = (person.email || '').toLowerCase();
  const tEmail = (t.email || '').toLowerCase();
  const tName = (t.userName || '').toLowerCase();
  if (tEmail && (tEmail === pEmail || (person.secondaryEmails || []).some(e => e.toLowerCase() === tEmail))) return true;
  if (tName && pName && (tName.includes(pName) || pName.includes(tName))) return true;
  if (pName.includes('thiện') && (tName.includes('thiện') || tEmail.includes('thienthan') || t.userId === 'u_thien')) return true;
  if (pName.includes('tài') && (tName.includes('tài') || tEmail.includes('tainguyen') || t.userId === 'u_tai')) return true;
  if (pName.includes('thuận') && (tName.includes('thuận') || tEmail.includes('minhthuan') || t.userId === 'u_thuan')) return true;
  if (pName.includes('an') && (tName.includes('an') || tEmail.includes('an.nguyen') || t.userId === 'u_an')) return true;
  if (pName.includes('nhật') && (tName.includes('nhật') || tEmail.includes('nhatte') || t.userId === 'u_nhat' || t.userId === 'u_admin')) return true;
  return false;
}

// Helper chuẩn hóa so khớp công việc (Task / RFI) trong Timesheet
export function matchTaskTs(t, userId, taskId, projId, projects = [], personnel = []) {
  if (!matchUserTs(t, userId, personnel)) return false;
  if (projId && t.projectId && t.projectId !== projId) return false;
  if (t.taskId === taskId) return true;
  const proj = (projects || []).find(p => p.id === (projId || t.projectId));
  if (proj && proj.tasks) {
    if (typeof taskId === 'string' && taskId.startsWith('t_')) {
      const idx = parseInt(taskId.replace('t_', ''), 10);
      if (!isNaN(idx) && proj.tasks[idx] && proj.tasks[idx].id === t.taskId) return true;
    }
    if (typeof t.taskId === 'string' && t.taskId.startsWith('t_')) {
      const idx = parseInt(t.taskId.replace('t_', ''), 10);
      if (!isNaN(idx) && proj.tasks[idx] && proj.tasks[idx].id === taskId) return true;
    }
    const targetTask = proj.tasks.find(x => x.id === taskId);
    if (targetTask && (t.taskName === targetTask.name || (t.comment && t.comment.includes(targetTask.name)))) {
      return true;
    }
  }
  return false;
}

// Helper lấy bản ghi kế hoạch hiện có (kết hợp cả timesheets và dailyHours_planned trên task)
export function getTsRecord(userId, taskId, dateStr, projId, timesheets = [], projects = [], personnel = []) {
  const found = timesheets.find(t => 
    matchTaskTs(t, userId, taskId, projId, projects, personnel) && 
    (t.dateString === dateStr || t.date === dateStr) && 
    !t.isActual
  );
  if (found) return found;

  // Fallback: Tìm từ dailyHours_planned của task trong project nếu chưa có timesheet độc lập
  const proj = (projects || []).find(p => p.id === projId);
  if (proj && proj.tasks) {
    const tsk = proj.tasks.find(x => x.id === taskId) || (taskId.startsWith('t_') ? proj.tasks[parseInt(taskId.replace('t_', ''), 10)] : null);
    if (tsk && tsk.dailyHours_planned && tsk.dailyHours_planned[dateStr] !== undefined) {
      const h = Number(tsk.dailyHours_planned[dateStr]) || 0;
      if (h > 0) {
        return {
          id: `syn-plan-${tsk.id || taskId}-${dateStr}`,
          userId: userId,
          projectId: proj.id,
          projectName: proj.name,
          taskId: tsk.id || taskId,
          taskName: tsk.name,
          dateString: dateStr,
          date: dateStr,
          hours: h,
          isActual: false,
          isOT: false,
          comment: ''
        };
      }
    }
  }
  return null;
}

function getPlanningData(offset = 0) {
  const data = [];
  const curr = new Date();
  
  const day = curr.getDay();
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));
  monday.setDate(monday.getDate() + (offset * 14));
  
  for (let w = 0; w < 2; w++) {
    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() + (w * 7));
    
    const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    const weekString = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    
    const days = [];
    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 0; i < 7; i++) {
      const curDate = new Date(weekStart);
      curDate.setDate(curDate.getDate() + i);
      const dateString = `${curDate.getFullYear()}-${(curDate.getMonth() + 1).toString().padStart(2, '0')}-${curDate.getDate().toString().padStart(2, '0')}`;
      const dateLabel = `${curDate.getDate().toString().padStart(2, '0')}/${(curDate.getMonth() + 1).toString().padStart(2, '0')}`;
      days.push({ name: dayNames[i], dateString, dateLabel });
    }
    data.push({ weekNo, weekString, days });
  }
  return data;
}

export function render() {
  const state = getState();
  const planData = getPlanningData(currentOffset);
  const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(state.currentUserRole || state.currentUser?.role);
  
  let targetPersonnel = [];
  if (isManager) {
    targetPersonnel = state.personnel || [];
  } else if (state.currentUserAuth) {
    const me = (state.personnel || []).find(p => p.email === state.currentUserAuth.email);
    if (me) targetPersonnel = [me];
    else targetPersonnel = state.personnel || [];
  } else {
    targetPersonnel = state.personnel || [];
  }

  const timesheets = state.timesheets || [];
  const periodDates = [];
  planData.forEach(w => w.days.forEach(d => periodDates.push(d.dateString)));

  // KPI calculations
  const periodTimesheets = timesheets.filter(t => periodDates.includes(t.dateString || t.date) && !t.isActual);
  const totalPeriodHours = periodTimesheets.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const activeUserIds = new Set(periodTimesheets.filter(t => Number(t.hours) > 0).map(t => t.userId));
  const activeMembersCount = activeUserIds.size;
  const activeProjectIds = new Set(periodTimesheets.filter(t => Number(t.hours) > 0).map(t => t.projectId));
  const activeProjectsCount = activeProjectIds.size;
  const otRecords = periodTimesheets.filter(t => t.isOT && Number(t.hours) > 0);
  const totalOtHours = otRecords.reduce((s, t) => s + Number(t.hours), 0);
  const standardHours = targetPersonnel.length * 10 * 8; // 10 work days * 8h
  const teamCapacityPct = standardHours > 0 ? Math.round((totalPeriodHours / standardHours) * 100) : 0;

  const getRecord = (userId, taskId, dateStr, projId) => {
    return getTsRecord(userId, taskId, dateStr, projId, timesheets, state.projects, state.personnel);
  };

  const getActualHours = (userId, taskId, dateStr, projId) => {
    let act = timesheets.filter(t => matchTaskTs(t, userId, taskId, projId, state.projects, state.personnel) && (t.dateString === dateStr || t.date === dateStr) && t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    if (act === 0) {
      const proj = (state.projects || []).find(p => p.id === projId);
      if (proj && proj.tasks) {
        const tsk = proj.tasks.find(x => x.id === taskId) || (taskId.startsWith('t_') ? proj.tasks[parseInt(taskId.replace('t_', ''), 10)] : null);
        if (tsk && tsk.dailyHours_actual && tsk.dailyHours_actual[dateStr] !== undefined) {
          act = Number(tsk.dailyHours_actual[dateStr]) || 0;
        }
      }
    }
    return act;
  };

  const getUserDayTotal = (userId, dateStr) => {
    return timesheets.filter(t => matchUserTs(t, userId, state.personnel) && (t.dateString === dateStr || t.date === dateStr) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getUserWeekTotal = (userId, weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => matchUserTs(t, userId, state.personnel) && weekDates.includes(t.dateString || t.date) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getProjectDayTotal = (userId, projectId, dateStr) => {
    return timesheets.filter(t => matchUserTs(t, userId) && t.projectId === projectId && t.dateString === dateStr && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getProjectWeekTotal = (userId, projectId, weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => matchUserTs(t, userId) && t.projectId === projectId && weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTaskWeekTotal = (userId, taskId, weekData, projId) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => matchTaskTs(t, userId, taskId, projId) && weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTeamDayTotal = (dateStr) => {
    return timesheets.filter(t => t.dateString === dateStr && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTeamWeekTotal = (weekData) => {
    const weekDates = weekData.days.map(d => d.dateString);
    return timesheets.filter(t => weekDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  const getTeamTotal = () => {
    return timesheets.filter(t => periodDates.includes(t.dateString) && !t.isActual)
      .reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
  };

  // Build raw hierarchy
  const rawHierarchy = targetPersonnel.map(person => {
    const userProjects = [];
    (state.projects || []).forEach(proj => {
      const userTasks = (proj.tasks || []).filter(t => {
        const a = (t.assignee || '').toLowerCase();
        const p = (person.name || '').toLowerCase();
        return a === p || (p.includes('thiện') && a.includes('thiện')) || (p.includes('tài') && a.includes('tài'));
      });
      const userRfis = (proj.rfis || []).filter(r => r.assignee === person.name);
      const isMember = (proj.team || []).some(m => m.name === person.name) || proj.teamLead === person.name;
      const loggedTaskIds = [...new Set((state.timesheets || []).filter(ts => matchUserTs(ts, person.id) && ts.projectId === proj.id).map(ts => ts.taskId))];
      
      if (userTasks.length > 0 || userRfis.length > 0 || loggedTaskIds.length > 0 || isMember) {
        userProjects.push({ project: proj, tasks: userTasks, rfis: userRfis, loggedTaskIds });
      }
    });
    return { person, projects: userProjects };
  }).filter(h => h.projects.length > 0 || isManager);

  // Apply Filters
  let filteredHierarchy = rawHierarchy;
  if (filterMemberId) {
    filteredHierarchy = filteredHierarchy.filter(h => h.person.id === filterMemberId);
  }
  if (filterProjectId) {
    filteredHierarchy = filteredHierarchy.map(h => ({
      ...h,
      projects: h.projects.filter(p => p.project.id === filterProjectId)
    })).filter(h => h.projects.length > 0);
  }
  if (filterSearch) {
    const q = filterSearch.toLowerCase().trim();
    filteredHierarchy = filteredHierarchy.map(h => {
      const matchPerson = (h.person.name || '').toLowerCase().includes(q);
      if (matchPerson) return h;
      
      const matchedProjects = h.projects.map(pObj => {
        const matchProj = (pObj.project.name || '').toLowerCase().includes(q) || (pObj.project.code || '').toLowerCase().includes(q);
        if (matchProj) return pObj;
        
        const matchedTasks = pObj.tasks.filter(t => (t.name || '').toLowerCase().includes(q));
        const matchedRfis = (pObj.rfis || []).filter(r => (r.title || '').toLowerCase().includes(q));
        if (matchedTasks.length > 0 || matchedRfis.length > 0) {
          return { ...pObj, tasks: matchedTasks, rfis: matchedRfis };
        }
        return null;
      }).filter(Boolean);

      return matchedProjects.length > 0 ? { ...h, projects: matchedProjects } : null;
    }).filter(Boolean);
  }
  if (filterOnlyActive) {
    filteredHierarchy = filteredHierarchy.map(h => {
      const activeProjects = h.projects.map(pObj => {
        const hasHours = timesheets.some(t => t.userId === h.person.id && t.projectId === pObj.project.id && periodDates.includes(t.dateString) && Number(t.hours) > 0);
        return hasHours ? pObj : null;
      }).filter(Boolean);
      return activeProjects.length > 0 ? { ...h, projects: activeProjects } : null;
    }).filter(Boolean);
  }

  // Tự động gập gọn cấp 2 (Dự án) khi tải lần đầu để màn hình không bị ngợp bởi hàng chục task trống
  if (!isInitializedLevel) {
    isInitializedLevel = true;
    if (currentDisplayLevel === 'level-2') {
      collapsedMembers.clear();
      collapsedProjects.clear();
      rawHierarchy.forEach(h => {
        h.projects.forEach(pObj => {
          collapsedProjects.add(`${h.person.id}_${pObj.project.id}`);
        });
      });
    }
  }

  // Thống kê tải làm việc (Workload) cho từng nhân sự trong 2 tuần
  const memberWorkloadMap = new Map();
  let countOverload = 0;
  let countUnderload = 0;
  let countBalanced = 0;
  let countHasHours = 0;

  rawHierarchy.forEach(h => {
    const pId = h.person.id;
    const w1 = getUserWeekTotal(pId, planData[0]);
    const w2 = getUserWeekTotal(pId, planData[1]);
    const total = w1 + w2;
    const isOver = w1 > 40 || w2 > 40;
    const isBalanced = (w1 === 40 || w2 === 40) && !isOver;
    const isUnder = (w1 > 0 && w1 < 40) || (w2 > 0 && w2 < 40);
    const hasHours = total > 0;

    if (isOver) countOverload++;
    if (isUnder) countUnderload++;
    if (isBalanced) countBalanced++;
    if (hasHours) countHasHours++;

    memberWorkloadMap.set(pId, { w1, w2, total, isOver, isUnder, isBalanced, hasHours });
  });

  // Áp dụng bộ lọc tải làm việc (Workload Filter)
  if (currentWorkloadFilter === 'overload') {
    filteredHierarchy = filteredHierarchy.filter(h => memberWorkloadMap.get(h.person.id)?.isOver);
  } else if (currentWorkloadFilter === 'balanced') {
    filteredHierarchy = filteredHierarchy.filter(h => memberWorkloadMap.get(h.person.id)?.isBalanced);
  } else if (currentWorkloadFilter === 'underload') {
    filteredHierarchy = filteredHierarchy.filter(h => memberWorkloadMap.get(h.person.id)?.isUnder);
  } else if (currentWorkloadFilter === 'has_hours') {
    filteredHierarchy = filteredHierarchy.filter(h => memberWorkloadMap.get(h.person.id)?.hasHours);
  }

  // Deduplicate and resolve tasks for each project
  const resolveProjectItems = (personId, pObj) => {
    const itemsMap = new Map();
    const normStr = s => (s || '').toLowerCase().replace(/[\s\-_()]/g, '');

    // 1. Assigned tasks
    (pObj.tasks || []).forEach(t => {
      const trueIdx = pObj.project.tasks.indexOf(t);
      const effectiveId = t.id || `t_${trueIdx}`;
      let displayName = t.name;
      if (t.segmentIdx !== undefined && t.segmentIdx !== null && pObj.project.segments?.[t.segmentIdx]) {
        displayName += ` - ${pObj.project.segments[t.segmentIdx].name}`;
        if (t.subSegmentIdx !== undefined && t.subSegmentIdx !== null && pObj.project.segments[t.segmentIdx].subSegments?.[t.subSegmentIdx]) {
          displayName += ` / ${pObj.project.segments[t.segmentIdx].subSegments[t.subSegmentIdx].name}`;
        }
      }
      const normKey = normStr(t.name) + '_' + (t.segmentIdx ?? '') + '_' + (t.subSegmentIdx ?? '');
      if (!itemsMap.has(effectiveId) && !Array.from(itemsMap.values()).some(x => x.normKey === normKey)) {
        itemsMap.set(effectiveId, { id: effectiveId, name: displayName, type: 'task', normKey, taskObj: t });
      }
    });

    // 2. Assigned RFIs
    (pObj.rfis || []).forEach(r => {
      const trueIdx = pObj.project.rfis.indexOf(r);
      const effectiveId = r.id || `rfi_${trueIdx}`;
      if (!itemsMap.has(effectiveId)) {
        itemsMap.set(effectiveId, { id: effectiveId, name: r.title, type: 'rfi' });
      }
    });

    // 3. Logged timesheets tasks
    (pObj.loggedTaskIds || []).forEach(tid => {
      if (!tid) return;
      if (itemsMap.has(tid)) return;

      let matchedTask = (pObj.project.tasks || []).find(x => x.id === tid);
      if (!matchedTask && tid.startsWith('t_')) {
        const idx = parseInt(tid.replace('t_', ''), 10);
        if (!isNaN(idx)) matchedTask = pObj.project.tasks?.[idx];
      }
      if (matchedTask) {
        const normKey = normStr(matchedTask.name) + '_' + (matchedTask.segmentIdx ?? '') + '_' + (matchedTask.subSegmentIdx ?? '');
        if (Array.from(itemsMap.values()).some(x => x.normKey === normKey || x.id === matchedTask.id)) {
          return;
        }
        let displayName = matchedTask.name;
        if (matchedTask.segmentIdx !== undefined && matchedTask.segmentIdx !== null && pObj.project.segments?.[matchedTask.segmentIdx]) {
          displayName += ` - ${pObj.project.segments[matchedTask.segmentIdx].name}`;
        }
        itemsMap.set(tid, { id: tid, name: displayName, type: 'task', normKey, taskObj: matchedTask });
        return;
      }

      if (tid === 't_general' || tid === 'general') {
        const hasGeneralHours = timesheets.some(t => t.userId === personId && t.projectId === pObj.project.id && (t.taskId === 't_general' || t.taskId === 'general') && Number(t.hours) > 0);
        if (hasGeneralHours || itemsMap.size === 0) {
          itemsMap.set('t_general', { id: 't_general', name: 'Công việc chung (Chưa phân Task)', type: 'general' });
        }
        return;
      }

      if (tid.startsWith('rfi_')) {
        const idx = parseInt(tid.replace('rfi_', ''), 10);
        const rfi = pObj.project.rfis?.[idx] || (pObj.project.rfis || []).find(r => r.id === tid);
        if (rfi && !itemsMap.has(rfi.id)) {
          itemsMap.set(tid, { id: tid, name: rfi.title, type: 'rfi' });
        }
      }
    });

    if (itemsMap.size === 0) {
      itemsMap.set('t_general', { id: 't_general', name: 'Công việc chung (Chưa phân Task)', type: 'general' });
    }

    let itemsToRender = Array.from(itemsMap.values());
    if (filterOnlyActive) {
      itemsToRender = itemsToRender.filter(item => {
        return timesheets.some(t => matchTaskTs(t, personId, item.id, pObj.project.id) && periodDates.includes(t.dateString) && Number(t.hours) > 0);
      });
    }
    return itemsToRender;
  };

  return `
    <div class="animate-fade-in-up" style="display: flex; flex-direction: column; gap: 14px; min-height: calc(100vh - 90px);">
      
      <!-- Top Title & Controls Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h1 class="section-title" style="margin: 0; font-size: 1.4rem;">📅 General Planning</h1>
            <span class="badge blue" style="font-size: 0.75rem;">2 Tuần (${planData[0]?.days[0]?.dateLabel} — ${planData[1]?.days[6]?.dateLabel})</span>
          </div>
          <div class="text-xs text-muted" style="margin-top: 2px;">
            Quản lý lịch biểu, phân bổ thời gian và tải làm việc hàng ngày của toàn bộ đội ngũ BIM
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <!-- View Switcher -->
          <div style="display: inline-flex; background: var(--bg-tertiary); border-radius: 8px; padding: 2px; border: 1px solid var(--border-subtle);">
            <button id="view-mode-detailed" class="btn btn-sm ${currentViewMode === 'detailed' ? 'btn-primary' : 'btn-ghost'}" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px;">
              📋 Ma trận Chi tiết
            </button>
            <button id="view-mode-heatmap" class="btn btn-sm ${currentViewMode === 'heatmap' ? 'btn-primary' : 'btn-ghost'}" style="padding: 4px 10px; font-size: 0.8rem; border-radius: 6px;">
              📊 Heatmap Tải làm việc
            </button>
          </div>

          <div style="width: 1px; height: 20px; background: var(--border-subtle); margin: 0 4px;"></div>

          <!-- Week Navigation -->
          <button class="btn btn-outline btn-sm" id="btn-prev-week" title="Lùi về 2 tuần trước">◀ 2 tuần trước</button>
          <button class="btn btn-outline btn-sm ${currentOffset === 0 ? 'btn-primary' : ''}" id="btn-today-week" title="Trở về 2 tuần hiện tại">Hiện tại</button>
          <button class="btn btn-outline btn-sm" id="btn-next-week" title="Tới 2 tuần kế tiếp">2 tuần sau ▶</button>

          <button class="btn btn-outline btn-sm" id="btn-export-csv" title="Xuất toàn bộ bảng ra file CSV">
            📥 Xuất CSV
          </button>

          <button class="btn btn-primary btn-sm" id="btn-quick-alloc-trigger" title="Mở bảng phân bổ nhanh nhiều ngày/tuần cùng lúc" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
            ⚡ Phân bổ nhanh theo tuần
          </button>
        </div>
      </div>

      <!-- Executive KPI Cards Banner -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px;">
        <div class="card p-sm" style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(59, 130, 246, 0.12); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            ⏱️
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">TỔNG GIỜ (2 TUẦN)</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${totalPeriodHours}h</div>
            <div class="text-xs text-muted">Đạt <strong>${teamCapacityPct}%</strong> công suất</div>
          </div>
        </div>

        <div class="card p-sm" style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            👥
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">NHÂN SỰ CÓ TẢI</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #10b981;">${activeMembersCount} / ${targetPersonnel.length} người</div>
            <div class="text-xs text-muted">${targetPersonnel.length - activeMembersCount} người đang trống lịch</div>
          </div>
        </div>

        <div class="card p-sm" style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(245, 158, 11, 0.12); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            📁
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">DỰ ÁN ĐANG CHẠY</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${activeProjectsCount} dự án</div>
            <div class="text-xs text-muted">Có giờ phát sinh kỳ này</div>
          </div>
        </div>

        <div class="card p-sm" style="display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.12); color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
            ⚠️
          </div>
          <div>
            <div class="text-xs text-muted font-semibold">LÀM THÊM GIỜ (OT)</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: ${totalOtHours > 0 ? '#ef4444' : 'var(--text-muted)'};">${totalOtHours}h</div>
            <div class="text-xs text-muted">${otRecords.length} ca ghi nhận ngoài giờ</div>
          </div>
        </div>
      </div>

      <!-- Quick Filter & Level Toolbar (Khắc phục khó quản lý) -->
      <div class="card p-sm" style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 10px; display: flex; flex-direction: column; gap: 8px;">
        <!-- Row 1: Search & Entity Selectors -->
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px; position: relative;">
            <input type="text" id="filter-search-input" class="form-input" placeholder="🔍 Tìm kiếm nhân sự, dự án, công việc..." value="${filterSearch}" style="width: 100%; padding: 6px 10px 6px 32px; font-size: 0.82rem;">
            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-muted);">🔍</span>
          </div>

          <div style="min-width: 170px;">
            <select id="filter-member-select" class="form-select" style="font-size: 0.82rem; padding: 5px 8px; width: 100%;">
              <option value="">👤 Tất cả nhân sự (${targetPersonnel.length})</option>
              ${targetPersonnel.map(p => `<option value="${p.id}" ${filterMemberId === p.id ? 'selected' : ''}>${formatDisplayName(p.name)}</option>`).join('')}
            </select>
          </div>

          <div style="min-width: 170px;">
            <select id="filter-project-select" class="form-select" style="font-size: 0.82rem; padding: 5px 8px; width: 100%;">
              <option value="">📁 Tất cả dự án (${(state.projects || []).length})</option>
              ${(state.projects || []).map(p => `<option value="${p.id}" ${filterProjectId === p.id ? 'selected' : ''}>${p.code} - ${p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name}</option>`).join('')}
            </select>
          </div>

          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 500; user-select: none; margin: 0 4px;">
            <input type="checkbox" id="filter-only-active" ${filterOnlyActive ? 'checked' : ''} style="cursor: pointer;">
            <span>⚡ Chỉ hiện dòng có giờ</span>
          </label>
        </div>

        <!-- Row 2: Level View Modes + Workload Filter Pills -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
          <!-- Level Selector Buttons -->
          <div style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-right: 4px;">Cấp độ xem:</span>
            <div style="display: inline-flex; background: var(--bg-tertiary); border-radius: 8px; padding: 2px; border: 1px solid var(--border-subtle);">
              <button id="btn-level-1" class="btn btn-sm ${currentDisplayLevel === 'level-1' ? 'btn-primary' : 'btn-ghost'}" title="Chỉ hiện dòng nhân sự (Thu gọn hết dự án & task)" style="padding: 3px 8px; font-size: 0.78rem; border-radius: 6px;">
                👤 Cấp 1: Nhân sự
              </button>
              <button id="btn-level-2" class="btn btn-sm ${currentDisplayLevel === 'level-2' ? 'btn-primary' : 'btn-ghost'}" title="Hiện Nhân sự và Dự án (Gọn gàng nhất, gập sẵn task)" style="padding: 3px 8px; font-size: 0.78rem; border-radius: 6px;">
                📁 Cấp 2: Dự án
              </button>
              <button id="btn-level-3" class="btn btn-sm ${currentDisplayLevel === 'level-3' ? 'btn-primary' : 'btn-ghost'}" title="Mở bung toàn bộ chi tiết từng Task" style="padding: 3px 8px; font-size: 0.78rem; border-radius: 6px;">
                📝 Cấp 3: Chi tiết Task
              </button>
            </div>
          </div>

          <!-- Workload Filter Pills -->
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">Lọc tải:</span>
            <button class="btn-workload-filter-pill ${currentWorkloadFilter === 'all' ? 'active' : ''}" data-filter="all">
              Tất cả (${targetPersonnel.length})
            </button>
            <button class="btn-workload-filter-pill ${currentWorkloadFilter === 'overload' ? 'active' : ''}" data-filter="overload" style="color: ${currentWorkloadFilter === 'overload' ? '#fff' : '#ef4444'};">
              ⚠️ Quá tải >40h (${countOverload})
            </button>
            <button class="btn-workload-filter-pill ${currentWorkloadFilter === 'balanced' ? 'active' : ''}" data-filter="balanced" style="color: ${currentWorkloadFilter === 'balanced' ? '#fff' : '#10b981'};">
              ✅ Chuẩn 40h (${countBalanced})
            </button>
            <button class="btn-workload-filter-pill ${currentWorkloadFilter === 'underload' ? 'active' : ''}" data-filter="underload" style="color: ${currentWorkloadFilter === 'underload' ? '#fff' : '#f59e0b'};">
              ⏳ Thiếu tải <40h (${countUnderload})
            </button>
            <button class="btn-workload-filter-pill ${currentWorkloadFilter === 'has_hours' ? 'active' : ''}" data-filter="has_hours">
              ⚡ Có giờ làm (${countHasHours})
            </button>
          </div>

          <!-- Expand / Collapse All -->
          <div style="display: flex; gap: 4px; margin-left: auto;">
            <button class="btn btn-ghost btn-sm" id="btn-collapse-all" title="Thu gọn toàn bộ danh sách" style="font-size: 0.75rem; padding: 3px 8px;">
              📁 Thu gọn
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-expand-all" title="Mở rộng chi tiết" style="font-size: 0.75rem; padding: 3px 8px;">
              📂 Mở rộng
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT: Heatmap View OR Detailed View -->
      ${currentViewMode === 'heatmap' ? `
        <!-- CHẾ ĐỘ 1: WORKLOAD HEATMAP (TỔNG QUAN SIÊU NHANH) -->
        <div class="card p-0" style="flex: 1; overflow: auto; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <table style="width: 100%; border-collapse: collapse; min-width: 1200px;" class="planning-table">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); position: sticky; left: 0; background: var(--bg-secondary); z-index: 10; width: 260px;" rowspan="2">
                  Nhân sự (${filteredHierarchy.length})
                </th>
                ${planData.map(w => `
                  <th colspan="8" style="text-align: center; padding: 8px 4px; border-bottom: 1px solid var(--border-subtle); border-left: 2px solid var(--border-subtle); font-weight: 700; color: var(--text-primary); background: var(--bg-tertiary); font-size: 0.85rem;">
                    Tuần ${w.weekNo} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${w.days[0].dateLabel} — ${w.days[6].dateLabel})</span>
                  </th>
                `).join('')}
                <th style="text-align: center; padding: 10px; border-bottom: 1px solid var(--border-subtle); border-left: 2px solid var(--border-subtle); font-weight: bold; width: 85px;" rowspan="2">
                  Tổng 2 tuần
                </th>
              </tr>
              <tr>
                ${planData.map(w => {
                  let html = '';
                  w.days.forEach(d => {
                    const isWeekend = d.name === 'T7' || d.name === 'CN';
                    html += `<th style="text-align: center; padding: 6px 2px; border-bottom: 1px solid var(--border-subtle); font-size: 0.72rem; font-weight: normal; color: ${isWeekend ? 'var(--text-danger)' : 'var(--text-muted)'}; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; background: ${isWeekend ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};">
                      <div style="font-weight: bold;">${d.name}</div>
                      <div>${d.dateLabel}</div>
                    </th>`;
                  });
                  html += `<th style="text-align: center; padding: 6px 2px; border-bottom: 1px solid var(--border-subtle); font-size: 0.75rem; font-weight: bold; color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); width: 55px;">Tổng T${w.weekNo}</th>`;
                  return html;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredHierarchy.map(h => {
                const personId = h.person.id;
                const grandTotal = timesheets.filter(t => t.userId === personId && periodDates.includes(t.dateString) && !t.isActual).reduce((s, t) => s + (Number(t.hours) || 0), 0);
                const avatar = (h.person.avatar && h.person.avatar.length > 5) ? h.person.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(h.person.name))}&background=3b82f6&color=fff&rounded=true`;

                return `
                  <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.15s;">
                    <td style="padding: 10px 16px; position: sticky; left: 0; background: var(--bg-card); z-index: 9; border-right: 1px solid var(--border-subtle);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%;">
                        <div>
                          <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${formatDisplayName(h.person.name)}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">${h.person.role || 'BIM Member'} · ${h.projects.length} dự án</div>
                        </div>
                      </div>
                    </td>
                    ${planData.map(w => {
                      let html = '';
                      w.days.forEach(d => {
                        const dayHours = getUserDayTotal(personId, d.dateString);
                        let cellContent = `<span style="color: var(--text-muted); opacity: 0.3;">—</span>`;
                        let cellBg = 'transparent';

                        if (dayHours === 8) {
                          cellContent = `<span style="font-weight: 800; color: #059669; font-size: 0.75rem;">8h</span>`;
                          cellBg = 'rgba(16, 185, 129, 0.15)';
                        } else if (dayHours > 8) {
                          cellContent = `<span style="font-weight: 800; color: #dc2626; font-size: 0.75rem;" title="${dayHours}h (Làm thêm giờ)">${dayHours}h ⚠️</span>`;
                          cellBg = 'rgba(239, 68, 68, 0.18)';
                        } else if (dayHours > 0) {
                          cellContent = `<span style="font-weight: 700; color: #2563eb; font-size: 0.75rem;">${dayHours}h</span>`;
                          cellBg = 'rgba(59, 130, 246, 0.1)';
                        }

                        html += `
                          <td style="text-align: center; padding: 6px 2px; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; background: ${cellBg}; transition: all 0.15s;" title="${formatDisplayName(h.person.name)} - ${d.name} ${d.dateLabel}: ${dayHours}h">
                            ${cellContent}
                          </td>
                        `;
                      });

                      const wTotal = getUserWeekTotal(personId, w);
                      const isOverWeek = wTotal > 40;
                      html += `
                        <td style="text-align: center; font-size: 0.82rem; font-weight: 800; color: ${isOverWeek ? '#ef4444' : wTotal > 0 ? '#10b981' : 'var(--text-muted)'}; background: rgba(59, 130, 246, 0.05);">
                          ${wTotal > 0 ? wTotal + 'h' : '—'}${isOverWeek ? ' ⚠️' : ''}
                        </td>
                      `;
                      return html;
                    }).join('')}
                    <td style="text-align: center; font-weight: 800; font-size: 0.9rem; color: var(--text-primary); border-left: 2px solid var(--border-subtle); background: var(--bg-tertiary);">
                      ${grandTotal > 0 ? grandTotal + 'h' : '—'}
                    </td>
                  </tr>
                `;
              }).join('')}

              <!-- Team Heatmap Total Row -->
              <tr style="background: var(--bg-tertiary); font-weight: 700; border-top: 2px solid var(--border-subtle);">
                <td style="padding: 10px 16px; position: sticky; left: 0; background: var(--bg-tertiary); z-index: 9; border-right: 1px solid var(--border-subtle);">
                  ⚡ TỔNG CỘNG TOÀN ĐỘI
                </td>
                ${planData.map(w => {
                  let html = '';
                  w.days.forEach(d => {
                    const dayTeamTotal = getTeamDayTotal(d.dateString);
                    html += `
                      <td style="text-align: center; font-size: 0.78rem; font-weight: 700; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; color: ${dayTeamTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)'};">
                        ${dayTeamTotal > 0 ? dayTeamTotal + 'h' : '—'}
                      </td>
                    `;
                  });
                  const weekTeamTotal = getTeamWeekTotal(w);
                  html += `
                    <td style="text-align: center; font-size: 0.85rem; font-weight: 800; color: var(--accent-primary); background: rgba(59, 130, 246, 0.1);">
                      ${weekTeamTotal}h
                    </td>
                  `;
                  return html;
                }).join('')}
                <td style="text-align: center; font-weight: 800; font-size: 0.95rem; color: var(--accent-warning); border-left: 2px solid var(--border-subtle); background: var(--bg-tertiary);">
                  ${getTeamTotal()}h
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : `
        <!-- CHẾ ĐỘ 2: MA TRẬN CHI TIẾT (ACCORDION THU GỌN / MỞ RỘNG) -->
        <div class="card p-0 planning-table-container" style="flex: 1; overflow: auto; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px;">
          <table style="width: 100%; border-collapse: collapse; min-width: 1350px;" class="planning-table">
            <thead>
              <tr>
                <th style="text-align: left; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); position: sticky; left: 0; background: var(--bg-secondary); z-index: 10; width: 310px;" rowspan="2">
                  Nhân sự / Dự án / Công việc
                </th>
                ${planData.map(w => `
                  <th colspan="8" style="text-align: center; padding: 8px 4px; border-bottom: 1px solid var(--border-subtle); border-left: 2px solid var(--border-subtle); font-weight: 700; color: var(--text-primary); background: var(--bg-tertiary); font-size: 0.85rem;">
                    Tuần ${w.weekNo} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(${w.days[0].dateLabel} — ${w.days[6].dateLabel})</span>
                  </th>
                `).join('')}
                <th style="text-align: center; padding: 10px; border-bottom: 1px solid var(--border-subtle); border-left: 2px solid var(--border-subtle); font-weight: bold; width: 75px;" rowspan="2">
                  Tổng 2 tuần
                </th>
              </tr>
              <tr>
                ${planData.map(w => {
                  let html = '';
                  w.days.forEach(d => {
                    const isWeekend = d.name === 'T7' || d.name === 'CN';
                    html += `<th style="text-align: center; padding: 6px 2px; border-bottom: 1px solid var(--border-subtle); font-size: 0.72rem; font-weight: normal; color: ${isWeekend ? 'var(--text-danger)' : 'var(--text-muted)'}; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; background: ${isWeekend ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};">
                      <div style="font-weight: bold;">${d.name}</div>
                      <div>${d.dateLabel}</div>
                    </th>`;
                  });
                  html += `<th style="text-align: center; padding: 6px 2px; border-bottom: 1px solid var(--border-subtle); font-size: 0.75rem; font-weight: bold; color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); width: 52px;">Tổng</th>`;
                  return html;
                }).join('')}
              </tr>

              <!-- TEAM TOTAL ROW -->
              ${isManager ? `
                <tr style="background: rgba(245, 158, 11, 0.08); border-bottom: 2px solid var(--border-subtle);">
                  <td style="padding: 10px 14px; position: sticky; left: 0; background: var(--bg-tertiary); z-index: 9; font-weight: 700; border-right: 1px solid var(--border-subtle);">
                    ⚡ TEAM TOTAL <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 6px;">(${targetPersonnel.length} nhân sự)</span>
                  </td>
                  ${planData.map(w => {
                    let html = '';
                    w.days.forEach(d => {
                      const dayTeamTotal = getTeamDayTotal(d.dateString);
                      html += `
                        <td style="text-align: center; font-size: 0.75rem; font-weight: 700; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'};">
                          ${dayTeamTotal > 0 ? `${dayTeamTotal}h` : ''}
                        </td>
                      `;
                    });
                    const total = getTeamWeekTotal(w);
                    html += `<td style="text-align: center; padding: 4px; background: rgba(59, 130, 246, 0.08);"><span class="badge" style="background: var(--accent-warning); color: #fff; font-weight: 700; font-size: 0.75rem;">${total}h</span></td>`;
                    return html;
                  }).join('')}
                  <td style="text-align: center; padding: 8px; font-weight: 800; color: var(--accent-warning); border-left: 2px solid var(--border-subtle); background: var(--bg-tertiary); font-size: 0.9rem;">
                    ${getTeamTotal()}h
                  </td>
                </tr>
              ` : ''}
            </thead>
            <tbody>
              ${filteredHierarchy.length === 0 ? `
                <tr>
                  <td colspan="18" style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
                    <div style="font-weight: 600; font-size: 1rem;">Không tìm thấy kết quả phù hợp</div>
                    <div class="text-xs">Vui lòng thử bỏ lọc hoặc thay đổi từ khóa tìm kiếm</div>
                  </td>
                </tr>
              ` : filteredHierarchy.map(h => {
                const personId = h.person.id;
                const isMemberCollapsed = collapsedMembers.has(personId);
                const grandTotal = timesheets.filter(t => t.userId === personId && periodDates.includes(t.dateString) && !t.isActual).reduce((s, t) => s + (Number(t.hours) || 0), 0);
                const avatar = (h.person.avatar && h.person.avatar.length > 5) ? h.person.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(h.person.name))}&background=3b82f6&color=fff&rounded=true`;

                // 1. Person Header Row (CLICK TO COLLAPSE/EXPAND)
                let html = `
                  <tr class="member-header-row" data-person-id="${personId}" style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-tertiary); cursor: pointer; user-select: none;">
                    <td style="padding: 10px 14px; position: sticky; left: 0; background: var(--bg-tertiary); z-index: 9; border-right: 1px solid var(--border-subtle);">
                      <div class="flex items-center gap-sm">
                        <span class="member-collapse-icon" style="font-size: 0.75rem; color: var(--text-muted); width: 14px; display: inline-block;">
                          ${isMemberCollapsed ? '▶' : '▼'}
                        </span>
                        <img src="${avatar}" style="width: 28px; height: 28px; border-radius: 50%;">
                        <div>
                          <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${formatDisplayName(h.person.name)}</div>
                          <div style="font-size: 0.72rem; color: var(--text-muted);">${h.person.role || 'BIM Member'} · ${h.projects.length} dự án</div>
                        </div>
                        <div style="margin-left: auto; display: flex; align-items: center; gap: 4px;">
                          <button class="btn-icon btn-row-quick-alloc" data-uid="${personId}" title="Phân bổ nhanh theo tuần cho ${formatDisplayName(h.person.name)}" style="color: var(--accent-primary); font-size: 0.75rem; padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: 4px; background: var(--bg-card); display: flex; align-items: center; gap: 3px;">
                            ⚡ Phân bổ
                          </button>
                          <button class="btn-icon btn-analytics" data-uid="${personId}" title="Xem biểu đồ phân bổ">📊</button>
                        </div>
                      </div>
                    </td>
                    ${planData.map(w => {
                      let wHtml = '';
                      w.days.forEach(d => {
                        const dayHours = getUserDayTotal(personId, d.dateString);
                        let dayBadge = '<span style="color: var(--text-muted); opacity: 0.25;">—</span>';
                        if (dayHours === 8) {
                          dayBadge = `<span class="badge" style="font-size: 0.72rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 4px; border-radius: 4px;">8h</span>`;
                        } else if (dayHours > 8) {
                          dayBadge = `<span class="badge" style="font-size: 0.72rem; font-weight: 700; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 4px; border-radius: 4px;" title="OT ${dayHours}h">${dayHours}h ⚠️</span>`;
                        } else if (dayHours > 0) {
                          dayBadge = `<span style="font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">${dayHours}h</span>`;
                        }

                        wHtml += `
                          <td style="text-align: center; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; background: ${d.name === 'T7' || d.name === 'CN' ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};">
                            ${dayBadge}
                          </td>
                        `;
                      });

                      const wTotal = getUserWeekTotal(personId, w);
                      const isOverWeek = wTotal > 40;
                      const wCapPct = Math.round((wTotal / 40) * 100);
                      wHtml += `
                        <td style="text-align: center; font-size: 0.82rem; font-weight: 800; color: ${isOverWeek ? '#ef4444' : wTotal > 0 ? '#10b981' : 'var(--text-muted)'}; background: rgba(59, 130, 246, 0.05);">
                          <div>${wTotal > 0 ? wTotal + 'h' : '—'}${isOverWeek ? ' ⚠️' : ''}</div>
                          ${wTotal > 0 ? `<div style="font-size: 0.68rem; font-weight: normal; opacity: 0.85;">(${wCapPct}%)</div>` : ''}
                        </td>
                      `;
                      return wHtml;
                    }).join('')}
                    <td style="text-align: center; font-weight: 800; font-size: 0.88rem; color: var(--text-primary); border-left: 2px solid var(--border-subtle); background: var(--bg-tertiary);">
                      ${grandTotal > 0 ? grandTotal + 'h' : '—'}
                    </td>
                  </tr>
                `;

                // 2. Projects Rows (Nested)
                h.projects.forEach(pObj => {
                  const projKey = `${personId}_${pObj.project.id}`;
                  const isProjCollapsed = collapsedProjects.has(projKey);
                  const projGrandTotal = timesheets.filter(t => t.userId === personId && t.projectId === pObj.project.id && periodDates.includes(t.dateString) && !t.isActual).reduce((s, t) => s + (Number(t.hours) || 0), 0);
                  const itemsToRender = resolveProjectItems(personId, pObj);

                  html += `
                    <tr class="project-header-row member-child-${personId}" data-proj-key="${projKey}" style="${isMemberCollapsed ? 'display: none;' : ''} border-bottom: 1px dashed var(--border-subtle); background: var(--bg-secondary); cursor: pointer; user-select: none;">
                      <td style="padding: 7px 14px 7px 32px; position: sticky; left: 0; background: var(--bg-secondary); z-index: 8; border-right: 1px solid var(--border-subtle);">
                        <div class="flex items-center gap-xs">
                          <span class="project-collapse-icon" style="font-size: 0.72rem; color: var(--text-muted); width: 12px; display: inline-block;">
                            ${isProjCollapsed ? '▶' : '▼'}
                          </span>
                          <span style="font-weight: 600; font-size: 0.82rem; color: var(--text-primary);">
                            ${pObj.project.code} — ${pObj.project.name}
                          </span>
                          <span class="badge" style="font-size: 0.65rem; padding: 1px 5px; margin-left: 4px; background: var(--bg-tertiary); color: var(--text-muted);">
                            ${itemsToRender.length} việc
                          </span>
                          <button class="btn-proj-quick-alloc" data-uid="${personId}" data-pid="${pObj.project.id}" title="Phân bổ nhanh vào dự án này" style="font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--border-subtle); background: var(--bg-card); color: var(--accent-primary); cursor: pointer; margin-left: 4px;">
                            ⚡ Phân bổ
                          </button>
                        </div>
                      </td>
                      ${planData.map(w => {
                        let wHtml = '';
                        w.days.forEach(d => {
                          const pDayHours = getProjectDayTotal(personId, pObj.project.id, d.dateString);
                          wHtml += `
                            <td style="text-align: center; font-size: 0.72rem; color: var(--text-muted); border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'};">
                              ${pDayHours > 0 ? `${pDayHours}h` : ''}
                            </td>
                          `;
                        });
                        const pwTotal = getProjectWeekTotal(personId, pObj.project.id, w);
                        wHtml += `
                          <td style="text-align: center; font-size: 0.75rem; font-weight: 700; color: ${pwTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}; background: rgba(59, 130, 246, 0.03);">
                            ${pwTotal > 0 ? pwTotal + 'h' : '—'}
                          </td>
                        `;
                        return wHtml;
                      }).join('')}
                      <td style="text-align: center; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); border-left: 2px solid var(--border-subtle);">
                        ${projGrandTotal > 0 ? projGrandTotal + 'h' : '—'}
                      </td>
                    </tr>
                  `;

                  // 3. Task Rows
                  itemsToRender.forEach(item => {
                    const taskId = item.id;
                    const taskTotal = timesheets.filter(t => matchTaskTs(t, personId, taskId, pObj.project.id) && periodDates.includes(t.dateString) && !t.isActual).reduce((s, t) => s + (Number(t.hours) || 0), 0);

                    let rowPrefix = '└ ';
                    let rowStyle = 'border-left: 3px solid var(--accent-primary);';
                    if (item.type === 'rfi') {
                      rowPrefix = '❓ [RFI] ';
                      rowStyle = 'border-left: 3px solid var(--accent-warning); color: var(--text-warning);';
                    }

                    html += `
                      <tr class="task-row member-child-${personId} proj-child-${projKey}" style="${(isMemberCollapsed || isProjCollapsed) ? 'display: none;' : ''} border-bottom: 1px solid var(--border-subtle);">
                        <td style="padding: 5px 14px 5px 50px; position: sticky; left: 0; background: var(--bg-card); z-index: 8; ${rowStyle} border-right: 1px solid var(--border-subtle);" title="${item.name}">
                          <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; font-size: 0.78rem; color: var(--text-primary);">
                            ${rowPrefix}${item.name}
                          </div>
                        </td>
                        ${planData.map(w => {
                          let wHtml = '';
                          w.days.forEach(d => {
                            const ts = getRecord(personId, taskId, d.dateString, pObj.project.id);
                            const val = ts ? ts.hours : '';
                            const isOT = ts ? ts.isOT : false;
                            const hasComment = ts && (ts.comment || ts.note);

                            let indicator = '';
                            if (isOT || hasComment) {
                              indicator = `<div class="ts-indicator" data-uid="${personId}" data-pid="${pObj.project.id}" data-tid="${taskId}" data-date="${d.dateString}" style="position: absolute; top: 2px; right: 2px; width: 7px; height: 7px; border-radius: 50%; background: ${isOT ? '#ef4444' : '#f59e0b'}; cursor: pointer; z-index: 2;" title="${isOT ? 'Làm ngoài giờ (OT)' : 'Có ghi chú'}: ${hasComment ? ts.comment || ts.note : 'OT'} - Nhấp để sửa"></div>`;
                            }

                            const hasVal = val !== '' && Number(val) > 0;
                            const inputBg = hasVal ? 'rgba(59, 130, 246, 0.08)' : 'transparent';
                            const inputBorder = hasVal ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent';

                            wHtml += `
                              <td style="text-align: center; padding: 2px; position: relative; border-left: ${d.name === 'T2' ? '2px solid var(--border-subtle)' : 'none'}; background: ${d.name === 'T7' || d.name === 'CN' ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};">
                                ${indicator}
                                <input type="number" class="ts-input"
                                  data-uid="${personId}"
                                  data-pid="${pObj.project.id}"
                                  data-tid="${taskId}"
                                  data-date="${d.dateString}"
                                  value="${val}"
                                  min="0" max="24"
                                  step="0.5"
                                  placeholder="·"
                                  title="Nhập số giờ kế hoạch (0 để xóa, nhấp đúp để thêm ghi chú/OT)"
                                  style="width: 38px; height: 26px; text-align: center; background: ${inputBg}; border: ${inputBorder}; border-radius: 4px; color: ${hasVal ? 'var(--text-primary)' : 'var(--text-muted)'}; font-size: 0.75rem; font-weight: ${hasVal ? '700' : 'normal'}; padding: 0;"
                                >
                                ${(() => {
                                  const actual = getActualHours(personId, taskId, d.dateString, pObj.project.id);
                                  if (actual > 0) {
                                    return `<div style="font-size: 0.65rem; color: #10b981; font-weight: 700; line-height: 1;">${actual}h</div>`;
                                  }
                                  return '';
                                })()}
                              </td>
                            `;
                          });
                          const twTotal = getTaskWeekTotal(personId, taskId, w, pObj.project.id);
                          wHtml += `<td style="text-align: center; font-size: 0.75rem; font-weight: bold; background: rgba(59, 130, 246, 0.04); color: ${twTotal > 0 ? 'var(--accent-primary)' : 'transparent'};">${twTotal > 0 ? twTotal + 'h' : ''}</td>`;
                          return wHtml;
                        }).join('')}
                        <td style="text-align: center; font-size: 0.78rem; font-weight: bold; border-left: 2px solid var(--border-subtle); color: ${taskTotal > 0 ? 'var(--text-primary)' : 'transparent'};">
                          ${taskTotal > 0 ? taskTotal + 'h' : ''}
                        </td>
                      </tr>
                    `;
                  });
                });

                return html;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}

      <!-- Modals (Note, OT, Analytics) -->
      <div id="ts-detail-modal" class="modal-backdrop" style="display: none; z-index: 9999;">
        <div class="modal-content" style="max-width: 440px;">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0; font-size: 1.05rem;">Chi tiết kế hoạch: <span id="ts-modal-task-title" style="color: var(--accent-primary);"></span></h3>
              <div class="text-xs text-muted" id="ts-modal-sub-title" style="margin-top: 4px;"></div>
            </div>
            <button class="btn-icon" id="ts-detail-close">×</button>
          </div>
          <div class="modal-body">
            <input type="hidden" id="ts-uid">
            <input type="hidden" id="ts-pid">
            <input type="hidden" id="ts-tid">
            <input type="hidden" id="ts-date">
            
            <div class="form-group mb-sm">
              <label class="form-label font-bold">⏱️ Số giờ kế hoạch (h)</label>
              <input type="number" id="ts-hours" class="form-input w-full" min="0" max="24" step="0.5" placeholder="VD: 4, 8...">
            </div>
            
            <div class="form-group mb-sm" style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="ts-isot" style="width: 16px; height: 16px; accent-color: #ef4444;">
              <label for="ts-isot" style="margin: 0; color: #ef4444; font-weight: bold; cursor: pointer;">Làm ngoài giờ (OT)</label>
            </div>
            
            <div class="form-group">
              <label class="form-label font-bold">📝 Ghi chú phân công / công việc</label>
              <textarea id="ts-comment" class="form-input w-full" rows="3" placeholder="Ví dụ: Họp review thiết kế, xử lý xung đột mô hình..."></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-outline text-danger" id="ts-detail-delete" style="border-color: rgba(239, 68, 68, 0.4); font-weight: 600;">🗑️ Xóa giờ</button>
            <div class="flex gap-sm">
              <button class="btn btn-outline" id="ts-detail-cancel">Hủy</button>
              <button class="btn btn-primary" id="ts-detail-save" style="background: #10b981; border-color: #10b981; font-weight: 600;">💾 Lưu lại</button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="analytics-modal" class="modal-backdrop" style="display: none; z-index: 9999;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>Phân bổ thời gian (2 tuần)</h3>
            <button class="btn-icon" id="analytics-close">×</button>
          </div>
          <div class="modal-body" style="text-align: center;">
             <h4 id="analytics-name" style="margin-bottom: 1rem; font-weight: bold;"></h4>
             <div id="analytics-chart-container" style="display: flex; justify-content: center; gap: 24px; align-items: center;">
                <!-- Chart injected here -->
             </div>
          </div>
        </div>
      </div>

      <!-- Modal Phân Bổ Nhanh Theo Tuần (1-Click Fill 40h) -->
      <div id="quick-alloc-modal" class="modal-backdrop" style="display: none; z-index: 9999;">
        <div class="modal-content" style="max-width: 520px; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,0.35);">
          <div class="modal-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
                ⚡ Phân bổ kế hoạch theo tuần
              </h3>
              <div class="text-xs text-muted" style="margin-top: 4px;">
                Tự động điền nhanh số giờ cho các ngày trong tuần chỉ với 1 cú click
              </div>
            </div>
            <button class="btn-icon" id="quick-alloc-close" style="font-size: 1.2rem;">×</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 14px; padding: 16px 0;">
            <!-- Chọn nhân sự -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label font-bold" style="font-size: 0.82rem;">👤 Nhân sự áp dụng <span style="color: #ef4444;">*</span></label>
              <select id="qa-member" class="form-select w-full" style="font-size: 0.85rem;">
                ${targetPersonnel.map(p => `<option value="${p.id}">${formatDisplayName(p.name)} (${p.role || 'BIM Member'})</option>`).join('')}
              </select>
            </div>

            <!-- Chọn dự án -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label font-bold" style="font-size: 0.82rem;">📁 Dự án <span style="color: #ef4444;">*</span></label>
              <select id="qa-project" class="form-select w-full" style="font-size: 0.85rem;">
                ${(state.projects || []).map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('')}
              </select>
            </div>

            <!-- Chọn công việc (Task) -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label font-bold" style="font-size: 0.82rem;">📝 Hạng mục / Công việc</label>
              <select id="qa-task" class="form-select w-full" style="font-size: 0.85rem;">
                <option value="t_general">📌 Công việc chung (Chưa phân Task cụ thể)</option>
              </select>
            </div>

            <!-- Chọn tuần áp dụng -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label font-bold" style="font-size: 0.82rem;">📅 Tuần kế hoạch áp dụng</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <label class="qa-week-choice" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; background: var(--bg-secondary);">
                  <input type="radio" name="qa-week" value="0" checked style="accent-color: var(--accent-primary);">
                  <span style="font-size: 0.82rem; font-weight: 600;">Tuần ${planData[0]?.weekNo} (${planData[0]?.days[0]?.dateLabel} - ${planData[0]?.days[4]?.dateLabel})</span>
                </label>
                <label class="qa-week-choice" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; background: var(--bg-secondary);">
                  <input type="radio" name="qa-week" value="1" style="accent-color: var(--accent-primary);">
                  <span style="font-size: 0.82rem; font-weight: 600;">Tuần ${planData[1]?.weekNo} (${planData[1]?.days[0]?.dateLabel} - ${planData[1]?.days[4]?.dateLabel})</span>
                </label>
              </div>
              <label class="qa-week-choice" style="display: flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; background: var(--bg-secondary); margin-top: 6px;">
                <input type="radio" name="qa-week" value="both" style="accent-color: var(--accent-primary);">
                <span style="font-size: 0.82rem; font-weight: 600;">Cả 2 tuần (${planData[0]?.days[0]?.dateLabel} - ${planData[1]?.days[6]?.dateLabel})</span>
              </label>
            </div>

            <!-- Chọn các ngày trong tuần -->
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label font-bold" style="margin: 0; font-size: 0.82rem;">🗓️ Ngày trong tuần</label>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-qa-days-weekdays" style="font-size: 0.72rem; padding: 2px 6px;">T2-T6</button>
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-qa-days-sat" style="font-size: 0.72rem; padding: 2px 6px;">T2-T7</button>
                  <button type="button" class="btn btn-ghost btn-sm" id="btn-qa-days-all" style="font-size: 0.72rem; padding: 2px 6px;">Cả 7 ngày</button>
                </div>
              </div>
              <div style="display: flex; gap: 6px; justify-content: space-between;">
                ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => `
                  <label style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 4px; border: 1px solid var(--border-subtle); border-radius: 6px; flex: 1; cursor: pointer; background: var(--bg-secondary); text-align: center;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: ${day === 'T7' || day === 'CN' ? '#ef4444' : 'var(--text-primary)'};">${day}</span>
                    <input type="checkbox" class="qa-day-chk" value="${day}" ${['T2','T3','T4','T5','T6'].includes(day) ? 'checked' : ''} style="cursor: pointer; accent-color: var(--accent-primary);">
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Số giờ mỗi ngày & Preset mẫu -->
            <div class="form-group" style="margin-bottom: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label font-bold" style="margin: 0; font-size: 0.82rem;">⏱️ Số giờ phân bổ mỗi ngày</label>
                <div style="display: flex; gap: 4px;">
                  <button type="button" class="btn btn-outline btn-sm btn-qa-preset" data-hours="8" style="font-size: 0.72rem; padding: 2px 8px; font-weight: 600;">8h (40h/tuần)</button>
                  <button type="button" class="btn btn-outline btn-sm btn-qa-preset" data-hours="4" style="font-size: 0.72rem; padding: 2px 8px;">4h (20h/tuần)</button>
                  <button type="button" class="btn btn-outline btn-sm btn-qa-preset" data-hours="2" style="font-size: 0.72rem; padding: 2px 8px;">2h (10h/tuần)</button>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="number" id="qa-hours" class="form-input" min="0.5" max="24" step="0.5" value="8" style="width: 100px; font-weight: 700; font-size: 1rem;">
                <div id="qa-calc-summary" style="font-size: 0.82rem; color: #10b981; font-weight: 600;">
                  = 5 ngày × 8h = 40h/tuần
                </div>
              </div>
            </div>

            <!-- OT & Ghi chú -->
            <div style="display: flex; gap: 12px; align-items: center;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 600; color: #ef4444;">
                <input type="checkbox" id="qa-isot" style="accent-color: #ef4444; width: 16px; height: 16px;">
                <span>Làm ngoài giờ (OT)</span>
              </label>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label font-bold" style="font-size: 0.82rem;">📝 Ghi chú phân bổ (Tùy chọn)</label>
              <input type="text" id="qa-comment" class="form-input w-full" placeholder="VD: Triển khai mô hình kiến trúc & kết cấu..." style="font-size: 0.82rem;">
            </div>

            <!-- Tiện ích sao chép tuần -->
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
              <div>
                <div style="font-size: 0.82rem; font-weight: 700; color: var(--accent-primary);">📋 Sao chép kế hoạch từ Tuần 1 sang Tuần 2</div>
                <div class="text-xs text-muted">Nhân bản toàn bộ lịch tuần 1 sang tuần 2 cho nhân sự đang chọn</div>
              </div>
              <button type="button" class="btn btn-sm btn-outline" id="btn-qa-copy-prev" style="font-size: 0.78rem; border-color: var(--accent-primary); color: var(--accent-primary); font-weight: 600; white-space: nowrap;">
                Sao chép ngay
              </button>
            </div>
          </div>

          <div class="modal-footer" style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between;">
            <button class="btn btn-outline" id="quick-alloc-cancel">Hủy bỏ</button>
            <button class="btn btn-primary" id="quick-alloc-apply" style="font-weight: 700; background: #10b981; border-color: #10b981; display: flex; align-items: center; gap: 6px;">
              ⚡ Áp dụng phân bổ
            </button>
          </div>
        </div>
      </div>

      <style>
        .planning-table th, .planning-table td {
          white-space: nowrap;
        }
        .planning-table tbody tr:hover td:not(:first-child) {
          background: rgba(255, 255, 255, 0.04);
        }
        .ts-input:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: var(--accent-primary) !important;
        }
        .ts-input:focus {
          outline: none !important;
          border-color: var(--accent-primary) !important;
          background: var(--bg-card) !important;
          box-shadow: 0 0 0 2px var(--accent-primary-glow) !important;
        }
        .ts-input::-webkit-outer-spin-button,
        .ts-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .ts-input[type=number] {
          -moz-appearance: textfield;
        }
        .member-header-row:hover {
          filter: brightness(1.03);
        }
        .project-header-row:hover {
          filter: brightness(1.02);
        }
        .btn-workload-filter-pill {
          padding: 3px 9px;
          font-size: 0.76rem;
          font-weight: 600;
          border-radius: 16px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .btn-workload-filter-pill:hover {
          background: var(--bg-tertiary);
          border-color: var(--accent-primary);
        }
        .btn-workload-filter-pill.active {
          background: var(--accent-primary) !important;
          color: #fff !important;
          border-color: var(--accent-primary) !important;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
        }
        .qa-week-choice:hover {
          border-color: var(--accent-primary) !important;
        }
      </style>
    </div>
  `;
}

export function init() {
  const container = document.getElementById('page-content');
  if (!container) return;

  // 1. Navigation Offset (2 Weeks)
  document.getElementById('btn-prev-week')?.addEventListener('click', () => {
    currentOffset -= 1;
    refreshView();
  });
  document.getElementById('btn-next-week')?.addEventListener('click', () => {
    currentOffset += 1;
    refreshView();
  });
  document.getElementById('btn-today-week')?.addEventListener('click', () => {
    currentOffset = 0;
    refreshView();
  });

  // 2. View Mode Switcher (Detailed vs Heatmap)
  document.getElementById('view-mode-detailed')?.addEventListener('click', () => {
    if (currentViewMode === 'detailed') return;
    currentViewMode = 'detailed';
    refreshView();
  });
  document.getElementById('view-mode-heatmap')?.addEventListener('click', () => {
    if (currentViewMode === 'heatmap') return;
    currentViewMode = 'heatmap';
    refreshView();
  });

  // 3. Filter Listeners
  let searchTimeout;
  document.getElementById('filter-search-input')?.addEventListener('input', (e) => {
    filterSearch = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      refreshView();
    }, 300);
  });

  document.getElementById('filter-member-select')?.addEventListener('change', (e) => {
    filterMemberId = e.target.value;
    refreshView();
  });

  document.getElementById('filter-project-select')?.addEventListener('change', (e) => {
    filterProjectId = e.target.value;
    refreshView();
  });

  document.getElementById('filter-only-active')?.addEventListener('change', (e) => {
    filterOnlyActive = e.target.checked;
    refreshView();
  });

  // 4. Collapse / Expand All & Display Levels
  document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
    const { personnel } = getState();
    (personnel || []).forEach(p => collapsedMembers.add(p.id));
    refreshView();
  });

  document.getElementById('btn-expand-all')?.addEventListener('click', () => {
    collapsedMembers.clear();
    collapsedProjects.clear();
    refreshView();
  });

  document.getElementById('btn-level-1')?.addEventListener('click', () => {
    currentDisplayLevel = 'level-1';
    const { personnel } = getState();
    collapsedMembers = new Set((personnel || []).map(p => p.id));
    collapsedProjects.clear();
    refreshView();
  });

  document.getElementById('btn-level-2')?.addEventListener('click', () => {
    currentDisplayLevel = 'level-2';
    collapsedMembers.clear();
    collapsedProjects = new Set();
    const state = getState();
    (state.personnel || []).forEach(person => {
      (state.projects || []).forEach(proj => {
        collapsedProjects.add(`${person.id}_${proj.id}`);
      });
    });
    refreshView();
  });

  document.getElementById('btn-level-3')?.addEventListener('click', () => {
    currentDisplayLevel = 'level-3';
    collapsedMembers.clear();
    collapsedProjects.clear();
    refreshView();
  });

  // Workload Filter Pills
  document.querySelectorAll('.btn-workload-filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      currentWorkloadFilter = e.currentTarget.dataset.filter || 'all';
      refreshView();
    });
  });

  // 5. Interactive Accordion Click (Member level & Project level)
  document.querySelectorAll('.member-header-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-analytics') || e.target.closest('.btn-row-quick-alloc')) return;
      const personId = row.dataset.personId;
      if (!personId) return;

      if (collapsedMembers.has(personId)) {
        collapsedMembers.delete(personId);
      } else {
        collapsedMembers.add(personId);
      }
      refreshView();
    });
  });

  document.querySelectorAll('.project-header-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-proj-quick-alloc')) return;
      const projKey = row.dataset.projKey;
      if (!projKey) return;

      if (collapsedProjects.has(projKey)) {
        collapsedProjects.delete(projKey);
      } else {
        collapsedProjects.add(projKey);
      }
      refreshView();
    });
  });

  // 6. Export CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    const { timesheets, personnel, projects } = getState();
    const planData = getPlanningData(currentOffset);
    let csv = "Nhân sự,Dự án,Công việc,Ngày,Giờ,Phân loại,Ghi chú\n";
    
    planData.forEach(w => {
      w.days.forEach(d => {
        const records = (timesheets || []).filter(t => t.dateString === d.dateString);
        records.forEach(r => {
          const person = (personnel || []).find(p => p.id === r.userId);
          const project = (projects || []).find(p => p.id === r.projectId);
          const pName = person ? person.name : r.userId;
          const projName = project ? project.name : r.projectId;
          
          let tName = r.taskId;
          if (project && r.taskId.startsWith('t_')) {
            const tIdx = parseInt(r.taskId.replace('t_', ''), 10);
            if (project.tasks && project.tasks[tIdx]) {
              tName = project.tasks[tIdx].name;
            }
          } else if (project && r.taskId.startsWith('rfi_')) {
            const rIdx = parseInt(r.taskId.replace('rfi_', ''), 10);
            if (project.rfis && project.rfis[rIdx]) {
              tName = '[RFI] ' + project.rfis[rIdx].title;
            }
          }
          
          const classification = r.isOT ? 'Làm ngoài giờ (OT)' : 'Hành chính';
          const comment = (r.comment || '').replace(/"/g, '""');
          
          csv += `"${pName}","${projName}","${tName}","${d.dateString}","${r.hours}","${classification}","${comment}"\n`;
        });
      });
    });
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `General_Planning_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // 7. Input Cell Listeners
  document.querySelectorAll('.ts-input').forEach(input => {
    // Tự động bôi đen toàn bộ số khi click vào ô để dễ dàng gõ đè
    input.addEventListener('focus', (e) => {
      e.target.select();
    });

    // Nhấn Enter để kết thúc nhập và lưu ngay lập tức
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });

    // Thay đổi số giờ
    input.addEventListener('change', (e) => {
      const rawVal = e.target.value.trim();
      const numVal = rawVal === '' ? 0 : parseFloat(rawVal);
      saveTimesheet(e.target.dataset, isNaN(numVal) ? 0 : numVal);
    });
    
    // Nhấp đúp mở modal chi tiết & OT
    input.addEventListener('dblclick', (e) => {
      e.preventDefault();
      const ds = e.target.dataset;
      openTsModal(ds);
    });
  });

  // Nhấp vào chấm indicator cũng mở modal chi tiết
  document.querySelectorAll('.ts-indicator').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      openTsModal(e.currentTarget.dataset);
    });
  });
  
  // 8. Personal Analytics Modal
  document.querySelectorAll('.btn-analytics').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uid = e.currentTarget.dataset.uid;
      openAnalyticsModal(uid);
    });
  });

  // 9. Modals Controls
  const modalTs = document.getElementById('ts-detail-modal');
  const modalAnalytics = document.getElementById('analytics-modal');
  
  document.getElementById('ts-detail-close')?.addEventListener('click', () => modalTs.style.display = 'none');
  document.getElementById('ts-detail-cancel')?.addEventListener('click', () => modalTs.style.display = 'none');
  document.getElementById('analytics-close')?.addEventListener('click', () => modalAnalytics.style.display = 'none');

  document.getElementById('ts-detail-save')?.addEventListener('click', () => {
    const ds = {
      uid: document.getElementById('ts-uid').value,
      pid: document.getElementById('ts-pid').value,
      tid: document.getElementById('ts-tid').value,
      date: document.getElementById('ts-date').value
    };
    const rawH = document.getElementById('ts-hours').value.trim();
    const hours = rawH === '' ? 0 : parseFloat(rawH);
    const isOT = document.getElementById('ts-isot').checked;
    const comment = document.getElementById('ts-comment').value.trim();
    
    saveTimesheet(ds, isNaN(hours) ? 0 : hours, isOT, comment);
    modalTs.style.display = 'none';
  });
  
  document.getElementById('ts-detail-delete')?.addEventListener('click', () => {
    const ds = {
      uid: document.getElementById('ts-uid').value,
      pid: document.getElementById('ts-pid').value,
      tid: document.getElementById('ts-tid').value,
      date: document.getElementById('ts-date').value
    };
    if (confirm(`Bạn có chắc chắn muốn xóa giờ kế hoạch ngày ${ds.date}?`)) {
      saveTimesheet(ds, 0, false, '');
      modalTs.style.display = 'none';
    }
  });

  // 10. Quick Weekly Allocation Modal Controls & Listeners
  const modalQa = document.getElementById('quick-alloc-modal');

  document.getElementById('btn-quick-alloc-trigger')?.addEventListener('click', () => {
    openQuickAllocModal();
  });

  document.querySelectorAll('.btn-row-quick-alloc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickAllocModal({ memberId: e.currentTarget.dataset.uid });
    });
  });

  document.querySelectorAll('.btn-proj-quick-alloc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openQuickAllocModal({
        memberId: e.currentTarget.dataset.uid,
        projectId: e.currentTarget.dataset.pid
      });
    });
  });

  document.getElementById('quick-alloc-close')?.addEventListener('click', () => {
    if (modalQa) modalQa.style.display = 'none';
  });
  document.getElementById('quick-alloc-cancel')?.addEventListener('click', () => {
    if (modalQa) modalQa.style.display = 'none';
  });

  document.getElementById('qa-project')?.addEventListener('change', (e) => {
    updateQaTaskOptions(e.target.value);
  });

  document.getElementById('qa-hours')?.addEventListener('input', () => {
    updateQaCalcSummary();
  });

  document.querySelectorAll('.qa-day-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      updateQaCalcSummary();
    });
  });

  document.querySelectorAll('input[name="qa-week"]').forEach(r => {
    r.addEventListener('change', () => {
      updateQaCalcSummary();
    });
  });

  // Day shortcuts
  document.getElementById('btn-qa-days-weekdays')?.addEventListener('click', () => {
    document.querySelectorAll('.qa-day-chk').forEach(chk => {
      chk.checked = ['T2', 'T3', 'T4', 'T5', 'T6'].includes(chk.value);
    });
    updateQaCalcSummary();
  });

  document.getElementById('btn-qa-days-sat')?.addEventListener('click', () => {
    document.querySelectorAll('.qa-day-chk').forEach(chk => {
      chk.checked = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].includes(chk.value);
    });
    updateQaCalcSummary();
  });

  document.getElementById('btn-qa-days-all')?.addEventListener('click', () => {
    document.querySelectorAll('.qa-day-chk').forEach(chk => {
      chk.checked = true;
    });
    updateQaCalcSummary();
  });

  // Hour presets
  document.querySelectorAll('.btn-qa-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hInput = document.getElementById('qa-hours');
      if (hInput) {
        hInput.value = e.currentTarget.dataset.hours;
        updateQaCalcSummary();
      }
    });
  });

  // Copy Week 1 to Week 2
  document.getElementById('btn-qa-copy-prev')?.addEventListener('click', () => {
    const memberId = document.getElementById('qa-member')?.value;
    const projectId = document.getElementById('qa-project')?.value;
    if (!memberId) {
      showToast('⚠️ Vui lòng chọn nhân sự trước khi sao chép!', 'warning');
      return;
    }
    const { personnel } = getState();
    const p = (personnel || []).find(x => x.id === memberId);
    if (confirm(`Bạn có chắc chắn muốn sao chép toàn bộ kế hoạch Tuần 1 sang Tuần 2 cho ${p ? p.name : memberId}?`)) {
      copyPlanWeek1ToWeek2(memberId, projectId);
      if (modalQa) modalQa.style.display = 'none';
    }
  });

  // Apply Quick Allocation
  document.getElementById('quick-alloc-apply')?.addEventListener('click', () => {
    const memberId = document.getElementById('qa-member')?.value;
    const projectId = document.getElementById('qa-project')?.value;
    const taskId = document.getElementById('qa-task')?.value || 't_general';
    const weekOption = document.querySelector('input[name="qa-week"]:checked')?.value || '0';
    const selectedDays = Array.from(document.querySelectorAll('.qa-day-chk:checked')).map(c => c.value);
    const rawH = document.getElementById('qa-hours')?.value?.trim();
    const hours = parseFloat(rawH);
    const isOT = !!document.getElementById('qa-isot')?.checked;
    const comment = document.getElementById('qa-comment')?.value?.trim() || '';

    if (!memberId || !projectId) {
      showToast('⚠️ Vui lòng chọn nhân sự và dự án!', 'warning');
      return;
    }
    if (isNaN(hours) || hours <= 0) {
      showToast('⚠️ Số giờ mỗi ngày phải lớn hơn 0!', 'warning');
      return;
    }
    if (selectedDays.length === 0) {
      showToast('⚠️ Vui lòng chọn ít nhất 1 ngày trong tuần!', 'warning');
      return;
    }

    applyQuickWeeklyAllocation({
      memberId,
      projectId,
      taskId,
      weekOption,
      selectedDays,
      hoursPerDay: hours,
      isOT,
      comment
    });

    if (modalQa) modalQa.style.display = 'none';
  });
}

function openQuickAllocModal(prefill = {}) {
  const modal = document.getElementById('quick-alloc-modal');
  if (!modal) return;

  const memberSelect = document.getElementById('qa-member');
  const projSelect = document.getElementById('qa-project');

  if (prefill.memberId && memberSelect) {
    memberSelect.value = prefill.memberId;
  }
  if (prefill.projectId && projSelect) {
    projSelect.value = prefill.projectId;
  }

  updateQaTaskOptions(projSelect ? projSelect.value : '', prefill.taskId || '');
  updateQaCalcSummary();
  modal.style.display = 'flex';
}

function updateQaTaskOptions(projectId, preselectedTaskId = '') {
  const taskSelect = document.getElementById('qa-task');
  if (!taskSelect) return;
  const { projects } = getState();
  const proj = (projects || []).find(p => p.id === projectId);

  let html = `<option value="t_general">📌 Công việc chung (Chưa phân Task cụ thể)</option>`;
  if (proj && proj.tasks && proj.tasks.length > 0) {
    proj.tasks.forEach((t, idx) => {
      const effectiveId = t.id || `t_${idx}`;
      let name = t.name;
      if (t.segmentIdx !== undefined && proj.segments?.[t.segmentIdx]) {
        name += ` - ${proj.segments[t.segmentIdx].name}`;
      }
      html += `<option value="${effectiveId}" ${preselectedTaskId === effectiveId ? 'selected' : ''}>📝 ${name}</option>`;
    });
  }
  if (proj && proj.rfis && proj.rfis.length > 0) {
    proj.rfis.forEach((r, idx) => {
      const effectiveId = r.id || `rfi_${idx}`;
      html += `<option value="${effectiveId}" ${preselectedTaskId === effectiveId ? 'selected' : ''}>❓ [RFI] ${r.title}</option>`;
    });
  }
  taskSelect.innerHTML = html;
}

function updateQaCalcSummary() {
  const summaryEl = document.getElementById('qa-calc-summary');
  if (!summaryEl) return;
  const hours = parseFloat(document.getElementById('qa-hours')?.value || 0) || 0;
  const checkedDays = document.querySelectorAll('.qa-day-chk:checked').length;
  const weekOption = document.querySelector('input[name="qa-week"]:checked')?.value;
  const weeksCount = weekOption === 'both' ? 2 : 1;
  const totalHours = checkedDays * hours * weeksCount;

  summaryEl.textContent = `= ${checkedDays} ngày × ${hours}h${weeksCount > 1 ? ' × 2 tuần' : ''} = ${totalHours}h (${weeksCount === 1 ? '1 tuần' : '2 tuần'})`;
}

function applyQuickWeeklyAllocation({ memberId, projectId, taskId, weekOption, selectedDays, hoursPerDay, isOT, comment }) {
  const planData = getPlanningData(currentOffset);
  const { timesheets, projects, personnel } = getState();
  const updated = [...(timesheets || [])];

  const targetWeeks = [];
  if (weekOption === '0') targetWeeks.push(planData[0]);
  else if (weekOption === '1') targetWeeks.push(planData[1]);
  else if (weekOption === 'both') targetWeeks.push(planData[0], planData[1]);

  const targetDates = [];
  targetWeeks.forEach(w => {
    (w.days || []).forEach(d => {
      if (selectedDays.includes(d.name)) {
        targetDates.push(d.dateString);
      }
    });
  });

  if (targetDates.length === 0) {
    showToast('⚠️ Vui lòng chọn ít nhất 1 ngày trong tuần!', 'warning');
    return;
  }

  const proj = (projects || []).find(p => p.id === projectId);
  let targetTask = null;
  if (proj && proj.tasks) {
    targetTask = proj.tasks.find(x => x.id === taskId) || (taskId.startsWith('t_') ? proj.tasks[parseInt(taskId.replace('t_', ''), 10)] : null);
  }
  const taskName = targetTask ? targetTask.name : (taskId.startsWith('rfi_') ? 'Xử lý RFI' : (taskId === 't_general' ? 'Công việc chung' : taskId));
  const person = (personnel || []).find(p => p.id === memberId) || (personnel || []).find(p => matchUserTs({ userId: memberId, userName: memberId, email: memberId }, p.id, personnel));

  let modifiedCount = 0;
  const unblockKeys = [];

  targetDates.forEach(dateStr => {
    const existingIdx = updated.findIndex(t => 
      matchTaskTs(t, memberId, taskId, projectId, projects, personnel) && 
      (t.dateString === dateStr || t.date === dateStr) && 
      !t.isActual
    );

    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        hours: hoursPerDay,
        isOT: isOT,
        comment: comment || updated[existingIdx].comment || '',
        note: comment || updated[existingIdx].note || '',
        dateString: dateStr,
        date: dateStr,
        updatedAt: new Date().toISOString()
      };
    } else {
      updated.unshift({
        id: `ts-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: person ? person.id : memberId,
        userName: person ? person.name : '',
        email: person ? person.email : '',
        projectId: projectId,
        projectName: proj ? proj.name : '',
        taskId: targetTask?.id || taskId,
        taskName: taskName,
        dateString: dateStr,
        date: dateStr,
        hours: hoursPerDay,
        isActual: false,
        isOT: isOT,
        comment: comment,
        note: comment,
        createdAt: new Date().toISOString()
      });
    }

    if (proj && targetTask) {
      if (!targetTask.dailyHours_planned) targetTask.dailyHours_planned = {};
      targetTask.dailyHours_planned[dateStr] = hoursPerDay;
    }

    unblockKeys.push(
      `syn-plan-${taskId}-${dateStr}`,
      `ts-plan-${taskId}-${dateStr}`,
      targetTask?.id ? `syn-plan-${targetTask.id}-${dateStr}` : '',
      targetTask?.id ? `ts-plan-${targetTask.id}-${dateStr}` : '',
      `${memberId}_${projectId}_${taskId}_${dateStr}_false`
    );
    modifiedCount++;
  });

  if (proj && targetTask) {
    updateProject(proj.id, { tasks: proj.tasks });
  }

  // Gỡ bỏ tombstone cũ nếu có
  if (getState().deletedTimesheetIds && getState().deletedTimesheetIds.length > 0) {
    const blockedKeys = new Set(unblockKeys.filter(Boolean));
    const filteredDel = getState().deletedTimesheetIds.filter(k => !blockedKeys.has(k));
    setState('deletedTimesheetIds', filteredDel);
    try {
      localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(filteredDel));
    } catch(e) {}
  }

  setState('timesheets', updated);
  saveLocalSnapshot(`Phân bổ nhanh: ${hoursPerDay}h/ngày (${modifiedCount} ngày) cho ${person ? person.name : memberId}`);
  showToast(`✅ Đã phân bổ ${modifiedCount * hoursPerDay}h kế hoạch cho ${formatDisplayName(person ? person.name : memberId)}!`);
  refreshView();
}

function copyPlanWeek1ToWeek2(memberId, projectId) {
  const planData = getPlanningData(currentOffset);
  const { timesheets, projects, personnel } = getState();
  const updated = [...(timesheets || [])];

  const w1Days = planData[0].days;
  const w2Days = planData[1].days;

  let copiedCount = 0;
  const person = (personnel || []).find(p => p.id === memberId);

  for (let i = 0; i < 7; i++) {
    const d1Str = w1Days[i].dateString;
    const d2Str = w2Days[i].dateString;

    const d1Records = updated.filter(t => 
      matchUserTs(t, memberId, personnel) && 
      (!projectId || t.projectId === projectId) && 
      (t.dateString === d1Str || t.date === d1Str) && 
      !t.isActual && 
      Number(t.hours) > 0
    );

    d1Records.forEach(rec => {
      const existingIdx = updated.findIndex(t => 
        matchTaskTs(t, memberId, rec.taskId, rec.projectId, projects, personnel) && 
        (t.dateString === d2Str || t.date === d2Str) && 
        !t.isActual
      );

      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          hours: rec.hours,
          isOT: rec.isOT,
          comment: rec.comment || '',
          dateString: d2Str,
          date: d2Str,
          updatedAt: new Date().toISOString()
        };
      } else {
        updated.unshift({
          id: `ts-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: rec.userId,
          userName: rec.userName,
          email: rec.email,
          projectId: rec.projectId,
          projectName: rec.projectName,
          taskId: rec.taskId,
          taskName: rec.taskName,
          dateString: d2Str,
          date: d2Str,
          hours: rec.hours,
          isActual: false,
          isOT: rec.isOT,
          comment: rec.comment,
          createdAt: new Date().toISOString()
        });
      }
      copiedCount++;
    });
  }

  if (copiedCount === 0) {
    showToast('⚠️ Tuần 1 chưa có dữ liệu giờ kế hoạch để sao chép!', 'warning');
    return;
  }

  setState('timesheets', updated);
  saveLocalSnapshot(`Sao chép kế hoạch Tuần 1 sang Tuần 2 cho ${person ? person.name : memberId}`);
  showToast(`✅ Đã sao chép thành công ${copiedCount} lượt phân bổ sang Tuần 2!`);
  refreshView();
}

function refreshView() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const scrollContainer = document.querySelector('.planning-table-container');
  const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
  const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  container.innerHTML = render();
  init();

  const newScrollContainer = document.querySelector('.planning-table-container');
  if (newScrollContainer) {
    newScrollContainer.scrollLeft = scrollLeft;
    newScrollContainer.scrollTop = scrollTop;
  }
}

function openTsModal(ds) {
  const modal = document.getElementById('ts-detail-modal');
  if (!modal) return;
  document.getElementById('ts-uid').value = ds.uid;
  document.getElementById('ts-pid').value = ds.pid;
  document.getElementById('ts-tid').value = ds.tid;
  document.getElementById('ts-date').value = ds.date;
  
  const { timesheets, projects, personnel } = getState();
  const person = (personnel || []).find(p => p.id === ds.uid) || (personnel || []).find(p => matchUserTs({ userId: ds.uid, userName: ds.uid, email: ds.uid }, p.id, personnel));
  const proj = (projects || []).find(p => p.id === ds.pid);
  let task = null;
  if (proj && proj.tasks) {
    task = proj.tasks.find(x => x.id === ds.tid) || (ds.tid.startsWith('t_') ? proj.tasks[parseInt(ds.tid.replace('t_', ''), 10)] : null);
  }

  const ts = getTsRecord(ds.uid, ds.tid, ds.date, ds.pid, timesheets, projects, personnel);
  
  let plannedHours = ts ? ts.hours : '';
  if (plannedHours === '' && task && task.dailyHours_planned && task.dailyHours_planned[ds.date] !== undefined) {
    plannedHours = task.dailyHours_planned[ds.date];
  }

  const modalTaskTitle = document.getElementById('ts-modal-task-title');
  if (modalTaskTitle) {
    modalTaskTitle.textContent = task ? task.name : (ds.tid === 't_general' ? 'Công việc chung' : ds.tid);
  }
  const modalSubtitle = document.getElementById('ts-modal-sub-title');
  if (modalSubtitle) {
    modalSubtitle.textContent = `👤 ${person ? person.name : 'Nhân sự'} · 📁 ${proj ? proj.name : 'Dự án'} · 📅 ${ds.date}`;
  }
  
  document.getElementById('ts-hours').value = (plannedHours !== '' && plannedHours !== null && plannedHours !== undefined) ? plannedHours : '';
  document.getElementById('ts-isot').checked = ts ? !!ts.isOT : false;
  document.getElementById('ts-comment').value = ts ? (ts.comment || ts.note || '') : '';
  
  modal.style.display = 'flex';
}

function openAnalyticsModal(uid) {
  const modal = document.getElementById('analytics-modal');
  const { personnel, timesheets, projects } = getState();
  const person = (personnel || []).find(p => p.id === uid);
  if (!person) return;
  
  document.getElementById('analytics-name').innerText = `Dữ liệu phân bổ của ${formatDisplayName(person.name)}`;
  
  const planData = getPlanningData(currentOffset);
  const weekDates = [];
  planData.forEach(w => w.days.forEach(d => weekDates.push(d.dateString)));
  
  const projSums = {};
  let totalHours = 0;
  
  (timesheets || []).filter(t => matchUserTs(t, uid, personnel) && weekDates.includes(t.dateString || t.date) && !t.isActual).forEach(t => {
    projSums[t.projectId] = (projSums[t.projectId] || 0) + Number(t.hours);
    totalHours += Number(t.hours);
  });
  
  const container = document.getElementById('analytics-chart-container');
  if (totalHours === 0) {
    container.innerHTML = `<div class="text-muted" style="padding: 24px;">Chưa có dữ liệu làm việc trong 2 tuần này.</div>`;
    modal.style.display = 'flex';
    return;
  }
  
  const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6'];
  let legendHtml = '<div style="text-align: left;">';
  let conicStops = [];
  let currentAngle = 0;
  
  Object.keys(projSums).forEach((pid, idx) => {
    const val = projSums[pid];
    const pct = (val / totalHours) * 100;
    const proj = (projects || []).find(p => p.id === pid);
    const pName = proj ? proj.name : pid;
    const color = colors[idx % colors.length];
    
    conicStops.push(`${color} ${currentAngle}% ${currentAngle + pct}%`);
    currentAngle += pct;
    
    legendHtml += `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></div>
        <div style="font-size: 0.85rem; font-weight: 500;">${pName} (${val}h — ${pct.toFixed(1)}%)</div>
      </div>
    `;
  });
  legendHtml += '</div>';
  
  const pieCss = `width: 140px; height: 140px; border-radius: 50%; background: conic-gradient(${conicStops.join(', ')}); box-shadow: 0 4px 12px rgba(0,0,0,0.15); flex-shrink: 0;`;
  
  container.innerHTML = `
    <div style="${pieCss}"></div>
    ${legendHtml}
  `;
  
  modal.style.display = 'flex';
}

function saveTimesheet(ds, hours, isOT = false, comment = '') {
  const uid = ds.uid;
  const pid = ds.pid;
  const tid = ds.tid;
  const dateStr = ds.date;
  
  const { timesheets, projects, personnel } = getState();
  const updated = [...(timesheets || [])];
  
  // Tìm chính xác bản ghi kế hoạch hiện có (hỗ trợ mọi biến thể định danh)
  const existingIdx = updated.findIndex(t => 
    matchTaskTs(t, uid, tid, pid, projects, personnel) && 
    (t.dateString === dateStr || t.date === dateStr) && 
    !t.isActual
  );

  const proj = (projects || []).find(p => p.id === pid);
  let targetTask = null;
  if (proj && proj.tasks) {
    targetTask = proj.tasks.find(x => x.id === tid) || (tid.startsWith('t_') ? proj.tasks[parseInt(tid.replace('t_', ''), 10)] : null);
    if (!targetTask && existingIdx >= 0 && updated[existingIdx].taskName) {
      targetTask = proj.tasks.find(x => x.name === updated[existingIdx].taskName);
    }
  }

  // TRƯỜNG HỢP 1: XÓA GIỜ KẾ HOẠCH (NHẬP 0 HOẶC ĐỂ TRỐNG HOẶC NÚT XÓA)
  if (hours === 0 || hours === '' || isNaN(hours)) {
    if (existingIdx >= 0) {
      const targetTs = updated[existingIdx];
      deleteTimesheet(targetTs.id || `${targetTs.userId}_${targetTs.projectId}_${targetTs.taskId || ''}_${dateStr}_false`);
    }
    
    // Đồng thời dọn sạch trong task.dailyHours_planned của project nếu có
    if (proj && targetTask && targetTask.dailyHours_planned && targetTask.dailyHours_planned[dateStr] !== undefined) {
      delete targetTask.dailyHours_planned[dateStr];
      updateProject(proj.id, { tasks: proj.tasks });
    }

    // Đăng ký tombstone để bản ghi synthetic không tự sinh lại
    const tombstoneKeys = [`syn-plan-${tid}-${dateStr}`, `ts-plan-${tid}-${dateStr}`, `${uid}_${pid}_${tid}_${dateStr}_false`];
    if (targetTask?.id) {
      tombstoneKeys.push(`syn-plan-${targetTask.id}-${dateStr}`, `ts-plan-${targetTask.id}-${dateStr}`);
    }
    const delSet = new Set([...(getState().deletedTimesheetIds || []), ...tombstoneKeys]);
    setState('deletedTimesheetIds', Array.from(delSet));
    try {
      localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(Array.from(delSet)));
    } catch(e) {}

    saveLocalSnapshot(`Xóa giờ kế hoạch ngày ${dateStr}`);
    showToast('🗑️ Đã xóa giờ kế hoạch thành công!');
    refreshView();
    return;
  }

  // TRƯỜNG HỢP 2: CẬP NHẬT HOẶC THÊM MỚI GIỜ KẾ HOẠCH
  let taskName = targetTask ? targetTask.name : (tid.startsWith('rfi_') ? 'Xử lý RFI' : (tid === 't_general' ? 'Công việc chung' : tid));

  if (existingIdx >= 0) {
    updated[existingIdx] = {
      ...updated[existingIdx],
      hours: hours,
      isOT: isOT,
      comment: comment,
      note: comment,
      dateString: dateStr,
      date: dateStr,
      updatedAt: new Date().toISOString()
    };
    taskName = updated[existingIdx].taskName || taskName;
  } else {
    const person = (personnel || []).find(p => p.id === uid) || (personnel || []).find(p => matchUserTs({ userId: uid, userName: uid, email: uid }, p.id, personnel));
    updated.unshift({
      id: `ts-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: person ? person.id : uid,
      userName: person ? person.name : '',
      email: person ? person.email : '',
      projectId: pid,
      projectName: proj ? proj.name : '',
      taskId: targetTask?.id || tid,
      taskName: taskName,
      dateString: dateStr,
      date: dateStr,
      hours: hours,
      isActual: false,
      isOT: isOT,
      comment: comment,
      note: comment,
      createdAt: new Date().toISOString()
    });
  }

  // Cập nhật trên task.dailyHours_planned của project
  if (proj && targetTask) {
    if (!targetTask.dailyHours_planned) targetTask.dailyHours_planned = {};
    targetTask.dailyHours_planned[dateStr] = hours;
    updateProject(proj.id, { tasks: proj.tasks });
  }

  // Gỡ bỏ tombstone cũ nếu có
  if (getState().deletedTimesheetIds && getState().deletedTimesheetIds.length > 0) {
    const blockedKeys = new Set([
      `syn-plan-${tid}-${dateStr}`,
      `ts-plan-${tid}-${dateStr}`,
      targetTask?.id ? `syn-plan-${targetTask.id}-${dateStr}` : '',
      targetTask?.id ? `ts-plan-${targetTask.id}-${dateStr}` : '',
      `${uid}_${pid}_${tid}_${dateStr}_false`
    ]);
    const filteredDel = getState().deletedTimesheetIds.filter(k => !blockedKeys.has(k));
    setState('deletedTimesheetIds', filteredDel);
    try {
      localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(filteredDel));
    } catch(e) {}
  }

  setState('timesheets', updated);
  saveLocalSnapshot(`Cập nhật kế hoạch: ${hours}h cho ${taskName} ngày ${dateStr}`);
  showToast(`✅ Đã lưu ${hours}h kế hoạch cho "${taskName}"!`);
  refreshView();
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('planning-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'planning-toast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
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
  toast.style.background = type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  toast.style.color = '#fff';
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 2500);
}

export function destroy() {}
