import { getState, setState } from '../state.js';

let tableData = [
  { isHeader: true, stt: 'I', content: 'Km0-km27', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { stt: '1.2', content: 'Km0-km5', sub1: { date: '12/08/2026 (ok)', status: 'yellow' }, sub2: { date: '09/09/2026', status: 'yellow' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: '', km: 5 },
  { stt: '1.3', content: 'Km5-km10', sub1: { date: '14/07/2026', status: 'yellow' }, sub2: { date: '29/09/2026', status: 'cyan' }, payment: { date: 'ngày 28/09/2026', status: 'orange' }, note: '', km: 5 }
]; // Initial mockup, will be overwritten by sync

function getStatusColor(status) {
  switch(status) {
    case 'yellow': return 'background-color: #fff000; color: #000;';
    case 'cyan': return 'background-color: #00ffff; color: #000;';
    case 'orange': return 'background-color: #f6931d; color: #000;';
    case 'green': return 'background-color: #00ff00; color: #000;';
    case 'light-green': return 'background-color: #c4d79b; color: #000;';
    case 'red': return 'background-color: #ff0000; color: #fff;';
    default: return '';
  }
}

export function render() {
  return `
    <div class="animate-fade-in-up" style="height: calc(100vh - 100px); display: flex; flex-direction: column;">
      <div class="flex items-center justify-between mb-lg">
        <div>
          <h1 class="section-title">📐 Theo dõi tiến độ bản vẽ</h1>
          <div class="text-sm text-muted">Theo dõi tiến độ nhận và thẩm tra bản vẽ thi công 14D</div>
        </div>
        
        <div class="flex items-center gap-sm">
          <button class="btn btn-outline btn-sm text-primary" id="btn-gs-sync" title="Đồng bộ trực tiếp từ Google Sheets">🔄 Đồng bộ Google Sheets</button>
          <button class="btn btn-outline btn-sm" id="btn-export-excel" title="Xuất Excel">📥 Xuất Excel</button>
        </div>
      </div>
      
      <div class="card p-0" style="flex: 1; overflow: auto; background: var(--bg-secondary);">
        
        <div style="padding: 1rem; display: flex; gap: 1rem; align-items: center; border-bottom: 1px solid var(--border-subtle); background: var(--bg-primary);">
          <div style="font-weight: bold; font-size: 0.9rem;">Chú thích:</div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #fff000; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Đã nộp</span></div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #00ffff; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Tiến độ hoàn thành</span></div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #ff0000; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Có dấu hiệu trễ</span></div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #c4d79b; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Đã nộp lần 2 nhưng HS còn thiếu</span></div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #f6931d; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Hoàn thiện hồ sơ</span></div>
          <div class="flex items-center gap-xs"><div style="width: 16px; height: 16px; background-color: #00ff00; border: 1px solid #ccc;"></div> <span style="font-size: 0.8rem;">Hoàn thành</span></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; min-width: 1200px;" class="drawing-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">STT</th>
              <th style="width: 150px; text-align: center;">Nội dung</th>
              <th style="width: 150px; text-align: center; background: rgba(255, 171, 0, 0.1);">Nộp thẩm tra lần 1</th>
              <th style="width: 150px; text-align: center; background: rgba(0, 200, 255, 0.1);">Nộp thẩm tra lần 2</th>
              <th style="width: 180px; text-align: center; background: rgba(246, 147, 29, 0.1);">Hoàn thiện hồ sơ thanh toán</th>
              <th style="text-align: left;">Ghi chú/Lưu ý</th>
              <th style="width: 100px; text-align: center;">Số lượng Km</th>
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => {
              if (row.isHeader) {
                return `
                  <tr style="background: rgba(144, 98, 255, 0.15); font-weight: bold;">
                    <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.stt}</td>
                    <td style="padding: 10px; border: 1px solid var(--border-subtle);">${row.content}</td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                  </tr>
                `;
              }
              return `
                <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-tertiary);">
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.stt}</td>
                  <td style="padding: 10px; border: 1px solid var(--border-subtle);">${row.content}</td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub1 ? getStatusColor(row.sub1.status) : ''}">${row.sub1 ? row.sub1.date : ''}</td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub2 ? getStatusColor(row.sub2.status) : ''}">${row.sub2 ? row.sub2.date : ''}</td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.payment ? getStatusColor(row.payment.status) : ''}">${row.payment ? row.payment.date : ''}</td>
                  <td style="padding: 10px; border: 1px solid var(--border-subtle); white-space: pre-line; font-size: 0.85rem;">${row.note}</td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.km}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <style>
        .drawing-table th {
          padding: 12px;
          border: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          background: var(--bg-primary);
          z-index: 10;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .drawing-table tbody tr:hover td {
          opacity: 0.9;
        }
      </style>
    </div>
  `;
}

export function init() {
  document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    alert('Tính năng xuất Excel đang được phát triển.');
  });
  
  document.getElementById('btn-gs-sync')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-gs-sync');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Đang kéo dữ liệu...';
    btn.disabled = true;

    try {
      const { GAS_URL } = await import('../api/googleSheets.js');
      const res = await fetch(GAS_URL + "?sheet=TimeLine_14D");
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      
      if (data && data.timeline) {
        const values = data.timeline.values;
        const colors = data.timeline.colors;
        
        const hexToStatus = (hex) => {
          hex = (hex || '').toLowerCase();
          if (hex === '#ffff00') return 'yellow';
          if (hex === '#00ffff') return 'cyan';
          if (hex === '#00ff00') return 'green';
          if (hex === '#ff9900' || hex === '#f6b26b') return 'orange';
          if (hex === '#ff0000') return 'red';
          if (hex === '#c4d79b') return 'light-green';
          return '';
        };

        const parseDate = (str) => {
          if (!str) return '';
          const parts = str.toString().split('/');
          if (parts.length === 3) {
            return parts[0] + '/' + parts[1] + '/' + parts[2]; // Trả về dd/mm/yyyy
          }
          return str.toString(); // Có thể là text như "Đã nộp"
        };

        const newTableData = [];
        for (let i = 3; i < values.length; i++) {
          const rowValues = values[i];
          const rowColors = colors[i];
          
          if (!rowValues[1]) continue; // Bỏ qua nếu cột Nội dung trống
          
          // Header nếu cột 1 (STT) có màu tím d9d2e9
          const isHeader = (rowColors[0] || '').toLowerCase() === '#d9d2e9' || (rowColors[1] || '').toLowerCase() === '#d9d2e9';
          
          if (isHeader) {
            newTableData.push({
              isHeader: true,
              stt: rowValues[0] || '',
              content: rowValues[1] || '',
              sub1: '', sub2: '', payment: '', note: '', km: ''
            });
          } else {
            const hasSub1 = rowValues[3] || (rowColors[3] && rowColors[3].toLowerCase() !== '#ffffff');
            const hasSub2 = rowValues[4] || (rowColors[4] && rowColors[4].toLowerCase() !== '#ffffff');
            const hasPay = rowValues[5] || (rowColors[5] && rowColors[5].toLowerCase() !== '#ffffff');
            
            newTableData.push({
              stt: rowValues[0] || '',
              content: rowValues[1] || '',
              sub1: hasSub1 ? { date: parseDate(rowValues[3]), status: hexToStatus(rowColors[3]) } : null,
              sub2: hasSub2 ? { date: parseDate(rowValues[4]), status: hexToStatus(rowColors[4]) } : null,
              payment: hasPay ? { date: parseDate(rowValues[5]), status: hexToStatus(rowColors[5]) } : null,
              note: (rowValues[11] || '').toString(),
              km: (rowValues[7] || '').toString()
            });
          }
        }
        
        tableData = newTableData;
        
        // Re-render tbody
        const tbody = document.querySelector('.drawing-table tbody');
        if (tbody) {
          tbody.innerHTML = tableData.map(row => {
            if (row.isHeader) {
              return `
                <tr style="background: rgba(144, 98, 255, 0.15); font-weight: bold;">
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.stt}</td>
                  <td style="padding: 10px; border: 1px solid var(--border-subtle);">${row.content}</td>
                  <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                  <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                  <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                  <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                  <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                </tr>
              `;
            }
            // window.getStatusColor was private to this module, so we must redefine or make it available. 
            // Wait, we can just compute it inline or call the existing getStatusColor (which is not exported, but in module scope)
            const getStatusColor = (status) => {
              switch(status) {
                case 'yellow': return 'background-color: #fff000; color: #000;';
                case 'cyan': return 'background-color: #00ffff; color: #000;';
                case 'orange': return 'background-color: #f6931d; color: #000;';
                case 'green': return 'background-color: #00ff00; color: #000;';
                case 'light-green': return 'background-color: #c4d79b; color: #000;';
                case 'red': return 'background-color: #ff0000; color: #fff;';
                default: return '';
              }
            };
            return `
              <tr style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-tertiary);">
                <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.stt}</td>
                <td style="padding: 10px; border: 1px solid var(--border-subtle);">${row.content}</td>
                <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub1 ? getStatusColor(row.sub1.status) : ''}">${row.sub1 ? row.sub1.date : ''}</td>
                <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub2 ? getStatusColor(row.sub2.status) : ''}">${row.sub2 ? row.sub2.date : ''}</td>
                <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.payment ? getStatusColor(row.payment.status) : ''}">${row.payment ? row.payment.date : ''}</td>
                <td style="padding: 10px; border: 1px solid var(--border-subtle); white-space: pre-line; font-size: 0.85rem;">${row.note}</td>
                <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">${row.km}</td>
              </tr>
            `;
          }).join('');
        }
        alert('✅ Đồng bộ dữ liệu thành công!');
      } else {
        alert('⚠️ Dữ liệu không hợp lệ.');
      }
    } catch (e) {
      console.error(e);
      alert('⚠️ Không thể kết nối tới Google Sheets. Lỗi: ' + e.message);
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
  });
}

export function destroy() {
  // Cleanup if needed
}
