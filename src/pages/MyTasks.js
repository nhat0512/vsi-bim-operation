// ============================================
// MY TASKS — Trang báo cáo tiến độ cá nhân & Chấm công nhanh
// ============================================
import { getState, setState, subscribe, updateProject, deleteTimesheet, saveLocalSnapshot } from '../state.js';
import { showItemDetailModal } from '../components/ItemDetailModal.js';
import { formatDisplayName, formatLocalDate } from '../utils/formatters.js';
import { openModal, closeModal } from '../components/Modal.js';

let unsubscribe = null;
let currentTimesheetFilter = 'week'; // 'all' | 'today' | 'week'
let currentViewMode = 'table'; // 'table' | 'calendar'
let currentCalendarMonth = new Date().getMonth(); // 0 - 11
let currentCalendarYear = new Date().getFullYear();

export function render() {
  const { currentUser, currentUserAuth, projects, personnel, timesheets } = getState();
  const userEmail = (currentUserAuth?.email || currentUser?.email || '').toLowerCase().trim();

  // Tìm hồ sơ nhân sự của người đăng nhập (hỗ trợ cả primary email và secondary email)
  const myRecord = (personnel || []).find(p => 
    (p.email || '').toLowerCase() === userEmail || 
    (p.secondaryEmails || []).some(e => e.toLowerCase() === userEmail)
  ) || currentUser?.personnelRecord;

  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  // Bộ so khớp thông minh hỗ trợ mọi định danh của nhân sự
  const matcher = createMemberMatcher(userEmail, userName, myRecord);

  // Tìm tất cả dự án + task được giao cho người này
  const myAssignments = [];
  (projects || []).forEach(project => {
    // Các tasks được gán cho người này
    const tasks = (project.tasks || []).filter(t => matcher(t.assignee));
    
    // Các RFIs được gán cho người này
    const rfis = (project.rfis || []).filter(r => matcher(r.assignee));

    // Kiểm tra xem người này có nằm trong Đội ngũ dự án (Team) không
    const isTeamMember = (project.team || []).some(m => matcher(m.name) || matcher(m.email));
    const isLead = matcher(project.teamLead);

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
  const weekStats = getWeeklyTimesheetData(userEmail, userName, personId, timesheets, matcher, myAssignments);

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
                  let totalTaskActual = (timesheets || []).filter(ts => {
                    const matchUser = matcher(ts.userId) || matcher(ts.email) || matcher(ts.userName);
                    const matchProj = ts.projectId === project.id;
                    const matchTask = ts.taskId === (task.id || `t_${trueTaskIdx}`) || (task.id && ts.taskId === task.id) || ts.taskId === `t_${trueTaskIdx}`;
                    return matchUser && matchProj && matchTask && ts.isActual;
                  }).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

                  // Bổ sung thêm giờ từ task.dailyHours_actual nếu chưa được tính trong timesheets
                  if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
                    Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
                      const h = Number(hrs) || 0;
                      if (h > 0) {
                        const inTs = (timesheets || []).some(ts => 
                          (matcher(ts.userId) || matcher(ts.email) || matcher(ts.userName)) &&
                          ts.projectId === project.id &&
                          (ts.taskId === task.id || ts.taskId === `t_${trueTaskIdx}`) &&
                          (ts.dateString === dStr || ts.date === dStr) &&
                          ts.isActual
                        );
                        if (!inTs) totalTaskActual += h;
                      }
                    });
                  }

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
              <input type="date" class="form-input" id="ts-date" value="${formatLocalDate(new Date())}" style="width: 100%;">
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
            <div style="flex: 1.5; min-width: 130px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">🏷️ Bản vẽ / Sheet</label>
              <input type="text" class="form-input" id="ts-sheetno" placeholder="VD: DWG-14D-01" style="width: 100%;">
            </div>
            <div style="flex: 2; min-width: 150px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Ghi chú (tùy chọn)</label>
              <input type="text" class="form-input" id="ts-note" placeholder="VD: Rà soát mô hình dầm..." style="width: 100%;">
            </div>
            <button class="btn btn-primary" id="btn-log-time" style="white-space: nowrap; background: #10b981; border-color: #10b981;">
              ➕ Ghi nhận
            </button>
            <button type="button" class="btn btn-outline btn-quick-fill-today" data-date="${formatLocalDate(new Date())}" style="white-space: nowrap; border-color: #10b981; color: #10b981; font-weight: 600;" title="Tự động ghi nhận giờ theo phân công kế hoạch hôm nay">
              ⚡ Ghi theo KH hôm nay
            </button>
          </div>
        </div>
      </div>

      <!-- Lịch sử timesheet gần đây -->
      <div class="card">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h3 class="card-title" style="margin: 0;">📋 Lịch sử ghi giờ gần đây</h3>
            <!-- Switch Bảng / Lịch -->
            <div class="flex" style="background: var(--bg-tertiary); padding: 3px; border-radius: 8px; border: 1px solid var(--border-subtle); gap: 2px;">
              <button type="button" class="btn btn-xs ${currentViewMode === 'table' ? 'btn-primary' : 'btn-ghost'} btn-view-mode" data-mode="table" style="font-size: 0.75rem; padding: 4px 10px; font-weight: 600;">
                📋 Dạng Bảng
              </button>
              <button type="button" class="btn btn-xs ${currentViewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'} btn-view-mode" data-mode="calendar" style="font-size: 0.75rem; padding: 4px 10px; font-weight: 600;">
                🗓️ Dạng Lịch Tháng
              </button>
            </div>
          </div>
          <div class="flex gap-xs" style="align-items: center; flex-wrap: wrap;">
            ${currentViewMode === 'table' ? `
              <button class="btn btn-sm ${currentTimesheetFilter === 'week' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="week">Tuần này</button>
              <button class="btn btn-sm ${currentTimesheetFilter === 'today' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="today">Hôm nay</button>
              <button class="btn btn-sm ${currentTimesheetFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-filter-ts" data-filter="all">Tất cả</button>
            ` : `
              <button class="btn btn-outline btn-sm btn-cal-nav" data-dir="-1" title="Tháng trước">◀</button>
              <span style="font-weight: 700; font-size: 0.85rem; min-width: 120px; text-align: center; color: var(--text-primary);">
                Tháng ${currentCalendarMonth + 1}/${currentCalendarYear}
              </span>
              <button class="btn btn-outline btn-sm btn-cal-nav" data-dir="1" title="Tháng sau">▶</button>
              <button class="btn btn-ghost btn-sm btn-cal-today" style="font-size: 0.75rem;">Hôm nay</button>
            `}
            <div style="width: 1px; height: 22px; background: var(--border-subtle); margin: 0 4px;"></div>
            <!-- Nút Nạp file Sao lưu JSON -->
            <label class="btn btn-outline btn-sm" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.5); display: flex; align-items: center; gap: 4px; font-weight: 600; cursor: pointer; margin: 0;" title="Nạp file sao lưu BIM_TransPM_Backup_2026-10-15.json để khôi phục toàn bộ dữ liệu">
              📂 Nạp sao lưu JSON
              <input type="file" id="input-mytasks-import-backup" accept=".json" style="display: none;">
            </label>
            <!-- Nút Xuất Excel -->
            <button class="btn btn-outline btn-sm" id="btn-export-ts-excel" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4); display: flex; align-items: center; gap: 4px; font-weight: 600;" title="Xuất dữ liệu chấm công ra file Excel/CSV">
              📥 Xuất Excel
            </button>
          </div>
        </div>
        ${currentViewMode === 'table' 
          ? renderRecentTimesheets(userEmail, userName, myRecord?.name, currentTimesheetFilter, personId, matcher, myAssignments)
          : renderTimesheetCalendar(userEmail, userName, myRecord?.name, personId, currentCalendarYear, currentCalendarMonth, matcher, myAssignments)
        }
      </div>
    </div>
  `;
}

/**
 * TẠO BỘ SO KHỚP ĐỊNH DANH NHÂN SỰ TOÀN DIỆN (Hỗ trợ Email, Tên đầy đủ, Biệt danh, User ID)
 */
function createMemberMatcher(userEmail, userName, myRecord) {
  const emailLower = (userEmail || '').toLowerCase().trim();
  const nameLower = (userName || '').toLowerCase().trim();
  const recordEmail = (myRecord?.email || '').toLowerCase().trim();
  const recordName = (myRecord?.name || '').toLowerCase().trim();

  const myAliases = new Set([
    nameLower,
    emailLower,
    recordName,
    recordEmail,
    ...(myRecord?.secondaryEmails || []).map(e => (e || '').toLowerCase().trim())
  ]);

  const isThien = emailLower.includes('thienthan') || emailLower.includes('thien.than') || nameLower.includes('thiện') || recordName.includes('thiện');
  const isTai = emailLower.includes('tainguyen') || emailLower.includes('tai.nguyen') || nameLower.includes('tài') || recordName.includes('tài');
  const isThuan = emailLower.includes('minhthuan') || nameLower.includes('thuận') || recordName.includes('thuận');
  const isAn = emailLower.includes('an.nguyen') || nameLower.includes('nguyễn văn an') || recordName.includes('nguyễn văn an');
  const isNhat = emailLower.includes('nhattedisouth') || emailLower === 'admin@vsibim.com' || nameLower.includes('nhật') || recordName.includes('nhật');

  if (isThien) {
    myAliases.add('thiện');
    myAliases.add('thân nguyễn thái thiện');
    myAliases.add('thái thiện');
    myAliases.add('thienthannguyenthai');
    myAliases.add('thienthannguyenthai@gmail.com');
    myAliases.add('thien.than@vsibim.com');
    myAliases.add('u_thien');
  }
  if (isTai) {
    myAliases.add('tài');
    myAliases.add('nguyễn ngọc thanh tài');
    myAliases.add('thanh tài');
    myAliases.add('tainguyen6628@gmail.com');
    myAliases.add('tai.nguyen@vsibim.com');
    myAliases.add('u_tai');
  }
  if (isThuan) {
    myAliases.add('thuận');
    myAliases.add('minh thuận');
    myAliases.add('lương minh thuận');
    myAliases.add('minhthuan.uah@gmail.com');
    myAliases.add('thuan.luong@vsibim.com');
    myAliases.add('u_thuan');
  }
  if (isAn) {
    myAliases.add('an');
    myAliases.add('nguyễn văn an');
    myAliases.add('an.nguyen@bimvn.com');
    myAliases.add('u_an');
  }
  if (isNhat) {
    myAliases.add('nhật');
    myAliases.add('nguyễn thanh nhật');
    myAliases.add('thanh nhật');
    myAliases.add('admin@vsibim.com');
    myAliases.add('nhattedisouth@gmail.com');
    myAliases.add('u_nhat');
    myAliases.add('u_admin');
  }

  return (val) => {
    if (!val) return false;
    const v = val.toLowerCase().trim();
    if (myAliases.has(v)) return true;
    for (const alias of myAliases) {
      if (alias && alias.length >= 3 && (v.includes(alias) || alias.includes(v))) return true;
    }
    return false;
  };
}

/**
 * TÍNH TOÁN DỮ LIỆU TUẦN CHO BẢNG CHẤM CÔNG (T2 -> CN)
 */
function getWeeklyTimesheetData(userEmail, userName, personId, timesheets, matcher = null, myAssignments = []) {
  const isMatch = matcher || createMemberMatcher(userEmail, userName, null);
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
  const todayStr = formatLocalDate(new Date());

  const { deletedTimesheetIds } = getState();
  const delSet = new Set(deletedTimesheetIds || []);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(d);

    const dayRecords = (timesheets || []).filter(ts => {
      const match = ts.userId === personId || isMatch(ts.userId) || isMatch(ts.email) || isMatch(ts.userName);
      return match && (ts.dateString === dateStr || ts.date === dateStr);
    });

    let actual = dayRecords.filter(t => t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    let planned = dayRecords.filter(t => !t.isActual).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

    // Bổ sung thêm giờ từ các tasks được phân công cho nhân sự này (loại trừ giờ đã xóa)
    (myAssignments || []).forEach(({ project, tasks }) => {
      (tasks || []).forEach(task => {
        if (task.dailyHours_actual && task.dailyHours_actual[dateStr] !== undefined) {
          const h = Number(task.dailyHours_actual[dateStr]) || 0;
          const isDel = delSet.has(`syn-act-${task.id}-${dateStr}`) ||
                        delSet.has(`ts-act-${task.id}-${dateStr}`) ||
                        delSet.has(`syn-res-act-${task.id}-${dateStr}`) ||
                        delSet.has(`${personId || 'u_thien'}_${project.id}_${task.id}_${dateStr}_true`);
          const already = dayRecords.some(t => t.isActual && (t.taskId === task.id || t.taskName === task.name));
          if (!isDel && !already && h > 0) {
            actual += h;
          }
        }
        if (task.dailyHours_planned && task.dailyHours_planned[dateStr] !== undefined) {
          const h = Number(task.dailyHours_planned[dateStr]) || 0;
          const isDel = delSet.has(`syn-plan-${task.id}-${dateStr}`) ||
                        delSet.has(`ts-plan-${task.id}-${dateStr}`) ||
                        delSet.has(`syn-res-plan-${task.id}-${dateStr}`) ||
                        delSet.has(`${personId || 'u_thien'}_${project.id}_${task.id}_${dateStr}_false`);
          const already = dayRecords.some(t => !t.isActual && (t.taskId === task.id || t.taskName === task.name));
          if (!isDel && !already && h > 0) {
            planned += h;
          }
        }
      });
    });

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
  const todayDay = days.find(d => d.isToday);
  const todayPlannedH = todayDay ? todayDay.plannedHours : 0;
  const todayActualH = todayDay ? todayDay.actualHours : 0;
  const canQuickFillToday = todayPlannedH > 0 && todayActualH < todayPlannedH;

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
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          ${canQuickFillToday ? `
            <button class="btn btn-sm btn-quick-fill-today" data-date="${todayDay.dateStr}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; font-weight: 700; padding: 6px 14px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35); cursor: pointer; border-radius: 6px; transition: transform 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'" title="Ghi nhanh toàn bộ giờ làm theo phân công kế hoạch hôm nay (${todayPlannedH}h)">
              ⚡ Ghi nhanh ${todayPlannedH}h theo KH hôm nay
            </button>
          ` : ''}
          <div class="flex items-center gap-xs">
            <div class="progress-bar" style="width: 120px; height: 8px;">
              <div class="progress-bar-fill ${weekActualHours >= 40 ? 'green' : ''}" style="width: ${completionPct}%;"></div>
            </div>
            <span style="font-size: 0.8rem; font-weight: bold; color: ${weekActualHours >= 40 ? 'var(--text-success)' : 'var(--text-primary)'};">${completionPct}%</span>
          </div>
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
 * HIỂN THỊ DANH SÁCH TIMESHEET GẦN ĐÂY (Chỉ hiển thị giờ do chính nhân sự ghi nhận)
 */
function renderRecentTimesheets(email, displayName, personnelName, filter = 'week', personId = null, matcher = null, myAssignments = []) {
  const { timesheets, projects, deletedTimesheetIds } = getState();
  const delSet = new Set(deletedTimesheetIds || []);
  const todayStr = formatLocalDate(new Date());

  // Tính ngày đầu tuần (Thứ 2) và Chủ Nhật (Cuối tuần)
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayStr = formatLocalDate(monday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const sundayStr = formatLocalDate(sunday);

  const isMatch = matcher || createMemberMatcher(email, displayName, null);

  // Lọc chỉ những bản ghi DO CHÍNH NHÂN SỰ NÀY GHI (isActual === true)
  let myTimesheets = (timesheets || []).filter(ts => {
    const matchUser = isMatch(ts.userId) || isMatch(ts.email) || isMatch(ts.userName);
    return matchUser && (ts.isActual === true || ts.isActual === 'true' || ts.isActual === 1);
  });

  // Bổ sung các bản ghi thực tế từ dailyHours_actual của các tasks nếu chưa có trong timesheets
  (myAssignments || []).forEach(({ project, tasks }) => {
    (tasks || []).forEach(task => {
      if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
        Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
          const h = Number(hrs);
          if (h > 0) {
            const synId = `syn-act-${task.id}-${dStr}`;
            const tsActId = `ts-act-${task.id}-${dStr}`;
            const synResId = `syn-res-act-${task.id}-${dStr}`;
            const cKey = `${personId || 'u_thien'}_${project.id}_${task.id}_${dStr}_true`;
            if (delSet.has(synId) || delSet.has(tsActId) || delSet.has(synResId) || delSet.has(cKey)) {
              return;
            }
            const already = myTimesheets.some(ts => (ts.dateString === dStr || ts.date === dStr) && (ts.taskId === task.id || ts.taskName === task.name));
            if (!already) {
              myTimesheets.push({
                id: synId,
                userId: personId || 'u_thien',
                userName: displayName || personnelName || 'Nhân sự',
                email: email,
                projectId: project.id,
                projectName: project.name,
                taskId: task.id,
                taskName: task.name,
                dateString: dStr,
                date: dStr,
                hours: h,
                isActual: true,
                isOT: false,
                note: `Thực tế: ${task.name}`
              });
            }
          }
        });
      }
    });
  });

  // Áp dụng bộ lọc thời gian
  if (filter === 'today') {
    myTimesheets = myTimesheets.filter(ts => (ts.dateString === todayStr || ts.date === todayStr));
  } else if (filter === 'week') {
    myTimesheets = myTimesheets.filter(ts => {
      const d = ts.dateString || ts.date;
      return d >= mondayStr && d <= sundayStr;
    });
  }

  // Sắp xếp ngày mới nhất lên đầu
  myTimesheets.sort((a, b) => new Date(b.dateString || b.date) - new Date(a.dateString || a.date));

  const totalFilteredHours = myTimesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

  if (myTimesheets.length === 0) {
    return `<div class="text-sm text-muted" style="padding: 24px; text-align: center;">Chưa có bản ghi giờ thực tế nào trong mốc thời gian này. Hãy bấm <strong>⏱️ Ghi giờ</strong> trên danh sách công việc để bắt đầu!</div>`;
  }

  return `
    <div>
      <div style="padding: 10px 16px; background: var(--bg-tertiary); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
        <span style="color: var(--text-secondary);">Hiển thị <strong>${myTimesheets.length}</strong> bản ghi thực tế đã ghi</span>
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
                  ${ts.sheetNo ? `
                    <div style="margin-top: 3px;">
                      <span class="badge" style="font-size: 0.68rem; padding: 1px 6px; background: rgba(14, 165, 233, 0.1); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.25);">
                        🏷️ Sheet: ${ts.sheetNo}
                      </span>
                    </div>
                  ` : ''}
                </td>
                <td class="text-sm">
                  <span class="badge ${ts.isOT ? 'orange' : 'green'}" style="font-size: 0.7rem;">
                    ${ts.isOT ? 'Ngoài giờ (OT)' : 'Thực tế'}
                  </span>
                </td>
                <td class="text-sm font-bold" style="color: #10b981; font-size: 0.95rem;">
                  ${ts.hours}h
                </td>
                <td class="text-sm text-muted">${ts.note || ts.comment || '—'}</td>
                <td class="text-sm text-center" style="white-space: nowrap;">
                  <button class="btn btn-ghost btn-sm text-primary btn-edit-timesheet" data-id="${ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`}" title="Chỉnh sửa bản ghi giờ này" style="padding: 2px 6px; margin-right: 2px;">
                    ✏️
                  </button>
                  <button class="btn btn-ghost btn-sm text-danger btn-delete-timesheet" data-id="${ts.id || `${ts.userId}_${ts.projectId}_${ts.taskId || ''}_${ts.dateString || ts.date}_${!!ts.isActual}`}" title="Xóa bản ghi giờ thực tế này" style="padding: 2px 6px;">
                    🗑️
                  </button>
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
  if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * HIỂN THỊ TIMESHEET DẠNG LỊCH THÁNG (CALENDAR GRID VIEW)
 */
function renderTimesheetCalendar(email, displayName, personnelName, personId, year, month, matcher = null, myAssignments = []) {
  const { timesheets, projects, deletedTimesheetIds } = getState();
  const delSet = new Set(deletedTimesheetIds || []);
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const isMatch = matcher || createMemberMatcher(email, displayName, null);

  // Lọc tất cả giờ thực tế của user
  let myTimesheets = (timesheets || []).filter(ts => {
    const matchUser = isMatch(ts.userId) || isMatch(ts.email) || isMatch(ts.userName);
    return matchUser && (ts.isActual === true || ts.isActual === 'true' || ts.isActual === 1);
  });

  // Bổ sung các bản ghi thực tế từ dailyHours_actual của các tasks nếu chưa có trong timesheets
  (myAssignments || []).forEach(({ project, tasks }) => {
    (tasks || []).forEach(task => {
      if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
        Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
          const h = Number(hrs);
          if (h > 0) {
            const synId = `syn-act-${task.id}-${dStr}`;
            const tsActId = `ts-act-${task.id}-${dStr}`;
            const synResId = `syn-res-act-${task.id}-${dStr}`;
            const cKey = `${personId || 'u_thien'}_${project.id}_${task.id}_${dStr}_true`;
            if (delSet.has(synId) || delSet.has(tsActId) || delSet.has(synResId) || delSet.has(cKey)) {
              return;
            }
            const already = myTimesheets.some(ts => (ts.dateString === dStr || ts.date === dStr) && (ts.taskId === task.id || ts.taskName === task.name));
            if (!already) {
              myTimesheets.push({
                id: synId,
                userId: personId || 'u_thien',
                userName: displayName || personnelName || 'Nhân sự',
                email: email,
                projectId: project.id,
                projectName: project.name,
                taskId: task.id,
                taskName: task.name,
                dateString: dStr,
                date: dStr,
                hours: h,
                isActual: true,
                isOT: false,
                note: `Thực tế: ${task.name}`
              });
            }
          }
        });
      }
    });
  });

  // Số ngày trong tháng hiện tại và trước đó
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  
  // Thứ 2 là ngày bắt đầu tuần (0: T2, 1: T3 ... 6: CN)
  let startDayOfWeek = firstDay.getDay(); // 0 = CN, 1 = T2
  let startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // Thống kê trong tháng
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTs = myTimesheets.filter(t => (t.dateString || t.date || '').startsWith(currentMonthPrefix));
  const monthTotalH = monthTs.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const monthTotalOT = monthTs.filter(t => t.isOT).reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const activeDaysSet = new Set(monthTs.map(t => t.dateString || t.date));
  const activeDaysCount = activeDaysSet.size;

  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  // Tạo các ô lịch (Cells)
  const cells = [];

  // 1. Ngày của tháng trước (Padding)
  for (let i = startOffset - 1; i >= 0; i--) {
    const dNum = prevMonthTotalDays - i;
    cells.push({
      dayNum: dNum,
      isCurrentMonth: false,
      dateStr: '',
      hours: 0,
      items: []
    });
  }

  // 2. Ngày của tháng hiện tại
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay(); // 0 = CN, 6 = T7
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dateStr === todayStr;
    const isPast = dateObj < today && !isToday;

    const dayItems = monthTs.filter(t => (t.dateString === dateStr || t.date === dateStr));
    const dayHours = dayItems.reduce((s, t) => s + (Number(t.hours) || 0), 0);
    const dayOTHours = dayItems.filter(t => t.isOT).reduce((s, t) => s + (Number(t.hours) || 0), 0);

    cells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr,
      isToday,
      isPast,
      isWeekend,
      hours: dayHours,
      otHours: dayOTHours,
      items: dayItems
    });
  }

  // 3. Padding cuối tháng để đủ hàng (bội số của 7)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      dayNum: i,
      isCurrentMonth: false,
      dateStr: '',
      hours: 0,
      items: []
    });
  }

  return `
    <div>
      <!-- Thống kê tổng quan tháng -->
      <div style="padding: 12px 18px; background: var(--bg-tertiary); font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
          <span style="color: var(--text-secondary);">Tháng <strong>${month + 1}/${year}</strong>:</span>
          <span style="font-weight: 700; color: #10b981;">⏱️ Đã ghi: <strong>${monthTotalH}h</strong></span>
          ${monthTotalOT > 0 ? `<span style="font-weight: 700; color: #f59e0b;">🔥 Làm ngoài (OT): <strong>${monthTotalOT}h</strong></span>` : ''}
          <span style="color: var(--text-muted);">📅 Đã làm <strong>${activeDaysCount}</strong> ngày</span>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span> Đủ 8h</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span> Bán phần</span>
          <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span> Chưa ghi</span>
        </div>
      </div>

      <!-- Calendar Header -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); text-align: center; font-weight: 700; font-size: 0.75rem; color: var(--text-secondary);">
        ${dayLabels.map(l => `<div style="padding: 8px 4px;">${l}</div>`).join('')}
      </div>

      <!-- Calendar Grid -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border-subtle);">
        ${cells.map(c => {
          if (!c.isCurrentMonth) {
            return `
              <div style="min-height: 105px; background: var(--bg-card); opacity: 0.35; padding: 6px; font-size: 0.75rem; color: var(--text-muted);">
                ${c.dayNum}
              </div>
            `;
          }

          let badgeColor = '#64748b';
          let badgeBg = 'var(--bg-tertiary)';
          if (c.hours >= 8) {
            badgeColor = '#10b981';
            badgeBg = 'rgba(16, 185, 129, 0.12)';
          } else if (c.hours > 0) {
            badgeColor = '#f59e0b';
            badgeBg = 'rgba(245, 158, 11, 0.12)';
          } else if (c.isPast && !c.isWeekend) {
            badgeColor = '#ef4444';
            badgeBg = 'rgba(239, 68, 68, 0.08)';
          }

          return `
            <div class="calendar-day-cell" data-date="${c.dateStr}" style="min-height: 105px; background: var(--bg-card); padding: 6px; position: relative; transition: background 0.15s; border: ${c.isToday ? '2px solid var(--accent-primary)' : 'none'}; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-weight: 700; font-size: 0.8rem; color: ${c.isToday ? 'var(--accent-primary)' : 'var(--text-primary)'};">
                    ${c.dayNum} ${c.isToday ? '<span class="badge blue" style="font-size: 0.55rem; padding: 1px 4px;">Hôm nay</span>' : ''}
                  </span>
                  ${c.hours > 0 ? `
                    <span style="font-size: 0.72rem; font-weight: 800; color: ${badgeColor}; background: ${badgeBg}; padding: 1px 6px; border-radius: 4px;">
                      ${c.hours}h ${c.otHours > 0 ? `<small style="color: #f59e0b;">(+${c.otHours} OT)</small>` : ''}
                    </span>
                  ` : (c.isPast && !c.isWeekend ? `
                    <span style="font-size: 0.65rem; color: #ef4444; font-weight: 600;" title="Chưa ghi giờ ngày này">Chưa ghi ⚠️</span>
                  ` : '')}
                </div>

                <!-- Chips của các công việc đã làm -->
                <div style="display: flex; flex-direction: column; gap: 3px; max-height: 80px; overflow-y: auto;">
                  ${c.items.map(t => {
                    const p = (projects || []).find(proj => proj.id === t.projectId);
                    return `
                      <div class="cal-ts-chip btn-edit-timesheet" data-id="${t.id || `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`}" style="font-size: 0.68rem; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 4px; transition: transform 0.1s;" onmouseover="this.style.borderColor='var(--accent-primary)'" onmouseout="this.style.borderColor='var(--border-subtle)'" title="Bấm để chỉnh sửa: ${t.taskName} (${t.hours}h)">
                        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 78%;">
                          <strong style="color: var(--accent-primary); font-size: 0.65rem;">[${p?.code || p?.name?.substring(0, 4) || 'DA'}]</strong> ${t.taskName || 'Việc chung'}
                          ${t.sheetNo ? `<span style="color: #0284c7; font-size: 0.62rem; display: block;">🏷️ ${t.sheetNo}</span>` : ''}
                        </div>
                        <span style="font-weight: 700; color: #10b981; font-size: 0.7rem; white-space: nowrap;">${t.hours}h</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Nút thêm nhanh khi hover -->
              <div style="margin-top: 4px; text-align: right;">
                <button type="button" class="btn btn-ghost btn-xs btn-cal-add-log" data-date="${c.dateStr}" style="font-size: 0.65rem; padding: 1px 5px; opacity: 0.65; color: var(--accent-primary);" title="Ghi giờ cho ngày ${c.dayNum}">
                  ➕ Ghi giờ
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * XUẤT BẢNG CHẤM CÔNG CÁ NHÂN RA FILE EXCEL / CSV (UTF-8 BOM)
 */
function exportTimesheetToExcel() {
  const { timesheets, projects, personnel, currentUserAuth, currentUser } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  const matcher = createMemberMatcher(userEmail, userName, myRecord);
  let exportData = (timesheets || []).filter(ts => (matcher(ts.userId) || matcher(ts.email) || matcher(ts.userName)) && (ts.isActual === true || ts.isActual === 'true' || ts.isActual === 1));

  if (currentViewMode === 'calendar') {
    const monthPrefix = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}`;
    exportData = exportData.filter(t => (t.dateString || t.date || '').startsWith(monthPrefix));
  } else {
    const todayStr = formatLocalDate(new Date());
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = formatLocalDate(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = formatLocalDate(sunday);

    if (currentTimesheetFilter === 'today') {
      exportData = exportData.filter(t => (t.dateString === todayStr || t.date === todayStr));
    } else if (currentTimesheetFilter === 'week') {
      exportData = exportData.filter(t => {
        const d = t.dateString || t.date;
        return d >= mondayStr && d <= sundayStr;
      });
    }
  }

  if (exportData.length === 0) {
    showToast('⚠️ Không có dữ liệu giờ làm thực tế nào để xuất!', 'warning');
    return;
  }

  // Sắp xếp ngày tăng dần để báo cáo mạch lạc
  exportData.sort((a, b) => new Date(a.dateString || a.date) - new Date(b.dateString || b.date));

  // Tạo nội dung CSV
  const headers = [
    'STT',
    'Ngày làm việc',
    'Mã dự án',
    'Tên dự án',
    'Nhiệm vụ / Công việc',
    'Bản vẽ / Sheet No.',
    'Loại giờ',
    'Số giờ thực tế (h)',
    'Làm thêm (OT)',
    'Ghi chú nội dung',
    'Thời gian ghi nhận'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = exportData.map((ts, idx) => {
    const proj = (projects || []).find(p => p.id === ts.projectId);
    return [
      idx + 1,
      ts.dateString || ts.date,
      proj?.code || ts.projectId || '',
      proj?.name || ts.projectName || '',
      ts.taskName || 'Công việc chung',
      ts.sheetNo || '',
      ts.isOT ? 'Ngoài giờ (OT)' : 'Giờ chuẩn',
      ts.hours,
      ts.isOT ? 'Có' : 'Không',
      ts.note || ts.comment || '',
      ts.createdAt ? new Date(ts.createdAt).toLocaleString('vi-VN') : ''
    ].map(escapeCSV).join(',');
  });

  const totalHours = exportData.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const totalOT = exportData.filter(t => t.isOT).reduce((s, t) => s + (Number(t.hours) || 0), 0);

  // Thêm dòng tổng cộng
  rows.push(['', 'TỔNG CỘNG', '', '', '', '', '', totalHours, `OT: ${totalOT}h`, '', ''].map(escapeCSV).join(','));

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedName = userName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  const dateSuffix = currentViewMode === 'calendar' 
    ? `${currentCalendarYear}_${String(currentCalendarMonth + 1).padStart(2, '0')}`
    : currentTimesheetFilter;
  a.href = url;
  a.download = `Bang_Cham_Cong_${sanitizedName}_${dateSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`📥 Đã xuất thành công ${exportData.length} bản ghi ra file Excel!`);
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
  const todayStr = formatLocalDate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

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
        <!-- Mã Bản vẽ / Sheet No. -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            🏷️ Mã Bản vẽ / Sheet No. / Phân đoạn (tùy chọn)
          </label>
          <input type="text" id="ql-input-sheetno" class="form-input" list="ql-sheet-suggestions" placeholder="VD: DWG-14D-01, Km0-Km5, S-02..." value="${existingActual?.sheetNo || ''}" style="width: 100%;">
          <datalist id="ql-sheet-suggestions">
            ${(project.segments || []).map(s => `<option value="${s.name}">`).join('')}
            ${(project.drawingData || []).filter(d => !d.isHeader).map(d => `<option value="${d.content}">`).join('')}
          </datalist>
        </div>

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
      const sheetEl = document.getElementById('ql-input-sheetno');
      if (sheetEl) sheetEl.value = act.sheetNo || '';
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
    const sheetNoVal = document.getElementById('ql-input-sheetno')?.value.trim() || '';

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
        sheetNo: sheetNoVal,
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
        sheetNo: sheetNoVal,
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

/**
 * MODAL CHỈNH SỬA GIỜ LÀM VIỆC (EDIT TIMESHEET MODAL)
 */
function openEditTimesheetModal(tsId) {
  const { timesheets, projects, currentUserAuth, currentUser, personnel } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  let targetTs = (timesheets || []).find(t => {
    if (t.id === tsId) return true;
    const compKey = `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`;
    return compKey === tsId;
  });

  // Nếu targetTs chưa có (do synthetic ID), tìm từ projects
  if (!targetTs && (tsId.startsWith('syn-act-') || tsId.startsWith('syn-res-act-') || tsId.startsWith('ts-act-'))) {
    const dMatch = tsId.match(/\d{4}-\d{2}-\d{2}$/);
    const dStr = dMatch ? dMatch[0] : '';
    const taskId = tsId.replace(/^(syn-act-|syn-res-act-|ts-act-)/, '').replace(new RegExp(`-${dStr}$`), '');
    for (const p of (projects || [])) {
      const tsk = (p.tasks || []).find(t => t.id === taskId || t.name === taskId);
      if (tsk) {
        targetTs = {
          id: tsId,
          userId: personId,
          userName: userName,
          email: userEmail,
          projectId: p.id,
          projectName: p.name,
          taskId: tsk.id,
          taskName: tsk.name,
          dateString: dStr,
          date: dStr,
          hours: Number(tsk.dailyHours_actual?.[dStr]) || 0,
          isActual: true,
          isOT: false,
          note: `Thực tế: ${tsk.name}`
        };
        break;
      }
    }
  }

  if (!targetTs) {
    showToast('⚠️ Không tìm thấy bản ghi giờ làm!', 'warning');
    return;
  }

  const matcher = createMemberMatcher(userEmail, userName, myRecord);

  const proj = (projects || []).find(p => p.id === targetTs.projectId);
  let task = null;
  let isRfi = false;
  if (proj) {
    if (targetTs.taskId && targetTs.taskId.startsWith('rfi_')) {
      isRfi = true;
    } else {
      task = (proj.tasks || []).find(t => t.id === targetTs.taskId || t.name === targetTs.taskName);
      if (!task && targetTs.taskId && targetTs.taskId.startsWith('t_')) {
        const idx = parseInt(targetTs.taskId.replace('t_', ''), 10);
        if (!isNaN(idx)) task = proj.tasks[idx];
      }
    }
  }

  const currentDateVal = targetTs.dateString || targetTs.date;
  const currentHours = targetTs.hours || 0;
  const currentNote = targetTs.note || targetTs.comment || '';
  const isOT = targetTs.isOT || false;

  // Helper tạo danh sách tùy chọn Hạng mục / Nhiệm vụ theo dự án
  const buildTaskOptionsHtml = (selectedProject, currentSelectedTaskId, currentSelectedTaskName) => {
    if (!selectedProject) {
      return '<option value="">-- Vui lòng chọn dự án trước --</option>';
    }

    let optionsHtml = `<option value="t_general" ${currentSelectedTaskId === 't_general' ? 'selected' : ''}>🏢 -- Công việc chung (Không phân Task) --</option>`;

    const allTasks = selectedProject.tasks || [];
    const myTasks = allTasks.filter(t => matcher(t.assignee));
    const otherTasks = allTasks.filter(t => !matcher(t.assignee));

    const renderOption = (t) => {
      const trueIdx = allTasks.indexOf(t);
      const val = t.id || `t_${trueIdx}`;
      let extraInfo = '';
      if (t.segmentIdx !== undefined && t.segmentIdx !== null && selectedProject.segments?.[t.segmentIdx]) {
        extraInfo = ` - [${selectedProject.segments[t.segmentIdx].name}]`;
      }
      const isSelected = (val === currentSelectedTaskId) || (t.id && t.id === currentSelectedTaskId) || (currentSelectedTaskId === `t_${trueIdx}`) || (currentSelectedTaskName && t.name === currentSelectedTaskName);
      return `<option value="${val}" ${isSelected ? 'selected' : ''}>${t.name}${extraInfo} (${t.progress || 0}%)</option>`;
    };

    if (myTasks.length > 0) {
      optionsHtml += '<optgroup label="⭐ Công việc của tôi trong dự án">';
      myTasks.forEach(t => {
        optionsHtml += renderOption(t);
      });
      optionsHtml += '</optgroup>';
    }

    if (otherTasks.length > 0) {
      optionsHtml += '<optgroup label="📁 Các công việc khác trong dự án">';
      otherTasks.forEach(t => {
        optionsHtml += renderOption(t);
      });
      optionsHtml += '</optgroup>';
    }

    const rfis = selectedProject.rfis || [];
    if (rfis.length > 0) {
      optionsHtml += '<optgroup label="❓ Yêu cầu RFI (Request For Information)">';
      rfis.forEach((r, rIdx) => {
        const val = `rfi_${rIdx}`;
        const isSelected = (val === currentSelectedTaskId) || (r.code && currentSelectedTaskId?.includes(r.code)) || (r.title && currentSelectedTaskName?.includes(r.title));
        optionsHtml += `<option value="${val}" ${isSelected ? 'selected' : ''}>[RFI] ${r.code ? r.code + ' - ' : ''}${r.title} (${r.status || 'Open'})</option>`;
      });
      optionsHtml += '</optgroup>';
    }

    return optionsHtml;
  };

  const contentHTML = `
    <div class="edit-timesheet-modal" style="padding: 4px 0;">
      <!-- Khung chọn Dự án & Hạng mục công việc (Cho phép chỉnh sửa linh hoạt) -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">
            📁 Thông Tin Dự Án & Hạng Mục
          </span>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span id="edit-ts-type-badge" class="badge ${isRfi ? 'orange' : (task ? 'green' : 'blue')}" style="font-size: 0.72rem;">
              ${isRfi ? '❓ Xử lý RFI' : (task ? '📋 Công việc' : '🏢 Chung')}
            </span>
            ${targetTs.isOT ? '<span class="badge orange" style="font-size: 0.72rem;">Ngoài giờ (OT)</span>' : ''}
          </div>
        </div>

        <!-- Dropdown chọn Dự án -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 4px;">
            📁 Dự án <span style="color: var(--text-danger);">*</span>
          </label>
          <select id="edit-ts-project" class="form-select" style="width: 100%; font-weight: 600; font-size: 0.88rem;">
            ${(projects || []).map(p => `
              <option value="${p.id}" ${p.id === (proj?.id || targetTs.projectId) ? 'selected' : ''}>
                ${p.code ? p.code + ' - ' : ''}${p.name}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Dropdown chọn Hạng mục / Nhiệm vụ -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 4px;">
            📋 Hạng mục / Nhiệm vụ <span style="color: var(--text-danger);">*</span>
          </label>
          <select id="edit-ts-task" class="form-select" style="width: 100%; font-weight: 600; font-size: 0.88rem;">
            ${buildTaskOptionsHtml(proj, targetTs.taskId, targetTs.taskName)}
          </select>
        </div>
      </div>

      <!-- Form Inputs -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Ngày -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">📅 Ngày làm việc</label>
          <input type="date" id="edit-ts-date" class="form-input" value="${currentDateVal}" style="width: 100%;">
        </div>

        <!-- Số giờ -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            ⏱️ Số giờ làm việc thực tế <span style="color: var(--text-danger);">*</span>
          </label>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <input type="number" id="edit-ts-hours" class="form-input" min="0.5" max="24" step="0.5" value="${currentHours}" style="font-size: 1.15rem; font-weight: 700; width: 110px; text-align: center;">
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">giờ</span>
            <div style="flex: 1;"></div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; cursor: pointer; color: var(--text-secondary); background: var(--bg-tertiary); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-subtle);">
              <input type="checkbox" id="edit-ts-isot" ${isOT ? 'checked' : ''} style="accent-color: var(--accent-primary);">
              <span>Làm ngoài giờ (OT)</span>
            </label>
          </div>

          <!-- Nút chọn nhanh giờ -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="1">1h</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="2">2h</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="3">3h</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="4">4h (Nửa ngày)</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="6">6h</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-hour-btn" data-hours="8" style="font-weight: bold; border-color: #10b981; color: #10b981;">8h (Cả ngày)</button>
          </div>
        </div>

        <!-- Cập nhật Tiến độ Task nếu có task -->
        <div id="edit-ts-progress-container" style="padding-top: 10px; border-top: 1px solid var(--border-subtle); display: ${task ? 'block' : 'none'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="text-xs font-semibold" style="color: var(--text-primary);">📊 Cập nhật tiến độ hoàn thành</label>
            <span id="edit-ts-progress-val" style="font-size: 0.95rem; font-weight: 700; color: var(--accent-primary);">${task?.progress || 0}%</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <input type="range" id="edit-ts-progress" min="0" max="100" step="5" value="${task?.progress || 0}" style="flex: 1; accent-color: var(--accent-primary);">
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-outline btn-xs btn-edit-prog-btn" data-add="10">+10%</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-prog-btn" data-add="25">+25%</button>
            <button type="button" class="btn btn-outline btn-xs btn-edit-prog-btn" data-set="100" style="color: #10b981; border-color: #10b981; font-weight: bold;">Hoàn thành 100% ✅</button>
          </div>
        </div>

        <!-- Mã Bản vẽ / Sheet No. -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            🏷️ Mã Bản vẽ / Sheet No. / Phân đoạn (tùy chọn)
          </label>
          <input type="text" id="edit-ts-sheetno" class="form-input" list="edit-sheet-suggestions" placeholder="VD: DWG-14D-01, S-02..." value="${targetTs.sheetNo || ''}" style="width: 100%;">
          <datalist id="edit-sheet-suggestions">
            ${(proj?.segments || []).map(s => `<option value="${s.name}">`).join('')}
            ${(proj?.drawingData || []).filter(d => !d.isHeader).map(d => `<option value="${d.content}">`).join('')}
          </datalist>
        </div>

        <!-- Ghi chú nội dung -->
        <div>
          <label class="text-xs font-semibold" style="color: var(--text-primary); display: block; margin-bottom: 6px;">
            📝 Ghi chú công việc đã làm
          </label>
          <input type="text" id="edit-ts-note" class="form-input" placeholder="VD: Dựng mô hình bản vẽ phân đoạn A..." value="${currentNote}" style="width: 100%;">
        </div>
      </div>

      <!-- Action buttons -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
        <button type="button" class="btn btn-outline text-danger" id="edit-ts-btn-delete" style="display: flex; align-items: center; gap: 5px; border-color: rgba(239, 68, 68, 0.4); font-weight: 600;">
          🗑️ Xóa bản ghi
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline" id="edit-ts-btn-cancel">Hủy</button>
          <button type="button" class="btn btn-primary" id="edit-ts-btn-submit" style="background: #10b981; border-color: #10b981; font-weight: 600; display: flex; align-items: center; gap: 6px; padding: 8px 18px;">
            💾 Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  `;

  openModal('✏️ Chỉnh Sửa Giờ Làm Việc', contentHTML, { size: 'normal' });

  // Event handlers
  const projectSelect = document.getElementById('edit-ts-project');
  const taskSelect = document.getElementById('edit-ts-task');
  const typeBadge = document.getElementById('edit-ts-type-badge');
  const progressContainer = document.getElementById('edit-ts-progress-container');
  const sheetSuggestions = document.getElementById('edit-sheet-suggestions');

  const hoursInput = document.getElementById('edit-ts-hours');
  const dateInput = document.getElementById('edit-ts-date');
  const isotInput = document.getElementById('edit-ts-isot');
  const noteInput = document.getElementById('edit-ts-note');
  const progSlider = document.getElementById('edit-ts-progress');
  const progVal = document.getElementById('edit-ts-progress-val');

  // Hàm cập nhật trạng thái hiển thị của Task & Progress Slider
  const updateTaskSelectionState = () => {
    const pId = projectSelect ? projectSelect.value : '';
    const curProj = (projects || []).find(p => p.id === pId);
    const selectedVal = taskSelect ? taskSelect.value : '';

    if (selectedVal.startsWith('rfi_')) {
      if (typeBadge) {
        typeBadge.className = 'badge orange';
        typeBadge.textContent = '❓ Xử lý RFI';
      }
      if (progressContainer) progressContainer.style.display = 'none';
    } else if (selectedVal === 't_general' || !selectedVal) {
      if (typeBadge) {
        typeBadge.className = 'badge blue';
        typeBadge.textContent = '🏢 Chung';
      }
      if (progressContainer) progressContainer.style.display = 'none';
    } else {
      if (typeBadge) {
        typeBadge.className = 'badge green';
        typeBadge.textContent = '📋 Công việc';
      }
      if (progressContainer) progressContainer.style.display = 'block';

      if (curProj && curProj.tasks) {
        let tsk = curProj.tasks.find(t => t.id === selectedVal);
        if (!tsk && selectedVal.startsWith('t_')) {
          const idx = parseInt(selectedVal.replace('t_', ''), 10);
          tsk = curProj.tasks[idx];
        }
        if (tsk && progSlider && progVal) {
          progSlider.value = tsk.progress || 0;
          progVal.textContent = `${tsk.progress || 0}%`;
        }
      }
    }
  };

  // Sự kiện khi thay đổi Dự án
  projectSelect?.addEventListener('change', () => {
    const newPId = projectSelect.value;
    const curProj = (projects || []).find(p => p.id === newPId);
    if (taskSelect) {
      taskSelect.innerHTML = buildTaskOptionsHtml(curProj, '', '');
    }
    // Cập nhật gợi ý bản vẽ
    if (sheetSuggestions && curProj) {
      sheetSuggestions.innerHTML = `
        ${(curProj.segments || []).map(s => `<option value="${s.name}">`).join('')}
        ${(curProj.drawingData || []).filter(d => !d.isHeader).map(d => `<option value="${d.content}">`).join('')}
      `;
    }
    updateTaskSelectionState();
  });

  // Sự kiện khi thay đổi Hạng mục / Nhiệm vụ
  taskSelect?.addEventListener('change', () => {
    updateTaskSelectionState();
  });

  // Quick hour buttons
  document.querySelectorAll('.btn-edit-hour-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      hoursInput.value = e.currentTarget.dataset.hours;
      document.querySelectorAll('.btn-edit-hour-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Quick progress buttons
  if (progSlider && progVal) {
    progSlider.addEventListener('input', (e) => {
      progVal.textContent = `${e.target.value}%`;
    });
    document.querySelectorAll('.btn-edit-prog-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        let current = parseInt(progSlider.value);
        if (e.currentTarget.dataset.set) {
          current = parseInt(e.currentTarget.dataset.set);
        } else if (e.currentTarget.dataset.add) {
          current = Math.min(100, current + parseInt(e.currentTarget.dataset.add));
        }
        progSlider.value = current;
        progVal.textContent = `${current}%`;
      });
    });
  }

  // Cancel
  document.getElementById('edit-ts-btn-cancel')?.addEventListener('click', closeModal);

  // Delete from modal
  document.getElementById('edit-ts-btn-delete')?.addEventListener('click', () => {
    const isActual = targetTs.isActual !== false;
    const { currentUserRole, currentUser } = getState();
    const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole || currentUser?.role);
    if (!isActual && !isManager) {
      alert('Bạn không thể tự xóa giờ Kế hoạch do Quản lý phân công!');
      return;
    }
    const dStr = targetTs.dateString || targetTs.date;
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi ${isActual ? 'giờ thực tế' : 'giờ kế hoạch'} (${targetTs.hours}h ngày ${formatDate(dStr)})?`)) {
      deleteTimesheet(tsId);
      closeModal();
      showToast('🗑️ Đã xóa bản ghi giờ làm thành công!');
      refreshPage();
    }
  });

  // Submit / Lưu Thay Đổi với cam kết bảo toàn an toàn dữ liệu
  document.getElementById('edit-ts-btn-submit')?.addEventListener('click', () => {
    const newProjectId = projectSelect ? projectSelect.value : targetTs.projectId;
    const newTaskId = taskSelect ? taskSelect.value : targetTs.taskId;
    const newDate = dateInput.value;
    const newHours = parseFloat(hoursInput.value);
    const newIsOT = isotInput.checked;
    const newNote = noteInput.value.trim();
    const newSheetNo = document.getElementById('edit-ts-sheetno')?.value.trim() || '';

    if (!newProjectId) {
      alert('Vui lòng chọn dự án');
      return;
    }
    if (!newDate) {
      alert('Vui lòng chọn ngày làm việc');
      return;
    }
    if (isNaN(newHours) || newHours <= 0) {
      alert('Vui lòng nhập số giờ hợp lệ (> 0)');
      return;
    }

    const { timesheets: curTs, projects: allProjs } = getState();
    const updatedTs = [...(curTs || [])];

    const oldProjectId = targetTs.projectId;
    const oldTaskId = targetTs.taskId;
    const oldTaskName = targetTs.taskName;
    const oldDate = targetTs.dateString || targetTs.date;

    const oldProj = (allProjs || []).find(p => p.id === oldProjectId);
    const newProj = (allProjs || []).find(p => p.id === newProjectId);

    let newTaskName = '';
    let newTaskObj = null;

    if (newTaskId === 't_general') {
      newTaskName = 'Công việc chung';
    } else if (newTaskId.startsWith('rfi_')) {
      const rIdx = parseInt(newTaskId.replace('rfi_', ''), 10);
      const rfi = newProj?.rfis?.[rIdx];
      newTaskName = rfi ? `[RFI] ${rfi.code ? rfi.code + ' - ' : ''}${rfi.title}` : 'Xử lý RFI';
    } else {
      if (newProj && newProj.tasks) {
        newTaskObj = newProj.tasks.find(t => t.id === newTaskId);
        if (!newTaskObj && newTaskId.startsWith('t_')) {
          const idx = parseInt(newTaskId.replace('t_', ''), 10);
          newTaskObj = newProj.tasks[idx];
        }
      }
      newTaskName = newTaskObj ? newTaskObj.name : (targetTs.taskName || 'Công việc');
    }

    // 1. DỌN SẠCH GIỜ Ở TASK CŨ (NẾU CÓ THAY ĐỔI TASK HOẶC THAY ĐỔI DỰ ÁN HOẶC THAY ĐỔI NGÀY)
    let oldTaskObj = null;
    if (oldProj && oldProj.tasks) {
      oldTaskObj = oldProj.tasks.find(t => t.id === oldTaskId || t.name === oldTaskName);
      if (!oldTaskObj && oldTaskId && oldTaskId.startsWith('t_')) {
        const idx = parseInt(oldTaskId.replace('t_', ''), 10);
        oldTaskObj = oldProj.tasks[idx];
      }
    }

    const isTaskChanged = (oldProjectId !== newProjectId) || (oldTaskId !== newTaskId);
    const isDateChanged = oldDate !== newDate;

    if (oldTaskObj && (isTaskChanged || isDateChanged)) {
      if (oldTaskObj.dailyHours_actual && oldTaskObj.dailyHours_actual[oldDate] !== undefined) {
        delete oldTaskObj.dailyHours_actual[oldDate];
        updateProject(oldProj.id, { tasks: oldProj.tasks });
      }
    }

    // 2. GHI GIỜ VÀO TASK MỚI (NẾU CÓ TASK MỚI TRONG DỰ ÁN)
    if (newTaskObj) {
      if (!newTaskObj.dailyHours_actual) newTaskObj.dailyHours_actual = {};
      newTaskObj.dailyHours_actual[newDate] = newHours;
      if (progSlider && progressContainer && progressContainer.style.display !== 'none') {
        const newProgress = parseInt(progSlider.value);
        newTaskObj.progress = newProgress;
        newTaskObj.status = newProgress >= 100 ? 'completed' : 'active';
      }
      updateProject(newProj.id, { tasks: newProj.tasks });
    }

    // 3. NẾU BẢN GHI CŨ LÀ BẢN GHI SYNTHETIC (TỰ TẠO TỪ DAILYHOURS), ĐÁNH DẤU TOMBSTONE ĐỂ KHÔNG BỊ TRÙNG LẶP
    if (isTaskChanged || isDateChanged) {
      if (tsId.startsWith('syn-act-') || tsId.startsWith('syn-res-act-')) {
        const delSet = new Set([...(getState().deletedTimesheetIds || []), tsId]);
        if (oldTaskId && oldDate) {
          delSet.add(`syn-act-${oldTaskId}-${oldDate}`);
          delSet.add(`ts-act-${oldTaskId}-${oldDate}`);
        }
        setState('deletedTimesheetIds', Array.from(delSet));
        try {
          localStorage.setItem('bimTransPM_DeletedTimesheets', JSON.stringify(Array.from(delSet)));
        } catch(e) {}
      }
    }

    // 4. CẬP NHẬT HOẶC THÊM MỚI VÀO DANH SÁCH TIMESHEETS
    const tsIdx = updatedTs.findIndex(t => {
      if (t.id === tsId) return true;
      const compKey = `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`;
      return compKey === tsId;
    });

    if (tsIdx >= 0) {
      updatedTs[tsIdx] = {
        ...updatedTs[tsIdx],
        projectId: newProjectId,
        projectName: newProj ? newProj.name : (targetTs.projectName || ''),
        taskId: newTaskId,
        taskName: newTaskName,
        dateString: newDate,
        date: newDate,
        hours: newHours,
        isOT: newIsOT,
        sheetNo: newSheetNo,
        note: newNote,
        comment: newNote,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedTs.unshift({
        id: `ts-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: targetTs.userId || personId,
        userName: targetTs.userName || userName,
        email: targetTs.email || userEmail,
        projectId: newProjectId,
        projectName: newProj ? newProj.name : (targetTs.projectName || ''),
        taskId: newTaskId,
        taskName: newTaskName,
        dateString: newDate,
        date: newDate,
        hours: newHours,
        isActual: true,
        isOT: newIsOT,
        sheetNo: newSheetNo,
        note: newNote,
        comment: newNote,
        createdAt: new Date().toISOString()
      });
    }

    setState('timesheets', updatedTs);
    saveLocalSnapshot(`Chỉnh sửa giờ làm: ${newHours}h cho ${newTaskName}`);
    closeModal();
    showToast(`✅ Đã cập nhật thành công ${newHours} giờ cho "${newTaskName}"!`);
    refreshPage();
  });
}

/**
 * XỬ LÝ 1-CLICK GHI NHANH THEO KẾ HOẠCH (QUICK FILL FROM PLAN)
 */
function handleQuickFillFromPlan(targetDateStr) {
  const { timesheets, projects, personnel, currentUserAuth, currentUser } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';
  const personId = myRecord ? myRecord.id : (currentUserAuth?.id || 'unknown');

  const matchUser = (ts) => (personId && ts.userId === personId) || (userEmail && ts.email === userEmail) || (userName && ts.userName === userName);

  // 1. Quét các timesheet kế hoạch (isActual === false) của user vào ngày targetDateStr
  const plannedTs = (timesheets || []).filter(ts => {
    return matchUser(ts) && (ts.dateString === targetDateStr || ts.date === targetDateStr) && !ts.isActual && Number(ts.hours) > 0;
  });

  // 2. Quét thêm từ project.tasks nếu có dailyHours_planned vào targetDateStr mà chưa có trong plannedTs
  const tasksToFill = [];
  (projects || []).forEach(project => {
    (project.tasks || []).forEach((task, tIdx) => {
      const isAssigned = task.assignee === userName || task.assignee === userEmail || (myRecord && task.assignee === myRecord.name);
      if (isAssigned && task.dailyHours_planned && Number(task.dailyHours_planned[targetDateStr]) > 0) {
        const taskId = task.id || `t_${tIdx}`;
        const alreadyInPlanTs = plannedTs.some(pt => pt.projectId === project.id && (pt.taskId === taskId || pt.taskId === task.id));
        if (!alreadyInPlanTs) {
          tasksToFill.push({
            projectId: project.id,
            projectName: project.name,
            taskId: taskId,
            taskName: task.name,
            hours: Number(task.dailyHours_planned[targetDateStr]),
            taskIdx: tIdx
          });
        }
      }
    });
  });

  const allPlannedItems = [
    ...plannedTs.map(pt => ({
      projectId: pt.projectId,
      projectName: pt.projectName,
      taskId: pt.taskId,
      taskName: pt.taskName || pt.projectName,
      hours: Number(pt.hours),
      isRfi: pt.taskId?.startsWith('rfi_')
    })),
    ...tasksToFill
  ];

  if (allPlannedItems.length === 0) {
    showToast(`⚠️ Không tìm thấy giờ kế hoạch được giao cho ngày ${formatDate(targetDateStr)}!`, 'warning');
    return;
  }

  // Lọc ra các mục chưa được ghi nhận thực tế (hoặc ghi nhận chưa đủ)
  let newlyLoggedCount = 0;
  let totalHoursLogged = 0;
  const updatedTs = [...(timesheets || [])];
  const updatedProjects = [...(projects || [])];

  allPlannedItems.forEach(item => {
    // Kiểm tra xem đã có bản ghi thực tế chưa
    const existingActualIdx = updatedTs.findIndex(t => {
      return matchUser(t) && t.projectId === item.projectId && (t.taskId === item.taskId || t.taskName === item.taskName) && (t.dateString === targetDateStr || t.date === targetDateStr) && t.isActual === true;
    });

    if (existingActualIdx < 0) {
      // Thêm bản ghi thực tế mới
      updatedTs.unshift({
        id: `ts-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: personId,
        userName: userName,
        email: userEmail,
        projectId: item.projectId,
        projectName: item.projectName,
        taskId: item.taskId,
        taskName: item.taskName,
        dateString: targetDateStr,
        date: targetDateStr,
        hours: item.hours,
        isActual: true,
        isOT: false,
        note: `Ghi nhanh theo kế hoạch (${item.taskName})`,
        comment: `Ghi nhanh theo kế hoạch (${item.taskName})`,
        createdAt: new Date().toISOString()
      });
      newlyLoggedCount++;
      totalHoursLogged += item.hours;

      // Cập nhật dailyHours_actual trên project task
      const proj = updatedProjects.find(p => p.id === item.projectId);
      if (proj && proj.tasks) {
        let task = proj.tasks.find(t => t.id === item.taskId);
        if (!task && item.taskIdx !== undefined) task = proj.tasks[item.taskIdx];
        if (task) {
          if (!task.dailyHours_actual) task.dailyHours_actual = {};
          task.dailyHours_actual[targetDateStr] = item.hours;
        }
      }
    }
  });

  if (newlyLoggedCount === 0) {
    showToast(`ℹ️ Các công việc trong kế hoạch ngày ${formatDate(targetDateStr)} đều đã được ghi nhận giờ rồi.`, 'info');
    return;
  }

  // Cập nhật state & lưu snapshot
  setState('timesheets', updatedTs);
  setState('projects', updatedProjects);
  saveLocalSnapshot(`Ghi nhanh ${totalHoursLogged}h theo kế hoạch ngày ${targetDateStr}`);
  showToast(`⚡ Đã ghi nhận thành công ${totalHoursLogged}h thực tế (${newlyLoggedCount} đầu việc) theo kế hoạch!`);
  refreshPage();
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
    const selectedDate = tsDateEl ? tsDateEl.value : formatLocalDate(new Date());
    const projectId = document.getElementById('ts-project').value;
    const taskId = document.getElementById('ts-task').value || 't_general';
    const hours = parseFloat(document.getElementById('ts-hours').value);
    const note = document.getElementById('ts-note').value.trim();
    const sheetNo = document.getElementById('ts-sheetno')?.value.trim() || '';

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
      sheetNo: sheetNo,
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
      if (!tsId) return;

      const { timesheets, currentUserRole, currentUser, projects } = getState();
      let targetTs = (timesheets || []).find(t => {
        if (t.id === tsId) return true;
        const compKey = `${t.userId}_${t.projectId}_${t.taskId || ''}_${t.dateString || t.date}_${!!t.isActual}`;
        return compKey === tsId;
      });

      // Nếu targetTs chưa có trong timesheets (do là synthetic item từ dailyHours_actual), tìm từ projects
      if (!targetTs && (tsId.startsWith('syn-act-') || tsId.startsWith('syn-res-act-') || tsId.startsWith('ts-act-'))) {
        const dMatch = tsId.match(/\d{4}-\d{2}-\d{2}$/);
        const dStr = dMatch ? dMatch[0] : '';
        const taskId = tsId.replace(/^(syn-act-|syn-res-act-|ts-act-)/, '').replace(new RegExp(`-${dStr}$`), '');
        for (const proj of (projects || [])) {
          const tsk = (proj.tasks || []).find(t => t.id === taskId || t.name === taskId);
          if (tsk) {
            targetTs = {
              id: tsId,
              projectId: proj.id,
              projectName: proj.name,
              taskId: tsk.id,
              taskName: tsk.name,
              dateString: dStr,
              date: dStr,
              hours: Number(tsk.dailyHours_actual?.[dStr]) || 0,
              isActual: true
            };
            break;
          }
        }
      }

      // Bản ghi ở danh sách lịch sử gần đây của MyTasks luôn là giờ thực tế do nhân sự ghi
      const isActual = targetTs ? (targetTs.isActual !== false && targetTs.isActual !== 'false') : true;
      const isManager = ['BIM Manager', 'Project Manager', 'Admin'].includes(currentUserRole || currentUser?.role);

      // Chặn bảo vệ: Nếu là giờ kế hoạch và không phải cấp quản lý
      if (!isActual && !isManager) {
        showToast('⚠️ Bạn không thể tự xóa giờ Kế hoạch do Quản lý phân công!', 'warning');
        return;
      }

      const dStr = targetTs ? (targetTs.dateString || targetTs.date) : '';
      const hStr = targetTs?.hours ? `${targetTs.hours}h` : '';
      const confirmMsg = targetTs
        ? `Bạn có chắc chắn muốn xóa vĩnh viễn bản ghi ${isActual ? 'giờ thực tế' : 'giờ kế hoạch'} (${hStr} ngày ${formatDate(dStr)})?`
        : `Bạn có chắc chắn muốn xóa bản ghi giờ làm này?`;

      if (confirm(confirmMsg)) {
        deleteTimesheet(tsId);
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

  // 14. Nút chỉnh sửa giờ làm việc (Edit timesheet)
  document.querySelectorAll('.btn-edit-timesheet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tsId = e.currentTarget.dataset.id;
      openEditTimesheetModal(tsId);
    });
  });

  // 15. Nút ghi nhanh theo kế hoạch hôm nay (1-Click Fill by Plan)
  document.querySelectorAll('.btn-quick-fill-today').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetDate = e.currentTarget.dataset.date || formatLocalDate(new Date());
      handleQuickFillFromPlan(targetDate);
    });
  });

  // 16. Chuyển đổi chế độ xem Lịch / Bảng
  document.querySelectorAll('.btn-view-mode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentViewMode = e.currentTarget.dataset.mode;
      refreshPage();
    });
  });

  // 17. Điều hướng tháng trên Lịch
  document.querySelectorAll('.btn-cal-nav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dir = parseInt(e.currentTarget.dataset.dir);
      currentCalendarMonth += dir;
      if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear -= 1;
      } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear += 1;
      }
      refreshPage();
    });
  });

  // 18. Nút Hôm nay trên Lịch
  document.querySelector('.btn-cal-today')?.addEventListener('click', () => {
    const now = new Date();
    currentCalendarMonth = now.getMonth();
    currentCalendarYear = now.getFullYear();
    refreshPage();
  });

  // 19. Nút ghi giờ trực tiếp từ ô ngày trên Lịch
  document.querySelectorAll('.btn-cal-add-log').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetDate = e.currentTarget.dataset.date;
      const tsDateEl = document.getElementById('ts-date');
      if (tsDateEl) {
        tsDateEl.value = targetDate;
        tsDateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tsDateEl.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.4)';
        setTimeout(() => { tsDateEl.style.boxShadow = ''; }, 1500);
      }
    });
  });

  // 20. Nút Xuất Excel chấm công cá nhân
  document.getElementById('btn-export-ts-excel')?.addEventListener('click', exportTimesheetToExcel);

  // 21. Nút Nạp file Sao lưu JSON trực tiếp từ trang MyTasks
  const mytasksImportInput = document.getElementById('input-mytasks-import-backup');
  if (mytasksImportInput) {
    mytasksImportInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!confirm(`Bạn có chắc muốn nạp dữ liệu từ file sao lưu "${file.name}" không?\nToàn bộ dữ liệu thành viên, nhiệm vụ và giờ làm sẽ được khôi phục nguyên vẹn và đồng bộ an toàn lên Cloud.`)) {
        mytasksImportInput.value = '';
        return;
      }
      try {
        const { importBackupJSON } = await import('../state.js');
        const res = await importBackupJSON(file);
        if (res && res.success) {
          showToast(`✅ Phục hồi hoàn tất từ file "${file.name}"! (${res.timesheetsCount} bản ghi giờ làm)`);
          refreshPage();
          window.location.reload();
        }
      } catch(err) {
        alert('❌ Lỗi khi nạp file sao lưu: ' + err.message);
      } finally {
        mytasksImportInput.value = '';
      }
    });
  }
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
