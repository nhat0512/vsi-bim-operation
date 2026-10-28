import { openModal, closeModal } from './Modal.js';
import { updateProject, getState } from '../state.js';
import { formatDisplayName } from '../utils/formatters.js';

function parseMarkdown(text) {
  if (!text) return '<span class="text-muted italic">Chưa có mô tả chi tiết</span>';
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

export function showItemDetailModal(item, itemIdx, type, project, onSaveCb, startInEditMode = false) {
  let isEditing = !!startInEditMode;
  let currentItem = { ...item };
  const state = getState();

  // Danh sách nhân sự đầy đủ kết hợp từ state personnel + project.team
  const allPersonnelMap = new Map();
  (state.personnel || []).forEach(p => {
    if (p.name) allPersonnelMap.set(p.name, p);
  });
  (project?.team || []).forEach(t => {
    if (t.name && !allPersonnelMap.has(t.name)) {
      allPersonnelMap.set(t.name, { name: t.name, role: t.role || 'Thành viên' });
    }
  });
  if (currentItem.assignee && !allPersonnelMap.has(currentItem.assignee)) {
    allPersonnelMap.set(currentItem.assignee, { name: currentItem.assignee, role: 'Đã gán' });
  }
  const personnelList = Array.from(allPersonnelMap.values());

  function renderContent() {
    const isRfi = type === 'rfi';
    const itemName = isRfi ? (currentItem.title || '') : (currentItem.name || '');
    const itemCode = isRfi ? (currentItem.code || '') : '';
    const segName = currentItem.segmentIdx !== undefined && currentItem.segmentIdx !== null && project?.segments?.[currentItem.segmentIdx]
      ? project.segments[currentItem.segmentIdx].name
      : '';
    const subSegName = segName && currentItem.subSegmentIdx !== undefined && currentItem.subSegmentIdx !== null && project.segments[currentItem.segmentIdx]?.subSegments?.[currentItem.subSegmentIdx]
      ? project.segments[currentItem.segmentIdx].subSegments[currentItem.subSegmentIdx].name
      : '';
    const mlName = currentItem.milestoneIdx !== undefined && currentItem.milestoneIdx !== null && (project?.milestones || [])[currentItem.milestoneIdx]
      ? project.milestones[currentItem.milestoneIdx].name
      : '';

    if (isEditing) {
      if (isRfi) {
        return `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="background: rgba(59, 130, 246, 0.08); border-left: 4px solid var(--accent-primary); padding: 8px 12px; border-radius: 4px; font-size: 0.85rem;">
              ✏️ <strong>Chỉnh sửa thông tin RFI</strong> — Cập nhật mã, tiêu đề, phân đoạn và trạng thái xử lý.
            </div>

            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px;">
              <div>
                <label class="form-label font-bold">Mã RFI <span class="text-danger">*</span></label>
                <input type="text" id="modal-rfi-code" class="form-input w-full" value="${itemCode}" placeholder="RFI-001">
              </div>
              <div>
                <label class="form-label font-bold">Tiêu đề RFI <span class="text-danger">*</span></label>
                <input type="text" id="modal-rfi-title" class="form-input w-full" value="${itemName}" placeholder="Nhập tiêu đề RFI...">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label class="form-label font-bold">Độ ưu tiên</label>
                <select id="modal-rfi-priority" class="form-select w-full">
                  <option value="High" ${currentItem.priority === 'High' ? 'selected' : ''}>🔴 Khẩn cấp (High)</option>
                  <option value="Medium" ${currentItem.priority === 'Medium' || !currentItem.priority ? 'selected' : ''}>🟡 Bình thường (Medium)</option>
                  <option value="Low" ${currentItem.priority === 'Low' ? 'selected' : ''}>🟢 Thấp (Low)</option>
                </select>
              </div>
              <div>
                <label class="form-label font-bold">Trạng thái</label>
                <select id="modal-rfi-status" class="form-select w-full">
                  <option value="Open" ${currentItem.status === 'Open' || !currentItem.status ? 'selected' : ''}>⏳ Đang chờ (Open)</option>
                  <option value="In Review" ${currentItem.status === 'In Review' ? 'selected' : ''}>🔍 Đang xử lý (In Review)</option>
                  <option value="Closed" ${currentItem.status === 'Closed' ? 'selected' : ''}>✅ Đã phản hồi / Đóng (Closed)</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label class="form-label font-bold">Người phụ trách xử lý</label>
                <select id="modal-rfi-assignee" class="form-select w-full">
                  <option value="">-- Chưa chỉ định --</option>
                  ${personnelList.map(p => `
                    <option value="${p.name}" ${currentItem.assignee === p.name ? 'selected' : ''}>👤 ${formatDisplayName(p.name)} (${p.role || 'Member'})</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="form-label font-bold">Hạn phản hồi</label>
                <input type="date" id="modal-rfi-due" class="form-input w-full" value="${(currentItem.dueDate || '').split('T')[0]}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label class="form-label font-bold">🏷️ Phân đoạn dự án</label>
                <select id="modal-rfi-segment" class="form-select w-full">
                  <option value="-1">-- Không phân đoạn --</option>
                  ${(project?.segments || []).map((s, sIdx) => {
                    let html = `<option value="${sIdx}" ${currentItem.segmentIdx === sIdx && currentItem.subSegmentIdx == null ? 'selected' : ''}>▶ ${s.name}</option>`;
                    if (s.subSegments && s.subSegments.length > 0) {
                      s.subSegments.forEach((sub, subIdx) => {
                        html += `<option value="${sIdx}_${subIdx}" ${currentItem.segmentIdx === sIdx && currentItem.subSegmentIdx === subIdx ? 'selected' : ''}>&nbsp;&nbsp;&nbsp;&nbsp;↳ ${sub.name}</option>`;
                      });
                    }
                    return html;
                  }).join('')}
                </select>
              </div>
              <div>
                <label class="form-label font-bold">🎯 Cột mốc liên quan</label>
                <select id="modal-rfi-milestone" class="form-select w-full">
                  <option value="-1">-- Không cột mốc --</option>
                  ${(project?.milestones || []).map((m, mIdx) => `
                    <option value="${mIdx}" ${currentItem.milestoneIdx === mIdx ? 'selected' : ''}>🎯 ${m.name} (${(m.date || '').split('T')[0]})</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="form-label font-bold">📝 Nội dung chi tiết RFI (Markdown)</label>
              <textarea id="modal-item-desc" class="form-input w-full" style="min-height: 100px; font-size: 0.85rem;" placeholder="Mô tả câu hỏi, vướng mắc kỹ thuật...">${currentItem.description || ''}</textarea>
            </div>

            <div>
              <label class="form-label font-bold">🔗 Tài liệu đính kèm (Cloud ACC, Drive...)</label>
              <textarea id="modal-item-links" class="form-input w-full" style="min-height: 70px; font-size: 0.85rem;" placeholder="https://acc.autodesk.com/...">${currentItem.cloudLinks || ''}</textarea>
            </div>

            <div class="flex justify-between items-center" style="margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
              <button class="btn btn-outline btn-sm text-danger" id="modal-btn-delete" style="border-color: rgba(239, 68, 68, 0.4);">🗑️ Xóa RFI này</button>
              <div class="flex gap-sm">
                <button class="btn btn-outline" id="modal-btn-cancel">Hủy</button>
                <button class="btn btn-primary" id="modal-btn-save">💾 Lưu thay đổi</button>
              </div>
            </div>
          </div>
        `;
      }

      // CHẾ ĐỘ SỬA CÔNG VIỆC (TASK EDIT MODE)
      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(59, 130, 246, 0.08); border-left: 4px solid var(--accent-primary); padding: 8px 12px; border-radius: 4px; font-size: 0.85rem;">
            ✏️ <strong>Chỉnh sửa thông tin công việc</strong> — Cập nhật tên task, phân đoạn, nhân sự triển khai, hạn chót và tiến độ.
          </div>

          <div>
            <label class="form-label font-bold" for="modal-item-name">📌 Tên công việc <span class="text-danger">*</span></label>
            <input type="text" id="modal-item-name" class="form-input w-full" value="${itemName}" placeholder="Nhập tên công việc...">
          </div>

          <!-- Phân đoạn & Cột mốc -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="form-label font-bold" for="modal-item-segment">🏷️ Phân đoạn dự án (Segment)</label>
              <select id="modal-item-segment" class="form-select w-full" style="font-size: 0.85rem;">
                <option value="-1">-- Chưa gán phân đoạn --</option>
                ${(project?.segments || []).map((s, sIdx) => {
                  let html = `<option value="${sIdx}" ${currentItem.segmentIdx === sIdx && (currentItem.subSegmentIdx === null || currentItem.subSegmentIdx === undefined) ? 'selected' : ''}>▶ ${s.name}</option>`;
                  if (s.subSegments && s.subSegments.length > 0) {
                    s.subSegments.forEach((sub, subIdx) => {
                      html += `<option value="${sIdx}_${subIdx}" ${currentItem.segmentIdx === sIdx && currentItem.subSegmentIdx === subIdx ? 'selected' : ''}>&nbsp;&nbsp;&nbsp;&nbsp;↳ ${sub.name}</option>`;
                    });
                  }
                  return html;
                }).join('')}
              </select>
            </div>

            <div>
              <label class="form-label font-bold" for="modal-item-milestone">🎯 Cột mốc hợp đồng / Bàn giao</label>
              <select id="modal-item-milestone" class="form-select w-full" style="font-size: 0.85rem;">
                <option value="-1">-- Chưa gán cột mốc --</option>
                ${(project?.milestones || []).map((m, mIdx) => `
                  <option value="${mIdx}" ${currentItem.milestoneIdx === mIdx ? 'selected' : ''}>🎯 ${m.name} (${(m.date || '').split('T')[0]})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Nhân sự & Hạn chót -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label class="form-label font-bold" for="modal-item-assignee">👤 Nhân sự triển khai</label>
              <select id="modal-item-assignee" class="form-select w-full" style="font-size: 0.85rem;">
                <option value="">-- Chưa chỉ định nhân sự --</option>
                ${personnelList.map(p => `
                  <option value="${p.name}" ${currentItem.assignee === p.name ? 'selected' : ''}>👤 ${formatDisplayName(p.name)} (${p.role || 'Thành viên'})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="form-label font-bold" for="modal-item-due">⏳ Hạn chót hoàn thành</label>
              <input type="date" id="modal-item-due" class="form-input w-full" value="${(currentItem.dueDate || '').split('T')[0]}" style="font-size: 0.85rem;">
            </div>
          </div>

          <!-- Tiến độ, Giai đoạn, LOD -->
          <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; align-items: end;">
            <div>
              <div class="flex justify-between items-center mb-xs">
                <label class="form-label font-bold" style="margin-bottom: 0;">📊 Tiến độ thực hiện</label>
                <span id="modal-prog-label" style="font-size: 0.85rem; font-weight: 700; color: var(--accent-primary);">${currentItem.progress || 0}%</span>
              </div>
              <div class="flex items-center gap-xs">
                <input type="range" id="modal-item-progress-range" min="0" max="100" step="5" value="${currentItem.progress || 0}" style="flex: 1; cursor: pointer;">
                <input type="number" id="modal-item-progress" class="form-input" min="0" max="100" value="${currentItem.progress || 0}" style="width: 65px; font-weight: bold; text-align: center; font-size: 0.85rem;">
                <span style="font-size: 0.8rem; font-weight: 600;">%</span>
              </div>
            </div>

            <div>
              <label class="form-label font-bold" for="modal-item-phase">🏗️ Giai đoạn</label>
              <select id="modal-item-phase" class="form-select w-full" style="font-size: 0.85rem;">
                ${['BVTC', 'TKKT', 'TK Sơ bộ', 'Khảo sát', 'Thi công', 'Hoàn công'].map(ph => `
                  <option value="${ph}" ${(currentItem.phase || 'BVTC') === ph ? 'selected' : ''}>${ph}</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="form-label font-bold" for="modal-item-lod">📐 Mức LOD</label>
              <select id="modal-item-lod" class="form-select w-full" style="font-size: 0.85rem;">
                ${['LOD 100', 'LOD 200', 'LOD 300', 'LOD 350', 'LOD 400', 'LOD 500'].map(ld => `
                  <option value="${ld}" ${(currentItem.lod || 'LOD 300') === ld ? 'selected' : ''}>${ld}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="form-label font-bold">📝 Mô tả chi tiết (Hỗ trợ Markdown)</label>
            <div class="text-sm text-muted mb-xs">Có thể dùng cú pháp ![Tên ảnh](Link_ảnh) để chèn ảnh. Dùng **chữ đậm** hoặc *chữ nghiêng*.</div>
            <textarea id="modal-item-desc" class="form-input w-full" style="min-height: 100px; font-family: monospace; font-size: 0.85rem;">${currentItem.description || ''}</textarea>
          </div>

          <div>
            <label class="form-label font-bold">🔗 Tài nguyên Cloud (ACC, Dropbox, Sharepoint...)</label>
            <div class="text-sm text-muted mb-xs">Mỗi đường link dán trên 1 dòng. Hệ thống sẽ tự động nhận diện nền tảng.</div>
            <textarea id="modal-item-links" class="form-input w-full" style="min-height: 70px; font-size: 0.85rem;" placeholder="https://acc.autodesk.com/...\nhttps://dropbox.com/...">${currentItem.cloudLinks || ''}</textarea>
          </div>

          <div class="flex justify-between items-center" style="margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <button class="btn btn-outline btn-sm text-danger" id="modal-btn-delete" style="border-color: rgba(239, 68, 68, 0.4);">🗑️ Xóa công việc này</button>
            <div class="flex gap-sm">
              <button class="btn btn-outline" id="modal-btn-cancel">Hủy</button>
              <button class="btn btn-primary" id="modal-btn-save">💾 Lưu thay đổi</button>
            </div>
          </div>
        </div>
      `;
    }

    // CHẾ ĐỘ XEM (VIEW MODE)
    const progVal = currentItem.progress || 0;
    const progColor = progVal >= 100 ? '#10b981' : progVal >= 50 ? '#3b82f6' : progVal > 0 ? '#f59e0b' : '#94a3b8';

    return `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div class="flex justify-between items-start" style="gap: 16px;">
          <div style="flex: 1;">
            <div class="text-sm text-muted">${isRfi ? 'Mã RFI: ' + itemCode : 'Loại: Công việc (Task)'}</div>
            <h2 style="font-size: 1.3rem; font-weight: bold; margin: 6px 0; color: var(--text-primary); line-height: 1.4;">${itemName}</h2>
            
            <div class="flex flex-wrap gap-xs" style="margin-top: 10px;">
              <span class="badge" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 0.8rem; padding: 4px 8px;">
                👤 ${formatDisplayName(currentItem.assignee) || 'Chưa gán'}
              </span>

              <span class="badge" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 0.8rem; padding: 4px 8px;">
                ⏳ Hạn: ${currentItem.dueDate ? new Date(currentItem.dueDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}
              </span>

              ${segName ? `
                <span class="badge" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6; font-size: 0.8rem; padding: 4px 8px;">
                  🏷️ Phân đoạn: ${segName}${subSegName ? ` / ${subSegName}` : ''}
                </span>
              ` : `
                <span class="badge" style="background: var(--bg-tertiary); color: var(--text-muted); font-size: 0.8rem; padding: 4px 8px;">
                  🏷️ Chưa gán phân đoạn
                </span>
              `}

              ${mlName ? `
                <span class="badge" style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: #8b5cf6; font-size: 0.8rem; padding: 4px 8px;">
                  🎯 Cột mốc: ${mlName}
                </span>
              ` : ''}

              <span class="badge" style="background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.8rem; padding: 4px 8px;">
                🏗️ ${currentItem.phase || 'BVTC'} · ${currentItem.lod || 'LOD 300'}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-xs">
            <button class="btn btn-primary btn-sm" id="modal-btn-edit" style="display: flex; align-items: center; gap: 4px;">
              ✏️ <span>Chỉnh sửa</span>
            </button>
            <button class="btn btn-ghost btn-sm text-danger" id="modal-btn-delete-view" title="Xóa ${isRfi ? 'RFI' : 'công việc này'}" style="padding: 4px 8px;">🗑️</button>
          </div>
        </div>

        <!-- Thanh tiến độ -->
        ${!isRfi ? `
          <div style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px;">
            <div class="flex justify-between items-center mb-xs">
              <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);">Tiến độ thực hiện:</span>
              <span style="font-size: 0.9rem; font-weight: 700; color: ${progColor};">${progVal}% ${progVal >= 100 ? '✅ Đã hoàn thành' : ''}</span>
            </div>
            <div class="progress-bar" style="height: 8px; background: rgba(0,0,0,0.06); border-radius: 4px;">
              <div class="progress-bar-fill" style="width: ${progVal}%; background-color: ${progColor}; border-radius: 4px;"></div>
            </div>
          </div>
        ` : ''}
        
        <div>
          <h4 style="font-size: 1rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">📝 Mô tả chi tiết</h4>
          ${parseMarkdown(currentItem.description)}
        </div>

        <div>
          <h4 style="font-size: 1rem; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 4px;">☁️ Tài liệu đính kèm (Cloud)</h4>
          ${parseCloudLinks(currentItem.cloudLinks)}
        </div>

        <div style="margin-top: 8px; padding-top: 16px; border-top: 1px dashed var(--border-subtle);">
          <div style="font-weight: bold; margin-bottom: 12px; font-size: 1.1rem;">💬 Thảo luận & Hoạt động</div>
          
          <div class="flex flex-col gap-sm" id="modal-comments-list" style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
            ${(currentItem.comments && currentItem.comments.length > 0) ? currentItem.comments.map(c => `
              <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">${(c.user || 'U').substring(0,2).toUpperCase()}</div>
                <div style="background: var(--bg-tertiary); padding: 10px; border-radius: 0 8px 8px 8px; border: 1px solid var(--border-subtle); width: 100%;">
                  <div class="flex justify-between" style="margin-bottom: 4px;">
                    <span style="font-size: 0.8rem; font-weight: 600;">${c.user}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(c.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style="font-size: 0.85rem;">${c.text}</div>
                </div>
              </div>
            `).join('') : '<div class="text-sm text-muted italic">Chưa có hoạt động nào. Hãy bắt đầu trao đổi!</div>'}
          </div>

          <!-- Input area -->
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: #94a3b8; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">👤</div>
            <div style="width: 100%; position: relative;">
              <input type="text" id="modal-comment-input" class="form-input w-full" placeholder="Nhập bình luận hoặc ghi chú..." style="padding-right: 40px; font-size: 0.85rem;">
              <button class="btn-icon" id="modal-btn-send-comment" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%);">✈️</button>
            </div>
          </div>
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

    // Đồng bộ Range & Number input cho tiến độ
    const progRange = document.getElementById('modal-item-progress-range');
    const progNum = document.getElementById('modal-item-progress');
    const progLabel = document.getElementById('modal-prog-label');
    if (progRange && progNum) {
      progRange.addEventListener('input', (e) => {
        progNum.value = e.target.value;
        if (progLabel) progLabel.textContent = `${e.target.value}%`;
      });
      progNum.addEventListener('input', (e) => {
        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
        progRange.value = val;
        if (progLabel) progLabel.textContent = `${val}%`;
      });
    }

    const btnSave = document.getElementById('modal-btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        if (type === 'rfi') {
          const codeVal = document.getElementById('modal-rfi-code')?.value?.trim() || currentItem.code || 'RFI';
          const titleVal = document.getElementById('modal-rfi-title')?.value?.trim() || currentItem.title || 'RFI';
          const prioVal = document.getElementById('modal-rfi-priority')?.value || 'Medium';
          const statusVal = document.getElementById('modal-rfi-status')?.value || 'Open';
          const assigneeVal = document.getElementById('modal-rfi-assignee')?.value || '';
          const dueVal = document.getElementById('modal-rfi-due')?.value || '';
          const descVal = document.getElementById('modal-item-desc')?.value || '';
          const linksVal = document.getElementById('modal-item-links')?.value || '';

          const segSelect = document.getElementById('modal-rfi-segment');
          let sIdx = null, subIdx = null;
          if (segSelect && segSelect.value !== "-1") {
            const parts = segSelect.value.split('_');
            sIdx = parseInt(parts[0], 10);
            if (parts.length > 1) subIdx = parseInt(parts[1], 10);
          }

          const mlSelect = document.getElementById('modal-rfi-milestone');
          let mlVal = null;
          if (mlSelect && mlSelect.value !== "-1") {
            mlVal = parseInt(mlSelect.value, 10);
          }

          currentItem = {
            ...currentItem,
            code: codeVal,
            title: titleVal,
            priority: prioVal,
            status: statusVal,
            assignee: assigneeVal,
            dueDate: dueVal,
            segmentIdx: sIdx,
            subSegmentIdx: subIdx,
            milestoneIdx: mlVal,
            description: descVal,
            cloudLinks: linksVal
          };

          if (!project.rfis) project.rfis = [];
          let targetIndex = -1;
          if (currentItem.id) {
            targetIndex = project.rfis.findIndex(r => r.id === currentItem.id);
          }
          if (targetIndex < 0 && itemIdx !== undefined && itemIdx !== null && itemIdx >= 0 && itemIdx < project.rfis.length) {
            targetIndex = itemIdx;
          }

          if (targetIndex >= 0) {
            project.rfis[targetIndex] = { ...project.rfis[targetIndex], ...currentItem };
          } else {
            if (!currentItem.id) currentItem.id = `rfi_${Date.now()}`;
            project.rfis.push(currentItem);
          }

          updateProject(project.id, { rfis: [...project.rfis] });
        } else {
          // LƯU CÔNG VIỆC (TASK)
          const nameVal = document.getElementById('modal-item-name')?.value?.trim();
          const assigneeVal = document.getElementById('modal-item-assignee')?.value || '';
          const dueVal = document.getElementById('modal-item-due')?.value || '';
          const progVal = parseInt(document.getElementById('modal-item-progress')?.value, 10) || 0;
          const phaseVal = document.getElementById('modal-item-phase')?.value || 'BVTC';
          const lodVal = document.getElementById('modal-item-lod')?.value || 'LOD 300';
          const descVal = document.getElementById('modal-item-desc')?.value || '';
          const linksVal = document.getElementById('modal-item-links')?.value || '';

          const segSelect = document.getElementById('modal-item-segment');
          let sIdx = null, subIdx = null;
          if (segSelect && segSelect.value !== "-1") {
            const parts = segSelect.value.split('_');
            sIdx = parseInt(parts[0], 10);
            if (parts.length > 1) subIdx = parseInt(parts[1], 10);
          }

          const mlSelect = document.getElementById('modal-item-milestone');
          let mlVal = null;
          if (mlSelect && mlSelect.value !== "-1") {
            mlVal = parseInt(mlSelect.value, 10);
          }

          const cleanProg = Math.min(100, Math.max(0, progVal));

          currentItem = {
            ...currentItem,
            name: nameVal || currentItem.name || 'Công việc mới',
            assignee: assigneeVal,
            dueDate: dueVal,
            progress: cleanProg,
            status: cleanProg >= 100 ? 'completed' : 'active',
            phase: phaseVal,
            lod: lodVal,
            segmentIdx: sIdx,
            subSegmentIdx: subIdx,
            milestoneIdx: mlVal,
            description: descVal,
            cloudLinks: linksVal
          };

          if (!project.tasks) project.tasks = [];

          // Tìm task an toàn bảo toàn dữ liệu (Safe lookup)
          let targetIndex = -1;
          if (currentItem.id) {
            targetIndex = project.tasks.findIndex(t => t.id === currentItem.id);
          }
          if (targetIndex < 0 && itemIdx !== undefined && itemIdx !== null && itemIdx >= 0 && itemIdx < project.tasks.length) {
            targetIndex = itemIdx;
          }

          if (targetIndex >= 0) {
            // Merge để bảo toàn 100% dữ liệu khác (chainage, dailyHours_*, comments...)
            project.tasks[targetIndex] = {
              ...project.tasks[targetIndex],
              ...currentItem
            };
          } else {
            if (!currentItem.id) currentItem.id = `t_${Date.now()}`;
            project.tasks.push(currentItem);
          }

          updateProject(project.id, { tasks: [...project.tasks] });
        }

        isEditing = false;
        item = { ...currentItem };
        updateModal();
        if (onSaveCb) onSaveCb();
      });
    }

    const handleDelete = () => {
      const itemTitle = type === 'rfi' ? (currentItem.title || 'RFI này') : (currentItem.name || 'công việc này');
      if (confirm(`Bạn có chắc chắn muốn xóa "${itemTitle}" khỏi dự án?`)) {
        if (type === 'rfi') {
          project.rfis = (project.rfis || []).filter(r => (currentItem.id ? r.id !== currentItem.id : r !== item));
          updateProject(project.id, { rfis: [...project.rfis] });
        } else {
          project.tasks = (project.tasks || []).filter(t => (currentItem.id ? t.id !== currentItem.id : t !== item));
          updateProject(project.id, { tasks: [...project.tasks] });
        }
        closeModal();
        if (onSaveCb) onSaveCb();
      }
    };

    document.getElementById('modal-btn-delete')?.addEventListener('click', handleDelete);
    document.getElementById('modal-btn-delete-view')?.addEventListener('click', handleDelete);

    const btnSend = document.getElementById('modal-btn-send-comment');
    const inputComment = document.getElementById('modal-comment-input');
    if (btnSend && inputComment) {
      btnSend.addEventListener('click', () => {
        const text = inputComment.value.trim();
        if (!text) return;

        const userName = state.currentUserAuth?.name || state.currentUser?.name || 'User';

        if (!currentItem.comments) currentItem.comments = [];
        currentItem.comments.push({
          id: Date.now().toString(),
          user: userName,
          text: text,
          timestamp: new Date().toISOString()
        });

        if (type === 'rfi') {
           const rIndex = currentItem.id ? project.rfis.findIndex(r => r.id === currentItem.id) : itemIdx;
           if (rIndex >= 0) project.rfis[rIndex] = currentItem;
           updateProject(project.id, { rfis: project.rfis });
        } else {
           const tIndex = currentItem.id ? project.tasks.findIndex(t => t.id === currentItem.id) : itemIdx;
           if (tIndex >= 0) project.tasks[tIndex] = currentItem;
           updateProject(project.id, { tasks: project.tasks });
        }
        
        item = { ...currentItem };
        updateModal();
      });

      inputComment.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          btnSend.click();
        }
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
