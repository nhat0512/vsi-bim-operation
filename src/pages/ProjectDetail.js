// ============================================
// PROJECT DETAIL — Single project view
// ============================================
import { getState, updateProject } from '../state.js';
import { PROJECT_TYPES, PROJECT_STATUSES, BIM_PHASES } from '../data/constants.js';
import { showItemDetailModal } from '../components/ItemDetailModal.js';
import { formatDisplayName } from '../utils/formatters.js';

function getIsEditing() {
  return ['BIM Manager', 'Project Manager'].includes(getState().currentUserRole);
}

export function render() {
  const { projects, selectedProjectId, personnel } = getState();
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
          ${['BIM Manager', 'Project Manager'].includes(getState().currentUserRole) ? `<button class="btn btn-outline" id="btn-edit-project">✏️ Chỉnh sửa</button>` : ''}
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
        </div>
      </div>

      <!-- Ma trận Tiến độ (Segments x Milestones) -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">📍 Ma trận Tiến độ (Segments x Milestones)</h3>
          <span class="badge active">${project.segments.length} phân đoạn</span>
        </div>
        ${isEditing ? `
          <div style="overflow-x: auto;">
            <table class="data-table" style="min-width: 800px; border-collapse: separate; border-spacing: 0;">
              <thead>
                <tr>
                  <th style="min-width: 250px; position: sticky; left: 0; background: var(--bg-secondary); z-index: 2; border-right: 1px solid var(--border-default);">
                    Phân đoạn (Segments)
                  </th>
                  ${(project.milestones || []).map((m, mIdx) => `
                    <th style="min-width: 180px; text-align: center; border-right: 1px solid var(--border-subtle); padding: 8px;">
                      <div class="flex items-center gap-xs justify-between" style="width: 100%;">
                        <input type="text" class="form-input edit-milestone-name inline-edit" value="${m.name}" title="${m.name}" style="font-weight: bold; padding: 4px 8px; font-size: 0.85rem; flex: 1; text-align: center; min-width: 0;">
                        <button class="btn btn-ghost btn-sm text-danger btn-delete-milestone" data-idx="${mIdx}" style="padding: 4px; flex-shrink: 0;" title="Xóa mốc này">🗑️</button>
                      </div>
                      <input type="date" class="form-input edit-milestone-date inline-edit" value="${m.date.split('T')[0]}" style="font-size: 0.75rem; padding: 4px 8px; margin-top: 6px; text-align: center; width: 100%;">
                    </th>
                  `).join('')}
                  <th style="width: 100px; text-align: center;">
                    <button class="btn btn-outline btn-sm" id="btn-add-milestone">+ Mốc</button>
                  </th>
                </tr>
              </thead>
              <tbody id="edit-segments-list">
                ${project.segments.map((s, sIdx) => {
                  if (!s.progresses) s.progresses = [];
                  if (!s.subSegments) s.subSegments = [];
                  const hasSub = s.subSegments.length > 0;
                  
                  let html = `
                  <tr>
                    <td style="position: sticky; left: 0; background: var(--bg-primary); z-index: 1; border-right: 1px solid var(--border-default);">
                      <div class="flex items-center gap-xs">
                        <button class="btn btn-ghost btn-sm btn-toggle-sub" data-sidx="${sIdx}" style="padding: 2px;">${hasSub ? '▼' : '▶'}</button>
                        <input type="text" class="form-input edit-segment-name inline-edit" value="${s.name}" style="width: 100%; font-weight: bold;">
                        <button class="btn btn-ghost btn-sm text-primary btn-add-subsegment" data-sidx="${sIdx}" title="Thêm phân đoạn nhỏ" style="padding: 2px;">➕</button>
                        <button class="btn btn-ghost btn-sm text-danger btn-delete-segment" data-idx="${sIdx}" style="padding: 2px;">🗑️</button>
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
                      
                      return `
                        <td style="border-right: 1px solid var(--border-subtle); text-align: center; padding: 4px;">
                          ${hasSub ? `
                            <div class="flex items-center gap-xs justify-center">
                              <div class="progress-bar" style="width: 70px; height: 6px;">
                                <div class="progress-bar-fill parent-progress-fill-${sIdx}-${mIdx} ${pValue >= 100 ? 'green' : ''}" style="width: ${pValue}%;"></div>
                              </div>
                              <span class="text-xs font-bold text-muted parent-progress-text-${sIdx}-${mIdx}" style="width: 35px; text-align: right;">${pValue}%</span>
                              <input type="hidden" class="edit-segment-matrix-progress" id="parent-hidden-${sIdx}-${mIdx}" data-sidx="${sIdx}" data-midx="${mIdx}" value="${pValue}">
                            </div>
                          ` : `
                            <div class="flex items-center gap-xs justify-center">
                              <input type="range" class="edit-segment-matrix-progress inline-edit" data-sidx="${sIdx}" data-midx="${mIdx}" value="${pValue}" min="0" max="100" style="width: 70px;">
                              <span class="text-xs font-bold" style="width: 35px; text-align: right; color: ${pValue >= 100 ? 'var(--text-success)' : 'inherit'};">${pValue}%</span>
                            </div>
                            <input type="date" class="form-input edit-segment-matrix-date inline-edit" data-sidx="${sIdx}" data-midx="${mIdx}" value="${s.deadlines?.[mIdx] || m.date.split('T')[0]}" style="font-size: 0.65rem; padding: 1px 4px; border: 1px solid var(--border-subtle); border-radius: 4px; width: 95px; color: var(--text-secondary); margin-top: 4px; text-align: center;" title="Hạn chót của phân đoạn này cho mốc này">
                          `}
                        </td>
                      `;
                    }).join('')}
                    <td></td>
                  </tr>
                  `;
                  
                  if (hasSub) {
                    s.subSegments.forEach((sub, subIdx) => {
                      if (!sub.progresses) sub.progresses = [];
                      html += `
                        <tr class="sub-segment-row sub-of-${sIdx}">
                          <td style="position: sticky; left: 0; background: var(--bg-primary); z-index: 1; border-right: 1px solid var(--border-default); padding-left: 32px;">
                            <div class="flex items-center gap-xs">
                              <span style="color: var(--text-muted);">↳</span>
                              <input type="text" class="form-input edit-subsegment-name inline-edit" data-sidx="${sIdx}" data-subidx="${subIdx}" value="${sub.name}" style="width: 100%; font-size: 0.85rem;">
                              <button class="btn btn-ghost btn-sm text-danger btn-delete-subsegment" data-sidx="${sIdx}" data-subidx="${subIdx}" style="padding: 2px;">🗑️</button>
                            </div>
                          </td>
                          ${(project.milestones || []).map((m, mIdx) => {
                            const pValue = sub.progresses[mIdx] || 0;
                            return `
                              <td style="border-right: 1px solid var(--border-subtle); text-align: center; background: rgba(0,0,0,0.02); padding: 4px;">
                                <div class="flex items-center gap-xs justify-center">
                                  <input type="range" class="edit-subsegment-matrix-progress inline-edit" data-sidx="${sIdx}" data-subidx="${subIdx}" data-midx="${mIdx}" value="${pValue}" min="0" max="100" style="width: 70px; accent-color: var(--accent-secondary);">
                                  <span class="text-xs font-bold" style="width: 35px; text-align: right; color: ${pValue >= 100 ? 'var(--text-success)' : 'inherit'};">${pValue}%</span>
                                </div>
                                <input type="date" class="form-input edit-subsegment-matrix-date inline-edit" data-sidx="${sIdx}" data-subidx="${subIdx}" data-midx="${mIdx}" value="${sub.deadlines?.[mIdx] || m.date.split('T')[0]}" style="font-size: 0.65rem; padding: 1px 4px; border: 1px solid var(--border-subtle); border-radius: 4px; width: 95px; color: var(--text-secondary); margin-top: 4px; text-align: center;" title="Hạn chót của phân đoạn nhỏ này cho mốc này">
                              </td>
                            `;
                          }).join('')}
                          <td></td>
                        </tr>
                      `;
                    });
                  }
                  return html;
                }).join('')}
                <tr>
                  <td colspan="${(project.milestones || []).length + 2}" style="padding: 12px; position: sticky; left: 0; background: var(--bg-primary);">
                    <button class="btn btn-outline btn-sm w-full" id="btn-add-segment">+ Thêm phân đoạn (Segment)</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>

      <div class="grid-2 mb-lg">

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
                          <div class="flex items-center gap-xs" style="flex-wrap: wrap; margin-top: 4px;">
                            <div class="flex items-center" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
                              <span style="font-size: 0.65rem; margin-right: 4px;">🏷️</span>
                              <select class="edit-task-segment" data-idx="${idx}" style="font-size: 0.7rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
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
                              <select class="edit-task-milestone" data-idx="${idx}" style="font-size: 0.7rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
                                <option value="-1">-- Cột mốc --</option>
                                ${(project.milestones || []).map((m, mIdx) => `
                                  <option value="${mIdx}" ${t.milestoneIdx === mIdx ? 'selected' : ''}>${m.name}</option>
                                `).join('')}
                              </select>
                            </div>
                          </div>
                          <button class="btn btn-ghost btn-sm text-primary btn-task-detail" data-idx="${idx}" style="margin-top: 8px; padding: 2px 8px; font-size: 0.7rem; border: 1px solid var(--accent-primary);">🔍 Chi tiết</button>
                        ` : `
                          <div class="font-semibold">${t.name}</div>
                          ${t.segmentIdx !== null && t.segmentIdx !== undefined && project.segments[t.segmentIdx] ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                              🏷️ ${project.segments[t.segmentIdx].name}${t.subSegmentIdx != null && project.segments[t.segmentIdx].subSegments?.[t.subSegmentIdx] ? ` / ${project.segments[t.segmentIdx].subSegments[t.subSegmentIdx].name}` : ''}
                            </span>
                          ` : ''}
                          ${t.milestoneIdx !== null && t.milestoneIdx !== undefined && (project.milestones || [])[t.milestoneIdx] ? `
                            <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                              🎯 ${(project.milestones || [])[t.milestoneIdx].name}
                            </span>
                          ` : ''}
                          <button class="btn btn-ghost btn-sm text-primary btn-task-detail" data-idx="${idx}" style="margin-top: 4px; padding: 2px 8px; font-size: 0.7rem; border: 1px solid var(--accent-primary);">🔍 Chi tiết</button>
                        `}
                      </td>
                      <td class="text-sm">
                        ${isEditing ? `
                          <select class="form-select edit-task-assignee" data-idx="${idx}">
                            <option value="">-- Chọn --</option>
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
                                return `<img src="${(member.avatar && member.avatar.length > 5) ? member.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(member.name))}&background=random`}" style="width: 24px; height: 24px; border-radius: 50%;"> <span>${formatDisplayName(t.assignee)}</span>`;
                              }
                              return `<span>${formatDisplayName(t.assignee)}</span>`;
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
                      ${isEditing ? `
                        <div class="flex items-center gap-xs" style="flex-wrap: wrap; margin-top: 4px;">
                          <div class="flex items-center" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
                            <span style="font-size: 0.65rem; margin-right: 4px;">🏷️</span>
                            <select class="edit-rfi-segment inline-edit" data-idx="${idx}" style="font-size: 0.7rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
                              <option value="-1">-- Phân đoạn --</option>
                              ${project.segments.map((s, sIdx) => {
                                let html = `<option value="${sIdx}" ${rfi.segmentIdx === sIdx && rfi.subSegmentIdx == null ? 'selected' : ''}>▶ ${s.name}</option>`;
                                if (s.subSegments && s.subSegments.length > 0) {
                                  s.subSegments.forEach((sub, subIdx) => {
                                    html += `<option value="${sIdx}_${subIdx}" ${rfi.segmentIdx === sIdx && rfi.subSegmentIdx === subIdx ? 'selected' : ''}>&nbsp;&nbsp;↳ ${sub.name}</option>`;
                                  });
                                }
                                return html;
                              }).join('')}
                            </select>
                          </div>
                          <div class="flex items-center" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 2px 6px;">
                            <span style="font-size: 0.65rem; margin-right: 4px;">🎯</span>
                            <select class="edit-rfi-milestone inline-edit" data-idx="${idx}" style="font-size: 0.7rem; padding: 0; background: transparent; border: none; outline: none; color: var(--text-muted); cursor: pointer; max-width: 150px;">
                              <option value="-1">-- Cột mốc --</option>
                              ${(project.milestones || []).map((m, mIdx) => `
                                <option value="${mIdx}" ${rfi.milestoneIdx === mIdx ? 'selected' : ''}>${m.name}</option>
                              `).join('')}
                            </select>
                          </div>
                        </div>
                      ` : `
                        ${rfi.segmentIdx !== null && rfi.segmentIdx !== undefined && project.segments[rfi.segmentIdx] ? `
                          <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                            🏷️ ${project.segments[rfi.segmentIdx].name}${rfi.subSegmentIdx != null && project.segments[rfi.segmentIdx].subSegments?.[rfi.subSegmentIdx] ? ` / ${project.segments[rfi.segmentIdx].subSegments[rfi.subSegmentIdx].name}` : ''}
                          </span>
                        ` : ''}
                        ${rfi.milestoneIdx !== null && rfi.milestoneIdx !== undefined && (project.milestones || [])[rfi.milestoneIdx] ? `
                          <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: var(--bg-tertiary); color: var(--text-muted); border: 1px solid var(--border-subtle); margin-top: 4px; display: inline-block;">
                            🎯 ${(project.milestones || [])[rfi.milestoneIdx].name}
                          </span>
                        ` : ''}
                      `}
                      <button class="btn btn-ghost btn-sm text-primary btn-rfi-detail" data-idx="${idx}" style="margin-top: 4px; padding: 2px 8px; font-size: 0.7rem; border: 1px solid var(--accent-primary);">🔍 Chi tiết</button>
                    </td>
                    <td class="text-sm">
                      <select class="form-select edit-rfi-priority inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer;">
                        <option value="High" ${rfi.priority === 'High' ? 'selected' : ''}>Cao 🔴</option>
                        <option value="Medium" ${rfi.priority === 'Medium' ? 'selected' : ''}>Trung bình 🟡</option>
                        <option value="Low" ${rfi.priority === 'Low' ? 'selected' : ''}>Thấp 🟢</option>
                      </select>
                    </td>
                    <td class="text-sm">
                      <select class="form-select edit-rfi-status inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer; color: ${rfi.status === 'Open' ? 'var(--text-danger)' : rfi.status === 'Answered' ? 'var(--text-success)' : 'var(--text-muted)'}; font-weight: bold;">
                        <option value="Open" style="color: var(--text-danger);" ${rfi.status === 'Open' ? 'selected' : ''}>Mở (Open)</option>
                        <option value="Answered" style="color: var(--text-success);" ${rfi.status === 'Answered' ? 'selected' : ''}>Đã trả lời</option>
                        <option value="Closed" style="color: var(--text-muted);" ${rfi.status === 'Closed' ? 'selected' : ''}>Đã đóng</option>
                        <option value="Overdue" style="color: var(--text-danger);" ${rfi.status === 'Overdue' ? 'selected' : ''}>Trễ hạn ⚠️</option>
                      </select>
                    </td>
                    <td class="text-sm">
                      <div class="flex items-center gap-xs">
                        <select class="form-select edit-rfi-assignee inline-edit" data-idx="${idx}" style="font-size: 0.75rem; padding: 2px 4px; border: 1px solid transparent; background: transparent; cursor: pointer; flex: 1;">
                          <option value="">-- Chọn --</option>
                          ${(getState().personnel || []).map(p => {
                            let label = formatDisplayName(p.name);
                            const alloc = p.totalAllocation || 0;
                            if (alloc >= 100) label += ' [⚠️ Quá tải]';
                            else label += ` [✅ Rảnh ${100 - alloc}%]`;
                            return `<option value="${p.name}" ${rfi.assignee === p.name ? 'selected' : ''}>${label}</option>`;
                          }).join('')}
                        </select>
                        ${rfi.assignee ? (() => {
                          const person = (getState().personnel || []).find(p => p.name === rfi.assignee);
                          if (person) {
                            return `<img src="${(person.avatar && person.avatar.length > 5) ? person.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(formatDisplayName(person.name))}&background=random`}" style="width: 24px; height: 24px; border-radius: 50%;" title="${person.role ? person.role + ' - ' : ''}${formatDisplayName(person.name)}">`;
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
      



    </div>
  `;
}

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
  
  const isEditing = getIsEditing();

  const performSilentSave = () => {
    // Lấy state mới nhất để tránh lỗi stale closure khi thêm phần tử mới (mốc, đoạn, task)
    const currentProject = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProject) return;

    const indicator = document.getElementById('auto-save-indicator');
    if (indicator) indicator.style.display = 'flex';

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
    // Extract Milestones FIRST
    const milestoneNames = document.querySelectorAll('.edit-milestone-name');
    const milestoneDates = document.querySelectorAll('.edit-milestone-date');
    const newMilestones = [];
    milestoneNames.forEach((el, idx) => {
      newMilestones.push({
        id: (currentProject.milestones || [])[idx]?.id || `M${Date.now()}_${idx}`,
        name: el.value,
        date: milestoneDates[idx].value
      });
    });
    updates.milestones = newMilestones;

    // Extract Segments, SubSegments and Matrix Progress
    const segmentNames = document.querySelectorAll('.edit-segment-name');
    const newSegments = [];
    segmentNames.forEach((el, sIdx) => {
      const segName = el.value;
      const progresses = [];
      const deadlines = [];
      newMilestones.forEach((m, mIdx) => {
        const slider = document.querySelector(`.edit-segment-matrix-progress[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
        progresses.push(slider ? parseInt(slider.value) : 0);
        
        const dateInput = document.querySelector(`.edit-segment-matrix-date[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
        deadlines.push(dateInput ? dateInput.value : '');
      });
      
      const subSegments = [];
      const subNameInputs = document.querySelectorAll(`.edit-subsegment-name[data-sidx="${sIdx}"]`);
      subNameInputs.forEach((subEl, subIdx) => {
        const subProgresses = [];
        const subDeadlines = [];
        newMilestones.forEach((m, mIdx) => {
          const subSlider = document.querySelector(`.edit-subsegment-matrix-progress[data-sidx="${sIdx}"][data-subidx="${subIdx}"][data-midx="${mIdx}"]`);
          subProgresses.push(subSlider ? parseInt(subSlider.value) : 0);
          
          const subDateInput = document.querySelector(`.edit-subsegment-matrix-date[data-sidx="${sIdx}"][data-subidx="${subIdx}"][data-midx="${mIdx}"]`);
          subDeadlines.push(subDateInput ? subDateInput.value : '');
        });
        subSegments.push({
          id: currentProject.segments[sIdx]?.subSegments?.[subIdx]?.id || `Sub_${Date.now()}_${sIdx}_${subIdx}`,
          name: subEl.value,
          progresses: subProgresses,
          deadlines: subDeadlines
        });
      });
      
      // If has subsegments, override parent progresses with average
      if (subSegments.length > 0) {
        newMilestones.forEach((m, mIdx) => {
          const sum = subSegments.reduce((acc, sub) => acc + (sub.progresses[mIdx] || 0), 0);
          progresses[mIdx] = Math.round(sum / subSegments.length);
        });
      }
      
      const avgProgress = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0;
      
      newSegments.push({
        id: currentProject.segments[sIdx]?.id || `S${Date.now()}_${sIdx}`,
        name: segName,
        progress: avgProgress, // backward compatibility
        progresses: progresses,
        deadlines: deadlines,
        subSegments: subSegments
      });
    });
    updates.segments = newSegments;

    // Extract Tasks
    const taskNames = document.querySelectorAll('.edit-task-name');
    const taskAssignees = document.querySelectorAll('.edit-task-assignee');
    const taskProgresses = document.querySelectorAll('.edit-task-progress');
    const taskDues = document.querySelectorAll('.edit-task-due');
    const taskSegments = document.querySelectorAll('.edit-task-segment');
    const taskMilestones = document.querySelectorAll('.edit-task-milestone');
    const newTasks = [];
    taskNames.forEach((el, idx) => {
      const segValStr = taskSegments[idx]?.value || "-1";
      const mlVal = parseInt(taskMilestones[idx]?.value);
      
      let sIdx = null;
      let subIdx = null;
      if (segValStr !== "-1") {
        const parts = segValStr.split('_');
        sIdx = parseInt(parts[0]);
        if (parts.length > 1) subIdx = parseInt(parts[1]);
      }
      
      newTasks.push({
        name: el.value,
        assignee: taskAssignees[idx].value,
        progress: parseInt(taskProgresses[idx].value) || 0,
        dueDate: taskDues[idx].value,
        status: parseInt(taskProgresses[idx].value) === 100 ? 'completed' : 'active',
        segmentIdx: sIdx,
        subSegmentIdx: subIdx,
        milestoneIdx: mlVal >= 0 ? mlVal : null,
        description: currentProject.tasks[idx]?.description || '',
        cloudLinks: currentProject.tasks[idx]?.cloudLinks || ''
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
        id: currentProject.phases[idx].id,
        startDate: el.value,
        endDate: phaseEnds[idx].value,
        status: phaseStatuses[idx].value,
        progress: parseInt(phaseProgresses[idx].value) || 0
      });
    });
    if (newPhases.length > 0) {
      updates.phases = newPhases;
    }

    // Extract RFIs
    const rfiCodes = document.querySelectorAll('.edit-rfi-code');
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

      newRfis.push({
        id: (currentProject.rfis || [])[idx]?.id || `rfi-${Date.now()}-${idx}`,
        code: el.value,
        title: rfiTitles[idx].value,
        priority: rfiPriorities[idx].value,
        status: rfiStatuses[idx].value,
        assignee: rfiAssignees[idx].value,
        dueDate: rfiDues[idx].value,
        segmentIdx: sIdx,
        subSegmentIdx: subIdx,
        milestoneIdx: mIdx,
        description: (currentProject.rfis || [])[idx]?.description || '',
        cloudLinks: (currentProject.rfis || [])[idx]?.cloudLinks || ''
      });
    });
    updates.rfis = newRfis;

    updateProject(selectedProjectId, updates);
    
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
        }, 2000);
      }
    }, 500); // UI feel
  };

  if (isEditing) {
    const container = document.getElementById('page-content');
    if (container && !container.dataset.hasSaveListener) {
      container.dataset.hasSaveListener = "true";
      let autoSaveTimeout;
      container.addEventListener('change', (e) => {
        // Ignore buttons/etc
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') return;
        if (e.target.classList.contains('edit-rfi-assignee') || e.target.classList.contains('edit-task-assignee')) {
          checkResourceConflict(e.target.value);
        }
        
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
          performSilentSave(false);
        }, 500);
      });
    }
  }

  // Range Slider real-time UI update (optional, but good UX)
  document.querySelectorAll('.edit-phase-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      e.target.nextElementSibling.textContent = `${e.target.value}%`;
    });
  });

  document.querySelectorAll('.edit-segment-matrix-progress, .edit-subsegment-matrix-progress').forEach(slider => {
    slider.addEventListener('input', (e) => {
      // It is either a slider or a hidden input. If hidden input, it doesn't fire input event anyway.
      if (e.target.type !== 'range') return;
      
      const val = parseInt(e.target.value);
      e.target.nextElementSibling.textContent = `${val}%`;
      if (val >= 100) {
        e.target.nextElementSibling.style.color = 'var(--text-success)';
      } else {
        e.target.nextElementSibling.style.color = 'inherit';
      }
      
      // Update parent immediately if this is a subsegment slider
      if (e.target.classList.contains('edit-subsegment-matrix-progress')) {
        const sIdx = e.target.dataset.sidx;
        const mIdx = e.target.dataset.midx;
        
        const subSliders = document.querySelectorAll(`.edit-subsegment-matrix-progress[data-sidx="${sIdx}"][data-midx="${mIdx}"]`);
        let sum = 0;
        subSliders.forEach(s => sum += parseInt(s.value) || 0);
        const avg = subSliders.length > 0 ? Math.round(sum / subSliders.length) : 0;
        
        const pFill = document.querySelector(`.parent-progress-fill-${sIdx}-${mIdx}`);
        const pText = document.querySelector(`.parent-progress-text-${sIdx}-${mIdx}`);
        const pHidden = document.getElementById(`parent-hidden-${sIdx}-${mIdx}`);
        
        if (pFill) {
          pFill.style.width = `${avg}%`;
          if (avg >= 100) pFill.classList.add('green');
          else pFill.classList.remove('green');
        }
        if (pText) pText.textContent = `${avg}%`;
        if (pHidden) pHidden.value = avg;
      }
    });
  });

  // Toggle Sub-segments visibility
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

  // Add Sub-segment
  document.querySelectorAll('.btn-add-subsegment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave(); // Save any pending text
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const sIdx = parseInt(e.currentTarget.dataset.sidx);
      if (!currentProj.segments[sIdx].subSegments) currentProj.segments[sIdx].subSegments = [];
      currentProj.segments[sIdx].subSegments.push({
        name: 'Đoạn nhỏ mới',
        progresses: []
      });
      updateProject(selectedProjectId, { segments: currentProj.segments });
      refreshDetail();
    });
  });

  // Delete Sub-segment
  document.querySelectorAll('.btn-delete-subsegment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave();
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const sIdx = parseInt(e.currentTarget.dataset.sidx);
      const subIdx = parseInt(e.currentTarget.dataset.subidx);
      currentProj.segments[sIdx].subSegments.splice(subIdx, 1);
      updateProject(selectedProjectId, { segments: currentProj.segments });
      refreshDetail();
    });
  });


  // Add Segment
  document.getElementById('btn-add-segment')?.addEventListener('click', () => {
    performSilentSave();
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    currentProj.segments.push({ 
      id: `S${Date.now()}`,
      name: 'Phân đoạn mới', 
      progress: 0 
    });
    updateProject(selectedProjectId, { segments: currentProj.segments });
    refreshDetail();
  });

  // Delete Segment
  document.querySelectorAll('.btn-delete-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave();
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentProj.segments.splice(idx, 1);
      updateProject(selectedProjectId, { segments: currentProj.segments });
      refreshDetail();
    });
  });

  // Add Milestone
  document.getElementById('btn-add-milestone')?.addEventListener('click', () => {
    performSilentSave();
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    if (!currentProj.milestones) currentProj.milestones = [];
    currentProj.milestones.push({ 
      id: `M${Date.now()}`,
      name: 'Mốc giao nộp mới', 
      date: new Date().toISOString().split('T')[0]
    });
    updateProject(selectedProjectId, { milestones: currentProj.milestones });
    refreshDetail();
  });

  // Delete Milestone
  document.querySelectorAll('.btn-delete-milestone').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave();
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentProj.milestones.splice(idx, 1);
      updateProject(selectedProjectId, { milestones: currentProj.milestones });
      refreshDetail();
    });
  });

  // Add Task
  document.getElementById('btn-add-task')?.addEventListener('click', () => {
    performSilentSave();
    const currentProj = getState().projects.find(p => p.id === selectedProjectId);
    currentProj.tasks.push({ 
      name: 'Công việc mới', 
      assignee: currentProj.teamLead, 
      progress: 0, 
      dueDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    updateProject(selectedProjectId, { tasks: currentProj.tasks });
    refreshDetail();
  });

  // Delete Task
  document.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave();
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentProj.tasks.splice(idx, 1);
      updateProject(selectedProjectId, { tasks: currentProj.tasks });
      refreshDetail();
    });
  });



  // Add RFI
  document.getElementById('btn-add-rfi')?.addEventListener('click', () => {
    performSilentSave();
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
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +7 days
    });
    updateProject(selectedProjectId, { rfis: currentProj.rfis });
    refreshDetail();
  });

  // Details Modal Triggers
  document.querySelectorAll('.btn-task-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      showItemDetailModal(project.tasks[idx], idx, 'task', project, refreshDetail);
    });
  });

  document.querySelectorAll('.btn-rfi-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      showItemDetailModal(project.rfis[idx], idx, 'rfi', project, refreshDetail);
    });
  });

  // Delete RFI
  document.querySelectorAll('.btn-delete-rfi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      performSilentSave();
      const currentProj = getState().projects.find(p => p.id === selectedProjectId);
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentProj.rfis.splice(idx, 1);
      updateProject(selectedProjectId, { rfis: currentProj.rfis });
      refreshDetail();
    });
  });




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
  // Cleanup logic if needed
}
