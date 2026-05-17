// notifications.js
// Handles fetching global notification counts and injecting badges into the UI.

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : '/api';
    const token = localStorage.getItem('token');
    
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/users/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            const total = data.total;
            
            if (total > 0) {
                // Find any elements marked with 'data-notification-badge' or specific IDs
                const bells = document.querySelectorAll('.notification-bell');
                bells.forEach(bell => {
                    // Remove any existing hardcoded red dots/badges
                    const existingBadges = bell.querySelectorAll('span.bg-red-500');
                    existingBadges.forEach(b => b.remove());

                    // Create the badge
                    const badge = document.createElement('span');
                    badge.className = 'absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-white rounded-full text-[10px] text-white flex justify-center items-center font-bold shadow-sm';
                    badge.textContent = total > 9 ? '9+' : total;
                    
                    // Ensure the parent is relative so absolute positioning works
                    if (bell.style.position !== 'relative' && bell.style.position !== 'absolute') {
                        bell.classList.add('relative');
                    }
                    
                    bell.appendChild(badge);
                });
            }
        }
    } catch (e) {
        console.error('Failed to load notifications:', e);
    }
});
