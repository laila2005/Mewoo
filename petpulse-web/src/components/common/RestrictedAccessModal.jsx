import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const RestrictedAccessModal = ({ isOpen, onClose, userRole = '' }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

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
      onClose();
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300 animate-scale-up">
        
        {/* Glow Header */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full" />
        
        {/* Absolute Close Icon */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="p-6 text-center pt-8">
          {/* Glowing Restricted Badge Icon */}
          <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-sm shadow-amber-500/10">
            <span className="material-symbols-outlined text-[32px] text-amber-600 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2 font-display">
            Access Restricted to Pet Owners
          </h3>
          <p className="text-xs font-semibold text-blue-700 bg-blue-50/70 border border-blue-100/40 rounded-full px-3 py-1 w-max mx-auto mb-4 uppercase tracking-wider">
            {roleTitle}
          </p>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
            This customer-facing service is reserved exclusively for personal **Pet Owner** profiles. 
            As a user with a <strong>{roleText}</strong>, you cannot book appointments, post adoptions, or host pets under this account.
          </p>

          {/* Primary Action: Go back to work */}
          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 mb-3 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Go to My Professional Dashboard</span>
          </button>

          {/* Secondary Action: Register Owner */}
          <button
            onClick={handleRegisterOwner}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 mb-4 text-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">person_add</span>
            <span>Create a Pet Owner Account</span>
          </button>

          {/* Cancel Text */}
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Dismiss & Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestrictedAccessModal;
