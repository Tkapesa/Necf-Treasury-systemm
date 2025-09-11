/**
 * ReceiptsTable.tsx
 * 
 * A reusable server-side paginated table component for displaying receipts data.
 * Features sortable headers, accessible markup, and configurable columns.
 * 
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'vendor', label: 'Vendor', sortable: true },
 *   { key: 'amount', label: 'Amount', sortable: true }
 * ];
 * 
 * const fetchReceiptsPage = async (page: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
 *   const response = await api.get(`/receipts?page=${page}&sort=${sortBy}&order=${sortOrder}`);
 *   return response.data;
 * };
 * 
 * <ReceiptsTable columns={columns} fetchPage={fetchReceiptsPage} pageSize={20} />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';

/**
 * Column definition for table headers and data rendering
 */
export interface TableColumn<T = any> {
  /** Unique key for the column, should match data property */
  key: string;
  /** Display label for column header */
  label: string;
  /** Whether this column can be sorted */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (value: any, row: T) => React.ReactNode;
  /** CSS classes for column styling */
  className?: string;
}

/**
 * Server response structure for paginated data
 */
export interface PaginatedResponse<T> {
  /** Array of data items for current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  size: number;
  /** Total number of pages */
  pages: number;
}

/**
 * Props for the ReceiptsTable component
 */
export interface ReceiptsTableProps<T = any> {
  /** Column definitions for table headers and rendering */
  columns: TableColumn<T>[];
  /** Function to fetch paginated data from server */
  fetchPage: (
    page: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) => Promise<PaginatedResponse<T>>;
  /** Number of items per page */
  pageSize?: number;
  /** Loading state override */
  loading?: boolean;
  /** Error state for display */
  error?: string | null;
  /** CSS classes for table container */
  className?: string;
}

/**
 * Sort order type for column sorting
 */
type SortOrder = 'asc' | 'desc' | null;

/**
 * ReceiptsTable - Server-side paginated table with sorting
 * 
 * Provides a fully accessible, sortable table with server-side pagination.
 * Handles loading states, error states, and empty states gracefully.
 */
export const ReceiptsTable = <T extends Record<string, any>>({
  columns,
  fetchPage,
  pageSize = 20,
  loading: externalLoading = false,
  error: externalError = null,
  className = ''
}: ReceiptsTableProps<T>) => {
  // State management for table data and UI
  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  /**
   * Fetch data from server with current pagination and sorting parameters
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchPage(
        currentPage,
        sortBy || undefined,
        sortOrder || undefined
      );
      
      setData(response.items);
      setTotalPages(response.pages);
      setTotalItems(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, currentPage, sortBy, sortOrder]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle column header click for sorting
   */
  const handleSort = (columnKey: string, sortable: boolean = true) => {
    if (!sortable) return;

    // Toggle sort order: null -> asc -> desc -> null
    if (sortBy === columnKey) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortBy('');
        setSortOrder(null);
      }
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  /**
   * Handle page navigation
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  /**
   * Generate pagination button numbers with ellipsis for large page counts
   */
  const getPaginationRange = () => {
    const range: (number | string)[] = [];
    const maxVisible = 7; // Maximum visible page numbers
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Always show first page
      range.push(1);
      
      if (currentPage > 3) {
        range.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        range.push('...');
      }
      
      // Always show last page if more than 1 page
      if (totalPages > 1) {
        range.push(totalPages);
      }
    }
    
    return range;
  };

  // Use external loading/error state if provided
  const isLoading = externalLoading || loading;
  const currentError = externalError || error;

  return (
    <div className={`w-full ${className}`}>
      {/* Table container with horizontal scroll for mobile */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table 
          className="min-w-full divide-y divide-gray-300"
          role="table"
          aria-label="Receipts data table"
        >
          {/* Table header with sortable columns */}
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                    ${column.className || ''}
                  `}
                  onClick={() => handleSort(column.key, column.sortable)}
                  aria-sort={
                    sortBy === column.key
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : column.sortable
                      ? 'none'
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {/* Sort indicator icons */}
                    {column.sortable && (
                      <span className="flex flex-col">
                        <svg
                          className={`w-3 h-3 ${
                            sortBy === column.key && sortOrder === 'asc'
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <svg
                          className={`w-3 h-3 -mt-1 ${
                            sortBy === column.key && sortOrder === 'desc'
                              ? 'text-gray-900'
                              : 'text-gray-400'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body with data rows */}
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              // Loading state with skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="animate-pulse">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : currentError ? (
              // Error state
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-12 text-center text-red-600"
                  role="alert"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Error loading data</p>
                    <p className="text-sm text-gray-500">{currentError}</p>
                    <button
                      onClick={loadData}
                      className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
                    >
                      Try again
                    </button>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium">No receipts found</p>
                    <p className="text-sm">Try adjusting your filters or upload some receipts to get started.</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, index) => (
                <tr
                  key={row.id || index}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] || '-'
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!isLoading && !currentError && totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          {/* Results summary */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          {/* Desktop pagination */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{totalItems}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Previous page"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Page number buttons */}
                {getPaginationRange().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page as number)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                        aria-label={`Go to page ${page}`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}

                {/* Next button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Next page"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsTable;
