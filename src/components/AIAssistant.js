import { getState } from '../state.js';
import { navigateTo } from '../router.js';

let isChatOpen = false;

export function initAIAssistant() {
  const html = `
    <!-- Floating Action Button -->
    <button id="ai-fab" class="ai-fab shadow-lg" title="Hỏi trợ lý AI">
      <span class="ai-icon">🤖</span>
    </button>

    <!-- Chat Window -->
    <div id="ai-chat-window" class="ai-chat-window shadow-xl hidden">
      <div class="ai-chat-header">
        <div class="flex items-center gap-sm">
          <span class="ai-icon-small">🤖</span>
          <div>
            <div class="ai-title">BIM Assistant</div>
            <div class="ai-status">Đang hoạt động</div>
          </div>
        </div>
        <button id="ai-close-btn" class="ai-close-btn">✕</button>
      </div>
      
      <div id="ai-chat-body" class="ai-chat-body">
        <div class="ai-message ai-system">
          Xin chào! Tôi là Trợ lý ảo AI nội bộ của BIM TransPM. 
          Tôi đã đọc toàn bộ dữ liệu dự án của bạn.<br><br>
          Bạn có thể hỏi tôi những câu như:<br>
          <i>- "Dự án nào đang bị trễ hạn?"</i><br>
          <i>- "Có bao nhiêu dự án giao thông?"</i><br>
          <i>- "Tình trạng nguồn lực hiện tại ra sao?"</i>
        </div>
      </div>
      
      <div class="ai-chat-footer">
        <input type="text" id="ai-input" class="ai-input form-input" placeholder="Nhập câu hỏi của bạn..." autocomplete="off">
        <button id="ai-send-btn" class="ai-send-btn">➤</button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);

  const fab = document.getElementById('ai-fab');
  const chatWindow = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-close-btn');
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send-btn');

  fab.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    chatWindow.classList.toggle('hidden', !isChatOpen);
    if (isChatOpen) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    isChatOpen = false;
    chatWindow.classList.add('hidden');
  });

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    
    appendMessage('user', text);
    input.value = '';
    
    // Simulate thinking delay
    setTimeout(() => {
      const response = processQuery(text);
      appendMessage('system', response);
    }, 600);
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function appendMessage(sender, text) {
  const body = document.getElementById('ai-chat-body');
  const className = sender === 'user' ? 'ai-user' : 'ai-system';
  
  const msgHtml = `<div class="ai-message animate-fade-in ${className}">${text}</div>`;
  body.insertAdjacentHTML('beforeend', msgHtml);
  
  body.scrollTop = body.scrollHeight;
}

/**
 * Super simple NLP mock based on keyword matching against live state
 */
function processQuery(query) {
  const { projects, personnel } = getState();
  const q = query.toLowerCase();

  // Keyword: trễ hạn, quá hạn, overdue
  if (q.includes('trễ') || q.includes('quá hạn') || q.includes('chậm')) {
    const overdue = projects.filter(p => p.status === 'overdue');
    if (overdue.length === 0) {
      return '🎉 Tuyệt vời! Hiện tại không có dự án nào bị trễ hạn cả.';
    }
    const list = overdue.map(p => `<b>${p.name}</b> (${p.progress}%)`).join('<br>');
    return `⚠️ Hiện đang có <b>${overdue.length}</b> dự án bị trễ hạn:<br>${list}<br><br>Bạn nên kiểm tra lại tài nguyên cho các dự án này.`;
  }

  // Keyword: giao thông, đường bộ, cầu
  if (q.includes('giao thông') || q.includes('đường') || q.includes('cầu')) {
    const infra = projects.filter(p => p.type === 'road' || p.type === 'bridge');
    return `🏗️ Bạn đang quản lý <b>${infra.length}</b> dự án hạ tầng giao thông (Cầu/Đường). Chiếm ${(infra.length / projects.length * 100).toFixed(0)}% tổng số dự án.`;
  }

  // Keyword: hoàn thành, xong
  if (q.includes('hoàn thành') || q.includes('xong')) {
    const completed = projects.filter(p => p.status === 'completed');
    return `✅ Đã có <b>${completed.length}</b> dự án được hoàn thành trong hệ thống.`;
  }

  // Keyword: nhân sự, nguồn lực
  if (q.includes('nhân sự') || q.includes('nguồn lực') || q.includes('người')) {
    return `👥 Hệ thống hiện có <b>${personnel.length}</b> nhân sự đang hoạt động trong các dự án. Đội ngũ thiết kế chiếm phần lớn thời gian làm việc.`;
  }

  // Keyword: health, chất lượng
  if (q.includes('health') || q.includes('chất lượng')) {
    const avgHealth = Math.round(projects.reduce((s, p) => s + p.modelHealth, 0) / (projects.length || 1));
    return `💚 Chỉ số Model Health trung bình của toàn hệ thống là <b>${avgHealth}%</b>. ${avgHealth > 70 ? 'Đây là mức rất tốt!' : 'Cần cải thiện thêm.'}`;
  }

  // Fallback
  return `🤔 Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn có thể hỏi các câu liên quan đến: <br>- Tiến độ dự án (trễ hạn/hoàn thành)<br>- Phân bổ nguồn lực<br>- Chỉ số chất lượng mô hình.`;
}
