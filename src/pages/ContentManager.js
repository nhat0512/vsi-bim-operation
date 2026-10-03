import { getState, setState, subscribe } from '../state.js';
import { PLATFORMS, STATUSES } from '../data/platforms.js';
import { renderPlatformTabs, initPlatformTabs } from '../components/PlatformTabs.js';
import { openModal } from '../components/Modal.js';

let unsubscribe = null;
let searchHandler = null;
let statusHandler = null;

function getFilteredContents() {
  const state = getState();
  let items = [...(state.contents || [])];
  const query = (state.searchQuery || '').toLowerCase().trim();
  const platformFilter = state.currentPlatformFilter || 'all';
  const statusFilter = document.getElementById('cm-status-filter')?.value || 'all';

  if (query) {
    items = items.filter(c => c.title.toLowerCase().includes(query));
  }
  if (platformFilter !== 'all') {
    items = items.filter(c => c.platform === platformFilter);
  }
  if (statusFilter !== 'all') {
    items = items.filter(c => c.status === statusFilter);
  }

  return items;
}

function renderContentGrid() {
  const items = getFilteredContents();

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__text">Chưa có nội dung nào. Hãy tạo content đầu tiên!</div>
      </div>
    `;
  }

  return `
    <div class="content-grid">
      ${items.map(item => {
        const platform = PLATFORMS.find(p => p.id === item.platform) || PLATFORMS[0];
        const status = STATUSES[item.status] || STATUSES.draft;
        const tagsHtml = (item.tags || []).map(t => `<span class="badge">${t}</span>`).join('');
        const dateDisplay = item.scheduledDate
          ? new Date(item.scheduledDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          : '—';

        return `
          <div class="content-list-item" data-content-id="${item.id}" style="cursor: pointer;">
            <div class="content-list-item__header">
              <span class="content-list-item__platform" style="background: ${platform.bgColor}; color: ${platform.color};">
                ${platform.icon} ${platform.shortName}
              </span>
              <span class="content-list-item__status status--${item.status}">${status.label}</span>
            </div>
            <div class="content-list-item__title">${item.title}</div>
            <div class="content-list-item__meta">
              <span>📅 ${dateDisplay}</span>
              <span>🕐 ${item.scheduledTime || '—'}</span>
              ${item.assignee ? `<span>👤 ${item.assignee}</span>` : ''}
            </div>
            ${tagsHtml ? `<div style="display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.5rem;">${tagsHtml}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function render() {
  const state = getState();

  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">📋 Quản Lý Content</h1>
        <div class="page__actions" style="display: flex; gap: 0.75rem; align-items: center;">
          <div class="search-bar">
            <span class="search-bar__icon">🔍</span>
            <input type="text" id="cm-search" placeholder="Tìm kiếm nội dung..." value="${state.searchQuery || ''}">
          </div>
          <button class="btn btn--primary" id="cm-create-btn">
            <span>＋</span> Tạo mới
          </button>
        </div>
      </div>
      <div class="page__content">
        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
          ${renderPlatformTabs()}
          <select id="cm-status-filter" class="btn btn--secondary" style="min-width: 140px; cursor: pointer; appearance: auto; padding: 0.5rem 1rem;">
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="published">Đã đăng</option>
            <option value="review">Đang review</option>
          </select>
        </div>
        <div id="cm-content-grid">
          ${renderContentGrid()}
        </div>
      </div>
    </div>
  `;
}

function refreshGrid() {
  const grid = document.getElementById('cm-content-grid');
  if (grid) {
    grid.innerHTML = renderContentGrid();
  }
}

export function init() {
  initPlatformTabs();

  const createBtn = document.getElementById('cm-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => openModal());
  }

  // Search
  const searchInput = document.getElementById('cm-search');
  if (searchInput) {
    searchHandler = (e) => {
      setState('searchQuery', e.target.value);
      refreshGrid();
    };
    searchInput.addEventListener('input', searchHandler);
  }

  // Status filter
  const statusSelect = document.getElementById('cm-status-filter');
  if (statusSelect) {
    statusHandler = () => refreshGrid();
    statusSelect.addEventListener('change', statusHandler);
  }

  // Click on content card
  const gridEl = document.getElementById('cm-content-grid');
  if (gridEl) {
    gridEl.addEventListener('click', (e) => {
      const card = e.target.closest('.content-list-item');
      if (card) {
        const id = card.dataset.contentId;
        const state = getState();
        const content = (state.contents || []).find(c => c.id === id);
        if (content) openModal(content);
      }
    });
  }

  unsubscribe = subscribe((key) => {
    if (key === 'currentPlatformFilter' || key === 'contents') {
      refreshGrid();
    }
  });
}

export function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  setState('searchQuery', '');
}
