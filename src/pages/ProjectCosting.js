// ============================================
// PROJECT COSTING — Spreadsheet-like Cost Estimator & Rate Engine
// ============================================

import { getState } from '../state.js';
import {
  loadCostingData,
  saveCostingData,
  getProjectCosting,
  saveProjectCosting,
  getProjectRevisions,
  setActiveRevision,
  createProjectRevision,
  deleteProjectRevision,
  aggregateWBSActualHours,
  calculateRowCost,
  formatVND,
  addCategory,
  deleteCategory,
  updateRates,
  exportCostingToCSV,
  parseExcelTSV,
  refreshAllRowRates,
  fetchProjectCostingFromCloud,
  fetchCostingConfigFromCloud,
  onCostingSyncStatusChange
} from '../utils/costingStorage.js';
import { openModal, closeModal } from '../components/Modal.js';
import { showToast } from '../components/ProjectFormModal.js';

let selectedProjectId = null;
let currentEntries = [];
let costingData = null;

// State History (Undo / Redo) Management
let undoStack = []; // Max 20 snapshots of currentEntries
let redoStack = [];
const MAX_HISTORY = 20;
let lastActiveRowIndex = 0;
let cellPreEditSnapshot = null;
let handleKeyDown = null;
let handleDocumentPaste = null;
let unsubscribeSyncStatus = null;

/**
 * Get active project object
 */
function getActiveProject(projects) {
  if (!projects || projects.length === 0) return null;
  if (selectedProjectId) {
    const found = projects.find(p => p.id === selectedProjectId);
    if (found) return found;
  }
  // Try state selectedProjectId
  const stateProjId = getState().selectedProjectId;
  if (stateProjId) {
    const found = projects.find(p => p.id === stateProjId);
    if (found) {
      selectedProjectId = stateProjId;
      return found;
    }
  }
  selectedProjectId = projects[0].id;
  return projects[0];
}

/**
 * Seed initial demonstration data if project has never had entries
 */
function getOrSeedEntries(projectId, revisionId = null) {
  let entries = getProjectCosting(projectId, revisionId);
  if (!entries || entries.length === 0) {
    const proj = getProjectRevisions(projectId);
    if (proj.revisions.length <= 1 && (!revisionId || revisionId === 'rev_0')) {
      // Seed default sample data matching user spec with frozen appliedRate
      entries = [
        { id: 'ce_1', category: 'ATGT', rateId: 'R001', appliedRate: 150000, km: 5.2, hoursPerKm: 13 },
        { id: 'ce_2', category: 'Đường', rateId: 'R002', appliedRate: 120000, km: 3.0, hoursPerKm: 10 },
        { id: 'ce_3', category: 'Cầu', rateId: 'R003', appliedRate: 100000, km: 2.5, hoursPerKm: 8 }
      ];
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === projectId);
      saveProjectCosting(projectId, entries, currentProj, 'rev_0');
    }
  }
  return entries || [];
}

/**
 * Render main Costing page
 */
export function render() {
  const { projects } = getState();
  costingData = loadCostingData();
  const project = getActiveProject(projects || []);

  if (!project) {
    return `
      <div class="costing-page">
        <div class="costing-empty-state">
          <div class="costing-empty-icon">📁</div>
          <h3>Chưa có dự án nào trong hệ thống</h3>
          <p>Vui lòng tạo dự án trước khi lập báo giá & dự toán chi phí.</p>
        </div>
      </div>
    `;
  }

  const projRevisions = getProjectRevisions(project.id);
  const revisions = projRevisions.revisions || [];
  const activeRevisionId = projRevisions.activeRevisionId || revisions[0]?.id || 'rev_0';
  currentEntries = getOrSeedEntries(project.id, activeRevisionId);
  const { categories, rates } = costingData;

  // Compute totals
  let totalCost = 0;
  let totalCostAfterTax = 0;
  let totalHours = 0;
  let totalKm = 0;

  currentEntries.forEach(entry => {
    const calc = calculateRowCost(entry, rates);
    totalCost += calc.cost;
    totalCostAfterTax += calc.costAfterTax;
    totalHours += calc.hoursPerKm;
    totalKm += calc.km;
  });

  const avgCostPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;

  return `
    <div class="costing-page animate-fade-in-up" id="project-costing-container">
      <!-- Section Header -->
      <div class="section-header" style="margin-bottom: 16px;">
        <div>
          <h1 class="section-title">💰 Báo Giá & Tính Toán Chi Phí Dự Án</h1>
          <div class="section-subtitle">Dự toán nội bộ theo định mức giờ kỹ sư, đơn giá cấp bậc & khối lượng Km</div>
        </div>
      </div>

      <!-- Controls & Project Switcher -->
      <div class="costing-header-bar">
        <div class="costing-selector-bar">
          <div class="costing-project-selector-group">
            <label for="costing-project-select" style="font-weight: 700; font-size: 0.9rem; color: var(--text-muted); white-space: nowrap;">
              📂 Dự án:
            </label>
            <select id="costing-project-select" class="costing-project-select">
              ${(projects || []).map(p => `
                <option value="${p.id}" ${p.id === project.id ? 'selected' : ''}>
                  [${p.code || p.id}] ${p.name}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="costing-revision-selector-group">
            <label for="costing-revision-select" style="font-weight: 700; font-size: 0.88rem; color: var(--text-muted); white-space: nowrap;">
              📑 Phiên bản:
            </label>
            <select id="costing-revision-select" class="costing-revision-select">
              ${revisions.map(r => `
                <option value="${r.id}" ${r.id === activeRevisionId ? 'selected' : ''}>
                  ${r.name}
                </option>
              `).join('')}
            </select>
            <button class="costing-btn-new-rev" id="btn-costing-new-rev" title="Nhân bản bảng tính hiện tại sang phiên bản mới (Rev A, Rev B...)">
              + Bản sao (New Rev)
            </button>
            ${revisions.length > 1 ? `
              <button class="btn-costing-del-rev" id="btn-costing-del-rev" title="Xóa phiên bản này">
                🗑️
              </button>
            ` : ''}
          </div>
        </div>

        <div class="costing-action-buttons">
          <button class="btn btn-primary" id="btn-costing-add-row" title="Thêm dòng mới vào bảng tính">
            + Thêm dòng
          </button>
          <button class="btn btn-outline costing-btn-sync-wbs" id="btn-costing-sync-wbs" title="Đồng bộ giờ làm thực tế từ WBS / Bảng chấm công của dự án này">
            🔄 Đồng bộ giờ từ WBS
          </button>
          <button class="btn btn-outline costing-btn-history" id="btn-costing-undo" title="Hoàn tác thao tác trước (Ctrl+Z)" disabled>
            ↶ Hoàn tác
          </button>
          <button class="btn btn-outline costing-btn-history" id="btn-costing-redo" title="Làm lại thao tác vừa hoàn tác (Ctrl+Y)" disabled>
            ↷ Làm lại
          </button>
          <button class="btn btn-outline" id="btn-costing-refresh-rates" title="Áp dụng lại đơn giá chuẩn mới nhất từ Bảng đơn giá cho toàn bộ các dòng">
            🔄 Áp đơn giá mới
          </button>
          <button class="btn btn-outline" id="btn-costing-manage-rates" title="Chỉnh sửa bảng đơn giá tham chiếu theo cấp bậc">
            📋 Bảng đơn giá
          </button>
          <button class="btn btn-outline" id="btn-costing-manage-categories" title="Quản lý thêm/xóa danh mục hạng mục">
            🏷️ Hạng mục
          </button>
          <button class="btn btn-outline" id="btn-costing-export-csv" title="Xuất dữ liệu sang file Excel (CSV UTF-8)">
            📥 Xuất Excel
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="costing-kpi-grid">
        <div class="costing-kpi-card blue">
          <div class="costing-kpi-title">
            <span>Tổng Chi Phí (Trước thuế)</span>
            <span>💵</span>
          </div>
          <div class="costing-kpi-val" id="kpi-total-cost">${formatVND(totalCost)}</div>
          <div class="costing-kpi-sub">Tổng giá trị định mức nhân sự</div>
        </div>

        <div class="costing-kpi-card green">
          <div class="costing-kpi-title">
            <span>Sau thuế (-10% khấu trừ)</span>
            <span>🛡️</span>
          </div>
          <div class="costing-kpi-val" id="kpi-total-tax" style="color: #10b981;">${formatVND(totalCostAfterTax)}</div>
          <div class="costing-kpi-sub">Thực nhận sau thuế 10%</div>
        </div>

        <div class="costing-kpi-card purple">
          <div class="costing-kpi-title">
            <span>Tổng giờ định mức</span>
            <span>⏱️</span>
          </div>
          <div class="costing-kpi-val" id="kpi-total-hours">${totalHours.toFixed(1)} <span style="font-size: 1rem; font-weight: 500;">giờ</span></div>
          <div class="costing-kpi-sub">Cho tổng cộng ${totalKm.toFixed(2)} Km</div>
        </div>

        <div class="costing-kpi-card amber">
          <div class="costing-kpi-title">
            <span>Đơn giá TB / Km</span>
            <span>📊</span>
          </div>
          <div class="costing-kpi-val" id="kpi-avg-cost">${formatVND(avgCostPerKm)}</div>
          <div class="costing-kpi-sub">${currentEntries.length} dòng hạng mục</div>
        </div>
      </div>

      <!-- Spreadsheet Grid Wrapper -->
      <div class="costing-spreadsheet-wrapper">
        <div class="costing-table-header-bar">
          <div class="costing-table-title">
            <span>📝 Bảng Tính Chi Phí Hạng Mục</span>
            <span class="badge blue" style="font-size: 0.75rem;">${project.code || project.id}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;" id="costing-save-indicator">
            <span class="costing-sync-dot synced"></span>
            <span id="costing-save-indicator-text">☁️ Đã đồng bộ Cloud</span>
          </div>
        </div>

        <div class="costing-table-responsive">
          <table class="costing-table" id="costing-data-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">#</th>
                <th style="width: 180px;">Hạng mục</th>
                <th style="width: 260px;">Nhân sự / Cấp bậc</th>
                <th style="width: 110px; text-align: right;">Số Km</th>
                <th style="width: 130px; text-align: right;">Giờ / Km</th>
                <th style="width: 170px; text-align: right;">Chi phí (VNĐ)</th>
                <th style="width: 170px; text-align: right;">Chi phí (-10% thuế)</th>
                <th style="width: 60px; text-align: center;">Xóa</th>
              </tr>
            </thead>
            <tbody id="costing-table-body">
              ${renderTableRowsHTML(currentEntries, categories, rates)}
            </tbody>
            <tfoot class="costing-table-footer" id="costing-table-footer">
              ${renderTableFooterHTML(currentEntries, rates)}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render HTML rows for table
 */
function renderTableRowsHTML(entries, categories, rates) {
  if (!entries || entries.length === 0) {
    return `
      <tr>
        <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
          Bảng tính rỗng. Hãy bấm nút <strong>"+ Thêm dòng"</strong> để bắt đầu dự toán.
        </td>
      </tr>
    `;
  }

  return entries.map((entry, index) => {
    const calc = calculateRowCost(entry, rates);
    const isRateDifferent = calc.rateObj && entry.appliedRate !== undefined && entry.appliedRate !== calc.rateObj.rate;
    return `
      <tr data-id="${entry.id}" class="costing-row">
        <td class="costing-row-num">${index + 1}</td>
        <td>
          <select class="costing-select cell-category" data-field="category" data-id="${entry.id}">
            ${categories.map(cat => `
              <option value="${cat}" ${cat === entry.category ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
        </td>
        <td>
          <div class="costing-cell-rate-wrapper">
            <select class="costing-select cell-rate" data-field="rateId" data-id="${entry.id}">
              ${rates.map(r => `
                <option value="${r.id}" ${r.id === entry.rateId ? 'selected' : ''}>
                  ${r.name} (${formatVND(r.rate).replace(' ₫', '')}/h)
                </option>
              `).join('')}
            </select>
            <div class="costing-rate-snapshot-badge ${isRateDifferent ? 'snapshot-legacy' : ''}"
              title="Đơn giá cố định đã khóa: ${formatVND(calc.rate)}/h ${isRateDifferent ? `(Đơn giá chuẩn hiện hành: ${formatVND(calc.rateObj.rate)}/h)` : ''}">
              <span>🔒 ${formatVND(calc.rate).replace(' ₫', '')}/h</span>
              ${isRateDifferent ? `<span class="badge-legacy-tag">Khóa giá cũ</span>` : ''}
            </div>
          </div>
        </td>
        <td>
          <input type="number" step="0.1" min="0" class="costing-input costing-input-number cell-km"
            data-field="km" data-id="${entry.id}" value="${entry.km !== undefined ? entry.km : 0}" />
        </td>
        <td>
          <input type="number" step="0.5" min="0" class="costing-input costing-input-number cell-hours"
            data-field="hoursPerKm" data-id="${entry.id}" value="${entry.hoursPerKm !== undefined ? entry.hoursPerKm : 0}" />
        </td>
        <td class="costing-cell-readonly costing-cell-cost cell-calc-cost" id="cost-val-${entry.id}">
          ${formatVND(calc.cost)}
        </td>
        <td class="costing-cell-readonly costing-cell-tax cell-calc-tax" id="tax-val-${entry.id}">
          ${formatVND(calc.costAfterTax)}
        </td>
        <td class="costing-action-cell">
          <button type="button" class="costing-btn-delete-row" data-id="${entry.id}" title="Xóa dòng này">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Table Footer totals
 */
function renderTableFooterHTML(entries, rates) {
  let totalCost = 0;
  let totalCostTax = 0;
  let totalHours = 0;
  let totalKm = 0;

  (entries || []).forEach(e => {
    const calc = calculateRowCost(e, rates);
    totalCost += calc.cost;
    totalCostTax += calc.costAfterTax;
    totalHours += calc.hoursPerKm;
    totalKm += calc.km;
  });

  return `
    <tr>
      <td colspan="3" style="text-align: right; text-transform: uppercase;">TỔNG CỘNG:</td>
      <td style="text-align: right; color: var(--text-primary);">${totalKm.toFixed(2)} Km</td>
      <td style="text-align: right; color: var(--text-primary);">${totalHours.toFixed(1)} h</td>
      <td style="text-align: right; color: var(--accent-primary); font-size: 1rem;">${formatVND(totalCost)}</td>
      <td style="text-align: right; color: #10b981; font-size: 1rem;">${formatVND(totalCostTax)}</td>
      <td></td>
    </tr>
  `;
}

/**
 * Recompute and update KPI cards + Footer without full page re-render
 */
function updateTotalsDOM() {
  const { rates } = costingData;
  let totalCost = 0;
  let totalCostTax = 0;
  let totalHours = 0;
  let totalKm = 0;

  currentEntries.forEach(e => {
    const calc = calculateRowCost(e, rates);
    totalCost += calc.cost;
    totalCostTax += calc.costAfterTax;
    totalHours += calc.hoursPerKm;
    totalKm += calc.km;
  });

  const avgCostPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;

  const kpiTotal = document.getElementById('kpi-total-cost');
  const kpiTax = document.getElementById('kpi-total-tax');
  const kpiHours = document.getElementById('kpi-total-hours');
  const kpiAvg = document.getElementById('kpi-avg-cost');
  const footer = document.getElementById('costing-table-footer');

  if (kpiTotal) kpiTotal.textContent = formatVND(totalCost);
  if (kpiTax) kpiTax.textContent = formatVND(totalCostAfterTax);
  if (kpiHours) kpiHours.innerHTML = `${totalHours.toFixed(1)} <span style="font-size: 1rem; font-weight: 500;">giờ</span>`;
  if (kpiAvg) kpiAvg.textContent = formatVND(avgCostPerKm);
  if (footer) footer.innerHTML = renderTableFooterHTML(currentEntries, rates);

  // Visual save indicator
  const indicator = document.getElementById('costing-save-indicator');
  if (indicator) {
    indicator.textContent = '💾 Đã lưu';
    indicator.style.color = '#10b981';
  }
}

/**
 * Deep clone entries array to avoid mutation reference bugs
 */
function cloneEntries(entries) {
  return JSON.parse(JSON.stringify(entries || []));
}

/**
 * Record a state snapshot to the undo stack
 */
function pushHistory(snapshot) {
  const stateToPush = snapshot ? cloneEntries(snapshot) : cloneEntries(currentEntries);
  undoStack.push(stateToPush);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack = []; // Clear redo stack on new user action
  updateHistoryButtonsState();
}

/**
 * Perform Undo (Ctrl+Z)
 */
function handleUndo() {
  if (undoStack.length === 0) return;
  const previousState = undoStack.pop();
  redoStack.push(cloneEntries(currentEntries));
  if (redoStack.length > MAX_HISTORY) {
    redoStack.shift();
  }

  currentEntries = previousState;
  saveProjectCosting(selectedProjectId, currentEntries);

  const tbody = document.getElementById('costing-table-body');
  if (tbody) {
    tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
    bindTableEvents();
  }
  updateTotalsDOM();
  updateHistoryButtonsState();
  showToast('↶ Đã hoàn tác (Undo)');
}

/**
 * Perform Redo (Ctrl+Y)
 */
function handleRedo() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  undoStack.push(cloneEntries(currentEntries));
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  currentEntries = nextState;
  saveProjectCosting(selectedProjectId, currentEntries);

  const tbody = document.getElementById('costing-table-body');
  if (tbody) {
    tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
    bindTableEvents();
  }
  updateTotalsDOM();
  updateHistoryButtonsState();
  showToast('↷ Đã làm lại (Redo)');
}

/**
 * Update disabled states & tooltips of Undo/Redo buttons
 */
function updateHistoryButtonsState() {
  const btnUndo = document.getElementById('btn-costing-undo');
  const btnRedo = document.getElementById('btn-costing-redo');
  if (btnUndo) {
    btnUndo.disabled = undoStack.length === 0;
    btnUndo.title = undoStack.length > 0 ? `Hoàn tác (Ctrl+Z) — còn ${undoStack.length} bước` : 'Hoàn tác thao tác trước (Ctrl+Z)';
  }
  if (btnRedo) {
    btnRedo.disabled = redoStack.length === 0;
    btnRedo.title = redoStack.length > 0 ? `Làm lại (Ctrl+Y) — còn ${redoStack.length} bước` : 'Làm lại thao tác vừa hoàn tác (Ctrl+Y)';
  }
}

/**
 * Handle Multi-row Excel Paste (TSV data)
 */
function handleExcelPaste(clipboardText, startRowIndex = 0) {
  if (!clipboardText || !clipboardText.trim()) return;

  const parsedRows = parseExcelTSV(clipboardText, costingData);
  if (!parsedRows || parsedRows.length === 0) return;

  // Snapshot current state for undo BEFORE modifying
  pushHistory();

  const startIndex = Math.max(0, startRowIndex);
  const pastedRowIds = [];

  parsedRows.forEach((row, i) => {
    const targetIndex = startIndex + i;
    if (targetIndex < currentEntries.length) {
      // Overwrite existing row
      const entry = currentEntries[targetIndex];
      entry.category = row.category;
      entry.rateId = row.rateId;
      entry.appliedRate = row.appliedRate;
      entry.km = row.km;
      entry.hoursPerKm = row.hoursPerKm;
      pastedRowIds.push(entry.id);
    } else {
      // Append new row
      const newId = 'ce_' + Date.now() + '_' + i;
      const newEntry = {
        id: newId,
        category: row.category,
        rateId: row.rateId,
        appliedRate: row.appliedRate,
        km: row.km,
        hoursPerKm: row.hoursPerKm
      };
      currentEntries.push(newEntry);
      pastedRowIds.push(newId);
    }
  });

  // Save to persistence & Cloud
  const { projects } = getState();
  const currentProj = (projects || []).find(p => p.id === selectedProjectId);
  saveProjectCosting(selectedProjectId, currentEntries, currentProj);

  // Render updated table
  const tbody = document.getElementById('costing-table-body');
  if (tbody) {
    tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
    bindTableEvents();

    // Trigger highlight flash on pasted rows
    pastedRowIds.forEach(id => {
      const tr = tbody.querySelector(`tr[data-id="${id}"]`);
      if (tr) {
        tr.classList.add('costing-row-pasted');
        setTimeout(() => tr.classList.remove('costing-row-pasted'), 1500);
      }
    });
  }

  updateTotalsDOM();
  showToast(`📋 Đã dán thành công ${parsedRows.length} dòng từ Excel!`);
}

/**
 * Initialize event listeners
 */
export function init() {
  const container = document.getElementById('project-costing-container');
  if (!container) return;

  // Reset history stack on page load
  undoStack = [];
  redoStack = [];
  lastActiveRowIndex = 0;
  cellPreEditSnapshot = null;
  updateHistoryButtonsState();

  // Subscribe to Cloud Sync status changes
  if (unsubscribeSyncStatus) {
    unsubscribeSyncStatus();
    unsubscribeSyncStatus = null;
  }
  unsubscribeSyncStatus = onCostingSyncStatusChange((status, detail) => {
    const textEl = document.getElementById('costing-save-indicator-text');
    const dotEl = document.querySelector('.costing-sync-dot');
    if (!textEl) return;

    if (status === 'syncing') {
      textEl.textContent = '☁️ Đang lưu Cloud...';
      textEl.style.color = 'var(--accent-primary)';
      if (dotEl) dotEl.className = 'costing-sync-dot syncing';
    } else if (status === 'synced') {
      textEl.textContent = '☁️ Đã đồng bộ Cloud';
      textEl.style.color = '#10b981';
      if (dotEl) dotEl.className = 'costing-sync-dot synced';
    } else if (status === 'local') {
      textEl.textContent = '💾 Đã lưu cục bộ';
      textEl.style.color = '#94a3b8';
      if (dotEl) dotEl.className = 'costing-sync-dot local';
    } else if (status === 'error') {
      textEl.textContent = '⚠️ Lỗi đồng bộ Cloud';
      textEl.style.color = '#ef4444';
      if (dotEl) dotEl.className = 'costing-sync-dot error';
    }
  });

  // Asynchronously fetch latest Config and Project Costings from Firestore Cloud
  (async () => {
    try {
      const cloudConfig = await fetchCostingConfigFromCloud();
      if (cloudConfig) {
        costingData = loadCostingData();
      }
      if (selectedProjectId) {
        const cloudEntries = await fetchProjectCostingFromCloud(selectedProjectId);
        if (cloudEntries && cloudEntries.length > 0) {
          currentEntries = cloudEntries;
          const tbody = document.getElementById('costing-table-body');
          if (tbody) {
            tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
            bindTableEvents();
          }
          updateTotalsDOM();
        }
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra dữ liệu Cloud khi tải trang:', err);
    }
  })();

  // 1. Switch project
  const projectSelect = document.getElementById('costing-project-select');
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      selectedProjectId = e.target.value;
      undoStack = [];
      redoStack = [];
      updateHistoryButtonsState();

      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      updateRevisionSelectorDOM();

      const projRev = getProjectRevisions(selectedProjectId);
      const activeRevId = projRev.activeRevisionId || projRev.revisions[0]?.id || 'rev_0';
      currentEntries = getOrSeedEntries(selectedProjectId, activeRevId);
      
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
      showToast(`Đã chuyển sang bảng tính: ${currentProj ? currentProj.name : selectedProjectId}`);

      // Background check Cloud for project entries
      fetchProjectCostingFromCloud(selectedProjectId).then(cloudEntries => {
        if (cloudEntries && cloudEntries.length > 0 && selectedProjectId === e.target.value) {
          updateRevisionSelectorDOM();
          currentEntries = getProjectCosting(selectedProjectId);
          const currentTbody = document.getElementById('costing-table-body');
          if (currentTbody) {
            currentTbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
            bindTableEvents();
          }
          updateTotalsDOM();
        }
      });
    });
  }

  // 1b. Switch Revision
  const revisionSelect = document.getElementById('costing-revision-select');
  if (revisionSelect) {
    revisionSelect.addEventListener('change', (e) => {
      const revId = e.target.value;
      setActiveRevision(selectedProjectId, revId);
      currentEntries = getProjectCosting(selectedProjectId, revId);
      undoStack = [];
      redoStack = [];
      updateHistoryButtonsState();

      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
      updateRevisionSelectorDOM();

      const projRev = getProjectRevisions(selectedProjectId);
      const rev = (projRev.revisions || []).find(r => r.id === revId);
      showToast(`Đã chuyển sang phiên bản: "${rev ? rev.name : revId}"`);
    });
  }

  // 1c. New Revision Button
  const btnNewRev = document.getElementById('btn-costing-new-rev');
  if (btnNewRev) {
    btnNewRev.addEventListener('click', () => {
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId) || { id: selectedProjectId, name: 'Dự án' };
      openNewRevisionModal(currentProj);
    });
  }

  // 1d. Delete Revision Button
  const btnDelRev = document.getElementById('btn-costing-del-rev');
  if (btnDelRev) {
    btnDelRev.addEventListener('click', () => {
      const projRev = getProjectRevisions(selectedProjectId);
      const activeRevId = projRev.activeRevisionId;
      const currentRev = (projRev.revisions || []).find(r => r.id === activeRevId);
      if (!currentRev) return;

      if (confirm(`Bạn có chắc chắn muốn xóa phiên bản "${currentRev.name}"? Thao tác này không thể hoàn tác.`)) {
        const res = deleteProjectRevision(selectedProjectId, activeRevId);
        if (res.success) {
          currentEntries = getProjectCosting(selectedProjectId);
          undoStack = [];
          redoStack = [];
          updateHistoryButtonsState();
          updateRevisionSelectorDOM();

          const tbody = document.getElementById('costing-table-body');
          if (tbody) {
            tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
            bindTableEvents();
          }
          updateTotalsDOM();
          showToast(res.message);
        } else {
          alert(res.message);
        }
      }
    });
  }

  // 1e. Sync Hours from WBS Button
  const btnSyncWBS = document.getElementById('btn-costing-sync-wbs');
  if (btnSyncWBS) {
    btnSyncWBS.addEventListener('click', () => {
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId) || { id: selectedProjectId, name: 'Dự án' };
      openWBSSyncModal(currentProj);
    });
  }

  // 2. Add Row
  const btnAddRow = document.getElementById('btn-costing-add-row');
  if (btnAddRow) {
    btnAddRow.addEventListener('click', () => {
      pushHistory();

      const newId = 'ce_' + Date.now();
      const rateObj = costingData.rates[0];
      const newEntry = {
        id: newId,
        category: costingData.categories[0] || 'ATGT',
        rateId: rateObj ? rateObj.id : 'R001',
        appliedRate: rateObj ? Number(rateObj.rate) || 0 : 0,
        km: 1.0,
        hoursPerKm: 10
      };
      currentEntries.push(newEntry);
      
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      saveProjectCosting(selectedProjectId, currentEntries, currentProj);

      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();

      // Focus the new row's hours input
      const newInput = document.querySelector(`.cell-hours[data-id="${newId}"]`);
      if (newInput) newInput.focus();
      showToast('Đã thêm 1 dòng mới vào bảng tính');
    });
  }

  // 3. Undo / Redo Toolbar Buttons
  const btnUndo = document.getElementById('btn-costing-undo');
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      handleUndo();
    });
  }

  const btnRedo = document.getElementById('btn-costing-redo');
  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      handleRedo();
    });
  }

  // 4. Refresh Rates to Current Rate Table
  const btnRefreshRates = document.getElementById('btn-costing-refresh-rates');
  if (btnRefreshRates) {
    btnRefreshRates.addEventListener('click', () => {
      if (!currentEntries || currentEntries.length === 0) {
        showToast('Bảng tính đang rỗng, không có dòng nào để cập nhật');
        return;
      }
      if (confirm('Bạn có muốn cập nhật toàn bộ các dòng theo Bảng đơn giá mới nhất không? Đơn giá đóng băng cũ sẽ được thay bằng giá hiện hành.')) {
        pushHistory();
        currentEntries = refreshAllRowRates(currentEntries, costingData.rates);
        const { projects } = getState();
        const currentProj = (projects || []).find(p => p.id === selectedProjectId);
        saveProjectCosting(selectedProjectId, currentEntries, currentProj);

        const tbody = document.getElementById('costing-table-body');
        if (tbody) {
          tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
          bindTableEvents();
        }
        updateTotalsDOM();
        showToast('🔄 Đã cập nhật toàn bộ bảng tính theo Bảng đơn giá mới nhất!');
      }
    });
  }

  // 5. Manage Rates Modal
  const btnRates = document.getElementById('btn-costing-manage-rates');
  if (btnRates) {
    btnRates.addEventListener('click', () => {
      openRatesModal();
    });
  }

  // 6. Manage Categories Modal
  const btnCategories = document.getElementById('btn-costing-manage-categories');
  if (btnCategories) {
    btnCategories.addEventListener('click', () => {
      openCategoriesModal();
    });
  }

  // 7. Export CSV
  const btnExport = document.getElementById('btn-costing-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      exportCostingToCSV(currentProj, currentEntries, costingData.rates);
      showToast('Đã xuất file báo giá thành công!');
    });
  }

  // 8. Global Keyboard Shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
  handleKeyDown = (e) => {
    if (!document.getElementById('project-costing-container')) return;
    // Don't intercept shortcuts when editing inside modals
    if (document.querySelector('.modal-backdrop') || document.querySelector('.modal-container')) {
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // 9. Multi-row Excel Paste Event Listener
  handleDocumentPaste = (e) => {
    const pageContainer = document.getElementById('project-costing-container');
    if (!pageContainer) return;

    // Do not intercept if user is typing in a modal
    if (e.target.closest('.modal-container') || e.target.closest('.modal-backdrop')) {
      return;
    }

    // Only process if within costing page or document body
    if (!pageContainer.contains(e.target) && e.target !== document.body) {
      return;
    }

    const clipboardText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (!clipboardText) return;

    const hasTabs = clipboardText.includes('\t');
    const lines = clipboardText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    const isMultiRow = lines.length > 1;

    // If single non-tabular value and target is an input/textarea: allow normal single-cell paste!
    if (!hasTabs && !isMultiRow) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
    }

    // Tabular Excel range paste detected
    e.preventDefault();
    e.stopPropagation();

    let startRowIndex = 0;
    const targetRow = e.target.closest('tr[data-id]');
    if (targetRow) {
      const rowId = targetRow.dataset.id;
      const foundIdx = currentEntries.findIndex(item => item.id === rowId);
      if (foundIdx !== -1) {
        startRowIndex = foundIdx;
      }
    } else if (lastActiveRowIndex >= 0 && lastActiveRowIndex < currentEntries.length) {
      startRowIndex = lastActiveRowIndex;
    }

    handleExcelPaste(clipboardText, startRowIndex);
  };
  document.addEventListener('paste', handleDocumentPaste);

  // Bind initial table row events
  bindTableEvents();
}

/**
 * Bind live input & change events on spreadsheet cells
 */
function bindTableEvents() {
  const tbody = document.getElementById('costing-table-body');
  if (!tbody) return;

  // Track active row click
  tbody.querySelectorAll('tr.costing-row').forEach((tr, index) => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.costing-btn-delete-row')) return;
      lastActiveRowIndex = index;
      tbody.querySelectorAll('tr.costing-row').forEach(r => r.classList.remove('costing-row-active'));
      tr.classList.add('costing-row-active');
    });
  });

  // Input & Change listener on all fields
  tbody.querySelectorAll('.costing-input, .costing-select').forEach(el => {
    // Record snapshot on focus for undo
    el.addEventListener('focus', (e) => {
      cellPreEditSnapshot = cloneEntries(currentEntries);
      const tr = e.target.closest('tr[data-id]');
      if (tr) {
        const idx = currentEntries.findIndex(item => item.id === tr.dataset.id);
        if (idx !== -1) {
          lastActiveRowIndex = idx;
          tbody.querySelectorAll('tr.costing-row').forEach(r => r.classList.remove('costing-row-active'));
          tr.classList.add('costing-row-active');
        }
      }
    });

    el.addEventListener('blur', () => {
      cellPreEditSnapshot = null;
    });

    const handleFieldChange = (target) => {
      const id = target.dataset.id;
      const field = target.dataset.field;
      const entry = currentEntries.find(e => e.id === id);
      if (!entry) return;

      // Push history before saving first change in an edit session
      if (cellPreEditSnapshot) {
        pushHistory(cellPreEditSnapshot);
        cellPreEditSnapshot = null;
      }

      if (field === 'rateId') {
        entry.rateId = target.value;
        const rateObj = costingData.rates.find(r => r.id === target.value);
        // Rate Snapshot: lock in the newly chosen rate
        entry.appliedRate = rateObj ? Number(rateObj.rate) || 0 : 0;
      } else if (field === 'km' || field === 'hoursPerKm') {
        const val = parseFloat(target.value);
        entry[field] = isNaN(val) ? 0 : val;
      } else {
        entry[field] = target.value;
      }

      // Recalculate row cost immediately
      const calc = calculateRowCost(entry, costingData.rates);
      const costCell = document.getElementById(`cost-val-${id}`);
      const taxCell = document.getElementById(`tax-val-${id}`);
      if (costCell) costCell.textContent = formatVND(calc.cost);
      if (taxCell) taxCell.textContent = formatVND(calc.costAfterTax);

      // Update rate snapshot badge in cell
      const badge = tbody.querySelector(`tr[data-id="${id}"] .costing-rate-snapshot-badge`);
      if (badge) {
        const isRateDiff = calc.rateObj && entry.appliedRate !== undefined && entry.appliedRate !== calc.rateObj.rate;
        badge.className = `costing-rate-snapshot-badge ${isRateDiff ? 'snapshot-legacy' : ''}`;
        badge.title = `Đơn giá cố định đã khóa: ${formatVND(calc.rate)}/h ${isRateDiff ? `(Đơn giá chuẩn hiện hành: ${formatVND(calc.rateObj.rate)}/h)` : ''}`;
        badge.innerHTML = `<span>🔒 ${formatVND(calc.rate).replace(' ₫', '')}/h</span>${isRateDiff ? '<span class="badge-legacy-tag">Khóa giá cũ</span>' : ''}`;
      }

      // Save to localStorage & Cloud
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      saveProjectCosting(selectedProjectId, currentEntries, currentProj);
      updateTotalsDOM();
    };

    el.addEventListener('input', (e) => {
      if (e.target.dataset.field === 'km' || e.target.dataset.field === 'hoursPerKm') {
        handleFieldChange(e.target);
      }
    });

    el.addEventListener('change', (e) => {
      handleFieldChange(e.target);
    });
  });

  // Delete Row buttons
  tbody.querySelectorAll('.costing-btn-delete-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      pushHistory();

      const id = e.currentTarget.dataset.id;
      currentEntries = currentEntries.filter(item => item.id !== id);
      
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      saveProjectCosting(selectedProjectId, currentEntries, currentProj);
      
      tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
      bindTableEvents();
      updateTotalsDOM();
      showToast('Đã xóa dòng khỏi bảng tính');
    });
  });
}

/**
 * Update revision select dropdown and delete button visibility
 */
function updateRevisionSelectorDOM() {
  if (!selectedProjectId) return;
  const revSelect = document.getElementById('costing-revision-select');
  const delBtn = document.getElementById('btn-costing-del-rev');
  const projRev = getProjectRevisions(selectedProjectId);
  const revisions = projRev.revisions || [];
  const activeRevId = projRev.activeRevisionId || revisions[0]?.id || 'rev_0';

  if (revSelect) {
    revSelect.innerHTML = revisions.map(r => `
      <option value="${r.id}" ${r.id === activeRevId ? 'selected' : ''}>
        ${r.name}
      </option>
    `).join('');
  }

  if (delBtn) {
    delBtn.style.display = revisions.length > 1 ? 'inline-block' : 'none';
  }
}

/**
 * Open Modal to Create New Revision
 */
function openNewRevisionModal(project) {
  const projRev = getProjectRevisions(project.id);
  const revisions = projRev.revisions || [];
  const activeRevId = projRev.activeRevisionId || revisions[0]?.id || 'rev_0';
  const currentRev = revisions.find(r => r.id === activeRevId) || revisions[0];
  const nextIdx = revisions.length;
  const letterCode = String.fromCharCode(65 + Math.min(nextIdx - 1, 25));
  const defaultName = `Rev ${letterCode} - Bản sao điều chỉnh`;

  const content = `
    <div style="padding: 4px;">
      <div class="costing-sync-summary-banner" style="margin-bottom: 16px;">
        📑 <strong>Nhân bản phiên bản báo giá</strong><br/>
        Tạo một phiên bản mới độc lập dựa trên: <strong>[${currentRev ? currentRev.name : 'Hiện tại'}]</strong> (${currentEntries.length} dòng). 
        Toàn bộ định mức, hạng mục và đơn giá đóng băng sẽ được sao chép nguyên vẹn.
      </div>

      <div class="form-group" style="margin-bottom: 20px;">
        <label for="input-new-rev-name" style="display: block; font-weight: 600; margin-bottom: 8px; font-size: 0.92rem;">
          Tên phiên bản mới:
        </label>
        <input type="text" id="input-new-rev-name" class="costing-input" value="${defaultName}"
          style="width: 100%; padding: 10px 14px; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-card); font-size: 0.95rem; font-weight: 600;" />
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-outline" id="btn-cancel-new-rev">
          Hủy bỏ
        </button>
        <button type="button" class="btn btn-primary" id="btn-submit-new-rev">
          + Tạo Bản Sao Ngay
        </button>
      </div>
    </div>
  `;

  openModal('📑 Tạo Bản Sao Phiên Bản Báo Giá Mới', content);

  setTimeout(() => {
    const input = document.getElementById('input-new-rev-name');
    if (input) {
      input.focus();
      input.select();
    }

    document.getElementById('btn-cancel-new-rev')?.addEventListener('click', () => {
      closeModal();
    });

    const handleSubmit = () => {
      const name = (document.getElementById('input-new-rev-name')?.value || '').trim();
      const newRev = createProjectRevision(project.id, activeRevId, name);
      currentEntries = newRev.entries || [];
      undoStack = [];
      redoStack = [];
      updateHistoryButtonsState();

      updateRevisionSelectorDOM();
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
      closeModal();
      showToast(`🎉 Đã tạo và chuyển sang phiên bản mới: "${newRev.name}"`);
    };

    document.getElementById('btn-submit-new-rev')?.addEventListener('click', handleSubmit);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });
  }, 100);
}

/**
 * Open Modal to Sync Actual Hours from WBS & Timesheet (STRICTLY READ-ONLY)
 */
function openWBSSyncModal(project) {
  const result = aggregateWBSActualHours(project.id);
  const { totalActualItems, totalActualHours, aggregatedList } = result;

  if (aggregatedList.length === 0) {
    const emptyContent = `
      <div style="padding: 12px; text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
        <h4 style="margin-bottom: 8px;">Không tìm thấy giờ thực tế nào trong WBS / Timesheet</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 440px; margin: 0 auto 16px auto;">
          Dự án <strong>[${project.name}]</strong> hiện chưa có bản ghi chấm công thực tế nào được ghi nhận từ nhân sự (hoặc các task chưa có giờ thực tế).
        </p>
        <button type="button" class="btn btn-primary" id="btn-close-empty-sync">
          Đã hiểu
        </button>
      </div>
    `;
    openModal('🔄 Đồng Bộ Giờ Làm Thực Tế Từ WBS', emptyContent);
    setTimeout(() => {
      document.getElementById('btn-close-empty-sync')?.addEventListener('click', () => closeModal());
    }, 100);
    return;
  }

  const content = `
    <div style="padding: 4px;">
      <!-- Summary Banner -->
      <div class="costing-sync-summary-banner">
        🔄 <strong>Phát hiện dữ liệu chấm công thực tế từ WBS:</strong><br/>
        Tìm thấy <strong>${totalActualItems}</strong> bản ghi chấm công thực tế với tổng cộng <strong>${totalActualHours.toFixed(1)} giờ</strong> làm việc của kỹ sư. Dữ liệu đã được gom nhóm tự động thành <strong>${aggregatedList.length} dòng</strong> theo Hạng mục & Cấp bậc.
      </div>

      <!-- Preview Table -->
      <div class="costing-sync-table-wrap">
        <table class="costing-sync-preview-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Hạng mục</th>
              <th>Cấp bậc nhân sự</th>
              <th style="text-align: right;">Đơn giá áp dụng</th>
              <th style="text-align: right;">Số Km</th>
              <th style="text-align: right;">Tổng giờ WBS</th>
              <th style="text-align: right;">Giờ / Km</th>
              <th style="text-align: right;">Thành tiền dự kiến</th>
            </tr>
          </thead>
          <tbody>
            ${aggregatedList.map((item, idx) => `
              <tr>
                <td style="text-align: center; color: var(--text-muted); font-size: 0.8rem;">${idx + 1}</td>
                <td style="font-weight: 600; color: var(--accent-primary);">${item.category}</td>
                <td>
                  <div style="font-weight: 500;">${item.rateName}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${item.users.slice(0, 2).join(', ')}${item.users.length > 2 ? ` +${item.users.length - 2}` : ''}</div>
                </td>
                <td style="text-align: right;">${formatVND(item.appliedRate)}/h</td>
                <td style="text-align: right; font-weight: 600;">${item.km.toFixed(2)} Km</td>
                <td style="text-align: right; color: #10b981; font-weight: 600;">${item.totalHours.toFixed(1)} h</td>
                <td style="text-align: right; font-weight: 700;">${item.hoursPerKm.toFixed(1)} h/Km</td>
                <td style="text-align: right; font-weight: 700; color: var(--accent-primary);">${formatVND(item.cost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Sync Options -->
      <div class="costing-sync-options">
        <label class="costing-sync-option-label">
          <input type="radio" name="sync-mode" value="overwrite" checked />
          <span><strong>Ghi đè toàn bộ bảng tính hiện tại</strong> (Thay thế ${currentEntries.length} dòng hiện có bằng ${aggregatedList.length} dòng WBS)</span>
        </label>
        <label class="costing-sync-option-label">
          <input type="radio" name="sync-mode" value="append" />
          <span><strong>Thêm vào sau các dòng hiện tại</strong> (Giữ nguyên các dòng cũ và bổ sung thêm ${aggregatedList.length} dòng mới)</span>
        </label>
      </div>

      <!-- Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <div style="font-size: 0.82rem; color: var(--text-muted);">
          💡 Thao tác này hỗ trợ Hoàn tác ngay lập tức với <strong>Ctrl + Z</strong>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-outline" id="btn-cancel-sync">
            Hủy bỏ
          </button>
          <button type="button" class="btn btn-primary" id="btn-confirm-sync">
            ✅ Đồng Bộ Vào Bảng Tính
          </button>
        </div>
      </div>
    </div>
  `;

  openModal(`🔄 Đồng Bộ Giờ Làm Thực Tế WBS — ${project.name}`, content, { width: '850px' });

  setTimeout(() => {
    document.getElementById('btn-cancel-sync')?.addEventListener('click', () => closeModal());

    document.getElementById('btn-confirm-sync')?.addEventListener('click', () => {
      const selectedMode = document.querySelector('input[name="sync-mode"]:checked')?.value || 'overwrite';

      // Snapshot for Undo
      pushHistory();

      const newRows = aggregatedList.map((item, idx) => ({
        id: `ce_wbs_${Date.now()}_${idx}`,
        category: item.category,
        rateId: item.rateId,
        appliedRate: item.appliedRate,
        km: item.km,
        hoursPerKm: item.hoursPerKm
      }));

      if (selectedMode === 'overwrite') {
        currentEntries = newRows;
      } else {
        currentEntries = [...currentEntries, ...newRows];
      }

      saveProjectCosting(project.id, currentEntries, project);

      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();

        // Flash highlight new rows
        newRows.forEach(r => {
          const tr = tbody.querySelector(`tr[data-id="${r.id}"]`);
          if (tr) {
            tr.classList.add('costing-row-pasted');
            setTimeout(() => tr.classList.remove('costing-row-pasted'), 1500);
          }
        });
      }

      updateTotalsDOM();
      closeModal();
      showToast(`🔄 Đã đồng bộ thành công ${newRows.length} dòng từ WBS (Hỗ trợ Hoàn tác Ctrl+Z)!`);
    });
  }, 100);
}

/**
 * Open Modal to Manage Categories (Flexible CRUD)
 */
function openCategoriesModal() {
  const content = `
    <div style="padding: 4px;">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
        Danh sách hạng mục dùng chung cho toàn bộ bảng tính dự toán. Bạn có thể thêm mới hoặc xóa theo nhu cầu.
      </p>

      <div class="costing-tag-list" id="modal-category-tags">
        ${costingData.categories.map(cat => `
          <span class="costing-tag">
            <span>${cat}</span>
            <span class="costing-tag-del" data-cat="${cat}" title="Xóa hạng mục này">✕</span>
          </span>
        `).join('')}
      </div>

      <div class="costing-modal-form-inline">
        <input type="text" id="input-new-category" class="costing-input" placeholder="Nhập tên hạng mục mới..."
          style="border: 1px solid var(--border-color); background: var(--bg-card); flex: 1;" />
        <button type="button" class="btn btn-primary" id="btn-add-category-action">
          + Thêm
        </button>
      </div>
    </div>
  `;

  openModal('🏷️ Quản Lý Hạng Mục', content, {
    onClose: () => {
      // Refresh table category dropdowns after closing
      costingData = loadCostingData();
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
    }
  });

  // Attach modal events
  setTimeout(() => {
    const bindTagDelete = () => {
      document.querySelectorAll('#modal-category-tags .costing-tag-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const cat = e.currentTarget.dataset.cat;
          deleteCategory(cat);
          costingData = loadCostingData();
          const tagContainer = document.getElementById('modal-category-tags');
          if (tagContainer) {
            tagContainer.innerHTML = costingData.categories.map(c => `
              <span class="costing-tag">
                <span>${c}</span>
                <span class="costing-tag-del" data-cat="${c}" title="Xóa hạng mục này">✕</span>
              </span>
            `).join('');
            bindTagDelete();
          }
          showToast(`Đã xóa hạng mục "${cat}"`);
        });
      });
    };
    bindTagDelete();

    const addAction = () => {
      const input = document.getElementById('input-new-category');
      if (!input || !input.value.trim()) return;
      const catName = input.value.trim();
      const added = addCategory(catName);
      if (added) {
        costingData = loadCostingData();
        const tagContainer = document.getElementById('modal-category-tags');
        if (tagContainer) {
          tagContainer.innerHTML = costingData.categories.map(c => `
            <span class="costing-tag">
              <span>${c}</span>
              <span class="costing-tag-del" data-cat="${c}" title="Xóa hạng mục này">✕</span>
            </span>
          `).join('');
          bindTagDelete();
        }
        input.value = '';
        showToast(`Đã thêm hạng mục "${catName}"`);
      } else {
        alert('Hạng mục này đã tồn tại!');
      }
    };

    document.getElementById('btn-add-category-action')?.addEventListener('click', addAction);
    document.getElementById('input-new-category')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addAction();
      }
    });
  }, 100);
}

/**
 * Open Modal to Manage Rates (Rate Table CRUD)
 */
function openRatesModal() {
  const content = `
    <div style="padding: 4px;">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
        Đơn giá giờ chuẩn theo cấp bậc kỹ sư được áp dụng tự động vào công thức tính chi phí.
      </p>

      <div id="modal-rates-list" style="max-height: 280px; overflow-y: auto; margin-bottom: 16px;">
        ${costingData.rates.map(r => `
          <div class="costing-rate-item-row" data-id="${r.id}">
            <div class="costing-rate-title">
              <div>${r.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${r.role || 'BIM Modeler'} • Cấp bậc: ${r.level || 'Mid'}</div>
            </div>
            <div class="costing-rate-input-wrap">
              <input type="number" step="10000" min="0" class="input-modal-rate" data-id="${r.id}" value="${r.rate}" />
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); width: 40px;">₫/h</div>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" class="btn btn-primary" id="btn-save-rates-modal">
          Lưu Đơn Giá
        </button>
      </div>
    </div>
  `;

  openModal('📋 Bảng Đơn Giá Tham Chiếu (Kỹ Sư / Modeler)', content, {
    onClose: () => {
      // Refresh table rates dropdowns
      costingData = loadCostingData();
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
    }
  });

  setTimeout(() => {
    document.getElementById('btn-save-rates-modal')?.addEventListener('click', () => {
      document.querySelectorAll('#modal-rates-list .input-modal-rate').forEach(input => {
        const id = input.dataset.id;
        const val = parseFloat(input.value) || 0;
        const rateObj = costingData.rates.find(r => r.id === id);
        if (rateObj) {
          rateObj.rate = val;
        }
      });
      updateRates(costingData.rates);
      costingData = loadCostingData();

      // Recalculate table
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
      closeModal();
      showToast('Đã cập nhật bảng đơn giá thành công!');
    });
  }, 100);
}

export function destroy() {
  if (handleKeyDown) {
    window.removeEventListener('keydown', handleKeyDown);
    handleKeyDown = null;
  }
  if (handleDocumentPaste) {
    document.removeEventListener('paste', handleDocumentPaste);
    handleDocumentPaste = null;
  }
  if (unsubscribeSyncStatus) {
    unsubscribeSyncStatus();
    unsubscribeSyncStatus = null;
  }
  selectedProjectId = null;
  currentEntries = [];
  costingData = null;
  undoStack = [];
  redoStack = [];
  lastActiveRowIndex = 0;
  cellPreEditSnapshot = null;
}
