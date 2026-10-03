// ============================================
// BIM TransPM — Main Application Entry Point
// ============================================

import { loadInitialData } from './state.js';
import { initRouter } from './router.js';
import { renderSidebar, initSidebar } from './components/Sidebar.js';
import { renderTopbar, initTopbar } from './components/Topbar.js';
import { renderModal, initModal } from './components/Modal.js';
import { undoLastAction } from './state.js';
import { initCommandMenu } from './components/CommandMenu.js';
import { initAIAssistant } from './components/AIAssistant.js';
import { subscribe, getState } from './state.js';

/**
 * Initialize the entire application
 */
async function initApp() {
  // === BƯỚC 1: Chờ Firebase Auth kiểm tra phiên đăng nhập ===
  // Phải làm TRƯỚC TIÊN, vì Firestore cần Auth để có quyền đọc dữ liệu.
  const { authReady, getState: getStateFromModule } = await import('./state.js');
  await authReady;

  const state = getStateFromModule();

  // AUTHENTICATION CHECK — nếu chưa đăng nhập, hiện trang Auth và dừng lại
  if (!state.currentUser) {
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('topbar').style.display = 'none';
    document.getElementById('modal-container').style.display = 'none';
    
    // Render Auth Page full screen
    const mainArea = document.getElementById('main-area');
    mainArea.style.marginLeft = '0';
    mainArea.style.width = '100%';
    
    const { render, init } = await import('./pages/Auth.js');
    document.getElementById('page-content').innerHTML = render();
    init();
    return; // STOP execution of the main app
  }

  // === BƯỚC 2: Đã đăng nhập — tải dữ liệu từ Firestore ===
  await loadInitialData();


  // Restore normal layout if logged in
  document.getElementById('sidebar').style.display = '';
  document.getElementById('topbar').style.display = '';
  document.getElementById('modal-container').style.display = '';
  const mainArea = document.getElementById('main-area');
  mainArea.style.marginLeft = '';
  
  // Render shell components
  document.getElementById('sidebar').innerHTML = renderSidebar();
  document.getElementById('topbar').innerHTML = renderTopbar();
  document.getElementById('modal-container').innerHTML = renderModal();

  // Attach event listeners
  initSidebar();
  initTopbar();
  initModal();

  // Start client-side router
  initRouter();

  // Initialize Global Command Menu (Ctrl+K)
  initCommandMenu();

  // Initialize AI Assistant Chatbot
  initAIAssistant();

  // Start live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Undo/Redo Hotkey
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (undoLastAction()) {
        const { showToast } = await import('./components/ProjectFormModal.js');
        showToast('Hoàn tác thành công (Undo)');
        // Trigger hashchange to re-render current page
        window.dispatchEvent(new Event('hashchange'));
      }
    }
  });

  // Listen for real-time activities from others
  startActivityListener();

  console.log('🏗️ BIM TransPM initialized successfully');
}

/**
 * Update the topbar datetime display every second
 */
function updateClock() {
  const el = document.getElementById('topbar-datetime');
  if (el) {
    const now = new Date();
    const options = {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    el.textContent = now.toLocaleDateString('vi-VN', options);
  }
}

/**
 * Listen to real-time activity log changes and show notifications
 */
let lastActivityId = null;

function startActivityListener() {
  subscribe(async (key, value) => {
    if (key === 'activityLog' && value && value.length > 0) {
      const latestActivity = value[0];
      
      // Initialize lastActivityId on first load without alerting
      if (!lastActivityId) {
        lastActivityId = latestActivity.id;
        return;
      }
      
      // If there is a new activity that we haven't alerted yet
      if (latestActivity.id !== lastActivityId) {
        lastActivityId = latestActivity.id;
        
        // Don't show toast for our own actions
        const currentUserEmail = getState().currentUserAuth?.email;
        if (latestActivity.email !== currentUserEmail) {
          const { showToast } = await import('./components/ProjectFormModal.js');
          showToast(`🔔 ${latestActivity.user} ${latestActivity.action} - ${latestActivity.project}`);
          
          // Re-render dashboard if we are on it
          if (location.hash === '' || location.hash === '#dashboard') {
            window.dispatchEvent(new Event('hashchange'));
          }
        }
      }
    }
  });
}

// Boot when DOM is ready or already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
