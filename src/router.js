// ============================================
// ROUTER — Hash-based SPA routing for BIM PM
// ============================================

const routes = {
  'dashboard': () => import('./pages/Dashboard.js'),
  'projects': () => import('./pages/ProjectList.js'),
  'project-detail': () => import('./pages/ProjectDetail.js'),
  'planning': () => import('./pages/Planning.js'),
  'resources': () => import('./pages/Resources.js'),
  'quality': () => import('./pages/Quality.js'),
  'my-tasks': () => import('./pages/MyTasks.js'),

  'analytics': () => import('./pages/Analytics.js'),
  'settings': () => import('./pages/Settings.js')
};

let currentPageModule = null;

/**
 * Initialize the router
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

/**
 * Handle a route change
 */
async function handleRoute() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const [page, ...params] = hash.split('/');
  
  const { setState, getState } = await import('./state.js');

  // Phân quyền: Member chỉ được xem một số trang nhất định
  const { currentUser } = getState();
  const role = currentUser?.role || 'Member';
  const adminOnlyPages = ['dashboard', 'projects', 'project-detail', 'planning', 'resources', 'quality', 'analytics', 'settings'];
  
  let targetPage = page;
  if (role !== 'BIM Manager' && role !== 'Project Manager' && adminOnlyPages.includes(page)) {
    targetPage = 'my-tasks';
    window.location.hash = 'my-tasks';
    return; // hashchange sẽ gọi lại handleRoute
  }

  setState('currentPage', targetPage);

  // Store project ID if navigating to project detail
  if (targetPage === 'project-detail' && params[0]) {
    setState('selectedProjectId', params[0]);
  }

  // Destroy current page if it has a cleanup method
  if (currentPageModule && currentPageModule.destroy) {
    currentPageModule.destroy();
  }

  const loader = routes[targetPage];
  if (!loader) return;

  const container = document.getElementById('page-content');
  if (!container) return;

  try {
    const module = await loader();
    currentPageModule = module;
    container.innerHTML = module.render();
    if (module.init) module.init();
  } catch (e) {
    console.error('Route error:', e);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__text">Không thể tải trang</div>
        <div class="empty-state__subtext">${e.message || 'Đã xảy ra lỗi không mong muốn.'}</div>
      </div>
    `;
  }
}

/**
 * Navigate to a specific page
 */
export function navigateTo(page) {
  window.location.hash = page;
}

/**
 * Get the current page from the URL hash
 */
export function getCurrentPage() {
  return window.location.hash.slice(1).split('/')[0] || 'dashboard';
}
