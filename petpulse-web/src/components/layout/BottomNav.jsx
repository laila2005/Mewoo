import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Mobile-only bottom navigation bar.
 *
 * Gives one-tap access to the most important destinations on phones (where the
 * top nav collapses into a hamburger). Role-aware: pet owners, professionals,
 * vendors and guests each get the pages that matter to them. Hidden at md+ where
 * the full top navbar is visible, and hidden on the full-screen chat / checkout
 * flows (matching the Chatbot's own hiding rules).
 */
const BottomNav = () => {
    const { user } = useAuth();
    const location = useLocation();
    const path = location.pathname;
    const role = user && user.role ? user.role.toLowerCase().trim() : '';
    const isPro = role === 'vet' || role === 'trainer';

    // Don't overlay full-screen flows.
    if (['/messages', '/checkout'].includes(path)) return null;
    // Admin lives outside MainLayout, but guard anyway.
    if (role === 'admin') return null;

    let items;
    if (isPro) {
        items = [
            { to: '/pro-dashboard', icon: 'dashboard', label: 'Dashboard' },
            { to: '/community', icon: 'forum', label: 'Community' },
            { to: '/messages', icon: 'chat', label: 'Messages' },
            { to: '/profile', icon: 'person', label: 'Profile' },
        ];
    } else if (role === 'vendor') {
        items = [
            { to: '/vendor-dashboard', icon: 'dashboard', label: 'Dashboard' },
            { to: '/marketplace', icon: 'storefront', label: 'Store' },
            { to: '/community', icon: 'forum', label: 'Community' },
            { to: '/profile', icon: 'person', label: 'Profile' },
        ];
    } else {
        // Pet owners and guests — the core consumer journey.
        items = [
            { to: '/', icon: 'home', label: 'Home' },
            { to: '/explore', icon: 'medical_services', label: 'Services' },
            { to: '/community', icon: 'forum', label: 'Community' },
            { to: '/marketplace', icon: 'storefront', label: 'Shop' },
            user
                ? { to: '/profile', icon: 'person', label: 'Profile' }
                : { to: '/login', icon: 'login', label: 'Sign In' },
        ];
    }

    const isActive = (to) => (to === '/' ? path === '/' : path.startsWith(to));

    return (
        <nav
            aria-label="Primary"
            className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <ul className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1 m-0 list-none">
                {items.map((item) => {
                    const active = isActive(item.to);
                    return (
                        <li key={item.to} className="flex-1">
                            <Link
                                to={item.to}
                                aria-current={active ? 'page' : undefined}
                                className={`relative h-full flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 active:scale-90 ${
                                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-blue-600 rounded-full" />
                                )}
                                <span
                                    className="material-symbols-outlined text-[23px] leading-none transition-transform duration-200"
                                    style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' 500` }}
                                >
                                    {item.icon}
                                </span>
                                <span className={`text-[10px] leading-none tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNav;
