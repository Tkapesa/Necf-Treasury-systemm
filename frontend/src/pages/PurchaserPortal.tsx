/**
 * PurchaserPortal.tsx
 * 
 * Dedicated interface for church members who purchase items and need to submit receipts.
 * Simple, focused interface without admin dashboard access.
 */

import React, { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import CameraCapture from '../components/CameraCapture';
import logoImage from '../assets/images/logos/Copy of logo REMAKE.png';

interface PurchaserUploadState {
  isUploading: boolean;
  error: string | null;
  success: boolean;
  uploadedReceipts: string[];
}

interface PurchaseInfo {
  purchaserName: string;
  purchaserEmail: string;
  eventOrPurpose: string;
  approvedBy: string;
  amount: string;
  purchaseDate: string;
  notes: string;
}

interface FormErrors {
  purchaserName?: string;
  purchaserEmail?: string;
  eventOrPurpose?: string;
  approvedBy?: string;
  amount?: string;
  purchaseDate?: string;
}

export const PurchaserPortal: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [uploadState, setUploadState] = useState<PurchaserUploadState>({
    isUploading: false,
    error: null,
    success: false,
    uploadedReceipts: []
  });
  
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo>({
    purchaserName: '',
    purchaserEmail: '',
    eventOrPurpose: '',
    approvedBy: '',
    amount: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Default to today
    notes: ''
  });

  const [currentStep, setCurrentStep] = useState<'info' | 'capture' | 'review' | 'submit'>('info');

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  /**
   * Handle email input change with real-time validation
   */
  const handleEmailChange = (email: string) => {
    setPurchaseInfo(prev => ({ ...prev, purchaserEmail: email }));
    
    // Clear previous email error
    if (formErrors.purchaserEmail) {
      setFormErrors(prev => ({ ...prev, purchaserEmail: undefined }));
    }
    
    // Show immediate validation for invalid emails (only if user has typed something)
    if (email.trim() && !validateEmail(email)) {
      setFormErrors(prev => ({ 
        ...prev, 
        purchaserEmail: 'Please enter a valid email address (e.g., john@example.com)' 
      }));
    }
  };

  /**
   * Validate form fields
   */
  const validateForm = (): FormErrors => {
    const errors: FormErrors = {};

    if (!purchaseInfo.purchaserName.trim()) {
      errors.purchaserName = 'Your name is required';
    }

    if (!purchaseInfo.purchaserEmail.trim()) {
      errors.purchaserEmail = 'Email address is required';
    } else if (!validateEmail(purchaseInfo.purchaserEmail)) {
      errors.purchaserEmail = 'Please enter a valid email address (e.g., john@example.com)';
    }

    if (!purchaseInfo.eventOrPurpose.trim()) {
      errors.eventOrPurpose = 'Event or purpose is required';
    }

    if (!purchaseInfo.approvedBy.trim()) {
      errors.approvedBy = 'Approved by field is required';
    }

    if (!purchaseInfo.amount.trim()) {
      errors.amount = 'Purchase amount is required';
    } else {
      // Validate amount format
      const cleanAmount = purchaseInfo.amount.trim().replace(/[$,]/g, '');
      if (isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
        errors.amount = 'Please enter a valid amount (e.g., 125.50)';
      }
    }

    return errors;
  };

  /**
   * Handle camera capture
   */
  const handleCameraCapture = useCallback((capturedFile: File) => {
    setFile(capturedFile);
    
    // Create preview for the captured image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(capturedFile);
    
    setIsCameraOpen(false);
    setCurrentStep('review');
  }, []);

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview if it's an image
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
      
      setCurrentStep('review');
    }
  };

  /**
   * Submit receipt with purchase information
   */
  const handleSubmitReceipt = async () => {
    if (!file) return;

    // Validate form before submission
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Clear any previous errors
    setFormErrors({});
    setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purchaser_name', purchaseInfo.purchaserName.trim());
      formData.append('purchaser_email', purchaseInfo.purchaserEmail.trim().toLowerCase());
      formData.append('event_or_purpose', purchaseInfo.eventOrPurpose.trim());
      formData.append('approved_by', purchaseInfo.approvedBy.trim());
      formData.append('amount', purchaseInfo.amount.trim());
      formData.append('notes', purchaseInfo.notes.trim());
      formData.append('submission_type', 'purchaser_portal');

      // Submit to a special endpoint for purchaser submissions
      const response = await apiClient.post('/receipts/purchaser-submit', formData, {
        requiresAuth: false,  // No authentication required for purchaser portal
      }) as { id: string };

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        success: true,
        uploadedReceipts: [...prev.uploadedReceipts, response.id]
      }));

      setCurrentStep('submit');

    } catch (error: any) {
      console.error('Receipt submission error:', error);
      
      let errorMessage = 'Failed to submit receipt';
      
      // Handle FastAPI validation errors (422)
      if (error?.details?.detail && Array.isArray(error.details.detail)) {
        const validationErrors = error.details.detail;
        const errorMessages = validationErrors.map((err: any) => {
          const field = err.loc?.[err.loc.length - 1] || 'field';
          return `${field}: ${err.msg}`;
        });
        errorMessage = errorMessages.join(', ');
      }
      // Handle other API errors
      else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage
      }));
    }
  };

  /**
   * Reset form to capture another receipt
   */
  const handleCaptureAnother = () => {
    setFile(null);
    setPreview(null);
    setCurrentStep('capture');
    setUploadState(prev => ({ ...prev, error: null, success: false }));
  };

  /**
   * Complete submission
   */
  const handleComplete = () => {
    // Reset everything for new session
    setFile(null);
    setPreview(null);
    setPurchaseInfo({
      purchaserName: '',
      purchaserEmail: '',
      eventOrPurpose: '',
      approvedBy: '',
      notes: '',
      amount: '',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setCurrentStep('info');
    setUploadState({
      isUploading: false,
      error: null,
      success: false,
      uploadedReceipts: []
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Header with Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 md:h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 md:h-10 md:w-10 object-contain"
                  src={logoImage}
                  alt="Near East Christian Fellowship Logo"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                    if (fallback) {
                      fallback.classList.remove('hidden');
                      fallback.classList.add('flex');
                    }
                  }}
                />
                <div className="logo-fallback hidden h-12 w-12 md:h-10 md:w-10 bg-maroon-600 rounded-lg items-center justify-center">
                  <svg className="h-7 w-7 md:h-6 md:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8">
              <a href="/" className="text-gray-700 hover:text-maroon-600 font-medium transition-colors">← Back to Home</a>
              <span className="text-maroon-600 font-medium border-b-2 border-maroon-600 pb-2">Submit Receipt</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Maroon Background Shape */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Maroon Background Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-50 to-maroon-100">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-maroon-600 transform skew-x-12 origin-top-right opacity-5"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-maroon-600 mb-4 md:mb-6 leading-tight">
            Submit Your Receipt
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed px-4">
            Upload your purchase receipt in just a few simple steps. No login required.
          </p>
          <div className="w-16 md:w-24 h-1 bg-maroon-600 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { step: 'info', label: 'Your Info', icon: '1' },
              { step: 'capture', label: 'Capture Receipt', icon: '2' },
              { step: 'review', label: 'Review', icon: '3' },
              { step: 'submit', label: 'Submit', icon: '4' }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  ${currentStep === item.step 
                    ? 'bg-maroon-600 text-white' 
                    : index < ['info', 'capture', 'review', 'submit'].indexOf(currentStep)
                    ? 'bg-maroon-800 text-white'
                    : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {index < ['info', 'capture', 'review', 'submit'].indexOf(currentStep) ? '✓' : item.icon}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === item.step ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    index < ['info', 'capture', 'review', 'submit'].indexOf(currentStep) 
                      ? 'bg-maroon-600' 
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Purchase Information */}
        {currentStep === 'info' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border-2 border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Purchase Information</h2>
            <p className="text-gray-600 mb-6">Please provide your information and details about the purchase.</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={purchaseInfo.purchaserName}
                    onChange={(e) => setPurchaseInfo(prev => ({ ...prev, purchaserName: e.target.value }))}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon-500 ${
                      formErrors.purchaserName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {formErrors.purchaserName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.purchaserName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={purchaseInfo.purchaserEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon-500 ${
                      formErrors.purchaserEmail ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {formErrors.purchaserEmail && (
                    <div className="mt-1 flex items-center">
                      <svg className="h-4 w-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-600 font-medium">{formErrors.purchaserEmail}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event/Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={purchaseInfo.eventOrPurpose}
                  onChange={(e) => setPurchaseInfo(prev => ({ ...prev, eventOrPurpose: e.target.value }))}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon-500 ${
                    formErrors.eventOrPurpose ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Sunday Service, Youth Event, Church Maintenance"
                />
                {formErrors.eventOrPurpose && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.eventOrPurpose}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approved By *
                </label>
                <input
                  type="text"
                  required
                  value={purchaseInfo.approvedBy}
                  onChange={(e) => setPurchaseInfo(prev => ({ ...prev, approvedBy: e.target.value }))}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-maroon-500 ${
                    formErrors.approvedBy ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Name of pastor/leader who approved this purchase"
                />
                {formErrors.approvedBy && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.approvedBy}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseInfo.amount}
                  onChange={(e) => setPurchaseInfo(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount (e.g., 125.50)"
                  required
                />
                {formErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={purchaseInfo.purchaseDate}
                  onChange={(e) => setPurchaseInfo(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {formErrors.purchaseDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.purchaseDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  rows={3}
                  value={purchaseInfo.notes}
                  onChange={(e) => setPurchaseInfo(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional information about this purchase..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  // Validate before proceeding
                  const errors = validateForm();
                  if (Object.keys(errors).length > 0) {
                    setFormErrors(errors);
                    return;
                  }
                  setFormErrors({});
                  setCurrentStep('capture');
                }}
                disabled={!purchaseInfo.purchaserName || !purchaseInfo.purchaserEmail || !purchaseInfo.eventOrPurpose || !purchaseInfo.approvedBy}
                className="bg-maroon-600 text-white px-6 py-2 rounded-md hover:bg-maroon-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Continue to Receipt Capture
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Receipt Capture */}
        {currentStep === 'capture' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border-2 border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Capture Receipt</h2>
            <p className="text-gray-600 mb-6">Take a photo of your receipt or upload an image file.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Camera Option */}
              <div className="text-center">
                <div className="border-2 border-dashed border-red-300 rounded-lg p-8 hover:border-red-400 transition-colors">
                  <div className="w-16 h-16 bg-maroon-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-maroon-200">
                    <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Take Photo</h3>
                  <p className="text-sm text-gray-600 mb-4">Use your device camera to capture the receipt</p>
                  <button
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-maroon-600 text-white px-4 py-2 rounded-md hover:bg-maroon-700 shadow-lg"
                  >
                    Open Camera
                  </button>
                </div>
              </div>

              {/* Upload Option */}
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload File</h3>
                  <p className="text-sm text-gray-600 mb-4">Choose an image file from your device</p>
                  <label className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 cursor-pointer inline-block">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep('info')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && file && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Review Submission</h2>
            <p className="text-gray-600 mb-6">Please review your information and receipt before submitting.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Purchase Info Review */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Purchase Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Purchaser:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{purchaseInfo.purchaserName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{purchaseInfo.purchaserEmail}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Purpose:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{purchaseInfo.eventOrPurpose}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Approved By:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{purchaseInfo.approvedBy}</span>
                  </div>
                  {purchaseInfo.notes && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Notes:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{purchaseInfo.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Preview */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Receipt Preview</h3>
                <div className="border rounded-lg overflow-hidden">
                  {preview ? (
                    <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain" />
                  ) : (
                    <div className="h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500">PDF file - {file.name}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            </div>

            {/* Error Display */}
            {uploadState.error && (
              <div className="mt-4 bg-maroon-50 border border-maroon-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                    <p className="mt-1 text-sm text-red-700">{uploadState.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep('capture')}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                disabled={uploadState.isUploading}
              >
                Back to Capture
              </button>
              <button
                onClick={handleSubmitReceipt}
                disabled={uploadState.isUploading}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {uploadState.isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Receipt'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {currentStep === 'submit' && uploadState.success && (
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Receipt Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your receipt has been submitted to the church treasury. 
              The admin team will review and process it shortly.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Total receipts submitted this session: {uploadState.uploadedReceipts.length}
            </p>
            
            <div className="space-x-4">
              <button
                onClick={handleCaptureAnother}
                className="bg-maroon-600 text-white px-6 py-2 rounded-md hover:bg-maroon-700 shadow-lg"
              >
                Submit Another Receipt
              </button>
              <button
                onClick={handleComplete}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
              >
                Finish
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={() => setIsCameraOpen(false)}
      />
    </div>
  );
};

export default PurchaserPortal;
