const API_BASE = '/api';

// ─── Login ───────────────────────────────────────
async function loginUser(e) {
    if (e) e.preventDefault();

    const form = e ? e.target : document;
    const emailInput = form.querySelector('input[type="email"]') || document.getElementById('email');
    const passwordInput = form.querySelector('input[type="password"]') || document.getElementById('password');
    
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const btn = document.querySelector('#loginBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Logging in…'; }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Login failed', 'error');
            return;
        }

        // Store token & user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showToast('Login Successful 🎉', 'success');
        setTimeout(() => { 
            if (data.user.role === 'admin') {
                window.location.href = '/admin/index.html';
            } else {
                window.location.href = 'user.html'; 
            }
        }, 600);

    } catch (err) {
        console.error('Login error:', err);
        showToast('Unable to connect to the database. Please ensure the server is running.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Log In'; }
    }
}

// ─── Register ────────────────────────────────────
async function registerUser(e) {
    if (e) e.preventDefault();

    const form = e ? e.target : document;
    const nameInput = form.querySelector('input[type="text"]') || document.getElementById('name') || document.getElementById('fullname');
    const emailInput = form.querySelector('input[type="email"]') || document.getElementById('email') || document.getElementById('signupemail');
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    
    const fullName = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    
    let password = '';
    let confirmPassword = '';
    
    if (passwordInputs.length > 0) {
        password = passwordInputs[0].value;
        if (passwordInputs.length > 1) {
            confirmPassword = passwordInputs[1].value;
        }
    } else {
        const pInput = document.getElementById('password') || document.getElementById('signuppassword');
        if (pInput) password = pInput.value;
    }

    const terms = document.getElementById('terms');

    if (!fullName || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }

    if (terms && !terms.checked) {
        showToast('Please accept the Terms of Service', 'error');
        return;
    }

    // Split full name into first & last (backend requires both)
    const parts = fullName.split(' ');
    const first_name = parts[0];
    const last_name  = parts.slice(1).join(' ') || parts[0];

    // Professional Fields
    const roleSelect = document.getElementById('role');
    const role = roleSelect ? roleSelect.value : 'owner';
    const clinicName = document.getElementById('clinic_name') ? document.getElementById('clinic_name').value : '';
    const licenseNumber = document.getElementById('license_number') ? document.getElementById('license_number').value : '';
    const specialties = document.getElementById('specialties') ? document.getElementById('specialties').value : '';
    const nationalIdFile = document.getElementById('national_id') ? document.getElementById('national_id').files[0] : null;

    const btn = document.querySelector('#signupBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

    try {
        let requestOptions = {};
        
        if (role === 'vet' || role === 'trainer') {
            if (!nationalIdFile) {
                showToast('National ID or License upload is required for professionals', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
                return;
            }
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            formData.append('first_name', first_name);
            formData.append('last_name', last_name);
            formData.append('role', role);
            if (role === 'vet') {
                formData.append('clinic_name', clinicName);
                formData.append('license_number', licenseNumber);
            } else if (role === 'trainer') {
                formData.append('specialties', specialties);
            }
            formData.append('national_id', nationalIdFile);

            requestOptions = {
                method: 'POST',
                body: formData
            };
        } else {
            requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, first_name, last_name, role })
            };
        }

        const res = await fetch(`${API_BASE}/auth/register`, requestOptions);

        const data = await res.json();

        if (!res.ok) {
            const errorMsg = data.reason ? `${data.error}: ${data.reason}` : (data.error || 'Registration failed');
            showToast(errorMsg, 'error');
            return;
        }

        if (data.kyc_status === 'pending') {
            showToast('Account created! Your professional ID is pending Admin review.', 'success');
        } else if (data.kyc_status === 'approved') {
            showToast('Account created and ID auto-verified! Redirecting...', 'success');
        } else {
            showToast('Account created! Redirecting to login…', 'success');
        }
        
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);

    } catch (err) {
        console.error('Register error:', err);
        showToast('Unable to connect to the database. Please ensure the server is running.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
    }
}

// ─── Google Auth ─────────────────────────────────
async function handleGoogleResponse(response) {
    if (!response || !response.credential) {
        showToast('Google Sign-In failed', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Google login failed', 'error');
            return;
        }

        // Store token & user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        showToast('Google Login Successful 🎉', 'success');
        setTimeout(() => { 
            if (data.user.role === 'admin') {
                window.location.href = '/admin/index.html';
            } else {
                window.location.href = 'user.html'; 
            }
        }, 600);

    } catch (err) {
        console.error('Google login error:', err);
        showToast('Connection error: ' + (err.message || err), 'error');
    }
}

// ─── Auth helpers ────────────────────────────────
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
}

function logout(e) {
    if (e) e.preventDefault();
    localStorage.clear();
    
    // Immediately update the UI to guest mode
    if (typeof updateNavbar === 'function') {
        updateNavbar();
    }
    
    const authPages = ['profile.html', 'settings.html', 'messages.html', 'appointments.html', 'edit-profile.html', 'manage-pet.html', 'admin.html', 'booking-details.html'];
    const currentPath = window.location.pathname.split('/').pop() || 'user.html';
    
    if (authPages.includes(currentPath)) {
        // Redirect to landing page instead of a hard login prompt
        window.location.href = 'user.html';
    } else {
        // On public pages, do not reload. The UI is already updated via updateNavbar().
        // Show a professional toast
        if (typeof showToast === 'function') {
            showToast('You have been logged out successfully.', 'success');
        }
    }
}

function generateInitialsAvatar(firstName, lastName) {
    const initials = ((firstName || '')[0] || '') + ((lastName || '')[0] || '');
    const colors = ['#005da7','#196a59','#7b5508','#2976c7','#976d23'];
    const colorIdx = ((firstName || '').charCodeAt(0) || 0) % colors.length;
    const bg = colors[colorIdx];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${bg}"/><text x="64" y="72" text-anchor="middle" fill="white" font-family="Plus Jakarta Sans,sans-serif" font-size="48" font-weight="700">${initials.toUpperCase()}</text></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Update navbar based on login state
function updateNavbar() {
    const user = getUser();
    const token = getToken();

    const notLoggedIn = document.getElementById('notLoggedIn');
    const loggedIn = document.getElementById('loggedIn');
    
    const authButtonsContainer = document.getElementById('authButtonsContainer');
    const profileContainer = document.getElementById('profileContainer');
    const mobileAuthContainer = document.getElementById('mobileAuthContainer');
    const mobileProfileContainer = document.getElementById('mobileProfileContainer');

    const navAvatar = document.getElementById('navAvatar');
    const navUserName = document.getElementById('navUserName');
    const modalPatient = document.getElementById('modal-patient');
    const getStartedBtn = document.getElementById('getStartedBtn');

    if (user && token) {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];
        const avatar = user.profile_pic_url || generateInitialsAvatar(user.first_name, user.last_name);

        if (notLoggedIn) notLoggedIn.classList.add('hidden');
        if (authButtonsContainer) authButtonsContainer.classList.add('hidden');
        if (mobileAuthContainer) mobileAuthContainer.classList.add('hidden');

        if (loggedIn) {
            loggedIn.classList.remove('hidden');
            const welcomeSpan = loggedIn.querySelector('span.text-slate-600');
            if (welcomeSpan) welcomeSpan.textContent = `Welcome, ${user.first_name || user.email.split('@')[0]}`;
            const profImg = document.getElementById('profileImg');
            if (profImg) profImg.src = avatar;
        }
        
        if (profileContainer) {
            profileContainer.classList.remove('hidden');
            profileContainer.classList.add('flex');
            const profileImg = document.getElementById('profileImg');
            if (profileImg) { profileImg.src = avatar; profileImg.onerror = () => profileImg.src = generateInitialsAvatar(user.first_name, user.last_name); }
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay) userNameDisplay.textContent = fullName;
        }

        if (mobileProfileContainer) {
            mobileProfileContainer.classList.remove('hidden');
            const mobileProfileImg = document.getElementById('mobileProfileImg');
            if (mobileProfileImg) { mobileProfileImg.src = avatar; mobileProfileImg.onerror = () => mobileProfileImg.src = generateInitialsAvatar(user.first_name, user.last_name); }
            const mobileUserNameDisplay = document.getElementById('mobileUserNameDisplay');
            if (mobileUserNameDisplay) mobileUserNameDisplay.textContent = fullName;
        }

        if (navAvatar) { 
            navAvatar.src = avatar; navAvatar.onerror = () => navAvatar.src = generateInitialsAvatar(user.first_name, user.last_name); 
            navAvatar.style.display = 'block';
            if (navAvatar.parentElement && navAvatar.parentElement.tagName === 'A') {
                navAvatar.parentElement.classList.remove('hidden');
                // Dynamically route to correct profile page based on role
                navAvatar.parentElement.href = user.role === 'owner' ? 'owner-profile.html' : 'profile.html';
            }
        }
        if (navUserName) {
            navUserName.textContent = fullName;
            if (navUserName.parentElement) navUserName.parentElement.classList.remove('hidden');
        }
        if (modalPatient) modalPatient.textContent = fullName;

        if (getStartedBtn) {
            getStartedBtn.textContent = 'Explore Local Care';
            getStartedBtn.href = 'vet-booking.html';
        }

        document.querySelectorAll('button[onclick*="logout"], a[onclick*="logout"]').forEach(btn => btn.classList.remove('hidden'));
        const dynamicAuth = document.getElementById('dynamicAuthLinks');
        if (dynamicAuth) dynamicAuth.remove();

    } else {
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
        if (authButtonsContainer) authButtonsContainer.classList.remove('hidden');
        if (mobileAuthContainer) mobileAuthContainer.classList.remove('hidden');

        if (loggedIn) loggedIn.classList.add('hidden');
        if (profileContainer) profileContainer.classList.add('hidden');
        if (mobileProfileContainer) mobileProfileContainer.classList.add('hidden');
        
        if (navAvatar) {
            navAvatar.style.display = 'none';
            if (navAvatar.parentElement && navAvatar.parentElement.tagName === 'A') navAvatar.parentElement.classList.add('hidden');
        }
        if (navUserName && navUserName.parentElement) navUserName.parentElement.classList.add('hidden');
        document.querySelectorAll('button[onclick*="logout"], a[onclick*="logout"]').forEach(btn => btn.classList.add('hidden'));

        if (!authButtonsContainer && !document.getElementById('dynamicAuthLinks') && navAvatar) {
            const authHtml = `
            <div id="dynamicAuthLinks" class="flex items-center gap-2 ml-2">
                <button onclick="window.location.href='login.html'" class="text-slate-600 font-medium px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors">Log In</button>
                <button onclick="window.location.href='signup.html'" class="bg-primary text-white font-semibold px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full shadow-sm hover:bg-blue-700 transition-colors">Sign Up</button>
            </div>`;
            navAvatar.parentElement.insertAdjacentHTML('beforebegin', authHtml);
        }

        if (getStartedBtn) {
            getStartedBtn.href = 'signup.html';
            getStartedBtn.textContent = 'Get Started';
        }
    }
}

// ─── Toast notifications ─────────────────────────
function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
        position: fixed; top: 90px; right: 24px; z-index: 9999;
        padding: 14px 24px; border-radius: 12px;
        font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600;
        color: white; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        transform: translateX(120%); transition: transform 0.3s ease;
    `;

    if (type === 'success') toast.style.background = '#196a59';
    else if (type === 'error') toast.style.background = '#ba1a1a';
    else toast.style.background = '#005da7';

    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Init navbar on every page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    injectGlobalChatbot();
});

// ─── Global Chatbot ─────────────────────────────────
function injectGlobalChatbot() {
    // Check if it already exists
    if (document.querySelector('.chatbot-container')) return;

    const chatbotHTML = `
    <style>
        .chatbot-container { position: fixed; bottom: 20px; right: 20px; z-index: 9999; max-width: calc(100vw - 40px); }
        .chat-window { width: 400px; height: 550px; max-width: 100%; background: white; border-radius: 20px; box-shadow: 0 22px 48px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; }
        .chat-messages { flex: 1; padding: 20px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 16px; scrollbar-width: none; }
        .chat-messages::-webkit-scrollbar { display: none; }
        .chat-window .p-4.border-t.bg-white { padding: 1rem; }
        .chat-window input#global-user-input { padding: 0.75rem 1rem; font-size: 0.95rem; }
        .chat-window button#global-send-btn { width: 48px; height: 48px; }
        @media (max-width: 640px) { .chatbot-container { right: 15px; bottom: 15px; } .chat-window { width: calc(100vw - 30px); height: 500px; } }
        .message { max-width: 85%; padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.4; }
        .bot-message { align-self: flex-start; background: white; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
        .user-message { align-self: flex-end; background: #0060ac; color: white; border-bottom-right-radius: 4px; }
        .bot-chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 16px; padding: 6px 12px; font-size: 12px; color: #334155; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .bot-chip:hover { background: #e2e8f0; color: #0f172a; }
        .bot-card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .bot-card-btn { display: block; width: 100%; text-align: center; background: #f8fafc; padding: 8px; border-top: 1px solid #e2e8f0; color: #005da7; font-weight: 600; text-decoration: none; font-size: 13px; }
        .bot-card-btn:hover { background: #f1f5f9; }
        .chat-window.hidden { display: none !important; }
        @keyframes pulse-ring {
            0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); }
            100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .ai-pulse-btn {
            animation: pulse-ring 2s infinite;
        }
        @keyframes float-badge {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        .ai-floating-badge {
            animation: float-badge 2s ease-in-out infinite;
        }
    </style>
    <div class="chatbot-container relative">
        <div id="ai-attention-badge" class="ai-floating-badge absolute -top-12 -left-4 bg-white text-blue-600 font-bold px-3 py-1.5 rounded-xl shadow-lg border border-blue-100 whitespace-nowrap text-xs flex items-center gap-1 z-50">
            ✨ Try VetAI Now!
            <div class="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-blue-100 transform rotate-45"></div>
        </div>
        <button id="global-chat-toggle" class="ai-pulse-btn relative z-10 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-medium text-sm border-none cursor-pointer">
            <div class="bg-white rounded-full p-1 flex items-center justify-center">
                <img src="../assets/images/logoo.png" alt="PetPulse" class="h-5 w-5 object-contain" />
            </div>
            <span style="display:inline-block; font-family: 'Plus Jakarta Sans', sans-serif;">Chat with VetAI</span>
        </button>

        <div id="global-chat-window" class="chat-window hidden mt-3" style="font-family: 'Plus Jakarta Sans', sans-serif;">
            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                        <img src="../assets/images/logoo.png" alt="PetPulse" class="h-7 w-7 object-contain" />
                    </div>
                    <div>
                        <h3 class="font-semibold m-0">VetAI Assistant</h3>
                        <p class="text-xs opacity-90 m-0">Cat Health Specialist • Online</p>
                    </div>
                </div>
                <button id="global-close-chat" onclick="document.getElementById('global-chat-window').classList.add('hidden')" class="text-white hover:bg-white/20 w-8 h-8 flex items-center justify-center rounded-xl text-xl leading-none cursor-pointer border-none bg-transparent">×</button>
            </div>

            <div id="global-chat-messages" class="chat-messages"></div>

            <div class="p-4 border-t bg-white" style="border-top: 1px solid #e5e7eb;">
                <div class="flex gap-2" style="display:flex; gap:0.5rem;">
                    <input id="global-user-input" type="text" placeholder="Describe symptoms, ask about bookings..." class="flex-1 border border-gray-300 focus:border-blue-500 rounded-2xl px-5 py-3 text-sm outline-none" style="flex:1; border: 1px solid #d1d5db; border-radius: 1rem; padding: 0.75rem 1.25rem;">
                    <button id="global-send-btn" class="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-2xl flex items-center justify-center transition-colors text-xl cursor-pointer border-none" style="background-color: #2563eb; color: white; border-radius: 1rem; width: 3rem; height: 3rem;">↑</button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    const toggleBtn = document.getElementById('global-chat-toggle');
    const chatWindow = document.getElementById('global-chat-window');
    const closeBtn = document.getElementById('global-close-chat');
    const messages = document.getElementById('global-chat-messages');
    const input = document.getElementById('global-user-input');
    const sendBtn = document.getElementById('global-send-btn');
    
    let isFirstOpen = true;

    function addMessage(text, isUser = false, isHtml = false) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        if (isHtml) {
            div.innerHTML = text;
            
            // Add listeners to any chips injected via HTML
            const chips = div.querySelectorAll('.bot-chip');
            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    input.value = chip.textContent;
                    processInput();
                });
            });
        } else {
            div.textContent = text;
        }
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function botReply(text, isHtml = false) {
        setTimeout(() => addMessage(text, false, isHtml), 700);
    }

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (isFirstOpen && !chatWindow.classList.contains('hidden')) {
            isFirstOpen = false;
            setTimeout(() => {
                addMessage("Hello! 🐱 I'm VetAI, your friendly PetPulse assistant.", false);
                setTimeout(() => {
                    addMessage(`I can help you check pet symptoms, find nearby vets, or adopt a pet. How can I help today?
                        <div class="flex flex-wrap gap-2 mt-3">
                            <button class="bot-chip">Book a Vet</button>
                            <button class="bot-chip">Check Symptoms</button>
                            <button class="bot-chip">Adopt a Pet</button>
                        </div>
                    `, false, true);
                }, 900);
            }, 500);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            chatWindow.classList.add('hidden');
        });
    }

    async function processInput() {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, true);
        input.value = "";
        
        // Add loading state
        const loadingId = 'loading-' + Date.now();
        const loadingHtml = `<div id="${loadingId}" class="text-sm text-slate-500 italic flex items-center gap-2">
            <span class="material-symbols-outlined animate-spin text-sm">refresh</span> VetAI is thinking...
        </div>`;
        addMessage(loadingHtml, false, true);

        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const locEl = document.getElementById('location-text');
            const userLoc = locEl ? locEl.innerText : 'Unknown';
            
            // Use window.location.origin to support local dev and prod
            const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';
            
            const res = await fetch(`${API_BASE}/ai/triage`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    symptoms: text,
                    petId: null,
                    userLocation: userLoc
                })
            });

            // Remove loading indicator
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl && loadingEl.parentElement) {
                loadingEl.parentElement.remove();
            }

            if (res.ok) {
                const data = await res.json();
                // Pass true as the second argument to botReply to render the HTML UI Action cards from the AI
                botReply(data.triage_result || data.message || "I've processed your request. Can I help with anything else?", true);
            } else {
                botReply("Sorry, my AI service is currently taking a nap. Please try again later.", false);
            }
        } catch (e) {
            console.error(e);
            
            // Remove loading indicator
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl && loadingEl.parentElement) {
                loadingEl.parentElement.remove();
            }
            
            botReply("Sorry, there was an error connecting to my AI brain.", false);
        }
    }

    sendBtn.addEventListener('click', processInput);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') processInput(); });
}