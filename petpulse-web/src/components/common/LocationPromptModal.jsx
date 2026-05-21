import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NEIGHBORHOODS = [
  { name: 'Zamalek', lat: 30.0626, lng: 31.2223 },
  { name: 'Maadi', lat: 29.9602, lng: 31.2569 },
  { name: 'New Cairo', lat: 30.0263, lng: 31.4913 },
  { name: 'Heliopolis', lat: 30.0901, lng: 31.3228 },
  { name: 'Giza', lat: 30.0384, lng: 31.2114 },
  { name: '6th of October', lat: 29.9529, lng: 30.9220 }
];

const LocationPromptModal = ({ isOpen, onClose }) => {
  const { updateUserLocation } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let neighborhoodName = 'Cairo, Egypt';

        try {
          // Free Nominatim reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            neighborhoodName = address.suburb || address.neighbourhood || address.residential || address.city_district || address.city || 'Cairo, Egypt';
          }
        } catch (err) {
          console.warn('Reverse geocoding failed (using fallback):', err);
        }

        await updateUserLocation(latitude, longitude, neighborhoodName);
        toast.success(`Location set to ${neighborhoodName}!`, { icon: '📍' });
        setLoading(false);
        onClose();
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Could not access live location. Please select manually below.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSelectNeighborhood = async (n) => {
    setLoading(true);
    await updateUserLocation(n.lat, n.lng, n.name);
    toast.success(`Location set to ${n.name}!`, { icon: '📍' });
    setLoading(false);
    onClose();
  };

  const handleSkip = () => {
    updateUserLocation(30.0444, 31.2357, 'Cairo, Egypt');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300 animate-scale-up">
        
        {/* Glow Header */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full" />
        
        <div className="p-6 text-center">
          {/* Visual Icon */}
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <span className="material-symbols-outlined text-[32px] text-blue-600 font-bold">location_on</span>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2 font-display">Personalize Your Experience</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Allow location access to center all interactive maps, calculate proximity to verified vets, professional trainers, and discover pet shops in your neighborhood!
          </p>

          {/* Primary Action */}
          <button
            onClick={handleRequestLiveLocation}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/20 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 mb-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">my_location</span>
                <span>Enable Live Geolocation</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Or Select Manually</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Curated Presets Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {NEIGHBORHOODS.map((n) => (
              <button
                key={n.name}
                onClick={() => handleSelectNeighborhood(n)}
                disabled={loading}
                className="py-2.5 px-4 bg-slate-50 hover:bg-blue-50/50 hover:text-blue-600 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 transition-all text-left flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-400 hover:text-blue-500">map</span>
                <span className="truncate">{n.name}</span>
              </button>
            ))}
          </div>

          {/* Secondary Dismiss Action */}
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Not Now, Use Default (Cairo)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPromptModal;
