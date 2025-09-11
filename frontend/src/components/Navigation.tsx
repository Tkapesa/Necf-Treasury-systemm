import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoImage from '../assets/images/logos/Copy of logo REMAKE.png';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-secondary-600 text-white' : 'text-red-100 hover:bg-secondary-600 hover:text-white';
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-red-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <img
                className="h-8 w-8 object-contain"
                src={logoImage}
                alt="Church Logo"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-bold text-white">NECF Treasury</h1>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  to="/receipts/upload"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive('/receipts/upload')}`}
                >
                  Upload Receipt
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive('/admin')}`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/reports"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive('/reports')}`}
                    >
                      Reports
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-red-200">
                  Welcome, <span className="font-medium text-white">{user.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-200 hover:bg-red-700 hover:text-white transition-all duration-200 border border-red-600 hover:border-red-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="md:hidden border-t border-red-600">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-red-700">
          <Link
            to="/receipts/upload"
            className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive('/receipts/upload')}`}
          >
            Upload Receipt
          </Link>
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive('/admin')}`}
              >
                Dashboard
              </Link>
              <Link
                to="/reports"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${isActive('/reports')}`}
              >
                Reports
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
