// ============================================
// COSTING STORAGE — LocalStorage & Firestore Manager & Math Helpers for Project Costing
// ============================================

import { db, getState } from '../state.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const STORAGE_KEY = 'bimTransPM_CostingData';
export const FIRESTORE_COLLECTION = 'project_costings';

export const DEFAULT_CATEGORIES = [
  'ATGT',
  'Đường',
  'Cầu',
  'Hầm',
  'Thoát nước',
  'Chiếu sáng',
  'Cảnh quan',
  'Nút giao',
  'Khác'
];

export const DEFAULT_RATES = [
  { id: 'R001', name: 'Modeler 1 (Senior)', role: 'BIM Modeler', level: 'senior', rate: 150000 },
  { id: 'R002', name: 'Modeler 2 (Mid)', role: 'BIM Modeler', level: 'mid', rate: 120000 },
  { id: 'R003', name: 'Modeler 3 (Junior)', role: 'BIM Modeler', level: 'junior', rate: 100000 },
  { id: 'R004', name: 'BIM Coordinator (Senior)', role: 'BIM Coordinator', level: 'senior', rate: 250000 },
  { id: 'R005', name: 'BIM Manager (Senior)', role: 'BIM Manager', level: 'senior', rate: 350000 }
];

// Debounce timer for background Firestore sync
let cloudSyncTimeout = null;

// Listeners for sync status notifications
let syncStatusListeners = [];

export function onCostingSyncStatusChange(callback) {
  syncStatusListeners.push(callback);
  return () => {
    syncStatusListeners = syncStatusListeners.filter(cb => cb !== callback);
  };
}

function notifySyncStatus(status, detail = '') {
  syncStatusListeners.forEach(cb => {
    try { cb(status, detail); } catch (e) {}
  });
}

/**
 * Load entire costing data from localStorage, fallback to initial schema
 */
export function loadCostingData() {
  let data = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Lỗi đọc dữ liệu Costing từ localStorage:', err);
  }

  if (!data || typeof data !== 'object') {
    data = {
      categories: [...DEFAULT_CATEGORIES],
      rates: [...DEFAULT_RATES],
      projects: {}
    };
    saveCostingData(data);
    return data;
  }

  // Ensure default structure
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    data.categories = [...DEFAULT_CATEGORIES];
  }
  if (!Array.isArray(data.rates) || data.rates.length === 0) {
    data.rates = [...DEFAULT_RATES];
  }
  if (!data.projects || typeof data.projects !== 'object') {
    data.projects = {};
  }

  return data;
}

/**
 * Save entire costing data to localStorage (instant 0ms response)
 */
export function saveCostingData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Lỗi lưu dữ liệu Costing vào localStorage:', err);
  }
}

/**
 * Get costing entries for a specific project from local cache
 */
export function getProjectCosting(projectId) {
  const data = loadCostingData();
  const proj = data.projects[projectId];
  if (proj && Array.isArray(proj.entries)) {
    return proj.entries;
  }
  return [];
}

/**
 * Save costing entries for a specific project
 * Optimistic UI: writes to localStorage instantly, then syncs to Firestore with 1000ms debounce
 */
export function saveProjectCosting(projectId, entries, projectMeta = null) {
  const data = loadCostingData();
  data.projects[projectId] = {
    updatedAt: new Date().toISOString(),
    entries: Array.isArray(entries) ? entries : []
  };
  saveCostingData(data);

  // Background sync to Firestore
  syncProjectCostingToCloud(projectId, entries, projectMeta);
}

/**
 * Background sync project costing entries to Firestore
 */
export function syncProjectCostingToCloud(projectId, entries, projectMeta = null) {
  if (!db) {
    notifySyncStatus('local', 'Đã lưu cục bộ (chưa kết nối Cloud)');
    return;
  }

  notifySyncStatus('syncing', 'Đang lưu lên Cloud...');

  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
  cloudSyncTimeout = setTimeout(async () => {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, projectId);
      const { rates } = loadCostingData();

      let totalCost = 0;
      let totalCostAfterTax = 0;
      let totalHours = 0;
      let totalKm = 0;

      const sanitizedEntries = (entries || []).map(e => {
        const calc = calculateRowCost(e, rates);
        totalCost += calc.cost;
        totalCostAfterTax += calc.costAfterTax;
        totalHours += calc.hoursPerKm;
        totalKm += calc.km;

        return {
          id: e.id,
          category: e.category || 'Khác',
          rateId: e.rateId || 'R001',
          appliedRate: e.appliedRate !== undefined && e.appliedRate !== null ? Number(e.appliedRate) : calc.rate,
          km: Number(e.km) || 0,
          hoursPerKm: Number(e.hoursPerKm) || 0,
          cost: calc.cost,
          costAfterTax: calc.costAfterTax
        };
      });

      const avgCostPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;
      const currentUser = getState()?.currentUser;

      const docData = {
        projectId,
        projectCode: projectMeta?.code || projectId,
        projectName: projectMeta?.name || 'Dự án',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || currentUser?.name || 'User',
        summary: {
          totalKm,
          totalHours,
          totalCost,
          totalCostAfterTax,
          avgCostPerKm
        },
        entries: sanitizedEntries
      };

      await setDoc(docRef, docData, { merge: true });
      console.log(`☁️ [Firestore] Đã đồng bộ chi phí dự án [${projectId}] lên collection "${FIRESTORE_COLLECTION}"`);
      notifySyncStatus('synced', 'Đã đồng bộ Cloud');
    } catch (err) {
      console.error('❌ [Firestore] Lỗi đồng bộ costing lên Cloud:', err);
      notifySyncStatus('error', 'Lỗi đồng bộ Cloud');
    }
  }, 1000); // 1000ms debounce
}

/**
 * Fetch project costing data from Firestore on project load
 */
export async function fetchProjectCostingFromCloud(projectId) {
  if (!db || !projectId) return null;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, projectId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cloudData = snap.data();
      if (cloudData && Array.isArray(cloudData.entries)) {
        // Cache to localStorage
        const localData = loadCostingData();
        localData.projects[projectId] = {
          updatedAt: cloudData.updatedAt || new Date().toISOString(),
          entries: cloudData.entries
        };
        saveCostingData(localData);
        notifySyncStatus('synced', 'Đã đồng bộ Cloud');
        return cloudData.entries;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Firestore] Không thể tải dữ liệu costing từ Cloud, dùng localStorage:', err);
  }
  return null;
}

/**
 * Sync Costing Configuration (categories & rates) to Firestore
 */
export async function syncCostingConfigToCloud() {
  if (!db) return;
  try {
    const data = loadCostingData();
    const docRef = doc(db, FIRESTORE_COLLECTION, '_config');
    await setDoc(docRef, {
      updatedAt: new Date().toISOString(),
      categories: data.categories,
      rates: data.rates
    }, { merge: true });
    console.log('☁️ [Firestore] Đã đồng bộ cấu hình bảng đơn giá & danh mục lên Cloud');
  } catch (err) {
    console.error('❌ [Firestore] Lỗi đồng bộ cấu hình costing lên Cloud:', err);
  }
}

/**
 * Fetch Costing Configuration from Firestore
 */
export async function fetchCostingConfigFromCloud() {
  if (!db) return null;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, '_config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const config = snap.data();
      if (config) {
        const localData = loadCostingData();
        let changed = false;
        if (Array.isArray(config.categories) && config.categories.length > 0) {
          localData.categories = config.categories;
          changed = true;
        }
        if (Array.isArray(config.rates) && config.rates.length > 0) {
          localData.rates = config.rates;
          changed = true;
        }
        if (changed) {
          saveCostingData(localData);
        }
        return config;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Firestore] Không thể tải cấu hình costing từ Cloud, dùng localStorage:', err);
  }
  return null;
}

/**
 * Calculate cost for a single row
 * Rate Snapshot Mechanics:
 * - Uses entry.appliedRate (frozen rate) if present.
 * - Otherwise falls back to current rate in rateObj.
 * - Automatically initializes appliedRate if missing.
 */
export function calculateRowCost(entry, rates = []) {
  if (!entry) return { cost: 0, costAfterTax: 0, rate: 0, hoursPerKm: 0, km: 0 };
  
  const rateObj = rates.find(r => r.id === entry.rateId) || rates[0];
  
  // Rate Snapshot: prioritize appliedRate
  let rate;
  if (entry.appliedRate !== undefined && entry.appliedRate !== null && !isNaN(Number(entry.appliedRate))) {
    rate = Number(entry.appliedRate);
  } else {
    rate = rateObj ? Number(rateObj.rate) || 0 : 0;
    // Auto backfill appliedRate so row is frozen
    entry.appliedRate = rate;
  }

  const hoursPerKm = Number(entry.hoursPerKm) || 0;
  const km = Number(entry.km) || 0;

  const cost = Math.round(hoursPerKm * rate);
  const costAfterTax = Math.round(cost * 0.9);

  return {
    cost,
    costAfterTax,
    rate,
    hoursPerKm,
    km,
    rateObj
  };
}

/**
 * Refresh all rows in a project to use the current rates from Rate Table
 */
export function refreshAllRowRates(entries, rates = []) {
  return (entries || []).map(entry => {
    const rateObj = rates.find(r => r.id === entry.rateId) || rates[0];
    const newRate = rateObj ? Number(rateObj.rate) || 0 : 0;
    return {
      ...entry,
      appliedRate: newRate
    };
  });
}

/**
 * Format currency VND with comma thousand separators
 */
export function formatVND(value) {
  if (value === undefined || value === null || isNaN(value)) return '0 ₫';
  const num = Math.round(Number(value) || 0);
  return num.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Add a new category
 */
export function addCategory(categoryName) {
  if (!categoryName) return false;
  const name = categoryName.trim();
  if (!name) return false;
  const data = loadCostingData();
  if (!data.categories.includes(name)) {
    data.categories.push(name);
    saveCostingData(data);
    syncCostingConfigToCloud();
    return true;
  }
  return false;
}

/**
 * Delete a category
 */
export function deleteCategory(categoryName) {
  const data = loadCostingData();
  const index = data.categories.indexOf(categoryName);
  if (index > -1) {
    data.categories.splice(index, 1);
    saveCostingData(data);
    syncCostingConfigToCloud();
    return true;
  }
  return false;
}

/**
 * Update rate list
 */
export function updateRates(rates) {
  const data = loadCostingData();
  data.rates = rates;
  saveCostingData(data);
  syncCostingConfigToCloud();
}

/**
 * Parse a numeric value from string (supporting comma decimals e.g. 5,2 or 1.250,5)
 */
export function parseNumericValue(str) {
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  if (!str) return 0;
  let clean = String(str).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(clean)) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(clean)) {
    clean = clean.replace(/,/g, '');
  } else {
    clean = clean.replace(',', '.');
  }
  const match = clean.match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Check if string looks like a numeric value
 */
export function isLikelyNumeric(str) {
  if (typeof str === 'number') return true;
  if (!str) return false;
  const clean = String(str).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(clean);
}

/**
 * Match text against existing rates by ID, name, role, level or rate amount
 */
export function matchRateFromText(text, rates = []) {
  if (!text || !Array.isArray(rates) || rates.length === 0) {
    return rates && rates[0] ? rates[0].id : 'R001';
  }
  const raw = String(text).trim().toLowerCase();

  // 1. Exact ID
  const byId = rates.find(r => r.id.toLowerCase() === raw);
  if (byId) return byId.id;

  // 2. Exact Name
  const byExactName = rates.find(r => r.name.toLowerCase() === raw);
  if (byExactName) return byExactName.id;

  // 3. Keyword matching
  if (raw.includes('manager')) {
    const r = rates.find(x => x.name.toLowerCase().includes('manager') || (x.role && x.role.toLowerCase().includes('manager')));
    if (r) return r.id;
  }
  if (raw.includes('coordinator')) {
    const r = rates.find(x => x.name.toLowerCase().includes('coordinator') || (x.role && x.role.toLowerCase().includes('coordinator')));
    if (r) return r.id;
  }
  if (raw.includes('modeler 1') || raw.includes('m1') || raw.includes('150')) {
    const r = rates.find(x => x.name.toLowerCase().includes('modeler 1') || x.rate === 150000);
    if (r) return r.id;
  }
  if (raw.includes('modeler 2') || raw.includes('m2') || raw.includes('120')) {
    const r = rates.find(x => x.name.toLowerCase().includes('modeler 2') || x.rate === 120000);
    if (r) return r.id;
  }
  if (raw.includes('modeler 3') || raw.includes('m3') || raw.includes('100')) {
    const r = rates.find(x => x.name.toLowerCase().includes('modeler 3') || x.rate === 100000);
    if (r) return r.id;
  }
  if (raw.includes('senior')) {
    const r = rates.find(x => x.level === 'senior' && x.name.toLowerCase().includes('modeler'));
    if (r) return r.id;
  }
  if (raw.includes('mid')) {
    const r = rates.find(x => x.level === 'mid');
    if (r) return r.id;
  }
  if (raw.includes('junior')) {
    const r = rates.find(x => x.level === 'junior');
    if (r) return r.id;
  }

  // 4. Substring in rate name
  const bySub = rates.find(r => r.name.toLowerCase().includes(raw) || raw.includes(r.name.toLowerCase()));
  if (bySub) return bySub.id;

  return rates[0].id;
}

/**
 * Match a category or create a new one dynamically
 */
export function matchOrAddCategory(text, costingData) {
  if (!text) return costingData?.categories?.[0] || 'ATGT';
  const clean = String(text).trim();
  if (!clean) return costingData?.categories?.[0] || 'ATGT';

  const existing = (costingData.categories || []).find(c => c.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;

  // Add new category
  addCategory(clean);
  if (costingData.categories && !costingData.categories.includes(clean)) {
    costingData.categories.push(clean);
  }
  return clean;
}

/**
 * Parse TSV text from Excel/Sheets clipboard into structured costing row objects
 */
export function parseExcelTSV(tsvText, costingData) {
  if (!tsvText || typeof tsvText !== 'string') return [];
  const lines = tsvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect and skip header row if present
  const firstLower = lines[0].toLowerCase();
  const isHeader = firstLower.includes('hạng mục') || 
                   firstLower.includes('stt') || 
                   firstLower.includes('nhân sự') || 
                   firstLower.includes('đơn giá') || 
                   firstLower.includes('số km') || 
                   firstLower.includes('category');
  const dataLines = isHeader ? lines.slice(1) : lines;

  const result = [];
  dataLines.forEach(line => {
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length === 1 && cols[0] === '') return;

    // Skip STT column if present as first numeric column when >= 5 cols
    if (cols.length >= 5 && /^\d+$/.test(cols[0])) {
      cols = cols.slice(1);
    }

    let category = '';
    let rateId = '';
    let km = 0;
    let hoursPerKm = 0;

    if (cols.length >= 4) {
      category = matchOrAddCategory(cols[0], costingData);
      rateId = matchRateFromText(cols[1], costingData.rates);
      km = parseNumericValue(cols[2]);
      hoursPerKm = parseNumericValue(cols[3]);
    } else if (cols.length === 3) {
      category = matchOrAddCategory(cols[0], costingData);
      const isCol1Num = isLikelyNumeric(cols[1]);
      const isCol2Num = isLikelyNumeric(cols[2]);
      if (isCol1Num && isCol2Num) {
        rateId = costingData.rates[0]?.id || 'R001';
        km = parseNumericValue(cols[1]);
        hoursPerKm = parseNumericValue(cols[2]);
      } else {
        rateId = matchRateFromText(cols[1], costingData.rates);
        km = parseNumericValue(cols[2]);
        hoursPerKm = 10;
      }
    } else if (cols.length === 2) {
      category = matchOrAddCategory(cols[0], costingData);
      rateId = costingData.rates[0]?.id || 'R001';
      km = parseNumericValue(cols[1]);
      hoursPerKm = 10;
    } else if (cols.length === 1) {
      category = matchOrAddCategory(cols[0], costingData);
      rateId = costingData.rates[0]?.id || 'R001';
      km = 1.0;
      hoursPerKm = 10;
    }

    const rateObj = costingData.rates.find(r => r.id === rateId) || costingData.rates[0];
    const appliedRate = rateObj ? Number(rateObj.rate) || 0 : 0;

    result.push({
      category,
      rateId,
      appliedRate,
      km,
      hoursPerKm
    });
  });

  return result;
}

/**
 * Export project costing entries to CSV with UTF-8 BOM
 */
export function exportCostingToCSV(project, entries, rates) {
  const projectName = project ? project.name : 'Dự án';
  const projectCode = project ? project.code || project.id : 'PRJ';
  
  let csv = '\uFEFF'; // UTF-8 BOM for Excel
  csv += `BÁO GIÁ VÀ DỰ TOÁN CHI PHÍ DỰ ÁN: ${projectName.replace(/,/g, ' ')}\n`;
  csv += `Mã dự án: ${projectCode}, Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
  csv += `STT,Hạng mục,Nhân sự / Cấp bậc,Đơn giá (VNĐ/giờ),Số Km,Số giờ/Km,Chi phí (VNĐ),Chi phí sau thuế (-10%)\n`;

  let totalCost = 0;
  let totalCostTax = 0;
  let totalKm = 0;
  let totalHours = 0;

  entries.forEach((e, idx) => {
    const calc = calculateRowCost(e, rates);
    const rateName = calc.rateObj ? calc.rateObj.name : 'N/A';
    totalCost += calc.cost;
    totalCostTax += calc.costAfterTax;
    totalKm += calc.km;
    totalHours += calc.hoursPerKm;

    csv += `${idx + 1},"${(e.category || '').replace(/"/g, '""')}","${rateName.replace(/"/g, '""')}",${calc.rate},${calc.km},${calc.hoursPerKm},${calc.cost},${calc.costAfterTax}\n`;
  });

  csv += `TỔNG CỘNG,,,,${totalKm.toFixed(2)},${totalHours.toFixed(1)},${totalCost},${totalCostTax}\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_gia_chi_phi_${projectCode}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
