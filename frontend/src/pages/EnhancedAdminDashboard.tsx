/**
 * Enhanced Admin Dashboard with Professional Layout
 * 
 * Features:
 * - Mo  // Filter configurations
  const filterConfigs = [rn professional layout with fixed header and sidebar
 * - Enhanced receipt data display with images and detailed information
 * - Professional table design like the reference
 * - Real-time data updates and comprehensive filtering
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCwIcon, 
  DownloadIcon, 
  PlusIcon, 
  TrendingUpIcon, 
  AlertCircleIcon,
  DollarSignIcon,
  CalendarIcon
} from 'lucide-react';

import apiClient from '../api/client';
import FilterBar, { FilterValues, FilterConfig } from '../components/FilterBar';
import EnhancedReceiptModal from '../components/EnhancedReceiptModal';
import MainLayout from '../components/MainLayout';
import EnhancedReceiptTable, { EnhancedReceiptData } from '../components/EnhancedReceiptTable';

// Basic Receipt interface
interface Receipt {
  id: string;
  vendor?: string;
  amount?: number;
  created_at?: string;
  updated_at?: string;
  description?: string;
  image_url?: string;
}

// Types
interface AdminStats {
  total_receipts: number;
  total_amount: number;
  monthly_spending: Array<{ month: string; amount: number; count: number }>;
  top_vendors: Array<{ vendor: string; amount: number; count: number }>;
  categories: Array<{ category: string; amount: number; count: number }>;
  recent_activity: {
    today: number;
    this_week: number;
    this_month: number;
  };
}

interface ReceiptWithUser extends Receipt {
  id: string;
  vendor?: string;
  amount?: number;
  date?: string;
  description?: string;
  category?: string;
  status?: string;
  user_id?: string;
  username?: string;
  image_url?: string;
  extracted_items?: string;
  ocr_raw_text?: string;
  confidence?: number;
  processing_time?: number;
  created_at?: string;
  updated_at?: string;
  
  // Enhanced purchaser portal fields
  purchaser_name?: string;
  purchaser_email?: string;
  event_purpose?: string;
  approved_by?: string;
  additional_notes?: string;
  purchase_date?: string;
  upload_date?: string;
  uploader_type?: string;
}

interface ReceiptsResponse {
  receipts: ReceiptWithUser[];
}

export function EnhancedAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [receipts, setReceipts] = useState<ReceiptWithUser[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'search',
      placeholder: 'Search vendor, description...'
    },
    {
      key: 'date_range',
      label: 'Date Range',
      type: 'date-range'
    },
    {
      key: 'vendor',
      label: 'Vendor',
      type: 'select',
      loadOptions: async (query: string) => {
        try {
          const vendors = await apiClient.get<{ vendors: Array<{ name: string; count: number }> }>(
            `/receipts/vendors/autocomplete?q=${encodeURIComponent(query)}&limit=20`
          );
          return vendors.vendors.map((vendor) => ({
            value: vendor.name,
            label: vendor.name,
            count: vendor.count
          }));
        } catch (error) {
          console.error('Failed to load vendor options:', error);
          return [];
        }
      }
    },
    {
      key: 'amount_range',
      label: 'Amount',
      type: 'number-range'
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'food', label: 'Food & Dining' },
        { value: 'transportation', label: 'Transportation' },
        { value: 'office', label: 'Office Supplies' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'purchaser_portal', label: 'Purchaser Portal' },
        { value: 'other', label: 'Other' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'processing', label: 'Processing' }
      ]
    }
  ];

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.get<AdminStats>('/admin/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setError('Failed to load dashboard statistics');
    }
  }, []);

  // Load receipts
  const loadReceipts = useCallback(async (
    filterValues: FilterValues = filters,
    sort: string = 'created_at',
    order: 'asc' | 'desc' = 'desc',
    page: number = 1
  ) => {
    setReceiptsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort_by: sort,
        sort_order: order,
        ...Object.entries(filterValues).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'date_range' && typeof value === 'object' && value.start && value.end) {
              acc.start_date = value.start;
              acc.end_date = value.end;
            } else if (key === 'amount_range' && typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
              if (value.min !== null) acc.min_amount = value.min.toString();
              if (value.max !== null) acc.max_amount = value.max.toString();
            } else if (typeof value === 'string') {
              acc[key] = value;
            }
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await apiClient.get<ReceiptsResponse>(`/receipts?${params}`);
      setReceipts(response.receipts || []);
      setError(null);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      setError('Failed to load receipts');
    } finally {
      setReceiptsLoading(false);
    }
  }, [filters]);

  // Handle receipt click
  const handleReceiptClick = (receipt: ReceiptWithUser) => {
    setSelectedReceipt(receipt);
    setModalOpen(true);
  };

  // Handle enhanced receipt click (converts back to ReceiptWithUser for compatibility)
  const handleEnhancedReceiptClick = (receipt: EnhancedReceiptData) => {
    const originalReceipt = receipts.find(r => r.id === receipt.id);
    if (originalReceipt) {
      handleReceiptClick(originalReceipt);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'date_range' && typeof value === 'object' && value.start && value.end) {
              acc.start_date = value.start;
              acc.end_date = value.end;
            } else if (key === 'amount_range' && typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
              if (value.min !== null) acc.min_amount = value.min.toString();
              if (value.max !== null) acc.max_amount = value.max.toString();
            } else if (typeof value === 'string') {
              acc[key] = value;
            }
          }
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(`/api/receipts/export?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipts-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export receipts');
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadStats();
    loadReceipts();
  };

  // Transform receipts to enhanced format
  const transformToEnhancedReceipts = (receipts: ReceiptWithUser[]): EnhancedReceiptData[] => {
    return receipts.map(receipt => ({
      id: receipt.id?.toString() || '',
      vendor: receipt.vendor,
      amount: receipt.amount,
      date: receipt.purchase_date || receipt.created_at,
      purchase_date: receipt.purchase_date,
      created_at: receipt.created_at,
      category: receipt.category,
      description: receipt.description,
      status: receipt.status as 'pending' | 'approved' | 'rejected' | 'processing' | 'Reconciled' | 'Created' | 'Sent to bank' | undefined,
      submittedBy: receipt.username,
      username: receipt.username,
      purchaser_name: receipt.purchaser_name,
      approved_by: receipt.approved_by,
      imageUrl: receipt.image_url,
      image_url: receipt.image_url,
      event_purpose: receipt.event_purpose,
      purchaser_email: receipt.purchaser_email,
      additional_notes: receipt.additional_notes
    }));
  };

  // Enhanced receipts for table
  const enhancedReceipts = transformToEnhancedReceipts(receipts);

  // Effects
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadReceipts()]);
      setLoading(false);
    };
    loadData();
  }, [loadStats, loadReceipts]);

  useEffect(() => {
    loadReceipts(filters, 'created_at', 'desc', 1);
  }, [filters, loadReceipts]);

  if (loading) {
    return (
      <MainLayout title="Admin Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600 mx-auto"></div>
            <p className="mt-4 text-maroon-700 font-medium">Loading Admin Dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Treasury Management" subtitle="Near East Christian Fellowship">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Receipt Management</h1>
            <p className="text-gray-600 dark:text-gray-400">All receipts in one searchable, filterable view</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors">
              <PlusIcon className="w-4 h-4 mr-2 inline" />
              New Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSignIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">${stats.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSignIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Receipts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total_receipts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.recent_activity.this_month}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUpIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Receipt</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${stats.total_receipts > 0 ? (stats.total_amount / stats.total_receipts).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={setFilters}
          loading={receiptsLoading}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Enhanced Receipts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <EnhancedReceiptTable
          receipts={enhancedReceipts}
          onReceiptClick={handleEnhancedReceiptClick}
        />
      </div>

      {/* Enhanced Receipt Modal */}
      {modalOpen && selectedReceipt && (
        <EnhancedReceiptModal
          receipt={selectedReceipt}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedReceipt(null);
          }}
        />
      )}
    </MainLayout>
  );
}

export default EnhancedAdminDashboard;
