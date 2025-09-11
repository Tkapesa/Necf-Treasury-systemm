/**
 * Reusable Filter Bar Component
 * 
 * Features:
 * - Date range picker
 * - Multi-select dropdowns
 * - Search input with debouncing
 * - Clear all filters
 * - Responsive design
 * - Accessibility support
 */

import { useState, useCallback, useEffect } from 'react';
import { CalendarIcon, XIcon, SearchIcon, FilterIcon } from 'lucide-react';

export interface DateRange {
  start_date?: string;
  end_date?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'search' | 'select' | 'multiselect' | 'date-range' | 'number-range';
  options?: FilterOption[];
  placeholder?: string;
  loadOptions?: (query: string) => Promise<FilterOption[]>;
  debounceMs?: number;
}

export interface FilterValues {
  [key: string]: any;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear?: () => void;
  loading?: boolean;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  loading = false,
  className = ''
}: FilterBarProps) {
  const [localValues, setLocalValues] = useState<FilterValues>(values);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [asyncOptions, setAsyncOptions] = useState<Record<string, FilterOption[]>>({});

  // Debounced onChange for search inputs
  const debouncedOnChange = useCallback(
    debounce((newValues: FilterValues) => {
      onChange(newValues);
    }, 300),
    [onChange]
  );

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleFilterChange = (filterKey: string, value: any, shouldDebounce = false) => {
    const newValues = { ...localValues, [filterKey]: value };
    setLocalValues(newValues);

    if (shouldDebounce) {
      debouncedOnChange(newValues);
    } else {
      onChange(newValues);
    }
  };

  const handleClearFilter = (filterKey: string) => {
    const newValues = { ...localValues };
    delete newValues[filterKey];
    setLocalValues(newValues);
    onChange(newValues);
  };

  const handleClearAll = () => {
    setLocalValues({});
    onChange({});
    onClear?.();
  };

  const loadAsyncOptions = async (filter: FilterConfig, query: string) => {
    if (!filter.loadOptions) return;
    
    try {
      const options = await filter.loadOptions(query);
      setAsyncOptions(prev => ({ ...prev, [filter.key]: options }));
    } catch (error) {
      console.error(`Failed to load options for ${filter.key}:`, error);
    }
  };

  const renderSearchFilter = (filter: FilterConfig) => (
    <div key={filter.key} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
          value={localValues[filter.key] || ''}
          onChange={(e) => handleFilterChange(filter.key, e.target.value, true)}
          className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500 dark:placeholder-gray-400"
          aria-label={`Filter by ${filter.label}`}
        />
        {localValues[filter.key] && (
          <button
            onClick={() => handleClearFilter(filter.key)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`Clear ${filter.label} filter`}
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderSelectFilter = (filter: FilterConfig) => {
    const isOpen = dropdownOpen === filter.key;
    const options = asyncOptions[filter.key] || filter.options || [];
    const selectedValue = localValues[filter.key];
    const selectedOption = options.find(opt => opt.value === selectedValue);

    return (
      <div key={filter.key} className="relative">
        <button
          onClick={() => setDropdownOpen(isOpen ? null : filter.key)}
          className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500 focus:border-blue-500"
          aria-label={`Filter by ${filter.label}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
            {selectedOption ? selectedOption.label : filter.placeholder || `Select ${filter.label}`}
          </span>
          <FilterIcon className="h-4 w-4 text-gray-400" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setDropdownOpen(null)}
              aria-hidden="true"
            />
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
              {filter.loadOptions && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Search..."
                    onChange={(e) => loadAsyncOptions(filter, e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                    autoFocus
                  />
                </div>
              )}
              <div role="listbox" aria-label={filter.label}>
                {!selectedValue ? null : (
                  <button
                    onClick={() => {
                      handleClearFilter(filter.key);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
                    role="option"
                    aria-selected={false}
                  >
                    Clear selection
                  </button>
                )}
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleFilterChange(filter.key, option.value);
                      setDropdownOpen(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedValue === option.value ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200' : 'text-gray-900 dark:text-white'
                    }`}
                    role="option"
                    aria-selected={selectedValue === option.value}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {option.count && (
                        <span className="text-gray-500 text-xs">({option.count})</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDateRangeFilter = (filter: FilterConfig) => {
    const dateRange = localValues[filter.key] as DateRange || {};

    return (
      <div key={filter.key} className="flex items-center space-x-2">
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            value={dateRange.start_date || ''}
            onChange={(e) => handleFilterChange(filter.key, { ...dateRange, start_date: e.target.value })}
            className="pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            aria-label={`${filter.label} start date`}
          />
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            value={dateRange.end_date || ''}
            onChange={(e) => handleFilterChange(filter.key, { ...dateRange, end_date: e.target.value })}
            className="pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            aria-label={`${filter.label} end date`}
          />
        </div>
        {(dateRange.start_date || dateRange.end_date) && (
          <button
            onClick={() => handleClearFilter(filter.key)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={`Clear ${filter.label} filter`}
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const renderNumberRangeFilter = (filter: FilterConfig) => {
    const range = localValues[filter.key] || {};

    return (
      <div key={filter.key} className="flex items-center space-x-2">
        <input
          type="number"
          placeholder="Min"
          value={range.min || ''}
          onChange={(e) => handleFilterChange(filter.key, { ...range, min: e.target.value })}
          className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500 dark:placeholder-gray-400"
          aria-label={`${filter.label} minimum`}
        />
        <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
        <input
          type="number"
          placeholder="Max"
          value={range.max || ''}
          onChange={(e) => handleFilterChange(filter.key, { ...range, max: e.target.value })}
          className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500 dark:placeholder-gray-400"
          aria-label={`${filter.label} maximum`}
        />
        {(range.min || range.max) && (
          <button
            onClick={() => handleClearFilter(filter.key)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={`Clear ${filter.label} filter`}
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'search':
        return renderSearchFilter(filter);
      case 'select':
      case 'multiselect':
        return renderSelectFilter(filter);
      case 'date-range':
        return renderDateRangeFilter(filter);
      case 'number-range':
        return renderNumberRangeFilter(filter);
      default:
        return null;
    }
  };

  const hasActiveFilters = Object.keys(localValues).length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FilterIcon className="h-4 w-4" />
          <span>Filters:</span>
        </div>

        {filters.map(renderFilter)}

        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <XIcon className="h-4 w-4 mr-1" />
            Clear All
          </button>
        )}

        {loading && (
          <div className="flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Filtering...
          </div>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(localValues).map(([key, value]) => {
            const filter = filters.find(f => f.key === key);
            if (!filter || !value) return null;

            let displayValue = '';
            if (filter.type === 'date-range' && value.start_date && value.end_date) {
              displayValue = `${value.start_date} to ${value.end_date}`;
            } else if (filter.type === 'number-range') {
              const parts = [];
              if (value.min) parts.push(`≥ ${value.min}`);
              if (value.max) parts.push(`≤ ${value.max}`);
              displayValue = parts.join(', ');
            } else if (filter.options) {
              const option = filter.options.find(opt => opt.value === value);
              displayValue = option ? option.label : value;
            } else {
              displayValue = value;
            }

            return (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {filter.label}: {displayValue}
                <button
                  onClick={() => handleClearFilter(key)}
                  className="ml-2 hover:text-blue-600"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default FilterBar;
