/**
 * Live Analytics Page
 * 
 * Real-time financial analytics and insights for church treasury management
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { 
  BarChart3Icon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon
} from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  pendingApprovals: number;
  monthlyGrowth: number;
  weeklyTransactions: Array<{
    day: string;
    amount: number;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  recentAlerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'success';
    message: string;
    timestamp: Date;
  }>;
}

export const LiveAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock data for demonstration
  const mockAnalyticsData: AnalyticsData = {
    totalRevenue: 125640.50,
    totalExpenses: 89230.75,
    pendingApprovals: 12,
    monthlyGrowth: 8.5,
    weeklyTransactions: [
      { day: 'Mon', amount: 2450.30, count: 8 },
      { day: 'Tue', amount: 1890.75, count: 6 },
      { day: 'Wed', amount: 3210.20, count: 12 },
      { day: 'Thu', amount: 2780.90, count: 9 },
      { day: 'Fri', amount: 4120.80, count: 15 },
      { day: 'Sat', amount: 1640.25, count: 5 },
      { day: 'Sun', amount: 8950.45, count: 18 }
    ],
    categoryBreakdown: [
      { category: 'Ministry Supplies', amount: 35420.30, percentage: 35, color: 'bg-blue-500' },
      { category: 'Utilities', amount: 28560.75, percentage: 28, color: 'bg-green-500' },
      { category: 'Events', amount: 18790.20, percentage: 19, color: 'bg-yellow-500' },
      { category: 'Maintenance', amount: 12340.80, percentage: 12, color: 'bg-purple-500' },
      { category: 'Other', amount: 6120.45, percentage: 6, color: 'bg-gray-500' }
    ],
    recentAlerts: [
      {
        id: '1',
        type: 'warning',
        message: 'High expense alert: Utilities exceeded budget by 15%',
        timestamp: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        id: '2',
        type: 'success',
        message: 'Monthly goal achieved: 105% of target reached',
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        id: '3',
        type: 'info',
        message: '5 receipts pending approval from Finance Committee',
        timestamp: new Date(Date.now() - 45 * 60 * 1000)
      }
    ]
  };

  useEffect(() => {
    // Simulate loading and periodic updates
    const loadData = () => {
      setTimeout(() => {
        setAnalyticsData(mockAnalyticsData);
        setLoading(false);
        setLastUpdated(new Date());
      }, 1000);
    };

    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setAnalyticsData(mockAnalyticsData);
      setLoading(false);
      setLastUpdated(new Date());
    }, 500);
  };

  if (loading || !analyticsData) {
    return (
      <MainLayout title="Live Analytics" subtitle="Real-time Treasury Insights">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600 mx-auto"></div>
            <p className="mt-4 text-maroon-700 font-medium">Loading Live Analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const netIncome = analyticsData.totalRevenue - analyticsData.totalExpenses;
  const maxTransaction = Math.max(...analyticsData.weeklyTransactions.map(t => t.amount));

  return (
    <MainLayout title="Live Analytics" subtitle="Real-time Treasury Insights">
      {/* Header with refresh */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Live Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${analyticsData.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUpIcon className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium ml-1">
              {analyticsData.monthlyGrowth}% from last month
            </span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${analyticsData.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDownIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowDownIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600 font-medium ml-1">
              2.1% from last month
            </span>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Income</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${netIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-gray-600">
              Revenue - Expenses
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {analyticsData.pendingApprovals}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-sm text-yellow-600 font-medium">
              Requires attention
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Transactions Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Transactions</h3>
            <BarChart3Icon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.weeklyTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-10">
                    {transaction.day}
                  </span>
                  <div className="flex-1">
                    <div 
                      className="bg-maroon-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(transaction.amount / maxTransaction) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transaction.count} transactions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
                {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Categories</h3>
            <DollarSignIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {analyticsData.categoryBreakdown.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 60}, 60%, 50%)` }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${category.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {category.percentage}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Alerts</h3>
          <AlertTriangleIcon className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {analyticsData.recentAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex-shrink-0">
                {alert.type === 'warning' && (
                  <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
                )}
                {alert.type === 'success' && (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                )}
                {alert.type === 'info' && (
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {alert.timestamp.toLocaleTimeString()} - {alert.timestamp.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveAnalytics;
