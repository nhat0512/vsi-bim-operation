// ============================================
// PROJECT DETAIL — Single project view
// ============================================
import { getState, updateProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES } from '../data/constants.js';

let isEditing = false;

export function render() {
  const { projects, selectedProjectId, personnel } = getState();
  const project = projects.find(p => p.id === selectedProjectId);

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

  return `
    <div class="animate-fade-in-up">
      <!-- Back button + Project Header -->
      <div class="flex items-center gap-md mb-lg">
        <a href="#dashboard" class="btn btn-ghost btn-sm">← Quay lại</a>
        <div style="flex: 1;">
          ${isEditing ? `
            <input type="text" id="edit-name" class="form-input" style="font-size: 1.5rem; font-weight: 700; max-width: 400px; margin-bottom: 4px;" value="${project.name}">
            <div class="flex gap-sm">
              <input type="text" id="edit-code" class="form-input" style="width: 100px; padding: 4px 8px;" value="${project.code}">
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
          <button class="btn btn-primary" id="btn-save-project">✅ Lưu</button>
          <button class="btn btn-ghost" id="btn-cancel-edit">Hủy</button>
        ` : `
          <span class="badge ${statusInfo.class}" style="font-size: var(--font-sm); padding: 6px 16px; margin-right: 12px;">
            <span class="badge-dot"></span>
            ${statusInfo.label}
          </span>
          ${['BIM Manager', 'Project Manager'].includes(getState().currentUserRole) ? `<button class="btn btn-outline" id="btn-edit-project">✏️ Chỉnh sửa</button>` : ''}
        `}
      </div>

      <!-- Project KPIs -->
      <div class="kpi-grid stagger-children mb-lg" style="grid-template-columns: repeat(6, 1fr);">
        <div class="kpi-card blue"><div class="kpi-card-value">${project.progress}%</div><div class="kpi-card-label">Tiến độ</div></div>
        <div class="kpi-card green"><div class="kpi-card-value">${project.modelHealth}%</div><div class="kpi-card-label">Model Health</div></div>
        <div class="kpi-card purple"><div class="kpi-card-value">LOD ${project.lodCurrent}</div><div class="kpi-card-label">LOD hiện tại</div></div>
        <div class="kpi-card cyan"><div class="kpi-card-value">${project.teamSize}</div><div class="kpi-card-label">Thành viên</div></div>
        <div class="kpi-card orange"><div class="kpi-card-value">${project.clashesTotal - project.clashesResolved}</div><div class="kpi-card-label">Clash chưa xử lý</div></div>
        <div class="kpi-card ${clashResRate >= 70 ? 'green' : 'red'}"><div class="kpi-card-value">${clashResRate}%</div><div class="kpi-card-label">Clash resolved</div></div>
      </div>

      <div class="grid-2 mb-lg" style="grid-template-columns: 3fr 2fr;">
        <!-- Phases Timeline -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📅 Giai đoạn dự án</h3>
          </div>
          ${renderPhases(project)}
        </div>

        <!-- Project Info -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📋 Thông tin dự án</h3>
          </div>
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
                      ${(project.members || []).map(m => `
                        <option value="${m.name}" ${project.teamLead === m.name ? 'selected' : ''}>${m.name}</option>
                      `).join('')}
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
        </div>
      </div>

      <div class="grid-2 mb-lg">
        <!-- Segments -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📏 Phân đoạn tuyến</h3>
          </div>
          ${project.segments.map((seg, idx) => `
            <div class="mb-md">
              <div class="flex justify-between mb-xs">
                ${isEditing ? `
                  <input type="text" class="form-input edit-segment-name" data-idx="${idx}" value="${seg.name}" style="padding: 2px 8px; width: 60%;">
                  <div class="flex items-center gap-xs">
                    <input type="range" class="edit-segment-progress" data-idx="${idx}" value="${seg.progress}" min="0" max="100" style="width: 80px;">
                    <span class="text-sm font-bold w-10 text-right">${seg.progress}%</span>
                    <button class="btn btn-ghost btn-sm text-danger btn-delete-segment" data-idx="${idx}">🗑️</button>
                  </div>
                ` : `
                  <span class="text-sm font-semibold">${seg.name}</span>
                  <span class="text-sm font-bold">${seg.progress}%</span>
                `}
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill ${seg.progress >= 70 ? 'green' : seg.progress >= 40 ? '' : 'orange'}" style="width: ${seg.progress}%;"></div>
              </div>
            </div>
          `).join('')}
          ${isEditing ? `
            <button class="btn btn-outline btn-sm w-full mt-sm admin-only" id="btn-add-segment">+ Thêm phân đoạn</button>
          ` : ''}
        </div>

        <!-- Tasks -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📝 Công việc</h3>
            <span class="badge active">${project.tasks.length} tasks</span>
          </div>
          ${project.tasks.length > 0 ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Phụ trách</th>
                  <th>Tiến độ</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                ${project.tasks.map((t, idx) => {
                  const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'completed';
                  return `
                    <tr>
                      <td>
                        ${isEditing ? `
                          <input type="text" class="form-input edit-task-name" data-idx="${idx}" value="${t.name}" style="margin-bottom: 4px;">
                          <select class="form-select edit-task-segment" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 8px;">
                            <option value="-1">-- Không thuộc phân đoạn --</option>
                            ${project.segments.map((s, sIdx) => `
                              <option value="${sIdx}" ${t.segmentIdx === sIdx ? 'selected' : ''}>${s.name}</option>
                            `).join('')}
                          </select>
                        ` : `
                          <div class="font-semibold">${t.name}</div>
                          ${t.segmentIdx !== undefined && project.segments[t.segmentIdx] ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                              🏷️ ${project.segments[t.segmentIdx].name}
                            </span>
                          ` : ''}
                        `}
                      </td>
                      <td class="text-sm">
                        ${isEditing ? `
                          <select class="form-select edit-task-assignee" data-idx="${idx}">
                            <option value="">-- Chọn --</option>
                            ${(personnel || []).map(m => `
                              <option value="${m.name}" ${t.assignee === m.name ? 'selected' : ''}>${m.name}</option>
                            `).join('')}
                          </select>
                        ` : `
                          <div class="flex items-center gap-xs">
                            ${t.assignee ? (() => {
                              const member = (personnel || []).find(m => m.name === t.assignee);
                              if (member) {
                                return `<img src="${member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}" style="width: 24px; height: 24px; border-radius: 50%;"> <span>${t.assignee}</span>`;
                              }
                              return `<span>${t.assignee}</span>`;
                            })() : '<span class="text-muted italic">Chưa gán</span>'}
                          </div>
                        `}
                      </td>
                      <td>
                        ${isEditing ? `
                          <input type="number" class="form-input edit-task-progress" data-idx="${idx}" value="${t.progress}" min="0" max="100" style="width: 70px;">
                        ` : `
                          <div class="flex items-center gap-sm">
                            <div class="progress-bar" style="width: 80px;">
                              <div class="progress-bar-fill ${t.progress >= 80 ? 'green' : t.progress >= 40 ? '' : 'orange'}" style="width: ${t.progress}%;"></div>
                            </div>
                            <span class="text-xs">${t.progress}%</span>
                          </div>
                        `}
                      </td>
                      <td>
                        ${isEditing ? `
                          <div class="flex items-center gap-xs">
                            <input type="date" class="form-input edit-task-due" data-idx="${idx}" value="${t.dueDate.split('T')[0]}">
                            <button class="btn btn-ghost btn-sm text-danger btn-delete-task" data-idx="${idx}">🗑️</button>
                          </div>
                        ` : `
                          <span class="text-xs ${isOverdue ? 'text-danger font-bold' : 'text-muted'}">${formatDate(t.dueDate)}${isOverdue ? ' ⚠️' : ''}</span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<div class="text-sm text-muted" style="padding: 16px;">Chưa có task nào</div>'}
          ${isEditing ? `
            <div style="padding: 16px; border-top: 1px solid var(--border-default);">
              <button class="btn btn-outline btn-sm w-full admin-only" id="btn-add-task">+ Thêm công việc</button>
            </div>
          ` : ''}
        </div>
      <!-- RFIs -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">❓ Quản lý RFI (Request For Information)</h3>
          <span class="badge ${((project.rfis || []).filter(r => r.status === 'Open' || r.status === 'Overdue').length > 0) ? 'danger' : 'active'}">${(project.rfis || []).length} RFI</span>
        </div>
        ${(project.rfis || []).length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã RFI</th>
                <th>Tiêu đề</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Phụ trách</th>
                <th>Hạn chót</th>
              </tr>
            </thead>
            <tbody>
              ${(project.rfis || []).map((rfi, idx) => {
                const isOverdue = new Date(rfi.dueDate) < new Date() && rfi.status !== 'Closed' && rfi.status !== 'Answered';
                if (isOverdue && rfi.status !== 'Overdue') rfi.status = 'Overdue';
                
                const getStatusBadge = (status) => {
                  switch(status) {
                    case 'Open': return '<span class="badge orange">Mở (Open)</span>';
                    case 'Answered': return '<span class="badge blue">Đã trả lời</span>';
                    case 'Closed': return '<span class="badge green">Đã đóng</span>';
                    case 'Overdue': return '<span class="badge danger" style="animation: pulse-danger 2s infinite;">Trễ hạn ⚠️</span>';
                    default: return `<span class="badge">${status}</span>`;
                  }
                };
                const getPriorityBadge = (prio) => {
                  switch(prio) {
                    case 'High': return '<span style="color: var(--text-danger); font-weight: bold;">Cao 🔴</span>';
                    case 'Medium': return '<span style="color: var(--text-warning); font-weight: bold;">TB 🟡</span>';
                    case 'Low': return '<span style="color: var(--text-muted);">Thấp 🟢</span>';
                    default: return prio;
                  }
                };

                return `
                  <tr style="transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">
                    <td class="font-bold text-sm">
                      <input type="text" class="form-input edit-rfi-code inline-edit" data-idx="${idx}" value="${rfi.code}" style="width: 80px; font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer;">
                    </td>
                    <td>
                      <input type="text" class="form-input edit-rfi-title inline-edit" data-idx="${idx}" value="${rfi.title}" style="width: 100%; font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer;">
                    </td>
                    <td class="text-sm">
                      <select class="form-select edit-rfi-priority inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer;">
                        <option value="High" ${rfi.priority === 'High' ? 'selected' : ''}>Cao 🔴</option>
                        <option value="Medium" ${rfi.priority === 'Medium' ? 'selected' : ''}>Trung bình 🟡</option>
                        <option value="Low" ${rfi.priority === 'Low' ? 'selected' : ''}>Thấp 🟢</option>
                      </select>
                    </td>
                    <td class="text-sm">
                      <select class="form-select edit-rfi-status inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer; color: ${rfi.status === 'Overdue' ? 'var(--text-danger)' : rfi.status === 'Closed' ? 'var(--text-success)' : rfi.status === 'Answered' ? 'var(--text-info)' : 'var(--text-warning)'}; font-weight: bold;">
                        <option value="Open" ${rfi.status === 'Open' ? 'selected' : ''}>Mở (Open)</option>
                        <option value="Answered" ${rfi.status === 'Answered' ? 'selected' : ''}>Đã trả lời</option>
                        <option value="Closed" ${rfi.status === 'Closed' ? 'selected' : ''}>Đã đóng</option>
                        <option value="Overdue" ${rfi.status === 'Overdue' ? 'selected' : ''}>Trễ hạn ⚠️</option>
                      </select>
                    </td>
                    <td class="text-sm">
                      <div class="flex items-center gap-xs">
                        <select class="form-select edit-rfi-assignee inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer; flex: 1;">
                          <option value="">-- Chọn --</option>
                          ${(getState().personnel || []).map(p => `
                            <option value="${p.name}" ${rfi.assignee === p.name ? 'selected' : ''}>${p.name}</option>
                          `).join('')}
                        </select>
                        ${rfi.assignee ? (() => {
                          const person = (getState().personnel || []).find(p => p.name === rfi.assignee);
                          if (person) {
                            return `<img src="${person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`}" style="width: 24px; height: 24px; border-radius: 50%;" title="${person.role || person.name}">`;
                          }
                          return '';
                        })() : ''}
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center gap-xs">
                        <input type="date" class="form-input edit-rfi-due inline-edit" data-idx="${idx}" value="${rfi.dueDate.split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px; width: 110px; border: 1px solid transparent; background: transparent; cursor: pointer; color: ${isOverdue ? 'var(--text-danger)' : 'inherit'};">
                        <button class="btn btn-ghost btn-sm text-danger btn-delete-rfi" data-idx="${idx}" style="opacity: 0.5;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : '<div class="text-sm text-muted" style="padding: 16px;">Chưa có RFI nào</div>'}
        <div style="padding: 16px; border-top: 1px solid var(--border-default);">
          <button class="btn btn-outline btn-sm admin-only" id="btn-add-rfi">+ Thêm RFI</button>
        </div>
      </div>

      </div>

      <!-- Disciplines -->
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
      
      ${project.code === '14D' ? `
      <!-- 14D Drawing Progress -->
      <div class="card mb-lg" style="padding: 0; overflow: hidden;">
        <div class="card-header" style="padding: 16px;">
          <h3 class="card-title">📐 Bảng Theo Dõi Tiến Độ Bản Vẽ</h3>
        </div>
        <div id="drawing-progress-inject" style="padding: 0;">
          <div style="padding: 16px; text-align: center; color: var(--text-muted);">Đang tải bảng tính...</div>
        </div>
      </div>
      ` : ''}

      <!-- Team Roster -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">👥 Đội ngũ Dự án</h3>
          <span class="badge active">${(project.members || []).length} thành viên</span>
        </div>
        <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-md);">
          ${(project.members || []).map((m, idx) => `
            <div style="display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-tertiary); position: relative;">
              <img src="${m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`}" alt="${m.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
              <div style="flex: 1; overflow: hidden;">
                ${isEditing ? `
                  <input type="text" class="form-input edit-member-name" data-idx="${idx}" value="${m.name}" style="margin-bottom: 4px; font-weight: bold; width: 100%; padding: 4px;">
                  <div class="flex gap-xs mt-xs">
                    <select class="form-select edit-member-role" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; width: 50%;">
                      <option value="BIM Manager" ${m.role === 'BIM Manager' ? 'selected' : ''}>BIM Manager</option>
                      <option value="BIM Coordinator" ${m.role === 'BIM Coordinator' ? 'selected' : ''}>Coordinator</option>
                      <option value="BIM Modeler" ${m.role === 'BIM Modeler' ? 'selected' : ''}>Modeler</option>
                      <option value="Project Manager" ${m.role === 'Project Manager' ? 'selected' : ''}>PM</option>
                    </select>
                    <select class="form-select edit-member-discipline" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; width: 50%;">
                      <option value="Kiến trúc" ${m.discipline === 'Kiến trúc' ? 'selected' : ''}>Kiến trúc</option>
                      <option value="Kết cấu" ${m.discipline === 'Kết cấu' ? 'selected' : ''}>Kết cấu</option>
                      <option value="MEP" ${m.discipline === 'MEP' ? 'selected' : ''}>MEP</option>
                      <option value="Hạ tầng" ${m.discipline === 'Hạ tầng' ? 'selected' : ''}>Hạ tầng</option>
                      <option value="Cầu đường" ${m.discipline === 'Cầu đường' ? 'selected' : ''}>Cầu đường</option>
                    </select>
                  </div>
                ` : `
                  <div class="font-bold text-md" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.name}</div>
                  <div class="flex gap-xs mt-xs">
                    <span class="badge blue" style="font-size: 0.65rem; padding: 2px 6px;">${m.role}</span>
                    <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-secondary); border: 1px solid var(--border-subtle);">${m.discipline}</span>
                  </div>
                `}
              </div>
              ${isEditing ? `
                <button class="btn btn-ghost btn-sm text-danger btn-delete-member" data-idx="${idx}" style="position: absolute; top: 8px; right: 8px; padding: 4px;">🗑️</button>
              ` : ''}
            </div>
          `).join('')}
          ${isEditing ? `
            <div style="display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: var(--radius-md); border: 1px dashed var(--border-strong); background: transparent; cursor: pointer; min-height: 80px;" id="btn-add-member" class="admin-only">
              <span class="text-muted font-bold">+ Thêm Nhân Sự</span>
            </div>
          ` : (project.members || []).length === 0 ? '<div class="text-sm text-muted">Chưa có thành viên nào được gán vào dự án này.</div>' : ''}
        </div>
      </div>
    </div>
  `;
}

function renderPhases(project) {
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
              ${isCompleted ? '✅' : (phaseInfo.icon || '📋')}
            </div>
            
            ${isEditing ? `
              <div style="flex: 1; min-width: 150px; display: flex; flex-direction: column; gap: 4px;">
                <div class="text-sm font-semibold">${phaseInfo.label || phase.id}</div>
                <div class="flex gap-xs">
                  <input type="date" class="form-input edit-phase-start" data-idx="${idx}" value="${phase.startDate.split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px; width: 110px;">
                  <span class="text-muted" style="align-self: center;">→</span>
                  <input type="date" class="form-input edit-phase-end" data-idx="${idx}" value="${phase.endDate.split('T')[0]}" style="font-size: 0.75rem; padding: 2px 4px; width: 110px;">
                </div>
              </div>
              <div class="flex gap-sm items-center">
                <select class="form-select edit-phase-status" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; width: 110px;">
                  <option value="planning" ${phase.status === 'planning' ? 'selected' : ''}>Kế hoạch</option>
                  <option value="active" ${phase.status === 'active' ? 'selected' : ''}>Đang chạy</option>
                  <option value="completed" ${phase.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
                </select>
                <div class="flex items-center gap-xs">
                  <input type="range" class="edit-phase-progress" data-idx="${idx}" value="${phase.progress}" min="0" max="100" style="width: 70px;">
                  <span class="text-xs font-bold" style="width: 30px; text-align: right;">${phase.progress}%</span>
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

export function init() {
  const { projects, selectedProjectId } = getState();
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) return;

  document.getElementById('btn-edit-project')?.addEventListener('click', () => {
    isEditing = true;
    refreshDetail();
  });

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    isEditing = false;
    refreshDetail();
  });

  document.getElementById('btn-save-project')?.addEventListener('click', () => {
    const updates = {
      name: document.getElementById('edit-name').value,
      code: document.getElementById('edit-code').value,
      status: document.getElementById('edit-status').value,
      type: document.getElementById('edit-type').value,
      client: document.getElementById('edit-client').value,
      location: document.getElementById('edit-location').value,
      length: document.getElementById('edit-length').value,
      budget: document.getElementById('edit-budget').value,
      lodTarget: parseInt(document.getElementById('edit-lod').value) || 300,
      teamLead: document.getElementById('edit-lead').value,
      startDate: document.getElementById('edit-start').value,
      endDate: document.getElementById('edit-end').value,
    };
    
    // Extract Segments
    const segNames = document.querySelectorAll('.edit-segment-name');
    const segProgs = document.querySelectorAll('.edit-segment-progress');
    const newSegments = [];
    segNames.forEach((el, idx) => {
      newSegments.push({
        name: el.value,
        progress: parseInt(segProgs[idx].value) || 0
      });
    });
    updates.segments = newSegments;

    // Extract Tasks
    const taskNames = document.querySelectorAll('.edit-task-name');
    const taskAssignees = document.querySelectorAll('.edit-task-assignee');
    const taskProgresses = document.querySelectorAll('.edit-task-progress');
    const taskDues = document.querySelectorAll('.edit-task-due');
    const taskSegments = document.querySelectorAll('.edit-task-segment');
    const newTasks = [];
    taskNames.forEach((el, idx) => {
      const segVal = parseInt(taskSegments[idx]?.value);
      newTasks.push({
        name: el.value,
        assignee: taskAssignees[idx].value,
        progress: parseInt(taskProgresses[idx].value) || 0,
        dueDate: taskDues[idx].value,
        status: parseInt(taskProgresses[idx].value) === 100 ? 'completed' : 'active',
        segmentIdx: segVal >= 0 ? segVal : null
      });
    });
    updates.tasks = newTasks;

    // Extract Phases
    const phaseStarts = document.querySelectorAll('.edit-phase-start');
    const phaseEnds = document.querySelectorAll('.edit-phase-end');
    const phaseStatuses = document.querySelectorAll('.edit-phase-status');
    const phaseProgresses = document.querySelectorAll('.edit-phase-progress');
    const newPhases = [];
    phaseStarts.forEach((el, idx) => {
      newPhases.push({
        id: project.phases[idx].id,
        startDate: el.value,
        endDate: phaseEnds[idx].value,
        status: phaseStatuses[idx].value,
        progress: parseInt(phaseProgresses[idx].value) || 0
      });
    });
    if (newPhases.length > 0) {
      updates.phases = newPhases;
    }
    // Extract Members
    const memberNames = document.querySelectorAll('.edit-member-name');
    const memberRoles = document.querySelectorAll('.edit-member-role');
    const memberDisciplines = document.querySelectorAll('.edit-member-discipline');
    const newMembers = [];
    memberNames.forEach((el, idx) => {
      newMembers.push({
        name: el.value,
        role: memberRoles[idx].value,
        discipline: memberDisciplines[idx].value,
        avatar: project.members?.[idx]?.avatar || null
      });
    });
    // Extract RFIs
    const rfiCodes = document.querySelectorAll('.edit-rfi-code');
    const rfiTitles = document.querySelectorAll('.edit-rfi-title');
    const rfiPriorities = document.querySelectorAll('.edit-rfi-priority');
    const rfiStatuses = document.querySelectorAll('.edit-rfi-status');
    const rfiAssignees = document.querySelectorAll('.edit-rfi-assignee');
    const rfiDues = document.querySelectorAll('.edit-rfi-due');
    const newRfis = [];
    rfiCodes.forEach((el, idx) => {
      newRfis.push({
        code: el.value,
        title: rfiTitles[idx].value,
        priority: rfiPriorities[idx].value,
        status: rfiStatuses[idx].value,
        assignee: rfiAssignees[idx].value,
        dueDate: rfiDues[idx].value
      });
    });
    updates.rfis = newRfis;

    updateProject(selectedProjectId, updates);
    isEditing = false;
    refreshDetail();
  });

  // Range Slider real-time UI update (optional, but good UX)
  document.querySelectorAll('.edit-segment-progress, .edit-phase-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = `${e.target.value}%`;
    });
  });

  // Add Segment
  document.getElementById('btn-add-segment')?.addEventListener('click', () => {
    project.segments.push({ name: 'Phân đoạn mới', progress: 0 });
    // Update state to trigger re-render in edit mode
    updateProject(selectedProjectId, { segments: project.segments });
    isEditing = true;
    refreshDetail();
  });

  // Delete Segment
  document.querySelectorAll('.btn-delete-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      project.segments.splice(idx, 1);
      updateProject(selectedProjectId, { segments: project.segments });
      refreshDetail();
    });
  });

  // Add Task
  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    project.tasks.push({ 
      name: 'Công việc mới', 
      assignee: project.teamLead, 
      progress: 0, 
      dueDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    updateProject(selectedProjectId, { tasks: project.tasks });
    refreshDetail();
  });

  // Delete Task
  document.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      project.tasks.splice(idx, 1);
      updateProject(selectedProjectId, { tasks: project.tasks });
      refreshDetail();
    });
  });

  // Add Member
  document.getElementById('btn-add-member')?.addEventListener('click', () => {
    if (!project.members) project.members = [];
    project.members.push({ 
      name: 'Thành viên mới', 
      role: 'BIM Modeler', 
      discipline: 'Kiến trúc' 
    });
    updateProject(selectedProjectId, { members: project.members });
    refreshDetail();
  });

  // Delete Member
  document.querySelectorAll('.btn-delete-member').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      project.members.splice(idx, 1);
      updateProject(selectedProjectId, { members: project.members });
      refreshDetail();
    });
  });

  // Add RFI
  document.getElementById('btn-add-rfi')?.addEventListener('click', () => {
    if (!project.rfis) project.rfis = [];
    const newCode = `RFI-${String(project.rfis.length + 1).padStart(3, '0')}`;
    project.rfis.push({ 
      code: newCode,
      title: 'Yêu cầu thông tin mới', 
      priority: 'Medium', 
      status: 'Open',
      assignee: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +7 days
    });
    updateProject(selectedProjectId, { rfis: project.rfis });
    refreshDetail();
  });

  // Delete RFI
  document.querySelectorAll('.btn-delete-rfi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      project.rfis.splice(idx, 1);
      updateProject(selectedProjectId, { rfis: project.rfis });
      refreshDetail();
    });
  });

  // Auto-save RFI inline edits
  document.querySelectorAll('.inline-edit').forEach(input => {
    input.addEventListener('change', (e) => {
      // Extract all RFIs
      const rfiCodes = document.querySelectorAll('.edit-rfi-code');
      const rfiTitles = document.querySelectorAll('.edit-rfi-title');
      const rfiPriorities = document.querySelectorAll('.edit-rfi-priority');
      const rfiStatuses = document.querySelectorAll('.edit-rfi-status');
      const rfiAssignees = document.querySelectorAll('.edit-rfi-assignee');
      const rfiDues = document.querySelectorAll('.edit-rfi-due');
      
      const newRfis = [];
      rfiCodes.forEach((el, idx) => {
        newRfis.push({
          code: el.value,
          title: rfiTitles[idx].value,
          priority: rfiPriorities[idx].value,
          status: rfiStatuses[idx].value,
          assignee: rfiAssignees[idx].value,
          dueDate: rfiDues[idx].value
        });
      });
      
      if (e.target.classList.contains('edit-rfi-assignee')) {
        checkResourceConflict(e.target.value);
      }
      
      updateProject(selectedProjectId, { rfis: newRfis });
      refreshDetail();
    });
  });

  if (project.code === '14D') {
    import('./DrawingProgress.js').then(module => {
      const container = document.getElementById('drawing-progress-inject');
      if (container) {
        // Strip out the main container formatting for embedding
        let html = module.render();
        // Remove padding, min-height and title header to fit into the card nicely
        html = html.replace(/<div class="animate-fade-in-up"[\s\S]*?<div class="flex items-center justify-between mb-lg">[\s\S]*?<\/div>/, '<div class="animate-fade-in-up" style="display: flex; flex-direction: column;">');
        container.innerHTML = html;
        if (module.init) module.init();
      }
    });
  }
}

async function checkResourceConflict(assigneeName) {
  if (!assigneeName) return;
  const { personnel } = getState();
  const person = (personnel || []).find(p => p.name === assigneeName);
  if (person && person.totalAllocation > 100) {
    try {
      const { showToast } = await import('../components/ProjectFormModal.js');
      showToast(`⚠️ Cảnh báo: ${person.name} đang bị quá tải (${person.totalAllocation}%)`);
    } catch(err) {}
  }
}

export function destroy() {
  isEditing = false;
}
