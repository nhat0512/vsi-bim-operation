// ============================================
// MODAL — Reusable modal component
// ============================================
import { getState, setState, subscribe } from '../state.js';

export function renderModal() {
  return `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content" id="modal-body">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-title">Modal</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-inner-body" id="modal-inner-content"></div>
      </div>
    </div>
  `;
}

export function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && getState().modalOpen) {
      closeModal();
    }
  });
}

/**
 * Open the modal with configurable options
 * @param {string} title - Modal title
 * @param {string} contentHTML - Inner HTML content
 * @param {Object} options - { size: 'normal'|'wide'|'full', onClose: Function }
 */
export function openModal(title, contentHTML, options = {}) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-inner-content');
  const bodyEl = document.getElementById('modal-body');

  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.innerHTML = contentHTML;

  // Apply size class
  if (bodyEl) {
    bodyEl.classList.remove('wide', 'full');
    if (options.size === 'wide') bodyEl.classList.add('wide');
    if (options.size === 'full') bodyEl.classList.add('full');
  }

  if (overlay) overlay.classList.add('open');

  // Store onClose callback
  window.__modalOnClose = options.onClose || null;

  setState('modalOpen', true);
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const bodyEl = document.getElementById('modal-body');
  
  if (overlay) overlay.classList.remove('open');
  if (bodyEl) bodyEl.classList.remove('wide', 'full');

  if (window.__modalOnClose) {
    window.__modalOnClose();
    window.__modalOnClose = null;
  }

  setState('modalOpen', false);
}

