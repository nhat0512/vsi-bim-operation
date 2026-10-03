// ============================================
// Creator Kit — Content Card Component
// ============================================

import { PLATFORMS } from '../data/platforms.js';

/**
 * Render a small content card for use inside calendar cells and lists.
 * @param {Object} contentItem - A content item from state.contents
 * @returns {string} HTML string
 */
export function renderContentCard(contentItem) {
  if (!contentItem) return '';

  const platform = PLATFORMS.find(p => p.id === contentItem.platform);
  const platformClass = contentItem.platform ? `content-card--${contentItem.platform}` : '';
  const shortName = platform ? platform.shortName : contentItem.platform || '';
  const icon = platform ? platform.icon : '📄';

  // Truncate title to fit calendar cells
  const maxTitleLen = 20;
  const truncatedTitle = contentItem.title && contentItem.title.length > maxTitleLen
    ? contentItem.title.substring(0, maxTitleLen) + '…'
    : contentItem.title || 'Không tiêu đề';

  return `
    <div class="content-card ${platformClass}" data-id="${contentItem.id}" title="${contentItem.title || ''}">
      <span class="content-card__platform">${icon} ${shortName}</span>
      <span class="content-card__title">${truncatedTitle}</span>
    </div>
  `;
}
