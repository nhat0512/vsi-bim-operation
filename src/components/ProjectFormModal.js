// ============================================
// PROJECT FORM MODAL — Add / Edit Project
// ============================================
import { addProject, updateProject, getState } from '../state.js';
import { openModal, closeModal } from './Modal.js';
import { DISCIPLINES, PROJECT_TYPES, LOD_LEVELS, PRIORITY_LEVELS } from '../data/constants.js';

/**
 * Show toast notification
 */
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/**
 * Open the project form modal in "add" or "edit" mode
 * @param {string} mode - 'add' or 'edit'
 * @param {Object|null} project - Existing project data (for edit mode)
 * @param {Function} onComplete - Callback after successful save
 */
export function openProjectForm(mode = 'add', project = null, onComplete = null) {
  const title = mode === 'add' ? '🆕 Tạo dự án mới' : `✏️ Chỉnh sửa — ${project?.name || ''}`;
  const html = renderProjectForm(mode, project);

  openModal(title, html, { size: 'wide' });

  // Defer event binding to next tick (after DOM update)
  setTimeout(() => initProjectFormEvents(mode, project, onComplete), 50);
}

/**
 * Render the project form HTML
 */
function renderProjectForm(mode, project) {
  const p = project || {};
  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return `
    <form id="project-form" autocomplete="off">
      <!-- Section 1: Thông tin cơ bản -->
      <div class="form-section-title">📋 Thông tin cơ bản</div>
      <div class="form-group">
        <label class="form-label">Tên dự án <span style="color: var(--accent-danger);">*</span></label>
        <input class="form-input" type="text" id="pf-name" value="${p.name || ''}" placeholder="VD: Mở rộng QL1A đoạn HCM - Long Thành" required />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Mã dự án <span style="color: var(--accent-danger);">*</span></label>
          <input class="form-input" type="text" id="pf-code" value="${p.code || ''}" placeholder="VD: QL1A-HCM-LT" style="text-transform: uppercase;" />
        </div>
        <div class="form-group">
          <label class="form-label">Loại dự án <span style="color: var(--accent-danger);">*</span></label>
          <select class="form-select" id="pf-type">
            ${Object.entries(PROJECT_TYPES).map(([key, val]) =>
              `<option value="${key}" ${p.type === key ? 'selected' : ''}>${val.icon} ${val.label}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Trạng thái</label>
          <select class="form-select" id="pf-status">
            <option value="planning" ${p.status === 'planning' ? 'selected' : ''}>📝 Lập kế hoạch</option>
            <option value="active" ${p.status === 'active' ? 'selected' : ''}>🟢 Đang triển khai</option>
            <option value="on-hold" ${p.status === 'on-hold' ? 'selected' : ''}>⏸️ Tạm dừng</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Ưu tiên <span style="color: var(--accent-danger);">*</span></label>
          <div class="priority-chips" id="pf-priority">
            ${Object.entries(PRIORITY_LEVELS).map(([key, val]) =>
              `<button type="button" class="priority-chip ${p.priority === key ? 'selected' : ''}" data-priority="${key}">${val.icon} ${val.label}</button>`
            ).join('')}
          </div>
        </div>
      </div>

      <!-- Section 2: Địa điểm & Quy mô -->
      <div class="form-section-title">📍 Địa điểm & Quy mô</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Chủ đầu tư <span style="color: var(--accent-danger);">*</span></label>
          <input class="form-input" type="text" id="pf-client" value="${p.client || ''}" placeholder="VD: Ban QLDA Đường bộ 7" />
        </div>
        <div class="form-group">
          <label class="form-label">Vị trí <span style="color: var(--accent-danger);">*</span></label>
          <input class="form-input" type="text" id="pf-location" value="${p.location || ''}" placeholder="VD: TP.HCM - Đồng Nai" />
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Chiều dài</label>
          <input class="form-input" type="text" id="pf-length" value="${p.length || ''}" placeholder="VD: 32.5 km" />
        </div>
        <div class="form-group">
          <label class="form-label">Ngân sách</label>
          <input class="form-input" type="text" id="pf-budget" value="${p.budget || ''}" placeholder="VD: 4,200 tỷ VNĐ" />
        </div>
        <div class="form-group">
          <label class="form-label">Quy mô team</label>
          <input class="form-input" type="number" id="pf-teamsize" value="${p.teamSize || 5}" min="1" max="200" />
        </div>
      </div>

      <!-- Section 3: Thời gian & BIM -->
      <div class="form-section-title">🗓️ Thời gian & Cấu hình BIM</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ngày bắt đầu <span style="color: var(--accent-danger);">*</span></label>
          <input class="form-input" type="date" id="pf-start" value="${p.startDate || today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Ngày kết thúc <span style="color: var(--accent-danger);">*</span></label>
          <input class="form-input" type="date" id="pf-end" value="${p.endDate || nextYear}" />
        </div>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">LOD Target <span style="color: var(--accent-danger);">*</span></label>
          <select class="form-select" id="pf-lod">
            ${LOD_LEVELS.map(l =>
              `<option value="${l.level}" ${(p.lodTarget || 300) === l.level ? 'selected' : ''}>${l.label} — ${l.desc}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">BEP Version</label>
          <input class="form-input" type="text" id="pf-bep" value="${p.bepVersion || 'v1.0'}" placeholder="v1.0" />
        </div>
        <div class="form-group">
          <label class="form-label">Team Lead</label>
          <input class="form-input" type="text" id="pf-teamlead" value="${p.teamLead || ''}" placeholder="VD: Nguyễn Văn An" />
        </div>
      </div>

      <!-- Section 4: Bộ môn thiết kế -->
      <div class="form-section-title">🔧 Bộ môn thiết kế <span style="color: var(--accent-danger);">*</span></div>
      <div class="discipline-select" id="pf-disciplines">
        ${DISCIPLINES.map(d => {
          const isSelected = p.disciplines ? p.disciplines.includes(d.id) : (d.id === 'road');
          return `<button type="button" class="discipline-chip ${isSelected ? 'selected' : ''}" data-discipline="${d.id}">${d.icon} ${d.label}</button>`;
        }).join('')}
      </div>

      <!-- Form Actions -->
      <div class="form-footer">
        <button type="button" class="btn btn-ghost" id="pf-cancel">Hủy</button>
        <button type="submit" class="btn btn-primary" id="pf-submit">
          ${mode === 'add' ? '🆕 Tạo dự án' : '💾 Lưu thay đổi'}
        </button>
      </div>
    </form>
  `;
}

/**
 * Initialize form events
 */
function initProjectFormEvents(mode, project, onComplete) {
  const form = document.getElementById('project-form');
  if (!form) return;

  // Priority chip toggle
  document.querySelectorAll('#pf-priority .priority-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#pf-priority .priority-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  // Discipline chip toggle
  document.querySelectorAll('#pf-disciplines .discipline-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
    });
  });

  // Cancel button
  document.getElementById('pf-cancel')?.addEventListener('click', closeModal);

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit(mode, project, onComplete);
  });
}

/**
 * Validate and submit the form
 */
function handleFormSubmit(mode, project, onComplete) {
  // Gather form values
  const name = document.getElementById('pf-name')?.value.trim();
  const code = document.getElementById('pf-code')?.value.trim().toUpperCase();
  const type = document.getElementById('pf-type')?.value;
  const status = document.getElementById('pf-status')?.value;
  const client = document.getElementById('pf-client')?.value.trim();
  const location = document.getElementById('pf-location')?.value.trim();
  const length = document.getElementById('pf-length')?.value.trim();
  const budget = document.getElementById('pf-budget')?.value.trim();
  const teamSize = document.getElementById('pf-teamsize')?.value;
  const startDate = document.getElementById('pf-start')?.value;
  const endDate = document.getElementById('pf-end')?.value;
  const lodTarget = document.getElementById('pf-lod')?.value;
  const bepVersion = document.getElementById('pf-bep')?.value.trim();
  const teamLead = document.getElementById('pf-teamlead')?.value.trim();

  // Priority
  const selectedPriority = document.querySelector('#pf-priority .priority-chip.selected');
  const priority = selectedPriority ? selectedPriority.dataset.priority : 'medium';

  // Disciplines
  const selectedDisciplines = Array.from(document.querySelectorAll('#pf-disciplines .discipline-chip.selected'))
    .map(el => el.dataset.discipline);

  // ---- Validation ----
  const errors = [];
  if (!name || name.length < 5) errors.push({ field: 'pf-name', msg: 'Tên dự án phải có ít nhất 5 ký tự' });
  if (!code) errors.push({ field: 'pf-code', msg: 'Vui lòng nhập mã dự án' });
  if (!client) errors.push({ field: 'pf-client', msg: 'Vui lòng nhập chủ đầu tư' });
  if (!location) errors.push({ field: 'pf-location', msg: 'Vui lòng nhập vị trí' });
  if (!startDate) errors.push({ field: 'pf-start', msg: 'Vui lòng chọn ngày bắt đầu' });
  if (!endDate) errors.push({ field: 'pf-end', msg: 'Vui lòng chọn ngày kết thúc' });
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    errors.push({ field: 'pf-end', msg: 'Ngày kết thúc phải sau ngày bắt đầu' });
  }
  if (selectedDisciplines.length === 0) errors.push({ field: 'pf-disciplines', msg: 'Chọn ít nhất 1 bộ môn' });

  // Check unique code (only for add, or for edit if code changed)
  if (mode === 'add' || (project && code !== project.code)) {
    const { projects } = getState();
    if (projects.some(p => p.code === code)) {
      errors.push({ field: 'pf-code', msg: 'Mã dự án đã tồn tại' });
    }
  }

  // Clear old errors
  document.querySelectorAll('.form-input.error, .form-select.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => el.remove());

  if (errors.length > 0) {
    errors.forEach(err => {
      const field = document.getElementById(err.field);
      if (field) {
        field.classList.add('error');
        const errDiv = document.createElement('div');
        errDiv.className = 'form-error';
        errDiv.textContent = err.msg;
        field.parentElement.appendChild(errDiv);
      }
    });
    // Scroll to first error
    const firstErr = document.getElementById(errors[0].field);
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // ---- Build project data ----
  const projectData = {
    name, code, type, status, priority,
    client, location, length, budget,
    teamSize, startDate, endDate,
    lodTarget, bepVersion, teamLead,
    disciplines: selectedDisciplines
  };

  if (mode === 'add') {
    addProject(projectData);
    showToast(`Đã tạo dự án "${name}" thành công!`);
  } else {
    updateProject(project.id, projectData);
    showToast(`Đã cập nhật dự án "${name}" thành công!`);
  }

  closeModal();

  if (onComplete) onComplete();
}
