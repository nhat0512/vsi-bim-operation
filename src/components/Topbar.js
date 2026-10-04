// ============================================
// TOPBAR — Header with search, notifications, datetime
// ============================================
import { getCurrentPage } from '../router.js';
import { getState, setState, subscribe, logoutUser } from '../state.js';

const PAGE_TITLES = {
  'dashboard': { title: 'Dashboard', breadcrumb: 'Tổng quan dự án' },
  'project-detail': { title: 'Chi tiết dự án', breadcrumb: 'Quản lý dự án' },
  'planning': { title: 'General Planning', breadcrumb: 'Lịch biểu & Tiến độ' },
  'resources': { title: 'Quản lý nguồn lực', breadcrumb: 'Nhân sự & Thiết bị' },
  'quality': { title: 'Chất lượng BIM', breadcrumb: 'QA/QC & Clash Detection' },
  'my-tasks': { title: 'Công việc của tôi', breadcrumb: 'Tiến độ cá nhân' },
  'analytics': { title: 'Phân tích & Báo cáo', breadcrumb: 'Analytics' },
  'settings': { title: 'Cài đặt hệ thống', breadcrumb: 'Cấu hình' }
};

export function renderTopbar() {
  return `
    <div class="topbar-page-info">
      <span class="topbar-page-title" id="topbar-title">Dashboard</span>
      <span class="topbar-breadcrumb" id="topbar-breadcrumb">Tổng quan dự án</span>
    </div>
    <div class="topbar-spacer"></div>
    <button class="topbar-btn" id="btn-toggle-theme" data-tooltip="Sáng/Tối" style="margin-right: var(--space-md);">
      ${getState().theme === 'dark' ? '🌞' : '🌙'}
    </button>
    <div class="topbar-search" id="topbar-search">
      <span>🔍</span>
      <input type="text" placeholder="Tìm kiếm dự án, nhân sự..." id="search-input" />
    </div>
    <div class="topbar-actions" style="display: flex; align-items: center; gap: 8px;">
      <!-- User Profile & Logout -->
      <div class="topbar-role-selector" style="display: flex; align-items: center; gap: 8px; background: var(--bg-secondary); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; border: 1px solid var(--border-color);">
        <div style="width: 24px; height: 24px; background: var(--accent-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
          ${getState().currentUser?.name?.charAt(0) || 'U'}
        </div>
        <div style="display: flex; flex-direction: column; line-height: 1.2;">
          <span style="font-weight: bold; color: var(--text-primary);">${getState().currentUser?.name || 'User'}</span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${getState().currentUser?.role || 'Guest'}</span>
        </div>
        <button id="btn-logout" class="btn btn-ghost btn-sm" style="margin-left: 4px; padding: 2px 6px; color: var(--text-danger);" title="Đăng xuất">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>

      <div style="position: relative;">
        <button class="topbar-btn" id="btn-notifications" data-tooltip="Thông báo">
          🔔
          <span class="notif-dot" id="notif-badge" style="display: ${getState().notifications?.length ? 'block' : 'none'};">
            ${getState().notifications?.length || ''}
          </span>
        </button>
        <!-- Notification Dropdown Panel -->
        <div id="notif-panel" style="display: none; position: absolute; top: 100%; right: 0; width: 320px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; margin-top: 8px; padding: 12px; max-height: 400px; overflow-y: auto;">
          <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Thông báo</div>
          <div id="notif-list">
            ${getState().notifications?.length ? getState().notifications.map(n => `
              <div style="padding: 8px; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
                <div style="font-weight: bold; color: ${n.type === 'error' ? 'var(--text-danger)' : n.type === 'warning' ? 'var(--text-warning)' : 'var(--text-info)'}">${n.title}</div>
                <div style="color: var(--text-secondary); margin-top: 4px;">${n.message}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Vừa xong</div>
              </div>
            `).join('') : '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 16px 0;">Không có thông báo mới</div>'}
          </div>
        </div>
      </div>

      <button class="topbar-btn" id="btn-fullscreen" data-tooltip="Toàn màn hình">⛶</button>
      <span class="topbar-datetime" id="topbar-datetime"></span>
    </div>
  `;
}

export function initTopbar() {
  // Update title on route change
  const updateTitle = () => {
    const page = getCurrentPage();
    const info = PAGE_TITLES[page] || PAGE_TITLES['dashboard'];
    const titleEl = document.getElementById('topbar-title');
    const breadEl = document.getElementById('topbar-breadcrumb');
    if (titleEl) titleEl.textContent = info.title;
    if (breadEl) breadEl.textContent = `/ ${info.breadcrumb}`;
  };

  window.addEventListener('hashchange', updateTitle);
  updateTitle();

  // Fullscreen toggle
  const fsBtn = document.getElementById('btn-fullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }

  // Notifications Toggle
  const btnNotif = document.getElementById('btn-notifications');
  const notifPanel = document.getElementById('notif-panel');
  if (btnNotif && notifPanel) {
    btnNotif.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.style.display = notifPanel.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target !== btnNotif) {
        notifPanel.style.display = 'none';
      }
    });
  }

  // Subscribe to state changes for Notifications
  subscribe((key, value) => {
    if (key === 'notifications') {
      const badge = document.getElementById('notif-badge');
      const list = document.getElementById('notif-list');
      if (badge && list) {
        badge.style.display = value.length > 0 ? 'block' : 'none';
        badge.textContent = value.length || '';
        
        list.innerHTML = value.length ? value.map(n => `
          <div style="padding: 8px; border-bottom: 1px solid var(--border-color); font-size: 0.8rem;">
            <div style="font-weight: bold; color: ${n.type === 'error' ? 'var(--text-danger)' : n.type === 'warning' ? 'var(--text-warning)' : 'var(--text-info)'}">${n.title}</div>
            <div style="color: var(--text-secondary); margin-top: 4px;">${n.message}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Vừa xong</div>
          </div>
        `).join('') : '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 16px 0;">Không có thông báo mới</div>';
      }
    }
  });

  // Theme Toggle
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = getState().theme;
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setState('theme', newTheme);
      
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '🌞';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeBtn.textContent = '🌙';
      }
      // Dispatch custom event so widgets can re-render (like Chart.js)
      window.dispatchEvent(new Event('themeChanged'));
    });
  }

  // Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn đăng xuất?')) {
        logoutUser();
        window.location.hash = '';
        window.location.reload();
      }
    });
  }

  // removed manual sync button logic
}
