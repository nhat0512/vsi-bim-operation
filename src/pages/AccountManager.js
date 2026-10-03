import { PLATFORMS } from '../data/platforms.js';

const MOCK_ACCOUNTS = [
  {
    id: 'acc-1',
    platform: 'youtube',
    username: '@HaoLamCreator',
    displayName: 'Hào Lam Creator',
    followers: 125000,
    followerLabel: 'subscribers',
    status: 'active',
    lastPost: '2026-06-03',
    avatar: '🎬'
  },
  {
    id: 'acc-2',
    platform: 'facebook',
    username: 'Hào Lam Official',
    displayName: 'Hào Lam Official',
    followers: 45000,
    followerLabel: 'followers',
    status: 'active',
    lastPost: '2026-06-04',
    avatar: '📘'
  },
  {
    id: 'acc-3',
    platform: 'tiktok',
    username: '@haolam.creator',
    displayName: 'Hào Lam Creator',
    followers: 89000,
    followerLabel: 'followers',
    status: 'active',
    lastPost: '2026-06-04',
    avatar: '🎵'
  },
  {
    id: 'acc-4',
    platform: 'linkedin',
    username: 'Hào Lam',
    displayName: 'Hào Lam',
    followers: 12000,
    followerLabel: 'connections',
    status: 'active',
    lastPost: '2026-06-02',
    avatar: '💼'
  },
  {
    id: 'acc-5',
    platform: 'shorts',
    username: '@HaoLamShorts',
    displayName: 'Hào Lam Shorts',
    followers: 67000,
    followerLabel: 'followers',
    status: 'active',
    lastPost: '2026-06-03',
    avatar: '📱'
  },
  {
    id: 'acc-6',
    platform: 'threads',
    username: '@haolam',
    displayName: 'Hào Lam',
    followers: 8500,
    followerLabel: 'followers',
    status: 'paused',
    lastPost: '2026-05-28',
    avatar: '🧵'
  }
];

function formatFollowers(count) {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(count >= 10000 ? 0 : 1) + 'K';
  return count.toLocaleString('vi-VN');
}

function renderAccountCards() {
  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
      ${MOCK_ACCOUNTS.map(acc => {
        const platform = PLATFORMS.find(p => p.id === acc.platform) || PLATFORMS[0];
        const isActive = acc.status === 'active';
        const statusLabel = isActive ? 'Hoạt động' : 'Tạm dừng';
        const statusColor = isActive ? '#2ed573' : '#ffa502';
        const lastPostDate = acc.lastPost
          ? new Date(acc.lastPost).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '—';

        return `
          <div class="content-list-item" style="border-left: 4px solid ${platform.color}; cursor: default;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
              <div style="
                width: 52px; height: 52px;
                border-radius: 14px;
                background: ${platform.bgColor};
                display: flex; align-items: center; justify-content: center;
                font-size: 1.5rem;
              ">${platform.icon}</div>
              <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 1.05rem;">${acc.displayName}</div>
                <div style="color: ${platform.color}; font-size: 0.85rem;">${acc.username}</div>
              </div>
              <div style="
                display: flex; align-items: center; gap: 0.375rem;
                padding: 0.3rem 0.75rem;
                border-radius: 20px;
                background: ${isActive ? 'rgba(46, 213, 115, 0.12)' : 'rgba(255, 165, 2, 0.12)'};
                color: ${statusColor};
                font-size: 0.8rem;
                font-weight: 600;
              ">
                <span style="width: 7px; height: 7px; border-radius: 50%; background: ${statusColor}; display: inline-block;"></span>
                ${statusLabel}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div style="
                background: var(--bg-tertiary, rgba(255,255,255,0.03));
                border-radius: 8px;
                padding: 0.75rem;
                text-align: center;
              ">
                <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">${formatFollowers(acc.followers)}</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary); text-transform: capitalize;">${acc.followerLabel}</div>
              </div>
              <div style="
                background: var(--bg-tertiary, rgba(255,255,255,0.03));
                border-radius: 8px;
                padding: 0.75rem;
                text-align: center;
              ">
                <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${lastPostDate}</div>
                <div style="font-size: 0.75rem; color: var(--text-tertiary);">Bài đăng gần nhất</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSummaryStats() {
  const totalFollowers = MOCK_ACCOUNTS.reduce((sum, acc) => sum + acc.followers, 0);
  const activeCount = MOCK_ACCOUNTS.filter(a => a.status === 'active').length;

  return `
    <div class="stats-row" style="margin-bottom: 1.5rem;">
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05));">📱</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${MOCK_ACCOUNTS.length}</div>
          <div class="stats-card__label">Tổng tài khoản</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(46,213,115,0.2), rgba(46,213,115,0.05));">👥</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${formatFollowers(totalFollowers)}</div>
          <div class="stats-card__label">Tổng followers</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(255,165,2,0.2), rgba(255,165,2,0.05));">✅</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${activeCount}/${MOCK_ACCOUNTS.length}</div>
          <div class="stats-card__label">Đang hoạt động</div>
        </div>
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">📱 Quản Lý Tài Khoản</h1>
        <div class="page__actions">
          <button class="btn btn--primary" id="am-add-btn">
            <span>＋</span> Thêm tài khoản
          </button>
        </div>
      </div>
      <div class="page__content">
        ${renderSummaryStats()}
        ${renderAccountCards()}
      </div>
    </div>
  `;
}

export function init() {
  const addBtn = document.getElementById('am-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      alert('Tính năng thêm tài khoản sẽ được cập nhật trong phiên bản tiếp theo!');
    });
  }
}

export function destroy() {}
