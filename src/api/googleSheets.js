// Endpoint URL từ Google Apps Script (Thêm URL của bạn vào đây sau khi Deploy)
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbx7XiBpWK5409sDFQGFsJCtQHv3WHWGe8U4sfOQjZNqjQMmW3PTX9Csy431W3sQwm8y/exec';

/**
 * Lấy toàn bộ dữ liệu từ Google Sheets (Contents, Projects, Team)
 */
export async function fetchDataFromSheets() {
  if (GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn("Vui lòng cập nhật GAS_URL trong src/api/googleSheets.js");
    return null;
  }
  
  try {
    const response = await fetch(GAS_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data; // { contents: [], projects: [], team: [] }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu từ Google Sheets:', error);
    return null;
  }
}

/**
 * Lưu hoặc Cập nhật nội dung lên Google Sheets
 * @param {Object} contentItem - Dữ liệu content cần lưu
 */
export async function saveContentToSheets(contentItem) {
  if (GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') return { success: false, error: 'Chưa cấu hình URL' };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Dùng text/plain để tránh CORS preflight block trên một số trình duyệt
      },
      body: JSON.stringify({
        action: 'save',
        payload: contentItem
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Xóa nội dung trên Google Sheets
 * @param {String} contentId - ID của content cần xóa
 */
export async function deleteContentFromSheets(contentId) {
  if (GAS_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') return { success: false, error: 'Chưa cấu hình URL' };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'delete',
        payload: { id: contentId }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu:', error);
    return { success: false, error: error.message };
  }
}
