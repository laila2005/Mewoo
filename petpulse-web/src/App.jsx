import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
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
import Appointments from './pages/Appointments';
import PetShops from './pages/PetShops';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import ManagePet from './pages/ManagePet';
import Faq from './pages/Faq';
import PaymentSuccess from './pages/PaymentSuccess';
import Trainers from './pages/Trainers';
import TrainerDetails from './pages/TrainerDetails';
import Settings from './pages/Settings';
import BookingDetails from './pages/BookingDetails';
import Checkout from './pages/Checkout';
import LostFound from './pages/LostFound';
import Adoption from './pages/Adoption';
import NotFound from './pages/NotFound';

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
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Guest-only Routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

      {/* Routes with Main Layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/community" element={<Community />} />
        <Route path="/pet-profile" element={<PetProfile />} />
        <Route path="/owner-profile" element={<OwnerProfile />} />
        <Route path="/vets" element={<Vets />} />
        <Route path="/vet-booking" element={<VetBooking />} />
        <Route path="/pet-shops" element={<PetShops />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/trainers" element={<Trainers />} />
        <Route path="/trainer-details" element={<TrainerDetails />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/adoption" element={<Adoption />} />
        
        {/* Protected Routes */}
        <Route path="/messages" element={
          <ProtectedRoute>
            <Messages />
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
        <Route path="/appointments" element={
          <ProtectedRoute>
            <Appointments />
          </ProtectedRoute>
        } />
        <Route path="/booking-details" element={
          <ProtectedRoute>
            <BookingDetails />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <Checkout />
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
      </Router>
    </AuthProvider>
  );
}

export default App;

