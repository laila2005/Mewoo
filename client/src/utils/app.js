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
        setTimeout(() => { window.location.href = 'user.html'; }, 600);

    } catch (err) {
        console.error('Login error:', err);
        showToast('Network error – is the server running?', 'error');
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

    const btn = document.querySelector('#signupBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, first_name, last_name })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Registration failed', 'error');
            return;
        }

        showToast('Account created! Redirecting to login…', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);

    } catch (err) {
        console.error('Register error:', err);
        showToast('Network error – is the server running?', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
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
            if (profileImg) profileImg.src = avatar;
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay) userNameDisplay.textContent = fullName;
        }

        if (mobileProfileContainer) {
            mobileProfileContainer.classList.remove('hidden');
            const mobileProfileImg = document.getElementById('mobileProfileImg');
            if (mobileProfileImg) mobileProfileImg.src = avatar;
            const mobileUserNameDisplay = document.getElementById('mobileUserNameDisplay');
            if (mobileUserNameDisplay) mobileUserNameDisplay.textContent = fullName;
        }

        if (navAvatar) navAvatar.src = avatar;
        if (navUserName) navUserName.textContent = fullName;
        if (modalPatient) modalPatient.textContent = fullName;

        if (getStartedBtn) {
            getStartedBtn.href = 'vet-booking.html';
            getStartedBtn.textContent = 'Book a Vet';
        }

    } else {
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
        if (authButtonsContainer) authButtonsContainer.classList.remove('hidden');
        if (mobileAuthContainer) mobileAuthContainer.classList.remove('hidden');

        if (loggedIn) loggedIn.classList.add('hidden');
        if (profileContainer) profileContainer.classList.add('hidden');
        if (mobileProfileContainer) mobileProfileContainer.classList.add('hidden');
        
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
document.addEventListener('DOMContentLoaded', updateNavbar);