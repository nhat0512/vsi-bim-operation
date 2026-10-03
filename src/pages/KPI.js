import { PLATFORMS } from '../data/platforms.js';

const KPI_DATA = {
  totalViews: 1200000,
  totalFollowers: 346500,
  monthlyRevenue: 16000000,
  engagementRate: 4.8
};

const PLATFORM_BREAKDOWN = [
  { platform: 'youtube', followers: 125000, views: 580000, engagement: 5.2, revenue: 7500000 },
  { platform: 'facebook', followers: 45000, views: 220000, engagement: 3.8, revenue: 2500000 },
  { platform: 'tiktok', followers: 89000, views: 310000, engagement: 6.1, revenue: 3500000 },
  { platform: 'linkedin', followers: 12000, views: 35000, engagement: 4.5, revenue: 1200000 },
  { platform: 'shorts', followers: 67000, views: 45000, engagement: 3.9, revenue: 800000 },
  { platform: 'threads', followers: 8500, views: 10000, engagement: 2.8, revenue: 500000 }
];

const MONTHLY_TREND = [
  { month: 'T1', views: 650000, revenue: 8000000 },
  { month: 'T2', views: 720000, revenue: 9500000 },
  { month: 'T3', views: 810000, revenue: 11000000 },
  { month: 'T4', views: 880000, revenue: 12500000 },
  { month: 'T5', views: 1050000, revenue: 14000000 },
  { month: 'T6', views: 1200000, revenue: 16000000 }
];

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(num >= 100000 ? 0 : 1) + 'K';
  return num.toLocaleString('vi-VN');
}

function formatCurrency(value) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function renderKPICards() {
  const cards = [
    { icon: '👁️', value: formatNumber(KPI_DATA.totalViews), label: 'Tổng lượt xem', gradient: 'linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05))' },
    { icon: '👥', value: formatNumber(KPI_DATA.totalFollowers), label: 'Tổng follower', gradient: 'linear-gradient(135deg, rgba(46,213,115,0.2), rgba(46,213,115,0.05))' },
    { icon: '💰', value: formatCurrency(KPI_DATA.monthlyRevenue), label: 'Doanh thu tháng', gradient: 'linear-gradient(135deg, rgba(255,165,2,0.2), rgba(255,165,2,0.05))' },
    { icon: '📊', value: KPI_DATA.engagementRate + '%', label: 'Tỷ lệ tương tác', gradient: 'linear-gradient(135deg, rgba(255,107,129,0.2), rgba(255,107,129,0.05))' }
  ];

  return `
    <div class="kpi-grid">
      ${cards.map(card => `
        <div class="kpi-card">
          <div style="
            width: 48px; height: 48px; border-radius: 14px;
            background: ${card.gradient};
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; margin-bottom: 1rem;
          ">${card.icon}</div>
          <div class="kpi-card__value">${card.value}</div>
          <div class="kpi-card__label">${card.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPlatformTable() {
  return `
    <div style="margin-top: 2rem;">
      <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.1rem;">📊 Chi tiết theo nền tảng</h3>
      <div style="overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>Nền tảng</th>
              <th>Followers</th>
              <th>Lượt xem</th>
              <th>Engagement</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            ${PLATFORM_BREAKDOWN.map(row => {
              const platform = PLATFORMS.find(p => p.id === row.platform) || PLATFORMS[0];
              return `
                <tr>
                  <td>
                    <span style="
                      display: inline-flex; align-items: center; gap: 0.5rem;
                      font-weight: 600;
                    ">
                      <span style="
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 32px; height: 32px; border-radius: 8px;
                        background: ${platform.bgColor};
                        font-size: 1rem;
                      ">${platform.icon}</span>
                      ${platform.name}
                    </span>
                  </td>
                  <td style="font-weight: 600;">${formatNumber(row.followers)}</td>
                  <td>${formatNumber(row.views)}</td>
                  <td>
                    <span style="
                      display: inline-flex; align-items: center; gap: 0.375rem;
                      color: ${row.engagement >= 5 ? '#2ed573' : row.engagement >= 3.5 ? '#ffa502' : '#ff4757'};
                      font-weight: 600;
                    ">
                      ${row.engagement >= 5 ? '🔥' : row.engagement >= 3.5 ? '📈' : '📉'} ${row.engagement}%
                    </span>
                  </td>
                  <td style="font-weight: 700; color: var(--text-primary);">${formatCurrency(row.revenue)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMonthlyTrend() {
  const maxViews = Math.max(...MONTHLY_TREND.map(m => m.views));
  const maxRevenue = Math.max(...MONTHLY_TREND.map(m => m.revenue));

  return `
    <div style="margin-top: 2rem;">
      <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.1rem;">📈 Xu hướng theo tháng</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Views Chart -->
        <div style="
          background: var(--bg-secondary, rgba(255,255,255,0.04));
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid var(--border-color, rgba(255,255,255,0.08));
        ">
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; font-weight: 600;">👁️ Lượt xem</div>
          <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 140px;">
            ${MONTHLY_TREND.map(m => {
              const heightPct = (m.views / maxViews) * 100;
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.375rem; height: 100%; justify-content: flex-end;">
                  <span style="font-size: 0.7rem; color: var(--text-tertiary);">${formatNumber(m.views)}</span>
                  <div style="
                    width: 100%;
                    height: ${heightPct}%;
                    background: linear-gradient(180deg, #6c5ce7, #a29bfe);
                    border-radius: 6px 6px 2px 2px;
                    min-height: 8px;
                    transition: height 0.5s ease;
                  "></div>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary); font-weight: 600;">${m.month}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <!-- Revenue Chart -->
        <div style="
          background: var(--bg-secondary, rgba(255,255,255,0.04));
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid var(--border-color, rgba(255,255,255,0.08));
        ">
          <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; font-weight: 600;">💰 Doanh thu</div>
          <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 140px;">
            ${MONTHLY_TREND.map(m => {
              const heightPct = (m.revenue / maxRevenue) * 100;
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.375rem; height: 100%; justify-content: flex-end;">
                  <span style="font-size: 0.7rem; color: var(--text-tertiary);">${(m.revenue / 1000000).toFixed(0)}M</span>
                  <div style="
                    width: 100%;
                    height: ${heightPct}%;
                    background: linear-gradient(180deg, #2ed573, #7bed9f);
                    border-radius: 6px 6px 2px 2px;
                    min-height: 8px;
                    transition: height 0.5s ease;
                  "></div>
                  <span style="font-size: 0.75rem; color: var(--text-tertiary); font-weight: 600;">${m.month}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">📊 KPI & Kinh Doanh</h1>
        <div class="page__actions">
          <span style="color: var(--text-secondary); font-size: 0.9rem;">
            Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}
          </span>
        </div>
      </div>
      <div class="page__content">
        ${renderKPICards()}
        ${renderPlatformTable()}
        ${renderMonthlyTrend()}
      </div>
    </div>
  `;
}

export function init() {
  // KPI page is mostly static display, no interactive elements needed
}

export function destroy() {}
