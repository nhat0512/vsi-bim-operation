import { getState, setState, subscribe } from '../state.js';
import { PLATFORMS } from '../data/platforms.js';

let unsubscribe = null;

const CATEGORIES = ['Video', 'Blog', 'Short', 'Live'];
const CATEGORY_COLORS = {
  'Video': { bg: 'rgba(255, 56, 56, 0.15)', color: '#ff3838' },
  'Blog': { bg: 'rgba(56, 161, 255, 0.15)', color: '#38a1ff' },
  'Short': { bg: 'rgba(255, 165, 2, 0.15)', color: '#ffa502' },
  'Live': { bg: 'rgba(46, 213, 115, 0.15)', color: '#2ed573' }
};

const DEFAULT_IDEAS = [
  {
    id: 'idea-1',
    title: 'Series AI Tools Review - Top 10 công cụ AI cho Creator',
    description: 'Review chi tiết các công cụ AI giúp tăng năng suất sáng tạo: ChatGPT, Midjourney, Runway, CapCut AI, Canva AI...',
    tags: ['AI', 'Review', 'Series'],
    category: 'Video',
    platform: 'youtube',
    createdDate: '2026-05-28'
  },
  {
    id: 'idea-2',
    title: 'Vlog hậu trường: Một ngày làm việc của Content Creator',
    description: 'Behind the scenes - Chia sẻ quy trình làm việc hàng ngày, từ lên ý tưởng đến đăng bài, quản lý đa nền tảng.',
    tags: ['Vlog', 'Hậu trường', 'Daily'],
    category: 'Video',
    platform: 'youtube',
    createdDate: '2026-05-30'
  },
  {
    id: 'idea-3',
    title: 'Tutorial: Cách edit video chuyên nghiệp bằng CapCut',
    description: 'Hướng dẫn từ cơ bản đến nâng cao về chỉnh sửa video trên CapCut. Bao gồm hiệu ứng, chuyển cảnh, color grading.',
    tags: ['Tutorial', 'CapCut', 'Edit'],
    category: 'Short',
    platform: 'tiktok',
    createdDate: '2026-05-31'
  },
  {
    id: 'idea-4',
    title: 'Challenge: 30 ngày tạo content mỗi ngày',
    description: 'Thử thách bản thân đăng content mỗi ngày trong 30 ngày. Chia sẻ quá trình, khó khăn, bài học rút ra.',
    tags: ['Challenge', '30days', 'Motivation'],
    category: 'Short',
    platform: 'tiktok',
    createdDate: '2026-06-01'
  },
  {
    id: 'idea-5',
    title: 'Collab với creator khác - Cross-platform content',
    description: 'Hợp tác sáng tạo nội dung với các creator khác. Phát triển nội dung đa nền tảng, mở rộng tệp khán giả.',
    tags: ['Collab', 'Cross-platform', 'Networking'],
    category: 'Video',
    platform: 'facebook',
    createdDate: '2026-06-01'
  },
  {
    id: 'idea-6',
    title: 'Live Q&A: Hỏi đáp về nghề Content Creator',
    description: 'Livestream trả lời câu hỏi của cộng đồng về nghề creator: thu nhập, kỹ năng cần có, cách bắt đầu, kinh nghiệm.',
    tags: ['Live', 'Q&A', 'Community'],
    category: 'Live',
    platform: 'facebook',
    createdDate: '2026-06-02'
  },
  {
    id: 'idea-7',
    title: 'Review setup làm việc: Thiết bị cần thiết cho Creator',
    description: 'Giới thiệu và đánh giá các thiết bị: camera, mic, đèn, máy tính, phần mềm. So sánh giá cả và chất lượng.',
    tags: ['Review', 'Setup', 'Equipment'],
    category: 'Video',
    platform: 'youtube',
    createdDate: '2026-06-02'
  },
  {
    id: 'idea-8',
    title: 'Tips: Cách tăng follower organic trên mỗi nền tảng',
    description: 'Chia sẻ chiến lược tăng follower tự nhiên trên YouTube, TikTok, Facebook, LinkedIn. Không dùng quảng cáo hay mua follow.',
    tags: ['Tips', 'Growth', 'Organic'],
    category: 'Blog',
    platform: 'linkedin',
    createdDate: '2026-06-03'
  },
  {
    id: 'idea-9',
    title: 'Storytelling trên mạng xã hội: Kể chuyện cuốn hút',
    description: 'Kỹ thuật viết và kể chuyện hấp dẫn trên social media. Hook, conflict, resolution. Áp dụng cho mọi nền tảng.',
    tags: ['Storytelling', 'Writing', 'Skills'],
    category: 'Blog',
    platform: 'threads',
    createdDate: '2026-06-03'
  },
  {
    id: 'idea-10',
    title: 'Phân tích xu hướng: Content nào đang hot tháng 6/2026',
    description: 'Tổng hợp và phân tích các trend đang hot trên TikTok, YouTube Shorts, Reels. Gợi ý cách áp dụng cho creator.',
    tags: ['Trends', 'Analysis', 'Monthly'],
    category: 'Short',
    platform: 'shorts',
    createdDate: '2026-06-04'
  }
];

function loadIdeas() {
  try {
    const stored = localStorage.getItem('creator_kit_ideas');
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return [...DEFAULT_IDEAS];
}

function saveIdeas(ideas) {
  try {
    localStorage.setItem('creator_kit_ideas', JSON.stringify(ideas));
  } catch (e) { /* ignore */ }
}

function renderIdeaGrid(ideas, searchQuery = '') {
  let filtered = ideas;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = ideas.filter(idea =>
      idea.title.toLowerCase().includes(q) ||
      idea.description.toLowerCase().includes(q) ||
      (idea.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">💡</div>
        <div class="empty-state__text">${searchQuery ? 'Không tìm thấy ý tưởng phù hợp' : 'Chưa có ý tưởng nào. Hãy thêm ý tưởng đầu tiên!'}</div>
      </div>
    `;
  }

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
      ${filtered.map(idea => {
        const catStyle = CATEGORY_COLORS[idea.category] || CATEGORY_COLORS['Video'];
        const platform = PLATFORMS.find(p => p.id === idea.platform);
        const dateStr = idea.createdDate
          ? new Date(idea.createdDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
          : '';

        return `
          <div class="idea-card" data-idea-id="${idea.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span class="badge" style="background: ${catStyle.bg}; color: ${catStyle.color}; font-weight: 600;">${idea.category}</span>
              ${platform ? `<span style="font-size: 0.8rem; color: var(--text-tertiary);">${platform.icon} ${platform.shortName}</span>` : ''}
            </div>
            <div class="idea-card__title">${idea.title}</div>
            <div class="idea-card__desc">${idea.description}</div>
            <div class="idea-card__tags">
              ${(idea.tags || []).map(t => `<span class="badge">${t}</span>`).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color, rgba(255,255,255,0.06));">
              <span style="font-size: 0.8rem; color: var(--text-tertiary);">📅 ${dateStr}</span>
              <button class="btn btn--ghost idea-delete-btn" data-idea-id="${idea.id}" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">🗑️</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAddForm() {
  return `
    <div id="ideas-add-form" style="display: none; background: var(--bg-secondary, rgba(255,255,255,0.04)); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
      <h3 style="margin-bottom: 1rem; color: var(--text-primary);">💡 Thêm ý tưởng mới</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <input type="text" id="idea-title-input" placeholder="Tiêu đề ý tưởng" style="padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); background: var(--bg-primary, #1a1a2e); color: var(--text-primary, #fff); font-size: 0.95rem;">
        <select id="idea-category-input" style="padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); background: var(--bg-primary, #1a1a2e); color: var(--text-primary, #fff); font-size: 0.95rem; cursor: pointer;">
          ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <textarea id="idea-desc-input" placeholder="Mô tả chi tiết..." rows="3" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); background: var(--bg-primary, #1a1a2e); color: var(--text-primary, #fff); font-size: 0.95rem; resize: vertical; margin-bottom: 1rem; box-sizing: border-box;"></textarea>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <input type="text" id="idea-tags-input" placeholder="Tags (phân cách bằng dấu phẩy)" style="padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); background: var(--bg-primary, #1a1a2e); color: var(--text-primary, #fff); font-size: 0.95rem;">
        <select id="idea-platform-input" style="padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1)); background: var(--bg-primary, #1a1a2e); color: var(--text-primary, #fff); font-size: 0.95rem; cursor: pointer;">
          ${PLATFORMS.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button class="btn btn--secondary" id="idea-cancel-btn">Hủy</button>
        <button class="btn btn--primary" id="idea-save-btn">Lưu ý tưởng</button>
      </div>
    </div>
  `;
}

export function render() {
  const ideas = loadIdeas();
  const state = getState();

  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">💡 Ý Tưởng Mới</h1>
        <div class="page__actions" style="display: flex; gap: 0.75rem; align-items: center;">
          <div class="search-bar">
            <span class="search-bar__icon">🔍</span>
            <input type="text" id="ideas-search" placeholder="Tìm kiếm ý tưởng..." value="${state.searchQuery || ''}">
          </div>
          <button class="btn btn--primary" id="ideas-add-btn">
            <span>＋</span> Thêm ý tưởng
          </button>
        </div>
      </div>
      <div class="page__content">
        ${renderAddForm()}
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <button class="btn btn--ghost idea-cat-filter active-cat" data-category="all" style="font-size: 0.85rem;">Tất cả</button>
          ${CATEGORIES.map(c => {
            const cs = CATEGORY_COLORS[c];
            return `<button class="btn btn--ghost idea-cat-filter" data-category="${c}" style="font-size: 0.85rem;">${c}</button>`;
          }).join('')}
        </div>
        <div id="ideas-grid">
          ${renderIdeaGrid(ideas)}
        </div>
      </div>
    </div>
  `;
}

function refreshGrid() {
  const grid = document.getElementById('ideas-grid');
  if (!grid) return;
  const state = getState();
  const ideas = loadIdeas();
  const activeCat = document.querySelector('.idea-cat-filter.active-cat')?.dataset.category || 'all';
  let filtered = ideas;
  if (activeCat !== 'all') {
    filtered = ideas.filter(i => i.category === activeCat);
  }
  grid.innerHTML = renderIdeaGrid(filtered, state.searchQuery || '');
}

export function init() {
  // Toggle add form
  const addBtn = document.getElementById('ideas-add-btn');
  const form = document.getElementById('ideas-add-form');
  if (addBtn && form) {
    addBtn.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Cancel
  const cancelBtn = document.getElementById('idea-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (form) form.style.display = 'none';
    });
  }

  // Save idea
  const saveBtn = document.getElementById('idea-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = document.getElementById('idea-title-input')?.value.trim();
      const desc = document.getElementById('idea-desc-input')?.value.trim();
      const category = document.getElementById('idea-category-input')?.value;
      const tagsStr = document.getElementById('idea-tags-input')?.value || '';
      const platform = document.getElementById('idea-platform-input')?.value;

      if (!title) return;

      const ideas = loadIdeas();
      const newIdea = {
        id: 'idea-' + Date.now(),
        title,
        description: desc || '',
        tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
        category: category || 'Video',
        platform: platform || 'youtube',
        createdDate: new Date().toISOString().split('T')[0]
      };
      ideas.unshift(newIdea);
      saveIdeas(ideas);

      // Clear form
      document.getElementById('idea-title-input').value = '';
      document.getElementById('idea-desc-input').value = '';
      document.getElementById('idea-tags-input').value = '';
      if (form) form.style.display = 'none';

      refreshGrid();
    });
  }

  // Search
  const searchInput = document.getElementById('ideas-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      setState('searchQuery', e.target.value);
      refreshGrid();
    });
  }

  // Category filter
  document.querySelectorAll('.idea-cat-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.idea-cat-filter').forEach(b => b.classList.remove('active-cat'));
      btn.classList.add('active-cat');
      refreshGrid();
    });
  });

  // Delete ideas
  const gridEl = document.getElementById('ideas-grid');
  if (gridEl) {
    gridEl.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.idea-delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        const ideaId = deleteBtn.dataset.ideaId;
        let ideas = loadIdeas();
        ideas = ideas.filter(i => i.id !== ideaId);
        saveIdeas(ideas);
        refreshGrid();
      }
    });
  }
}

export function destroy() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  setState('searchQuery', '');
}
