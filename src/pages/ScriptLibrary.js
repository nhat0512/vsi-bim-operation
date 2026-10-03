import { getState, setState, subscribe } from '../state.js';
import { PLATFORMS } from '../data/platforms.js';
import { openModal } from '../components/Modal.js';

let unsubscribe = null;

function getScriptItems() {
  const state = getState();
  const query = (state.searchQuery || '').toLowerCase().trim();
  let items = (state.contents || []).filter(c => c.script && c.script.trim() !== '');

  if (query) {
    items = items.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.script.toLowerCase().includes(query)
    );
  }

  return items;
}

function truncateText(text, maxLength = 120) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function renderScriptGrid() {
  const items = getScriptItems();

  if (items.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📜</div>
        <div class="empty-state__text">Chưa có kịch bản nào. Hãy tạo content với kịch bản để hiển thị ở đây!</div>
      </div>
    `;
  }

  return `
    <div class="content-grid">
      ${items.map(item => {
        const platform = PLATFORMS.find(p => p.id === item.platform) || PLATFORMS[0];
        const tagsHtml = (item.tags || []).map(t => `<span class="badge">${t}</span>`).join('');
        const dateDisplay = item.scheduledDate
          ? new Date(item.scheduledDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '—';

        return `
          <div class="content-list-item" data-content-id="${item.id}" style="cursor: pointer;">
            <div class="content-list-item__header">
              <span class="content-list-item__platform" style="background: ${platform.bgColor}; color: ${platform.color};">
                ${platform.icon} ${platform.shortName}
              </span>
            </div>
            <div class="content-list-item__title">${item.title}</div>
            <div style="
              background: var(--bg-tertiary, rgba(255,255,255,0.03));
              border-radius: 8px;
              padding: 0.75rem;
              margin: 0.5rem 0;
              font-size: 0.85rem;
              color: var(--text-secondary);
              line-height: 1.5;
              border-left: 3px solid ${platform.color};
              font-style: italic;
            ">${truncateText(item.script)}</div>
            <div class="content-list-item__meta">
              <span>📅 ${dateDisplay}</span>
              ${item.category ? `<span>📂 ${item.category}</span>` : ''}
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
        <h1 class="page__title">📜 Kho Kịch Bản</h1>
        <div class="page__actions" style="display: flex; gap: 0.75rem; align-items: center;">
          <div class="search-bar">
            <span class="search-bar__icon">🔍</span>
            <input type="text" id="sl-search" placeholder="Tìm kiếm kịch bản..." value="${state.searchQuery || ''}">
          </div>
          <button class="btn btn--primary" id="sl-create-btn">
            <span>＋</span> Thêm kịch bản
          </button>
        </div>
      </div>
      <div class="page__content">
        <div id="sl-script-grid">
          ${renderScriptGrid()}
        </div>
      </div>
    </div>
  `;
}

function refreshGrid() {
  const grid = document.getElementById('sl-script-grid');
  if (grid) {
    grid.innerHTML = renderScriptGrid();
  }
}

export function init() {
  const createBtn = document.getElementById('sl-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => openModal());
  }

  const searchInput = document.getElementById('sl-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      setState('searchQuery', e.target.value);
      refreshGrid();
    });
  }

  const gridEl = document.getElementById('sl-script-grid');
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
    if (key === 'contents') {
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
