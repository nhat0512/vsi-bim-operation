// ============================================
// QUALITY — BIM Quality Control & Clash Detection
// ============================================
import { getState } from '../state.js';

export function render() {
  const { qualityData } = getState();
  if (!qualityData) return '<div class="empty-state"><div class="empty-state__icon">⏳</div><div class="empty-state__text">Đang tải dữ liệu...</div></div>';

  const q = qualityData;

  return `
    <div class="animate-fade-in-up">
      <div class="section-header">
        <div>
          <h1 class="section-title">✅ Chất lượng BIM</h1>
          <div class="section-subtitle">LOD Tracking · BEP Compliance · Clash Detection</div>
        </div>
      </div>

      <!-- Quality Score Overview -->
      <div class="kpi-grid stagger-children mb-lg" style="grid-template-columns: repeat(5, 1fr);">
        ${renderScoreCard('Overall', q.overallScore, '🏆')}
        ${renderScoreCard('BEP', q.bepCompliance, '📋')}
        ${renderScoreCard('LOD', q.lodCompliance, '📐')}
        ${renderScoreCard('Consistency', q.modelConsistency, '🔗')}
        ${renderScoreCard('Clash Score', q.clashScore, '⚡')}
      </div>

      <!-- Tabs -->
      <div class="tabs" id="quality-tabs">
        <button class="tab active" data-qtab="clashes">⚡ Clash Detection</button>
        <button class="tab" data-qtab="lod">📐 LOD Tracking</button>
        <button class="tab" data-qtab="bep">📋 BEP Compliance</button>
      </div>

      <div id="quality-tab-content">
        ${renderClashTab(q)}
      </div>
    </div>
  `;
}

function renderScoreCard(label, score, icon) {
  const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
  const strokeColor = score >= 80 ? 'var(--accent-secondary)' : score >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return `
    <div class="kpi-card ${color}">
      <div class="flex items-center justify-center mb-sm">
        <div class="quality-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="quality-ring-bg" cx="50" cy="50" r="45"/>
            <circle class="quality-ring-fill" cx="50" cy="50" r="45" stroke="${strokeColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
          </svg>
          <div class="quality-ring-value">
            <div class="quality-ring-number" style="font-size: 1.5rem;">${score}</div>
          </div>
        </div>
      </div>
      <div class="text-sm font-semibold" style="text-align: center;">${icon} ${label}</div>
    </div>
  `;
}

function renderClashTab(q) {
  return `
    <!-- Clash Summary per Project -->
    <div class="card mb-lg">
      <div class="card-header">
        <h3 class="card-title">📊 Tổng hợp Clash theo dự án</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Dự án</th>
            <th>Tổng</th>
            <th>Mới</th>
            <th>Đang xử lý</th>
            <th>Đã giải quyết</th>
            <th>Nghiêm trọng</th>
            <th>Tỷ lệ xử lý</th>
          </tr>
        </thead>
        <tbody>
          ${q.clashSummary.map(c => {
            const rate = c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0;
            return `
              <tr>
                <td class="font-semibold">${c.projectName}</td>
                <td class="text-sm">${c.total}</td>
                <td><span class="badge overdue">${c.newClashes}</span></td>
                <td><span class="badge on-hold">${c.inProgress}</span></td>
                <td><span class="badge active">${c.resolved}</span></td>
                <td><span class="badge ${c.critical > 5 ? 'overdue' : 'on-hold'}">${c.critical}</span></td>
                <td>
                  <div class="flex items-center gap-sm">
                    <div class="progress-bar" style="width: 70px;">
                      <div class="progress-bar-fill ${rate >= 70 ? 'green' : rate >= 40 ? '' : 'red'}" style="width: ${rate}%;"></div>
                    </div>
                    <span class="text-xs font-bold">${rate}%</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Recent Clashes -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">🔍 Clash gần đây</h3>
        <span class="badge overdue">${q.recentClashes.filter(c => c.status === 'new').length} mới</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Dự án</th>
            <th>Loại</th>
            <th>Bộ môn</th>
            <th>Mô tả</th>
            <th>Mức độ</th>
            <th>Phụ trách</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${q.recentClashes.map(c => {
            const sevBadge = { critical: 'overdue', high: 'on-hold', medium: 'planning', low: 'active' };
            const statBadge = { 'new': 'overdue', 'in-progress': 'on-hold', 'resolved': 'active' };
            const statLabel = { 'new': 'Mới', 'in-progress': 'Đang xử lý', 'resolved': 'Đã xử lý' };
            return `
              <tr>
                <td class="text-xs font-semibold text-muted">${c.id}</td>
                <td class="text-sm">${c.project}</td>
                <td><span class="badge ${c.type === 'Hard' ? 'overdue' : 'planning'}">${c.type}</span></td>
                <td class="text-xs">${c.disciplines}</td>
                <td class="text-xs" style="max-width: 200px;">${c.description}</td>
                <td><span class="badge ${sevBadge[c.severity]}">${c.severity}</span></td>
                <td class="text-sm">${c.assignee}</td>
                <td><span class="badge ${statBadge[c.status]}"><span class="badge-dot"></span>${statLabel[c.status]}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLODTab(q) {
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📐 LOD Tracking theo bộ môn</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Dự án</th>
            <th>Bộ môn</th>
            <th>LOD Target</th>
            <th>LOD Hiện tại</th>
            <th>Compliance</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${q.lodTracking.map(l => {
            const { projects } = getState();
            const proj = projects.find(p => p.id === l.projectId);
            const compColor = l.compliance >= 80 ? 'green' : l.compliance >= 50 ? 'orange' : 'red';
            return `
              <tr>
                <td class="text-sm font-semibold">${proj ? proj.name.substring(0, 25) : l.projectId}</td>
                <td class="text-sm">${l.discipline}</td>
                <td><span class="badge planning">LOD ${l.targetLOD}</span></td>
                <td><span class="badge active">LOD ${l.currentLOD}</span></td>
                <td>
                  <div class="flex items-center gap-sm">
                    <div class="progress-bar" style="width: 80px;">
                      <div class="progress-bar-fill ${compColor}" style="width: ${l.compliance}%;"></div>
                    </div>
                    <span class="text-xs font-bold">${l.compliance}%</span>
                  </div>
                </td>
                <td>
                  <span class="badge ${l.compliance >= 80 ? 'active' : l.compliance >= 50 ? 'on-hold' : 'overdue'}">
                    ${l.compliance >= 80 ? '✅ Đạt' : l.compliance >= 50 ? '⚠️ Chưa đạt' : '❌ Chậm'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBEPTab(q) {
  const passed = q.bepChecklist.filter(b => b.status === 'pass').length;
  const warnings = q.bepChecklist.filter(b => b.status === 'warning').length;
  const failed = q.bepChecklist.filter(b => b.status === 'fail').length;

  return `
    <div class="kpi-grid mb-lg" style="grid-template-columns: repeat(3, 1fr);">
      <div class="kpi-card green"><div class="kpi-card-value">${passed}</div><div class="kpi-card-label">✅ Đạt</div></div>
      <div class="kpi-card orange"><div class="kpi-card-value">${warnings}</div><div class="kpi-card-label">⚠️ Cảnh báo</div></div>
      <div class="kpi-card red"><div class="kpi-card-value">${failed}</div><div class="kpi-card-label">❌ Không đạt</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 BEP Compliance Checklist</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Hạng mục</th>
            <th>Trạng thái</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${q.bepChecklist.map(b => {
            const statusIcon = { pass: '✅', warning: '⚠️', fail: '❌' };
            const statusBadge = { pass: 'active', warning: 'on-hold', fail: 'overdue' };
            const statusLabel = { pass: 'Đạt', warning: 'Cảnh báo', fail: 'Không đạt' };
            return `
              <tr>
                <td class="text-xs text-muted font-semibold">${b.id}</td>
                <td class="text-sm font-semibold">${b.item}</td>
                <td><span class="badge ${statusBadge[b.status]}">${statusIcon[b.status]} ${statusLabel[b.status]}</span></td>
                <td class="text-xs text-muted">${b.notes || '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function init() {
  document.querySelectorAll('#quality-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#quality-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const { qualityData } = getState();
      const container = document.getElementById('quality-tab-content');
      if (!container || !qualityData) return;

      switch (tab.dataset.qtab) {
        case 'clashes': container.innerHTML = renderClashTab(qualityData); break;
        case 'lod': container.innerHTML = renderLODTab(qualityData); break;
        case 'bep': container.innerHTML = renderBEPTab(qualityData); break;
      }
    });
  });
}

export function destroy() {}
