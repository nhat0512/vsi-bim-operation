import { getState, updateProject } from '../state.js';

let isEditing = false;

let defaultTableData = [
  { id: 'h1', isHeader: true, stt: 'I', content: 'Km0-km27', sub1: '', sub2: '', payment: '', note: '', km: '' },
  { id: 'r1', stt: '1.2', content: 'Km0-km5', sub1: { date: '12/08/2026 (ok)', status: 'yellow' }, sub2: { date: '09/09/2026', status: 'yellow' }, payment: { date: 'ngày 25/09/2026', status: 'orange' }, note: '', km: 5 },
  { id: 'r2', stt: '1.3', content: 'Km5-km10', sub1: { date: '14/07/2026', status: 'yellow' }, sub2: { date: '29/09/2026', status: 'cyan' }, payment: { date: 'ngày 28/09/2026', status: 'orange' }, note: '', km: 5 }
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
  const { projects, selectedProjectId } = getState();
  const project = projects.find(p => p.id === selectedProjectId);
  const data = (project && project.drawingData) ? project.drawingData : defaultTableData;

  const colorSelectOptions = (val) => `
    <option value="" ${!val ? 'selected' : ''}>-</option>
    <option value="yellow" ${val === 'yellow' ? 'selected' : ''}>Đã nộp</option>
    <option value="cyan" ${val === 'cyan' ? 'selected' : ''}>Hoàn thành CĐT</option>
    <option value="orange" ${val === 'orange' ? 'selected' : ''}>Hoàn thiện</option>
    <option value="green" ${val === 'green' ? 'selected' : ''}>Xong</option>
    <option value="light-green" ${val === 'light-green' ? 'selected' : ''}>Nộp lại</option>
    <option value="red" ${val === 'red' ? 'selected' : ''}>Trễ</option>
  `;

  return `
    <div class="animate-fade-in-up" style="height: calc(100vh - 100px); display: flex; flex-direction: column;">
      <div class="flex items-center justify-between mb-lg">
        <div>
          <h1 class="section-title">📐 Theo dõi tiến độ bản vẽ</h1>
          <div class="text-sm text-muted">Dự án: ${project ? project.name : 'Chưa chọn'}</div>
        </div>
        
        <div class="flex items-center gap-sm">
          ${isEditing ? `
            <button class="btn btn-outline btn-sm" id="btn-add-header">+ Thêm Mục lớn</button>
            <button class="btn btn-outline btn-sm" id="btn-add-row">+ Thêm Phân đoạn</button>
            <div style="width: 1px; height: 24px; background: var(--border-subtle); margin: 0 4px;"></div>
            <button class="btn btn-primary btn-sm" id="btn-save-drawings">💾 Lưu thay đổi</button>
            <button class="btn btn-ghost btn-sm text-danger" id="btn-cancel-edit">Hủy</button>
          ` : `
            <button class="btn btn-outline btn-sm text-primary" id="btn-gs-sync" title="Đồng bộ trực tiếp từ Google Sheets">🔄 Đồng bộ GSheets</button>
            <button class="btn btn-outline btn-sm" id="btn-export-excel" title="Xuất Excel">📥 Xuất Excel</button>
            <button class="btn btn-primary btn-sm" id="btn-edit-drawings">✏️ Chỉnh sửa</button>
          `}
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
            ${data.map((row, idx) => {
              if (row.isHeader) {
                return `
                  <tr class="dw-row" data-id="${row.id}" data-is-header="true" style="background: rgba(144, 98, 255, 0.15); font-weight: bold;">
                    <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">
                      ${isEditing ? `<input type="text" class="i-stt" value="${row.stt}" style="width: 100%; text-align: center;">` : row.stt}
                    </td>
                    <td style="padding: 10px; border: 1px solid var(--border-subtle);">
                      ${isEditing ? `<input type="text" class="i-content" value="${row.content}" style="width: 100%;">` : row.content}
                    </td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);"></td>
                    <td style="border: 1px solid var(--border-subtle); background: rgba(144, 98, 255, 0.05);">
                      ${isEditing ? `<button class="btn-icon text-danger btn-del-row" data-idx="${idx}">🗑️</button>` : ''}
                    </td>
                  </tr>
                `;
              }
              return `
                <tr class="dw-row" data-id="${row.id}" data-is-header="false" style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-tertiary);">
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">
                    ${isEditing ? `<input type="text" class="i-stt" value="${row.stt}" style="width: 100%; text-align: center;">` : row.stt}
                  </td>
                  <td style="padding: 10px; border: 1px solid var(--border-subtle);">
                    ${isEditing ? `<input type="text" class="i-content" value="${row.content}" style="width: 100%;">` : row.content}
                  </td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub1 ? getStatusColor(row.sub1.status) : ''}">
                    ${isEditing ? `
                      <input type="text" class="i-s1-d" value="${row.sub1 ? row.sub1.date : ''}" placeholder="Ngày nộp" style="width: 100%; font-size: 0.75rem; margin-bottom: 4px;">
                      <select class="i-s1-s" style="width: 100%; font-size: 0.75rem;">${colorSelectOptions(row.sub1 ? row.sub1.status : '')}</select>
                    ` : (row.sub1 ? row.sub1.date : '')}
                  </td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.sub2 ? getStatusColor(row.sub2.status) : ''}">
                    ${isEditing ? `
                      <input type="text" class="i-s2-d" value="${row.sub2 ? row.sub2.date : ''}" placeholder="Ngày nộp" style="width: 100%; font-size: 0.75rem; margin-bottom: 4px;">
                      <select class="i-s2-s" style="width: 100%; font-size: 0.75rem;">${colorSelectOptions(row.sub2 ? row.sub2.status : '')}</select>
                    ` : (row.sub2 ? row.sub2.date : '')}
                  </td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle); ${row.payment ? getStatusColor(row.payment.status) : ''}">
                    ${isEditing ? `
                      <input type="text" class="i-pay-d" value="${row.payment ? row.payment.date : ''}" placeholder="Ngày nộp" style="width: 100%; font-size: 0.75rem; margin-bottom: 4px;">
                      <select class="i-pay-s" style="width: 100%; font-size: 0.75rem;">${colorSelectOptions(row.payment ? row.payment.status : '')}</select>
                    ` : (row.payment ? row.payment.date : '')}
                  </td>
                  <td style="padding: 10px; border: 1px solid var(--border-subtle); white-space: pre-line; font-size: 0.85rem;">
                    ${isEditing ? `<textarea class="i-note" style="width: 100%; min-height: 40px; font-size: 0.8rem;">${row.note}</textarea>` : row.note}
                  </td>
                  <td style="text-align: center; padding: 10px; border: 1px solid var(--border-subtle);">
                    ${isEditing ? `
                      <input type="text" class="i-km" value="${row.km}" style="width: 60px; text-align: center;">
                      <button class="btn-icon text-danger btn-del-row" data-idx="${idx}" style="display:block; margin: 4px auto 0;">🗑️</button>
                    ` : row.km}
                  </td>
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

function reRender() {
  const container = document.getElementById('page-content');
  if (container) {
    container.innerHTML = render();
    init();
  }
}

export function init() {
  document.getElementById('btn-export-excel')?.addEventListener('click', () => {
    alert('Tính năng xuất Excel đang được phát triển.');
  });
  
  // Toggle edit
  document.getElementById('btn-edit-drawings')?.addEventListener('click', () => {
    const { selectedProjectId } = getState();
    if (!selectedProjectId) {
      alert('Vui lòng chọn một Dự án ở trang Danh sách dự án trước khi chỉnh sửa.');
      return;
    }
    isEditing = true;
    reRender();
  });

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    isEditing = false;
    reRender();
  });

  // Save changes
  document.getElementById('btn-save-drawings')?.addEventListener('click', () => {
    const { projects, selectedProjectId } = getState();
    const rows = document.querySelectorAll('.dw-row');
    const newData = [];
    rows.forEach(tr => {
      const isHeader = tr.dataset.isHeader === 'true';
      if (isHeader) {
        newData.push({
          id: tr.dataset.id,
          isHeader: true,
          stt: tr.querySelector('.i-stt').value,
          content: tr.querySelector('.i-content').value,
          sub1: '', sub2: '', payment: '', note: '', km: ''
        });
      } else {
        const s1s = tr.querySelector('.i-s1-s').value;
        const s2s = tr.querySelector('.i-s2-s').value;
        const pS = tr.querySelector('.i-pay-s').value;
        newData.push({
          id: tr.dataset.id,
          isHeader: false,
          stt: tr.querySelector('.i-stt').value,
          content: tr.querySelector('.i-content').value,
          sub1: s1s ? { date: tr.querySelector('.i-s1-d').value, status: s1s } : null,
          sub2: s2s ? { date: tr.querySelector('.i-s2-d').value, status: s2s } : null,
          payment: pS ? { date: tr.querySelector('.i-pay-d').value, status: pS } : null,
          note: tr.querySelector('.i-note').value,
          km: tr.querySelector('.i-km').value
        });
      }
    });

    updateProject(selectedProjectId, { drawingData: newData });
    isEditing = false;
    reRender();
  });

  // Add actions
  document.getElementById('btn-add-header')?.addEventListener('click', () => {
    const { projects, selectedProjectId } = getState();
    const project = projects.find(p => p.id === selectedProjectId);
    const data = (project && project.drawingData) ? project.drawingData : defaultTableData;
    data.push({ id: `h${Date.now()}`, isHeader: true, stt: 'II', content: 'Mục mới', sub1: '', sub2: '', payment: '', note: '', km: '' });
    updateProject(selectedProjectId, { drawingData: data });
    reRender();
  });

  document.getElementById('btn-add-row')?.addEventListener('click', () => {
    const { projects, selectedProjectId } = getState();
    const project = projects.find(p => p.id === selectedProjectId);
    const data = (project && project.drawingData) ? project.drawingData : defaultTableData;
    data.push({ id: `r${Date.now()}`, stt: '2.1', content: 'Phân đoạn mới', sub1: null, sub2: null, payment: null, note: '', km: '' });
    updateProject(selectedProjectId, { drawingData: data });
    reRender();
  });

  document.querySelectorAll('.btn-del-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      const { projects, selectedProjectId } = getState();
      const project = projects.find(p => p.id === selectedProjectId);
      const data = (project && project.drawingData) ? project.drawingData : defaultTableData;
      data.splice(idx, 1);
      updateProject(selectedProjectId, { drawingData: data });
      reRender();
    });
  });

  // Google Sheets Sync
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
            return parts[0] + '/' + parts[1] + '/' + parts[2];
          }
          return str.toString();
        };

        const newTableData = [];
        for (let i = 3; i < values.length; i++) {
          const rowValues = values[i];
          const rowColors = colors[i];
          
          if (!rowValues[1]) continue;
          
          const isHeader = (rowColors[0] || '').toLowerCase() === '#d9d2e9' || (rowColors[1] || '').toLowerCase() === '#d9d2e9';
          
          if (isHeader) {
            newTableData.push({
              id: `h_${i}`,
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
              id: `r_${i}`,
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
        
        const { selectedProjectId } = getState();
        updateProject(selectedProjectId, { drawingData: newTableData });
        reRender();
        alert('✅ Đồng bộ dữ liệu thành công!');
      } else {
        alert('⚠️ Dữ liệu không hợp lệ.');
      }
    } catch (e) {
      console.error(e);
      alert('⚠️ Không thể kết nối tới Google Sheets. Lỗi: ' + e.message);
    }
    
    if(btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });
}

export function destroy() {
}
