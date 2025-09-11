/**
 * Enhanced Receipt Data Table Component
 * 
 * Professional table layout that displays receipt information with images,
 * submission details, and enhanced filtering similar to the reference design
 */

import React from 'react';
import { 
  ImageIcon, 
  CalendarIcon, 
  UserIcon, 
  BuildingIcon,
  TagIcon,
  CreditCardIcon,
  ClockIcon
} from 'lucide-react';

export interface EnhancedReceiptData {
  id: string;
  vendor?: string;
  extracted_vendor?: string;
  amount?: number;
  extracted_amount?: number;
  date?: string;
  purchase_date?: string;
  created_at?: string;
  time?: string;
  category?: string;
  description?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'processing' | 'Reconciled' | 'Created' | 'Sent to bank';
  submittedBy?: string;
  username?: string;
  purchaser_name?: string;
  submittedAt?: string;
  approvedBy?: string;
  approved_by?: string;
  approvedAt?: string;
  approved_at?: string;
  imageUrl?: string;
  image_url?: string;
  receiptNumber?: string;
  // Purchaser portal specific fields
  event_purpose?: string;
  purchaser_email?: string;
  additional_notes?: string;
  uploader_id?: string;
  // Legacy fields for compatibility
  reference?: string;
  currency?: string;
  counterparty?: string;
  submission_date?: string;
}

interface EnhancedReceiptTableProps {
  receipts: EnhancedReceiptData[];
  onReceiptClick?: (receipt: EnhancedReceiptData) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'reconciled':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'approved':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'created':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    case 'sent to bank':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
    case 'pending':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    case 'rejected':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
  }
};

export const EnhancedReceiptTable: React.FC<EnhancedReceiptTableProps> = ({
  receipts,
  onReceiptClick
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Date</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Vendor</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Counterparty</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Reference</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Receipt</th>
            <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Amount</th>
            <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300 text-sm">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {receipts.map((receipt) => (
            <tr 
              key={receipt.id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              onClick={() => onReceiptClick?.(receipt)}
            >
              {/* Date Column */}
              <td className="py-4 px-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString() : '—'}
                    </div>
                    {receipt.time && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center mt-1">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {receipt.time}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Vendor Column */}
              <td className="py-4 px-4 text-sm">
                <div className="flex items-start space-x-2">
                  <BuildingIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {receipt.vendor}
                    </div>
                    {receipt.description && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">
                        {receipt.description}
                      </div>
                    )}
                    {receipt.event_purpose && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">
                        Purpose: {receipt.event_purpose}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Counterparty Column */}
              <td className="py-4 px-4 text-sm">
                <div className="flex items-start space-x-2">
                  <UserIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {receipt.counterparty || receipt.purchaser_name || 'N/A'}
                    </div>
                    {receipt.purchaser_email && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">
                        {receipt.purchaser_email}
                      </div>
                    )}
                    {receipt.approved_by && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs truncate mt-1">
                        Approved by: {receipt.approved_by}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Reference Column */}
              <td className="py-4 px-4 text-sm">
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {receipt.reference}
                    </div>
                    {receipt.category && (
                      <div className="mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                          {receipt.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Receipt Image Column */}
              <td className="py-4 px-4 text-sm">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {receipt.image_url ? (
                    <img 
                      src={receipt.image_url} 
                      alt="Receipt" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </td>

              {/* Amount Column */}
              <td className="py-4 px-4 text-sm text-right">
                <div className="flex items-center justify-end space-x-2">
                  <CreditCardIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {(receipt.amount || 0).toLocaleString('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      {receipt.currency}
                    </div>
                  </div>
                </div>
              </td>

              {/* Status Column */}
              <td className="py-4 px-4 text-center">
                <span className={`
                  inline-flex px-3 py-1 text-xs font-medium rounded-full border
                  ${getStatusColor(receipt.status || 'pending')}
                `}>
                  {receipt.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty State */}
      {receipts.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No receipts found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria or add some receipts to get started.</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedReceiptTable;
