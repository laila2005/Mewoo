class NavbarComponent {
    constructor() {
        this.containerId = 'app-navbar';
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Path resolution logic (in case we are in /pages/ or root)
        const pathPrefix = window.location.pathname.includes('/pages/') ? '../' : './';
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
        const homeLink = isIndex ? 'index.html' : 'user.html';

        container.innerHTML = `
        <header class="bg-white/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-[100] border-b border-slate-100 shadow-[0_8px_30px_rgb(74,144,226,0.08)]">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4 sm:gap-6 lg:gap-8">
                <a href="${homeLink}" class="inline-flex items-center gap-2 flex-shrink-0">
                    <img src="${pathPrefix}assets/images/logoo.png" alt="PetPulse logo" class="h-10 w-10 object-contain" />
                    <span class="text-lg font-bold tracking-tight text-blue-600">PetPulse</span>
                </a>
                
                <nav class="hidden md:flex items-center justify-center gap-4 lg:gap-8 flex-1">
                    <a class="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base" href="${homeLink}">Home</a>
                    <a class="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base" href="marketplace.html">Marketplace</a>
                    <a class="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base" href="explore.html">Services</a>
                    <a class="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base" href="community.html">Community</a>
                    <a class="text-slate-600 font-medium font-['Plus_Jakarta_Sans'] hover:text-blue-500 transition-all duration-300 text-sm lg:text-base" href="contact.html">Contact Us</a>
                </nav>

                <div class="flex items-center gap-2 sm:gap-3">
                    <!-- Guest View -->
                    <div id="authButtonsContainer" class="flex items-center gap-1 sm:gap-2">
                        <button onclick="window.location.href='login.html'" class="text-slate-600 font-medium px-2 sm:px-3 py-2 text-xs sm:text-sm hover:text-blue-600 active:scale-95 transition-all rounded-lg hover:bg-slate-50">Log In</button>
                        <button onclick="window.location.href='signup.html'" class="bg-blue-600 text-white font-semibold px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-full shadow hover:bg-blue-700 active:scale-95 transition-all">Sign Up</button>
                    </div>

                    <!-- Logged In View -->
                    <div id="profileContainer" class="hidden items-center gap-2 sm:gap-3">
                        <div class="hidden lg:flex items-center gap-2 relative">
                            <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input class="pl-8 pr-3 py-1.5 rounded-full border-none bg-slate-100 focus:ring-2 focus:ring-blue-600 text-xs w-28 lg:w-40" placeholder="Search..." type="text"/>
                        </div>

                        <!-- MESSAGES BUTTON -->
                        <a href="messages.html" class="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Messages">
                            <span class="material-symbols-outlined text-[24px]">chat</span>
                        </a>

                        <!-- NOTIFICATIONS DROPDOWN BUTTON -->
                        <div class="relative">
                            <button id="notificationBtn" class="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors notification-bell" title="Notifications">
                                <span class="material-symbols-outlined text-[24px]">notifications</span>
                            </button>
                            
                            <!-- Dropdown Menu -->
                            <div id="notificationDropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 transform origin-top-right transition-all">
                                <div class="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 class="font-bold text-slate-800 text-sm">Notifications</h3>
                                    <button class="text-blue-600 text-xs font-semibold hover:underline">Mark all as read</button>
                                </div>
                                <div id="notificationList" class="max-h-[300px] overflow-y-auto">
                                    <div class="p-4 text-center text-slate-500 text-sm">Loading...</div>
                                </div>
                                <a href="notifications.html" class="block w-full text-center py-3 bg-slate-50 text-blue-600 text-xs font-bold hover:bg-slate-100 transition-colors border-t border-slate-100">
                                    View All Notifications
                                </a>
                            </div>
                        </div>

                        <!-- PROFILE BUTTON -->
                        <a href="profile.html" title="Go to profile" class="block flex-shrink-0" id="navProfileLink">
                            <img id="navProfileImg" src="https://via.placeholder.com/40" alt="Profile" class="w-9 h-9 rounded-full border-2 border-blue-600/30 object-cover cursor-pointer hover:border-blue-600 transition-colors">
                        </a>

                        <!-- LOGOUT -->
                        <button onclick="logout()" class="text-slate-600 font-medium px-2 sm:px-3 py-2 hover:text-blue-600 active:scale-95 transition-all text-xs sm:text-sm rounded-lg hover:bg-slate-50" title="Logout">
                            <span class="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                    
                    <!-- Mobile Menu Toggle -->
                    <button id="mobileMenuBtn" class="md:hidden p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <span class="material-symbols-outlined text-[24px]">menu</span>
                    </button>
                </div>
            </div>
            
            <!-- Mobile Menu Dropdown -->
            <div id="mobileMenuDropdown" class="hidden md:hidden bg-white border-t border-slate-100 px-4 py-4 shadow-lg absolute w-full left-0">
                <nav class="flex flex-col gap-4">
                    <a class="text-slate-700 font-medium" href="${homeLink}">Home</a>
                    <a class="text-slate-700 font-medium" href="marketplace.html">Marketplace</a>
                    <a class="text-slate-700 font-medium" href="explore.html">Services</a>
                    <a class="text-slate-700 font-medium" href="community.html">Community</a>
                    <a class="text-slate-700 font-medium" href="contact.html">Contact Us</a>
                </nav>
            </div>
        </header>
        <!-- Spacer to prevent content from hiding behind fixed navbar -->
        <div class="h-20 sm:h-24"></div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const notifBtn = document.getElementById('notificationBtn');
        const notifDropdown = document.getElementById('notificationDropdown');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');

        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notifDropdown.classList.toggle('hidden');
                
                // If opening, fetch notifications
                if (!notifDropdown.classList.contains('hidden')) {
                    if (window.fetchNotifications) {
                        window.fetchNotifications();
                    }
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.classList.add('hidden');
                }
            });
        }

        if (mobileMenuBtn && mobileMenuDropdown) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenuDropdown.classList.toggle('hidden');
            });
        }
    updateState() {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        const authContainer = document.getElementById('authButtonsContainer');
        const profileContainer = document.getElementById('profileContainer');
        
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0];
                const avatar = user.profile_pic_url || user.avatar_url || 'https://via.placeholder.com/40';
                
                // Show profile, hide auth
                if (authContainer) authContainer.classList.add('hidden');
                if (profileContainer) {
                    profileContainer.classList.remove('hidden');
                    profileContainer.classList.add('flex');
                    
                    const navProfileImg = document.getElementById('navProfileImg');
                    if (navProfileImg) navProfileImg.src = avatar;
                    
                    const navProfileLink = document.getElementById('navProfileLink');
                    if (navProfileLink) navProfileLink.href = user.role === 'owner' ? 'owner-profile.html' : 'profile.html';
                }
                
                // Fetch notifications
                if (window.fetchNotifications) window.fetchNotifications();
            } catch(e) {}
        } else {
            // Show auth, hide profile
            if (authContainer) authContainer.classList.remove('hidden');
            if (profileContainer) profileContainer.classList.add('hidden');
        }
    }
}

// Automatically render the navbar on script load
document.addEventListener('DOMContentLoaded', () => {
    const navbar = new NavbarComponent();
    navbar.render();
    navbar.updateState();
});
