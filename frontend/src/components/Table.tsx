/**
 * Reusable Table Component with Sorting, Pagination, and Accessibility
 * 
 * Features:
 * - Server-side pagination
 * - Sortable columns
 * - Keyboard navigation
 * - ARIA labels for accessibility
 * - Loading states
 * - Empty states
 */

import React from 'react';
import { ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination?: PaginationInfo;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  pagination,
  loading = false,
  sortBy,
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  'aria-label': ariaLabel = 'Data table'
}: TableProps<T>) {
  
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    
    const columnKey = column.key.toString();
    const newOrder = sortBy === columnKey && sortOrder === 'desc' ? 'asc' : 'desc';
    onSort(columnKey, newOrder);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    const columnKey = column.key.toString();
    const isActive = sortBy === columnKey;
    
    if (!isActive) {
      return <div className="w-4 h-4" />; // Placeholder for alignment
    }
    
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
    );
  };

  const getCellValue = (row: T, column: Column<T>) => {
    const value = row[column.key as keyof T];
    return column.render ? column.render(value, row) : value;
  };

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200"
          aria-label={ariaLabel}
          role="table"
        >
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key.toString()}
                  scope="col"
                  className={`
                    px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 focus:bg-gray-100' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && column.sortable) {
                      e.preventDefault();
                      handleSort(column);
                    }
                  }}
                  tabIndex={column.sortable ? 0 : -1}
                  aria-sort={
                    column.sortable && sortBy === column.key.toString()
                      ? sortOrder === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className={`
                    ${onRowClick ? 'cursor-pointer hover:bg-gray-50 focus:bg-gray-50' : ''}
                    transition-colors duration-150
                  `}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => handleKeyDown(e, row)}
                  tabIndex={onRowClick ? 0 : -1}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `View details for row ${rowIndex + 1}` : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.key.toString()}`}
                      className={`
                        px-6 py-4 whitespace-nowrap text-sm
                        ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                      `}
                    >
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            {/* Mobile pagination */}
            <button
              onClick={() => pagination.has_prev && onPageChange?.(pagination.page - 1)}
              disabled={!pagination.has_prev}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.has_next && onPageChange?.(pagination.page + 1)}
              disabled={!pagination.has_next}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.page - 1) * pagination.page_size) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.page_size, pagination.total_count)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total_count}</span>{' '}
                results
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => pagination.has_prev && onPageChange?.(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                  let page;
                  if (pagination.total_pages <= 7) {
                    page = i + 1;
                  } else if (pagination.page <= 4) {
                    page = i + 1;
                  } else if (pagination.page >= pagination.total_pages - 3) {
                    page = pagination.total_pages - 6 + i;
                  } else {
                    page = pagination.page - 3 + i;
                  }
                  
                  const isCurrentPage = page === pagination.page;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange?.(page)}
                      className={`
                        relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${isCurrentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }
                      `}
                      aria-label={`Page ${page}`}
                      aria-current={isCurrentPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => pagination.has_next && onPageChange?.(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
