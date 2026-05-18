// notifications.js
// Handles fetching notifications and injecting them into the navbar dropdown.

window.fetchNotifications = async () => {
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
            const alerts = data.alerts || [];
            
            // Update the badge
            const bells = document.querySelectorAll('.notification-bell');
            bells.forEach(bell => {
                const existingBadges = bell.querySelectorAll('span.bg-red-500');
                existingBadges.forEach(b => b.remove());

                if (total > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'absolute -top-1 -right-1 w-4 h-4 bg-red-500 border border-white rounded-full text-[10px] text-white flex justify-center items-center font-bold shadow-sm';
                    badge.textContent = total > 9 ? '9+' : total;
                    
                    if (bell.style.position !== 'relative' && bell.style.position !== 'absolute') {
                        bell.classList.add('relative');
                    }
                    
                    bell.appendChild(badge);
                }
            });

            // Update the dropdown list
            const listContainer = document.getElementById('notificationList');
            if (listContainer) {
                if (alerts.length === 0) {
                    listContainer.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">No new notifications</div>';
                } else {
                    listContainer.innerHTML = alerts.map(alert => `
                        <a href="${alert.action_url}" class="block px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors">
                            <div class="flex items-start gap-3">
                                <div class="bg-blue-100 text-blue-600 p-1.5 rounded-full flex-shrink-0 mt-0.5">
                                    <span class="material-symbols-outlined text-[16px]">${alert.type === 'unread_message' ? 'chat' : 'person_add'}</span>
                                </div>
                                <div>
                                    <p class="text-sm font-semibold text-slate-800">${alert.title}</p>
                                    <p class="text-xs text-slate-600 mt-0.5">${alert.message}</p>
                                    <p class="text-[10px] text-slate-400 mt-1">${new Date(alert.time).toLocaleString()}</p>
                                </div>
                            </div>
                        </a>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error('Failed to load notifications:', e);
        const listContainer = document.getElementById('notificationList');
        if (listContainer) listContainer.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Failed to load notifications</div>';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch if user is logged in
    if (localStorage.getItem('token')) {
        window.fetchNotifications();
        // Poll every 60 seconds
        setInterval(window.fetchNotifications, 60000);
    }
});
