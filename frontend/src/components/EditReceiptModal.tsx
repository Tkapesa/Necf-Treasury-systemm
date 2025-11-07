/**
 * Edit Receipt Modal Component
 * 
 * Allows admins to manually correct inaccurate OCR-extracted receipt data
 * Provides form fields for editing vendor, amount, date, category, and status
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Edit3, Calendar, DollarSign, Tag, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api/client';

interface Receipt {
  id: string;
  extracted_vendor?: string;
  extracted_total?: number;
  extracted_date?: string;
  purchase_date?: string;
  category?: string;
  status?: string;
  description?: string;
  purchaser_name?: string;
  purchaser_email?: string;
  event_purpose?: string;
  additional_notes?: string;
}

interface EditReceiptModalProps {
  receipt: Receipt;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    extracted_vendor: '',
    extracted_total: '',
    extracted_date: '',
    category: '',
    status: '',
    description: '',
    purchaser_name: '',
    purchaser_email: '',
    event_purpose: '',
    additional_notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when receipt changes
  useEffect(() => {
    if (receipt) {
      setFormData({
        extracted_vendor: receipt.extracted_vendor || '',
        extracted_total: receipt.extracted_total?.toString() || '',
        extracted_date: receipt.extracted_date || receipt.purchase_date || '',
        category: receipt.category || 'general',
  status: (receipt.status as any) || 'completed',
        description: receipt.description || '',
        purchaser_name: receipt.purchaser_name || '',
        purchaser_email: receipt.purchaser_email || '',
        event_purpose: receipt.event_purpose || '',
        additional_notes: receipt.additional_notes || ''
      });
    }
  }, [receipt]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.extracted_vendor.trim()) {
      newErrors.extracted_vendor = 'Vendor name is required';
    }

    if (!formData.extracted_total || parseFloat(formData.extracted_total) <= 0) {
      newErrors.extracted_total = 'Valid amount is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        extracted_vendor: formData.extracted_vendor,
        extracted_total: parseFloat(formData.extracted_total),
        extracted_date: formData.extracted_date || null,
        category: formData.category,
        status: formData.status,
        description: formData.description,
        purchaser_name: formData.purchaser_name || null,
        purchaser_email: formData.purchaser_email || null,
        event_purpose: formData.event_purpose || null,
        additional_notes: formData.additional_notes || null,
        manually_edited: true // Flag to track manual edits
      };

      console.log('📤 Sending update to backend:', updateData);
      const response = await apiClient.put(`/receipts/${receipt.id}`, updateData);
      console.log('✅ Backend response:', response);
      
      toast.success('Receipt updated successfully!');
      
      // Close modal immediately for better UX
      onClose();
      
      console.log('🔄 Triggering onSuccess callback...');
      // Trigger data reload
      onSuccess?.();
      console.log('✅ onSuccess callback completed');
    } catch (error: any) {
      console.error('❌ Failed to update receipt:', error);
      const message = error?.message || error?.details?.detail || 'Failed to update receipt';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-auto my-8 animate-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-maroon-50 to-maroon-100 dark:from-gray-700 dark:to-gray-800 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-maroon-600 rounded-xl">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Receipt</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manually correct OCR-extracted data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">Admin Edit Mode</p>
                  <p>Changes made here will override the OCR-extracted data. The receipt will be flagged as manually edited.</p>
                </div>
              </div>
            </div>

            {/* Core Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Name */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span>Vendor Name *</span>
                </label>
                <input
                  type="text"
                  name="extracted_vendor"
                  value={formData.extracted_vendor}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.extracted_vendor 
                      ? 'border-red-300 dark:border-red-700' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all`}
                  placeholder="e.g., ikns SUPERMARKET"
                  disabled={loading}
                />
                {errors.extracted_vendor && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.extracted_vendor}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>Amount (TL) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="extracted_total"
                  value={formData.extracted_total}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    errors.extracted_total 
                      ? 'border-red-300 dark:border-red-700' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all`}
                  placeholder="0.00"
                  disabled={loading}
                />
                {errors.extracted_total && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.extracted_total}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  name="extracted_date"
                  value={formData.extracted_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <span>Category</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                  disabled={loading}
                >
                  <option value="general">General</option>
                  <option value="food">Food & Dining</option>
                  <option value="transportation">Transportation</option>
                  <option value="office">Office Supplies</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="utilities">Utilities</option>
                  <option value="purchaser_portal">Purchaser Portal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                  disabled={loading}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Additional Information (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="purchaser_name"
                  value={formData.purchaser_name}
                  onChange={handleChange}
                  placeholder="Purchaser Name"
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                  disabled={loading}
                />
                <input
                  type="email"
                  name="purchaser_email"
                  value={formData.purchaser_email}
                  onChange={handleChange}
                  placeholder="Purchaser Email"
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                  disabled={loading}
                />
              </div>

              <input
                type="text"
                name="event_purpose"
                value={formData.event_purpose}
                onChange={handleChange}
                placeholder="Event Purpose"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all"
                disabled={loading}
              />

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all resize-none"
                disabled={loading}
              />

              <textarea
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleChange}
                placeholder="Additional Notes"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all resize-none"
                disabled={loading}
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all transform hover:scale-105"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-maroon-600 to-maroon-700 text-white rounded-xl text-sm font-semibold hover:from-maroon-700 hover:to-maroon-800 transition-all transform hover:scale-105 shadow-lg shadow-maroon-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditReceiptModal;
