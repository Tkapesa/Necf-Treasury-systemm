/**
 * Enhanced Main Layout Component
 * 
 * Professional layout with FIXED header, FIXED sidebar navigation, and main content area
 * Modern dashboard design with smooth transitions and responsive layout
 */

import React, { useState } from 'react';
import FixedHeader from './FixedHeader';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBreadcrumbs?: boolean;
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  showBreadcrumbs = true,
  className = ''
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Fixed Header - Always visible at top */}
      <FixedHeader
        title={title}
        subtitle={subtitle}
        showBreadcrumbs={showBreadcrumbs}
        onMenuToggle={handleMenuToggle}
        isMenuOpen={sidebarOpen}
      />

      <div className="flex">
        {/* Fixed Sidebar Navigation - Always visible on desktop */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
        />

        {/* Main Content Area - Adjusted for fixed header and sidebar */}
        <main className={`flex-1 lg:ml-64 mt-16 min-h-[calc(100vh-4rem)] overflow-auto ${className}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={handleSidebarClose}
        />
      )}
    </div>
  );
};

export default MainLayout;
