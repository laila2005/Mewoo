import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RestrictedAccessModal from '../common/RestrictedAccessModal';

const Footer = () => {
  const { user } = useAuth();
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);

  const handleLinkClick = (e, path) => {
    const userRole = user && user.role ? user.role.toLowerCase().trim() : '';
    const isRestrictedRole = ['vet', 'trainer', 'vendor'].includes(userRole);
    const restrictedPaths = ['/vet-booking', '/trainers', '/community#adoptions', '/explore', '/marketplace'];
    const isRestrictedPath = restrictedPaths.some(p => path.startsWith(p)) || path === '/community#hosting';
    
    if (isRestrictedRole && isRestrictedPath) {
      e.preventDefault();
      setShowRestrictedModal(true);
    }
  };

  return (
    <>
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-400 text-2xl">pets</span>
              <span className="font-bold text-white text-lg">PetPulse</span>
            </div>
            <p className="text-sm leading-relaxed">Compassionate care for every companion. Egypt's #1 pet care platform.</p>
            <div className="flex gap-3 mt-6">
              <Link to="/community" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[16px] text-white">public</span></Link>
              <Link to="/community" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[16px] text-white">share</span></Link>
              <Link to="/community" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[16px] text-white">photo_camera</span></Link>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Services</h4>
            <ul className="space-y-2">
              <li><Link to="/vet-booking" onClick={(e) => handleLinkClick(e, '/vet-booking')} className="text-sm hover:text-white transition-colors">Vet Booking</Link></li>
              <li><Link to="/trainers" onClick={(e) => handleLinkClick(e, '/trainers')} className="text-sm hover:text-white transition-colors">Pet Trainers</Link></li>
              <li><Link to="/explore" onClick={(e) => handleLinkClick(e, '/explore')} className="text-sm hover:text-white transition-colors">Adoption</Link></li>
              <li><Link to="/marketplace" onClick={(e) => handleLinkClick(e, '/marketplace')} className="text-sm hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link to="/lost-found" className="text-sm hover:text-white transition-colors">Lost & Found</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/community" className="text-sm hover:text-white transition-colors">Community</Link></li>
              <li><Link to="/pet-shops" className="text-sm hover:text-white transition-colors">Pet Shops</Link></li>
              <li><Link to="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="text-sm hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-8 text-center text-sm">
          © {new Date().getFullYear()} PetPulse. All rights reserved. Made with ❤️ for pets everywhere.
        </div>
      </footer>
      <RestrictedAccessModal 
        isOpen={showRestrictedModal} 
        onClose={() => setShowRestrictedModal(false)} 
        userRole={user?.role} 
      />
    </>
  );
};

export default Footer;
