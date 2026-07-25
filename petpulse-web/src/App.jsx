import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Messages from './pages/Messages';
import Marketplace from './pages/Marketplace';
import Community from './pages/Community';
import Explore from './pages/Explore';
import EditProfile from './pages/EditProfile';
import PetProfile from './pages/PetProfile';
import OwnerProfile from './pages/OwnerProfile';
import VetBooking from './pages/VetBooking';
import Vets from './pages/Vets';
import PetShops from './pages/PetShops';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import ManagePet from './pages/ManagePet';
import Faq from './pages/Faq';
import PaymentSuccess from './pages/PaymentSuccess';
import ProductDetails from './pages/ProductDetails';

// Legal Pages
import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';
import Cookies from './pages/legal/Cookies';
import Trainers from './pages/Trainers';
import TrainerDetails from './pages/TrainerDetails';
import Settings from './pages/Settings';
import BookingDetails from './pages/BookingDetails';
import Checkout from './pages/Checkout';
import LostFound from './pages/LostFound';
import NotFound from './pages/NotFound';
import PulseBox from './pages/PulseBox';
import VendorDashboard from './pages/VendorDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import RestrictedAccessInline from './components/common/RestrictedAccessInline';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'vet' || user.role === 'trainer') {
      return <Navigate to="/pro-dashboard" replace />;
    }
    if (user.role === 'vendor') {
      return <Navigate to="/vendor-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
};

const ProRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'vet' && user.role !== 'trainer') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const VendorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'vendor') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const StandardUserRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  const userRole = user && user.role ? user.role.toLowerCase().trim() : '';
  if (user && ['vet', 'trainer', 'vendor'].includes(userRole)) {
    return <RestrictedAccessInline userRole={userRole} />;
  }
  return children;
};

const NonVendorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  const userRole = user && user.role ? user.role.toLowerCase().trim() : '';
  if (user && userRole === 'vendor') {
    return <RestrictedAccessInline userRole={userRole} />;
  }
  return children;
};

const ClientOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (user) {
    const userRole = user.role ? user.role.toLowerCase().trim() : '';
    if (userRole === 'vet' || userRole === 'trainer') {
      return <Navigate to="/pro-dashboard" replace />;
    }
    if (userRole === 'vendor') {
      return <Navigate to="/vendor-dashboard" replace />;
    }
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Guest-only Routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

      {/* Routes with Main Layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<ClientOnlyRoute><Home /></ClientOnlyRoute>} />
        <Route path="/marketplace" element={<StandardUserRoute><Marketplace /></StandardUserRoute>} />
        <Route path="/marketplace/product/:id" element={<ProductDetails />} />
        <Route path="/explore" element={<StandardUserRoute><Explore /></StandardUserRoute>} />
        <Route path="/community" element={<Community />} />
        <Route path="/pet-profile" element={<PetProfile />} />
        <Route path="/owner-profile" element={<OwnerProfile />} />
        <Route path="/vets" element={<Vets />} />
        <Route path="/vet-booking" element={<StandardUserRoute><VetBooking /></StandardUserRoute>} />
        <Route path="/pet-shops" element={<PetShops />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        
        {/* Legal Routes */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />

        <Route path="/trainers" element={<StandardUserRoute><Trainers /></StandardUserRoute>} />
        <Route path="/trainer-details" element={<StandardUserRoute><TrainerDetails /></StandardUserRoute>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/pulsebox" element={<PulseBox />} />
        
        {/* Protected Routes */}
        <Route path="/messages" element={
          <ProtectedRoute>
            <NonVendorRoute>
              <Messages />
            </NonVendorRoute>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/manage-pet" element={
          <ProtectedRoute>
            <ManagePet />
          </ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        {/* Appointments now live as a tab inside the profile page */}
        <Route path="/appointments" element={<Navigate to="/profile?tab=appointments" replace />} />
        <Route path="/bookings" element={<Navigate to="/profile?tab=appointments" replace />} />
        <Route path="/booking-details" element={
          <ProtectedRoute>
            <StandardUserRoute>
              <BookingDetails />
            </StandardUserRoute>
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        } />
        <Route path="/vendor-dashboard" element={
          <ProtectedRoute>
            <VendorRoute>
              <VendorDashboard />
            </VendorRoute>
          </ProtectedRoute>
        } />
        <Route path="/pro-dashboard" element={
          <ProtectedRoute>
            <ProRoute>
              <ProfessionalDashboard />
            </ProRoute>
          </ProtectedRoute>
        } />
        {/* Fallback inside MainLayout */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin Route - No MainLayout */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '14px' } }} />
        <AppRoutes />
        <Analytics />
      </Router>
    </AuthProvider>
  );
}

export default App;

