// ============================================
// COSTING STORAGE — LocalStorage Manager & Math Helpers for Project Costing
// ============================================

export const STORAGE_KEY = 'bimTransPM_CostingData';

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
 * Save entire costing data to localStorage
 */
export function saveCostingData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Lỗi lưu dữ liệu Costing vào localStorage:', err);
  }
}

/**
 * Get costing entries for a specific project
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
 */
export function saveProjectCosting(projectId, entries) {
  const data = loadCostingData();
  data.projects[projectId] = {
    updatedAt: new Date().toISOString(),
    entries: Array.isArray(entries) ? entries : []
  };
  saveCostingData(data);
}

/**
 * Calculate cost for a single row
 * Formula requested: Chi phí = Số giờ thực tế theo Km * Đơn giá của Nhân sự
 * Chi phí sau thuế = Chi phí * 0.9 (-10% khấu trừ thuế)
 */
export function calculateRowCost(entry, rates = []) {
  if (!entry) return { cost: 0, costAfterTax: 0, rate: 0, hoursPerKm: 0, km: 0 };
  
  const rateObj = rates.find(r => r.id === entry.rateId) || rates[0];
  const rate = rateObj ? Number(rateObj.rate) || 0 : 0;
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
