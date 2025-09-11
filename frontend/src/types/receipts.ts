// Types for receipt management
export interface Receipt {
  id: string;
  filename: string;
  original_filename?: string;
  storage_path: string;
  uploader_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  ocr_raw_text?: string;
  extracted_date?: string;
  extracted_vendor?: string;
  extracted_total?: number;
  extracted_items?: ExtractedItem[] | string;
  category?: string;
  created_at: string;
  updated_at: string;
  
  // Enhanced OCR fields
  ocr_confidence?: number;
  processing_time?: number;
  
  // Enhanced purchaser portal fields
  purchaser_name?: string;
  purchaser_email?: string;
  event_purpose?: string;
  approved_by?: string;
  additional_notes?: string;
  
  // Enhanced date tracking
  purchase_date?: string;
  upload_date?: string;
  uploader_type?: 'purchaser_portal' | 'admin_user';
  
  // Additional display fields
  image_url?: string;
  vendor?: string;
  amount?: number;
  date?: string;
  description?: string;
  username?: string;
  user_id?: string;
}

export interface ExtractedItem {
  name?: string;
  description?: string;
  amount?: number;
  price?: number;
  quantity?: number;
  total?: number;
}

export interface ReceiptUploadData {
  vendor_name?: string;
  category?: string;
}

export interface ReceiptUpdateData {
  extracted_vendor?: string;
  extracted_total?: number;
  extracted_date?: string;
  extracted_items?: ExtractedItem[];
  category?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
}

export interface ReceiptStatusResponse {
  id: string;
  status: string;
  ocr_completed: boolean;
  extracted_data?: {
    vendor?: string;
    total?: number;
    date?: string;
    items?: ExtractedItem[];
  };
}
