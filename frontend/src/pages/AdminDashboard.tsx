/**
 * Admin Dashboard Page
 * 
 * Features:
 * - Statistics cards with metrics
 * - Receipts table with filtering and pagination
 * - Export functionality
 * - Real-time data updates
 * - Responsive design
 * - Accessibility support
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSignIcon, 
  ReceiptIcon, 
  TrendingUpIcon,
  DownloadIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CalendarIcon
} from 'lucide-react';
import Table, { Column, PaginationInfo } from '../components/Table';
import FilterBar, { FilterConfig, FilterValues } from '../components/FilterBar';
import ReceiptImageModal, { Receipt } from '../components/ReceiptImageModal';
import SpendingCharts from '../components/charts/ModernFinancialCharts';
import { apiClient } from '../api/client';

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
  extracted_date?: string;
  description?: string;
  category?: string;
  status?: string;
  user_id?: string;
  username?: string;
  image_url?: string;
  extracted_items?: string;
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
  pagination: PaginationInfo;
}

export function AdminDashboard() {
  console.log('🚀 AdminDashboard component loaded - LATEST VERSION WITH FIX');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [receipts, setReceipts] = useState<ReceiptWithUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filters, setFilters] = useState<FilterValues>({});
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts'>('dashboard');

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search vendor, description, or filename...'
    },
    {
      key: 'date_range',
      label: 'Date Range',
      type: 'date_range'
    },
    {
      key: 'vendor',
      label: 'Vendor',
      type: 'autocomplete',
      loadOptions: async (query: string) => {
        try {
          const vendors = await apiClient.get<{ vendors: Array<{ name: string; count: number }> }>(
            `/receipts/vendors/autocomplete?q=${encodeURIComponent(query)}&limit=20`
          );
          return vendors.vendors.map((vendor) => ({
            value: vendor.name,
            label: `${vendor.name} (${vendor.count})`,
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
      label: 'Amount Range',
      type: 'amount_range'
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'food', label: 'Food & Beverages' },
        { value: 'office', label: 'Office Supplies' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'travel', label: 'Travel' },
        { value: 'healthcare', label: 'Healthcare' },
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
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    }
  ];

  // Table columns - focused on essential receipt data
  const columns: Column<ReceiptWithUser>[] = [
    {
      key: 'image_preview',
      header: 'Receipt',
      sortable: false,
      width: '80px',
      render: (value, row) => (
        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
          {row.image_url ? (
            <img 
              src={row.image_url} 
              alt="Receipt" 
              className="w-full h-full object-cover"
              onClick={() => handleRowClick(row)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <ReceiptIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'purchase_date',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: (value, row) => {
        const date = row.extracted_date || row.purchase_date || row.created_at;
        return date ? new Date(date).toLocaleDateString() : '—';
      }
    },
    {
      key: 'extracted_vendor',
      header: 'Vendor/Market',
      sortable: true,
      render: (value, row) => {
        // Check if this is a purchaser portal receipt
        if (row.category === 'purchaser_portal') {
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {value || 'Unknown Vendor'}
              </div>
              <div className="text-gray-500 text-xs">
                Purpose: {row.event_purpose || 'Not specified'}
              </div>
            </div>
          );
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {value || 'Unknown Vendor'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'extracted_total',
      header: 'Amount',
      sortable: true,
      align: 'right',
      width: '120px',
      render: (value) => {
        if (!value || value === 0) return '—';
        return (
          <div className="text-sm">
            <div className="font-semibold text-gray-900">
              {value.toLocaleString('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })} TL
            </div>
          </div>
        );
      }
    },
    {
      key: 'purchaser_name',
      header: 'Purchaser',
      sortable: true,
      width: '150px',
      render: (value, row) => {
        // Check if this is a purchaser portal receipt
        if (row.category === 'purchaser_portal') {
          return (
            <div className="text-sm">
              <div className="font-medium text-maroon-800">
                {value || 'Unknown Purchaser'}
              </div>
              <div className="text-gray-500 text-xs">
                {row.purchaser_email || ''}
              </div>
            </div>
          );
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-700">
              {row.username || 'Admin User'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'items_bought',
      header: 'Items Purchased',
      sortable: false,
      render: (value, row) => {
        // Try to parse extracted items to show what was bought
        let items: string[] = [];
        
        if (row.extracted_items) {
          try {
            const parsed = JSON.parse(row.extracted_items);
            if (Array.isArray(parsed)) {
              items = parsed.slice(0, 3); // Show first 3 items
            }
          } catch {
            // If parsing fails, show description if available
            if (row.description) {
              items = [row.description];
            }
          }
        }
        
        if (items.length === 0) {
          return <span className="text-gray-400 text-xs">No items detected</span>;
        }
        
        return (
          <div className="text-xs text-gray-600">
            {items.join(', ')}
            {items.length === 3 && ' ...'}
          </div>
        );
      }
    },
    {
      key: 'approved_by',
      header: 'Approved By',
      sortable: true,
      width: '120px',
      render: (value, row) => {
        if (row.category === 'purchaser_portal' && value) {
          return (
            <div className="text-sm">
              <div className="font-medium text-green-700">
                {value}
              </div>
            </div>
          );
        }
        return value ? (
          <div className="text-sm font-medium text-green-700">{value}</div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '100px',
      render: (value) => {
        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          processing: 'bg-blue-100 text-blue-800 border-blue-200',
          completed: 'bg-green-100 text-green-800 border-green-200',
          approved: 'bg-green-100 text-green-800 border-green-200',
          rejected: 'bg-red-100 text-red-800 border-red-200'
        };
        
        const colorClass = statusColors[value?.toLowerCase() as keyof typeof statusColors] || 
                          'bg-gray-100 text-gray-800 border-gray-200';
        
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
            {value?.charAt(0).toUpperCase() + (value?.slice(1) || '')}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '80px',
      render: (value, row) => (
        <button
          onClick={() => handleRowClick(row)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Details
        </button>
      )
    }
  ];

  // Load statistics
  const loadStats = async () => {
    try {
      const stats = await apiClient.get<AdminStats>('/admin/stats');
      setStats(stats);
      setError(null);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      setError('Failed to load dashboard statistics');
    }
  };

  // Load receipts with filters
  const loadReceipts = useCallback(async (page = 1) => {
    setReceiptsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: '25',
        sort_by: sortBy,
        sort_order: sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => {
            if (value === null || value === undefined || value === '') return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            return true;
          })
        )
      });

      // Handle date range filter
      if (filters.date_range?.start_date) {
        queryParams.set('start_date', filters.date_range.start_date);
      }
      if (filters.date_range?.end_date) {
        queryParams.set('end_date', filters.date_range.end_date);
      }

      // Handle amount range filter
      if (filters.amount_range?.min) {
        queryParams.set('min_amount', filters.amount_range.min);
      }
      if (filters.amount_range?.max) {
        queryParams.set('max_amount', filters.amount_range.max);
      }

      const response = await apiClient.get<ReceiptsResponse>(`/receipts?${queryParams.toString()}`);
      console.log('🔍 API Response:', response);
      console.log('🔍 Receipts data:', response.receipts);
      if (response.receipts && response.receipts.length > 0) {
        console.log('🔍 First receipt data:', response.receipts[0]);
        console.log('🔍 First receipt vendor:', response.receipts[0].extracted_vendor);
        console.log('🔍 First receipt total:', response.receipts[0].extracted_total);
      }
      setReceipts(response.receipts);
      setPagination(response.pagination);
      setError(null);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      setError('Failed to load receipts');
    } finally {
      setReceiptsLoading(false);
    }
  }, [filters, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadReceipts()]);
      setLoading(false);
    };

    loadInitialData();
  }, [loadReceipts]);

  // Reload receipts when filters change
  useEffect(() => {
    loadReceipts(1);
  }, [loadReceipts]);

  // Export receipts
  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({ 
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => {
            if (value === null || value === undefined || value === '') return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            return true;
          })
        ),
        format: 'csv' 
      });
      
      // For CSV download, we need to handle binary response
      const response = await fetch(`/api/v1/receipts/export?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipts-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export receipts:', error);
      setError('Failed to export receipts');
    }
  };

  // Handle table interactions
  const handleSort = (column: string, order: 'asc' | 'desc') => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handlePageChange = (page: number) => {
    loadReceipts(page);
  };

  const handleRowClick = (receipt: ReceiptWithUser) => {
    if (receipt.image_url) {
      setSelectedReceipt(receipt);
      setModalOpen(true);
    }
  };

  const handleRefresh = () => {
    loadStats();
    loadReceipts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-maroon-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600 mx-auto"></div>
          <p className="mt-4 text-maroon-700 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-50 via-white to-maroon-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-maroon-800">Near East Christian Fellowship</h1>
              <p className="mt-2 text-gray-600">
                Treasury Management Dashboard
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-maroon-300 rounded-md shadow-sm text-sm font-medium text-maroon-800 bg-white hover:bg-maroon-50 focus:ring-2 focus:ring-maroon-500 transition-colors"
                aria-label="Refresh data"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maroon-600 hover:bg-maroon-700 focus:ring-2 focus:ring-maroon-500 transition-colors"
                aria-label="Export receipts"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-maroon-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'charts'
                    ? 'border-maroon-500 text-maroon-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Charts & Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-md bg-accent-50 p-4">
            <div className="flex">
              <AlertCircleIcon className="h-5 w-5 text-accent-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-accent-800">Error</h3>
                <p className="mt-1 text-sm text-accent-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
                {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow-lg rounded-lg border border-maroon-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSignIcon className="h-6 w-6 text-maroon-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-maroon-600 truncate">
                        Total Amount
                      </dt>
                      <dd className="text-lg font-medium text-maroon-800">
                        ${stats.total_amount.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-lg border border-maroon-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ReceiptIcon className="h-6 w-6 text-maroon-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-maroon-600 truncate">
                        Total Receipts
                      </dt>
                      <dd className="text-lg font-medium text-maroon-800">
                        {stats.total_receipts.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-lg border border-maroon-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-maroon-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-maroon-600 truncate">
                        This Month
                      </dt>
                      <dd className="text-lg font-medium text-maroon-800">
                        {stats.recent_activity.this_month} receipts
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-lg rounded-lg border border-maroon-200">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUpIcon className="h-6 w-6 text-maroon-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-maroon-600 truncate">
                        Avg Receipt
                      </dt>
                      <dd className="text-lg font-medium text-maroon-800">
                        ${stats.total_receipts > 0 ? (stats.total_amount / stats.total_receipts).toFixed(2) : '0.00'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipts Table */}
        <div className="bg-white shadow-lg rounded-lg border border-maroon-200">
          <div className="px-6 py-4 border-b border-maroon-200">
            <h2 className="text-lg font-medium text-maroon-800">All Receipts</h2>
          </div>

          <FilterBar
            filters={filterConfigs}
            values={filters}
            onChange={setFilters}
            loading={receiptsLoading}
          />

          <Table
            data={receipts}
            columns={columns}
            pagination={pagination || undefined}
            loading={receiptsLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onPageChange={handlePageChange}
            onRowClick={handleRowClick}
            emptyMessage="No receipts found"
            aria-label="Receipts table"
          />
        </div>
          </>
        )}

        {activeTab === 'charts' && (
          <SpendingCharts />
        )}

        {/* Receipt Image Modal */}
        <ReceiptImageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          receipt={selectedReceipt}
          receipts={receipts}
          onReceiptChange={setSelectedReceipt}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
