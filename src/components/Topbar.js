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
  const state = getState();
  const currentUserRole = state.currentUserRole;
  const currentUser = state.currentUser;
  const currentUserAuth = state.currentUserAuth;

  const isAdmin = ['BIM Manager', 'Project Manager'].includes(currentUserRole) || 
                  currentUser?.role === 'BIM Manager' || 
                  currentUser?.role === 'Project Manager' ||
                  currentUserAuth?.email === 'admin@vsibim.com';

  return `
    <div class="topbar-page-info">
      <span class="topbar-page-title" id="topbar-title">Dashboard</span>
      <span class="topbar-breadcrumb" id="topbar-breadcrumb">Tổng quan dự án</span>
    </div>
    <div class="topbar-spacer"></div>
    <button class="topbar-btn" id="btn-toggle-theme" data-tooltip="Sáng/Tối" style="margin-right: var(--space-md);">
      ${state.theme === 'dark' ? '🌞' : '🌙'}
    </button>
    <div class="topbar-search" id="topbar-search">
      <span>🔍</span>
      <input type="text" placeholder="Tìm kiếm dự án, nhân sự..." id="search-input" />
    </div>
    <div class="topbar-actions" style="display: flex; align-items: center; gap: 8px;">
      <!-- Khôi phục & Sao lưu dữ liệu an toàn (CHỈ HIỂN THỊ VỚI ADMIN / BIM MANAGER) -->
      ${isAdmin ? `
        <button id="btn-snapshots" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 4px 10px; border-color: var(--accent-secondary); color: var(--accent-secondary);" title="Xem các điểm phục hồi tự động gần nhất (Chỉ Quản trị viên)">
          🕒 Điểm phục hồi
        </button>
        <button id="btn-restore-gs" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 4px 10px; border-color: var(--accent-primary); color: var(--accent-primary);" title="Khôi phục dữ liệu gốc từ Google Sheets (Chỉ Quản trị viên)">
          📥 Phục hồi GSheets
        </button>
        <button id="btn-backup-json" class="btn btn-outline btn-sm" style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; padding: 4px 10px;" title="Tải file sao lưu JSON về máy tính (Chỉ Quản trị viên)">
          💾 Sao lưu
        </button>
      ` : ''}

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

  // Nút Khôi phục dữ liệu từ Google Sheets
  const restoreBtn = document.getElementById('btn-restore-gs');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', async () => {
      if (!confirm('Bạn có muốn đồng bộ kéo lại Dự án 14D, Tasks và Giờ làm kỹ sư từ Google Sheets không?')) return;
      restoreBtn.disabled = true;
      const oldText = restoreBtn.innerHTML;
      restoreBtn.innerHTML = '⏳ Đang kéo...';
      try {
        const { restoreFromGoogleSheets } = await import('../state.js');
        const res = await restoreFromGoogleSheets();
        if (res && res.success) {
          alert(`✅ Phục hồi thành công từ Google Sheets!\n- ${res.tasksCount} nhiệm vụ\n- ${res.timesheetsCount} bản ghi giờ làm của kỹ sư\n- Dự án 14D đã được cập nhật!`);
          window.dispatchEvent(new Event('hashchange'));
        } else {
          alert('⚠️ Có lỗi xảy ra khi phục hồi: ' + (res?.error || 'Không rõ nguyên nhân'));
        }
      } catch(err) {
        alert('❌ Lỗi: ' + err.message);
      } finally {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = oldText;
      }
    });
  }

  // Nút Tải file Sao lưu JSON
  const backupBtn = document.getElementById('btn-backup-json');
  if (backupBtn) {
    backupBtn.addEventListener('click', async () => {
      const { exportBackupJSON } = await import('../state.js');
      exportBackupJSON();
    });
  }

  // Nút Điểm phục hồi (Snapshots modal)
  const snapBtn = document.getElementById('btn-snapshots');
  if (snapBtn) {
    snapBtn.addEventListener('click', async () => {
      const { getLocalSnapshotsMetadata, restoreSnapshotByIndex, exportBackupJSON, importBackupJSON } = await import('../state.js');
      const snapshots = getLocalSnapshotsMetadata();
      
      let modalEl = document.getElementById('snapshots-modal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'snapshots-modal';
        document.body.appendChild(modalEl);
      }
      
      modalEl.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; width: 90%; max-width: 620px; max-height: 85vh; overflow-y: auto; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                  🛡️ Lịch Sử Điểm Phục Hồi An Toàn (Snapshots)
                </h3>
                <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                  Hệ thống tự động lưu trữ 5 bản ghi gần nhất vào máy tính. Bạn có thể quay lại bất kỳ thời điểm nào nếu lỡ xóa nhầm dữ liệu.
                </p>
              </div>
              <button id="btn-close-snap-modal" class="btn btn-ghost btn-sm" style="font-size: 1.2rem; cursor: pointer;">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
              ${snapshots.length === 0 ? `
                <div style="text-align: center; padding: 30px; color: var(--text-muted); background: var(--bg-secondary); border-radius: 8px;">
                  Chưa có snapshot cục bộ nào được tạo. Hệ thống sẽ tự động tạo khi có thay đổi dữ liệu!
                </div>
              ` : snapshots.map((s, idx) => `
                <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; background: var(--bg-secondary); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                  <div>
                    <div style="font-weight: bold; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                      <span>🕒 ${s.isoDate}</span>
                      <span class="badge" style="font-size: 0.7rem; background: var(--bg-tertiary); color: var(--accent-primary); border: 1px solid var(--border-subtle);">${s.reason || 'Tự động'}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; display: flex; gap: 12px;">
                      <span>📁 <strong>${s.summary?.projectsCount || 0}</strong> dự án</span>
                      <span>📋 <strong>${s.summary?.totalTasks || 0}</strong> nhiệm vụ</span>
                      <span>⏱️ <strong>${s.summary?.timesheetsCount || 0}</strong> giờ làm</span>
                    </div>
                  </div>
                  <button class="btn btn-primary btn-sm btn-restore-snap" data-idx="${idx}" style="white-space: nowrap; font-size: 0.8rem; padding: 6px 12px;">
                    ↺ Khôi phục bản này
                  </button>
                </div>
              `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px;">
              <div style="display: flex; gap: 8px;">
                <button id="btn-snap-export" class="btn btn-outline btn-sm" style="font-size: 0.8rem;">
                  💾 Tải File Sao Lưu JSON
                </button>
                <label class="btn btn-outline btn-sm" style="font-size: 0.8rem; cursor: pointer; margin: 0;">
                  📂 Nhập File JSON
                  <input type="file" id="input-snap-import" accept=".json" style="display: none;">
                </label>
              </div>
              <button id="btn-close-snap-modal-bottom" class="btn btn-ghost btn-sm">Đóng</button>
            </div>
          </div>
        </div>
      `;

      // Event Handlers for Snapshot Modal
      const closeModal = () => { modalEl.remove(); };
      document.getElementById('btn-close-snap-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-close-snap-modal-bottom')?.addEventListener('click', closeModal);

      document.querySelectorAll('.btn-restore-snap').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const idx = parseInt(e.currentTarget.dataset.idx);
          const targetSnap = snapshots[idx];
          if (!confirm(`Bạn có chắc muốn khôi phục lại dữ liệu tại thời điểm ${targetSnap?.isoDate}?\n- ${targetSnap?.summary?.projectsCount} dự án\n- ${targetSnap?.summary?.totalTasks} nhiệm vụ\n- ${targetSnap?.summary?.timesheetsCount} bản ghi giờ làm`)) return;
          
          const res = restoreSnapshotByIndex(idx);
          if (res && res.success) {
            alert(`✅ Đã khôi phục thành công về bản sao ${res.isoDate}!\nDữ liệu đã được đồng bộ với Cloud an toàn.`);
            closeModal();
            window.dispatchEvent(new Event('hashchange'));
          } else {
            alert(`❌ Không thể khôi phục: ${res?.error || 'Lỗi không xác định'}`);
          }
        });
      });

      document.getElementById('btn-snap-export')?.addEventListener('click', () => {
        exportBackupJSON();
      });

      document.getElementById('input-snap-import')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm(`Bạn có muốn nạp dữ liệu từ file sao lưu ${file.name} không?`)) return;
        try {
          const res = await importBackupJSON(file);
          if (res && res.success) {
            alert(`✅ Nhập dữ liệu thành công từ file ${file.name}!`);
            closeModal();
            window.dispatchEvent(new Event('hashchange'));
          }
        } catch(err) {
          alert(`❌ Lỗi khi đọc file sao lưu: ${err.message}`);
        }
      });
    });
  }
}

