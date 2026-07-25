import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Chatbot from '../Chatbot';
import BottomNav from './BottomNav';

const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            {/* Spacer to prevent content from hiding behind fixed navbar */}
            <div className="h-14 sm:h-16 shrink-0"></div>

            {/* pb on mobile keeps content clear of the fixed bottom nav */}
            <main className="flex-1 flex flex-col pb-20 md:pb-0">
                <Outlet />
                <Chatbot />
            </main>

            {/* Mobile-only quick navigation */}
            <BottomNav />
        </div>
    );
};

export default MainLayout;
