/**
 * Receipt Upload Component with OCR Processing
 * 
 * Provides drag-and-drop file upload, preview, and manual data correction.
 * Polls backend for OCR completion and allows editing before final save.
 * 
 * Production Note: For real-time updates, consider WebSocket or Server-Sent Events
 * instead of polling for better user experience and reduced server load.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../../api';
import CameraCapture from '../../components/CameraCapture';

// Types for receipt data
interface ReceiptData {
  id?: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  ocr_completed?: boolean;
  extracted_data?: {
    vendor?: string;
    total?: number;
    date?: string;
    items?: Array<{ description: string; amount: number }>;
  };
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: boolean;
}

interface ReceiptStatusResponse {
  id: string;
  status: string;
  ocr_completed: boolean;
  extracted_data?: {
    vendor?: string;
    total?: number;
    date?: string;
    items?: Array<{ description: string; amount: number }>;
  };
}

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'application/pdf'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const UploadReceipt: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
    success: false
  });
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    total: '',
    date: '',
    category: '',
    items: [] as Array<{ description: string; amount: string }>
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Validate uploaded file
   */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, TIFF) or PDF.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 10MB.';
    }
    
    return null;
  };

  /**
   * Handle file selection (drag & drop or file input)
   */
  const handleFileSelect = useCallback((selectedFile: File) => {
    const error = validateFile(selectedFile);
    if (error) {
      setUploadState((prev: UploadState) => ({ ...prev, error }));
      return;
    }

    setFile(selectedFile);
    setUploadState({ isUploading: false, uploadProgress: 0, error: null, success: false });
    
    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, []);

  /**
   * Handle camera capture
   */
  const handleCameraCapture = useCallback((capturedFile: File) => {
    handleFileSelect(capturedFile);
    setIsCameraOpen(false);
  }, [handleFileSelect]);

  /**
   * Open camera modal
   */
  const openCamera = useCallback(() => {
    setIsCameraOpen(true);
  }, []);

  /**
   * Close camera modal
   */
  const closeCamera = useCallback(() => {
    setIsCameraOpen(false);
  }, []);

  /**
   * Handle drag and drop events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  }, [handleFileSelect]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles[0]);
    }
  };

  /**
   * Upload file to backend
   */
  const uploadFile = async () => {
    if (!file) return;

    setUploadState((prev: UploadState) => ({ ...prev, isUploading: true, error: null }));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (formData.vendor) uploadFormData.append('vendor_name', formData.vendor);
      if (formData.category) uploadFormData.append('category', formData.category);

      // Use the real API endpoint
      const response = await fetch('/api/v1/receipts/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const receipt = await response.json();
      console.log('🎉 Received receipt with immediate OCR data:', receipt);
      
      setReceiptData(receipt);
      setUploadState((prev: UploadState) => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        uploadProgress: 100 
      }));

      // No need to poll - OCR data is already complete!
      if (receipt.status === 'completed' || receipt.status === 'COMPLETED') {
        console.log('✅ OCR completed immediately - no polling needed!');
        console.log(`🏪 Vendor: ${receipt.extracted_vendor}`);
        console.log(`💰 Total: ${receipt.extracted_total} TL`);
        
        // Populate form with extracted data immediately
        setFormData({
          vendor: receipt.extracted_vendor || '',
          total: receipt.extracted_total?.toString() || '',
          date: receipt.extracted_date ? new Date(receipt.extracted_date).toISOString().split('T')[0] : '',
          category: '',
          items: []
        });
        setEditMode(true);
      } else {
        console.log('⚠️ Receipt still processing, starting polling...');
        startPolling(receipt.id);
      }

    } catch (error: any) {
      setUploadState((prev: UploadState) => ({ 
        ...prev, 
        isUploading: false, 
        error: error.message 
      }));
    }
  };

  /**
   * Poll receipt status for OCR completion
   * 
   * Production Note: Consider using WebSocket or Server-Sent Events for real-time updates:
   * - WebSocket: Bidirectional communication for instant status updates
   * - SSE: Server-pushed events for one-way status notifications
   * - This reduces server load and provides better user experience
   */
  const startPolling = (receiptId: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      try {
        const response = await apiClient.get(`/receipts/${receiptId}/status`) as ReceiptStatusResponse;
        setReceiptData((prev: ReceiptData | null) => ({ ...prev, ...response } as ReceiptData));

        // If OCR is complete, stop polling and populate form
        if (response.ocr_completed) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          
          // Populate form with extracted data
          if (response.extracted_data) {
            setFormData({
              vendor: response.extracted_data.vendor || '',
              total: response.extracted_data.total?.toString() || '',
              date: response.extracted_data.date ? new Date(response.extracted_data.date).toISOString().split('T')[0] : '',
              category: '',
              items: response.extracted_data.items?.map(item => ({
                description: item.description,
                amount: item.amount.toString()
              })) || []
            });
            setEditMode(true);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling on error (might be temporary)
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 2000);
  };

  /**
   * Save manual corrections
   */
  const saveReceipt = async () => {
    if (!receiptData?.id) return;

    try {
      const updateData = {
        extracted_vendor: formData.vendor,
        extracted_total: parseFloat(formData.total) || null,
        extracted_date: formData.date ? new Date(formData.date).toISOString() : null,
        category: formData.category,
        extracted_items: formData.items.map((item: any) => ({
          description: item.description,
          amount: parseFloat(item.amount) || 0
        })),
        status: 'reviewed'
      };

      await apiClient.patch(`/receipts/${receiptData.id}`, updateData);
      
      setUploadState((prev: UploadState) => ({ ...prev, success: true }));
      // Reset form for next upload
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error: any) {
      setUploadState((prev: UploadState) => ({ ...prev, error: error.message }));
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setReceiptData(null);
    setEditMode(false);
    setUploadState({ isUploading: false, uploadProgress: 0, error: null, success: false });
    setFormData({
      vendor: '',
      total: '',
      date: '',
      category: '',
      items: []
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Add new item to the items list
   */
  const addItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      items: [...prev.items, { description: '', amount: '' }]
    }));
  };

  /**
   * Remove item from the items list
   */
  const removeItem = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index)
    }));
  };

  /**
   * Update item in the items list
   */
  const updateItem = (index: number, field: 'description' | 'amount', value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(240, 249, 255, 0.85), rgba(240, 249, 255, 0.85)), url(/src/assets/images/backgrounds/Copy%20of%20logo%20REMAKE.png)`,
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f0f9ff'
      }}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary-700">Upload Receipt</h1>
        <p className="mt-2 text-secondary-600">
          Upload receipt images or PDFs for automatic processing and data extraction.
        </p>
      </div>

      {/* Upload Area */}
      {!file && (
        <div
          className="border-2 border-dashed border-primary-300 rounded-lg p-12 text-center hover:border-primary-400 transition-colors bg-white/90 backdrop-blur-sm"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-primary-800">Drop your receipt here</p>
              <p className="text-secondary-600">or choose an option below</p>
            </div>
            <div className="text-sm text-secondary-600">
              <p>Supports: JPEG, PNG, GIF, WebP, TIFF, PDF</p>
              <p>Maximum size: 10MB</p>
            </div>
            
            {/* Upload Options */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose File
              </button>
              
              <span className="text-sm text-gray-400">or</span>
              
              <button
                type="button"
                onClick={openCamera}
                className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.webp,.tiff,.pdf"
              onChange={handleFileInputChange}
            />
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-start space-x-4">
            {/* Preview */}
            <div className="flex-shrink-0">
              {preview ? (
                <img src={preview} alt="Receipt preview" className="h-32 w-32 object-cover rounded-lg" />
              ) : (
                <div className="h-32 w-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{file.name}</h3>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
              </p>
              
              {/* Upload Progress */}
              {uploadState.isUploading && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadState.uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                </div>
              )}

              {/* OCR Status */}
              {isPolling && (
                <div className="mt-2 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Processing with OCR...</span>
                </div>
              )}

              {receiptData && receiptData.status === 'completed' && (
                <div className="mt-2 flex items-center space-x-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-600">OCR processing complete</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 space-y-2">
              {!uploadState.success && !uploadState.isUploading && (
                <button
                  onClick={uploadFile}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Upload
                </button>
              )}
              <button
                onClick={resetForm}
                className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadState.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="mt-1 text-sm text-red-700">{uploadState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editMode && receiptData && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Review & Edit Receipt Data</h2>
          <p className="text-gray-600 mb-6">
            Please review the automatically extracted data and make any necessary corrections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor/Merchant
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter vendor name"
              />
            </div>

            {/* Total */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="office_supplies">Office Supplies</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="equipment">Equipment</option>
                <option value="food_beverage">Food & Beverage</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Line Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 mb-3">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Item description"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveReceipt}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save Receipt
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadState.success && !editMode && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Receipt Saved Successfully</h3>
              <p className="mt-1 text-sm text-green-700">
                Your receipt has been processed and saved to the system.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={closeCamera}
      />
    </div>
  );
};

export default UploadReceipt;
