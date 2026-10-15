// ============================================
// MY TASKS — Trang báo cáo tiến độ cá nhân & Chấm công nhanh
// ============================================
import { getState, setState, subscribe, updateProject, saveLocalSnapshot } from '../state.js';
import { showItemDetailModal } from '../components/ItemDetailModal.js';
import { formatDisplayName } from '../utils/formatters.js';
import { openModal, closeModal } from '../components/Modal.js';

let unsubscribe = null;
let currentTimesheetFilter = 'week'; // 'all' | 'today' | 'week'

export function render() {
  const { currentUser, currentUserAuth, projects, personnel, timesheets } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';

  // Tìm hồ sơ nhân sự của người đăng nhập
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  // Tìm tất cả dự án + task được giao cho người này
  const myAssignments = [];
  (projects || []).forEach(project => {
    // Các tasks được gán cho người này
    const tasks = (project.tasks || []).filter(t => 
      t.assignee === userName || 
      t.assignee === userEmail ||
      (myRecord && t.assignee === myRecord.name)
    );
    
    // Các RFIs được gán cho người này
    const rfis = (project.rfis || []).filter(r => 
      r.assignee === userName || 
      r.assignee === userEmail ||
      (myRecord && r.assignee === myRecord.name)
    );

    // Kiểm tra xem người này có nằm trong Đội ngũ dự án (Team) không
    const isTeamMember = (project.team || []).some(m => 
      m.name === userName || m.email === userEmail || (myRecord && m.name === myRecord.name)
    );
    const isLead = project.teamLead === userName || project.teamLead === userEmail || (myRecord && project.teamLead === myRecord.name);

    // Nếu có task HOẶC RFI HOẶC nằm trong team dự án thì đều được tính
    if (tasks.length > 0 || (rfis && rfis.length > 0) || isTeamMember || isLead) {
      myAssignments.push({ project, tasks, rfis });
    }
  });

  // Tính toán thống kê KPI cá nhân
  const totalTasks = myAssignments.reduce((sum, a) => sum + a.tasks.length, 0);
  const completedTasks = myAssignments.reduce((sum, a) => sum + a.tasks.filter(t => t.progress >= 100).length, 0);
  const overdueTasks = myAssignments.reduce((sum, a) => sum + a.tasks.filter(t => {
    return new Date(t.dueDate) < new Date() && t.progress < 100;
  }).length, 0);
  const avgProgress = totalTasks > 0 
    ? Math.round(myAssignments.reduce((sum, a) => sum + a.tasks.reduce((s, t) => s + (t.progress || 0), 0), 0) / totalTasks) 
    : 0;

  // Tính toán thống kê tuần (Weekly Timesheet Strip)
  const weekStats = getWeeklyTimesheetData(userEmail, userName, personId, timesheets);

  return `
    <div class="animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center justify-between mb-lg">
        <div>
          <h1 class="section-title">👋 Xin chào, ${formatDisplayName(userName)}</h1>
          <div class="text-sm text-muted">${myRecord?.role || 'Nhân viên'} · ${userEmail}</div>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-primary" id="btn-refresh-tasks">🔄 Cập nhật</button>
        </div>
      </div>

      <!-- KPIs cá nhân -->
      <div class="kpi-grid stagger-children mb-md" style="grid-template-columns: repeat(4, 1fr);">
        <div class="kpi-card blue">
          <div class="kpi-card-value">${totalTasks}</div>
          <div class="kpi-card-label">Tổng công việc</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-card-value">${completedTasks}</div>
          <div class="kpi-card-label">Đã hoàn thành</div>
        </div>
        <div class="kpi-card ${overdueTasks > 0 ? 'red' : 'orange'}">
          <div class="kpi-card-value">${overdueTasks}</div>
          <div class="kpi-card-label">Trễ hạn</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-card-value">${avgProgress}%</div>
          <div class="kpi-card-label">Tiến độ TB</div>
        </div>
      </div>

      <!-- BẢNG CHẤM CÔNG TUẦN NÀY (WEEKLY TIMESHEET STRIP) -->
      ${renderWeeklyTimesheetStrip(weekStats)}

      ${myAssignments.length === 0 ? `
        <div class="card" style="padding: 48px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 16px;">📋</div>
          <div class="text-lg font-bold mb-sm">Chưa có công việc nào được giao</div>
          <div class="text-sm text-muted">Khi quản lý giao việc cho bạn trong các dự án, chúng sẽ hiển thị tại đây.</div>
        </div>
      ` : `
        <!-- Danh sách công việc theo dự án -->
        ${myAssignments.map(({ project, tasks, rfis }) => `
          <div class="card mb-lg">
            <div class="card-header" style="border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 class="card-title" style="margin: 0;">📁 ${project.name}</h3>
                <span class="badge ${project.status === 'active' ? 'active' : ''}" style="font-size: 0.7rem;">${project.code || project.id}</span>
              </div>
              <div class="flex gap-sm">
                <span class="badge active">${tasks.length} việc</span>
                ${rfis && rfis.length > 0 ? `<span class="badge overdue">${rfis.length} RFI</span>` : ''}
              </div>
            </div>
            
            ${rfis && rfis.length > 0 ? `
            <div style="padding: 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-tertiary);">
              <h4 style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                <span>❓</span> RFI (Yêu cầu cung cấp thông tin) cần xử lý
              </h4>
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 45%;">Tiêu đề RFI</th>
                    <th style="width: 18%;">Trạng thái</th>
                    <th style="width: 15%;">Hạn chót</th>
                    <th style="width: 22%;">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  ${rfis.map(rfi => {
                    const trueIdx = project.rfis.indexOf(rfi);
                    const isOverdue = new Date(rfi.dueDate) < new Date() && rfi.status !== 'Closed' && rfi.status !== 'Answered';
                    return `
                    <tr>
                      <td class="font-semibold">${rfi.title}</td>
                      <td>
                        <select class="form-select rfi-status-update" data-project-id="${project.id}" data-rfi-idx="${trueIdx}" style="font-size: 0.75rem; padding: 4px; font-weight: bold; color: ${rfi.status === 'Open' ? 'var(--text-danger)' : rfi.status === 'Answered' ? 'var(--text-success)' : 'var(--text-muted)'};">
                          <option value="Open" style="color: var(--text-danger);" ${rfi.status === 'Open' ? 'selected' : ''}>Mở (Open)</option>
                          <option value="Answered" style="color: var(--text-success);" ${rfi.status === 'Answered' ? 'selected' : ''}>Đã trả lời</option>
                          <option value="Closed" style="color: var(--text-muted);" ${rfi.status === 'Closed' ? 'selected' : ''}>Đóng (Closed)</option>
                        </select>
                      </td>
                      <td>
                        <span class="text-xs ${isOverdue ? 'text-danger font-bold' : 'text-muted'}">${formatDate(rfi.dueDate)}${isOverdue ? ' ⚠️' : ''}</span>
                      </td>
                      <td>
                        <div class="flex gap-xs">
                          <button class="btn btn-sm btn-quick-log-rfi" 
                            data-project-id="${project.id}" 
                            data-rfi-idx="${trueIdx}"
                            style="background: #0ea5e9; color: white; border: none; font-size: 0.75rem; padding: 4px 8px; font-weight: 600; display: flex; align-items: center; gap: 4px; border-radius: 4px;"
                            title="Ghi nhận giờ xử lý RFI này">
                            ⏱️ Ghi giờ
                          </button>
                          <button class="btn btn-outline btn-sm btn-view-rfi-detail" data-project-id="${project.id}" data-rfi-idx="${trueIdx}" style="font-size: 0.75rem; padding: 4px 8px;">Chi tiết</button>
                        </div>
                      </td>
                    </tr>
                    `}).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- Bảng Task công việc -->
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 32%;">Công việc</th>
                  <th style="width: 15%;">Tiến độ hiện tại</th>
                  <th style="width: 18%;">Kéo tiến độ</th>
                  <th style="width: 12%;">Hạn chót</th>
                  <th style="width: 23%;">Hành động</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">
                      Bạn chưa được gán nhiệm vụ cụ thể nào, nhưng bạn đang có mặt trong Đội ngũ dự án này.
                    </td>
                  </tr>
                ` : tasks.map((task, idx) => {
                  const trueTaskIdx = project.tasks.indexOf(task);
                  const isOverdue = new Date(task.dueDate) < new Date() && task.progress < 100;
                  const isComplete = task.progress >= 100;
                  
                  // Tính tổng giờ thực tế đã làm cho task này
                  const totalTaskActual = (timesheets || []).filter(ts => {
                    const matchUser = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
                    const matchProj = ts.projectId === project.id;
                    const matchTask = ts.taskId === (task.id || `t_${trueTaskIdx}`) || (task.id && ts.taskId === task.id) || ts.taskId === `t_${trueTaskIdx}`;
                    return matchUser && matchProj && matchTask && ts.isActual;
                  }).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

                  return `
                    <tr style="transition: background 0.2s;" ${isComplete ? 'class="completed-row"' : ''}>
                      <td>
                        <div class="font-semibold ${isComplete ? 'text-muted' : ''}">${isComplete ? '✅ ' : ''}${task.name}</div>
                        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                          ${task.segmentIdx !== undefined && task.segmentIdx !== null && project.segments?.[task.segmentIdx] ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle);">
                              🏷️ ${project.segments[task.segmentIdx].name}${task.subSegmentIdx !== undefined && task.subSegmentIdx !== null && project.segments[task.segmentIdx].subSegments?.[task.subSegmentIdx] ? ` / ${project.segments[task.segmentIdx].subSegments[task.subSegmentIdx].name}` : ''}
                            </span>
                          ` : ''}
                          ${task.milestoneIdx !== undefined && project.milestones?.[task.milestoneIdx] ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle);">
                              🎯 ${project.milestones[task.milestoneIdx].name}
                            </span>
                          ` : ''}
                          ${totalTaskActual > 0 ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);" title="Tổng giờ thực tế đã làm">
                              ⏱️ ${totalTaskActual}h đã làm
                            </span>
                          ` : ''}
                        </div>
                      </td>
                      <td>
                        <div class="flex items-center gap-sm">
                          <div class="progress-bar" style="width: 75px;">
                            <div class="progress-bar-fill ${task.progress >= 80 ? 'green' : task.progress >= 40 ? '' : 'orange'}" style="width: ${task.progress}%;"></div>
                          </div>
                          <span class="text-xs font-bold">${task.progress}%</span>
                        </div>
                      </td>
                      <td>
                        ${isComplete ? `
                          <span class="badge green" style="font-size: 0.75rem;">Đã hoàn thành</span>
                        ` : `
                          <div class="flex items-center gap-xs">
                            <input type="range" 
                              class="my-task-progress" 
                              data-project-id="${project.id}" 
                              data-task-idx="${trueTaskIdx}" 
                              min="0" max="100" step="5" 
                              value="${task.progress}" 
                              style="width: 85px; accent-color: var(--accent-primary);">
                            <span class="text-xs font-bold my-task-progress-label" style="width: 32px; text-align: right;">${task.progress}%</span>
                          </div>
                        `}
                      </td>
                      <td>
                        <span class="text-xs ${isOverdue ? 'text-danger font-bold' : 'text-muted'}">
                          ${formatDate(task.dueDate)}${isOverdue ? ' ⚠️' : ''}
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-xs" style="flex-wrap: nowrap;">
                          <!-- NÚT GHI GIỜ TRỰC TIẾP -->
                          <button class="btn btn-sm btn-quick-log-task" 
                            data-project-id="${project.id}" 
                            data-task-idx="${trueTaskIdx}"
                            style="background: #10b981; color: white; border: none; font-size: 0.75rem; padding: 4px 8px; font-weight: 600; display: flex; align-items: center; gap: 4px; border-radius: 4px; box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);"
                            title="Ghi nhận giờ làm việc cho công việc này">
                            ⏱️ Ghi giờ
                          </button>
                          <button class="btn btn-outline btn-sm btn-view-task-detail" 
                            data-project-id="${project.id}" 
                            data-task-idx="${trueTaskIdx}"
                            style="font-size: 0.75rem; padding: 4px 8px;">
                            Chi tiết
                          </button>
                          ${isComplete ? '' : `
                            <button class="btn btn-primary btn-sm btn-save-progress" 
                              data-project-id="${project.id}" 
                              data-task-idx="${trueTaskIdx}"
                              style="font-size: 0.75rem; padding: 4px 8px;">
                              Lưu %
                            </button>
                          `}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      `}

      <!-- Timesheet nhanh tổng quát -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">⏱️ Ghi nhận giờ làm việc tự do / Việc chung</h3>
        </div>
        <div style="padding: 16px;">
          <div class="flex gap-md items-end flex-wrap">
            <div style="flex: 1; min-width: 130px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Ngày làm</label>
              <input type="date" class="form-input" id="ts-date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%;">
            </div>
            <div style="flex: 2; min-width: 200px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Dự án</label>
              <select class="form-select" id="ts-project">
                <option value="">-- Chọn dự án --</option>
                ${myAssignments.map(({ project }) => `<option value="${project.id}">${project.name}</option>`).join('')}
              </select>
            </div>
            <div style="flex: 2; min-width: 200px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Công việc / Hạng mục</label>
              <select class="form-select" id="ts-task" disabled>
                <option value="">-- Vui lòng chọn dự án trước --</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 90px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Số giờ</label>
              <input type="number" class="form-input" id="ts-hours" min="0.5" max="24" step="0.5" value="8" style="width: 100%; font-weight: bold;">
            </div>
            <div style="flex: 2; min-width: 150px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Ghi chú (tùy chọn)</label>
              <input type="text" class="form-input" id="ts-note" placeholder="VD: Rà soát mô hình dầm..." style="width: 100%;">
            </div>
            <button class="btn btn-primary" id="btn-log-time" style="white-space: nowrap; background: #10b981; border-color: #10b981;">
              ➕ Ghi nhận
            </button>
          </div>
        </div>
      </div>

      <!-- Lịch sử timesheet gần đây -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <h3 class="card-title">📋 Lịch sử ghi giờ gần đây</h3>
          <div class="flex gap-xs" style="align-items: center;">
            <button class="btn btn-sm ${currentTimesheetFilter === 'week' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="week">Tuần này</button>
            <button class="btn btn-sm ${currentTimesheetFilter === 'today' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="today">Hôm nay</button>
            <button class="btn btn-sm ${currentTimesheetFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="all">Tất cả</button>
          </div>
        </div>
        ${renderRecentTimesheets(userEmail, userName, myRecord?.name, currentTimesheetFilter)}
      </div>
    </div>
  `;
}

/**
 * TÍNH TOÁN DỮ LIỆU TUẦN CHO BẢNG CHẤM CÔNG (T2 -> CN)
 */
function getWeeklyTimesheetData(userEmail, userName, personId, timesheets) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = CN, 1 = T2
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const fullDayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  
  let weekActualHours = 0;
  let weekPlannedHours = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const dayRecords = (timesheets || []).filter(ts => {
      const match = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
      return match && (ts.dateString === dateStr || ts.date === dateStr);
    });

    const actual = dayRecords.filter(t => t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    const planned = dayRecords.filter(t => !t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

    weekActualHours += actual;
    weekPlannedHours += planned;

    const isToday = dateStr === todayStr;
    const isPast = d < now && !isToday;

    days.push({
      dateStr,
      shortLabel: dayLabels[i],
      fullLabel: fullDayLabels[i],
      dateFormatted: `${d.getDate()}/${d.getMonth() + 1}`,
      actualHours: actual,
      plannedHours: planned,
      isToday,
      isPast,
      isWeekend: i >= 5
    });
  }

  const completionPct = Math.min(100, Math.round((weekActualHours / 40) * 100));

  return {
    days,
    weekActualHours,
    weekPlannedHours,
    targetHours: 40,
    completionPct
  };
}

/**
 * HIỂN THỊ STRIP CHẤM CÔNG TUẦN NÀY
 */
function renderWeeklyTimesheetStrip(weekStats) {
  const { days, weekActualHours, weekPlannedHours, completionPct } = weekStats;

  return `
    <div class="card mb-lg" style="padding: 16px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); background: var(--bg-card);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            <span>📅 Chấm công tuần này</span>
            <span class="badge ${weekActualHours >= 40 ? 'green' : weekActualHours >= 20 ? 'blue' : 'orange'}" style="font-size: 0.75rem;">
              ${weekActualHours}h / 40h (${completionPct}%)
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Kế hoạch PM phân công: <strong>${weekPlannedHours}h</strong> · Mục tiêu chuẩn: <strong>40h/tuần</strong>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="progress-bar" style="width: 140px; height: 8px;">
            <div class="progress-bar-fill ${weekActualHours >= 40 ? 'green' : ''}" style="width: ${completionPct}%;"></div>
          </div>
          <span style="font-size: 0.8rem; font-weight: bold; color: ${weekActualHours >= 40 ? 'var(--text-success)' : 'var(--text-primary)'};">${completionPct}%</span>
        </div>
      </div>

      <!-- 7 Days Grid -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
        ${days.map(d => {
          let statusColor = 'var(--text-muted)';
          let statusBg = 'var(--bg-tertiary)';
          let statusBorder = 'var(--border-subtle)';
          let statusText = 'Chưa điền';

          if (d.actualHours >= 8) {
            statusColor = '#10b981';
            statusBg = 'rgba(16, 185, 129, 0.08)';
            statusBorder = '#10b981';
            statusText = 'Đủ 8h';
          } else if (d.actualHours > 0) {
            statusColor = '#f59e0b';
            statusBg = 'rgba(245, 158, 11, 0.08)';
            statusBorder = '#f59e0b';
            statusText = 'Bán phần';
          } else if (d.isPast || d.isToday) {
            if (!d.isWeekend) {
              statusColor = '#ef4444';
              statusBg = 'rgba(239, 68, 68, 0.06)';
              statusBorder = 'rgba(239, 68, 68, 0.3)';
              statusText = 'Chưa ghi ⚠️';
            }
          }

          return `
            <div class="weekly-day-card" 
                 data-date="${d.dateStr}" 
                 style="background: ${statusBg}; border: 1.5px solid ${d.isToday ? 'var(--accent-primary)' : statusBorder}; border-radius: 8px; padding: 8px 6px; text-align: center; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; position: relative;"
                 onmouseover="this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.transform='translateY(0)'"
                 title="Bấm để chọn ngày ${d.dateFormatted}">
              ${d.isToday ? `
                <div style="position: absolute; top: -6px; right: -4px; background: var(--accent-primary); color: white; font-size: 0.55rem; padding: 1px 4px; border-radius: 4px; font-weight: bold;">Hôm nay</div>
              ` : ''}
              <div style="font-size: 0.75rem; font-weight: 700; color: ${d.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'};">
                ${d.shortLabel}
              </div>
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-bottom: 2px;">
                ${d.dateFormatted}
              </div>
              <div style="font-size: 1.05rem; font-weight: 800; color: ${statusColor};">
                ${d.actualHours > 0 ? d.actualHours + 'h' : (d.isWeekend && d.actualHours === 0 ? '—' : '0h')}
              </div>
              <div style="font-size: 0.62rem; color: var(--text-muted); margin-top: 2px;">
                ${d.plannedHours > 0 ? `KH: ${d.plannedHours}h` : statusText}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * HIỂN THỊ DANH SÁCH TIMESHEET GẦN ĐÂY
 */
function renderRecentTimesheets(email, displayName, personnelName, filter = 'week') {
  const { timesheets, projects } = getState();
  const todayStr = new Date().toISOString().split('T')[0];

  // Tính ngày đầu tuần (Thứ 2)
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().split('T')[0];

  let myTimesheets = (timesheets || []).filter(ts => 
    ts.email === email || ts.userName === displayName || ts.userName === personnelName
  );

  // Áp dụng bộ lọc
  if (filter === 'today') {
    myTimesheets = myTimesheets.filter(ts => (ts.dateString === todayStr || ts.date === todayStr));
  } else if (filter === 'week') {
    myTimesheets = myTimesheets.filter(ts => {
      const d = ts.dateString || ts.date;
      return d >= mondayStr;
    });
  }

  // Sắp xếp ngày mới nhất lên đầu
  myTimesheets.sort((a, b) => new Date(b.dateString || b.date) - new Date(a.dateString || a.date));

  const totalFilteredHours = myTimesheets.filter(t => t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  if (myTimesheets.length === 0) {
    return `<div class="text-sm text-muted" style="padding: 24px; text-align: center;">Chưa có bản ghi nào trong mốc thời gian này. Hãy bấm <strong>⏱️ Ghi giờ</strong> trên công việc để bắt đầu!</div>`;
  }

  return `
    <div>
      <div style="padding: 10px 16px; background: var(--bg-tertiary); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
        <span style="color: var(--text-secondary);">Hiển thị <strong>${myTimesheets.length}</strong> bản ghi</span>
        <span style="font-weight: bold; color: #10b981;">Tổng giờ thực tế: ${totalFilteredHours}h</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">Ngày</th>
            <th style="width: 35%;">Dự án & Nhiệm vụ</th>
            <th style="width: 15%;">Loại giờ</th>
            <th style="width: 12%;">Số giờ</th>
            <th style="width: 18%;">Ghi chú</th>
            <th style="width: 5%;"></th>
          </tr>
        </thead>
        <tbody>
          ${myTimesheets.map(ts => {
            const proj = (projects || []).find(p => p.id === ts.projectId);
            const isActual = ts.isActual !== false;
            const { currentUserRole, currentUser } = getState();
            const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole || currentUser?.role);
            const canDelete = isActual || isManager;
            return `
              <tr>
                <td class="text-sm font-semibold">${formatDate(ts.dateString || ts.date)}</td>
                <td class="text-sm">
                  <div style="font-weight: 600; color: var(--text-primary);">${proj ? proj.name : (ts.projectName || ts.projectId)}</div>
                  ${(() => {
                    if (ts.taskId && ts.taskId.startsWith('rfi_')) {
                      const idx = parseInt(ts.taskId.replace('rfi_', ''), 10);
                      const rfi = (proj?.rfis || []).find(r => r.id === ts.taskId) || proj?.rfis?.[idx];
                      return `<div style="font-size: 0.72rem; color: #0ea5e9; margin-top: 2px;">↳ Xử lý RFI: ${rfi ? rfi.title : (ts.taskName || ts.taskId)}</div>`;
                    }
                    if (ts.taskId && ts.taskId.startsWith('t_') && ts.taskId !== 't_general') {
                      let task = (proj?.tasks || []).find(x => x.id === ts.taskId);
                      if (!task) {
                        const idx = parseInt(ts.taskId.replace('t_', ''), 10);
                        if (!isNaN(idx)) task = proj?.tasks?.[idx];
                      }
                      return `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">↳ Task: ${task ? task.name : (ts.taskName || ts.taskId)}</div>`;
                    }
                    if (ts.taskName) {
                      return `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">↳ Task: ${ts.taskName}</div>`;
                    }
                    return '<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">↳ Công việc chung</div>';
                  })()}
                </td>
                <td class="text-sm">
                  <span class="badge ${isActual ? 'green' : 'blue'}" style="font-size: 0.7rem;">
                    ${isActual ? 'Thực tế' : 'Kế hoạch'} ${ts.isOT ? '(OT)' : ''}
                  </span>
                </td>
                <td class="text-sm font-bold" style="color: ${isActual ? '#10b981' : 'var(--text-primary)'}; font-size: 0.95rem;">
                  ${ts.hours}h
                </td>
                <td class="text-sm text-muted">${ts.note || ts.comment || '—'}</td>
                <td class="text-sm text-center">
                  ${canDelete ? `
                    <button class="btn btn-ghost btn-sm text-danger btn-delete-timesheet" data-id="${ts.id}" title="${isActual ? 'Xóa bản ghi giờ thực tế' : 'Xóa bản ghi kế hoạch'}" style="padding: 2px 6px;">
                      🗑️
                    </button>
                  ` : `
                    <span title="Kế hoạch do Quản lý phân công (nhân sự không thể tự xóa)" style="font-size: 0.85rem; opacity: 0.35; cursor: not-allowed; display: inline-block;">
                      🔒
                    </span>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * MODAL GHI GIỜ NHANH (QUICK LOG MODAL)
 */
function openQuickLogModal({ project, task, taskIdx, isRfi = false, rfiIdx = null }) {
  const { timesheets, personnel, currentUserAuth, currentUser } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  const itemName = isRfi ? (project.rfis?.[rfiIdx]?.title || 'RFI') : (task.name || 'Công việc');
  const taskId = isRfi ? `rfi_${rfiIdx}` : (task.id || `t_${taskIdx}`);

  // Tính tổng giờ tích luỹ đã làm cho task này
  const totalTaskLogged = (timesheets || []).filter(ts => {
    const matchUser = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
    return matchUser && ts.projectId === project.id && (ts.taskId === taskId || (task && task.id && ts.taskId === task.id)) && ts.isActual;
  }).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Tìm xem ngày hôm nay đã có ghi chép thực tế nào cho task này chưa
  const existingActual = (timesheets || []).find(ts => {
    const matchUser = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
    return matchUser && ts.projectId === project.id && (ts.taskId === taskId || (task && task.id && ts.taskId === task.id)) && (ts.dateString === todayStr || ts.date === todayStr) && ts.isActual;
  });

  // Tìm giờ kế hoạch hôm nay (nếu có)
  const getPlannedForDate = (dateVal) => {
    const plan = (timesheets || []).find(ts => {
      const matchUser = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
      return matchUser && ts.projectId === project.id && (ts.taskId === taskId || (task && task.id && ts.taskId === task.id)) && (ts.dateString === dateVal || ts.date === dateVal) && !ts.isActual;
    });
    if (plan && plan.hours) return Number(plan.hours);
    if (task && task.dailyHours_planned && task.dailyHours_planned[dateVal]) return Number(task.dailyHours_planned[dateVal]);
    return 0;
  };

  const initialPlannedH = getPlannedForDate(todayStr);
  const defaultHours = existingActual ? existingActual.hours : (initialPlannedH > 0 ? initialPlannedH : 8);

  const contentHTML = `
    <div class="quick-log-modal-body" style="padding: 4px 0;">
      <!-- Header Info Banner -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
          <span class="badge blue" style="font-size: 0.72rem;">📁 ${project.name}</span>
          ${isRfi ? '<span class="badge orange" style="font-size: 0.72rem;">❓ Xử lý RFI</span>' : '<span class="badge green" style="font-size: 0.72rem;">📋 Công việc</span>'}
          ${task?.segmentIdx !== undefined && project.segments?.[task.segmentIdx] ? `
            <span class="badge" style="font-size: 0.72rem; background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-subtle);">
              🏷️ ${project.segments[task.segmentIdx].name}
            </span>
          ` : ''}
        </div>
        <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 6px; line-height: 1.3;">
          ${itemName}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px; display: flex; gap: 16px;">
          <span>Tích luỹ đã làm: <strong style="color: #10b981; font-size: 0.85rem;">${totalTaskLogged}h</strong></span>
          ${!isRfi ? `<span>Tiến độ hiện tại: <strong>${task.progress}%</strong></span>` : ''}
        </div>
      </div>

      <!-- Form Inputs -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Date Selector -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="text-xs font-semibold" style="color: var(--text-primary);">📅 Ngày làm việc</label>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-outline btn-xs btn-ql-preset-date" data-val="${todayStr}">Hôm nay</button>
              <button type="button" class="btn btn-outline btn-xs btn-ql-preset-date" data-val="${yesterdayStr}">Hôm qua</button>
            </div>
          </div>
          <input type="date" id="ql-input-date" class="form-input" value="${todayStr}" style="width: 100%;">
        </div>

        <!-- Planned hours indicator -->
        <div id="ql-planned-hint" style="font-size: 0.82rem; padding: 8px 12px; background: rgba(59, 130, 246, 0.08); border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2); color: var(--accent-primary); display: flex; align-items: center; justify-content: space-between;">
          <span>📋 Kế hoạch PM đã giao ngày này:</span>
          <strong id="ql-planned-val">${initialPlannedH > 0 ? initialPlannedH + ' giờ' : 'Chưa có kế hoạch cố định'}</strong>
        </div>

        <!-- Hours Input & Quick Buttons -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            ⏱️ Số giờ thực tế làm việc <span style="color: var(--text-danger);">*</span>
          </label>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="number" id="ql-input-hours" class="form-input" min="0.5" max="24" step="0.5" value="${defaultHours}" style="font-size: 1.15rem; font-weight: 700; width: 110px; text-align: center;">
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">giờ</span>
            <div style="flex: 1;"></div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
              <input type="checkbox" id="ql-input-isot" ${existingActual?.isOT ? 'checked' : ''} style="accent-color: var(--accent-primary);">
              <span>Làm ngoài giờ (OT)</span>
            </label>
          </div>

          <!-- Nút chọn nhanh giờ -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="1">1h</button>
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="2">2h</button>
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="3">3h</button>
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="4">4h (Nửa ngày)</button>
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="6">6h</button>
            <button type="button" class="btn btn-outline btn-xs btn-ql-hour-btn" data-hours="8" style="font-weight: bold; border-color: #10b981; color: #10b981;">8h (Cả ngày)</button>
          </div>
        </div>

        <!-- Cập nhật Tiến độ Task -->
        ${!isRfi ? `
          <div style="padding-top: 10px; border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="text-xs font-semibold" style="color: var(--text-primary);">📊 Cập nhật tiến độ hoàn thành</label>
              <span id="ql-progress-display" style="font-size: 0.95rem; font-weight: 700; color: var(--accent-primary);">${task.progress}%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <input type="range" id="ql-input-progress" min="0" max="100" step="5" value="${task.progress}" style="flex: 1; accent-color: var(--accent-primary);">
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-outline btn-xs btn-ql-progress-btn" data-add="10">+10%</button>
              <button type="button" class="btn btn-outline btn-xs btn-ql-progress-btn" data-add="25">+25%</button>
              <button type="button" class="btn btn-outline btn-xs btn-ql-progress-btn" data-set="100" style="color: #10b981; border-color: #10b981; font-weight: bold;">Hoàn thành 100% ✅</button>
            </div>
          </div>
        ` : `
          <!-- Trạng thái RFI -->
          <div style="padding-top: 10px; border-top: 1px solid var(--border-subtle);">
            <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">Trạng thái RFI sau khi xử lý</label>
            <select id="ql-input-rfi-status" class="form-select" style="width: 100%;">
              <option value="Open" ${project.rfis?.[rfiIdx]?.status === 'Open' ? 'selected' : ''}>Mở (Đang xử lý)</option>
              <option value="Answered" ${project.rfis?.[rfiIdx]?.status === 'Answered' ? 'selected' : ''}>Đã trả lời / Cung cấp thông tin</option>
              <option value="Closed" ${project.rfis?.[rfiIdx]?.status === 'Closed' ? 'selected' : ''}>Đã đóng (Closed)</option>
            </select>
          </div>
        `}

        <!-- Ghi chú nội dung -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            📝 Ghi chú công việc đã làm
          </label>
          <input type="text" id="ql-input-note" class="form-input" placeholder="VD: Dựng mô hình bản vẽ phân đoạn A, rà soát xung đột..." value="${existingActual?.note || existingActual?.comment || ''}" style="width: 100%;">
        </div>
      </div>

      <!-- Action buttons -->
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border-color);">
        <button type="button" class="btn btn-outline" id="ql-btn-cancel">Hủy</button>
        <button type="button" class="btn btn-primary" id="ql-btn-submit" style="background: #10b981; border-color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 6px; padding: 8px 18px;">
          💾 Lưu Giờ & Cập Nhật
        </button>
      </div>
    </div>
  `;

  openModal('⏱️ Ghi Nhận Giờ Làm Việc', contentHTML, { size: 'normal' });

  // Attach event handlers inside modal
  const dateInput = document.getElementById('ql-input-date');
  const hoursInput = document.getElementById('ql-input-hours');
  const isotInput = document.getElementById('ql-input-isot');
  const noteInput = document.getElementById('ql-input-note');
  const progressSlider = document.getElementById('ql-input-progress');
  const progressDisplay = document.getElementById('ql-progress-display');
  const plannedVal = document.getElementById('ql-planned-val');

  // Change date handler
  const handleDateChange = (newDateStr) => {
    dateInput.value = newDateStr;
    const planH = getPlannedForDate(newDateStr);
    plannedVal.textContent = planH > 0 ? `${planH} giờ` : 'Chưa có kế hoạch cố định';

    // Check if there is an existing actual log for that date
    const act = (timesheets || []).find(ts => {
      const matchUser = ts.userId === personId || ts.email === userEmail || ts.userName === userName;
      return matchUser && ts.projectId === project.id && (ts.taskId === taskId || (task && task.id && ts.taskId === task.id)) && (ts.dateString === newDateStr || ts.date === newDateStr) && ts.isActual;
    });

    if (act) {
      hoursInput.value = act.hours;
      noteInput.value = act.note || act.comment || '';
      isotInput.checked = act.isOT || false;
    } else if (planH > 0) {
      hoursInput.value = planH;
    }
  };

  dateInput?.addEventListener('change', (e) => handleDateChange(e.target.value));

  document.querySelectorAll('.btn-ql-preset-date').forEach(btn => {
    btn.addEventListener('click', (e) => handleDateChange(e.currentTarget.dataset.val));
  });

  // Hour preset buttons
  document.querySelectorAll('.btn-ql-hour-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      hoursInput.value = e.currentTarget.dataset.hours;
      // Highlight button
      document.querySelectorAll('.btn-ql-hour-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Progress slider & buttons
  if (progressSlider && progressDisplay) {
    progressSlider.addEventListener('input', (e) => {
      progressDisplay.textContent = `${e.target.value}%`;
    });

    document.querySelectorAll('.btn-ql-progress-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        let current = parseInt(progressSlider.value);
        if (e.currentTarget.dataset.set) {
          current = parseInt(e.currentTarget.dataset.set);
        } else if (e.currentTarget.dataset.add) {
          current = Math.min(100, current + parseInt(e.currentTarget.dataset.add));
        }
        progressSlider.value = current;
        progressDisplay.textContent = `${current}%`;
      });
    });
  }

  // Cancel button
  document.getElementById('ql-btn-cancel')?.addEventListener('click', closeModal);

  // Submit button
  document.getElementById('ql-btn-submit')?.addEventListener('click', () => {
    const selectedDate = dateInput.value;
    const hoursNum = parseFloat(hoursInput.value);
    const isOT = isotInput.checked;
    const noteVal = noteInput.value.trim();

    if (!selectedDate) {
      alert('Vui lòng chọn ngày làm việc');
      return;
    }
    if (isNaN(hoursNum) || hoursNum <= 0) {
      alert('Vui lòng nhập số giờ hợp lệ (> 0)');
      return;
    }

    const { timesheets: currentTs, projects: currentProjects } = getState();
    const updatedTs = [...(currentTs || [])];

    // Cập nhật hoặc thêm mới trong mảng timesheets
    const existingIdx = updatedTs.findIndex(t => {
      const matchUser = t.userId === personId || t.email === userEmail || t.userName === userName;
      const matchProj = t.projectId === project.id;
      const matchTask = t.taskId === taskId || (task && task.id && t.taskId === task.id) || t.taskId === `t_${taskIdx}`;
      return matchUser && matchProj && matchTask && (t.dateString === selectedDate || t.date === selectedDate) && t.isActual === true;
    });

    if (existingIdx >= 0) {
      updatedTs[existingIdx] = {
        ...updatedTs[existingIdx],
        hours: hoursNum,
        isOT: isOT,
        note: noteVal,
        comment: noteVal,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedTs.unshift({
        id: `ts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: personId,
        userName: userName,
        email: userEmail,
        projectId: project.id,
        projectName: project.name,
        taskId: taskId,
        taskName: itemName,
        dateString: selectedDate,
        date: selectedDate,
        hours: hoursNum,
        isActual: true,
        isOT: isOT,
        note: noteVal,
        comment: noteVal,
        createdAt: new Date().toISOString()
      });
    }

    // Cập nhật trên task của dự án
    const targetProject = currentProjects.find(p => p.id === project.id);
    if (targetProject) {
      if (!isRfi && targetProject.tasks && targetProject.tasks[taskIdx]) {
        const curTask = targetProject.tasks[taskIdx];
        if (!curTask.dailyHours_actual) curTask.dailyHours_actual = {};
        curTask.dailyHours_actual[selectedDate] = hoursNum;

        // Cập nhật tiến độ task nếu có
        if (progressSlider) {
          const newProg = parseInt(progressSlider.value);
          curTask.progress = newProg;
          curTask.status = newProg >= 100 ? 'completed' : 'active';
        }
        updateProject(project.id, { tasks: targetProject.tasks });
      } else if (isRfi && targetProject.rfis && targetProject.rfis[rfiIdx]) {
        const rfiStatusEl = document.getElementById('ql-input-rfi-status');
        if (rfiStatusEl) {
          targetProject.rfis[rfiIdx].status = rfiStatusEl.value;
          updateProject(project.id, { rfis: targetProject.rfis });
        }
      }
    }

    // Cập nhật State timesheets
    setState('timesheets', updatedTs);

    // Lưu snapshot an toàn bảo vệ dữ liệu
    saveLocalSnapshot(`Ghi nhận ${hoursNum}h làm cho ${itemName}`);

    closeModal();
    showToast(`✅ Đã lưu ${hoursNum}h làm việc cho "${itemName}"!`);
    refreshPage();
  });
}

export function init() {
  // 1. Cập nhật label khi kéo slider ở bảng
  document.querySelectorAll('.my-task-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const label = e.target.closest('td')?.querySelector('.my-task-progress-label');
      if (label) label.textContent = `${e.target.value}%`;
    });
  });

  // 2. Lưu tiến độ trực tiếp từ slider
  document.querySelectorAll('.btn-save-progress').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.projectId;
      const taskIdx = parseInt(e.currentTarget.dataset.taskIdx);
      const slider = document.querySelector(`.my-task-progress[data-project-id="${projectId}"][data-task-idx="${taskIdx}"]`);
      if (!slider) return;

      const newProgress = parseInt(slider.value);
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.tasks[taskIdx]) return;

      project.tasks[taskIdx].progress = newProgress;
      project.tasks[taskIdx].status = newProgress >= 100 ? 'completed' : 'active';
      
      updateProject(projectId, { tasks: project.tasks });
      saveLocalSnapshot(`Cập nhật tiến độ "${project.tasks[taskIdx].name}" → ${newProgress}%`);
      showToast(`✅ Đã cập nhật tiến độ "${project.tasks[taskIdx].name}" → ${newProgress}%`);
      refreshPage();
    });
  });

  // 3. NÚT GHI GIỜ NHANH CHO TASK
  document.querySelectorAll('.btn-quick-log-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.projectId;
      const taskIdx = parseInt(e.currentTarget.dataset.taskIdx);
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (project && project.tasks && project.tasks[taskIdx]) {
        openQuickLogModal({
          project,
          task: project.tasks[taskIdx],
          taskIdx,
          isRfi: false
        });
      }
    });
  });

  // 4. NÚT GHI GIỜ NHANH CHO RFI
  document.querySelectorAll('.btn-quick-log-rfi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.currentTarget.dataset.projectId;
      const rfiIdx = parseInt(e.currentTarget.dataset.rfiIdx);
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (project && project.rfis && project.rfis[rfiIdx]) {
        openQuickLogModal({
          project,
          task: null,
          taskIdx: null,
          isRfi: true,
          rfiIdx
        });
      }
    });
  });

  // 5. Cập nhật trạng thái RFI từ dropdown
  document.querySelectorAll('.rfi-status-update').forEach(select => {
    select.addEventListener('change', (e) => {
      const projectId = e.target.dataset.projectId;
      const rfiIdx = parseInt(e.target.dataset.rfiIdx);
      const newStatus = e.target.value;
      
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (project && project.rfis) {
         const rfi = project.rfis[rfiIdx];
         if (rfi) {
            rfi.status = newStatus;
            updateProject(projectId, { rfis: project.rfis });
            showToast(`✅ Đã cập nhật RFI thành "${newStatus}"`);
            refreshPage();
         }
      }
    });
  });

  // 6. Xem chi tiết RFI
  document.querySelectorAll('.btn-view-rfi-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.target.dataset.projectId;
      const rfiIdx = parseInt(e.target.dataset.rfiIdx);
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (project && project.rfis && project.rfis[rfiIdx]) {
         showItemDetailModal(project.rfis[rfiIdx], rfiIdx, 'rfi', project, refreshPage);
      }
    });
  });

  // 7. Xem chi tiết Task
  document.querySelectorAll('.btn-view-task-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const projectId = e.target.dataset.projectId;
      const taskIdx = parseInt(e.target.dataset.taskIdx);
      const { projects } = getState();
      const project = projects.find(p => p.id === projectId);
      if (project && project.tasks && project.tasks[taskIdx]) {
         showItemDetailModal(project.tasks[taskIdx], taskIdx, 'task', project, refreshPage);
      }
    });
  });

  // 8. Bảng chấm công tuần: Click vào ngày
  document.querySelectorAll('.weekly-day-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const dateStr = e.currentTarget.dataset.date;
      const tsDateEl = document.getElementById('ts-date');
      if (tsDateEl) {
        tsDateEl.value = dateStr;
        tsDateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tsDateEl.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.4)';
        setTimeout(() => { tsDateEl.style.boxShadow = ''; }, 1500);
      }
    });
  });

  // 9. Cập nhật danh sách công việc khi chọn dự án ở form dưới
  const tsProject = document.getElementById('ts-project');
  const tsTask = document.getElementById('ts-task');
  if (tsProject && tsTask) {
    tsProject.addEventListener('change', (e) => {
      const projectId = e.target.value;
      if (!projectId) {
        tsTask.innerHTML = '<option value="">-- Vui lòng chọn dự án trước --</option>';
        tsTask.disabled = true;
        return;
      }
      
      const { projects, currentUserAuth, currentUser, personnel } = getState();
      const proj = projects.find(p => p.id === projectId);
      
      const userEmail = currentUserAuth?.email || '';
      const person = (personnel || []).find(p => p.email === userEmail);
      const userName = person ? person.name : (currentUserAuth?.name || currentUser?.name);
      
      const userTasks = (proj?.tasks || []).filter(t => t.assignee === userName || (person && t.assignee === person.name));
      
      let optionsHtml = '<option value="t_general">-- Công việc chung (Không phân Task) --</option>';
      
      if (userTasks.length > 0) {
        optionsHtml += '<optgroup label="Công việc (Tasks)">';
        userTasks.forEach(t => {
          const trueIdx = proj.tasks.indexOf(t);
          let extraInfo = '';
          if (t.segmentIdx !== undefined && t.segmentIdx !== null && proj.segments?.[t.segmentIdx]) {
            extraInfo = ` - ${proj.segments[t.segmentIdx].name}`;
            if (t.subSegmentIdx !== undefined && t.subSegmentIdx !== null && proj.segments[t.segmentIdx].subSegments?.[t.subSegmentIdx]) {
              extraInfo += ` / ${proj.segments[t.segmentIdx].subSegments[t.subSegmentIdx].name}`;
            }
          }
          optionsHtml += `<option value="${t.id || ('t_' + trueIdx)}">${t.name}${extraInfo}</option>`;
        });
        optionsHtml += '</optgroup>';
      }
      
      const userRfis = (proj?.rfis || []).filter(r => r.assignee === userName || r.assignee === userEmail || (person && r.assignee === person.name));
      if (userRfis.length > 0) {
        optionsHtml += '<optgroup label="Xử lý RFI (Request For Information)">';
        userRfis.forEach(r => {
          const trueIdx = proj.rfis.indexOf(r);
          optionsHtml += `<option value="rfi_${trueIdx}">[RFI] ${r.code ? r.code + ' - ' : ''}${r.title}</option>`;
        });
        optionsHtml += '</optgroup>';
      }
      
      tsTask.innerHTML = optionsHtml;
      tsTask.disabled = false;
    });
  }

  // 10. Ghi nhận timesheet từ form tổng quát
  document.getElementById('btn-log-time')?.addEventListener('click', () => {
    const tsDateEl = document.getElementById('ts-date');
    const selectedDate = tsDateEl ? tsDateEl.value : new Date().toISOString().split('T')[0];
    const projectId = document.getElementById('ts-project').value;
    const taskId = document.getElementById('ts-task').value || 't_general';
    const hours = parseFloat(document.getElementById('ts-hours').value);
    const note = document.getElementById('ts-note').value.trim();

    if (!projectId) {
      showToast('⚠️ Vui lòng chọn dự án!', 'warning');
      return;
    }
    if (!hours || hours <= 0) {
      showToast('⚠️ Số giờ không hợp lệ!', 'warning');
      return;
    }
    if (!selectedDate) {
      showToast('⚠️ Vui lòng chọn ngày!', 'warning');
      return;
    }

    const { currentUserAuth, currentUser, timesheets, personnel, projects } = getState();
    const userEmail = currentUserAuth?.email || '';
    const person = (personnel || []).find(p => p.email === userEmail);
    const personId = person ? person.id : (currentUserAuth?.id || 'unknown');
    const userName = person ? person.name : (currentUserAuth?.name || currentUser?.name || 'Nhân viên');
    const proj = projects.find(p => p.id === projectId);

    const newEntry = {
      id: `ts-${Date.now()}`,
      userId: personId,
      email: userEmail,
      userName: userName,
      projectId: projectId,
      projectName: proj?.name || '',
      taskId: taskId,
      dateString: selectedDate,
      date: selectedDate,
      hours: hours,
      note: note,
      comment: note,
      isActual: true,
      createdAt: new Date().toISOString()
    };

    const updated = [newEntry, ...(timesheets || [])];
    setState('timesheets', updated);
    saveLocalSnapshot(`Ghi nhận ${hours}h làm việc`);

    showToast(`✅ Đã ghi nhận ${hours} giờ!`);
    refreshPage();
  });

  // 11. Xóa timesheet
  document.querySelectorAll('.btn-delete-timesheet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tsId = e.currentTarget.dataset.id;
      const { timesheets, projects, currentUserRole, currentUser } = getState();
      const targetTs = (timesheets || []).find(t => t.id === tsId);
      if (!targetTs) return;

      const isActual = targetTs.isActual !== false;
      const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole || currentUser?.role);

      // Chặn bảo vệ: Nếu là giờ kế hoạch và không phải cấp quản lý
      if (!isActual && !isManager) {
        showToast('⚠️ Bạn không thể tự xóa giờ Kế hoạch do Quản lý phân công!', 'warning');
        return;
      }

      const dStr = targetTs.dateString || targetTs.date;
      const confirmMsg = isActual 
        ? `Bạn có chắc chắn muốn xóa bản ghi giờ thực tế (${targetTs.hours}h ngày ${formatDate(dStr)})?`
        : `Bạn có chắc chắn muốn xóa bản ghi kế hoạch (${targetTs.hours}h ngày ${formatDate(dStr)})?`;

      if (confirm(confirmMsg)) {
        // 1. Cập nhật mảng timesheets trong state
        const updatedTimesheets = (timesheets || []).filter(t => t.id !== tsId);
        setState('timesheets', updatedTimesheets);

        // 2. Đồng thời xóa giờ trong task của dự án (dailyHours_actual / dailyHours_planned)
        if (targetTs.projectId && dStr) {
          const project = (projects || []).find(p => p.id === targetTs.projectId);
          if (project && project.tasks) {
            let taskUpdated = false;
            const updatedTasks = project.tasks.map(tsk => {
              const matchTask = tsk.id === targetTs.taskId || tsk.name === targetTs.taskName;
              if (matchTask) {
                if (isActual && tsk.dailyHours_actual && tsk.dailyHours_actual[dStr] !== undefined) {
                  delete tsk.dailyHours_actual[dStr];
                  taskUpdated = true;
                } else if (!isActual && tsk.dailyHours_planned && tsk.dailyHours_planned[dStr] !== undefined) {
                  delete tsk.dailyHours_planned[dStr];
                  taskUpdated = true;
                }
              }
              return tsk;
            });
            if (taskUpdated) {
              updateProject(project.id, { tasks: updatedTasks });
            }
          }
        }

        saveLocalSnapshot(isActual ? 'Xóa bản ghi giờ làm thực tế' : 'Xóa bản ghi giờ kế hoạch');
        showToast('🗑️ Đã xóa bản ghi giờ làm thành công!');
        refreshPage();
      }
    });
  });

  // 12. Bộ lọc lịch sử
  document.querySelectorAll('.btn-filter-ts').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentTimesheetFilter = e.currentTarget.dataset.filter;
      refreshPage();
    });
  });

  // 13. Nút refresh
  document.getElementById('btn-refresh-tasks')?.addEventListener('click', () => {
    refreshPage();
    showToast('🔄 Đã cập nhật lại dữ liệu!');
  });
}

function refreshPage() {
  const container = document.getElementById('page-content');
  if (container) {
    container.innerHTML = render();
    init();
  }
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('my-tasks-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'my-tasks-toast';
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
  toast.style.background = type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)';
  toast.style.color = '#fff';
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
  }, 3000);
}

export function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
