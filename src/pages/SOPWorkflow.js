const SOP_DATA = [
  {
    id: 'sop-1',
    title: 'Quy trình sản xuất Video YouTube',
    icon: '🎬',
    color: '#ff0000',
    bgColor: 'rgba(255, 0, 0, 0.08)',
    steps: [
      { label: 'Nghiên cứu đề tài', icon: '🔍' },
      { label: 'Viết kịch bản', icon: '✍️' },
      { label: 'Quay video', icon: '🎥' },
      { label: 'Edit', icon: '🎞️' },
      { label: 'Thumbnail', icon: '🖼️' },
      { label: 'SEO & Upload', icon: '📤' },
      { label: 'Promote', icon: '📣' }
    ]
  },
  {
    id: 'sop-2',
    title: 'Quy trình đăng bài Facebook',
    icon: '📘',
    color: '#1877f2',
    bgColor: 'rgba(24, 119, 242, 0.08)',
    steps: [
      { label: 'Chọn chủ đề', icon: '💡' },
      { label: 'Viết bài', icon: '✍️' },
      { label: 'Design hình ảnh', icon: '🎨' },
      { label: 'Review', icon: '👀' },
      { label: 'Lên lịch', icon: '📅' },
      { label: 'Đăng bài', icon: '📤' },
      { label: 'Tương tác', icon: '💬' }
    ]
  },
  {
    id: 'sop-3',
    title: 'Quy trình tạo TikTok/Shorts',
    icon: '🎵',
    color: '#00f2ea',
    bgColor: 'rgba(0, 242, 234, 0.08)',
    steps: [
      { label: 'Trend research', icon: '📊' },
      { label: 'Script ngắn', icon: '📝' },
      { label: 'Quay', icon: '🎥' },
      { label: 'Edit nhanh', icon: '⚡' },
      { label: 'Thêm nhạc/text', icon: '🎵' },
      { label: 'Đăng', icon: '📤' }
    ]
  },
  {
    id: 'sop-4',
    title: 'Quy trình Booking/Sponsorship',
    icon: '💼',
    color: '#ffa502',
    bgColor: 'rgba(255, 165, 2, 0.08)',
    steps: [
      { label: 'Nhận brief', icon: '📋' },
      { label: 'Báo giá', icon: '💰' },
      { label: 'Thỏa thuận', icon: '🤝' },
      { label: 'Sản xuất', icon: '🎬' },
      { label: 'Review với brand', icon: '👀' },
      { label: 'Đăng', icon: '📤' },
      { label: 'Báo cáo', icon: '📊' }
    ]
  }
];

function renderSOPCard(sop) {
  return `
    <div class="content-list-item" style="border-left: 4px solid ${sop.color}; padding: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
        <div style="
          width: 44px; height: 44px; border-radius: 12px;
          background: ${sop.bgColor};
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem;
        ">${sop.icon}</div>
        <div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 1.05rem;">${sop.title}</div>
          <div style="font-size: 0.8rem; color: var(--text-tertiary);">${sop.steps.length} bước</div>
        </div>
      </div>
      <div style="
        display: flex;
        align-items: center;
        gap: 0;
        overflow-x: auto;
        padding: 0.75rem 0;
        scrollbar-width: thin;
      ">
        ${sop.steps.map((step, index) => `
          <div style="display: flex; align-items: center; flex-shrink: 0;">
            <div style="
              display: flex; flex-direction: column; align-items: center;
              gap: 0.5rem; min-width: 90px;
            ">
              <div style="
                width: 42px; height: 42px;
                border-radius: 50%;
                background: ${sop.bgColor};
                border: 2px solid ${sop.color};
                display: flex; align-items: center; justify-content: center;
                font-size: 1.1rem;
                position: relative;
              ">
                ${step.icon}
                <span style="
                  position: absolute;
                  top: -6px; right: -6px;
                  width: 18px; height: 18px;
                  border-radius: 50%;
                  background: ${sop.color};
                  color: #fff;
                  font-size: 0.6rem;
                  font-weight: 700;
                  display: flex; align-items: center; justify-content: center;
                ">${index + 1}</span>
              </div>
              <span style="
                font-size: 0.75rem;
                color: var(--text-secondary);
                text-align: center;
                line-height: 1.3;
                max-width: 88px;
              ">${step.label}</span>
            </div>
            ${index < sop.steps.length - 1 ? `
              <div style="
                width: 32px; height: 2px;
                background: linear-gradient(90deg, ${sop.color}, ${sop.color}44);
                flex-shrink: 0;
                margin: 0 0.25rem;
                margin-bottom: 1.5rem;
              "></div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">⚙️ SOP Workflow</h1>
        <div class="page__actions">
          <span style="color: var(--text-secondary); font-size: 0.9rem;">
            ${SOP_DATA.length} quy trình
          </span>
        </div>
      </div>
      <div class="page__content">
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${SOP_DATA.map(sop => renderSOPCard(sop)).join('')}
        </div>
      </div>
    </div>
  `;
}

export function init() {
  // SOP page is mostly static display
}

export function destroy() {}
