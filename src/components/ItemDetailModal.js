import { openModal, closeModal } from './Modal.js';
import { updateProject } from '../state.js';

function parseMarkdown(text) {
  if (!text) return '<span class="text-muted italic">Chưa có mô tả</span>';
  let html = text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape HTML
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:4px; margin: 8px 0;">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">$1</a>');
  
  return `<div class="markdown-body" style="font-size: 0.9rem; line-height: 1.5; padding: 12px; background: var(--bg-tertiary); border-radius: 6px; border: 1px solid var(--border-subtle);">${html}</div>`;
}

function parseCloudLinks(linksStr) {
  if (!linksStr) return '<span class="text-muted italic text-sm">Chưa đính kèm tài liệu</span>';
  const urls = linksStr.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  if (urls.length === 0) return '<span class="text-muted italic text-sm">Chưa đính kèm tài liệu</span>';
  
  let html = '<div class="cloud-links-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-top: 8px;">';
  urls.forEach(url => {
    let icon = '🔗';
    let brand = 'Link liên kết';
    let color = 'var(--text-primary)';
    
    if (url.includes('autodesk') || url.includes('b360') || url.includes('acc')) {
       icon = '🅰️'; brand = 'Autodesk Cloud'; color = '#0696D7';
    } else if (url.includes('dropbox.com')) {
       icon = '📦'; brand = 'Dropbox'; color = '#0061FF';
    } else if (url.includes('sharepoint.com')) {
       icon = '🗂️'; brand = 'SharePoint'; color = '#03787C';
    } else if (url.includes('drive.google.com')) {
       icon = '🔺'; brand = 'Google Drive'; color = '#1FA463';
    }

    html += `
      <a href="${url}" target="_blank" class="cloud-link-card" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 6px; text-decoration: none; transition: transform 0.2s;" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='var(--bg-tertiary)'">
        <span style="font-size: 1.5rem;">${icon}</span>
        <div style="overflow: hidden;">
          <div style="font-size: 0.75rem; font-weight: bold; color: ${color};">${brand}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${url}</div>
        </div>
      </a>
    `;
  });
  html += '</div>';
  return html;
}

export function showItemDetailModal(item, itemIdx, type, project, onSaveCb) {
  let isEditing = false;
  let currentItem = { ...item };
  
  function renderContent() {
    const isRfi = type === 'rfi';
    const itemName = isRfi ? currentItem.title : currentItem.name;
    const itemCode = isRfi ? currentItem.code : '';

    if (isEditing) {
      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label class="form-label font-bold">Tên ${isRfi ? 'RFI' : 'Công việc'}</label>
            <input type="text" id="modal-item-name" class="form-input w-full" value="${itemName}">
          </div>
          
          <div>
            <label class="form-label font-bold">📝 Mô tả chi tiết (Hỗ trợ Markdown)</label>
            <div class="text-sm text-muted mb-xs">Có thể dùng cú pháp ![Tên ảnh](Link_ảnh) để chèn ảnh. Dùng **chữ đậm** hoặc *chữ nghiêng*.</div>
            <textarea id="modal-item-desc" class="form-input w-full" style="min-height: 120px; font-family: monospace; font-size: 0.85rem;">${currentItem.description || ''}</textarea>
          </div>

          <div>
            <label class="form-label font-bold">🔗 Tài nguyên Cloud (ACC, Dropbox, Sharepoint...)</label>
            <div class="text-sm text-muted mb-xs">Mỗi đường link dán trên 1 dòng. Hệ thống sẽ tự động nhận diện nền tảng.</div>
            <textarea id="modal-item-links" class="form-input w-full" style="min-height: 80px; font-size: 0.85rem;" placeholder="https://acc.autodesk.com/...\nhttps://dropbox.com/...">${currentItem.cloudLinks || ''}</textarea>
          </div>

          <div class="flex justify-end gap-sm" style="margin-top: 16px;">
            <button class="btn btn-outline" id="modal-btn-cancel">Hủy</button>
            <button class="btn btn-primary" id="modal-btn-save">💾 Lưu thay đổi</button>
          </div>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-sm text-muted">${isRfi ? 'Mã RFI: ' + itemCode : 'Loại: Công việc (Task)'}</div>
            <h2 style="font-size: 1.25rem; font-weight: bold; margin: 4px 0;">${itemName}</h2>
            <div class="flex gap-sm" style="margin-top: 8px;">
              <span class="badge" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary);">👤 ${currentItem.assignee || 'Chưa gán'}</span>
              <span class="badge" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary);">⏳ Hạn: ${currentItem.dueDate ? new Date(currentItem.dueDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="modal-btn-edit">✏️ Chỉnh sửa</button>
        </div>
        
        <div>
          <h4 style="font-size: 1rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">📝 Mô tả chi tiết</h4>
          ${parseMarkdown(currentItem.description)}
        </div>

        <div>
          <h4 style="font-size: 1rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">☁️ Tài liệu đính kèm (Cloud)</h4>
          ${parseCloudLinks(currentItem.cloudLinks)}
        </div>
      </div>
    `;
  }
  
  function attachEvents() {
    const btnEdit = document.getElementById('modal-btn-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        isEditing = true;
        updateModal();
      });
    }

    const btnCancel = document.getElementById('modal-btn-cancel');
    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        isEditing = false;
        currentItem = { ...item };
        updateModal();
      });
    }

    const btnSave = document.getElementById('modal-btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const nameVal = document.getElementById('modal-item-name').value;
        const descVal = document.getElementById('modal-item-desc').value;
        const linksVal = document.getElementById('modal-item-links').value;

        if (type === 'rfi') {
          currentItem.title = nameVal;
        } else {
          currentItem.name = nameVal;
        }
        currentItem.description = descVal;
        currentItem.cloudLinks = linksVal;
        
        if (type === 'rfi') {
           project.rfis[itemIdx] = currentItem;
           updateProject(project.id, { rfis: project.rfis });
        } else {
           project.tasks[itemIdx] = currentItem;
           updateProject(project.id, { tasks: project.tasks });
        }

        isEditing = false;
        item = { ...currentItem };
        updateModal();
        if (onSaveCb) onSaveCb();
      });
    }
  }
  
  function updateModal() {
    const container = document.getElementById('item-detail-container');
    if (container) {
      container.innerHTML = renderContent();
      attachEvents();
    }
  }

  const initialHtml = `<div id="item-detail-container"></div>`;
  openModal(`Chi tiết ${type === 'rfi' ? 'RFI' : 'Công việc'}`, initialHtml, { size: 'wide' });
  
  setTimeout(() => {
    updateModal();
  }, 10);
}
