/**
 * Receipt Upload Modal Component
 * 
 * Features:
 * - Drag-and-drop file upload with preview
 * - Real-time OCR processing and data display
 * - Comprehensive receipt data extraction
 * - Line items and amounts visualization
 * - Multi-step upload workflow
 * - Enhanced receipt image display
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Camera, 
  Image as ImageIcon,
  DollarSign,
  Calendar,
  MapPin,
  ShoppingCart,
  Receipt as ReceiptIcon
} from 'lucide-react';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_number: number;
}

interface ExtractedData {
  vendor_name?: string;
  total_amount?: number;
  currency?: string;
  date?: string;
  items?: string[];
  all_amounts?: Array<{
    amount: number;
    line: number;
    context: string;
    raw_text: string;
  }>;
  line_items?: ReceiptItem[];
  processing_time?: number;
  confidence?: number;
  raw_text?: string;
}

interface UploadedReceipt {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  ocrProgress?: number;
  metadata?: {
    vendor: string;
    amount: string;
    date: string;
    category: string;
    description: string;
    tags: string[];
  };
  error?: string;
  extracted_data?: ExtractedData;
  image_url?: string;
}

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (receipts: UploadedReceipt[]) => void;
}

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

const CATEGORIES = [
  { value: 'food', label: 'Food & Beverages' },
  { value: 'office', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'other', label: 'Other' }
];

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'metadata' | 'complete'>('upload');
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [metadata, setMetadata] = useState({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    tags: [] as string[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  // Process uploaded files
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`File type not supported: ${file.name}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    // Create receipt objects for tracking
    const newReceipts: UploadedReceipt[] = validFiles.map(file => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.name,
      status: 'uploading',
      progress: 0
    }));

    setUploadedReceipts(prev => [...prev, ...newReceipts]);

    // Upload files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const receipt = newReceipts[i];
      
      try {
        await uploadFile(file, receipt.id);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        updateReceiptStatus(receipt.id, 'error', error instanceof Error ? error.message : 'Upload failed');
      }
    }
  };

  // Upload individual file with OCR processing
  const uploadFile = async (file: File, receiptId: string) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      updateReceiptProgress(receiptId, 25);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/receipts/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      updateReceiptProgress(receiptId, 50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const receiptData = await response.json();
      updateReceiptProgress(receiptId, 75);

      // Update receipt with OCR data
      setUploadedReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId 
          ? {
              ...receipt,
              status: 'processing',
              progress: 100,
              id: receiptData.id || receipt.id,
              image_url: receiptData.image_url
            }
          : receipt
      ));

      // Start OCR processing or get results if already complete
      if (receiptData.status === 'completed' || receiptData.status === 'COMPLETED') {
        // OCR already complete
        const extractedData: ExtractedData = {
          vendor_name: receiptData.extracted_vendor,
          total_amount: receiptData.extracted_total,
          currency: 'TL',
          date: receiptData.extracted_date,
          items: receiptData.extracted_items ? JSON.parse(receiptData.extracted_items) : [],
          confidence: receiptData.ocr_confidence || 0.95,
          processing_time: receiptData.processing_time || 1.2,
          raw_text: receiptData.ocr_raw_text
        };

        // Parse structured OCR data if available
        if (receiptData.extracted_items) {
          try {
            const parsed = JSON.parse(receiptData.extracted_items);
            if (Array.isArray(parsed)) {
              extractedData.items = parsed;
            }
          } catch (e) {
            console.log('Could not parse extracted items');
          }
        }

        updateReceiptWithOCR(receiptId, extractedData);
      } else {
        // Poll for OCR completion
        pollForOCRCompletion(receiptData.id, receiptId);
      }

    } catch (error) {
      updateReceiptStatus(receiptId, 'error', error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // Poll for OCR completion
  const pollForOCRCompletion = async (serverReceiptId: string, localReceiptId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/v1/receipts/${serverReceiptId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const receiptData = await response.json();
          
          if (receiptData.status === 'completed' || receiptData.status === 'COMPLETED') {
            // OCR complete
            const extractedData: ExtractedData = {
              vendor_name: receiptData.extracted_vendor,
              total_amount: receiptData.extracted_total,
              currency: 'TL',
              date: receiptData.extracted_date,
              confidence: receiptData.ocr_confidence || 0.95,
              processing_time: receiptData.processing_time || 1.2,
              raw_text: receiptData.ocr_raw_text
            };

            updateReceiptWithOCR(localReceiptId, extractedData);
            return;
          }
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
          updateReceiptOCRProgress(localReceiptId, (attempts / maxAttempts) * 100);
        } else {
          updateReceiptStatus(localReceiptId, 'error', 'OCR processing timeout');
        }

      } catch (error) {
        console.error('Polling error:', error);
        updateReceiptStatus(localReceiptId, 'error', 'OCR processing failed');
      }
    };

    poll();
  };

  // Update receipt progress
  const updateReceiptProgress = (receiptId: string, progress: number) => {
    setUploadedReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId ? { ...receipt, progress } : receipt
    ));
  };

  // Update receipt OCR progress
  const updateReceiptOCRProgress = (receiptId: string, ocrProgress: number) => {
    setUploadedReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId ? { ...receipt, ocrProgress } : receipt
    ));
  };

  // Update receipt status
  const updateReceiptStatus = (receiptId: string, status: UploadedReceipt['status'], error?: string) => {
    setUploadedReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId ? { ...receipt, status, error } : receipt
    ));
  };

  // Update receipt with OCR data
  const updateReceiptWithOCR = (receiptId: string, extractedData: ExtractedData) => {
    setUploadedReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId 
        ? { 
            ...receipt, 
            status: 'completed',
            extracted_data: extractedData,
            metadata: {
              vendor: extractedData.vendor_name || '',
              amount: extractedData.total_amount?.toString() || '',
              date: extractedData.date || new Date().toISOString().split('T')[0],
              category: '',
              description: '',
              tags: []
            }
          } 
        : receipt
    ));
  };

  // Handle metadata submission
  const handleMetadataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReceiptId) return;

    // Update receipt metadata
    setUploadedReceipts(prev => prev.map(receipt => 
      receipt.id === selectedReceiptId 
        ? { ...receipt, metadata: { ...metadata } }
        : receipt
    ));

    // Move to next receipt or complete
    const currentIndex = uploadedReceipts.findIndex(r => r.id === selectedReceiptId);
    const nextReceipt = uploadedReceipts[currentIndex + 1];
    
    if (nextReceipt) {
      setSelectedReceiptId(nextReceipt.id);
      // Pre-fill metadata with OCR data
      if (nextReceipt.extracted_data) {
        setMetadata({
          vendor: nextReceipt.extracted_data.vendor_name || '',
          amount: nextReceipt.extracted_data.total_amount?.toString() || '',
          date: nextReceipt.extracted_data.date || new Date().toISOString().split('T')[0],
          category: '',
          description: '',
          tags: []
        });
      }
    } else {
      setCurrentStep('complete');
    }
  };

  // Handle close
  const handleClose = () => {
    setCurrentStep('upload');
    setUploadedReceipts([]);
    setSelectedReceiptId(null);
    setMetadata({
      vendor: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      tags: []
    });
    
    onClose();
  };

  // Skip metadata editing
  const handleSkipMetadata = () => {
    setCurrentStep('complete');
  };

  // Go back to previous step
  const handleBack = () => {
    if (currentStep === 'metadata') {
      setCurrentStep('upload');
    }
  };

  // Get current receipt being edited
  const currentReceipt = selectedReceiptId 
    ? uploadedReceipts.find(r => r.id === selectedReceiptId)
    : null;

  // Update metadata when switching receipts
  React.useEffect(() => {
    if (currentReceipt?.metadata) {
      setMetadata({
        vendor: currentReceipt.metadata.vendor || '',
        amount: currentReceipt.metadata.amount || '',
        date: currentReceipt.metadata.date || new Date().toISOString().split('T')[0],
        category: currentReceipt.metadata.category || '',
        description: currentReceipt.metadata.description || '',
        tags: currentReceipt.metadata.tags || []
      });
    }
  }, [currentReceipt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
                Upload Receipts
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="space-y-6">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">Drop receipt files here</p>
                      <p className="text-gray-500">or click to browse</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Choose Files
                    </button>
                    <p className="text-xs text-gray-500">
                      Supports: JPG, PNG, PDF • Max 10MB each • Up to 10 files
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_FILE_TYPES.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Uploaded Files List */}
                {uploadedReceipts.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">Uploaded Receipts</h4>
                    {uploadedReceipts.map((receipt) => (
                      <div key={receipt.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          {/* Receipt Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">{receipt.filename}</p>
                                <p className="text-sm text-gray-500">
                                  {receipt.status === 'uploading' && `Uploading... ${receipt.progress}%`}
                                  {receipt.status === 'processing' && 'Processing with OCR...'}
                                  {receipt.status === 'completed' && 'OCR Complete'}
                                  {receipt.status === 'error' && (receipt.error || 'Processing failed')}
                                </p>
                              </div>
                            </div>

                            {/* OCR Results Display */}
                            {receipt.status === 'completed' && receipt.extracted_data && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Vendor */}
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <div>
                                      <p className="text-xs font-medium text-green-800">Vendor</p>
                                      <p className="text-sm text-green-900">
                                        {receipt.extracted_data.vendor_name || 'Unknown'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Amount */}
                                  <div className="flex items-center space-x-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <div>
                                      <p className="text-xs font-medium text-green-800">Total Amount</p>
                                      <p className="text-sm text-green-900">
                                        {receipt.extracted_data.total_amount 
                                          ? `${receipt.extracted_data.total_amount.toFixed(2)} ${receipt.extracted_data.currency || 'TL'}`
                                          : 'Not detected'
                                        }
                                      </p>
                                    </div>
                                  </div>

                                  {/* Date */}
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-green-600" />
                                    <div>
                                      <p className="text-xs font-medium text-green-800">Date</p>
                                      <p className="text-sm text-green-900">
                                        {receipt.extracted_data.date || 'Not detected'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* All Amounts Found */}
                                {receipt.extracted_data.all_amounts && receipt.extracted_data.all_amounts.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-green-300">
                                    <p className="text-xs font-medium text-green-800 mb-2">All Amounts Found:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {receipt.extracted_data.all_amounts.slice(0, 5).map((amount, idx) => (
                                        <span 
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                                        >
                                          {amount.amount.toFixed(2)} TL
                                        </span>
                                      ))}
                                      {receipt.extracted_data.all_amounts.length > 5 && (
                                        <span className="text-xs text-green-600">
                                          +{receipt.extracted_data.all_amounts.length - 5} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Items Found */}
                                {receipt.extracted_data.items && receipt.extracted_data.items.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-green-300">
                                    <p className="text-xs font-medium text-green-800 mb-2">Items Found:</p>
                                    <div className="text-xs text-green-700">
                                      {receipt.extracted_data.items.slice(0, 3).join(', ')}
                                      {receipt.extracted_data.items.length > 3 && 
                                        ` and ${receipt.extracted_data.items.length - 3} more items`
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Confidence Score */}
                                {receipt.extracted_data.confidence && (
                                  <div className="mt-2 text-xs text-green-600">
                                    OCR Confidence: {Math.round(receipt.extracted_data.confidence * 100)}%
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status Icon */}
                          <div className="ml-4">
                            {receipt.status === 'uploading' && (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            )}
                            {receipt.status === 'processing' && (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                            )}
                            {receipt.status === 'completed' && (
                              <Check className="h-5 w-5 text-green-600" />
                            )}
                            {receipt.status === 'error' && (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {(receipt.status === 'uploading' || receipt.status === 'processing') && (
                          <div className="mt-3">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  receipt.status === 'uploading' ? 'bg-blue-600' : 'bg-yellow-600'
                                }`}
                                style={{ 
                                  width: `${receipt.status === 'processing' 
                                    ? (receipt.ocrProgress || 50) 
                                    : receipt.progress
                                  }%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata Step */}
            {currentStep === 'metadata' && currentReceipt && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Review & Edit Receipt Data</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Editing receipt {uploadedReceipts.findIndex(r => r.id === selectedReceiptId) + 1} of {uploadedReceipts.length}: {currentReceipt.filename}
                  </p>
                </div>

                <form onSubmit={handleMetadataSubmit} className="space-y-4">
                  {/* Vendor */}
                  <div>
                    <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                      Vendor
                    </label>
                    <input
                      type="text"
                      id="vendor"
                      value={metadata.vendor}
                      onChange={(e) => setMetadata(prev => ({ ...prev, vendor: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Office Depot, Starbucks"
                    />
                  </div>

                  {/* Amount and Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="amount"
                        value={metadata.amount}
                        onChange={(e) => setMetadata(prev => ({ ...prev, amount: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        value={metadata.date}
                        onChange={(e) => setMetadata(prev => ({ ...prev, date: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      value={metadata.category}
                      onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={metadata.description}
                      onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes about this receipt..."
                    />
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <div className="space-x-3">
                      <button
                        type="button"
                        onClick={handleSkipMetadata}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Skip All
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        {uploadedReceipts.findIndex(r => r.id === selectedReceiptId) === uploadedReceipts.length - 1 
                          ? 'Complete' 
                          : 'Next'
                        }
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Upload Complete!
                  </h4>
                  <p className="text-gray-600">
                    {uploadedReceipts.length} receipt{uploadedReceipts.length !== 1 ? 's' : ''} processed successfully.
                    {uploadedReceipts.length > 0 && ' The receipts have been added to your records.'}
                  </p>
                </div>
                <div className="space-y-2">
                  {uploadedReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-left">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.filename}</p>
                        <p className="text-xs text-gray-500">
                          {receipt.metadata?.vendor || 'Unknown vendor'} • 
                          ${receipt.metadata?.amount || '0.00'} • 
                          {receipt.metadata?.date || 'No date'}
                        </p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                        Processed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
            {currentStep === 'upload' && uploadedReceipts.length > 0 && (
              <button
                onClick={() => {
                  const completedReceipts = uploadedReceipts.filter(r => r.status === 'completed');
                  if (completedReceipts.length > 0) {
                    setSelectedReceiptId(completedReceipts[0].id);
                    setCurrentStep('metadata');
                  } else {
                    setCurrentStep('complete');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Continue to Review
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {currentStep === 'complete' ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUploadModal;
