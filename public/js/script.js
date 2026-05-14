// ==============================
// AUTHENTICATION LOGIC (LOGIN/REGISTER)
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    // LOGIN FORM
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;
            const errorDiv = document.getElementById("login-error");
            errorDiv.style.display = "none";
            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem("token", data.token);
                    window.location.href = "ai-assistance.html";
                } else {
                    errorDiv.textContent = data.message || "Login failed.";
                    errorDiv.style.display = "block";
                }
            } catch (err) {
                errorDiv.textContent = "Network error. Please try again.";
                errorDiv.style.display = "block";
            }
        });
    }

    // REGISTER FORM
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("register-username").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const errorDiv = document.getElementById("register-error");
            errorDiv.style.display = "none";
            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    window.location.href = "login.html";
                } else {
                    errorDiv.textContent = data.message || "Registration failed.";
                    errorDiv.style.display = "block";
                }
            } catch (err) {
                errorDiv.textContent = "Network error. Please try again.";
                errorDiv.style.display = "block";
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    /* ==============================
   MOBILE NAVIGATION TOGGLE
================================*/

    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.querySelector(".nav-menu");

    if (navToggle) {
        navToggle.addEventListener("click", () => {
            navToggle.classList.toggle("active");
            navMenu.classList.toggle("active");
        });
    }

    // Close menu when clicking a link (mobile)
    document.querySelectorAll(".nav-menu a").forEach(link => {
        link.addEventListener("click", () => {
            navToggle.classList.remove("active");
            navMenu.classList.remove("active");
        });
    });


    /* ==============================
       DARK MODE TOGGLE
    ================================*/

    const modeSwitch = document.querySelector(".mode-switch");

    if (modeSwitch) {
        modeSwitch.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");

            // Save preference
            const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
            localStorage.setItem("theme", currentTheme);
        });
    }

    // Load theme from storage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
    }


    /* ==============================
       SMOOTH SCROLLING
    ================================*/

    document.querySelectorAll("a[href^='#']").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });
        });
    });


    /* ==============================
       SCROLL REVEAL ANIMATION
    ================================*/

    const revealElements = document.querySelectorAll(".scroll-reveal");

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add("show");
        });
    });

    revealElements.forEach(el => scrollObserver.observe(el));


    /* ==============================
       EMERGENCY BUTTON ACTION
    ================================*/

    const emergencyBtn = document.querySelector("#emergency-btn");

    if (emergencyBtn) {
        emergencyBtn.addEventListener("click", () => {
            emergencyBtn.classList.add("clicked");

            setTimeout(() => {
                window.location.href = "emergency.html";
            }, 500);
        });
    }


    /* ==============================
       CONTACT FORM VALIDATION
    ================================*/

    const contactForm = document.querySelector("#contact-form");

    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const name = document.querySelector("#name").value.trim();
            const email = document.querySelector("#email").value.trim();
            const message = document.querySelector("#message").value.trim();

            if (!name || !email || !message) {
                alert("⚠ Please fill all fields before submitting.");
                return;
            }

            alert("✔ Message sent successfully!");
            contactForm.reset();
        });
    }


    /* ==============================
       AI CHAT — FRONTEND HANDLER
    ================================*/
    // show image preview
    const imageInput = document.getElementById("imageInput");
    const cameraInput = document.getElementById("cameraInput");
    const previewImg = document.getElementById("previewImg");
    const imagePreview = document.getElementById("imagePreview");
    const userInput = document.getElementById("chat-input");
    const sendBtn = document.querySelector(".send-btn");
    if(userInput){
        userInput.addEventListener("keypress", (e) => {
            if(e.key === "Enter"){
                e.preventDefault();
                sendMessage();
            }
        })
    }
    if(sendBtn){
        sendBtn.addEventListener("click", sendMessage);
    }
    if (imageInput && cameraInput && previewImg && imagePreview) {
        imageInput.addEventListener("change", showPreview);
        cameraInput.addEventListener("change", showPreview);
    }
    function showPreview(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            previewImg.src = reader.result;
            imagePreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }

    // function to remove image
    function removeImage() {
        if (previewImg) previewImg.src = "";
        if (imagePreview) imagePreview.classList.add("hidden");
        if (imageInput) imageInput.value = "";
        if (cameraInput) cameraInput.value = "";
    }

    

    async function sendMessage() {
        // const imageInput = document.getElementById("imageInput")
        const message = userInput.value.trim();
        const imageFile = imageInput.files[0]
        const token = localStorage.getItem("token")
        if(!userInput) return
        if (!message && !imageFile) return;

        addMessage(message || "[Image sent ]", "user");
        const formData = new FormData()
        formData.append("question", message);
        if (message) {
            formData.append("message", message);
        }
        if (imageFile) {
            formData.append("image", imageFile);
        }

        userInput.value = "";
        if (imageInput) {
            imageInput.value = "";
        }
        removeImage();

        if (!token) {
            addMessage("Please log in to use the AI assistance.", "bot");
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const response = await fetch("/api/ai", {
            method: "POST",
            headers,
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            const errorMessage = data.message || data.reply || "Authentication failed. Please log in again.";
            addMessage(errorMessage, "bot");
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("token");
            }
            return;
        }

        addMessage(data.reply, "bot");
    }

    function addMessage(text, sender) {
        const chatBox = document.getElementById("chat-box");
        const div = document.createElement("div")

        div.classList.add("message", sender);
        div.innerHTML = text;

        chatBox.appendChild(div);

        // render laTex for readable content
        window.MathJax = {
            tex: {
                inlineMaths: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', "$$"]]
            },
            svg: { fontCache: 'global' }
        }
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([div])
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // -----------------------------
    // DASHBOARD USER & EMERGENCY LOGIC
    // -----------------------------
    const emergencyTemplates = [
        {
            title: 'Chest pain with sweating',
            location: 'Downtown Clinic',
            coords: '34.0522° N, 118.2437° W',
            priority: 'Critical',
            timer: 240,
            description: 'Patient reports crushing chest pain, sweating, dizziness.',
            type: 'Cardiac'
        },
        {
            title: 'Severe breathing trouble',
            location: '12th Ave Shelter',
            coords: '40.7128° N, 74.0060° W',
            priority: 'High',
            timer: 200,
            description: 'Rapid breathing, throat tightness, panic symptoms.',
            type: 'Respiratory'
        },
        {
            title: 'Head injury after fall',
            location: 'Riverside Park',
            coords: '37.7749° N, 122.4194° W',
            priority: 'Medium',
            timer: 180,
            description: 'Patient hit head on pavement and is disoriented.',
            type: 'Trauma'
        },
        {
            title: 'Minor wound infection',
            location: 'Westside Community',
            coords: '51.5074° N, 0.1278° W',
            priority: 'Low',
            timer: 120,
            description: 'Warm, red wound with swelling and mild fever.',
            type: 'Infection'
        }
    ];

    let activeEmergencies = [];
    const emergencyTimers = {};

    function logoutRedirect() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }

    async function loadUserProfile() {
        const token = localStorage.getItem('token');
        if (!token) {
            logoutRedirect();
            return;
        }

        try {
            const response = await fetch('/api/user', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                logoutRedirect();
                return;
            }
            const user = await response.json();
            const usernameInput = document.getElementById('settings-username');
            const emailInput = document.getElementById('settings-email');
            const statusLabel = document.getElementById('user-status');
            if (usernameInput) usernameInput.value = user.username || '';
            if (emailInput) emailInput.value = user.email || '';
            if (statusLabel) statusLabel.textContent = `Logged in as ${user.username}`;
        } catch (error) {
            console.error('Profile load failed:', error);
            logoutRedirect();
        }
    }

    function updateAnalysisOutput(text, error = false) {
        const output = document.getElementById('analysis-output');
        if (!output) return;
        output.textContent = text;
        output.style.color = error ? '#d32f2f' : '#111';
    }

    async function submitSettings(event) {
        event.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return logoutRedirect();

        const username = document.getElementById('settings-username')?.value.trim();
        const email = document.getElementById('settings-email')?.value.trim();
        const password = document.getElementById('settings-password')?.value.trim();
        const messageBox = document.getElementById('settings-message');

        messageBox.textContent = '';

        try {
            const response = await fetch('/api/user', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ username, email, password: password || undefined })
            });

            const result = await response.json();
            if (!response.ok) {
                messageBox.textContent = result.message || 'Unable to update profile.';
                messageBox.className = 'notification-message error';
                return;
            }
            messageBox.textContent = result.message;
            messageBox.className = 'notification-message success';
            document.getElementById('settings-password').value = '';
            loadUserProfile();
        } catch (error) {
            console.error('Update failed:', error);
            messageBox.textContent = 'Profile update failed. Please try again.';
            messageBox.className = 'notification-message error';
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateEmergencyCounter() {
        const counter = document.getElementById('emergency-counter');
        const activeCount = activeEmergencies.filter(e => e.status === 'active').length;
        if (counter) counter.textContent = `${activeCount} active`;
    }

    function renderEmergencies() {
        const list = document.getElementById('emergency-list');
        if (!list) return;
        list.innerHTML = '';

        activeEmergencies.forEach((emergency) => {
            const card = document.createElement('article');
            card.className = `emergency-card-item ${emergency.priority.toLowerCase()}`;
            card.dataset.emergencyId = emergency.id;
            card.innerHTML = `
                <div class="emergency-title">
                    <div>
                        <strong>${emergency.title}</strong>
                        <span class="priority-badge ${emergency.priority.toLowerCase()}">${emergency.priority}</span>
                    </div>
                    <small>${emergency.location}</small>
                </div>
                <p>${emergency.description}</p>
                <div class="emergency-meta">
                    <span>Type: ${emergency.type}</span>
                    <span class="countdown">ETA: <strong>${formatTime(emergency.timer)}</strong></span>
                </div>
                <div class="emergency-actions">
                    <button class="btn btn-primary accept-btn">Accept</button>
                    <button class="btn btn-danger reject-btn">Reject</button>
                </div>
            `;

            const acceptBtn = card.querySelector('.accept-btn');
            const rejectBtn = card.querySelector('.reject-btn');

            acceptBtn?.addEventListener('click', () => acceptEmergency(emergency.id));
            rejectBtn?.addEventListener('click', () => rejectEmergency(emergency.id));

            list.appendChild(card);
            startCountdown(card, emergency);
        });

        updateEmergencyCounter();
    }

    function startCountdown(card, emergency) {
        const countdownElement = card.querySelector('.countdown strong');
        if (!countdownElement) return;

        clearInterval(emergencyTimers[emergency.id]);
        emergencyTimers[emergency.id] = setInterval(() => {
            if (emergency.timer <= 0) {
                clearInterval(emergencyTimers[emergency.id]);
                emergency.status = 'expired';
                countdownElement.textContent = '00:00';
                card.classList.add('expired');
                return;
            }
            emergency.timer -= 1;
            countdownElement.textContent = formatTime(emergency.timer);
        }, 1000);
    }

    function acceptEmergency(id) {
        const emergency = activeEmergencies.find(item => item.id === id);
        if (!emergency) return;
        emergency.status = 'accepted';
        showMapForEmergency(emergency);
        renderEmergencies();
    }

    function rejectEmergency(id) {
        activeEmergencies = activeEmergencies.filter(item => item.id !== id);
        renderEmergencies();
        updateAnalysisOutput('Emergency case rejected. Waiting for the next live notification.');
    }

    function showMapForEmergency(emergency) {
        const mapStatus = document.getElementById('map-status');
        const mapPlaceholder = document.getElementById('map-placeholder');
        if (mapStatus) mapStatus.textContent = `Tracking ${emergency.priority.toLowerCase()} case at ${emergency.location}.`;
        if (mapPlaceholder) {
            mapPlaceholder.innerHTML = `
                <div class="map-pin">📍</div>
                <div class="map-text">
                    <strong>${emergency.location}</strong>
                    <p>${emergency.coords} · ${emergency.type} · ${emergency.priority} priority</p>
                </div>
            `;
        }
    }

    function simulateIncomingEmergency() {
        const sample = emergencyTemplates[Math.floor(Math.random() * emergencyTemplates.length)];
        const newEmergency = {
            ...sample,
            id: `${sample.priority}-${Date.now()}`,
            status: 'active',
            timer: sample.timer
        };
        activeEmergencies.unshift(newEmergency);
        if (activeEmergencies.length > 5) activeEmergencies.pop();
        renderEmergencies();
    }

    async function handleSymptomSubmit(event) {
        event.preventDefault();
        const symptoms = document.getElementById('symptoms-input')?.value.trim();
        const imageFile = imageInput?.files?.[0];
        if (!symptoms && !imageFile) {
            updateAnalysisOutput('Please enter symptoms or upload an image to analyze.', true);
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            updateAnalysisOutput('Please log in to use AI analysis.', true);
            logoutRedirect();
            return;
        }

        const formData = new FormData();
        if (symptoms) formData.append('question', symptoms);
        if (symptoms) formData.append('message', symptoms);
        if (imageFile) formData.append('image', imageFile);

        try {
            updateAnalysisOutput('Analyzing symptoms...');
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) {
                updateAnalysisOutput(data.message || data.reply || 'AI analysis failed.', true);
                return;
            }
            updateAnalysisOutput(data.reply || 'Symptom analysis complete.');
        } catch (error) {
            console.error('AI analysis error:', error);
            updateAnalysisOutput('AI service unavailable. Please try again later.', true);
        }
    }

    function handleVoiceInput() {
        const output = document.getElementById('analysis-output');
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            updateAnalysisOutput('Voice input is not supported in this browser.', true);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();
        updateAnalysisOutput('Listening... please describe the symptoms.');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const symptomsInput = document.getElementById('symptoms-input');
            if (symptomsInput) symptomsInput.value = transcript;
            updateAnalysisOutput(`Voice captured: ${transcript}`);
        };

        recognition.onerror = () => {
            updateAnalysisOutput('Voice input failed. Please try again.', true);
        };
    }

    function attachDashboardEvents() {
        document.getElementById('settings-form')?.addEventListener('submit', submitSettings);
        document.getElementById('logout-secondary-btn')?.addEventListener('click', logoutRedirect);
        document.getElementById('refresh-emergencies')?.addEventListener('click', simulateIncomingEmergency);
        document.getElementById('symptom-form')?.addEventListener('submit', handleSymptomSubmit);
        document.getElementById('voice-btn')?.addEventListener('click', handleVoiceInput);
        document.querySelector('.remove-image-btn')?.addEventListener('click', removeImage);
    }

    function initializeDashboard() {
        if (!document.querySelector('.dashboard-main')) return;
        loadUserProfile();
        attachDashboardEvents();
        simulateIncomingEmergency();
        setInterval(simulateIncomingEmergency, 25000);
    }

    initializeDashboard();
})