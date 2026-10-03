// ============================================
// ANALYTICS — Charts, Performance, Reports
// ============================================
import { getState } from '../state.js';

export function render() {
  const { projects, personnel, qualityData } = getState();

  return `
    <div class="animate-fade-in-up">
      <div class="section-header">
        <div>
          <h1 class="section-title">📈 Phân tích & Báo cáo</h1>
          <div class="section-subtitle">Performance Analytics · Resource Utilization · Risk Assessment</div>
        </div>
      </div>

      <!-- Project Progress Chart -->
      <div class="grid-2 mb-lg">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Tiến độ dự án</h3>
          </div>
          ${renderProgressChart(projects)}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">👥 Resource Utilization</h3>
          </div>
          ${renderUtilizationChart(personnel)}
        </div>
      </div>

      <div class="grid-2 mb-lg">
        <!-- Risk Matrix -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚠️ Đánh giá rủi ro dự án</h3>
          </div>
          ${renderRiskAssessment(projects, qualityData)}
        </div>

        <!-- Clash Trend -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚡ Clash Detection Summary</h3>
          </div>
          ${renderClashSummaryChart(qualityData)}
        </div>
      </div>

      <!-- Team Performance -->
      <div class="card mb-lg">
        <div class="card-header">
          <h3 class="card-title">🏅 Năng suất team</h3>
        </div>
        ${renderTeamPerformance(personnel)}
      </div>

      <!-- LOD Progress Overview -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📐 LOD Progress Overview</h3>
        </div>
        ${renderLODOverview(projects)}
      </div>
    </div>
  `;
}

function renderProgressChart(projects) {
  const maxProgress = 100;
  return `
    <div class="chart-bar-group" style="height: 200px; align-items: flex-end; padding: 16px 0;">
      ${projects.map((p, i) => {
        const height = (p.progress / maxProgress) * 180;
        const colors = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-purple)', 'var(--accent-warning)', 'var(--accent-cyan)', 'var(--accent-danger)'];
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <span class="text-xs font-bold">${p.progress}%</span>
            <div class="chart-bar" style="height: ${height}px; background: linear-gradient(to top, ${colors[i]}, ${colors[i]}88); width: 100%; border-radius: 6px 6px 0 0;"></div>
            <span class="text-xs text-muted" style="text-align: center; line-height: 1.2; max-width: 80px;">${p.code}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderUtilizationChart(personnel) {
  return `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${personnel.map(p => {
        const color = p.totalAllocation > 100 ? 'var(--accent-danger)' : p.totalAllocation >= 80 ? 'var(--accent-warning)' : 'var(--accent-secondary)';
        const width = Math.min(p.totalAllocation, 120);
        return `
          <div class="flex items-center gap-sm" style="font-size: 0.75rem;">
            <span style="width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);">${p.name}</span>
            <div style="flex: 1; height: 20px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; position: relative;">
              <div style="height: 100%; width: ${width}%; background: ${color}; border-radius: 4px; transition: width 0.5s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px;">
                <span style="font-weight: 700; font-size: 0.65rem; color: white;">${p.totalAllocation}%</span>
              </div>
              ${p.totalAllocation > 100 ? '<div style="position: absolute; left: 83.3%; top: 0; bottom: 0; width: 2px; background: white; opacity: 0.4;"></div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="chart-legend mt-md">
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-secondary);"></div> &lt; 80%</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-warning);"></div> 80-100%</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-danger);"></div> &gt; 100% (Quá tải)</div>
    </div>
  `;
}

function renderRiskAssessment(projects, qualityData) {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Dự án</th>
          <th>Tiến độ</th>
          <th>Health</th>
          <th>Clash</th>
          <th>Rủi ro</th>
        </tr>
      </thead>
      <tbody>
        ${projects.map(p => {
          const clashInfo = qualityData?.clashSummary?.find(c => c.projectId === p.id);
          const unresolvedClashes = clashInfo ? (clashInfo.total - clashInfo.resolved) : 0;
          
          // Risk calculation
          let riskScore = 0;
          if (p.progress < 30 && new Date(p.endDate) < new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)) riskScore += 3;
          if (p.modelHealth < 70) riskScore += 2;
          if (unresolvedClashes > 50) riskScore += 2;
          if (clashInfo?.critical > 5) riskScore += 3;
          
          const riskLevel = riskScore >= 5 ? 'Cao' : riskScore >= 3 ? 'Trung bình' : 'Thấp';
          const riskBadge = riskScore >= 5 ? 'overdue' : riskScore >= 3 ? 'on-hold' : 'active';
          const riskIcon = riskScore >= 5 ? '🔴' : riskScore >= 3 ? '🟡' : '🟢';

          return `
            <tr>
              <td class="font-semibold text-sm">${p.name.substring(0, 25)}...</td>
              <td>
                <div class="flex items-center gap-sm">
                  <div class="progress-bar" style="width: 60px;">
                    <div class="progress-bar-fill ${p.progress >= 50 ? 'green' : 'orange'}" style="width: ${p.progress}%;"></div>
                  </div>
                  <span class="text-xs">${p.progress}%</span>
                </div>
              </td>
              <td><span class="text-sm font-bold" style="color: ${p.modelHealth >= 80 ? 'var(--accent-secondary)' : 'var(--accent-warning)'};">${p.modelHealth}%</span></td>
              <td class="text-sm">${unresolvedClashes} chưa xử lý</td>
              <td><span class="badge ${riskBadge}">${riskIcon} ${riskLevel}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderClashSummaryChart(qualityData) {
  if (!qualityData?.clashSummary) return '<div class="text-muted text-sm">Không có dữ liệu</div>';

  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${qualityData.clashSummary.map(c => {
        const total = c.total || 1;
        const resolvedPct = (c.resolved / total) * 100;
        const inProgressPct = (c.inProgress / total) * 100;
        const newPct = (c.newClashes / total) * 100;

        return `
          <div>
            <div class="flex justify-between mb-xs">
              <span class="text-xs font-semibold">${c.projectName.substring(0, 25)}</span>
              <span class="text-xs text-muted">${c.total} clashes</span>
            </div>
            <div class="resource-alloc-bar" style="height: 22px;">
              <div class="resource-alloc-segment" style="width: ${resolvedPct}%; background: var(--accent-secondary);" title="Resolved: ${c.resolved}">${resolvedPct > 15 ? c.resolved : ''}</div>
              <div class="resource-alloc-segment" style="width: ${inProgressPct}%; background: var(--accent-warning);" title="In Progress: ${c.inProgress}">${inProgressPct > 15 ? c.inProgress : ''}</div>
              <div class="resource-alloc-segment" style="width: ${newPct}%; background: var(--accent-danger);" title="New: ${c.newClashes}">${newPct > 15 ? c.newClashes : ''}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="chart-legend mt-md">
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-secondary);"></div> Resolved</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-warning);"></div> In Progress</div>
      <div class="chart-legend-item"><div class="chart-legend-dot" style="background: var(--accent-danger);"></div> New</div>
    </div>
  `;
}

function renderTeamPerformance(personnel) {
  // Simulate performance metrics
  return `
    <div class="grid-3" style="gap: 12px;">
      ${personnel.slice(0, 9).map((p, i) => {
        const performance = 100 - Math.abs(p.totalAllocation - 85) * 0.8 + Math.random() * 10;
        const perfScore = Math.min(Math.max(Math.round(performance), 50), 100);
        const color = perfScore >= 85 ? 'var(--accent-secondary)' : perfScore >= 70 ? 'var(--accent-primary)' : 'var(--accent-warning)';
        
        return `
          <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: var(--radius-md); background: var(--bg-tertiary);">
            <div class="sidebar-avatar" style="width: 32px; height: 32px; font-size: 0.6rem;">${p.avatar}</div>
            <div style="flex: 1; min-width: 0;">
              <div class="text-xs font-semibold truncate">${p.name}</div>
              <div class="text-xs text-muted">${p.role}</div>
            </div>
            <div style="text-align: right;">
              <div class="text-sm font-bold" style="color: ${color};">${perfScore}%</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderLODOverview(projects) {
  return `
    <div class="grid-3" style="gap: 16px;">
      ${projects.map(p => {
        const lodPct = Math.round((p.lodCurrent / p.lodTarget) * 100);
        const color = lodPct >= 80 ? 'green' : lodPct >= 50 ? '' : 'orange';
        return `
          <div style="padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
            <div class="text-sm font-semibold mb-sm">${p.name.substring(0, 25)}</div>
            <div class="flex justify-between mb-xs">
              <span class="text-xs text-muted">LOD ${p.lodCurrent} → ${p.lodTarget}</span>
              <span class="text-xs font-bold">${lodPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill ${color}" style="width: ${lodPct}%;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function init() {}
export function destroy() {}
