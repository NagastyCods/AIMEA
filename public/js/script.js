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

        const response = await fetch("/api/ai", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
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
})