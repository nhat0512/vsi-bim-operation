// ============================================
// PROJECT COSTING — Spreadsheet-like Cost Estimator & Rate Engine
// ============================================

import { getState } from '../state.js';
import {
  loadCostingData,
  saveCostingData,
  getProjectCosting,
  saveProjectCosting,
  calculateRowCost,
  formatVND,
  addCategory,
  deleteCategory,
  updateRates,
  exportCostingToCSV,
  parseExcelTSV
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
function getOrSeedEntries(projectId) {
  let entries = getProjectCosting(projectId);
  if (!entries || entries.length === 0) {
    // Seed default sample data matching user spec
    entries = [
      { id: 'ce_1', category: 'ATGT', rateId: 'R001', km: 5.2, hoursPerKm: 13 },
      { id: 'ce_2', category: 'Đường', rateId: 'R002', km: 3.0, hoursPerKm: 10 },
      { id: 'ce_3', category: 'Cầu', rateId: 'R003', km: 2.5, hoursPerKm: 8 }
    ];
    saveProjectCosting(projectId, entries);
  }
  return entries;
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

  currentEntries = getOrSeedEntries(project.id);
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

        <div class="costing-action-buttons">
          <button class="btn btn-primary" id="btn-costing-add-row" title="Thêm dòng mới vào bảng tính">
            + Thêm dòng
          </button>
          <button class="btn btn-outline costing-btn-history" id="btn-costing-undo" title="Hoàn tác thao tác trước (Ctrl+Z)" disabled>
            ↶ Hoàn tác
          </button>
          <button class="btn btn-outline costing-btn-history" id="btn-costing-redo" title="Làm lại thao tác vừa hoàn tác (Ctrl+Y)" disabled>
            ↷ Làm lại
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
          <div style="font-size: 0.8rem; color: var(--text-muted);" id="costing-save-indicator">
            💾 Đã lưu tự động
          </div>
        </div>

        <div class="costing-table-responsive">
          <table class="costing-table" id="costing-data-table">
            <thead>
              <tr>
                <th style="width: 44px; text-align: center;">#</th>
                <th style="width: 180px;">Hạng mục</th>
                <th style="width: 230px;">Nhân sự / Cấp bậc</th>
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
          <select class="costing-select cell-rate" data-field="rateId" data-id="${entry.id}">
            ${rates.map(r => `
              <option value="${r.id}" ${r.id === entry.rateId ? 'selected' : ''}>
                ${r.name} (${formatVND(r.rate).replace(' ₫', '')}/h)
              </option>
            `).join('')}
          </select>
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
        km: row.km,
        hoursPerKm: row.hoursPerKm
      };
      currentEntries.push(newEntry);
      pastedRowIds.push(newId);
    }
  });

  // Save to persistence
  saveProjectCosting(selectedProjectId, currentEntries);

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
      currentEntries = getOrSeedEntries(selectedProjectId);
      
      const tbody = document.getElementById('costing-table-body');
      if (tbody) {
        tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
        bindTableEvents();
      }
      updateTotalsDOM();
      showToast(`Đã chuyển sang bảng tính: ${currentProj ? currentProj.name : selectedProjectId}`);
    });
  }

  // 2. Add Row
  const btnAddRow = document.getElementById('btn-costing-add-row');
  if (btnAddRow) {
    btnAddRow.addEventListener('click', () => {
      pushHistory();

      const newId = 'ce_' + Date.now();
      const newEntry = {
        id: newId,
        category: costingData.categories[0] || 'ATGT',
        rateId: costingData.rates[0].id,
        km: 1.0,
        hoursPerKm: 10
      };
      currentEntries.push(newEntry);
      saveProjectCosting(selectedProjectId, currentEntries);

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

  // 4. Manage Rates Modal
  const btnRates = document.getElementById('btn-costing-manage-rates');
  if (btnRates) {
    btnRates.addEventListener('click', () => {
      openRatesModal();
    });
  }

  // 5. Manage Categories Modal
  const btnCategories = document.getElementById('btn-costing-manage-categories');
  if (btnCategories) {
    btnCategories.addEventListener('click', () => {
      openCategoriesModal();
    });
  }

  // 6. Export CSV
  const btnExport = document.getElementById('btn-costing-export-csv');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const { projects } = getState();
      const currentProj = (projects || []).find(p => p.id === selectedProjectId);
      exportCostingToCSV(currentProj, currentEntries, costingData.rates);
      showToast('Đã xuất file báo giá thành công!');
    });
  }

  // 7. Global Keyboard Shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
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

  // 8. Multi-row Excel Paste Event Listener
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

      if (field === 'km' || field === 'hoursPerKm') {
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

      // Save to localStorage
      saveProjectCosting(selectedProjectId, currentEntries);
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
      saveProjectCosting(selectedProjectId, currentEntries);
      
      tbody.innerHTML = renderTableRowsHTML(currentEntries, costingData.categories, costingData.rates);
      bindTableEvents();
      updateTotalsDOM();
      showToast('Đã xóa dòng khỏi bảng tính');
    });
  });
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
  selectedProjectId = null;
  currentEntries = [];
  costingData = null;
  undoStack = [];
  redoStack = [];
  lastActiveRowIndex = 0;
  cellPreEditSnapshot = null;
}
