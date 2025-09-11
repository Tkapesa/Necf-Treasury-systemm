/**
 * Modern Financial Charts Dashboard
 * 
 * Features beautiful, responsive charts using Recharts:
 * - Stunning animations and transitions
 * - Professional gradients and colors
 * - Interactive tooltips and legends
 * - Real-time data updates
 * - Mobile responsive design
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Area,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { 
  TrendingUpIcon, 
  DollarSignIcon, 
  PieChartIcon, 
  BarChartIcon, 
  RefreshCwIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CreditCardIcon
} from 'lucide-react';
import { apiClient } from '../../api/client';

// Enhanced color palette for stunning visuals
const COLORS = {
  primary: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'],
  success: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'],
  warning: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7'],
  danger: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'],
  gradient: {
    primary: 'url(#primaryGradient)',
    success: 'url(#successGradient)',
    warning: 'url(#warningGradient)',
  }
};

// Types for enhanced chart data
interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

interface MonthlyTrend {
  month: string;
  amount: number;
  budget: number;
  receipts: number;
}

interface BudgetComparison {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  percentUsed: number;
}

interface EnhancedChartData {
  categorySpending: CategorySpending[];
  monthlyTrends: MonthlyTrend[];
  budgetComparison: BudgetComparison[];
  totalStats: {
    totalSpent: number;
    totalReceipts: number;
    averageAmount: number;
    monthlyBudget: number;
    budgetUsed: number;
    monthReceipts: number;
    monthAmount: number;
  };
}

// Custom gradient definitions
const GradientDefs: React.FC = () => (
  <defs>
    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
    </linearGradient>
  </defs>
);

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 backdrop-blur-sm bg-opacity-95">
        <p className="text-gray-800 dark:text-gray-200 font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.dataKey}:</span> ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Enhanced stat card component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
  subtitle?: string;
}> = ({ title, value, icon, trend, color = 'bg-gradient-to-r from-purple-500 to-purple-600', subtitle }) => (
  <div className={`${color} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-purple-100 text-xs font-medium truncate">{title}</p>
        <p className="text-lg sm:text-xl font-bold truncate">{typeof value === 'number' ? `$${value.toLocaleString()}` : value}</p>
        {subtitle && <p className="text-purple-200 text-xs mt-1 truncate">{subtitle}</p>}
      </div>
      <div className="text-2xl opacity-80 ml-2">{icon}</div>
    </div>
    {trend !== undefined && (
      <div className="flex items-center mt-2">
        {trend > 0 ? (
          <ArrowUpIcon className="w-3 h-3 text-green-300" />
        ) : (
          <ArrowDownIcon className="w-3 h-3 text-red-300" />
        )}
        <span className={`text-xs ml-1 ${trend > 0 ? 'text-green-300' : 'text-red-300'}`}>
          {Math.abs(trend)}%
        </span>
      </div>
    )}
  </div>
);

export const ModernFinancialCharts: React.FC = () => {
  const [chartData, setChartData] = useState<EnhancedChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChartData = async () => {
    try {
      setRefreshing(true);
      const data = await apiClient.get<EnhancedChartData>('/admin/analytics/charts');
      console.log('Chart data received:', data);
      setChartData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load analytics data. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-center">Loading financial analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Analytics Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchChartData}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = chartData?.totalStats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Financial Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Real-time insights into Near East Christian Fellowship treasury</p>
            </div>
            <button
              onClick={fetchChartData}
              disabled={refreshing}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 border border-gray-200 text-sm sm:text-base"
            >
              <RefreshCwIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Spent"
            value={stats?.totalSpent || 0}
            icon={<DollarSignIcon className="w-6 h-6" />}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
            subtitle={`${stats?.totalReceipts || 0} receipts`}
          />
          <StatCard
            title="This Month"
            value={stats?.monthAmount || 0}
            icon={<CalendarIcon className="w-6 h-6" />}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
            subtitle={`${stats?.monthReceipts || 0} receipts`}
          />
          <StatCard
            title="Average Amount"
            value={stats?.averageAmount || 0}
            icon={<CreditCardIcon className="w-6 h-6" />}
            color="bg-gradient-to-r from-green-500 to-green-600"
          />
          <StatCard
            title="Budget Used"
            value={`${((stats?.budgetUsed || 0) * 100).toFixed(1)}%`}
            icon={<TrendingUpIcon className="w-6 h-6" />}
            color="bg-gradient-to-r from-orange-500 to-red-500"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Category Spending - Enhanced Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PieChartIcon className="text-purple-600 w-5 h-5" />
              Spending by Category
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <GradientDefs />
                  <Pie
                    data={chartData?.categorySpending}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="amount"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {chartData?.categorySpending.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || COLORS.primary[index % COLORS.primary.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={50}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    formatter={(value) => {
                      const data = chartData?.categorySpending.find(item => item.category === value);
                      return `${value} (${data?.percentage || 0}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends - Enhanced Area Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUpIcon className="text-blue-600 w-5 h-5" />
              Monthly Spending Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData?.monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <GradientDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#8B5CF6"
                    fill={COLORS.gradient.primary}
                    strokeWidth={2}
                    animationDuration={2000}
                    name="Actual Spending"
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    animationDuration={2000}
                    name="Budget"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget vs Actual - Enhanced Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChartIcon className="text-green-600 w-5 h-5" />
              Budget vs Actual Spending
            </h3>
            {chartData?.budgetComparison && chartData.budgetComparison.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.budgetComparison} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#6b7280"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={11}
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar 
                      dataKey="budget" 
                      fill={COLORS.success[0]}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                      name="Budget"
                    />
                    <Bar 
                      dataKey="actual" 
                      fill={COLORS.primary[0]}
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                      name="Actual"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                <p>No budget comparison data available</p>
              </div>
            )}
          </div>

          {/* Budget Usage - Radial Progress Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUpIcon className="text-orange-600 w-5 h-5" />
              Budget Usage Overview
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="20%" 
                  outerRadius="80%" 
                  data={chartData?.budgetComparison?.slice(0, 6)}
                  startAngle={90}
                  endAngle={450}
                >
                  <RadialBar 
                    dataKey="percentUsed" 
                    cornerRadius={8} 
                    fill={COLORS.gradient.warning}
                    animationDuration={2000}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm">{data.category}</p>
                            <p className="text-xs">Used: {data.percentUsed.toFixed(1)}%</p>
                            <p className="text-xs">Budget: ${data.budget.toLocaleString()}</p>
                            <p className="text-xs">Actual: ${data.actual.toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    iconSize={8}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-xs sm:text-sm">
          <p>Data refreshes automatically every 30 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ModernFinancialCharts;
