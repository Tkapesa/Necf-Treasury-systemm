/**
 * Receipt Image Modal Component
 * 
 * Features:
 * - Full-screen image viewing
 * - Download functionality
 * - Keyboard navigation (ESC to close, arrow keys for navigation)
 * - Touch gestures for mobile
 * - Accessibility support
 * - Loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import { XIcon, DownloadIcon, ChevronLeftIcon, ChevronRightIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';

export interface Receipt {
  id: string;
  image_url?: string;
  vendor?: string;
  extracted_vendor?: string;
  amount?: number;
  extracted_total?: number;
  date?: string;
  extracted_date?: string;
  description?: string;
}

export interface ReceiptImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  receipts?: Receipt[]; // For navigation between receipts
  onReceiptChange?: (receipt: Receipt) => void;
}

export function ReceiptImageModal({
  isOpen,
  onClose,
  receipt,
  receipts = [],
  onReceiptChange
}: ReceiptImageModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Helper function to fetch image with authentication
  const fetchImageWithAuth = async (receiptId: string): Promise<string | null> => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/receipts/${receiptId}/image`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching receipt image:', error);
      return null;
    }
  };

  const currentIndex = receipts.findIndex(r => r.id === receipt?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < receipts.length - 1;

  // Reset states when receipt changes and fetch image
  useEffect(() => {
    if (receipt?.id) {
      setImageLoading(true);
      setImageError(false);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      
      // Clean up previous image URL to prevent memory leaks
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      
      // Fetch the image with authentication
      fetchImageWithAuth(receipt.id).then((url) => {
        if (url) {
          setImageUrl(url);
          setImageLoading(false);
        } else {
          setImageError(true);
          setImageLoading(false);
        }
      });
    }
    
    // Cleanup function to revoke object URLs
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [receipt?.id]);

  // Clean up image URL when modal closes
  useEffect(() => {
    if (!isOpen && imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (hasPrevious) {
          navigateToReceipt(-1);
        }
        break;
      case 'ArrowRight':
        if (hasNext) {
          navigateToReceipt(1);
        }
        break;
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        resetZoom();
        break;
    }
  }, [isOpen, hasPrevious, hasNext, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navigateToReceipt = (direction: number) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < receipts.length) {
      const newReceipt = receipts[newIndex];
      onReceiptChange?.(newReceipt);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!receipt?.id || !imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [receipt?.id, imageUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen || !receipt) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
          <div className="flex items-center space-x-4">
            <h2 id="modal-title" className="text-white text-lg font-semibold">
              {receipt.vendor || receipt.extracted_vendor || 'Receipt'} - ${(receipt.amount || receipt.extracted_total || 0).toFixed(2)}
            </h2>
            {(receipt.date || receipt.extracted_date) && (
              <span className="text-gray-300 text-sm">
                {receipt.date || receipt.extracted_date}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
              aria-label="Zoom out"
              disabled={zoom <= 0.5}
            >
              <ZoomOutIcon className="w-5 h-5" />
            </button>
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
              aria-label="Zoom in"
              disabled={zoom >= 5}
            >
              <ZoomInIcon className="w-5 h-5" />
            </button>

            {/* Navigation */}
            {receipts.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateToReceipt(-1); }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
                  aria-label="Previous receipt"
                  disabled={!hasPrevious}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-white text-sm">
                  {currentIndex + 1} of {receipts.length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateToReceipt(1); }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
                  aria-label="Next receipt"
                  disabled={!hasNext}
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Download */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
              aria-label="Download receipt image"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image container */}
        <div 
          className="flex-1 flex items-center justify-center p-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {imageLoading && (
            <div className="flex flex-col items-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p>Loading image...</p>
            </div>
          )}

          {imageError && (
            <div className="flex flex-col items-center text-white">
              <div className="w-24 h-24 bg-gray-600 rounded-lg flex items-center justify-center mb-4">
                <span className="text-4xl">📄</span>
              </div>
              <p className="text-lg font-semibold mb-2">Image not available</p>
              <p className="text-gray-300 text-center">
                The receipt image could not be loaded. It may have been moved or deleted.
              </p>
            </div>
          )}

          {imageUrl && !imageError && (
            <div 
              className="relative cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <img
                src={imageUrl}
                alt={`Receipt from ${receipt.vendor || receipt.extracted_vendor || 'Unknown vendor'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
                id="modal-description"
              />
            </div>
          )}
        </div>

        {/* Footer with receipt details */}
        {receipt.description && (
          <div className="p-4 bg-black bg-opacity-50">
            <p className="text-white text-sm">
              <span className="font-medium">Description:</span> {receipt.description}
            </p>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-4 left-4 text-xs text-gray-400">
          <p>ESC: Close • ←/→: Navigate • +/-: Zoom • 0: Reset zoom</p>
        </div>
      </div>
    </div>
  );
}

export default ReceiptImageModal;
