import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RestrictedAccessInline = ({ userRole = '' }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const roleClean = String(userRole).toLowerCase().trim();
  
  let roleTitle = 'Professional Account';
  let roleText = 'professional profile';
  
  if (roleClean === 'vet') {
    roleTitle = 'Veterinarian Account';
    roleText = 'verified veterinarian profile';
  } else if (roleClean === 'trainer') {
    roleTitle = 'Pet Trainer Account';
    roleText = 'professional trainer profile';
  } else if (roleClean === 'vendor') {
    roleTitle = 'Business Vendor Account';
    roleText = 'registered pet shop vendor profile';
  }

  const handleRegisterOwner = async () => {
    try {
      await logout();
      toast.success('Logged out successfully. Redirecting to registration...', { icon: '👋' });
      navigate('/signup?role=owner');
    } catch (err) {
      console.error('Error logging out:', err);
      toast.error('Could not complete operation. Please try again.');
    }
  };

  const handleGoToDashboard = () => {
    if (roleClean === 'vendor') {
      navigate('/vendor-dashboard');
    } else {
      navigate('/pro-dashboard');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[calc(100vh-160px)] animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full" />
        
        <div className="p-8 sm:p-12 text-center">
          {/* Glowing restricted shield badge */}
          <div className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-amber-500/10">
            <span className="material-symbols-outlined text-[42px] text-amber-600 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3 tracking-tight font-display">
            Access Restricted to Pet Owners
          </h1>
          
          <span className="inline-block text-[11px] font-extrabold text-blue-700 bg-blue-50/80 border border-blue-100/50 rounded-full px-4 py-1.5 mb-6 uppercase tracking-wider shadow-sm">
            {roleTitle}
          </span>

          <p className="text-sm sm:text-base text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
            This premium service is reserved exclusively for personal <strong>Pet Owner</strong> accounts. 
            As a registered user with a <strong>{roleText}</strong>, you can use your professional hub to manage services, or register a personal account to use client-side features.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
            {/* Primary Action */}
            <button
              onClick={handleGoToDashboard}
              className="w-full sm:w-auto flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Go to My Dashboard</span>
            </button>

            {/* Secondary Action */}
            <button
              onClick={handleRegisterOwner}
              className="w-full sm:w-auto flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-6 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-500">person_add</span>
              <span>Create Pet Owner Account</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Go Back to Previous Page</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestrictedAccessInline;
