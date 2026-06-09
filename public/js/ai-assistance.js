// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Check authentication
const checkAuth = () => {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return token;
};

// Format timestamp
const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const token = checkAuth();
  if (!token) return;

  const chatBox = document.getElementById('chat-box');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.querySelector('.send-btn');
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const alertBanner = document.getElementById('alert-banner');
  const speakerBtn = document.querySelector('.speaker');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('history-list');
  const historyToggle = document.getElementById('historyToggle');

  let selectedFile = null;
  let isListening = false;
  let chatHistory = [];
  let currentSession = null;

  const getSessionTitle = (session) => {
    const firstUser = session.messages?.find(msg => msg.role === 'user');
    return firstUser ? firstUser.text.slice(0, 40) : session.title || 'AI Chat';
  };

  const formatSessionTime = (isoString) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderSessionMessages = (session) => {
    chatBox.innerHTML = '';
    if (!session || !session.messages?.length) {
      renderWelcomeMessage();
      return;
    }

    session.messages.forEach((message) => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${message.role === 'user' ? 'user-message' : 'ai-message'}`;
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${message.text}</p>
          ${message.imageUrl ? `<img src="${message.imageUrl}" style="max-width: 200px; margin-top: 10px; border-radius: 8px;">` : ''}
          <span class="message-time">${formatTime(new Date(message.createdAt))}</span>
        </div>
      `;
      chatBox.appendChild(messageDiv);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  const renderHistoryList = () => {
    if (!historyList) return;

    historyList.innerHTML = '';

    if (!chatHistory.length) {
      historyList.innerHTML = '<p class="history-empty">No previous chats yet. Start a new conversation.</p>';
      return;
    }

    chatHistory.forEach((session) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      if (currentSession && session._id === currentSession._id) {
        item.classList.add('active');
      }
      item.innerHTML = `
        <h3>${getSessionTitle(session)}</h3>
        <p>${session.messages?.length || 0} messages</p>
        <time>${formatSessionTime(session.createdAt)}</time>
      `;
      item.addEventListener('click', async () => {
        await loadSessionById(session._id);
        if (window.innerWidth <= 900 && historyPanel) {
          historyPanel.classList.add('mobile-hidden');
          historyToggle.textContent = 'Show';
        }
      });
      historyList.appendChild(item);
    });
  };

  const syncHistorySession = (session) => {
    const index = chatHistory.findIndex(item => item._id === session._id);
    if (index !== -1) {
      chatHistory[index] = session;
    } else {
      chatHistory.unshift(session);
    }
    currentSession = session;
    renderHistoryList();
  };

  const loadSessionById = async (sessionId) => {
    try {
      const res = await fetch(`/api/chat-history/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Unable to load session');
      const session = await res.json();
      currentSession = session;
      renderSessionMessages(session);
      renderHistoryList();
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const res = await fetch('/api/chat-history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch chat history');
      chatHistory = await res.json();
      currentSession = chatHistory[0] || null;
      renderHistoryList();
      renderSessionMessages(currentSession);
    } catch (error) {
      console.error('Error loading chat history:', error);
      renderWelcomeMessage();
    }
  };

  const renderWelcomeMessage = () => {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'chat-message ai-message';
    welcomeDiv.innerHTML = `
      <div class="message-content">
        <p><strong>Welcome to AIMEA Medical Assistant!</strong></p>
        <p>I'm here to help with first aid guidance. Describe your symptoms or upload an image for analysis.</p>
        <p style="color: #ff4444; font-weight: bold;">⚠️ For life-threatening emergencies, call 911 immediately.</p>
        <span class="message-time">${formatTime(new Date())}</span>
      </div>
    `;
    chatBox.appendChild(welcomeDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  const newChatBtn = document.getElementById('newChatBtn');

  const startNewChat = () => {
    currentSession = null;
    chatBox.innerHTML = '';
    renderWelcomeMessage();
    renderHistoryList();
    if (window.innerWidth <= 900 && historyPanel) {
      historyPanel.classList.add('mobile-hidden');
      historyToggle.textContent = 'Show';
    }
  };

  const showHistoryMobileBtn = document.getElementById('showHistoryMobileBtn');
  const newChatMobileBtn = document.getElementById('newChatMobileBtn');

  const toggleHistoryPanel = () => {
    if (!historyPanel) return;
    historyPanel.classList.toggle('mobile-hidden');
    if (historyToggle) {
      historyToggle.textContent = historyPanel.classList.contains('mobile-hidden') ? 'Show' : 'Hide';
    }
    if (showHistoryMobileBtn) {
      showHistoryMobileBtn.textContent = historyPanel.classList.contains('mobile-hidden') ? 'History' : 'Hide History';
    }
  };

  if (historyToggle && historyPanel) {
    historyToggle.addEventListener('click', toggleHistoryPanel);
  }

  if (showHistoryMobileBtn) {
    showHistoryMobileBtn.addEventListener('click', toggleHistoryPanel);
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', startNewChat);
  }

  if (newChatMobileBtn) {
    newChatMobileBtn.addEventListener('click', startNewChat);
  }

  // ============================================
  // IMAGE UPLOAD
  // ============================================
  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ============================================
  // REMOVE IMAGE
  // ============================================
  window.removeImage = () => {
    selectedFile = null;
    imagePreview.classList.add('hidden');
    imageInput.value = '';
  };

  // ============================================
  // SEND MESSAGE
  // ============================================
  const sendMessage = async () => {
    const message = chatInput.value.trim();

    if (!message && !selectedFile) {
      return;
    }

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    userMessageDiv.innerHTML = `
      <div class="message-content">
        <p>${message || 'Sent an image'}</p>
        ${selectedFile ? `<img src="${previewImg.src}" style="max-width: 200px; margin-top: 10px; border-radius: 8px;">` : ''}
        <span class="message-time">${formatTime(new Date())}</span>
      </div>
    `;
    chatBox.appendChild(userMessageDiv);

    // Disable send button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      const formData = new FormData();
      formData.append('message', message);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }
      if (currentSession && currentSession._id) {
        formData.append('sessionId', currentSession._id);
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      // Add AI response to chat
      const aiMessageDiv = document.createElement('div');
      aiMessageDiv.className = 'chat-message ai-message';

      // Check for critical keywords
      const criticalKeywords = ['life-threatening', 'call emergency', '911', 'cardiac', 'severe', 'unconscious', 'critical'];
      const isCritical = criticalKeywords.some(keyword => 
        data.reply.toLowerCase().includes(keyword)
      );

      if (isCritical) {
        alertBanner.style.display = 'block';
      }

      aiMessageDiv.innerHTML = `
        <div class="message-content">
          <p>${data.reply}</p>
          <span class="message-time">${formatTime(new Date())}</span>
        </div>
      `;
      chatBox.appendChild(aiMessageDiv);

      if (data.session) {
        syncHistorySession(data.session);
      }

      chatBox.scrollTop = chatBox.scrollHeight;

      // Clear inputs
      chatInput.value = '';
      removeImage();

    } catch (error) {
      console.error('Error sending message:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'chat-message error-message';
      errorDiv.innerHTML = `
        <div class="message-content">
          <p style="color: red;">Error: Unable to get response. Please try again.</p>
        </div>
      `;
      chatBox.appendChild(errorDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      chatInput.focus();
    }
  };

  // ============================================
  // SEND BUTTON CLICK
  // ============================================
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // ============================================
  // ENTER KEY TO SEND
  // ============================================
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ============================================
  // SPEECH RECOGNITION
  // ============================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (speakerBtn && SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    speakerBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        isListening = false;
        speakerBtn.style.color = '#666';
      } else {
        recognition.start();
        isListening = true;
        speakerBtn.style.color = '#ff4444';
      }
    });

    recognition.addEventListener('result', (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        chatInput.value = finalTranscript;
      } else if (interimTranscript) {
        chatInput.value = interimTranscript;
      }
    });

    recognition.addEventListener('end', () => {
      isListening = false;
      speakerBtn.style.color = '#666';
    });
  } else if (speakerBtn) {
    speakerBtn.style.display = 'none';
  }

  // ============================================
  // LOAD CHAT HISTORY
  // ============================================
  loadChatHistory();

  // ============================================
  // AUTO-HIDE ALERT BANNER
  // ============================================
  const hideAlertBanner = () => {
    setTimeout(() => {
      alertBanner.style.display = 'none';
    }, 5000);
  };

  if (alertBanner.style.display === 'block') {
    hideAlertBanner();
  }
});
