/**
 * Professional FIXED Sidebar Navigation
 * 
 * Modern fixed sidebar with glassmorphism and smooth animations
 * Stays visible on desktop, slides in on mobile
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ChevronDown,
  FileText,
  Upload,
  TrendingUp,
  Wallet,
  Settings,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  current?: boolean;
  children?: NavigationItem[];
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isChildActive = (children: NavigationItem[]) => 
    children.some(child => child.href && isActive(child.href));

  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: user?.role === 'admin' ? '/admin' : '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      current: isActive('/') || isActive('/admin') || isActive('/dashboard')
    },
    {
      name: 'Upload Receipt',
      href: '/receipts/upload',
      icon: <Upload className="h-5 w-5" />,
      current: isActive('/receipts/upload')
    },
    ...(user?.role === 'admin' ? [
      {
        name: 'Live Analytics',
        href: '/admin/analytics',
        icon: <TrendingUp className="h-5 w-5" />,
        current: isActive('/admin/analytics'),
        badge: 'LIVE',
        badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      },
      {
        name: 'Reports',
        href: '/reports',
        icon: <FileText className="h-5 w-5" />,
        current: isActive('/reports')
      },
      {
        name: 'Treasury',
        href: '/treasury',
        icon: <Wallet className="h-5 w-5" />,
        current: isActive('/treasury'),
        badge: 'NEW',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      }
    ] : [])
  ];

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isItemActive = item.current || (hasChildren && isChildActive(item.children!));
    
    const paddingLeft = level === 0 ? 'pl-3' : 'pl-10';

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`
              w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
              ${isItemActive
                ? 'bg-gradient-to-r from-maroon-500 to-maroon-600 text-white shadow-lg shadow-maroon-500/30'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
              }
            `}
          >
            <div className="flex items-center">
              <span className={`${isItemActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} mr-3 transition-colors`}>
                {item.icon}
              </span>
              <span className="font-semibold">{item.name}</span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
            />
          </button>
          
          {isExpanded && (
            <div className="mt-1 space-y-1 ml-4">
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href!}
        onClick={onClose}
        className={`
          group flex items-center ${paddingLeft} pr-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02]
          ${isItemActive
            ? 'bg-gradient-to-r from-maroon-500 to-maroon-600 text-white shadow-lg shadow-maroon-500/30'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
          }
        `}
        aria-current={isItemActive ? 'page' : undefined}
      >
        <span className={`${isItemActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} mr-3 transition-colors`}>
          {item.icon}
        </span>
        <span className="flex-1 font-semibold">{item.name}</span>
        {item.badge && (
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-maroon-100 text-maroon-700 dark:bg-maroon-900 dark:text-maroon-300'}`}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Sidebar - FIXED on desktop */}
      <aside 
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 lg:z-30
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-300 ease-in-out
          flex flex-col w-64 
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg
          border-r border-gray-200/50 dark:border-gray-700/50
          shadow-xl lg:shadow-none
        `}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {/* Quick Stats Card */}
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-maroon-50 to-maroon-100 dark:from-gray-800 dark:to-gray-700 border border-maroon-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="h-4 w-4 text-maroon-600 dark:text-maroon-400" />
              <span className="text-xs font-bold text-maroon-900 dark:text-maroon-200 uppercase tracking-wide">Quick Stats</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Receipts</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">24</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">$1.2K</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Main Menu
            </p>
            {navigationItems.map(item => renderNavigationItem(item))}
          </div>

          {/* Settings Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Other
            </p>
            <Link
              to="/settings"
              className="group flex items-center pl-3 pr-3 py-2.5 text-sm font-medium rounded-xl text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-all duration-200"
            >
              <Settings className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 mr-3 transition-colors" />
              <span className="font-semibold">Settings</span>
            </Link>
            <Link
              to="/help"
              className="group flex items-center pl-3 pr-3 py-2.5 text-sm font-medium rounded-xl text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-all duration-200"
            >
              <HelpCircle className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300 mr-3 transition-colors" />
              <span className="font-semibold">Help & Support</span>
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p className="font-semibold text-gray-700 dark:text-gray-300">NECF Treasury</p>
            <p className="text-gray-400 dark:text-gray-500">Version 1.0.0</p>
            <p className="text-gray-400 dark:text-gray-500">© 2025 All rights reserved</p>
          </div>
        </div>
      </aside>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
