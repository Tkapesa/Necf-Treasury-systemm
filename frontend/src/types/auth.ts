export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'treasurer' | 'pastor' | 'auditor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;  // Can be username or email
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: 'pastor' | 'auditor';
}
