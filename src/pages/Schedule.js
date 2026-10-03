import { getState, subscribe } from '../state.js';
import { renderCalendar, initCalendar } from '../components/Calendar.js';
import { renderPlatformTabs, initPlatformTabs } from '../components/PlatformTabs.js';
import { openModal } from '../components/Modal.js';
import { PLATFORMS, STATUSES } from '../data/platforms.js';

let unsubscribe = null;

function getTodayItems() {
  const state = getState();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (state.contents || []).filter(c => c.scheduledDate === todayStr);
}

function renderTodaySidebar() {
  const items = getTodayItems();
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  if (items.length === 0) {
    return `
      <div class="schedule-sidebar">
        <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">📅 Hôm nay - ${today}</h3>
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <div class="empty-state__text">Không có lịch trình hôm nay</div>
        </div>
      </div>
    `;
  }

  const itemsHtml = items.map(item => {
    const platform = PLATFORMS.find(p => p.id === item.platform) || PLATFORMS[0];
    const status = STATUSES[item.status] || STATUSES.draft;
    return `
      <div class="content-list-item" data-content-id="${item.id}" style="cursor: pointer;">
        <div class="content-list-item__header">
          <span class="content-list-item__platform" style="background: ${platform.bgColor}; color: ${platform.color};">${platform.icon} ${platform.shortName}</span>
          <span class="content-list-item__status status--${item.status}">${status.label}</span>
        </div>
        <div class="content-list-item__title">${item.title}</div>
        <div class="content-list-item__meta">
          <span>🕐 ${item.scheduledTime || '—'}</span>
          ${item.assignee ? `<span>👤 ${item.assignee}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="schedule-sidebar">
      <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;">📅 Hôm nay - ${today}</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${itemsHtml}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">📅 Lịch Trình</h1>
        <div class="page__actions">
          <button class="btn btn--primary" id="schedule-create-btn">
            <span>＋</span> Tạo mới
          </button>
        </div>
      </div>
      <div class="page__content">
        ${renderPlatformTabs()}
        <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start;">
          <div id="schedule-calendar-wrapper">
            ${renderCalendar()}
          </div>
          <div id="schedule-sidebar-wrapper">
            ${renderTodaySidebar()}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  initPlatformTabs();
  initCalendar();

  const createBtn = document.getElementById('schedule-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => openModal());
  }

  // Click on sidebar items to edit
  const sidebar = document.getElementById('schedule-sidebar-wrapper');
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const item = e.target.closest('.content-list-item');
      if (item) {
        const id = item.dataset.contentId;
        const state = getState();
        const content = (state.contents || []).find(c => c.id === id);
        if (content) openModal(content);
      }
    });
  }

  unsubscribe = subscribe((key) => {
    if (key === 'currentPlatformFilter' || key === 'contents') {
      const calWrapper = document.getElementById('schedule-calendar-wrapper');
      if (calWrapper) {
        calWrapper.innerHTML = renderCalendar();
        initCalendar();
      }
      const sidebarWrapper = document.getElementById('schedule-sidebar-wrapper');
      if (sidebarWrapper) {
        sidebarWrapper.innerHTML = renderTodaySidebar();
      }
    }
  });
}

export function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
