// ============================================
// Creator Kit — Chat Panel Component (AI Assistant)
// ============================================

import { getState, setState, subscribe } from '../state.js';

const WELCOME_MESSAGE = {
  role: 'bot',
  text: 'Xin chào! Tôi là Trợ Lý Creator Kit. Tôi có thể giúp bạn lên kế hoạch content, phân tích hiệu suất, và đề xuất ý tưởng mới. Hãy hỏi tôi bất cứ điều gì! 🚀',
  time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
};

const SYSTEM_PROMPT = 'Bạn là Trợ Lý Creator Kit, một trợ lý AI chuyên hỗ trợ content creator Việt Nam. Hãy trả lời bằng tiếng Việt, ngắn gọn và hữu ích. Hỗ trợ: lên kế hoạch content, viết kịch bản, phân tích xu hướng, đề xuất ý tưởng.';

/**
 * Get stored API key
 */
function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

/**
 * Save API key
 */
function saveApiKey(key) {
  localStorage.setItem('gemini_api_key', key);
  setState('geminiApiKey', key);
}

/**
 * Get or initialize chat messages
 */
function getChatMessages() {
  const state = getState();
  let messages = state.chatMessages;
  if (!messages || messages.length === 0) {
    messages = [WELCOME_MESSAGE];
    setState('chatMessages', messages);
  }
  return messages;
}

/**
 * Render a single chat message bubble
 */
function renderMessage(msg) {
  const roleClass = msg.role === 'bot' ? 'chat__message--bot' : 'chat__message--user';
  const avatarContent = msg.role === 'bot' ? '🤖' : '👤';

  return `
    <div class="chat__message ${roleClass}">
      <div class="chat__message-avatar">${avatarContent}</div>
      <div class="chat__message-content">
        <div class="chat__message-bubble">${formatMessageText(msg.text)}</div>
        <div class="chat__message-time">${msg.time || ''}</div>
      </div>
    </div>
  `;
}

/**
 * Basic markdown-like formatting for chat messages
 */
function formatMessageText(text) {
  if (!text) return '';
  // Escape HTML
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Bold
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Line breaks
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

/**
 * Render the entire chat panel
 */
export function renderChatPanel() {
  const messages = getChatMessages();
  const apiKey = getApiKey();

  const messagesHTML = messages.map(renderMessage).join('');

  return `
    <div class="chat" id="chat-widget">
      <div class="chat__header">
        <div class="chat__header-info">
          <div class="chat__header-avatar">🤖</div>
          <div>
            <div class="chat__header-name">Trợ Lý Creator</div>
            <div class="chat__header-status">
              <span class="chat__header-status-dot"></span>
              Đã kết nối
            </div>
          </div>
        </div>
        <button class="chat__toggle" id="chat-toggle-btn" title="Đóng trợ lý">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="chat__messages" id="chat-messages">
        ${messagesHTML}
      </div>

      <div class="chat__input-area">
        <form class="chat__input-form" id="chat-form">
          <textarea class="chat__input" id="chat-input" placeholder="Hỏi Trợ Lý Creator..." rows="1"></textarea>
          <button type="submit" class="chat__send-btn" id="chat-send-btn" title="Gửi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      <div class="chat__settings" id="chat-settings">
        <form class="chat__api-key-form" id="chat-api-key-form">
          <label for="gemini-api-key">🔑 Gemini API Key</label>
          <div class="chat__api-key-row">
            <input type="password" id="gemini-api-key" class="chat__input" 
                   placeholder="Nhập API key..." value="${apiKey}" />
            <button type="submit" class="btn btn--primary btn--sm">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Attach chat panel event listeners
 */
export function initChatPanel() {
  const chatPanel = document.getElementById('chat-panel');

  // Toggle button
  const toggleBtn = document.getElementById('chat-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      setState('chatPanelOpen', false);
    });
  }

  // Send message form
  const form = document.getElementById('chat-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage();
    });
  }

  // Textarea enter to send (shift+enter for newline)
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  // API key form
  const apiForm = document.getElementById('chat-api-key-form');
  if (apiForm) {
    apiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const keyInput = document.getElementById('gemini-api-key');
      if (keyInput && keyInput.value.trim()) {
        saveApiKey(keyInput.value.trim());
        addBotMessage('✅ API key đã được lưu thành công! Bạn có thể bắt đầu trò chuyện.');
      }
    });
  }

  // Subscribe to chat panel open/close state
  subscribe((key, value, fullState) => {
    if (key === 'chatPanelOpen') {
      if (chatPanel) {
        chatPanel.classList.toggle('chat-panel--open', value);
      }
      // Scroll to bottom when opening
      if (value) {
        scrollChatToBottom();
      }
    }
    if (key === 'chatMessages') {
      renderMessages();
      scrollChatToBottom();
    }
  });
}

/**
 * Handle sending a user message
 */
async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Add user message
  const userMsg = {
    role: 'user',
    text: text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };

  const state = getState();
  const messages = [...(state.chatMessages || []), userMsg];
  setState('chatMessages', messages);

  // Save to localStorage
  saveChatToStorage(messages);

  // Intercept special intents for Daily Briefing and End Day Report
  const textLower = text.toLowerCase();
  if (textLower.includes('bắt đầu ngày mới') || textLower.includes('demo 1')) {
    addTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      addBotMessage(generateDailyBriefing());
    }, 1000);
    return;
  }

  if (textLower.includes('kết thúc ngày làm việc') || textLower.includes('demo 2')) {
    addTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      addBotMessage(generateEndDayReport());
    }, 1000);
    return;
  }

  // Check API key
  const apiKey = getApiKey();
  if (!apiKey) {
    addBotMessage('⚠️ Vui lòng nhập Gemini API key ở phần cài đặt bên dưới để sử dụng trợ lý AI.');
    return;
  }

  // Show typing indicator
  addTypingIndicator();

  // Call Gemini API
  try {
    const response = await callGeminiAPI(text, apiKey);
    removeTypingIndicator();
    addBotMessage(response);
  } catch (error) {
    removeTypingIndicator();
    addBotMessage(`❌ Lỗi: ${error.message || 'Không thể kết nối với Gemini API. Vui lòng kiểm tra API key và thử lại.'}`);
  }
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(userMessage, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{
        text: `${SYSTEM_PROMPT}\n\nNgười dùng: ${userMessage}`
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}: Lỗi từ API`);
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Không nhận được phản hồi từ AI.');
}

/**
 * Add a bot message to the chat
 */
function addBotMessage(text) {
  const state = getState();
  const msg = {
    role: 'bot',
    text: text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  const messages = [...(state.chatMessages || []), msg];
  setState('chatMessages', messages);
  saveChatToStorage(messages);
}

/**
 * Render messages in the chat container
 */
function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const state = getState();
  const messages = state.chatMessages || [];
  container.innerHTML = messages.map(renderMessage).join('');
}

/**
 * Scroll chat to bottom
 */
function scrollChatToBottom() {
  requestAnimationFrame(() => {
    const container = document.getElementById('chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}

/**
 * Add typing indicator
 */
function addTypingIndicator() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const indicator = document.createElement('div');
  indicator.id = 'chat-typing';
  indicator.className = 'chat__message chat__message--bot';
  indicator.innerHTML = `
    <div class="chat__message-avatar">🤖</div>
    <div class="chat__message-content">
      <div class="chat__message-bubble chat__typing">
        <span class="chat__typing-dot"></span>
        <span class="chat__typing-dot"></span>
        <span class="chat__typing-dot"></span>
      </div>
    </div>
  `;
  container.appendChild(indicator);
  scrollChatToBottom();
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('chat-typing');
  if (indicator) indicator.remove();
}

/**
 * Persist chat messages to localStorage
 */
function saveChatToStorage(messages) {
  try {
    localStorage.setItem('creator_kit_chat', JSON.stringify(messages));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Generate Daily Briefing Report
 */
function generateDailyBriefing() {
  const state = getState();
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  
  const todayDisplay = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });

  // Get today's content
  const todayContents = (state.contents || []).filter(c => c.scheduledDate === todayStr);
  const projects = state.projects || [];

  let report = `**BẮT ĐẦU NGÀY MỚI - ${todayDisplay}**\nChào anh Hào Lam! Hệ thống đã được đồng bộ. Dưới đây là lịch trình và các đầu việc cần xử lý hôm nay:\n\n`;
  
  report += `📋 **LỊCH ĐĂNG HÔM NAY (${weekday}):**\n`;
  if (todayContents.length === 0) {
    report += `• Không có lịch đăng nào trong ngày hôm nay.\n`;
  } else {
    todayContents.forEach(c => {
      let statusStr = c.status === 'published' ? 'Public' : (c.status === 'draft' ? '⏳ Đang chờ quay/đăng' : c.status);
      report += `• **${c.platform.toUpperCase()}**: ${c.title} -> **${statusStr}**\n`;
    });
  }

  if (projects.length > 0) {
    report += `\n📈 **TIẾN ĐỘ DỰ ÁN & DEAL:**\n`;
    projects.forEach(p => {
      let icon = p.type === 'deal' ? '🤝' : (p.status === 'development' ? '💻' : '🎬');
      report += `• ${icon} **${p.title}**: ${p.details}\n`;
    });
  }

  report += `\n*Hãy nhắn tôi nếu anh muốn triển khai bất kỳ đầu việc nào nhé! Chúc anh ngày mới làm việc hiệu quả! 🚀*`;

  return report;
}

/**
 * Generate End of Day Report
 */
function generateEndDayReport() {
  const todayDisplay = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  let report = `**KẾT THÚC NGÀY LÀM VIỆC — ${todayDisplay}**\nBáo cáo tổng kết phiên làm việc hôm nay gửi anh Hào Lam:\n\n`;
  report += `✅ **TÁC VỤ ĐÃ HOÀN THÀNH:**\n`;
  report += `• 📅 **Lên lịch Content**: Đã chốt bài đăng (Tiềm năng kiếm tiền từ nội dung trên FB) cho ngày mai -> Trạng thái: Đã Public.\n`;
  report += `• 💡 **Lưu Ý Tưởng**: Đã thêm ý tưởng nâng cấp YT028 (Creator_Kit - trải nghiệm web tải chính) vào tab Ý Tưởng.\n`;
  
  return report;
}
