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

document.addEventListener('DOMContentLoaded', async () => {
  const token = checkAuth();
  if (!token) return;

  const emergencyList = document.getElementById('emergency-list');
  const emergencyCounter = document.getElementById('emergency-counter');
  const analysisOutput = document.getElementById('analysis-output');
  const settingsForm = document.getElementById('settings-form');
  const settingsMessage = document.getElementById('settings-message');
  const userStatus = document.getElementById('user-status');
  const symptomForm = document.getElementById('symptom-form');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const removeImageBtn = document.querySelector('.remove-image-btn');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutSecondary = document.getElementById('logout-secondary-btn');
  const voiceBtn = document.getElementById('voice-btn');
  const refreshBtn = document.getElementById('refresh-emergencies');

  let selectedFile = null;

  // ============================================
  // LOAD USER PROFILE
  // ============================================
  const loadUserProfile = async () => {
    try {
      const res = await fetch('/api/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch profile');

      const user = await res.json();
      document.getElementById('settings-username').value = user.username;
      document.getElementById('settings-email').value = user.email;
      userStatus.textContent = `Logged in as ${user.username}`;
    } catch (error) {
      console.error('Error loading profile:', error);
      userStatus.textContent = 'Error loading profile';
    }
  };

  // ============================================
  // LOAD EMERGENCY HISTORY
  // ============================================
  const loadEmergencyHistory = async () => {
    try {
      const res = await fetch('/api/emergency-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch history');

      const history = await res.json();
      emergencyList.innerHTML = '';

      if (history.length === 0) {
        emergencyList.innerHTML = '<p>No emergency incidents recorded</p>';
        emergencyCounter.textContent = '0 active';
        return;
      }

      const activeIncidents = history.filter(h => !h.resolved).length;
      emergencyCounter.textContent = `${activeIncidents} active`;

      history.slice(0, 10).forEach(incident => {
        const date = new Date(incident.createdAt).toLocaleDateString();
        const time = new Date(incident.createdAt).toLocaleTimeString();
        const symptoms = incident.symptoms.join(', ') || 'Not recorded';
        const severityColor = {
          'Critical': '#ff4444',
          'High': '#ff9900',
          'Medium': '#ffcc00',
          'Low': '#00cc00'
        }[incident.severity] || '#666';

        const li = document.createElement('div');
        li.className = 'emergency-item';
        li.innerHTML = `
          <div class="emergency-header">
            <div>
              <strong>${date} ${time}</strong>
              <span style="color: ${severityColor}; margin-left: 10px;">● ${incident.severity}</span>
            </div>
            <span>${incident.resolved ? '✅ Resolved' : '🔴 Active'}</span>
          </div>
          <div class="emergency-details">
            <p><strong>Symptoms:</strong> ${symptoms}</p>
            <p><strong>Location:</strong> ${incident.location?.address || 'Not recorded'}</p>
            ${!incident.resolved ? `<button class="btn btn-outline btn-small" onclick="resolveEmergency('${incident._id}')">Mark Resolved</button>` : ''}
          </div>
        `;
        emergencyList.appendChild(li);
      });
    } catch (error) {
      console.error('Error loading history:', error);
      emergencyList.innerHTML = '<p style="color: red;">Error loading emergency history</p>';
    }
  };

  // ============================================
  // RESOLVE EMERGENCY
  // ============================================
  window.resolveEmergency = async (emergencyId) => {
    try {
      const res = await fetch(`/api/emergency-history/${emergencyId}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to resolve emergency');

      alert('Emergency marked as resolved');
      loadEmergencyHistory();
    } catch (error) {
      console.error('Error:', error);
      alert('Error resolving emergency');
    }
  };

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

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      selectedFile = null;
      imagePreview.classList.add('hidden');
      imageInput.value = '';
    });
  }

  // ============================================
  // ANALYZE SYMPTOMS
  // ============================================
  if (symptomForm) {
    symptomForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const symptomsInput = document.getElementById('symptoms-input').value.trim();

      if (!symptomsInput && !selectedFile) {
        alert('Please enter symptoms or upload an image');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('message', symptomsInput || 'Please analyze this image');
        if (selectedFile) {
          formData.append('image', selectedFile);
        }

        analysisOutput.textContent = 'Analyzing...';

        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) throw new Error('Failed to analyze');

        const data = await res.json();
        analysisOutput.innerHTML = `
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <p>${data.reply}</p>
          </div>
        `;

        // Clear form
        document.getElementById('symptoms-input').value = '';
        if (removeImageBtn) removeImageBtn.click();

      } catch (error) {
        console.error('Error:', error);
        analysisOutput.innerHTML = '<p style="color: red;">Error analyzing symptoms. Please try again.</p>';
      }
    });
  }

  // ============================================
  // SPEECH RECOGNITION
  // ============================================
  if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      let isListening = false;

      voiceBtn.addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
          isListening = false;
          voiceBtn.style.color = '#666';
        } else {
          recognition.start();
          isListening = true;
          voiceBtn.style.color = '#ff4444';
        }
      });

      recognition.addEventListener('result', (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (event.results[event.results.length - 1].isFinal) {
          document.getElementById('symptoms-input').value += transcript;
        }
      });

      recognition.addEventListener('end', () => {
        isListening = false;
        voiceBtn.style.color = '#666';
      });
    } else {
      voiceBtn.style.display = 'none';
    }
  }

  // ============================================
  // UPDATE SETTINGS
  // ============================================
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('settings-username').value.trim();
      const email = document.getElementById('settings-email').value.trim();
      const password = document.getElementById('settings-password').value.trim();

      if (!username || !email) {
        alert('Username and email are required');
        return;
      }

      try {
        const res = await fetch('/api/user', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email,
            password: password || undefined
          })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        settingsMessage.innerHTML = '<p style="color: green;">✓ Profile updated successfully</p>';
        settingsMessage.style.display = 'block';

        setTimeout(() => {
          settingsMessage.style.display = 'none';
        }, 3000);

        loadUserProfile();
      } catch (error) {
        console.error('Error:', error);
        settingsMessage.innerHTML = `<p style="color: red;">✗ Error: ${error.message}</p>`;
        settingsMessage.style.display = 'block';
      }
    });
  }

  // ============================================
  // LOGOUT
  // ============================================
  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  };

  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  if (logoutSecondary) logoutSecondary.addEventListener('click', logout);

  // ============================================
  // REFRESH EMERGENCIES
  // ============================================
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadEmergencyHistory);
  }

  // ============================================
  // INITIALIZE
  // ============================================
  loadUserProfile();
  loadEmergencyHistory();
});
