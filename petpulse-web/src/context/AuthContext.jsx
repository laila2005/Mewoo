import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    // Soft-launch feature availability. Default {} → treated as live; the public
    // fetch overrides with the real flags. (Backend also enforces, so a failed
    // fetch never lets a gated action actually complete.)
    const [featureFlags, setFeatureFlags] = useState({});
    const [userLocation, setUserLocation] = useState(() => {
        try {
            const stored = localStorage.getItem('user_location');
            return stored ? JSON.parse(stored) : { lat: 30.0444, lng: 31.2357, neighborhood: 'Cairo, Egypt', source: 'default' };
        } catch {
            return { lat: 30.0444, lng: 31.2357, neighborhood: 'Cairo, Egypt', source: 'default' };
        }
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    // Load feature availability on app start (works for guests too), and keep it
    // fresh so an admin toggle propagates to already-open sessions WITHOUT a manual
    // hard-refresh: refetch when the tab regains focus/visibility and on a light poll.
    useEffect(() => {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
        let cancelled = false;
        const loadFlags = () => {
            axios.get(`${API_BASE}/public/feature-flags`, { timeout: 6000 })
                .then(r => { if (!cancelled) setFeatureFlags(r.data?.flags || {}); })
                .catch(() => { /* fail-open to live; backend still enforces */ });
        };
        loadFlags();
        const onFocus = () => loadFlags();
        const onVisible = () => { if (document.visibilityState === 'visible') loadFlags(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        const iv = setInterval(loadFlags, 60000); // self-heal within 60s even without a focus event
        return () => {
            cancelled = true;
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(iv);
        };
    }, []);

    useEffect(() => {
        if (!token) return;

        const sendHeartbeat = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
                await axios.post(`${API_BASE}/users/heartbeat`, {}, { timeout: 5000 });
            } catch (err) {
                console.warn('Heartbeat update failed', err.message);
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 15000);
        return () => clearInterval(interval);
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            if (user.latitude && user.longitude) {
                const loc = {
                    lat: parseFloat(user.latitude),
                    lng: parseFloat(user.longitude),
                    neighborhood: user.neighborhood || 'Cairo, Egypt',
                    source: 'profile'
                };
                setUserLocation(loc);
                localStorage.setItem('user_location', JSON.stringify(loc));
            }
        }
    }, [user]);
    const fetchUser = async () => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
            const res = await axios.get(`${API_BASE}/auth/me`, { timeout: 8000 });
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (error) {
            console.error('Failed to fetch user', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = (newToken, userData) => {
        setToken(newToken);
        if (userData) {
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        }
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('user_location');
        setUserLocation({ lat: 30.0444, lng: 31.2357, neighborhood: 'Cairo, Egypt', source: 'default' });
    };

    const updateUserLocation = async (lat, lng, neighborhood) => {
        const loc = { lat: parseFloat(lat), lng: parseFloat(lng), neighborhood, source: 'user_set' };
        setUserLocation(loc);
        localStorage.setItem('user_location', JSON.stringify(loc));

        if (token) {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
                const res = await axios.put(`${API_BASE}/auth/profile/location`, {
                    latitude: lat,
                    longitude: lng,
                    neighborhood
                });
                if (res.data.user) {
                    setUser(res.data.user);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }
            } catch (error) {
                console.error('Failed to save location to profile:', error);
            }
        }
    };

    const isFeatureLive = (name) => featureFlags[name] !== false;

    const value = {
        user,
        token,
        loading,
        userLocation,
        updateUserLocation,
        login,
        logout,
        setUser,
        featureFlags,
        isFeatureLive
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
