import { getState, setState } from '../state.js';

const tableData = [
  { isHeader: true, stt: 'I', content: 'Km0-km27', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { stt: '1.2', content: 'Km0-km5', sub1: { date: '12/08/2026 (ok)', status: 'yellow' }, sub2: { date: '09/09/2026', status: 'yellow' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: '', km: 5 },
  { stt: '1.3', content: 'Km5-km10', sub1: { date: '14/07/2026', status: 'yellow' }, sub2: { date: '29/09/2026', status: 'cyan' }, payment: { date: 'ngày 28/09/2026', status: 'orange' }, note: '', km: 5 },
  { stt: '1.4', content: 'Km10-km16', sub1: { date: '17/08/2026', status: 'yellow' }, sub2: { date: '20/10/2026', status: 'cyan' }, payment: { date: 'ngày 28/08/2026', status: 'green' }, note: '- 2 cầu,\n- 25 cống', km: 6 },
  { stt: '1.5', content: 'Km16-km21', sub1: null, sub2: null, payment: null, note: '', km: '' },
  { stt: '1.6', content: 'Km21-km27', sub1: null, sub2: null, payment: null, note: '', km: '' },
  
  { isHeader: true, stt: 'II', content: 'Km27-Km40', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { stt: '2.1', content: 'Km27-Km31', sub1: null, sub2: null, payment: null, note: '', km: '' },
  { stt: '2.2', content: 'Km31-Km34', sub1: { date: '22/09/2026', status: 'yellow' }, sub2: { date: '08/10/2026', status: 'cyan' }, payment: null, note: '- 0 cầu,\n- 12 cống', km: 3 },
  { stt: '2.3', content: 'Km34-Km35', sub1: { date: '28/07/2026', status: 'yellow' }, sub2: { date: '05/10/2026', status: 'light-green' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: 'a. Linh bổ xung thang bậc nước, tường TL', km: 1 },
  { stt: '2.4', content: 'Km35-Km40', sub1: null, sub2: null, payment: null, note: '', km: '' },

  { isHeader: true, stt: 'III', content: 'Km40-Km50', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { stt: '3.1', content: 'Km40-Km44', sub1: { date: '25/09/2026', status: 'yellow' }, sub2: { date: '12/10/2026', status: 'cyan' }, payment: null, note: '- 1 cầu gần xong đã đi thép a. Linh,\n- 16 cống', km: 4 },
  { stt: '3.2', content: 'Km44-Km46', sub1: { date: '09/08/2026', status: 'yellow' }, sub2: { date: '19/09/2026', status: 'red' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: 'a. Linh bổ xung thang bậc nước + Tường TL', km: 2 },
  { stt: '3.3', content: 'Km46-Km47', sub1: { date: '23/09/2026', status: 'yellow' }, sub2: { date: '02/10/2026', status: 'cyan' }, payment: null, note: '- 0 cầu,\n- 6 cống', km: 1 },
  { stt: '3.4', content: 'Km47-Km49', sub1: { date: '28/09/2026', status: 'yellow' }, sub2: { date: '15/10/2026', status: 'cyan' }, payment: null, note: '- 2 cầu, trong đó 1 cầu 48 đã đi thép\n- 5 cống', km: 2 },
  { stt: '3.5', content: 'Km49-Km50', sub1: null, sub2: null, payment: null, note: '', km: '' },

  { isHeader: true, stt: 'VI', content: 'Km50-Km62', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { stt: '4.1', content: 'Km50-Km53', sub1: { date: '24/09/2026', status: 'yellow' }, sub2: { date: '26/10/2026', status: 'cyan' }, payment: null, note: '- 2 cầu ngắn\n- 6 cống', km: 3 },
  { stt: '4.2', content: 'Km53-Km54', sub1: { date: '26/07/2026', status: 'yellow' }, sub2: { date: '08/10/2026', status: 'light-green' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: 'a. Linh bổ xung thang bậc nước + Tường TL', km: 1 },
  { stt: '4.3', content: 'Km54-Km62', sub1: null, sub2: null, payment: null, note: '', km: '' },

  { isHeader: true, stt: 'V', content: 'Km62-Km72', sub1: '', sub2: '', payment: '', note: '', km: '' },
];

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
          <button class="btn btn-outline btn-sm" id="btn-export-excel" title="Xuất Excel">📥 Xuất Excel</button>
          <button class="btn btn-primary btn-sm" id="btn-add-row">➕ Thêm dữ liệu</button>
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
  
  document.getElementById('btn-add-row')?.addEventListener('click', () => {
    alert('Tính năng thêm dữ liệu đang được phát triển.');
  });
}

export function destroy() {
  // Cleanup if needed
}
