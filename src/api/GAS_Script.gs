/**
 * =========================================
 * CREATOR KIT - GOOGLE APPS SCRIPT BACKEND
 * =========================================
 * Hướng dẫn cài đặt:
 * 1. Mở file Google Sheets của bạn.
 * 2. Chọn Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Xóa code cũ, dán toàn bộ đoạn code này vào.
 * 4. Chạy hàm setupSheets() 1 lần để hệ thống tự tạo các sheet và cột dữ liệu.
 * 5. Bấm Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment).
 * 6. Loại: Ứng dụng Web (Web app). 
 *    - Quyền truy cập: Bất kỳ ai (Anyone).
 * 7. Bấm Triển khai, copy URL Web App và dán vào biến GAS_URL trong file src/api/googleSheets.js
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Đọc dữ liệu từ sheet Contents
    const contentsSheet = ss.getSheetByName('Contents');
    const contents = contentsSheet ? getSheetDataAsObjects(contentsSheet) : [];
    
    // Đọc dữ liệu từ sheet Projects
    const projectsSheet = ss.getSheetByName('Projects');
    const projects = projectsSheet ? getSheetDataAsObjects(projectsSheet) : [];
    
    // Đọc dữ liệu từ sheet Team
    const teamSheet = ss.getSheetByName('Team');
    const team = teamSheet ? getSheetDataAsObjects(teamSheet) : [];
    
    const responseData = {
      contents: contents,
      projects: projects,
      team: team
    };

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === 'save') {
      const payload = postData.payload;
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Chuyển đổi dữ liệu sheet (có header) thành mảng JSON
 */
function getSheetDataAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Sheet trống
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      // Parse JSON strings like arrays if needed, otherwise keep as is
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * Hàm khởi tạo - Chạy 1 lần duy nhất từ menu Run > setupSheets
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Contents
  let contentsSheet = ss.getSheetByName('Contents');
  if (!contentsSheet) contentsSheet = ss.insertSheet('Contents');
  if (contentsSheet.getLastRow() === 0) {
    contentsSheet.appendRow(['id', 'title', 'platform', 'status', 'scheduledDate', 'scheduledTime', 'assignee', 'category', 'tags', 'description', 'priority']);
    // Add sample row
    contentsSheet.appendRow(['c001', 'YTB HL Creator: Mẹo gen Thum GPT', 'youtube', 'published', '2026-06-01', '09:00', 'tm001', 'AI/ML', '["GPT","AI"]', 'Mô tả mẫu', 'high']);
  }
  
  // 2. Projects
  let projectsSheet = ss.getSheetByName('Projects');
  if (!projectsSheet) projectsSheet = ss.insertSheet('Projects');
  if (projectsSheet.getLastRow() === 0) {
    projectsSheet.appendRow(['id', 'title', 'type', 'status', 'details']);
    projectsSheet.appendRow(['p001', 'Edit Video HL Free', 'project', 'in-progress', 'Cần dựng xong Video Dài để phát vào ngày mai.']);
    projectsSheet.appendRow(['p002', 'Deal TOPVIEW AI', 'deal', 'pending', 'Hạn chót 25/05']);
  }
  
  // 3. Team
  let teamSheet = ss.getSheetByName('Team');
  if (!teamSheet) teamSheet = ss.insertSheet('Team');
  if (teamSheet.getLastRow() === 0) {
    teamSheet.appendRow(['id', 'name', 'role', 'avatar']);
    teamSheet.appendRow(['tm001', 'Hào Lam', 'Creator', 'HL']);
  }
}
