// ============================================
// Creator Kit — Stats Cards Component
// ============================================

import { getState, subscribe } from '../state.js';

/**
 * Compute statistics from the current content items
 */
function getStats() {
  const state = getState();
  const contents = state.contents || [];
  const totalContent = contents.length;
  const publishedContent = contents.filter(c => c.status === 'published').length;
  const bookingCount = contents.filter(c =>
    c.category && c.category.toLowerCase().includes('booking')
  ).length || 1; // Default to 1 if no booking items

  return { totalContent, publishedContent, bookingCount };
}

/**
 * Render the stats cards row
 */
export function renderStatsCards() {
  const { totalContent, publishedContent, bookingCount } = getStats();

  return `
    <div class="stats-row" id="stats-cards">
      <div class="stats-card glass">
        <div class="stats-card__icon">📋</div>
        <div class="stats-card__info">
          <div class="stats-card__label">TỔNG NỘI DUNG</div>
          <div class="stats-card__value stats-card__value--red">${totalContent}</div>
        </div>
      </div>
      <div class="stats-card glass">
        <div class="stats-card__icon">🚀</div>
        <div class="stats-card__info">
          <div class="stats-card__label">CONTENT LÊN SÓNG</div>
          <div class="stats-card__value stats-card__value--green">${publishedContent}</div>
        </div>
      </div>
      <div class="stats-card glass">
        <div class="stats-card__icon">📦</div>
        <div class="stats-card__info">
          <div class="stats-card__label">BOOKING TRONG THÁNG</div>
          <div class="stats-card__value stats-card__value--blue">${bookingCount}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach stat cards listeners and subscribe to state changes
 */
export function initStatsCards() {
  subscribe((key, value, fullState) => {
    if (key === 'contents') {
      const container = document.getElementById('stats-cards');
      if (container) {
        const { totalContent, publishedContent, bookingCount } = getStats();
        const values = container.querySelectorAll('.stats-card__value');
        if (values[0]) values[0].textContent = totalContent;
        if (values[1]) values[1].textContent = publishedContent;
        if (values[2]) values[2].textContent = bookingCount;
      }
    }
  });
}
