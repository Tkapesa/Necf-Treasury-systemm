/**
 * Layout Component
 * 
 * Provides consistent layout structure for authenticated pages with header and content area
 */

import React from 'react';
import { Header } from './Header';
import backgroundImage from '../assets/images/backgrounds/Copy of logo REMAKE.png';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title
}) => {
  return (
    <div className="min-h-screen bg-primary-50">
      <Header title={title} />
      <main 
        className={`flex-1 relative`}
        style={{
          backgroundImage: `linear-gradient(rgba(240, 249, 255, 0.85), rgba(240, 249, 255, 0.85)), url(${backgroundImage})`,
          backgroundSize: 'contain',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#f0f9ff',
          minHeight: 'calc(100vh - 4rem)'
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
