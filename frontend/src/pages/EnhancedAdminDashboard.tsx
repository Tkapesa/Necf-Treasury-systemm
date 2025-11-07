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
  RefreshCw, 
  Download, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  DollarSign,
  Calendar,
  Receipt as ReceiptIcon,
  BarChart3,
  ArrowUpRight,
  
} from 'lucide-react';

import apiClient from '../api/client';
import FilterBar, { FilterValues, FilterConfig } from '../components/FilterBar';
import EnhancedReceiptModal from '../components/EnhancedReceiptModal';
import EditReceiptModal from '../components/EditReceiptModal';
import MainLayout from '../components/MainLayout';
import EnhancedReceiptTable, { EnhancedReceiptData } from '../components/EnhancedReceiptTable';
import { useAuth } from '../contexts/AuthContext';

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
  extracted_vendor?: string;
  amount?: number;
  extracted_total?: number;
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
  
  // Admin edit tracking
  manually_edited?: boolean;
}

interface ReceiptsResponse {
  receipts: ReceiptWithUser[];
}

export function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [receipts, setReceipts] = useState<ReceiptWithUser[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [receiptToEdit, setReceiptToEdit] = useState<ReceiptWithUser | null>(null);
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
    sort: string = 'date',
    order: 'asc' | 'desc' = 'desc',
    page: number = 1
  ) => {
    console.log('📥 loadReceipts called with:', { filterValues, sort, order, page });
    setReceiptsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20',
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
      console.log('📊 Received receipts from API:', response.receipts?.length, 'receipts');
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

  // Handle edit click
  const handleEditClick = (receipt: ReceiptWithUser) => {
    setReceiptToEdit(receipt);
    setEditModalOpen(true);
  };

  // Handle edit success - reload data without closing modal (modal closes itself)
  const handleEditSuccess = async () => {
    console.log('🔄 Reloading receipt data after edit...');
    console.log('Current filters:', filters);
    
    try {
      // Reload all data with current filters and sorting
      await Promise.all([
        loadReceipts(filters, 'date', 'desc', 1),
        loadStats()
      ]);
      console.log('✅ Receipt data reloaded successfully');
      console.log('Total receipts after reload:', receipts.length);
    } catch (error) {
      console.error('❌ Failed to reload data:', error);
    }
  };

  // Handle enhanced receipt click (converts back to ReceiptWithUser for compatibility)
  const handleEnhancedReceiptClick = (receipt: EnhancedReceiptData) => {
    const originalReceipt = receipts.find(r => r.id === receipt.id);
    if (originalReceipt) {
      handleReceiptClick(originalReceipt);
    }
  };

  // Handle enhanced edit click (converts back to ReceiptWithUser for compatibility)
  const handleEnhancedEditClick = (receipt: EnhancedReceiptData) => {
    const originalReceipt = receipts.find(r => r.id === receipt.id);
    if (originalReceipt) {
      handleEditClick(originalReceipt);
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
      vendor: receipt.extracted_vendor || receipt.vendor || 'N/A',
      extracted_vendor: receipt.extracted_vendor,
      amount: receipt.extracted_total || receipt.amount || 0,
      extracted_amount: receipt.extracted_total,
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
      additional_notes: receipt.additional_notes,
      manually_edited: receipt.manually_edited // Include the manually_edited flag
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
  loadReceipts(filters, 'date', 'desc', 1);
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Receipt Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">All receipts in one searchable, filterable view</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="inline-flex items-center bg-gradient-to-r from-maroon-600 to-maroon-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-maroon-700 hover:to-maroon-800 transition-all duration-200 transform hover:scale-105 shadow-lg shadow-maroon-500/30 hover:shadow-xl hover:shadow-maroon-500/40">
              <Plus className="w-4 h-4 mr-2" />
              New Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Amount Card */}
          <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border border-green-200/50 dark:border-green-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${stats.total_amount.toFixed(2)}</p>
                <div className="flex items-center mt-2 text-xs text-green-600 dark:text-green-400">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span className="font-semibold">+12.5% this month</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Total Receipts Card */}
          <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Total Receipts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total_receipts}</p>
                <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  <span className="font-semibold">+8 new today</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ReceiptIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* This Month Card */}
          <div className="group relative bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-6 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">This Month</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.recent_activity.this_month}</p>
                <div className="flex items-center mt-2 text-xs text-purple-600 dark:text-purple-400">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span className="font-semibold">October 2025</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Average Receipt Card */}
          <div className="group relative bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 rounded-2xl border border-indigo-200/50 dark:border-indigo-700/50 hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">Avg Receipt</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${stats.total_receipts > 0 ? (stats.total_amount / stats.total_receipts).toFixed(2) : '0.00'}
                </p>
                <div className="flex items-center mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  <span className="font-semibold">Analytics ready</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <FilterBar
          filters={filterConfigs}
          values={filters}
          onChange={setFilters}
          loading={receiptsLoading}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-2xl p-4 mb-6 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="ml-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Enhanced Receipts Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
        <EnhancedReceiptTable
          receipts={enhancedReceipts}
          onReceiptClick={handleEnhancedReceiptClick}
          onEdit={handleEnhancedEditClick}
          userRole={user?.role}
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

      {/* Edit Receipt Modal */}
      {editModalOpen && receiptToEdit && (
        <EditReceiptModal
          receipt={receiptToEdit}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setReceiptToEdit(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </MainLayout>
  );
}

export default EnhancedAdminDashboard;
