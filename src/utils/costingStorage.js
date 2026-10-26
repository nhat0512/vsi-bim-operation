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
/**
 * Get full project costing object including revisions
 * Automatically ensures backwards compatibility for projects with legacy flat entries
 */
export function getProjectRevisions(projectId) {
  const data = loadCostingData();
  let proj = data.projects[projectId];

  if (!proj) {
    const initialBaseline = {
      id: 'rev_0',
      name: 'Rev 0 - Baseline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: getState()?.currentUser?.name || 'Hệ thống',
      entries: []
    };
    proj = {
      updatedAt: new Date().toISOString(),
      activeRevisionId: 'rev_0',
      revisions: [initialBaseline],
      entries: []
    };
    data.projects[projectId] = proj;
    saveCostingData(data);
    return proj;
  }

  // Backwards compatibility: If project only has flat entries or missing revisions
  if (!Array.isArray(proj.revisions) || proj.revisions.length === 0) {
    const existingEntries = Array.isArray(proj.entries) ? proj.entries : [];
    const baseline = {
      id: 'rev_0',
      name: 'Rev 0 - Baseline',
      createdAt: proj.updatedAt || new Date().toISOString(),
      updatedAt: proj.updatedAt || new Date().toISOString(),
      createdBy: getState()?.currentUser?.name || 'Hệ thống',
      entries: existingEntries
    };
    proj.revisions = [baseline];
    proj.activeRevisionId = 'rev_0';
    proj.entries = existingEntries;
    saveCostingData(data);
  }

  if (!proj.activeRevisionId) {
    proj.activeRevisionId = proj.revisions[0]?.id || 'rev_0';
  }

  return proj;
}

/**
 * Get costing entries for a specific project from local cache (active revision or specified revision)
 */
export function getProjectCosting(projectId, revisionId = null) {
  const proj = getProjectRevisions(projectId);
  const targetId = revisionId || proj.activeRevisionId || 'rev_0';
  const rev = proj.revisions.find(r => r.id === targetId) || proj.revisions[0];
  return rev && Array.isArray(rev.entries) ? rev.entries : [];
}

/**
 * Set active revision for a project
 */
export function setActiveRevision(projectId, revisionId) {
  const data = loadCostingData();
  const proj = data.projects[projectId];
  if (!proj || !Array.isArray(proj.revisions)) return false;

  const rev = proj.revisions.find(r => r.id === revisionId);
  if (!rev) return false;

  proj.activeRevisionId = rev.id;
  proj.entries = rev.entries || [];
  proj.updatedAt = new Date().toISOString();
  saveCostingData(data);
  return true;
}

/**
 * Create a new revision by cloning the current or specified revision
 */
export function createProjectRevision(projectId, fromRevId, newRevName = '') {
  const data = loadCostingData();
  const proj = getProjectRevisions(projectId);

  const sourceRev = proj.revisions.find(r => r.id === fromRevId) || 
                    proj.revisions.find(r => r.id === proj.activeRevisionId) || 
                    proj.revisions[0];

  const nextIndex = proj.revisions.length;
  const letterCode = String.fromCharCode(65 + Math.min(nextIndex - 1, 25)); // A, B, C...
  const name = (newRevName || '').trim() || `Rev ${letterCode} - Bản sao điều chỉnh`;
  const newId = `rev_${Date.now()}`;

  // Deep clone entries with fresh IDs
  const clonedEntries = (sourceRev?.entries || []).map((e, idx) => ({
    ...e,
    id: `ce_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`
  }));

  const currentUser = getState()?.currentUser;
  const newRev = {
    id: newId,
    name: name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUser?.name || currentUser?.email || 'User',
    entries: clonedEntries
  };

  proj.revisions.push(newRev);
  proj.activeRevisionId = newId;
  proj.entries = clonedEntries;
  proj.updatedAt = new Date().toISOString();

  saveCostingData(data);

  // Sync to Cloud
  const projects = getState()?.projects || [];
  const meta = projects.find(p => p.id === projectId);
  syncProjectCostingToCloud(projectId, clonedEntries, meta, proj);

  return newRev;
}

/**
 * Delete a revision (prohibits deleting the only remaining revision)
 */
export function deleteProjectRevision(projectId, revisionId) {
  const data = loadCostingData();
  const proj = data.projects[projectId];
  if (!proj || !Array.isArray(proj.revisions) || proj.revisions.length <= 1) {
    return { success: false, message: 'Không thể xóa phiên bản duy nhất của dự án!' };
  }

  const idx = proj.revisions.findIndex(r => r.id === revisionId);
  if (idx === -1) return { success: false, message: 'Không tìm thấy phiên bản cần xóa.' };

  const deletedName = proj.revisions[idx].name;
  proj.revisions.splice(idx, 1);

  if (proj.activeRevisionId === revisionId) {
    const fallbackRev = proj.revisions[Math.max(0, idx - 1)];
    proj.activeRevisionId = fallbackRev.id;
    proj.entries = fallbackRev.entries || [];
  }
  proj.updatedAt = new Date().toISOString();
  saveCostingData(data);

  // Sync to Cloud
  const projects = getState()?.projects || [];
  const meta = projects.find(p => p.id === projectId);
  syncProjectCostingToCloud(projectId, proj.entries, meta, proj);

  return { success: true, message: `Đã xóa phiên bản "${deletedName}"`, activeRevisionId: proj.activeRevisionId };
}

/**
 * Save costing entries for a specific project and active/specified revision
 * Optimistic UI: writes to localStorage instantly, then syncs to Firestore with 1000ms debounce
 */
export function saveProjectCosting(projectId, entries, projectMeta = null, revisionId = null) {
  const data = loadCostingData();
  let proj = data.projects[projectId];

  if (!proj || !Array.isArray(proj.revisions) || proj.revisions.length === 0) {
    getProjectRevisions(projectId);
    proj = data.projects[projectId];
  }

  const targetId = revisionId || proj.activeRevisionId || 'rev_0';
  let targetRev = proj.revisions.find(r => r.id === targetId);

  if (!targetRev) {
    targetRev = {
      id: targetId,
      name: targetId === 'rev_0' ? 'Rev 0 - Baseline' : `Rev ${targetId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: Array.isArray(entries) ? entries : []
    };
    proj.revisions.push(targetRev);
  } else {
    targetRev.entries = Array.isArray(entries) ? entries : [];
    targetRev.updatedAt = new Date().toISOString();
  }

  proj.activeRevisionId = targetId;
  proj.entries = targetRev.entries;
  proj.updatedAt = new Date().toISOString();

  saveCostingData(data);

  // Background sync to Firestore
  syncProjectCostingToCloud(projectId, targetRev.entries, projectMeta, proj);
}

/**
 * Background sync project costing entries and revisions to Firestore
 */
export function syncProjectCostingToCloud(projectId, entries, projectMeta = null, projObj = null) {
  if (!db) {
    notifySyncStatus('local', 'Đã lưu cục bộ (chưa kết nối Cloud)');
    return;
  }

  notifySyncStatus('syncing', 'Đang lưu lên Cloud...');

  if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
  cloudSyncTimeout = setTimeout(async () => {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, projectId);
      const { rates, projects } = loadCostingData();
      const proj = projObj || projects[projectId] || {};

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

      // Sanitize revisions for Firestore
      const sanitizedRevisions = (proj.revisions || []).map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: r.updatedAt || new Date().toISOString(),
        createdBy: r.createdBy || 'User',
        entries: (r.entries || []).map(re => {
          const c = calculateRowCost(re, rates);
          return {
            id: re.id,
            category: re.category || 'Khác',
            rateId: re.rateId || 'R001',
            appliedRate: re.appliedRate !== undefined && re.appliedRate !== null ? Number(re.appliedRate) : c.rate,
            km: Number(re.km) || 0,
            hoursPerKm: Number(re.hoursPerKm) || 0,
            cost: c.cost,
            costAfterTax: c.costAfterTax
          };
        })
      }));

      const docData = {
        projectId,
        projectCode: projectMeta?.code || projectId,
        projectName: projectMeta?.name || 'Dự án',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || currentUser?.name || 'User',
        activeRevisionId: proj.activeRevisionId || 'rev_0',
        revisions: sanitizedRevisions,
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
      console.log(`☁️ [Firestore] Đã đồng bộ chi phí & revisions dự án [${projectId}] lên collection "${FIRESTORE_COLLECTION}"`);
      notifySyncStatus('synced', 'Đã đồng bộ Cloud');
    } catch (err) {
      console.error('❌ [Firestore] Lỗi đồng bộ costing lên Cloud:', err);
      notifySyncStatus('error', 'Lỗi đồng bộ Cloud');
    }
  }, 1000); // 1000ms debounce
}

/**
 * Fetch project costing data and revisions from Firestore on project load
 */
export async function fetchProjectCostingFromCloud(projectId) {
  if (!db || !projectId) return null;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, projectId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cloudData = snap.data();
      if (cloudData) {
        // Cache to localStorage
        const localData = loadCostingData();

        if (Array.isArray(cloudData.revisions) && cloudData.revisions.length > 0) {
          localData.projects[projectId] = {
            updatedAt: cloudData.updatedAt || new Date().toISOString(),
            activeRevisionId: cloudData.activeRevisionId || cloudData.revisions[0].id,
            revisions: cloudData.revisions,
            entries: cloudData.entries || cloudData.revisions[0].entries || []
          };
        } else if (Array.isArray(cloudData.entries)) {
          const baseline = {
            id: 'rev_0',
            name: 'Rev 0 - Baseline',
            createdAt: cloudData.updatedAt || new Date().toISOString(),
            updatedAt: cloudData.updatedAt || new Date().toISOString(),
            createdBy: cloudData.updatedBy || 'Cloud',
            entries: cloudData.entries
          };
          localData.projects[projectId] = {
            updatedAt: cloudData.updatedAt || new Date().toISOString(),
            activeRevisionId: 'rev_0',
            revisions: [baseline],
            entries: cloudData.entries
          };
        }

        saveCostingData(localData);
        notifySyncStatus('synced', 'Đã đồng bộ Cloud');
        return localData.projects[projectId].entries;
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

/**
 * =========================================================================
 * WBS & TIMESHEET READ-ONLY AGGREGATOR
 * Strictly READ-ONLY extraction of actual hours from WBS tasks & Timesheets
 * =========================================================================
 */
export function aggregateWBSActualHours(projectId) {
  const state = getState() || {};
  const projects = state.projects || [];
  const project = projects.find(p => p.id === projectId);
  const timesheets = state.timesheets || [];
  const personnel = state.personnel || [];
  const registeredUsers = state.registeredUsers || [];
  const costingData = loadCostingData();
  const rates = costingData.rates || DEFAULT_RATES;
  const categories = costingData.categories || DEFAULT_CATEGORIES;

  // 1. Gather all actual timesheet records for this project
  const projectTimesheets = timesheets.filter(ts => ts.projectId === projectId && ts.isActual);

  const actualWorkItems = [];

  projectTimesheets.forEach(ts => {
    const hours = Number(ts.hours) || 0;
    if (hours > 0) {
      actualWorkItems.push({
        source: 'timesheet',
        taskId: ts.taskId || '',
        taskName: ts.taskName || '',
        userName: ts.userName || '',
        userId: ts.userId || '',
        email: ts.email || '',
        hours: hours,
        dateString: ts.dateString || ts.date || ''
      });
    }
  });

  // 2. Check project tasks for dailyHours_actual (de-duplicate against projectTimesheets)
  if (project && Array.isArray(project.tasks)) {
    project.tasks.forEach(task => {
      if (task.dailyHours_actual && typeof task.dailyHours_actual === 'object') {
        Object.entries(task.dailyHours_actual).forEach(([dStr, hrs]) => {
          const hNum = Number(hrs) || 0;
          if (hNum > 0) {
            const alreadyInTimesheets = projectTimesheets.some(ts => 
              (ts.taskId === task.id || ts.taskName === task.name) &&
              (ts.dateString === dStr || ts.date === dStr) &&
              ts.isActual
            );
            if (!alreadyInTimesheets) {
              actualWorkItems.push({
                source: 'task_dailyHours',
                taskId: task.id || '',
                taskName: task.name || '',
                userName: task.assignee || '',
                userId: '',
                email: '',
                hours: hNum,
                dateString: dStr
              });
            }
          }
        });
      }
    });
  }

  // Helper: Map Task Name -> Costing Category
  function resolveCategory(taskName) {
    if (!taskName) return 'Khác';
    const lower = taskName.toLowerCase();

    if (lower.includes('atgt') || lower.includes('an toan') || lower.includes('an toàn') || 
        lower.includes('biển báo') || lower.includes('vạch sơn') || lower.includes('hộ lan')) {
      return categories.find(c => c.toLowerCase() === 'atgt') || 'ATGT';
    }
    if (lower.includes('đường') || lower.includes('duong') || lower.includes('tuyến chính') || 
        lower.includes('tuyen chinh') || lower.includes('nền mặt') || lower.includes('trắc dọc') || 
        lower.includes('trắc ngang') || lower.includes('nền đường')) {
      return categories.find(c => c.toLowerCase() === 'đường' || c.toLowerCase() === 'duong') || 'Đường';
    }
    if (lower.includes('cầu') || lower.includes('cau') || lower.includes('mố') || 
        lower.includes('trụ') || lower.includes('dầm') || lower.includes('dây văng') || 
        lower.includes('bản quá độ')) {
      return categories.find(c => c.toLowerCase() === 'cầu' || c.toLowerCase() === 'cau') || 'Cầu';
    }
    if (lower.includes('hầm') || lower.includes('ham') || lower.includes('vỏ hầm') || 
        lower.includes('đào hầm') || lower.includes('cửa hầm')) {
      return categories.find(c => c.toLowerCase() === 'hầm' || c.toLowerCase() === 'ham') || 'Hầm';
    }
    if (lower.includes('thoát nước') || lower.includes('thoat nuoc') || lower.includes('cống') || 
        lower.includes('mương') || lower.includes('rãnh') || lower.includes('hố ga')) {
      return categories.find(c => c.toLowerCase() === 'thoát nước' || c.toLowerCase() === 'thoat nuoc') || 'Thoát nước';
    }
    if (lower.includes('chiếu sáng') || lower.includes('chieu sang') || lower.includes('điện') || 
        lower.includes('đèn') || lower.includes('trạm biến áp')) {
      return categories.find(c => c.toLowerCase() === 'chiếu sáng' || c.toLowerCase() === 'chieu sang') || 'Chiếu sáng';
    }
    if (lower.includes('cảnh quan') || lower.includes('canh quan') || lower.includes('cây xanh') || 
        lower.includes('thảm cỏ')) {
      return categories.find(c => c.toLowerCase() === 'cảnh quan' || c.toLowerCase() === 'canh quan') || 'Cảnh quan';
    }
    if (lower.includes('nút giao') || lower.includes('nut giao') || lower.includes('vòng xuyến') || 
        lower.includes('nhánh ram')) {
      return categories.find(c => c.toLowerCase() === 'nút giao' || c.toLowerCase() === 'nut giao') || 'Nút giao';
    }

    const matchedCat = categories.find(c => lower.includes(c.toLowerCase()));
    if (matchedCat) return matchedCat;

    return 'Khác';
  }

  // Helper: Map Personnel -> Rate ID (R001 - R005)
  function resolveRateId(userName, userId, email) {
    const allPeople = [...personnel, ...registeredUsers];
    const person = allPeople.find(p => 
      (userId && p.id === userId) ||
      (email && p.email && p.email.toLowerCase() === email.toLowerCase()) ||
      (userName && p.name && p.name.trim().toLowerCase() === userName.trim().toLowerCase())
    );

    const role = (person?.role || '').toLowerCase();
    const level = (person?.level || '').toLowerCase();

    if (role.includes('manager')) {
      return rates.find(r => r.id === 'R005' || r.role === 'BIM Manager')?.id || 'R005';
    }
    if (role.includes('coordinator')) {
      return rates.find(r => r.id === 'R004' || r.role === 'BIM Coordinator')?.id || 'R004';
    }
    if (role.includes('modeler') || role.includes('engineer')) {
      if (level === 'senior') return rates.find(r => r.id === 'R001')?.id || 'R001';
      if (level === 'mid') return rates.find(r => r.id === 'R002')?.id || 'R002';
      if (level === 'junior') return rates.find(r => r.id === 'R003')?.id || 'R003';
      return 'R001';
    }

    return rates[0]?.id || 'R001';
  }

  // 3. Group by Category + RateId
  const groupMap = new Map();

  actualWorkItems.forEach(item => {
    const cat = resolveCategory(item.taskName);
    const rateId = resolveRateId(item.userName, item.userId, item.email);
    const key = `${cat}___${rateId}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        category: cat,
        rateId: rateId,
        totalHours: 0,
        tasksCount: 0,
        taskNames: new Set(),
        users: new Set()
      });
    }

    const grp = groupMap.get(key);
    grp.totalHours += item.hours;
    grp.tasksCount += 1;
    if (item.taskName) grp.taskNames.add(item.taskName);
    if (item.userName) grp.users.add(item.userName);
  });

  // Determine fallback Km from project length (e.g. "32.5 km" -> 32.5)
  let defaultKm = 1.0;
  if (project && project.length) {
    const m = String(project.length).match(/[\d.,]+/);
    if (m) {
      defaultKm = parseFloat(m[0].replace(',', '.')) || 1.0;
    }
  }

  // Get current project entries to reuse Km for same category if available
  const existingEntries = getProjectCosting(projectId);

  const aggregatedList = [];
  groupMap.forEach(grp => {
    // Reuse existing Km for this category if already configured
    const existingRow = existingEntries.find(e => e.category === grp.category && Number(e.km) > 0);
    const km = existingRow ? Number(existingRow.km) : defaultKm;
    const hoursPerKm = km > 0 ? Math.round((grp.totalHours / km) * 10) / 10 : grp.totalHours;

    const rateObj = rates.find(r => r.id === grp.rateId) || rates[0];
    const appliedRate = rateObj ? Number(rateObj.rate) || 0 : 0;
    const cost = Math.round(hoursPerKm * km * appliedRate);
    const costAfterTax = Math.round(cost * 0.9);

    aggregatedList.push({
      category: grp.category,
      rateId: grp.rateId,
      rateName: rateObj ? rateObj.name : 'Nhân sự',
      appliedRate: appliedRate,
      km: km,
      hoursPerKm: hoursPerKm,
      totalHours: Math.round(grp.totalHours * 10) / 10,
      cost: cost,
      costAfterTax: costAfterTax,
      taskNames: Array.from(grp.taskNames),
      users: Array.from(grp.users)
    });
  });

  // Sort by category name then rate
  aggregatedList.sort((a, b) => a.category.localeCompare(b.category));

  return {
    projectId,
    projectName: project?.name || 'Dự án',
    totalActualItems: actualWorkItems.length,
    totalActualHours: Math.round(actualWorkItems.reduce((acc, cur) => acc + cur.hours, 0) * 10) / 10,
    aggregatedList
  };
}
