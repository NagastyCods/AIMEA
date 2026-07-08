// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Get user location
const getUserLocation = () => {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address (optional - using a simple API)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
            .then(res => res.json())
            .then(data => {
              resolve({
                latitude,
                longitude,
                address: data.address?.city || data.address?.town || 'Location detected'
              });
            })
            .catch(() => {
              resolve({
                latitude,
                longitude,
                address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              });
            });
        },
        () => {
          resolve({
            latitude: null,
            longitude: null,
            address: 'Location permission denied'
          });
        }
      );
    } else {
      resolve({
        latitude: null,
        longitude: null,
        address: 'Geolocation not supported'
      });
    }
  });
};

// Load emergency history on page load
const loadEmergencyHistory = async () => {
  try {
    const token = getToken();
    if (!token) return;

    const res = await fetch('/api/emergency-history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return;

    const history = await res.json();
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<li>No emergency incidents recorded</li>';
      return;
    }

    history.slice(0, 5).forEach(incident => {
      const date = new Date(incident.createdAt).toLocaleDateString();
      const time = new Date(incident.createdAt).toLocaleTimeString();
      const status = incident.resolved ? '✅ Resolved' : '🔴 Active';
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${date} ${time}</strong> - ${status}<br>
        Symptoms: ${incident.symptoms.join(', ') || 'Not recorded'}<br>
        Severity: <span style="color: ${incident.severity === 'Critical' ? 'red' : 'orange'}">${incident.severity}</span>
      `;
      historyList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading history:', error);
  }
};

// Initialize emergency button
document.addEventListener('DOMContentLoaded', () => {
  const emergencyBtn = document.getElementById('emergencyBtn');
  const ambulanceBtn = document.getElementById('ambulanceBtn');
  const statusBox = document.getElementById('statusBox');
  const locationText = document.getElementById('locationText');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const aiResult = document.getElementById('aiResult');
  const firstAidBox = document.getElementById('firstAidBox');

  let holdStartTime = null;
  let currentLocation = null;

  // Load history
  loadEmergencyHistory();

  // ============================================
  // EMERGENCY BUTTON - HOLD FOR 3 SECONDS
  // ============================================
  if (emergencyBtn) {
    emergencyBtn.addEventListener('mousedown', () => {
      holdStartTime = Date.now();
      emergencyBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a6f)';
      emergencyBtn.textContent = 'HOLDING... 3s';
    });

    emergencyBtn.addEventListener('mouseup', () => {
      const holdTime = Date.now() - holdStartTime;
      holdStartTime = null;

      if (holdTime >= 3000) {
        activateEmergency(true);
      } else {
        emergencyBtn.style.background = '';
        emergencyBtn.textContent = 'HOLD 3 SECONDS TO ACTIVATE';
      }
    });

    emergencyBtn.addEventListener('mouseleave', () => {
      if (holdStartTime) {
        emergencyBtn.style.background = '';
        emergencyBtn.textContent = 'HOLD 3 SECONDS TO ACTIVATE';
        holdStartTime = null;
      }
    });

    // Touch support for mobile
    emergencyBtn.addEventListener('touchstart', () => {
      holdStartTime = Date.now();
      emergencyBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a6f)';
      emergencyBtn.textContent = 'HOLDING... 3s';
    });

    emergencyBtn.addEventListener('touchend', () => {
      if (holdStartTime) {
        const holdTime = Date.now() - holdStartTime;
        holdStartTime = null;

        if (holdTime >= 3000) {
          activateEmergency(true);
        } else {
          emergencyBtn.style.background = '';
          emergencyBtn.textContent = 'HOLD 3 SECONDS TO ACTIVATE';
        }
      }
    });
  }

  // ============================================
  // GET LOCATION
  // ============================================
  const getLocationBtn = document.querySelector('.location-box button') || 
                         document.createElement('button');
  if (!document.querySelector('.location-box button')) {
    const locationBox = document.querySelector('.location-box');
    if (locationBox) {
      getLocationBtn.textContent = 'Get My Location';
      getLocationBtn.style.marginTop = '10px';
      locationBox.appendChild(getLocationBtn);
    }
  }

  if (getLocationBtn) {
    getLocationBtn.addEventListener('click', async () => {
      getLocationBtn.textContent = 'Getting location...';
      getLocationBtn.disabled = true;
      currentLocation = await getUserLocation();
      locationText.textContent = currentLocation.address;
      getLocationBtn.textContent = 'Location Updated ✓';
      setTimeout(() => {
        getLocationBtn.disabled = false;
        getLocationBtn.textContent = 'Get My Location';
      }, 2000);
    });
  }

  // ============================================
  // ANALYZE EMERGENCY
  // ============================================
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const selectedSymptoms = Array.from(
        document.querySelectorAll('.symptom-box input[type="checkbox"]:checked')
      ).map(cb => cb.value);

      if (selectedSymptoms.length === 0) {
        alert('Please select at least one symptom');
        return;
      }

      // Get location if not already retrieved
      if (!currentLocation) {
        currentLocation = await getUserLocation();
        locationText.textContent = currentLocation.address;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analyzing...';
      aiResult.innerHTML = '<p>Processing emergency...</p>';

      try {
        const token = getToken();
        const symptomText = selectedSymptoms.join(', ');

        // Call AI endpoint
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Emergency: Patient experiencing ${symptomText}. Location: ${currentLocation.address}`
          })
        });

        const data = await res.json();
        aiResult.innerHTML = `<h3>AI Medical Assessment</h3><p>${data.reply}</p>`;
        firstAidBox.innerHTML = '<h3>First Aid Instructions</h3><p>Follow the AI guidance above. If condition worsens, call emergency services immediately.</p>';

        // Save to emergency history
        await saveEmergencyIncident(selectedSymptoms, symptomText, currentLocation, false);
        loadEmergencyHistory();

      } catch (error) {
        console.error('Error:', error);
        aiResult.innerHTML = '<p style="color: red;">Error analyzing emergency. Please try again.</p>';
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Emergency';
      }
    });
  }

  // ============================================
  // ACTIVATE EMERGENCY PROTOCOL
  // ============================================
  const activateEmergency = async (requestAmbulance = false) => {
    emergencyBtn.disabled = true;
    ambulanceBtn.disabled = true;
    statusBox.textContent = 'Status: EMERGENCY ACTIVATED 🚨';
    statusBox.style.color = 'red';
    statusBox.style.fontWeight = 'bold';

    // Get location
    if (!currentLocation) {
      currentLocation = await getUserLocation();
      locationText.textContent = currentLocation.address;
    }

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('symptoms', 'Emergency SOS Activated');
      formData.append('userDescription', 'User activated emergency SOS button');
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
      formData.append('address', currentLocation.address);
      formData.append('severity', 'Critical');
      formData.append('requestAmbulance', requestAmbulance);

      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      const ambulanceText = requestAmbulance ? ' and ambulance requested' : '';
      statusBox.textContent = `Status: EMERGENCY TEAM NOTIFIED ✓${ambulanceText}`;

      // Show a softer status update message
      const userMessage = requestAmbulance
        ? 'Ambulance requested and emergency team notified.'
        : 'Emergency team notified. Contacting response unit.';
      const successBanner = document.createElement('div');
      successBanner.textContent = `✅ ${userMessage}`;
      successBanner.style.marginTop = '10px';
      successBanner.style.padding = '10px';
      successBanner.style.borderRadius = '8px';
      successBanner.style.background = '#e8f5e9';
      successBanner.style.color = '#2e7d32';
      successBanner.style.fontWeight = '600';
      statusBox.parentElement?.appendChild(successBanner);
      setTimeout(() => successBanner.remove(), 5000);

      // Reload history
      loadEmergencyHistory();

    } catch (error) {
      console.error('Error triggering emergency:', error);
      statusBox.textContent = 'Status: EMERGENCY ALERT FAILED ✗';
    }

    setTimeout(() => {
      emergencyBtn.disabled = false;
      ambulanceBtn.disabled = false;
      emergencyBtn.style.background = '';
      emergencyBtn.textContent = 'HOLD 3 SECONDS TO ACTIVATE';
      statusBox.textContent = 'Status: Inactive';
      statusBox.style.color = '';
    }, 5000);
  };

  // ============================================
  // SAVE EMERGENCY INCIDENT
  // ============================================
  const saveEmergencyIncident = async (symptoms, description, location, requestAmbulance = false) => {
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('symptoms', symptoms.join(','));
      formData.append('userDescription', description);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('address', location.address);
      formData.append('severity', 'Medium');
      formData.append('requestAmbulance', requestAmbulance);

      await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
    } catch (error) {
      console.error('Error saving incident:', error);
    }
  };

  if (ambulanceBtn) {
    ambulanceBtn.addEventListener('click', () => {
      activateEmergency(true);
    });
  }
});
