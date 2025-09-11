import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Auth/Login';
import { UploadReceipt } from './pages/receipts/UploadReceipt';
import { AdminDashboard } from './pages/AdminDashboard';
import EnhancedAdminDashboard from './pages/EnhancedAdminDashboard';
import LiveAnalytics from './pages/LiveAnalytics';
import PurchaserPortal from './pages/PurchaserPortal';
import LandingPage from './pages/LandingPage';
import AnimatedLandingPage from './components/AnimatedLandingPage';
import Reports from './pages/Reports';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Main Dashboard Component - redirects admin users to admin dashboard
const DashboardPage = () => {
  const { user } = useAuth();
  
  // If user is admin, redirect to the comprehensive admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  // For non-admin users, show a simple dashboard
  return (
    <div className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(240, 249, 255, 0.85), rgba(240, 249, 255, 0.85)), url(/src/assets/images/backgrounds/Copy%20of%20logo%20REMAKE.png)`,
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f0f9ff'
      }}
    >
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-white/95 backdrop-blur-sm">
            <div className="card-header">
              <h1 className="text-3xl font-bold text-primary-700">
                Near East Christian Fellowship Treasury
              </h1>
              <p className="mt-2 text-sm text-secondary-600">
                Welcome back, {user?.username}! ({user?.role})
              </p>
            </div>
            <div className="card-body">
              <div className="text-center py-8">
                <h2 className="text-xl font-semibold text-primary-700 mb-4">User Dashboard</h2>
                <p className="text-secondary-600 mb-6">
                  Upload your receipts and track your submissions.
                </p>
                <Link
                  to="/receipts/upload"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Upload Receipt
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className="App min-h-screen bg-gray-50">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<AnimatedLandingPage />} />
              <Route path="/landing-original" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              
              {/* Public Purchaser Portal - no authentication required */}
              <Route path="/purchaser" element={<PurchaserPortal />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/receipts/upload" element={<UploadReceipt />} />
                <Route path="/admin" element={<EnhancedAdminDashboard />} />
                <Route path="/admin/analytics" element={<LiveAnalytics />} />
                <Route path="/admin-original" element={<AdminDashboard />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
              
              {/* Catch all route - redirect to landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
