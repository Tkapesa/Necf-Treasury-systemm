/**
 * Enhanced Receipt Card Component
 * 
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    case 'rejected':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    case 'processing':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
  }
};l receipt card with image preview, detailed information,
 * and status indicators for the dashboard
 */

import React from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  TagIcon, 
  UserIcon, 
  ImageIcon,
  ExternalLinkIcon
} from 'lucide-react';

export interface ReceiptCardData {
  id: string;
  vendor?: string;
  amount?: number;
  date?: string;
  time?: string;
  description?: string;
  category?: string;
  status?: string;
  image_url?: string;
  purchaser_name?: string;
  purchaser_email?: string;
  event_purpose?: string;
  approved_by?: string;
  created_at?: string;
  updated_at?: string;
  uploader_type?: string;
}

interface ReceiptCardProps {
  receipt: ReceiptCardData;
  onClick?: (receipt: ReceiptCardData) => void;
  showImage?: boolean;
  compact?: boolean;
}

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    case 'transportation':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'office':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    case 'healthcare':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'utilities':
      return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200';
    case 'purchaser_portal':
      return 'bg-maroon-100 dark:bg-maroon-900 text-maroon-800 dark:text-maroon-200';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  }
};

export const ReceiptCard: React.FC<ReceiptCardProps> = ({
  receipt,
  onClick,
  showImage = true,
  compact = false
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(receipt);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return { date: '—', time: '—' };
    
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: '—', time: '—' };
    }
  };

  const { date, time } = formatDateTime(receipt.date || receipt.created_at);
  const isPurchaserPortal = receipt.category === 'purchaser_portal';

  return (
    <div 
      className={`
        bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer
        ${compact ? 'p-4' : 'p-6'}
      `}
      onClick={handleClick}
    >
      <div className={`flex items-start space-x-${compact ? '3' : '4'}`}>
        {/* Receipt Image Thumbnail */}
        {showImage && (
          <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0`}>
            {receipt.image_url ? (
              <img 
                src={receipt.image_url} 
                alt="Receipt" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
        )}
        
        {/* Receipt Details */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
                {isPurchaserPortal ? 
                  (receipt.event_purpose || 'Church Purchase') : 
                  (receipt.vendor || 'Unknown Vendor')
                }
              </h3>
              {!compact && isPurchaserPortal && receipt.vendor && (
                <p className="text-sm text-gray-600 truncate mt-1">
                  Vendor: {receipt.vendor}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end ml-4">
              <span className={`${compact ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>
                ${typeof receipt.amount === 'number' ? receipt.amount.toFixed(2) : (receipt.amount || '0.00')}
              </span>
              {receipt.status && (
                <span className={`
                  inline-flex px-2 py-1 text-xs font-medium rounded-full border mt-1
                  ${getStatusColor(receipt.status)}
                `}>
                  {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                </span>
              )}
            </div>
          </div>
          
          {/* Details Grid */}
          <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-2 text-sm text-gray-600`}>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-3 w-3" />
              <span className="truncate">{date}</span>
            </div>
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-3 w-3" />
              <span className="truncate">{time}</span>
            </div>
            {receipt.category && (
              <div className="flex items-center space-x-1">
                <TagIcon className="h-3 w-3" />
                <span className={`
                  inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                  ${getCategoryColor(receipt.category)}
                `}>
                  {receipt.category === 'purchaser_portal' ? 'Purchase' : receipt.category}
                </span>
              </div>
            )}
            {isPurchaserPortal && receipt.purchaser_name && (
              <div className="flex items-center space-x-1">
                <UserIcon className="h-3 w-3" />
                <span className="truncate">{receipt.purchaser_name}</span>
              </div>
            )}
          </div>
          
          {/* Description */}
          {!compact && receipt.description && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 line-clamp-2">
                {receipt.description}
              </p>
            </div>
          )}

          {/* Purchaser Portal Details */}
          {!compact && isPurchaserPortal && (
            <div className="mt-3 space-y-1">
              {receipt.purchaser_email && (
                <p className="text-xs text-gray-500">
                  Email: {receipt.purchaser_email}
                </p>
              )}
              {receipt.approved_by && (
                <p className="text-xs text-gray-500">
                  Approved by: {receipt.approved_by}
                </p>
              )}
            </div>
          )}
          
          {/* Submission Info */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Submitted {formatDateTime(receipt.created_at).date}
            </div>
            <button className="text-xs text-maroon-600 hover:text-maroon-700 font-medium flex items-center space-x-1">
              <span>View Details</span>
              <ExternalLinkIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptCard;
