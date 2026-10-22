export function formatDisplayName(rawName) {
  if (!rawName) return 'Người dùng';
  
  // Check if the name looks like an email prefix (e.g. "an.nguyen")
  if (rawName.includes('.')) {
    return rawName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  
  // Ensure words are capitalized
  return rawName.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

/**
 * Format a Date object or date-compatible value to local YYYY-MM-DD
 * Prevents UTC timezone shift issues (e.g. GMT+7 being shifted backward when calling toISOString)
 */
export function formatLocalDate(date = new Date()) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Trích xuất giá trị số chuẩn xác (VNĐ) từ chuỗi ngân sách đa dạng tiếng Việt.
 * Hỗ trợ các trường hợp:
 * - Dạng kép: "1 tỷ 200 triệu VNĐ", "1 tỷ 200tr", "1 tỉ 50 triệu" -> 1.200.000.000 VNĐ
 * - Viết tắt: "1 tỷ 2 VNĐ", "1 tỷ 2" -> 1.200.000.000 VNĐ; "1 tỷ 25" -> 1.250.000.000 VNĐ
 * - Hàng nghìn tỷ (dự án hạ tầng): "4,200 tỷ VNĐ", "12,500 tỷ" -> 4.200.000.000.000 VNĐ
 * - Số thập phân: "1.2 tỷ", "1,2 tỷ" -> 1.200.000.000 VNĐ
 * - Đơn vị triệu: "800 triệu VNĐ", "800tr" -> 800.000.000 VNĐ
 * - Số nguyên thuần hoặc phân tách: "1.200.000.000", "1200000000" -> 1.200.000.000 VNĐ
 */
export function parseBudgetValue(budgetInput) {
  if (!budgetInput) return 0;
  if (typeof budgetInput === 'number') return budgetInput;
  const raw = String(budgetInput).trim().toLowerCase();
  if (!raw || raw === 'chưa cập nhật' || raw === '—' || raw === '-') return 0;

  // 1. Kiểm tra cấu trúc hỗn hợp: "[X] tỷ/tỉ ... [Y] [triệu/tr]?"
  const compoundMatch = raw.match(/([\d.,]+)\s*(?:tỷ|tỉ)\s*([\d.,]+)?(?:\s*(?:triệu|trieu|tr))?/i);
  if (compoundMatch) {
    const tyPartStr = compoundMatch[1];
    const subPartStr = compoundMatch[2];

    // Xử lý tyPart:
    // Nếu tyPart có dạng "4,200" hoặc "12,500" (dấu phân cách hàng nghìn theo sau bởi 3 chữ số)
    let tyNum = 0;
    if (/\d+[,.]\d{3}$/.test(tyPartStr)) {
      tyNum = parseFloat(tyPartStr.replace(/[,.]/g, '')) || 0;
    } else {
      tyNum = parseFloat(tyPartStr.replace(/,/g, '.')) || 0;
    }

    let subNumInTriệu = 0;
    if (subPartStr) {
      // Có số phía sau chữ tỷ, ví dụ: "1 tỷ 200 triệu" hoặc "1 tỷ 2"
      if (raw.includes('triệu') || raw.includes('trieu') || raw.includes('tr')) {
        subNumInTriệu = parseFloat(subPartStr.replace(/,/g, '.')) || 0;
      } else {
        // Viết tắt dạng "1 tỷ 2" -> 200 triệu, "1 tỷ 25" -> 250 triệu, "1 tỷ 05" -> 50 triệu
        const cleanSub = subPartStr.replace(/[^\d]/g, '');
        const cleanSubNum = parseFloat(cleanSub) || 0;
        if (cleanSubNum >= 1000000) {
          subNumInTriệu = cleanSubNum / 1000000;
        } else if (cleanSub.length === 1) {
          subNumInTriệu = cleanSubNum * 100; // 2 -> 200 triệu
        } else if (cleanSub.length === 2) {
          subNumInTriệu = cleanSubNum * 10;  // 25 -> 250 triệu
        } else {
          subNumInTriệu = cleanSubNum;       // 200 -> 200 triệu
        }
      }
    }

    const total = (tyNum * 1000000000) + (subNumInTriệu * 1000000);
    if (!isNaN(total) && total > 0) return total;
  }

  // 2. Chỉ có "triệu" / "tr" (không có tỷ): e.g. "800 triệu VNĐ", "500tr", "1,500 triệu"
  if (raw.includes('triệu') || raw.includes('trieu') || raw.includes('tr')) {
    const trMatch = raw.match(/([\d.,]+)\s*(?:triệu|trieu|tr)/i);
    if (trMatch) {
      const trStr = trMatch[1];
      let trNum = 0;
      if (/\d+[,.]\d{3}$/.test(trStr)) {
        trNum = parseFloat(trStr.replace(/[,.]/g, '')) || 0;
      } else {
        trNum = parseFloat(trStr.replace(/,/g, '.')) || 0;
      }
      return trNum * 1000000;
    }
  }

  // 3. Chuỗi số thuần hoặc định dạng phân tách (VD: "1.200.000.000 VNĐ", "1,200,000,000", "1200000000")
  const cleanDigits = raw.replace(/[^\d]/g, '');
  if (cleanDigits) {
    const val = parseFloat(cleanDigits);
    return isNaN(val) ? 0 : val;
  }

  return 0;
}

/**
 * Định dạng tiền tệ hiển thị ngắn gọn thông minh (Tỷ / Tr / ₫)
 * Hỗ trợ cả số âm và hiển thị chính xác 2 chữ số thập phân
 */
export function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '0 ₫';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1000000000) return sign + (abs / 1000000000).toFixed(2) + ' Tỷ';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(2) + ' Tr';
  return sign + Math.round(abs).toLocaleString('vi-VN') + ' ₫';
}


