import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const DiscoverySidebar = () => {
    const location = useLocation();
    
    const links = [
        { path: '/explore', icon: 'explore', label: 'Explore', activeIcon: true },
        { path: '/vets', icon: 'medical_services', label: 'Find a Vet' },
        { path: '/vet-booking', icon: 'location_on', label: 'Local Services' },
        { path: '/pet-shops', icon: 'storefront', label: 'Pet Shops' }
    ];

    return (
        <aside className="w-64 shrink-0 hidden xl:block self-start sticky top-[104px]">
            <div className="mb-6">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Discover</div>
                {links.map(link => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link 
                            key={link.path}
                            to={link.path} 
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                isActive 
                                ? 'font-bold bg-blue-50 text-blue-600' 
                                : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <span 
                                className="material-symbols-outlined text-[20px]" 
                                style={isActive && link.activeIcon ? {fontVariationSettings: "'FILL' 1"} : {}}
                            >
                                {link.icon}
                            </span> 
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
};

export default DiscoverySidebar;
