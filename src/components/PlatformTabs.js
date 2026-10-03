// ============================================
// Creator Kit — Platform Tabs Component
// ============================================

import { getState, setState, subscribe } from '../state.js';
import { PLATFORMS } from '../data/platforms.js';

/**
 * Count content items per platform
 */
function getPlatformCounts() {
  const state = getState();
  const contents = state.contents || [];
  const counts = { all: contents.length };

  PLATFORMS.forEach(p => {
    counts[p.id] = contents.filter(c => c.platform === p.id).length;
  });

  return counts;
}

/**
 * Render the horizontal platform filter tabs
 */
export function renderPlatformTabs() {
  const state = getState();
  const currentFilter = state.currentPlatformFilter || 'all';
  const counts = getPlatformCounts();

  const allTabActive = currentFilter === 'all' ? ' platform-tab--active' : '';

  let tabsHTML = `
    <button class="platform-tab${allTabActive}" data-platform="all">
      <span class="platform-tab__icon">🌐</span>
      <span class="platform-tab__name">Tất cả</span>
      <span class="platform-tab__count">${counts.all}</span>
    </button>
  `;

  PLATFORMS.forEach(p => {
    const isActive = currentFilter === p.id ? ' platform-tab--active' : '';
    const count = counts[p.id] || 0;

    tabsHTML += `
      <button class="platform-tab${isActive}" data-platform="${p.id}" style="${isActive ? `--tab-color: ${p.color}` : ''}">
        <span class="platform-tab__icon">${p.icon}</span>
        <span class="platform-tab__name">${p.name}</span>
        <span class="platform-tab__count">${count}</span>
      </button>
    `;
  });

  return `<div class="platform-tabs" id="platform-tabs">${tabsHTML}</div>`;
}

/**
 * Attach click handlers to platform tabs
 */
export function initPlatformTabs() {
  const container = document.getElementById('platform-tabs');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.platform-tab');
    if (!tab) return;

    const platform = tab.dataset.platform;
    setState('currentPlatformFilter', platform === 'all' ? null : platform);
  });

  // Subscribe to filter changes — re-render tabs
  subscribe((key, value, fullState) => {
    if (key === 'currentPlatformFilter' || key === 'contents') {
      const tabsContainer = document.getElementById('topbar-platform-tabs');
      if (tabsContainer) {
        tabsContainer.innerHTML = renderPlatformTabs();
        // Re-attach since we replaced the DOM
        initPlatformTabsInner();
      }
    }
  });
}

/**
 * Inner init for re-attached tabs (after re-render)
 */
function initPlatformTabsInner() {
  const container = document.getElementById('platform-tabs');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.platform-tab');
    if (!tab) return;

    const platform = tab.dataset.platform;
    setState('currentPlatformFilter', platform === 'all' ? null : platform);
  });
}
