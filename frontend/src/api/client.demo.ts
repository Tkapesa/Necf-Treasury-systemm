/**
 * Demo API Client for Netlify Deployment
 * This replaces the real API client with static mock data
 * All network calls return immediate mock responses
 */

import { Receipt, ReceiptStatusResponse, ReceiptUpdateData } from '../types/receipts';
import { User, LoginRequest, LoginResponse } from '../types/auth';

// Demo receipt images using Unsplash for high-quality placeholders
const receiptImages = {
  '706581be-2b50-473f-8779-bea0171f5053': 'https://images.unsplash.com/photo-1566483829617-8f53dbea6396?w=400&h=600&fit=crop',
  'e9c80416-bc65-4591-ad82-85d141652aa9': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=600&fit=crop',
  'f5b17d7a-807b-454b-bd98-5a472e51dc63': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop',
  '005a1e99-128a-4d94-939a-c5164b35816a': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=600&fit=crop',
  'd201b747-a472-4f91-809a-ffd159d8b6e5': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=600&fit=crop'
};

// Mock data
const dummyUser: User = {
  id: 'demo-admin-id',
  username: 'admin',
  email: 'admin@church.org',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_login: new Date().toISOString()
};

const dummyReceipts: Receipt[] = [
  {
    id: '706581be-2b50-473f-8779-bea0171f5053',
    filename: 'church_grocery_supplies.jpg',
    original_filename: 'church_grocery_supplies.jpg',
    storage_path: '/demo/receipts/grocery.jpg',
    uploader_id: 'demo-admin-id',
    status: 'completed',
    ocr_raw_text: 'BLESSED GROCERY MART\n123 Faith Avenue\nTotal: $156.78\nDate: 2024-01-15\nThank you for shopping with us!',
    extracted_date: '2024-01-15',
    extracted_vendor: 'Blessed Grocery Mart',
    extracted_total: 156.78,
    extracted_items: [
      { description: 'Coffee (3 lbs)', amount: 24.99 },
      { description: 'Sugar (5 lbs)', amount: 8.50 },
      { description: 'Creamer', amount: 12.75 },
      { description: 'Paper cups (100)', amount: 15.99 },
      { description: 'Napkins (6 packs)', amount: 18.50 },
      { description: 'Cookies for fellowship', amount: 32.89 },
      { description: 'Juice boxes (24)', amount: 28.65 },
      { description: 'Fresh fruits', amount: 14.51 }
    ],
    category: 'Kitchen Supplies',
    created_at: '2024-01-15T09:15:00Z',
    updated_at: '2024-01-15T09:20:00Z'
  },
  {
    id: 'e9c80416-bc65-4591-ad82-85d141652aa9',
    filename: 'office_supplies_staples.jpg',
    original_filename: 'office_supplies_staples.jpg',
    storage_path: '/demo/receipts/office.jpg',
    uploader_id: 'demo-admin-id',
    status: 'completed',
    ocr_raw_text: 'STAPLES OFFICE SUPPLIES\n456 Business Blvd\nTotal: $234.67\nDate: 2024-01-14\nOffice Solutions for Churches',
    extracted_date: '2024-01-14',
    extracted_vendor: 'Staples Office Supplies',
    extracted_total: 234.67,
    extracted_items: [
      { description: 'Copy paper (10 reams)', amount: 89.90 },
      { description: 'Printer ink cartridges', amount: 67.99 },
      { description: 'Pens & pencils set', amount: 24.75 },
      { description: 'File folders (50)', amount: 19.99 },
      { description: 'Stapler & staples', amount: 15.89 },
      { description: 'Whiteboard markers', amount: 16.15 }
    ],
    category: 'Office Supplies',
    created_at: '2024-01-14T14:30:00Z',
    updated_at: '2024-01-14T14:35:00Z'
  },
  {
    id: 'f5b17d7a-807b-454b-bd98-5a472e51dc63',
    filename: 'electric_utility_bill.jpg',
    original_filename: 'electric_utility_bill.jpg',
    storage_path: '/demo/receipts/utility.jpg',
    uploader_id: 'demo-admin-id',
    status: 'completed',
    ocr_raw_text: 'METRO ELECTRIC COMPANY\nAccount: CHU123456789\nService Period: Dec 15 - Jan 15\nTotal Amount Due: $387.92\nDue Date: Feb 1, 2024',
    extracted_date: '2024-01-13',
    extracted_vendor: 'Metro Electric Company',
    extracted_total: 387.92,
    extracted_items: [
      { description: 'Electric Service - January', amount: 342.15 },
      { description: 'Environmental fee', amount: 12.50 },
      { description: 'Service charge', amount: 15.27 },
      { description: 'Late payment fee', amount: 18.00 }
    ],
    category: 'Utilities',
    created_at: '2024-01-13T11:20:00Z',
    updated_at: '2024-01-13T11:25:00Z'
  },
  {
    id: '005a1e99-128a-4d94-939a-c5164b35816a',
    filename: 'fellowship_catering.jpg',
    original_filename: 'fellowship_catering.jpg',
    storage_path: '/demo/receipts/catering.jpg',
    uploader_id: 'demo-admin-id',
    status: 'completed',
    ocr_raw_text: 'HEAVEN\'S KITCHEN CATERING\n789 Covenant Street\nEvent: Sunday Fellowship Lunch\nTotal: $567.45\nDate: 2024-01-12',
    extracted_date: '2024-01-12',
    extracted_vendor: "Heaven's Kitchen Catering",
    extracted_total: 567.45,
    extracted_items: [
      { description: 'Main course (100 servings)', amount: 389.99 },
      { description: 'Side dishes', amount: 89.50 },
      { description: 'Beverages & desserts', amount: 67.96 },
      { description: 'Service & setup', amount: 20.00 }
    ],
    category: 'Events & Catering',
    created_at: '2024-01-12T16:45:00Z',
    updated_at: '2024-01-12T16:50:00Z'
  },
  {
    id: 'd201b747-a472-4f91-809a-ffd159d8b6e5',
    filename: 'hvac_maintenance.jpg',
    original_filename: 'hvac_maintenance.jpg',
    storage_path: '/demo/receipts/maintenance.jpg',
    uploader_id: 'demo-admin-id',
    status: 'completed',
    ocr_raw_text: 'FAITHFUL HVAC SERVICES\n321 Service Road\nHVAC Maintenance & Repair\nTotal: $289.50\nDate: 2024-01-11',
    extracted_date: '2024-01-11',
    extracted_vendor: 'Faithful HVAC Services',
    extracted_total: 289.50,
    extracted_items: [
      { description: 'Filter replacement (6 units)', amount: 89.70 },
      { description: 'System cleaning', amount: 125.00 },
      { description: 'Labor (3 hours)', amount: 54.80 },
      { description: 'Service call fee', amount: 20.00 }
    ],
    category: 'Maintenance & Repairs',
    created_at: '2024-01-11T13:15:00Z',
    updated_at: '2024-01-11T13:20:00Z'
  }
];

// Analytics dummy data
const dummyAnalytics = {
  total_receipts: 47,
  total_amount: 4523.89,
  average_amount: 96.25,
  monthly_totals: [
    { month: '2023-11', total: 1156.78 },
    { month: '2023-12', total: 1834.66 },
    { month: '2024-01', total: 1532.45 }
  ],
  category_breakdown: [
    { category: 'Kitchen Supplies', amount: 967.43, count: 12 },
    { category: 'Office Supplies', amount: 742.89, count: 8 },
    { category: 'Utilities', amount: 1245.67, count: 6 },
    { category: 'Events & Catering', amount: 1289.34, count: 11 },
    { category: 'Maintenance & Repairs', amount: 278.56, count: 10 }
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

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeout?: number;
  skipContentType?: boolean;
}

class DemoApiClient {
  private token: string | null = null;

  constructor() {
    console.log('🎭 Church Treasury Demo - Mock API Client Initialized');
    console.log('📝 Demo credentials: admin@church.org / admin123');
  }

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

  // Main request methods matching the original API client interface
  public async post<T>(endpoint: string, data?: any, _options?: RequestOptions): Promise<T> {
    await delay(400); // Realistic delay

    switch (endpoint) {
      case '/auth/login':
        const loginData = data as LoginRequest;
        if ((loginData.username === 'admin' || loginData.username === 'admin@church.org') && 
            loginData.password === 'admin123') {
          const response: LoginResponse = {
            access_token: 'demo-jwt-token-' + Date.now(),
            token_type: 'bearer',
            expires_in: 3600,
            user: dummyUser
          };
          this.setToken(response.access_token);
          return response as T;
        } else {
          throw new ApiClientError({
            message: 'Invalid credentials. Use: admin@church.org / admin123',
            status: 401,
            code: 'INVALID_CREDENTIALS'
          });
        }

      case '/receipts':
        this.requireAuth();
        // Simulate receipt upload
        const newReceipt: Receipt = {
          id: 'demo-receipt-' + Date.now(),
          filename: data?.get?.('file')?.name || 'demo_receipt.jpg',
          original_filename: data?.get?.('file')?.name || 'demo_receipt.jpg',
          storage_path: '/demo/receipts/new_receipt.jpg',
          uploader_id: dummyUser.id,
          status: 'processing',
          category: data?.get?.('category') || 'Uncategorized',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Simulate processing delay
        setTimeout(() => {
          newReceipt.status = 'completed';
          newReceipt.extracted_vendor = 'Demo Vendor';
          newReceipt.extracted_total = Math.round((Math.random() * 200 + 10) * 100) / 100;
          newReceipt.extracted_date = new Date().toISOString().split('T')[0];
        }, 2000);
        
        dummyReceipts.unshift(newReceipt);
        return newReceipt as T;

      default:
        throw new ApiClientError({
          message: 'This is a demo - feature not implemented',
          status: 501,
          code: 'DEMO_LIMITATION'
        });
    }
  }

  public async postForm<T>(endpoint: string, data: Record<string, string>, _options?: RequestOptions): Promise<T> {
    return this.post<T>(endpoint, data, _options);
  }

  public async get<T>(endpoint: string, _options?: RequestOptions): Promise<T> {
    await delay(300);

    if (endpoint === '/auth/me') {
      this.requireAuth();
      return dummyUser as T;
    }

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
      const imageUrl = receiptImages[receiptId as keyof typeof receiptImages];
      if (!imageUrl) {
        throw new ApiClientError({
          message: 'Image not found',
          status: 404,
          code: 'NOT_FOUND'
        });
      }
      return imageUrl as T;
    }

    if (endpoint === '/analytics/dashboard') {
      this.requireAuth();
      return dummyAnalytics as T;
    }

    if (endpoint === '/analytics/monthly-summary') {
      this.requireAuth();
      return {
        current_month: {
          month: '2024-01',
          total_amount: 1532.45,
          receipt_count: 15,
          average_amount: 102.16
        },
        previous_month: {
          month: '2023-12',
          total_amount: 1834.66,
          receipt_count: 18,
          average_amount: 101.93
        },
        change_percentage: -16.5
      } as T;
    }

    if (endpoint === '/reports/monthly/list') {
      this.requireAuth();
      return [
        {
          month: '2024-01',
          total_receipts: 15,
          total_amount: 1532.45,
          status: 'generated',
          generated_at: '2024-02-01T00:00:00Z'
        },
        {
          month: '2023-12',
          total_receipts: 18,
          total_amount: 1834.66,
          status: 'generated',
          generated_at: '2024-01-01T00:00:00Z'
        },
        {
          month: '2023-11',
          total_receipts: 14,
          total_amount: 1156.78,
          status: 'generated',
          generated_at: '2023-12-01T00:00:00Z'
        }
      ] as T;
    }

    throw new ApiClientError({
      message: 'This is a demo - feature not implemented',
      status: 501,
      code: 'DEMO_LIMITATION'
    });
  }

  public async put<T>(endpoint: string, data?: any, _options?: RequestOptions): Promise<T> {
    await delay(250);
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

      const updateData = data as ReceiptUpdateData;
      dummyReceipts[receiptIndex] = {
        ...dummyReceipts[receiptIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return dummyReceipts[receiptIndex] as T;
    }

    throw new ApiClientError({
      message: 'This is a demo - feature not implemented',
      status: 501,
      code: 'DEMO_LIMITATION'
    });
  }

  public async patch<T>(endpoint: string, data?: any, _options?: RequestOptions): Promise<T> {
    return this.put<T>(endpoint, data, _options);
  }

  public async delete<T>(endpoint: string, _options?: RequestOptions): Promise<T> {
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
      message: 'This is a demo - feature not implemented',
      status: 501,
      code: 'DEMO_LIMITATION'
    });
  }

  // Additional demo-specific methods
  public async generateReport(month: string): Promise<any> {
    await delay(1500);
    this.requireAuth();
    
    return {
      month,
      status: 'generated',
      download_url: '#demo-report',
      message: `Demo report generated for ${month}`,
      generated_at: new Date().toISOString()
    };
  }

  public async emailReport(month: string, email: string): Promise<any> {
    await delay(1000);
    this.requireAuth();
    
    return {
      message: `Demo: Report for ${month} would be sent to ${email}`,
      status: 'sent'
    };
  }
}

// Global fetch interceptor for demo mode (handles image fetching)
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // Intercept image requests
  if (url.includes('/api/v1/receipts/') && url.includes('/image')) {
    const receiptId = url.split('/receipts/')[1]?.split('/image')[0];
    const imageUrl = receiptImages[receiptId as keyof typeof receiptImages];
    
    if (imageUrl) {
      // Fetch the actual Unsplash image
      return originalFetch(imageUrl);
    }
  }
  
  // For all other requests, use original fetch
  return originalFetch(input, init);
};

// Create and export the demo client instance
export const apiClient = new DemoApiClient();
export default apiClient;
