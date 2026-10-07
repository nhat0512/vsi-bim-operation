// ============================================
// MY TASKS — Trang báo cáo tiến độ cá nhân
// ============================================
import { getState, setState, subscribe, updateProject } from '../state.js';
import { showItemDetailModal } from '../components/ItemDetailModal.js';
import { formatDisplayName } from '../utils/formatters.js';

let unsubscribe = null;

export function render() {
  const { currentUser, currentUserAuth, projects, personnel } = getState();
  const userEmail = currentUserAuth?.email || currentUser?.email || '';

  // Tìm hồ sơ nhân sự của người đăng nhập
  const myRecord = (personnel || []).find(p => p.email === userEmail) || currentUser?.personnelRecord;
  const userName = myRecord?.name || currentUserAuth?.name || currentUser?.name || 'Nhân viên';

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

    // Bổ sung: Nếu có task HOẶC RFI HOẶC nằm trong team dự án thì đều được tính
    if (tasks.length > 0 || (rfis && rfis.length > 0) || isTeamMember || isLead) {
      myAssignments.push({ project, tasks, rfis });
    }
  });

  // Tính toán thống kê
  const totalTasks = myAssignments.reduce((sum, a) => sum + a.tasks.length, 0);
  const completedTasks = myAssignments.reduce((sum, a) => sum + a.tasks.filter(t => t.progress >= 100).length, 0);
  const overdueTasks = myAssignments.reduce((sum, a) => sum + a.tasks.filter(t => {
    return new Date(t.dueDate) < new Date() && t.progress < 100;
  }).length, 0);
  const avgProgress = totalTasks > 0 
    ? Math.round(myAssignments.reduce((sum, a) => sum + a.tasks.reduce((s, t) => s + (t.progress || 0), 0), 0) / totalTasks) 
    : 0;

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
      <div class="kpi-grid stagger-children mb-lg" style="grid-template-columns: repeat(4, 1fr);">
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
            <div class="card-header" style="border-bottom: 1px solid var(--border-default);">
              <h3 class="card-title">📁 ${project.name}</h3>
              <div class="flex gap-sm">
                <span class="badge active">${tasks.length} việc</span>
                ${rfis && rfis.length > 0 ? `<span class="badge overdue">${rfis.length} RFI</span>` : ''}
              </div>
            </div>
            
            ${rfis && rfis.length > 0 ? `
            <div style="padding: 16px; border-bottom: 1px solid var(--border-default); background: var(--bg-tertiary);">
              <h4 style="font-size: 0.85rem; margin-bottom: 8px; color: var(--text-secondary);">❓ RFI (Yêu cầu cung cấp thông tin) cần xử lý</h4>
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">Tiêu đề RFI</th>
                    <th style="width: 20%;">Trạng thái</th>
                    <th style="width: 15%;">Hạn chót</th>
                    <th style="width: 15%;">Hành động</th>
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
                        <button class="btn btn-outline btn-sm btn-view-rfi-detail" data-project-id="${project.id}" data-rfi-idx="${trueIdx}" style="font-size: 0.75rem; padding: 4px 8px;">Chi tiết</button>
                      </td>
                    </tr>
                    `}).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 35%;">Công việc</th>
                  <th style="width: 15%;">Tiến độ hiện tại</th>
                  <th style="width: 20%;">Cập nhật tiến độ</th>
                  <th style="width: 15%;">Hạn chót</th>
                  <th style="width: 15%;">Hành động</th>
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
                  const isOverdue = new Date(task.dueDate) < new Date() && task.progress < 100;
                  const isComplete = task.progress >= 100;
                  return `
                    <tr style="transition: background 0.2s;" ${isComplete ? 'class="completed-row"' : ''}>
                      <td>
                        <div class="font-semibold ${isComplete ? 'text-muted' : ''}">${isComplete ? '✅ ' : ''}${task.name}</div>
                        ${task.segmentIdx !== undefined && project.segments?.[task.segmentIdx] ? `
                          <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                            🏷️ ${project.segments[task.segmentIdx].name}
                          </span>
                        ` : ''}
                        ${task.milestoneIdx !== undefined && project.milestones?.[task.milestoneIdx] ? `
                          <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                            🎯 ${project.milestones[task.milestoneIdx].name}
                          </span>
                        ` : ''}
                      </td>
                      <td>
                        <div class="flex items-center gap-sm">
                          <div class="progress-bar" style="width: 80px;">
                            <div class="progress-bar-fill ${task.progress >= 80 ? 'green' : task.progress >= 40 ? '' : 'orange'}" style="width: ${task.progress}%;"></div>
                          </div>
                          <span class="text-xs font-bold">${task.progress}%</span>
                        </div>
                      </td>
                      <td>
                        ${isComplete ? `
                          <span class="badge green" style="font-size: 0.75rem;">Hoàn thành</span>
                        ` : `
                          <div class="flex items-center gap-xs">
                            <input type="range" 
                              class="my-task-progress" 
                              data-project-id="${project.id}" 
                              data-task-idx="${project.tasks.indexOf(task)}" 
                              min="0" max="100" step="5" 
                              value="${task.progress}" 
                              style="width: 100px; accent-color: var(--accent-primary);">
                            <span class="text-xs font-bold my-task-progress-label" style="width: 35px; text-align: right;">${task.progress}%</span>
                          </div>
                        `}
                      </td>
                      <td>
                        <span class="text-xs ${isOverdue ? 'text-danger font-bold' : 'text-muted'}">
                          ${formatDate(task.dueDate)}${isOverdue ? ' ⚠️' : ''}
                        </span>
                      </td>
                      <td>
                        <div class="flex gap-xs">
                          <button class="btn btn-outline btn-sm btn-view-task-detail" 
                            data-project-id="${project.id}" 
                            data-task-idx="${project.tasks.indexOf(task)}"
                            style="font-size: 0.75rem; padding: 4px 8px;">
                            Chi tiết
                          </button>
                          ${isComplete ? '' : `
                            <button class="btn btn-primary btn-sm btn-save-progress" 
                              data-project-id="${project.id}" 
                              data-task-idx="${project.tasks.indexOf(task)}"
                              style="font-size: 0.75rem; padding: 4px 8px;">
                              Lưu
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

      <!-- Timesheet nhanh -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">⏱️ Ghi nhận giờ làm việc</h3>
        </div>
        <div style="padding: 16px;">
          <div class="flex gap-md items-end flex-wrap">
            <div style="flex: 1; min-width: 130px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Ngày</label>
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
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Công việc</label>
              <select class="form-select" id="ts-task" disabled>
                <option value="">-- Vui lòng chọn dự án trước --</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 80px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Số giờ</label>
              <input type="number" class="form-input" id="ts-hours" min="0.5" max="12" step="0.5" value="8" style="width: 100%;">
            </div>
            <div style="flex: 2; min-width: 150px;">
              <label class="text-xs text-muted font-semibold" style="display: block; margin-bottom: 4px;">Ghi chú (tùy chọn)</label>
              <input type="text" class="form-input" id="ts-note" placeholder="VD: Hoàn thiện..." style="width: 100%;">
            </div>
            <button class="btn btn-primary" id="btn-log-time" style="white-space: nowrap;">
              ➕ Ghi nhận
            </button>
          </div>
        </div>
      </div>

      <!-- Lịch sử timesheet gần đây -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📋 Lịch sử ghi giờ gần đây</h3>
        </div>
        ${renderRecentTimesheets(userEmail, userName, myRecord?.name)}
      </div>
    </div>
  `;
}

function renderRecentTimesheets(email, displayName, personnelName) {
  const { timesheets, projects } = getState();
  const myTimesheets = (timesheets || []).filter(ts => 
    ts.email === email || ts.userName === displayName || ts.userName === personnelName
  ).slice(0, 10);

  if (myTimesheets.length === 0) {
    return '<div class="text-sm text-muted" style="padding: 16px;">Chưa có bản ghi nào. Hãy bắt đầu ghi nhận giờ làm!</div>';
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Dự án</th>
          <th>Số giờ</th>
          <th>Ghi chú</th>
          <th style="width: 40px;"></th>
        </tr>
      </thead>
      <tbody>
        ${myTimesheets.map(ts => {
          const proj = (projects || []).find(p => p.id === ts.projectId);
          return `
            <tr>
              <td class="text-sm">${formatDate(ts.date)}</td>
              <td class="text-sm font-semibold">
                ${proj ? proj.name : ts.projectId}
                ${(() => {
                  if (!proj) return '';
                  if (ts.taskId && ts.taskId.startsWith('rfi_')) {
                    const idx = parseInt(ts.taskId.split('_')[1]);
                    const rfi = proj.rfis?.[idx];
                    if (rfi) return `<div style="font-size: 0.7rem; color: var(--text-warning); margin-top: 2px;">↳ Xử lý RFI: ${rfi.title}</div>`;
                  }
                  if (ts.taskId && ts.taskId.startsWith('t_') && ts.taskId !== 't_general') {
                    const idx = parseInt(ts.taskId.split('_')[1]);
                    const task = proj.tasks?.[idx];
                    if (task) return `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">↳ Task: ${task.name}</div>`;
                  }
                  return '';
                })()}
              </td>
              <td class="text-sm font-bold">${ts.hours}h</td>
              <td class="text-sm text-muted">${ts.note || '—'}</td>
              <td class="text-sm">
                <button class="btn btn-ghost btn-sm text-danger btn-delete-timesheet" data-id="${ts.id}" title="Xóa" style="padding: 2px 6px;">
                  🗑️
                </button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function init() {
  // Cập nhật label khi kéo slider
  document.querySelectorAll('.my-task-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const label = e.target.closest('td')?.querySelector('.my-task-progress-label');
      if (label) label.textContent = `${e.target.value}%`;
    });
  });

  // Lưu tiến độ
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

      // Hiện thông báo
      showToast(`✅ Đã cập nhật tiến độ "${project.tasks[taskIdx].name}" → ${newProgress}%`);
      
      // Re-render
      refreshPage();
    });
  });

  // Cập nhật trạng thái RFI
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

  // Xem chi tiết RFI
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

  // Xem chi tiết Task
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
  // Cập nhật danh sách công việc khi chọn dự án
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
      
      const userTasks = (proj?.tasks || []).filter(t => t.assignee === userName);
      
      let optionsHtml = '<option value="t_general">-- Công việc chung (Không phân Task) --</option>';
      
      if (userTasks.length > 0) {
        optionsHtml += '<optgroup label="Công việc (Tasks)">';
        userTasks.forEach(t => {
          const trueIdx = proj.tasks.findIndex(pt => pt.name === t.name && pt.assignee === t.assignee);
          optionsHtml += `<option value="t_${trueIdx}">${t.name}</option>`;
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

  // Ghi nhận timesheet
  document.getElementById('btn-log-time')?.addEventListener('click', () => {
    const tsDateEl = document.getElementById('ts-date');
    const selectedDate = tsDateEl ? tsDateEl.value : new Date().toISOString().split('T')[0];
    const projectId = document.getElementById('ts-project').value;
    const taskId = document.getElementById('ts-task').value || 't_general';
    const hours = parseFloat(document.getElementById('ts-hours').value);
    const note = document.getElementById('ts-note').value;

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

    const { currentUserAuth, currentUser, timesheets, personnel } = getState();
    const userEmail = currentUserAuth?.email || '';
    const person = (personnel || []).find(p => p.email === userEmail);
    
    const newEntry = {
      id: `ts-${Date.now()}`,
      userId: person ? person.id : (currentUserAuth?.id || 'unknown'),
      email: userEmail,
      userName: currentUserAuth?.name || currentUser?.name || '',
      projectId: projectId,
      taskId: taskId,
      dateString: selectedDate,
      date: selectedDate,
      hours: hours,
      note: note,
      comment: note,
      isActual: true, // Mark as Actual hours
      createdAt: new Date().toISOString()
    };

    const updated = [newEntry, ...(timesheets || [])];
    setState('timesheets', updated);

    showToast(`✅ Đã ghi nhận ${hours} giờ!`);
    refreshPage();
  });

  // Xóa timesheet
  document.querySelectorAll('.btn-delete-timesheet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tsId = e.currentTarget.dataset.id;
      if (confirm('Bạn có chắc chắn muốn xóa bản ghi này? Số giờ ở General Planning cũng sẽ tự động biến mất.')) {
        const { timesheets } = getState();
        const updated = (timesheets || []).filter(t => t.id !== tsId);
        setState('timesheets', updated);
        showToast('🗑️ Đã xóa bản ghi giờ làm!');
        refreshPage();
      }
    });
  });

  // Nút refresh
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
  toast.style.background = type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)';
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
