/**
 * Live Financial Charts Component
 * 
 * Features:
 * - Real-time spending analytics
 * - Category breakdown charts
 * - Time-based spending trends
 * - Budget tracking and alerts
 */

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { TrendingUpIcon, DollarSignIcon, PieChartIcon, RefreshCwIcon } from 'lucide-react';
import { apiClient } from '../../api/client';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// Types for chart data
interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

interface MonthlySpending {
  month: string;
  amount: number;
  receipts_count: number;
}

interface BudgetData {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
}

interface ChartData {
  categorySpending: CategorySpending[];
  monthlyTrends: MonthlySpending[];
  budgetTracking: BudgetData[];
  totalSpent: number;
  totalBudget: number;
  currentMonthSpending: number;
}

export const SpendingCharts: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load chart data
  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<ChartData>('/admin/analytics/charts');
      setChartData(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load chart data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadChartData();
    const interval = setInterval(loadChartData, 30000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading && !chartData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-red-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-red-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'No data available'}</p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          <RefreshCwIcon className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  // Category spending pie chart
  const categoryChartData = {
    labels: chartData.categorySpending.map(item => item.category),
    datasets: [
      {
        data: chartData.categorySpending.map(item => item.amount),
        backgroundColor: chartData.categorySpending.map(item => item.color),
        borderColor: '#ffffff',
        borderWidth: 2,
      }
    ]
  };

  // Monthly trends line chart
  const trendsChartData = {
    labels: chartData.monthlyTrends.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Spending',
        data: chartData.monthlyTrends.map(item => item.amount),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // Budget tracking bar chart
  const budgetChartData = {
    labels: chartData.budgetTracking.map(item => item.category),
    datasets: [
      {
        label: 'Budget',
        data: chartData.budgetTracking.map(item => item.budget),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: '#22c55e',
        borderWidth: 1,
      },
      {
        label: 'Spent',
        data: chartData.budgetTracking.map(item => item.spent),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#ef4444',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed || context.raw;
            return `${context.label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 p-4">
          <div className="flex items-center">
            <DollarSignIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-red-800">${chartData.totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-orange-200 p-4">
          <div className="flex items-center">
            <TrendingUpIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-orange-800">${chartData.currentMonthSpending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-green-200 p-4">
          <div className="flex items-center">
            <PieChartIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Budget Remaining</p>
              <p className="text-2xl font-bold text-green-800">${(chartData.totalBudget - chartData.totalSpent).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-800">Spending by Category</h3>
            <button onClick={handleRefresh} className="text-red-600 hover:text-red-800">
              <RefreshCwIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64">
            <Doughnut data={categoryChartData} options={{ ...chartOptions, scales: undefined }} />
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-4">Monthly Spending Trends</h3>
          <div className="h-64">
            <Line data={trendsChartData} options={chartOptions} />
          </div>
        </div>

        {/* Budget Tracking */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-red-800 mb-4">Budget vs Actual Spending</h3>
          <div className="h-64">
            <Bar data={budgetChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Category Details Table */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200">
          <h3 className="text-lg font-semibold text-red-800">Category Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-red-200">
            <thead className="bg-red-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Receipts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-red-200">
              {chartData.categorySpending.map((category, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{category.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${category.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {category.percentage.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {category.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SpendingCharts;
