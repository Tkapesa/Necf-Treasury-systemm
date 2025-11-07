/**
 * Fixed Header Component
 * 
 * STATIC header that stays visible during scrolling with glassmorphism effect
 * Modern design with smooth animations and professional appearance
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronRight, 
  Bell, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  User,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import logoImage from '../assets/images/logos/Copy of logo REMAKE.png';

interface FixedHeaderProps {
  title?: string;
  subtitle?: string;
  showBreadcrumbs?: boolean;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export const FixedHeader: React.FC<FixedHeaderProps> = ({
  title = "Treasury Management",
  subtitle = "NECF Financial System",
  showBreadcrumbs = true,
  onMenuToggle,
  isMenuOpen = false
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationCount] = useState(3); // Example notification count

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', href: '/' }];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      breadcrumbs.push({ label, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Load dark mode preference on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const userInitials = user?.username 
    ? user.username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 
        bg-white/95 dark:bg-gray-900/95 
        backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50
        transition-all duration-300
        ${scrolled ? 'shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50' : 'shadow-md'}
      `}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-lg blur opacity-25"></div>
                <img
                  className="relative h-10 w-10 rounded-lg object-contain ring-2 ring-maroon-500/20"
                  src={logoImage}
                  alt="NECF Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Dark mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
              aria-label="Toggle dark mode"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <button 
              className="relative p-2.5 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-all duration-200 transform hover:scale-105"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-maroon-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-maroon-500 text-white text-[8px] items-center justify-center font-bold">
                    {notificationCount}
                  </span>
                </span>
              )}
            </button>

            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 sm:space-x-3 p-2 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.username || 'User'}</p>
                  <div className="flex items-center space-x-1">
                    {user?.role === 'admin' && <Shield className="h-3 w-3 text-maroon-600 dark:text-maroon-400" />}
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">{user?.role || 'User'}</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-full blur opacity-25"></div>
                  <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-maroon-600 to-maroon-800 flex items-center justify-center ring-2 ring-maroon-500/20 group-hover:ring-4 transition-all duration-200">
                    <span className="text-white font-bold text-sm">{userInitials}</span>
                  </div>
                </div>
              </button>

              {/* Dropdown menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                    {/* Profile Header */}
                    <div className="px-4 py-3 bg-gradient-to-br from-maroon-50 to-maroon-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-maroon-600 to-maroon-800 flex items-center justify-center ring-2 ring-white dark:ring-gray-700">
                          <span className="text-white font-bold">{userInitials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {user?.role === 'admin' && <Shield className="h-3 w-3 text-maroon-600 dark:text-maroon-400" />}
                            <span className="text-xs text-maroon-600 dark:text-maroon-400 font-semibold capitalize">{user?.role}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors group"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400 group-hover:text-maroon-600 dark:group-hover:text-maroon-400 transition-colors" />
                        <span className="font-medium">Profile Settings</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors group"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400 group-hover:text-maroon-600 dark:group-hover:text-maroon-400 transition-colors" />
                        <span className="font-medium">Preferences</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors group"
                      >
                        <LogOut className="h-4 w-4 mr-3 group-hover:translate-x-1 transition-transform" />
                        <span className="font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbs.length > 1 && (
          <div className="py-2.5 border-t border-gray-100 dark:border-gray-800">
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-gray-900 dark:text-white font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.href}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default FixedHeader;
