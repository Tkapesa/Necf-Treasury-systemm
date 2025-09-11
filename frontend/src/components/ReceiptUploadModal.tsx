/**
 * ReceiptUploadModal.tsx
 * 
 * Modal component for uploading receipt files with OCR processing.
 * Includes file upload, metadata form, and real-time processing status.
 */

import React, { useState } from 'react';
import FileUpload from './FileUpload';

interface ReceiptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (receipts: any[]) => void;
}

interface ReceiptMetadata {
  vendor: string;
  amount: string;
  date: string;
  category: string;
  description: string;
  tags: string[];
}

interface UploadedReceipt {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  metadata?: Partial<ReceiptMetadata>;
  ocrProgress?: number;
  error?: string;
}

/**
 * Modal for uploading receipt files with metadata entry
 * Features drag-and-drop upload, OCR processing, and form validation
 */
const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  // State management
  const [uploadedReceipts, setUploadedReceipts] = useState<UploadedReceipt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'metadata' | 'complete'>('upload');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReceiptMetadata>({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    tags: []
  });

  // Category options
  const categories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'office', label: 'Office Supplies' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'events', label: 'Events' },
    { value: 'other', label: 'Other' }
  ];

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      const newReceipts: UploadedReceipt[] = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        filename: file.name,
        status: 'uploading' as const,
        ocrProgress: 0
      }));

      setUploadedReceipts(prev => [...prev, ...newReceipts]);

      // Simulate file upload and OCR processing
      for (const receipt of newReceipts) {
        // Update to processing status
        setUploadedReceipts(prev => 
          prev.map(r => r.id === receipt.id ? { ...r, status: 'processing' } : r)
        );

        // Simulate OCR progress
        const progressInterval = setInterval(() => {
          setUploadedReceipts(prev => 
            prev.map(r => 
              r.id === receipt.id 
                ? { ...r, ocrProgress: Math.min((r.ocrProgress || 0) + 10, 90) }
                : r
            )
          );
        }, 200);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        clearInterval(progressInterval);

        // Mock OCR results
        const mockOcrData = {
          vendor: 'Sample Vendor',
          amount: '25.99',
          date: new Date().toISOString().split('T')[0],
          category: 'food',
          description: 'Receipt from ' + receipt.filename.split('.')[0]
        };

        // Update to completed status with OCR data
        setUploadedReceipts(prev => 
          prev.map(r => 
            r.id === receipt.id 
              ? { 
                  ...r, 
                  status: 'completed',
                  ocrProgress: 100,
                  metadata: mockOcrData
                }
              : r
          )
        );
      }

      // Move to metadata step if we have receipts
      if (newReceipts.length > 0) {
        setCurrentStep('metadata');
        setSelectedReceiptId(newReceipts[0].id);
        // Metadata will be set when OCR processing completes
      }

    } catch (error) {
      console.error('Upload failed:', error);
      // Update failed receipts
      setUploadedReceipts(prev => 
        prev.map(r => 
          files.some(f => f.name.includes(r.filename))
            ? { ...r, status: 'failed', error: 'Upload failed' }
            : r
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle metadata form submission
  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReceiptId) return;

    try {
      setIsProcessing(true);

      // Update the receipt with user-provided metadata
      setUploadedReceipts(prev => 
        prev.map(r => 
          r.id === selectedReceiptId 
            ? { ...r, metadata: { ...r.metadata, ...metadata } }
            : r
        )
      );

      // Simulate API call to save metadata
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Move to next receipt or complete
      const currentIndex = uploadedReceipts.findIndex(r => r.id === selectedReceiptId);
      const nextReceipt = uploadedReceipts[currentIndex + 1];
      
      if (nextReceipt) {
        setSelectedReceiptId(nextReceipt.id);
        setMetadata({
          vendor: nextReceipt.metadata?.vendor || '',
          amount: nextReceipt.metadata?.amount || '',
          date: nextReceipt.metadata?.date || new Date().toISOString().split('T')[0],
          category: nextReceipt.metadata?.category || '',
          description: nextReceipt.metadata?.description || '',
          tags: nextReceipt.metadata?.tags || []
        });
      } else {
        setCurrentStep('complete');
      }

    } catch (error) {
      console.error('Failed to save metadata:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (currentStep === 'complete' && onUploadComplete) {
      onUploadComplete(uploadedReceipts);
    }
    
    // Reset state
    setUploadedReceipts([]);
    setCurrentStep('upload');
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
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress indicator */}
            <div className="mt-4">
              <nav aria-label="Progress">
                <ol className="flex items-center">
                  {[
                    { id: 'upload', name: 'Upload Files', status: currentStep === 'upload' ? 'current' : 'complete' },
                    { id: 'metadata', name: 'Review Data', status: currentStep === 'metadata' ? 'current' : currentStep === 'complete' ? 'complete' : 'upcoming' },
                    { id: 'complete', name: 'Complete', status: currentStep === 'complete' ? 'current' : 'upcoming' }
                  ].map((step, index) => (
                    <li key={step.id} className={`relative ${index !== 2 ? 'pr-8 sm:pr-20' : ''}`}>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        {index !== 2 && (
                          <div className={`h-0.5 w-full ${step.status === 'complete' ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className={`relative w-8 h-8 flex items-center justify-center rounded-full ${
                        step.status === 'complete' ? 'bg-blue-600' :
                        step.status === 'current' ? 'border-2 border-blue-600 bg-white' :
                        'border-2 border-gray-300 bg-white'
                      }`}>
                        {step.status === 'complete' ? (
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className={`text-sm font-medium ${
                            step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-medium text-gray-500">{step.name}</p>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Receipt Files</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload receipt images or PDFs. Our OCR will automatically extract vendor, amount, and date information.
                  </p>
                </div>

                <FileUpload
                  onUpload={handleFileUpload}
                  accept=".jpg,.jpeg,.png,.pdf"
                  maxSize={10 * 1024 * 1024}
                  maxFiles={10}
                  disabled={isProcessing}
                  showCamera={true}
                />

                {/* Uploaded files status */}
                {uploadedReceipts.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">Processing Status</h5>
                    {uploadedReceipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {receipt.status === 'uploading' && (
                              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            {receipt.status === 'processing' && (
                              <svg className="animate-pulse h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            )}
                            {receipt.status === 'completed' && (
                              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {receipt.status === 'failed' && (
                              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{receipt.filename}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {receipt.status === 'uploading' && 'Uploading...'}
                              {receipt.status === 'processing' && `Processing OCR... ${receipt.ocrProgress || 0}%`}
                              {receipt.status === 'completed' && 'OCR completed'}
                              {receipt.status === 'failed' && (receipt.error || 'Processing failed')}
                            </p>
                          </div>
                        </div>
                        {receipt.status === 'processing' && (
                          <div className="w-24">
                            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${receipt.ocrProgress || 0}%` }}
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
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="amount"
                          step="0.01"
                          value={metadata.amount}
                          onChange={(e) => setMetadata(prev => ({ ...prev, amount: e.target.value }))}
                          className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
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
                      {categories.map((category) => (
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
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Back
                    </button>
                    <div className="space-x-3">
                      <button
                        type="button"
                        onClick={handleSkipMetadata}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Skip All
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Saving...' : 'Save & Continue'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Upload Complete!</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Successfully uploaded {uploadedReceipts.length} receipt{uploadedReceipts.length !== 1 ? 's' : ''}.
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
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {currentStep === 'complete' ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptUploadModal;
