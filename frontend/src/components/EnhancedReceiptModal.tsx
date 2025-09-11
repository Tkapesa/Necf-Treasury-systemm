/**
 * Enhanced Receipt Modal Component
 * 
 * Displays receipt details with extracted OCR data including:
 * - Vendor information
 * - Date and amount
 * - Individual line items extracted from OCR
 * - Processing status and confidence
 */

import React from 'react';
import { X, Calendar, DollarSign, MapPin, ShoppingCart, FileText, Eye } from 'lucide-react';

interface ReceiptItem {
  name?: string;
  description?: string;
  price?: number;
  amount?: number;
  quantity?: number;
  total?: number;
}

interface ReceiptData {
  id: string;
  vendor?: string;
  extracted_vendor?: string;
  amount?: number;
  extracted_total?: number;
  date?: string;
  extracted_date?: string;
  created_at?: string;
  purchase_date?: string;
  description?: string;
  category?: string;
  status?: string;
  image_url?: string;
  extracted_items?: string | ReceiptItem[];
  ocr_raw_text?: string;
  confidence?: number;
  processing_time?: number;
  
  // Purchaser portal fields
  purchaser_name?: string;
  purchaser_email?: string;
  event_purpose?: string;
  approved_by?: string;
  additional_notes?: string;
}

interface EnhancedReceiptModalProps {
  receipt: ReceiptData;
  isOpen: boolean;
  onClose: () => void;
}

const EnhancedReceiptModal: React.FC<EnhancedReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  // Parse extracted items if they're in JSON string format
  const getExtractedItems = (): ReceiptItem[] => {
    if (!receipt.extracted_items) return [];
    
    if (typeof receipt.extracted_items === 'string') {
      try {
        const parsed = JSON.parse(receipt.extracted_items);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [];
      } catch {
        return [];
      }
    }
    
    if (Array.isArray(receipt.extracted_items)) {
      return receipt.extracted_items;
    }
    
    return [];
  };

  const extractedItems = getExtractedItems();
  const displayVendor = receipt.extracted_vendor || receipt.vendor || 'Unknown Vendor';
  const displayAmount = receipt.extracted_total || receipt.amount;
  const displayDate = receipt.extracted_date || receipt.purchase_date || receipt.date || receipt.created_at;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'transportation': return 'bg-blue-100 text-blue-800';
      case 'office': return 'bg-purple-100 text-purple-800';
      case 'healthcare': return 'bg-green-100 text-green-800';
      case 'utilities': return 'bg-indigo-100 text-indigo-800';
      case 'purchaser_portal': return 'bg-maroon-100 text-maroon-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal content */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Receipt Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Receipt Image */}
              <div className="space-y-4">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {receipt.image_url ? (
                    <img
                      src={receipt.image_url}
                      alt="Receipt"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* OCR Processing Info */}
                {receipt.confidence !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      OCR Processing
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {Math.round((receipt.confidence || 0) * 100)}%
                        </span>
                      </div>
                      {receipt.processing_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {receipt.processing_time.toFixed(2)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Receipt Details */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Receipt Information
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Vendor */}
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendor</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">{displayVendor}</dd>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-start space-x-3">
                      <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount</dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${displayAmount?.toFixed(2) || '0.00'}
                        </dd>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Date</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {formatDate(displayDate)}
                        </dd>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-start space-x-3">
                      <ShoppingCart className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(receipt.category)}`}>
                            {receipt.category ? receipt.category.charAt(0).toUpperCase() + receipt.category.slice(1) : 'Other'}
                          </span>
                        </dd>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-start space-x-3">
                      <Eye className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(receipt.status)}`}>
                            {receipt.status?.charAt(0).toUpperCase() + (receipt.status?.slice(1) || '')}
                          </span>
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchaser Information (if applicable) */}
                {receipt.purchaser_name && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Purchaser Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{receipt.purchaser_name}</span>
                      </div>
                      {receipt.purchaser_email && (
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Email:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{receipt.purchaser_email}</span>
                        </div>
                      )}
                      {receipt.event_purpose && (
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Purpose:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{receipt.event_purpose}</span>
                        </div>
                      )}
                      {receipt.approved_by && (
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Approved By:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{receipt.approved_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Extracted Items */}
                {extractedItems.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Extracted Items
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="space-y-2">
                        {extractedItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.name || item.description || `Item ${index + 1}`}
                              </div>
                              {item.quantity && item.quantity > 1 && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Quantity: {item.quantity}
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              ${(item.total || item.amount || item.price || 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {receipt.description && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Description
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {receipt.description}
                    </p>
                  </div>
                )}

                {/* Additional Notes */}
                {receipt.additional_notes && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Additional Notes
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {receipt.additional_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Raw OCR Text (Collapsible) */}
            {receipt.ocr_raw_text && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
                    View Raw OCR Text
                  </summary>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                      {receipt.ocr_raw_text}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedReceiptModal;
