// ============================================
// CONTEXT MENU COMPONENT
// ============================================
import { getState, setState, deleteProject, updateProject } from '../state.js';
import { openProjectForm, showToast } from './ProjectFormModal.js';

let currentTargetId = null;

/**
 * Initialize the Context Menu container and global listeners
 */
export function initContextMenu(onRefresh) {
  // Create container if it doesn't exist
  if (!document.getElementById('context-menu')) {
    const menuHTML = `
      <div id="context-menu" class="context-menu hidden">
        <div class="context-menu-item" id="cm-edit">
          <span class="cm-icon">✏️</span> Sửa dự án
        </div>
        <div class="context-menu-item" id="cm-duplicate">
          <span class="cm-icon">📋</span> Nhân bản
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" id="cm-status-planning">
          <span class="cm-icon">📅</span> Đổi thành Kế hoạch
        </div>
        <div class="context-menu-item" id="cm-status-active">
          <span class="cm-icon">▶️</span> Đổi thành Đang chạy
        </div>
        <div class="context-menu-item" id="cm-status-hold">
          <span class="cm-icon">⏸️</span> Đổi thành Tạm dừng
        </div>
        <div class="context-menu-item" id="cm-status-completed">
          <span class="cm-icon">✅</span> Đổi thành Hoàn thành
        </div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item danger" id="cm-delete">
          <span class="cm-icon">🗑️</span> Xóa dự án
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHTML);
  }

  const menu = document.getElementById('context-menu');

  // Hide menu on outside click
  document.addEventListener('click', (e) => {
    if (e.button !== 2) {
      hideContextMenu();
    }
  });

  // Action listeners
  document.getElementById('cm-edit')?.addEventListener('click', () => {
    if (currentTargetId) {
      openProjectForm('edit', currentTargetId, onRefresh);
    }
  });

  document.getElementById('cm-duplicate')?.addEventListener('click', () => {
    if (currentTargetId) {
      const { projects } = getState();
      const p = projects.find(x => x.id === currentTargetId);
      if (p) {
        // Simple logic for duplicating
        import('../state.js').then(module => {
           module.addProject({
              ...p,
              name: p.name + ' (Copy)',
              code: p.code + '-COPY'
           });
           showToast('Đã nhân bản dự án');
           if (onRefresh) onRefresh();
        });
      }
    }
  });

  document.getElementById('cm-status-planning')?.addEventListener('click', () => {
    if (currentTargetId) {
      updateProject(currentTargetId, { status: 'planning' });
      showToast('Đã đổi trạng thái: Kế hoạch');
      if (onRefresh) onRefresh();
    }
  });

  document.getElementById('cm-status-active')?.addEventListener('click', () => {
    if (currentTargetId) {
      updateProject(currentTargetId, { status: 'active' });
      showToast('Đã đổi trạng thái: Đang chạy');
      if (onRefresh) onRefresh();
    }
  });

  document.getElementById('cm-status-hold')?.addEventListener('click', () => {
    if (currentTargetId) {
      updateProject(currentTargetId, { status: 'on-hold' });
      showToast('Đã đổi trạng thái: Tạm dừng');
      if (onRefresh) onRefresh();
    }
  });

  document.getElementById('cm-status-completed')?.addEventListener('click', () => {
    if (currentTargetId) {
      updateProject(currentTargetId, { status: 'completed' });
      showToast('Đã đổi trạng thái: Hoàn thành');
      if (onRefresh) onRefresh();
    }
  });

  document.getElementById('cm-delete')?.addEventListener('click', () => {
    if (currentTargetId) {
      if (confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
        deleteProject(currentTargetId);
        showToast('Đã xóa dự án thành công');
        if (onRefresh) onRefresh();
      }
    }
  });
}

/**
 * Show the context menu at specific coordinates
 */
export function showContextMenu(x, y, projectId) {
  const menu = document.getElementById('context-menu');
  if (!menu) return;
  
  currentTargetId = projectId;
  
  // Prevent menu from overflowing off screen
  menu.classList.remove('hidden');
  const menuRect = menu.getBoundingClientRect();
  
  let posX = x;
  let posY = y;
  
  if (x + menuRect.width > window.innerWidth) {
    posX = window.innerWidth - menuRect.width - 10;
  }
  if (y + menuRect.height > window.innerHeight) {
    posY = window.innerHeight - menuRect.height - 10;
  }
  
  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;
  menu.classList.add('visible');
}

/**
 * Hide the context menu
 */
export function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  if (menu) {
    menu.classList.remove('visible');
    setTimeout(() => {
      menu.classList.add('hidden');
    }, 200); // match CSS transition duration
  }
  currentTargetId = null;
}
