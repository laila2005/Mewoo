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
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
            const res = await axios.get(`${API_BASE}/auth/me`);
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
                const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
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

    const value = {
        user,
        token,
        loading,
        userLocation,
        updateUserLocation,
        login,
        logout,
        setUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
