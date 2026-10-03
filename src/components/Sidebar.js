// ============================================
// SIDEBAR — BIM PM Navigation
// ============================================
import { getCurrentPage } from '../router.js';
import { getState, subscribe } from '../state.js';

const NAV_SECTIONS = [
  {
    label: 'Tổng quan',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', adminOnly: true },
      { id: 'my-tasks', label: 'Việc của tôi', icon: '🙋' }
    ]
  },
  {
    label: 'Quản lý dự án',
    items: [
      { id: 'projects', label: 'Danh sách dự án', icon: '📁' },
      { id: 'planning', label: 'General Planning', icon: '📅', adminOnly: true },
      { id: 'drawing-progress', label: 'Tiến độ bản vẽ', icon: '📐' },
      { id: 'resources', label: 'Nguồn lực', icon: '👥', adminOnly: true },
      { id: 'quality', label: 'Chất lượng BIM', icon: '✅', adminOnly: true },
      { id: 'analytics', label: 'Phân tích', icon: '📈', adminOnly: true }
    ]
  },
  {
    label: 'Hệ thống',
    items: [
      { id: 'settings', label: 'Cài đặt', icon: '⚙️', adminOnly: true }
    ]
  }
];

export function renderSidebar() {
  const state = getState();
  const currentPage = getCurrentPage();
  const { selectedProjectId, currentUser } = state;

  const name = currentUser ? currentUser.name : 'Người dùng';
  const role = currentUser ? currentUser.role : 'Guest';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  let navHTML = NAV_SECTIONS.map(section => `
    <div class="sidebar-section-label">${section.label}</div>
    ${section.items.map(item => `
      <a class="sidebar-link ${currentPage === item.id ? 'active' : ''} ${item.adminOnly ? 'admin-only' : ''}" 
         href="#${item.id}" 
         data-page="${item.id}"
         id="nav-${item.id}">
        <span class="sidebar-link-icon">${item.icon}</span>
        <span class="sidebar-link-text">${item.label}</span>
        ${item.badge ? `<span class="sidebar-link-badge">${item.badge}</span>` : ''}
      </a>
    `).join('')}
  `).join('');

  return `
    <div class="sidebar-header">
      <div class="sidebar-logo">🏗️</div>
      <div class="sidebar-brand">
        <div class="sidebar-brand-name">BIM TransPM</div>
        <div class="sidebar-brand-sub">Infrastructure Manager</div>
      </div>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav-container">
      ${navHTML}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-user-btn" style="cursor: pointer;" title="Đăng xuất">
        <div class="sidebar-avatar">${initials}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${name}</div>
          <div class="sidebar-user-role">${role}</div>
        </div>
      </div>
    </div>
  `;
}

export function initSidebar() {
  // Update active state on navigation
  window.addEventListener('hashchange', () => {
    const currentPage = getCurrentPage();
    const { selectedProjectId } = getState();
    document.querySelectorAll('.sidebar-link').forEach(link => {
      const page = link.dataset.page;
      if (page === 'project-detail') {
        const hrefId = link.getAttribute('href').split('id=')[1];
        link.classList.toggle('active', page === currentPage && hrefId === selectedProjectId);
      } else {
        link.classList.toggle('active', page === currentPage);
      }
    });
  });

  // Subscribe to project changes to re-render the nav
  subscribe((key) => {
    if (key === 'projects' || key === 'selectedProjectId' || key === 'currentUser') {
      const container = document.getElementById('sidebar');
      if (container) {
        // Only re-render if it exists, to avoid destroying listeners unnecessarily,
        // but since we want the new project list, we'll re-render the whole sidebar
        // Note: in a real app we'd just update the inner container
        container.innerHTML = renderSidebar();
        
        // Re-bind click event for logout
        document.getElementById('sidebar-user-btn')?.addEventListener('click', async () => {
          if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
            const { logoutUser } = await import('../state.js');
            await logoutUser();
            window.location.hash = ''; // Return to home/login
            window.location.reload();
          }
        });
      }
    }
  });
  
  // Bind click event initially
  document.getElementById('sidebar-user-btn')?.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      const { logoutUser } = await import('../state.js');
      await logoutUser();
      window.location.hash = ''; // Return to home/login
      window.location.reload();
    }
  });
}
