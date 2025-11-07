/**
 * Enhanced Receipt Upload Component with Real-Time OCR Processing
 * 
 * Features:
 * - Immediate OCR processing and data display
 * - Turkish Lira (TL) currency support
 * - Automatic extraction of vendor, amount, date, and items
 * - No manual form fields - everything is extracted automatically
 * - Visual confirmation of extracted data
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  Camera, 
  FileText, 
  Check, 
  AlertCircle, 
  MapPin, 
  DollarSign, 
  Calendar, 
  ShoppingCart,
  Hash,
  Package
} from 'lucide-react';
import { apiClient } from '../../api';
import CameraCapture from '../../components/CameraCapture';

// Types for enhanced receipt data
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
  line_items?: Array<{
    name?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
  processing_time?: number;
  confidence?: number;
  raw_text?: string;
}

interface ReceiptData {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_vendor?: string;
  extracted_total?: number;
  extracted_date?: string;
  extracted_data?: ExtractedData;
  image_url?: string;
  ocr_raw_text?: string;
  confidence?: number;
  processing_time?: number;
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: boolean;
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
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setUploadState(prev => ({ ...prev, error }));
      return;
    }

    setFile(selectedFile);
    setUploadState({ isUploading: false, uploadProgress: 0, error: null, success: false });
    setReceiptData(null);
    
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

    // Auto-upload immediately
    uploadFile(selectedFile);
  }, []);

  /**
   * Handle camera capture
   */
  const handleCameraCapture = useCallback((capturedFile: File) => {
    handleFileSelect(capturedFile);
    setIsCameraOpen(false);
  }, [handleFileSelect]);

  /**
   * Handle drag and drop events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
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
   * Upload file to backend with immediate OCR processing
   */
  const uploadFile = async (fileToUpload?: File) => {
    const uploadFile = fileToUpload || file;
    if (!uploadFile) return;

    setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', uploadFile);

      // Progress simulation
      setUploadState(prev => ({ ...prev, uploadProgress: 25 }));

      // Use the enhanced API endpoint with immediate OCR
      const response = await fetch('/api/v1/receipts/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: uploadFormData,
      });

      setUploadState(prev => ({ ...prev, uploadProgress: 75 }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const receipt = await response.json();
      console.log('🎉 Received receipt with immediate OCR data:', receipt);
      
      setReceiptData(receipt);
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        uploadProgress: 100 
      }));

      console.log('✅ OCR completed immediately!');
      console.log(`🏪 Vendor: ${receipt.extracted_vendor}`);
      console.log(`💰 Total: ${receipt.extracted_total} TL`);

    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error.message 
      }));
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setReceiptData(null);
    setUploadState({ isUploading: false, uploadProgress: 0, error: null, success: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Parse extracted data from the receipt response
   */
  const parseExtractedData = (): ExtractedData | null => {
    if (!receiptData) return null;

    // Try to parse extracted_items if it's a JSON string
    let parsedData: any = {};
    if (receiptData.extracted_data) {
      parsedData = receiptData.extracted_data;
    } else if (receiptData.ocr_raw_text) {
      // Fallback to individual fields
      parsedData = {
        vendor_name: receiptData.extracted_vendor,
        total_amount: receiptData.extracted_total,
        date: receiptData.extracted_date,
        currency: 'TL',
        confidence: receiptData.confidence,
        processing_time: receiptData.processing_time
      };
    }

    return parsedData;
  };

  const extractedData = parseExtractedData();

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
            Upload receipt images or PDFs for automatic OCR processing and data extraction. 
            All data is extracted automatically - no manual entry required!
          </p>
        </div>

        {/* Upload Area */}
        {!file && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors bg-white/90 backdrop-blur-sm ${
              isDragging 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-primary-300 hover:border-primary-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
                <Upload className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-primary-800">Drop your receipt here</p>
                <p className="text-secondary-600">Automatic OCR processing will extract all data</p>
              </div>
              <div className="text-sm text-secondary-600">
                <p>Supports: JPEG, PNG, GIF, WebP, TIFF, PDF</p>
                <p>Maximum size: 10MB • Turkish receipts supported</p>
              </div>
              
              {/* Upload Options */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </button>
                
                <span className="text-sm text-gray-400">or</span>
                
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
                >
                  <Camera className="h-4 w-4 mr-2" />
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

        {/* File Processing Status */}
        {file && (
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-start space-x-4">
              {/* Preview */}
              <div className="flex-shrink-0">
                {preview ? (
                  <img src={preview} alt="Receipt preview" className="h-32 w-32 object-cover rounded-lg border" />
                ) : (
                  <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center border">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* File Info and Processing Status */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">{file.name}</h3>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                </p>
                
                {/* Upload Progress */}
                {uploadState.isUploading && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-blue-600">Processing with OCR...</span>
                      <span className="text-sm text-blue-600">{uploadState.uploadProgress}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success Status */}
                {uploadState.success && !uploadState.isUploading && (
                  <div className="mt-3 flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">OCR processing complete!</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadState.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                <p className="mt-1 text-sm text-red-700">{uploadState.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data Display */}
        {receiptData && extractedData && uploadState.success && (
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              Receipt Data Extracted Successfully
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Receipt Information
                </h3>
                
                <div className="space-y-3">
                  {/* Vendor */}
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Vendor/Market</p>
                      <p className="text-lg font-semibold text-blue-900">
                        {extractedData.vendor_name || receiptData.extracted_vendor || 'Unknown Vendor'}
                      </p>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Amount</p>
                      <p className="text-2xl font-bold text-green-900">
                        {(extractedData.total_amount || receiptData.extracted_total || 0).toFixed(2)} {extractedData.currency || 'TL'}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-800">Purchase Date</p>
                      <p className="text-lg font-semibold text-purple-900">
                        {extractedData.date || receiptData.extracted_date || 'Not detected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Data */}
              <div className="space-y-4">
                {/* All Amounts Found */}
                {extractedData.all_amounts && extractedData.all_amounts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Hash className="h-5 w-5 mr-2" />
                      All Amounts Found ({extractedData.all_amounts.length})
                    </h3>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {extractedData.all_amounts.slice(0, 6).map((amount, index) => (
                          <div key={index} className="bg-white rounded-lg p-2 border">
                            <div className="text-sm font-semibold text-yellow-900">
                              {amount.amount.toFixed(2)} TL
                            </div>
                            <div className="text-xs text-yellow-700 truncate">
                              Line {amount.line}
                            </div>
                          </div>
                        ))}
                        {extractedData.all_amounts.length > 6 && (
                          <div className="bg-white rounded-lg p-2 border flex items-center justify-center">
                            <span className="text-xs text-yellow-600">
                              +{extractedData.all_amounts.length - 6} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Purchased */}
                {extractedData.items && extractedData.items.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Items Purchased ({extractedData.items.length})
                    </h3>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {extractedData.items.slice(0, 8).map((item, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-200 text-orange-800"
                          >
                            {item}
                          </span>
                        ))}
                        {extractedData.items.length > 8 && (
                          <span className="text-xs text-orange-600">
                            +{extractedData.items.length - 8} more items
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items with Prices */}
                {extractedData.line_items && extractedData.line_items.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Line Items ({extractedData.line_items.length})
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {extractedData.line_items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-1 text-sm">
                            <span className="truncate flex-1">
                              {item.name || item.description || `Item ${index + 1}`}
                            </span>
                            <span className="font-semibold ml-2">
                              {(item.total_price || item.total || 0).toFixed(2)} TL
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* OCR Quality Info */}
                {extractedData.confidence && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">OCR Quality</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-medium">{Math.round(extractedData.confidence * 100)}%</span>
                      </div>
                      {extractedData.processing_time && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="font-medium">{extractedData.processing_time.toFixed(2)}s</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Success Actions */}
            <div className="mt-6 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                ✅ Receipt processed and saved automatically. All data extracted using OCR.
              </p>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Upload Another Receipt
              </button>
            </div>
          </div>
        )}

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={isCameraOpen}
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      </div>
    </div>
  );
};

export default UploadReceipt;
