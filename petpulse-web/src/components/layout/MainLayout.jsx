import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            {/* Spacer to prevent content from hiding behind fixed navbar */}
            <div className="h-20 sm:h-24 shrink-0"></div>
            
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
