/**
 * CameraCapture.tsx
 * 
 * Camera component for capturing receipt images directly from user's device camera.
 * Supports front/back camera switching, photo capture, and preview functionality.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface CameraError {
  name: string;
  message: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, isOpen }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Start with back camera
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Start camera stream
   */
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera permissions and stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      const error = err as CameraError;
      console.error('Camera access error:', error);
      
      let errorMessage = 'Unable to access camera. ';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage += 'Please grant camera permissions and try again.';
          break;
        case 'NotFoundError':
          errorMessage += 'No camera found on this device.';
          break;
        case 'NotReadableError':
          errorMessage += 'Camera is already in use by another application.';
          break;
        case 'OverconstrainedError':
          errorMessage += 'Camera does not support the requested configuration.';
          break;
        default:
          errorMessage += error.message || 'An unknown error occurred.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  /**
   * Stop camera stream
   */
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Create preview
          const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
          setCapturedImage(imageUrl);

          // Create file from blob
          const file = new File(
            [blob], 
            `receipt-${Date.now()}.jpg`, 
            { type: 'image/jpeg' }
          );

          // Stop camera and call onCapture
          stopCamera();
          onCapture(file);
        }
        setIsCapturing(false);
      },
      'image/jpeg',
      0.8
    );
  }, [stopCamera, onCapture]);

  /**
   * Retake photo
   */
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  /**
   * Close camera modal
   */
  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Start camera when component opens
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, startCamera, stopCamera, capturedImage]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && stream && !capturedImage) {
      startCamera();
    }
  }, [facingMode, isOpen, stream, startCamera, capturedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-screen p-4">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Capture Receipt</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 p-2"
            aria-label="Close camera"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera View */}
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center text-white max-w-md">
                <svg className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <div className="space-x-3">
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Video Stream */}
          {!error && !capturedImage && (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Camera Controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
                {/* Switch Camera Button */}
                <button
                  onClick={switchCamera}
                  disabled={isLoading || isCapturing}
                  className="bg-gray-800 bg-opacity-70 text-white p-3 rounded-full hover:bg-opacity-90 disabled:opacity-50"
                  aria-label="Switch camera"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>

                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  disabled={isLoading || isCapturing}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 shadow-lg"
                  aria-label="Capture photo"
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  ) : (
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

                {/* Flash/Settings Placeholder */}
                <div className="w-12 h-12"></div>
              </div>

              {/* Camera Facing Mode Indicator */}
              <div className="absolute top-20 right-4 bg-gray-800 bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                {facingMode === 'user' ? 'Front Camera' : 'Back Camera'}
              </div>
            </>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="w-full h-full object-cover"
              />
              
              {/* Preview Controls */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <button
                  onClick={retakePhoto}
                  className="bg-gray-800 bg-opacity-70 text-white px-6 py-3 rounded-full hover:bg-opacity-90"
                >
                  Retake
                </button>
                <button
                  onClick={handleClose}
                  className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700"
                >
                  Use Photo
                </button>
              </div>
            </div>
          )}

          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Instructions */}
        {!error && !capturedImage && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center text-white bg-gray-800 bg-opacity-70 px-4 py-2 rounded-lg">
            <p className="text-sm">Position the receipt within the frame and tap the capture button</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
