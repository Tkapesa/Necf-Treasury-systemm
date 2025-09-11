/**
 * Dummy API Client for Netlify Demo
 * This replaces the real API client with static mock data for demonstration purposes
 */

import { Receipt, ReceiptStatusResponse, ReceiptUpdateData } from '../types/receipts';
import { User, LoginRequest, LoginResponse } from '../types/auth';

// Dummy receipt images (using placeholder images)
const createDummyImageUrl = (id: string) => `https://picsum.photos/400/600?random=${id}`;

// Mock data
const dummyUser: User = {
  id: 'admin-user-id',
  username: 'admin',
  email: 'admin@church.org',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login: '2024-01-15T10:30:00Z'
};

const dummyReceipts: Receipt[] = [
  {
    id: '706581be-2b50-473f-8779-bea0171f5053',
    filename: 'grocery_receipt_001.jpg',
    original_filename: 'grocery_receipt_001.jpg',
    storage_path: '/uploads/receipts/dummy/receipt_001.jpg',
    uploader_id: 'admin-user-id',
    status: 'completed',
    ocr_raw_text: 'CHURCH GROCERY STORE\n123 Main St\nTotal: $45.67\nDate: 2024-01-15',
    extracted_date: '2024-01-15',
    extracted_vendor: 'Church Grocery Store',
    extracted_total: 45.67,
    extracted_items: [
      { description: 'Bread', amount: 3.50 },
      { description: 'Milk', amount: 4.25 },
      { description: 'Coffee', amount: 12.99 },
      { description: 'Sugar', amount: 2.75 },
      { description: 'Tea bags', amount: 6.89 },
      { description: 'Cookies', amount: 8.49 },
      { description: 'Juice', amount: 6.80 }
    ],
    category: 'Office Supplies',
    created_at: '2024-01-15T09:15:00Z',
    updated_at: '2024-01-15T09:20:00Z'
  },
  {
    id: 'e9c80416-bc65-4591-ad82-85d141652aa9',
    filename: 'office_supplies_002.jpg',
    original_filename: 'office_supplies_002.jpg',
    storage_path: '/uploads/receipts/dummy/receipt_002.jpg',
    uploader_id: 'admin-user-id',
    status: 'completed',
    ocr_raw_text: 'OFFICE DEPOT\n456 Church Ave\nTotal: $127.43\nDate: 2024-01-14',
    extracted_date: '2024-01-14',
    extracted_vendor: 'Office Depot',
    extracted_total: 127.43,
    extracted_items: [
      { description: 'Paper (5 reams)', amount: 45.99 },
      { description: 'Pens (10 pack)', amount: 15.75 },
      { description: 'Stapler', amount: 12.50 },
      { description: 'Folders', amount: 18.99 },
      { description: 'Printer ink', amount: 34.20 }
    ],
    category: 'Office Supplies',
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-14T14:35:00Z'
  },
  {
    id: 'f5b17d7a-807b-454b-bd98-5a472e51dc63',
    filename: 'utility_bill_003.jpg',
    original_filename: 'utility_bill_003.jpg',
    storage_path: '/uploads/receipts/dummy/receipt_003.jpg',
    uploader_id: 'admin-user-id',
    status: 'completed',
    ocr_raw_text: 'CITY ELECTRIC COMPANY\nAccount: 123456789\nTotal: $234.56\nDue: 2024-02-01',
    extracted_date: '2024-01-13',
    extracted_vendor: 'City Electric Company',
    extracted_total: 234.56,
    extracted_items: [
      { description: 'Electric Service - January', amount: 234.56 }
    ],
    category: 'Utilities',
    created_at: '2024-01-13T11:20:00Z',
    updated_at: '2024-01-13T11:25:00Z'
  },
  {
    id: '005a1e99-128a-4d94-939a-c5164b35816a',
    filename: 'catering_004.jpg',
    original_filename: 'catering_004.jpg',
    storage_path: '/uploads/receipts/dummy/receipt_004.jpg',
    uploader_id: 'admin-user-id',
    status: 'completed',
    ocr_raw_text: 'BLESSED CATERING\n789 Faith Street\nTotal: $456.78\nDate: 2024-01-12',
    extracted_date: '2024-01-12',
    extracted_vendor: 'Blessed Catering',
    extracted_total: 456.78,
    extracted_items: [
      { description: 'Sunday Fellowship Lunch', amount: 350.00 },
      { description: 'Beverages', amount: 65.00 },
      { description: 'Service charge', amount: 41.78 }
    ],
    category: 'Events',
    created_at: '2024-01-12T16:45:00Z',
    updated_at: '2024-01-12T16:50:00Z'
  },
  {
    id: 'd201b747-a472-4f91-809a-ffd159d8b6e5',
    filename: 'maintenance_005.jpg',
    original_filename: 'maintenance_005.jpg',
    storage_path: '/uploads/receipts/dummy/receipt_005.jpg',
    uploader_id: 'admin-user-id',
    status: 'completed',
    ocr_raw_text: 'FAITHFUL REPAIRS\n321 Service Road\nTotal: $189.00\nDate: 2024-01-11',
    extracted_date: '2024-01-11',
    extracted_vendor: 'Faithful Repairs',
    extracted_total: 189.00,
    extracted_items: [
      { description: 'HVAC Filter Replacement', amount: 45.00 },
      { description: 'Labor (2 hours)', amount: 120.00 },
      { description: 'Service call fee', amount: 24.00 }
    ],
    category: 'Maintenance',
    created_at: '2024-01-11T13:15:00Z',
    updated_at: '2024-01-11T13:20:00Z'
  }
];

// Analytics dummy data
const dummyAnalytics = {
  total_receipts: 25,
  total_amount: 2847.92,
  average_amount: 113.92,
  monthly_totals: [
    { month: '2023-12', total: 1245.67 },
    { month: '2024-01', total: 1602.25 }
  ],
  category_breakdown: [
    { category: 'Office Supplies', amount: 873.42, count: 8 },
    { category: 'Utilities', amount: 647.89, count: 5 },
    { category: 'Events', amount: 1026.78, count: 7 },
    { category: 'Maintenance', amount: 299.83, count: 5 }
  ],
  recent_activity: dummyReceipts.slice(0, 5).map(receipt => ({
    id: receipt.id,
    type: 'receipt_upload',
    description: `Receipt uploaded: ${receipt.extracted_vendor}`,
    amount: receipt.extracted_total,
    timestamp: receipt.created_at
  }))
};

// Utility function to simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class ApiClientError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

class DummyApiClient {
  private token: string | null = null;

  // Auth methods
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('token', token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  private getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private requireAuth(): void {
    if (!this.isAuthenticated()) {
      throw new ApiClientError({
        message: 'Authentication required',
        status: 401,
        code: 'UNAUTHORIZED'
      });
    }
  }

  // Auth endpoints
  public async post<T>(endpoint: string, data?: any): Promise<T> {
    await delay(300); // Simulate network delay

    switch (endpoint) {
      case '/auth/login':
        const loginData = data as LoginRequest;
        if (loginData.username === 'admin' && loginData.password === 'admin123') {
          const response: LoginResponse = {
            access_token: 'dummy-jwt-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
            user: dummyUser
          };
          this.setToken(response.access_token);
          return response as T;
        } else {
          throw new ApiClientError({
            message: 'Invalid credentials',
            status: 401,
            code: 'INVALID_CREDENTIALS'
          });
        }

      case '/receipts':
        this.requireAuth();
        // Simulate receipt upload
        const newReceipt: Receipt = {
          id: 'new-receipt-' + Date.now(),
          filename: data.get('file')?.name || 'uploaded_receipt.jpg',
          original_filename: data.get('file')?.name || 'uploaded_receipt.jpg',
          storage_path: '/uploads/receipts/dummy/new_receipt.jpg',
          uploader_id: dummyUser.id,
          status: 'processing',
          category: data.get('category') || 'Uncategorized',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        dummyReceipts.unshift(newReceipt);
        return newReceipt as T;

      default:
        throw new ApiClientError({
          message: 'Endpoint not implemented in demo',
          status: 404,
          code: 'NOT_IMPLEMENTED'
        });
    }
  }

  public async postForm<T>(endpoint: string, data: Record<string, string>): Promise<T> {
    return this.post<T>(endpoint, data);
  }

  public async get<T>(endpoint: string): Promise<T> {
    await delay(200); // Simulate network delay

    // Handle auth endpoints
    if (endpoint === '/auth/me') {
      this.requireAuth();
      return dummyUser as T;
    }

    // Handle receipt endpoints
    if (endpoint === '/receipts') {
      this.requireAuth();
      return dummyReceipts as T;
    }

    if (endpoint.startsWith('/receipts/') && endpoint.endsWith('/status')) {
      this.requireAuth();
      const receiptId = endpoint.split('/')[2];
      const receipt = dummyReceipts.find(r => r.id === receiptId);
      if (!receipt) {
        throw new ApiClientError({
          message: 'Receipt not found',
          status: 404,
          code: 'NOT_FOUND'
        });
      }
      const response: ReceiptStatusResponse = {
        id: receipt.id,
        status: receipt.status,
        ocr_completed: receipt.status === 'completed',
        extracted_data: {
          vendor: receipt.extracted_vendor,
          total: receipt.extracted_total,
          date: receipt.extracted_date,
          items: Array.isArray(receipt.extracted_items) ? receipt.extracted_items : 
                 (typeof receipt.extracted_items === 'string' ? JSON.parse(receipt.extracted_items) : [])
        }
      };
      return response as T;
    }

    if (endpoint.startsWith('/receipts/') && endpoint.endsWith('/image')) {
      this.requireAuth();
      const receiptId = endpoint.split('/')[2];
      const receipt = dummyReceipts.find(r => r.id === receiptId);
      if (!receipt) {
        throw new ApiClientError({
          message: 'Receipt not found',
          status: 404,
          code: 'NOT_FOUND'
        });
      }
      // Return a placeholder image URL that works like a blob URL
      const imageUrl = createDummyImageUrl(receiptId);
      // Simulate blob creation for the fetchImageWithAuth function
      return imageUrl as T;
    }

    // Handle analytics endpoints
    if (endpoint === '/analytics/dashboard') {
      this.requireAuth();
      return dummyAnalytics as T;
    }

    if (endpoint === '/analytics/monthly-summary') {
      this.requireAuth();
      return {
        current_month: {
          month: '2024-01',
          total_amount: 1602.25,
          receipt_count: 15,
          average_amount: 106.82
        },
        previous_month: {
          month: '2023-12',
          total_amount: 1245.67,
          receipt_count: 10,
          average_amount: 124.57
        },
        change_percentage: 28.6
      } as T;
    }

    // Handle reports endpoints
    if (endpoint === '/reports/monthly/list') {
      this.requireAuth();
      return [
        {
          month: '2024-01',
          total_receipts: 15,
          total_amount: 1602.25,
          status: 'generated',
          generated_at: '2024-02-01T00:00:00Z'
        },
        {
          month: '2023-12',
          total_receipts: 10,
          total_amount: 1245.67,
          status: 'generated',
          generated_at: '2024-01-01T00:00:00Z'
        }
      ] as T;
    }

    throw new ApiClientError({
      message: 'Endpoint not implemented in demo',
      status: 404,
      code: 'NOT_IMPLEMENTED'
    });
  }

  public async put<T>(endpoint: string, data?: any): Promise<T> {
    await delay(200);
    this.requireAuth();

    if (endpoint.startsWith('/receipts/')) {
      const receiptId = endpoint.split('/')[2];
      const receiptIndex = dummyReceipts.findIndex(r => r.id === receiptId);
      if (receiptIndex === -1) {
        throw new ApiClientError({
          message: 'Receipt not found',
          status: 404,
          code: 'NOT_FOUND'
        });
      }

      // Update the receipt
      const updateData = data as ReceiptUpdateData;
      dummyReceipts[receiptIndex] = {
        ...dummyReceipts[receiptIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return dummyReceipts[receiptIndex] as T;
    }

    throw new ApiClientError({
      message: 'Endpoint not implemented in demo',
      status: 404,
      code: 'NOT_IMPLEMENTED'
    });
  }

  public async delete<T>(endpoint: string): Promise<T> {
    await delay(200);
    this.requireAuth();

    if (endpoint.startsWith('/receipts/')) {
      const receiptId = endpoint.split('/')[2];
      const receiptIndex = dummyReceipts.findIndex(r => r.id === receiptId);
      if (receiptIndex === -1) {
        throw new ApiClientError({
          message: 'Receipt not found',
          status: 404,
          code: 'NOT_FOUND'
        });
      }

      dummyReceipts.splice(receiptIndex, 1);
      return { message: 'Receipt deleted successfully' } as T;
    }

    throw new ApiClientError({
      message: 'Endpoint not implemented in demo',
      status: 404,
      code: 'NOT_IMPLEMENTED'
    });
  }

  // Additional methods for reports (POST requests)
  public async generateReport(month: string): Promise<any> {
    await delay(1000); // Simulate longer processing time
    this.requireAuth();
    
    return {
      month,
      status: 'generated',
      download_url: `#report-${month}`,
      generated_at: new Date().toISOString()
    };
  }

  public async emailReport(month: string, email: string): Promise<any> {
    await delay(800);
    this.requireAuth();
    
    return {
      message: `Report for ${month} has been sent to ${email}`,
      status: 'sent'
    };
  }
}

// Create and export the dummy client instance
export const apiClient = new DummyApiClient();
export default apiClient;
