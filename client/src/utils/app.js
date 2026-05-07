const API_BASE = '/api';

// ─── Login ───────────────────────────────────────
async function loginUser(e) {
    if (e) e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

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

    const fullName = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const terms    = document.getElementById('terms');

    if (!fullName || !email || !password) {
        showToast('Please fill in all fields', 'error');
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

// Update navbar based on login state
function updateNavbar() {
    const user = getUser();
    const notLoggedIn = document.getElementById('notLoggedIn');
    const loggedIn    = document.getElementById('loggedIn');

    if (user && getToken()) {
        if (notLoggedIn) notLoggedIn.classList.add('hidden');
        if (loggedIn) {
            loggedIn.classList.remove('hidden');
            const welcomeSpan = loggedIn.querySelector('span.text-slate-600');
            if (welcomeSpan) welcomeSpan.textContent = `Welcome, ${user.email.split('@')[0]}`;
        }
    } else {
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
        if (loggedIn) loggedIn.classList.add('hidden');
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