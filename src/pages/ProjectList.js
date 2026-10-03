import { getState, setState, subscribe } from '../state.js';

let localSearch = '';
let localType = 'all';
let localStatus = 'all';

export function render() {
  const { projects } = getState();

  let filteredProjects = projects;
  if (localSearch) {
    const q = localSearch.toLowerCase();
    filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }
  if (localType !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.type === localType);
  }
  if (localStatus !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.status === localStatus);
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return '<span class="badge active"><span class="badge-dot"></span>Đang chạy</span>';
      case 'planning': return '<span class="badge planning"><span class="badge-dot"></span>Lập kế hoạch</span>';
      case 'completed': return '<span class="badge completed"><span class="badge-dot"></span>Hoàn thành</span>';
      case 'on-hold': return '<span class="badge on-hold"><span class="badge-dot"></span>Tạm dừng</span>';
      default: return `<span class="badge">${status}</span>`;
    }
  };

  const renderTable = (projectsToRender) => {
    if (projectsToRender.length === 0) {
      return `
        <div style="padding: 32px; text-align: center; color: var(--text-muted);">
          Không tìm thấy dự án phù hợp với bộ lọc.
        </div>
      `;
    }
    
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Dự án</th>
            <th>Chủ đầu tư</th>
            <th>Tiến độ</th>
            <th>Ngân sách</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${projectsToRender.map(p => `
            <tr style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'" class="row-project-link" data-id="${p.id}">
              <td>
                <div class="cell-project">
                  <div class="project-icon" style="font-size: 1.5rem; margin-right: 12px;">${p.type === 'bridge' ? '🌉' : p.type === 'tunnel' ? '🚇' : '🛣️'}</div>
                  <div>
                    <div class="project-name font-bold text-md text-accent">${p.name}</div>
                    <div class="project-code text-xs text-muted">${p.id} • ${p.location}</div>
                  </div>
                </div>
              </td>
              <td class="font-semibold text-sm">${p.client || '-'}</td>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="progress-bar" style="width: 100px;">
                    <div class="progress-bar-fill ${p.progress >= 80 ? 'green' : p.progress >= 40 ? '' : 'orange'}" style="width: ${p.progress}%;"></div>
                  </div>
                  <span class="text-xs font-bold">${p.progress}%</span>
                </div>
              </td>
              <td class="text-sm">${p.budget || '-'}</td>
              <td>${getStatusBadge(p.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  // Expose renderTable so init() can use it
  window.__projectListRenderTable = renderTable;

  return `
    <div class="animate-fade-in-up">
      <div class="section-header">
        <div>
          <h1 class="section-title">📁 Danh sách Dự án</h1>
          <div class="section-subtitle">Quản lý tổng thể danh mục dự án hạ tầng</div>
        </div>
      </div>

      <div class="kpi-grid mb-lg" style="grid-template-columns: repeat(4, 1fr);">
        <div class="kpi-card blue">
          <div class="kpi-card-value">${projects.length}</div>
          <div class="kpi-card-label">Tổng dự án</div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-card-value">${projects.filter(p => p.status === 'active').length}</div>
          <div class="kpi-card-label">Đang triển khai</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-card-value">${projects.filter(p => p.status === 'planning').length}</div>
          <div class="kpi-card-label">Đang lập kế hoạch</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-card-value">${projects.filter(p => p.status === 'completed').length}</div>
          <div class="kpi-card-label">Đã hoàn thành</div>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="card mb-md" style="padding: 12px 16px;">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <input type="text" id="pl-search" class="form-input" placeholder="🔍 Tìm kiếm dự án..." value="${localSearch}" style="flex: 1; min-width: 200px;">
          <select id="pl-type" class="form-select" style="width: 150px;">
            <option value="all" ${localType === 'all' ? 'selected' : ''}>Tất cả loại hình</option>
            <option value="road" ${localType === 'road' ? 'selected' : ''}>Đường bộ</option>
            <option value="bridge" ${localType === 'bridge' ? 'selected' : ''}>Cầu</option>
            <option value="tunnel" ${localType === 'tunnel' ? 'selected' : ''}>Hầm</option>
          </select>
          <select id="pl-status" class="form-select" style="width: 150px;">
            <option value="all" ${localStatus === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
            <option value="active" ${localStatus === 'active' ? 'selected' : ''}>Đang chạy</option>
            <option value="planning" ${localStatus === 'planning' ? 'selected' : ''}>Lập kế hoạch</option>
            <option value="on-hold" ${localStatus === 'on-hold' ? 'selected' : ''}>Tạm dừng</option>
            <option value="completed" ${localStatus === 'completed' ? 'selected' : ''}>Hoàn thành</option>
          </select>
        </div>
      </div>

      <div class="card" id="pl-table-container">
        ${renderTable(filteredProjects)}
      </div>
    </div>
  `;
}

export function init() {
  const bindRowEvents = () => {
    document.querySelectorAll('.row-project-link').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = '#project-detail/' + row.dataset.id;
      });
    });
  };

  bindRowEvents();

  const refreshFilters = () => {
    localSearch = document.getElementById('pl-search')?.value || '';
    localType = document.getElementById('pl-type')?.value || 'all';
    localStatus = document.getElementById('pl-status')?.value || 'all';
    
    const { projects } = getState();
    let filteredProjects = projects;
    if (localSearch) {
      const q = localSearch.toLowerCase();
      filteredProjects = filteredProjects.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (localType !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.type === localType);
    }
    if (localStatus !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === localStatus);
    }

    const container = document.getElementById('pl-table-container');
    if (container && window.__projectListRenderTable) {
      container.innerHTML = window.__projectListRenderTable(filteredProjects);
      bindRowEvents();
    }
  };

  document.getElementById('pl-search')?.addEventListener('input', refreshFilters);
  document.getElementById('pl-type')?.addEventListener('change', refreshFilters);
  document.getElementById('pl-status')?.addEventListener('change', refreshFilters);
}

export function destroy() {
  delete window.__projectListRenderTable;
}
