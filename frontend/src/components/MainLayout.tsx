/**
 * Enhanced Main Layout Component
 * 
 * Professional layout with fixed header, sidebar navigation, and main content area
 * Based on modern dashboard design patterns
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Header */}
      <FixedHeader
        title={title}
        subtitle={subtitle}
        showBreadcrumbs={showBreadcrumbs}
        onMenuToggle={handleMenuToggle}
        isMenuOpen={sidebarOpen}
      />

      <div className="flex pt-16">
        {/* Sidebar Navigation */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
        />

        {/* Main Content Area */}
        <main className={`flex-1 min-h-screen overflow-auto ${className}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
