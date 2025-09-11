/**
 * Professional Sidebar Navigation
 * 
 * Implements the clean sidebar design from the reference with collapsible navigation
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  CreditCardIcon,
  ReceiptIcon,
  ArrowRightLeftIcon,
  RepeatIcon,
  CheckCircleIcon,
  BarChart3Icon,
  SettingsIcon,
  ChevronDownIcon,
  DollarSignIcon,
  FileTextIcon,
  UsersIcon
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
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Cash management', 'Payments']);

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
      name: 'Home',
      href: user?.role === 'admin' ? '/admin' : '/dashboard',
      icon: <HomeIcon className="h-5 w-5" />,
      current: isActive('/') || isActive('/admin') || isActive('/dashboard')
    },
    {
      name: 'Cash Management',
      icon: <DollarSignIcon className="h-5 w-5" />,
      children: [
        {
          name: 'Receipts',
          href: '/receipts',
          icon: <ReceiptIcon className="h-4 w-4" />,
          current: isActive('/receipts')
        },
        {
          name: 'Upload Receipt',
          href: '/receipts/upload',
          icon: <FileTextIcon className="h-4 w-4" />,
          current: isActive('/receipts/upload')
        },
        ...(user?.role === 'admin' ? [{
          name: 'All Receipts',
          href: '/admin/receipts',
          icon: <ReceiptIcon className="h-4 w-4" />,
          current: isActive('/admin/receipts')
        }] : [])
      ]
    },
    {
      name: 'Payments',
      icon: <CreditCardIcon className="h-5 w-5" />,
      children: [
        {
          name: 'Credit Transfers',
          href: '/payments/transfers',
          icon: <ArrowRightLeftIcon className="h-4 w-4" />,
          current: isActive('/payments/transfers')
        },
        {
          name: 'Direct Debits',
          href: '/payments/debits',
          icon: <ArrowRightLeftIcon className="h-4 w-4" />,
          current: isActive('/payments/debits')
        },
        {
          name: 'Mandates',
          href: '/payments/mandates',
          icon: <FileTextIcon className="h-4 w-4" />,
          current: isActive('/payments/mandates')
        },
        {
          name: 'Counterparties',
          href: '/payments/counterparties',
          icon: <UsersIcon className="h-4 w-4" />,
          current: isActive('/payments/counterparties')
        }
      ]
    },
    {
      name: 'Expected Transfers',
      href: '/transfers/expected',
      icon: <RepeatIcon className="h-5 w-5" />,
      current: isActive('/transfers/expected')
    },
    {
      name: 'Sweeping Rules',
      href: '/rules/sweeping',
      icon: <RepeatIcon className="h-5 w-5" />,
      current: isActive('/rules/sweeping')
    },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: <CheckCircleIcon className="h-5 w-5" />,
      current: isActive('/approvals')
    },
    {
      name: 'Live Analytics',
      href: '/admin/analytics',
      icon: <BarChart3Icon className="h-5 w-5" />,
      current: isActive('/admin/analytics'),
      badge: 'LIVE'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      current: isActive('/settings')
    }
  ];

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isItemActive = item.current || (hasChildren && isChildActive(item.children!));
    
    const paddingLeft = level === 0 ? 'pl-3' : 'pl-8';
    const iconSize = level === 0 ? 'h-5 w-5' : 'h-4 w-4';

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`
              w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
              ${isItemActive
                ? 'bg-gray-50 text-gray-900 border-r-2 border-maroon-600 dark:bg-gray-800 dark:text-white'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
              }
            `}
          >
            <div className="flex items-center">
              <span className={`${isItemActive ? 'text-maroon-600 dark:text-maroon-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'} mr-3 ${iconSize}`}>
                {item.icon}
              </span>
              {item.name}
            </div>
            <ChevronDownIcon 
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
            />
          </button>
          
          {isExpanded && (
            <div className="mt-1 space-y-1">
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
          group flex items-center ${paddingLeft} pr-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
          ${isItemActive
            ? 'bg-gray-50 text-gray-900 border-r-2 border-maroon-600 dark:bg-gray-800 dark:text-white'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
          }
        `}
        aria-current={isItemActive ? 'page' : undefined}
      >
        <span className={`${isItemActive ? 'text-maroon-600 dark:text-maroon-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'} mr-3 ${iconSize}`}>
          {item.icon}
        </span>
        {item.name}
        {item.badge && (
          <span className="ml-auto bg-maroon-100 text-maroon-600 text-xs font-medium px-2 py-1 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 lg:z-auto
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-300 ease-in-out lg:transition-none
          flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          lg:sticky lg:top-16
        `}
      >
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map(item => renderNavigationItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>© 2025 NECF Treasury</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
