// ============================================
// ANIMATIONS & EFFECTS UTILITIES
// ============================================

/**
 * Animate a number counter from 0 to target value
 * @param {HTMLElement} element - The DOM element to update
 * @param {number} start - Starting value (usually 0)
 * @param {number} end - Ending target value
 * @param {number} duration - Duration in milliseconds
 * @param {string} suffix - Text to append (e.g. '%')
 */
export function animateCounter(element, start, end, duration = 1000, suffix = '') {
  if (!element) return;
  
  let startTimestamp = null;
  
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Ease out quad function for smooth deceleration
    const easeProgress = progress * (2 - progress);
    const current = Math.floor(easeProgress * (end - start) + start);
    
    element.textContent = current + suffix;
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end + suffix; // Ensure exact final value
    }
  };
  
  window.requestAnimationFrame(step);
}

/**
 * Initialize all counters on the page that have the [data-count] attribute
 */
export function initCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    // Only animate once
    if (el.dataset.animated) return;
    el.dataset.animated = 'true';
    
    const target = parseInt(el.dataset.count, 10) || 0;
    const suffix = el.dataset.suffix || '';
    animateCounter(el, 0, target, 1200, suffix);
  });
}

/**
 * Play a subtle soft UI sound (using Web Audio API for zero latency and no files needed)
 * @param {string} type - 'click', 'success', 'error', 'pop'
 */
export function playUISound(type = 'click') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'pop') {
      // Gentle soft pop for drag/drop or hover
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } 
    else if (type === 'success') {
      // Soft chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch(e) {
    // Ignore audio context errors if browser blocks autoplay
  }
}

/**
 * Apply staggered fade in animation to a list of elements
 * @param {NodeList|Array} elements 
 */
export function staggerFadeIn(elements) {
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'; // Spring effect
    
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 50 + (index * 60)); // 60ms delay between each item
  });
}
