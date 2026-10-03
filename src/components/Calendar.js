// ============================================
// Creator Kit — Calendar Component
// ============================================

import { getState, setState, subscribe } from '../state.js';
import { renderContentCard } from './ContentCard.js';

const DAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

/**
 * Get the days to display in the calendar grid for a given month/year.
 * Returns an array of { date: Date, isCurrentMonth: boolean, isToday: boolean }
 */
function getCalendarDays(year, month) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Day of week for first day (0=Sun → convert to Mon-based: Mon=0, Tue=1, ..., Sun=6)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon-based

  const days = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.push({ date: d, isCurrentMonth: false, isToday: dStr === todayStr });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.push({ date: d, isCurrentMonth: true, isToday: dStr === todayStr });
  }

  // Next month padding — fill to complete last row (multiple of 7)
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({ date: d, isCurrentMonth: false, isToday: dStr === todayStr });
    }
  }

  return days;
}

/**
 * Format a Date to YYYY-MM-DD string for matching with content scheduledDate
 */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Render the full calendar grid
 */
export function renderCalendar() {
  const state = getState();
  const year = state.currentYear;
  const month = state.currentMonth;
  const platformFilter = state.currentPlatformFilter;
  const contents = state.contents || [];

  // Build a map of date → content items
  const contentByDate = {};
  contents.forEach(item => {
    if (platformFilter && item.platform !== platformFilter) return;
    const key = item.scheduledDate;
    if (!key) return;
    if (!contentByDate[key]) contentByDate[key] = [];
    contentByDate[key].push(item);
  });

  const days = getCalendarDays(year, month);

  // Day headers
  const headersHTML = DAY_HEADERS.map(d =>
    `<div class="calendar__day-header">${d}</div>`
  ).join('');

  // Day cells
  const daysHTML = days.map(dayInfo => {
    const dateKey = formatDateKey(dayInfo.date);
    const dayItems = contentByDate[dateKey] || [];

    const todayClass = dayInfo.isToday ? ' calendar__day--today' : '';
    const otherClass = !dayInfo.isCurrentMonth ? ' calendar__day--other-month' : '';

    const itemsHTML = dayItems.map(item => renderContentCard(item)).join('');

    return `
      <div class="calendar__day${todayClass}${otherClass}" data-date="${dateKey}">
        <div class="calendar__day-number">${dayInfo.date.getDate()}</div>
        <div class="calendar__day-items">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="calendar" id="calendar-component">
      <div class="calendar__controls">
        <div class="calendar__title">${MONTH_NAMES[month]} ${year}</div>
        <div class="calendar__nav">
          <button class="calendar__nav-btn" id="cal-prev" title="Tháng trước">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button class="calendar__nav-btn btn btn--ghost" id="cal-today">Hôm nay</button>
          <button class="calendar__nav-btn" id="cal-next" title="Tháng sau">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div class="calendar__grid">
        ${headersHTML}
        ${daysHTML}
      </div>
    </div>
  `;
}

/**
 * Attach calendar event handlers
 */
export function initCalendar() {
  attachCalendarEvents();

  // Re-render calendar on relevant state changes
  subscribe((key, value, fullState) => {
    if (['currentMonth', 'currentYear', 'currentPlatformFilter', 'contents'].includes(key)) {
      const pageContent = document.getElementById('page-content');
      // Only re-render if we're on the schedule or dashboard page
      const calEl = document.getElementById('calendar-component');
      if (calEl) {
        calEl.outerHTML = renderCalendar();
        attachCalendarEvents();
      }
    }
  });
}

/**
 * Attach click events to calendar controls and content cards
 */
function attachCalendarEvents() {
  // Previous month
  const prevBtn = document.getElementById('cal-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const state = getState();
      let month = state.currentMonth - 1;
      let year = state.currentYear;
      if (month < 0) { month = 11; year--; }
      setState('currentYear', year);
      setState('currentMonth', month);
    });
  }

  // Next month
  const nextBtn = document.getElementById('cal-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const state = getState();
      let month = state.currentMonth + 1;
      let year = state.currentYear;
      if (month > 11) { month = 0; year++; }
      setState('currentYear', year);
      setState('currentMonth', month);
    });
  }

  // Today button
  const todayBtn = document.getElementById('cal-today');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      setState('currentYear', now.getFullYear());
      setState('currentMonth', now.getMonth());
    });
  }

  // Click on content cards in calendar
  const calEl = document.getElementById('calendar-component');
  if (calEl) {
    calEl.addEventListener('click', (e) => {
      const card = e.target.closest('.content-card');
      if (card) {
        const id = card.dataset.id;
        const state = getState();
        const content = (state.contents || []).find(c => String(c.id) === String(id));
        if (content) {
          setState('selectedContent', content);
          setState('modalOpen', true);
        }
        return;
      }

      // Click on empty day area → open create modal for that date
      const dayCell = e.target.closest('.calendar__day');
      if (dayCell && !e.target.closest('.content-card')) {
        const dateStr = dayCell.dataset.date;
        if (dateStr) {
          setState('selectedContent', null);
          setState('modalOpen', true);
        }
      }
    });
  }
}
