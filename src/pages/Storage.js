const STORAGE_USED = 12.4; // GB
const STORAGE_TOTAL = 50; // GB
const STORAGE_PERCENT = Math.round((STORAGE_USED / STORAGE_TOTAL) * 100);

const FOLDERS = [
  { id: 'folder-videos', name: 'Videos', icon: '🎬', fileCount: 24, size: '8.2 GB', color: '#ff4757' },
  { id: 'folder-thumbnails', name: 'Thumbnails', icon: '🖼️', fileCount: 156, size: '1.8 GB', color: '#ffa502' },
  { id: 'folder-scripts', name: 'Scripts', icon: '📝', fileCount: 45, size: '12 MB', color: '#2ed573' },
  { id: 'folder-images', name: 'Images', icon: '📷', fileCount: 89, size: '2.1 GB', color: '#38a1ff' },
  { id: 'folder-audio', name: 'Audio', icon: '🎵', fileCount: 12, size: '320 MB', color: '#a55eea' }
];

const RECENT_FILES = [
  { name: 'Review_AI_Tools_Part3.mp4', type: 'Video', size: '1.2 GB', date: '2026-06-04', icon: '🎬', color: '#ff4757' },
  { name: 'Thumbnail_AIReview.png', type: 'Image', size: '2.4 MB', date: '2026-06-04', icon: '🖼️', color: '#ffa502' },
  { name: 'Script_TikTok_Challenge.docx', type: 'Document', size: '48 KB', date: '2026-06-03', icon: '📝', color: '#2ed573' },
  { name: 'BG_Music_Chill.mp3', type: 'Audio', size: '8.5 MB', date: '2026-06-03', icon: '🎵', color: '#a55eea' },
  { name: 'Setup_Review_Photo.jpg', type: 'Image', size: '5.1 MB', date: '2026-06-02', icon: '📷', color: '#38a1ff' }
];

const FILE_TYPE_COLORS = {
  'Video': { bg: 'rgba(255, 71, 87, 0.12)', color: '#ff4757' },
  'Image': { bg: 'rgba(56, 161, 255, 0.12)', color: '#38a1ff' },
  'Document': { bg: 'rgba(46, 213, 115, 0.12)', color: '#2ed573' },
  'Audio': { bg: 'rgba(165, 94, 234, 0.12)', color: '#a55eea' }
};

function renderStorageBar() {
  const gradientColor = STORAGE_PERCENT > 80 ? '#ff4757' : STORAGE_PERCENT > 60 ? '#ffa502' : '#6c5ce7';

  return `
    <div style="
      background: var(--bg-secondary, rgba(255,255,255,0.04));
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      margin-bottom: 1.5rem;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">💾 Dung lượng lưu trữ</div>
          <div style="font-size: 0.85rem; color: var(--text-tertiary); margin-top: 0.25rem;">Đã sử dụng ${STORAGE_USED} GB / ${STORAGE_TOTAL} GB</div>
        </div>
        <div style="
          font-size: 1.5rem;
          font-weight: 800;
          color: ${gradientColor};
        ">${STORAGE_PERCENT}%</div>
      </div>
      <div style="
        width: 100%;
        height: 12px;
        background: var(--bg-tertiary, rgba(255,255,255,0.06));
        border-radius: 6px;
        overflow: hidden;
      ">
        <div style="
          width: ${STORAGE_PERCENT}%;
          height: 100%;
          background: linear-gradient(90deg, ${gradientColor}, ${gradientColor}99);
          border-radius: 6px;
          transition: width 0.8s ease;
        "></div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
        <span style="font-size: 0.75rem; color: var(--text-tertiary);">0 GB</span>
        <span style="font-size: 0.75rem; color: var(--text-tertiary);">Còn trống: ${(STORAGE_TOTAL - STORAGE_USED).toFixed(1)} GB</span>
        <span style="font-size: 0.75rem; color: var(--text-tertiary);">${STORAGE_TOTAL} GB</span>
      </div>
    </div>
  `;
}

function renderFolderGrid() {
  return `
    <div style="margin-bottom: 2rem;">
      <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.1rem;">📁 Thư mục</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
        ${FOLDERS.map(folder => `
          <div class="content-list-item" style="cursor: pointer; text-align: center; padding: 1.25rem;" data-folder="${folder.id}">
            <div style="
              width: 56px; height: 56px;
              border-radius: 16px;
              background: ${folder.color}18;
              display: flex; align-items: center; justify-content: center;
              font-size: 1.8rem;
              margin: 0 auto 0.75rem;
            ">${folder.icon}</div>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${folder.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-tertiary);">${folder.fileCount} files · ${folder.size}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRecentFiles() {
  return `
    <div>
      <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.1rem;">🕐 Tệp gần đây</h3>
      <div style="
        background: var(--bg-secondary, rgba(255,255,255,0.04));
        border-radius: 12px;
        border: 1px solid var(--border-color, rgba(255,255,255,0.08));
        overflow: hidden;
      ">
        ${RECENT_FILES.map((file, index) => {
          const typeStyle = FILE_TYPE_COLORS[file.type] || FILE_TYPE_COLORS['Document'];
          const dateStr = new Date(file.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

          return `
            <div style="
              display: flex; align-items: center; gap: 1rem;
              padding: 1rem 1.25rem;
              ${index < RECENT_FILES.length - 1 ? 'border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.06));' : ''}
              transition: background 0.2s ease;
              cursor: pointer;
            " class="storage-file-row">
              <div style="
                width: 40px; height: 40px;
                border-radius: 10px;
                background: ${file.color}18;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.2rem;
                flex-shrink: 0;
              ">${file.icon}</div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-tertiary);">${dateStr}</div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <span style="
                  display: inline-block;
                  padding: 0.25rem 0.6rem;
                  border-radius: 6px;
                  background: ${typeStyle.bg};
                  color: ${typeStyle.color};
                  font-size: 0.75rem;
                  font-weight: 600;
                  margin-bottom: 0.25rem;
                ">${file.type}</span>
                <div style="font-size: 0.8rem; color: var(--text-tertiary);">${file.size}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">📦 Kho Lưu Trữ</h1>
        <div class="page__actions">
          <button class="btn btn--primary" id="storage-upload-btn">
            <span>📤</span> Upload
          </button>
        </div>
      </div>
      <div class="page__content">
        ${renderStorageBar()}
        ${renderFolderGrid()}
        ${renderRecentFiles()}
      </div>
    </div>
  `;
}

export function init() {
  const uploadBtn = document.getElementById('storage-upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      alert('Tính năng upload sẽ được cập nhật trong phiên bản tiếp theo!');
    });
  }

  // Hover effect for file rows
  document.querySelectorAll('.storage-file-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.background = 'rgba(255,255,255,0.03)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent';
    });
  });

  // Folder click
  document.querySelectorAll('[data-folder]').forEach(folder => {
    folder.addEventListener('click', () => {
      const folderName = folder.querySelector('div[style*="font-weight: 600"]')?.textContent || 'folder';
      alert(`Mở thư mục: ${folderName}`);
    });
  });
}

export function destroy() {}
