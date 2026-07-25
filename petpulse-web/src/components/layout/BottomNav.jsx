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
            // Services covers the whole discovery cluster so it stays lit on its sub-pages.
            { to: '/explore', icon: 'medical_services', label: 'Services', match: ['/explore', '/vets', '/vet-booking', '/pet-shops', '/trainers'] },
            { to: '/community', icon: 'forum', label: 'Community' },
            { to: '/marketplace', icon: 'storefront', label: 'Shop' },
            user
                ? { to: '/profile', icon: 'person', label: 'Profile' }
                : { to: '/login', icon: 'login', label: 'Sign In' },
        ];
    }

    const isActive = (item) => {
        if (item.match && item.match.some((m) => path.startsWith(m))) return true;
        return item.to === '/' ? path === '/' : path.startsWith(item.to);
    };

    return (
        <nav
            aria-label="Primary"
            className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/70 rounded-t-3xl shadow-[0_-8px_32px_rgba(15,23,42,0.10)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <ul className="flex items-stretch justify-around h-[68px] max-w-lg mx-auto px-2 pt-1.5 m-0 list-none">
                {items.map((item) => {
                    const active = isActive(item);
                    return (
                        <li key={item.to} className="flex-1">
                            <Link
                                to={item.to}
                                aria-current={active ? 'page' : undefined}
                                className="group h-full flex flex-col items-center justify-center gap-1 rounded-2xl transition-transform duration-200 active:scale-90"
                            >
                                {/* Icon chip — active lifts into a brand-gradient pill */}
                                <span
                                    className={`flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-300 ${
                                        active
                                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
                                            : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100/70'
                                    }`}
                                >
                                    <span
                                        className="material-symbols-outlined text-[22px] leading-none"
                                        style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 600 : 500}` }}
                                    >
                                        {item.icon}
                                    </span>
                                </span>
                                <span
                                    className={`text-[10px] leading-none tracking-tight transition-colors duration-200 ${
                                        active ? 'text-blue-600 font-bold' : 'text-slate-400 font-semibold'
                                    }`}
                                >
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
