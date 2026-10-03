import { PLATFORMS } from '../data/platforms.js';

const BOOKING_STATUSES = {
  'in_progress': { label: 'Đang thực hiện', color: '#38a1ff', bg: 'rgba(56, 161, 255, 0.12)' },
  'pending': { label: 'Chờ duyệt', color: '#ffa502', bg: 'rgba(255, 165, 2, 0.12)' },
  'completed': { label: 'Hoàn thành', color: '#2ed573', bg: 'rgba(46, 213, 115, 0.12)' },
  'negotiating': { label: 'Đang đàm phán', color: '#a55eea', bg: 'rgba(165, 94, 234, 0.12)' },
  'new': { label: 'Mới', color: '#ff6b81', bg: 'rgba(255, 107, 129, 0.12)' }
};

const MOCK_BOOKINGS = [
  {
    id: 'bk-1',
    brand: 'TechViet Corp',
    type: 'Video Review',
    platform: 'youtube',
    deadline: '2026-06-15',
    value: 5000000,
    status: 'in_progress',
    notes: 'Review sản phẩm công nghệ mới'
  },
  {
    id: 'bk-2',
    brand: 'GreenLife Foods',
    type: 'Bài đăng',
    platform: 'facebook',
    deadline: '2026-06-20',
    value: 2000000,
    status: 'pending',
    notes: 'Quảng cáo sản phẩm thực phẩm organic'
  },
  {
    id: 'bk-3',
    brand: 'FashionHub VN',
    type: 'Video Shorts',
    platform: 'tiktok',
    deadline: '2026-06-10',
    value: 3500000,
    status: 'completed',
    notes: 'Review bộ sưu tập mùa hè'
  },
  {
    id: 'bk-4',
    brand: 'EduStar Academy',
    type: 'Bài viết',
    platform: 'linkedin',
    deadline: '2026-06-25',
    value: 4000000,
    status: 'negotiating',
    notes: 'Series bài viết về giáo dục trực tuyến'
  },
  {
    id: 'bk-5',
    brand: 'CoffeeHouse VN',
    type: 'Thread Series',
    platform: 'threads',
    deadline: '2026-06-30',
    value: 1500000,
    status: 'new',
    notes: 'Chuỗi threads về văn hóa cà phê Việt'
  }
];

function formatCurrency(value) {
  return value.toLocaleString('vi-VN') + 'đ';
}

function renderSummaryStats() {
  const totalBookings = MOCK_BOOKINGS.length;
  const totalValue = MOCK_BOOKINGS.reduce((sum, b) => sum + b.value, 0);
  const completedCount = MOCK_BOOKINGS.filter(b => b.status === 'completed').length;

  return `
    <div class="stats-row" style="margin-bottom: 1.5rem;">
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.05));">📋</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${totalBookings}</div>
          <div class="stats-card__label">Tổng booking</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(46,213,115,0.2), rgba(46,213,115,0.05));">💰</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${formatCurrency(totalValue)}</div>
          <div class="stats-card__label">Tổng giá trị</div>
        </div>
      </div>
      <div class="stats-card">
        <div class="stats-card__icon" style="background: linear-gradient(135deg, rgba(255,165,2,0.2), rgba(255,165,2,0.05));">✅</div>
        <div class="stats-card__info">
          <div class="stats-card__value">${completedCount}/${totalBookings}</div>
          <div class="stats-card__label">Đã hoàn thành</div>
        </div>
      </div>
    </div>
  `;
}

function renderBookingTable() {
  return `
    <div style="overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color, rgba(255,255,255,0.08));">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="width: 50px;">STT</th>
            <th>Brand / Client</th>
            <th>Loại</th>
            <th>Nền tảng</th>
            <th>Deadline</th>
            <th>Giá trị</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${MOCK_BOOKINGS.map((booking, index) => {
            const platform = PLATFORMS.find(p => p.id === booking.platform) || PLATFORMS[0];
            const status = BOOKING_STATUSES[booking.status] || BOOKING_STATUSES.new;
            const deadlineDate = new Date(booking.deadline).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const isOverdue = new Date(booking.deadline) < new Date() && booking.status !== 'completed';

            return `
              <tr>
                <td style="text-align: center; font-weight: 600; color: var(--text-tertiary);">${index + 1}</td>
                <td>
                  <div style="font-weight: 600; color: var(--text-primary);">${booking.brand}</div>
                  <div style="font-size: 0.8rem; color: var(--text-tertiary);">${booking.notes}</div>
                </td>
                <td><span class="badge">${booking.type}</span></td>
                <td>
                  <span style="
                    display: inline-flex; align-items: center; gap: 0.375rem;
                    padding: 0.3rem 0.6rem; border-radius: 6px;
                    background: ${platform.bgColor}; color: ${platform.color};
                    font-size: 0.8rem; font-weight: 600;
                  ">${platform.icon} ${platform.shortName}</span>
                </td>
                <td style="${isOverdue ? 'color: #ff4757; font-weight: 600;' : ''}">${deadlineDate}</td>
                <td style="font-weight: 700; color: var(--text-primary);">${formatCurrency(booking.value)}</td>
                <td>
                  <span style="
                    display: inline-block;
                    padding: 0.35rem 0.75rem;
                    border-radius: 20px;
                    background: ${status.bg};
                    color: ${status.color};
                    font-size: 0.8rem;
                    font-weight: 600;
                  ">${status.label}</span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">💼 Quản Lý Booking</h1>
        <div class="page__actions">
          <button class="btn btn--primary" id="bm-add-btn">
            <span>＋</span> Thêm booking
          </button>
        </div>
      </div>
      <div class="page__content">
        ${renderSummaryStats()}
        ${renderBookingTable()}
      </div>
    </div>
  `;
}

export function init() {
  const addBtn = document.getElementById('bm-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      alert('Tính năng thêm booking sẽ được cập nhật trong phiên bản tiếp theo!');
    });
  }
}

export function destroy() {}
