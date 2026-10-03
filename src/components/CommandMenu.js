import { getState, setState } from '../state.js';
import { navigateTo } from '../router.js';

let isMenuOpen = false;

export function initCommandMenu() {
  // Create UI
  const menuHTML = `
    <div id="cmd-menu-overlay" class="cmd-menu-overlay hidden">
      <div class="cmd-menu-container animate-scale-in">
        <div class="cmd-menu-header">
          <span class="cmd-icon">🔍</span>
          <input type="text" id="cmd-menu-input" placeholder="Bạn muốn làm gì? (Gõ tên dự án, lệnh...)" autocomplete="off">
          <span class="cmd-esc">ESC</span>
        </div>
        <div class="cmd-menu-results" id="cmd-menu-results">
          <!-- Results will be injected here -->
        </div>
        <div class="cmd-menu-footer">
          <span>Sử dụng <b>↑</b> <b>↓</b> để điều hướng</span>
          <span><b>Enter</b> để chọn</span>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', menuHTML);

  const overlay = document.getElementById('cmd-menu-overlay');
  const input = document.getElementById('cmd-menu-input');
  
  // Listen for Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCommandMenu();
    }
    
    // Close on ESC
    if (e.key === 'Escape' && isMenuOpen) {
      toggleCommandMenu();
    }
  });

  // Close on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      toggleCommandMenu();
    }
  });

  // Close on ESC button click
  const escBtn = document.querySelector('.cmd-esc');
  if (escBtn) {
    escBtn.style.cursor = 'pointer';
    escBtn.addEventListener('click', () => {
      if (isMenuOpen) toggleCommandMenu();
    });
  }

  // Handle input changes
  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // Handle keyboard navigation
  input.addEventListener('keydown', handleKeyboardNav);
}

function toggleCommandMenu() {
  const overlay = document.getElementById('cmd-menu-overlay');
  const input = document.getElementById('cmd-menu-input');
  
  isMenuOpen = !isMenuOpen;
  
  if (isMenuOpen) {
    overlay.classList.remove('hidden');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 50);
  } else {
    overlay.classList.add('hidden');
  }
}

function getCommands() {
  const { projects, theme } = getState();
  
  const commands = [
    {
      id: 'cmd-theme',
      title: `Chuyển sang giao diện ${theme === 'dark' ? 'Sáng' : 'Tối'}`,
      icon: theme === 'dark' ? '🌞' : '🌙',
      category: 'Hệ thống',
      action: () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setState('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        window.dispatchEvent(new Event('themeChanged'));
        
        // Update topbar button manually
        const themeBtn = document.getElementById('btn-toggle-theme');
        if (themeBtn) themeBtn.textContent = newTheme === 'dark' ? '🌞' : '🌙';
      }
    },
    {
      id: 'cmd-dashboard',
      title: 'Đi tới Tổng quan (Dashboard)',
      icon: '📊',
      category: 'Điều hướng',
      action: () => navigateTo('dashboard')
    },
    {
      id: 'cmd-resources',
      title: 'Đi tới Nguồn lực (Resources)',
      icon: '👥',
      category: 'Điều hướng',
      action: () => navigateTo('resources')
    },
    {
      id: 'cmd-quality',
      title: 'Đi tới Chất lượng (QA/QC)',
      icon: '✅',
      category: 'Điều hướng',
      action: () => navigateTo('quality')
    }
  ];

  // Add project specific commands
  projects.forEach(p => {
    commands.push({
      id: `proj-${p.id}`,
      title: `Mở dự án: ${p.name} (${p.code})`,
      icon: '🏗️',
      category: 'Dự án',
      action: () => navigateTo(`project-detail/${p.id}`)
    });
  });

  return commands;
}

let selectedIndex = 0;

function renderResults(query) {
  const container = document.getElementById('cmd-menu-results');
  const commands = getCommands();
  const lowerQuery = query.toLowerCase();
  
  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(lowerQuery) || 
    cmd.category.toLowerCase().includes(lowerQuery)
  );
  
  selectedIndex = 0; // reset selection

  if (filtered.length === 0) {
    container.innerHTML = `<div class="cmd-empty">Không tìm thấy kết quả nào cho "${query}"</div>`;
    return;
  }

  // Group by category
  const groups = {};
  filtered.forEach(cmd => {
    if (!groups[cmd.category]) groups[cmd.category] = [];
    groups[cmd.category].push(cmd);
  });

  let html = '';
  let globalIdx = 0;
  
  Object.keys(groups).forEach(category => {
    html += `<div class="cmd-group-title">${category}</div>`;
    groups[category].forEach(cmd => {
      const isSelected = globalIdx === selectedIndex ? 'selected' : '';
      html += `
        <div class="cmd-item ${isSelected}" data-index="${globalIdx}">
          <span class="cmd-item-icon">${cmd.icon}</span>
          <span class="cmd-item-title">${cmd.title}</span>
        </div>
      `;
      cmd.globalIndex = globalIdx;
      globalIdx++;
    });
  });

  container.innerHTML = html;
  
  // Store filtered flat array for keyboard exec
  container.dataset.filtered = JSON.stringify(filtered.map(c => ({ id: c.id, globalIndex: c.globalIndex })));
  
  // Bind click
  container.querySelectorAll('.cmd-item').forEach(item => {
    item.addEventListener('click', () => {
      executeCommand(parseInt(item.dataset.index), filtered);
    });
    item.addEventListener('mouseenter', () => {
      updateSelection(parseInt(item.dataset.index));
    });
  });
}

function handleKeyboardNav(e) {
  const container = document.getElementById('cmd-menu-results');
  if (!container.dataset.filtered) return;
  
  const filtered = JSON.parse(container.dataset.filtered);
  if (filtered.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % filtered.length;
    updateSelection(selectedIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length;
    updateSelection(selectedIndex);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // executeCommand requires the actual functions, so we rebuild filtered
    const commands = getCommands();
    const actualFiltered = commands.filter(c => filtered.some(f => f.id === c.id));
    executeCommand(selectedIndex, actualFiltered);
  }
}

function updateSelection(index) {
  selectedIndex = index;
  const items = document.querySelectorAll('.cmd-item');
  items.forEach(item => item.classList.remove('selected'));
  
  const target = document.querySelector(`.cmd-item[data-index="${index}"]`);
  if (target) {
    target.classList.add('selected');
    target.scrollIntoView({ block: 'nearest' });
  }
}

function executeCommand(index, filteredList) {
  const cmd = filteredList[index];
  if (cmd) {
    cmd.action();
    toggleCommandMenu();
  }
}
