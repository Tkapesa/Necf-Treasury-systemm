# Frontend Authentication System Documentation

## 🏗️ **Architecture Overview**

This authentication system provides a secure, modern frontend authentication solution for the Church Treasury Management System with the following components:

### **Core Components**

1. **API Client** (`/src/api/client.ts`)
   - Centralized HTTP client with fetch API
   - JWT token injection and management
   - Comprehensive error handling
   - Request/response interceptors
   - Timeout and abort controller support

2. **Authentication Context** (`/src/context/AuthContext.tsx`)
   - Global authentication state management
   - Login/logout functionality
   - User session persistence
   - Role-based access hooks

3. **Login Component** (`/src/pages/Auth/Login.tsx`)
   - Modern Tailwind UI design
   - Form validation (without external dependencies)
   - Loading and error states
   - Accessibility compliant

4. **Private Route Guard** (`/src/components/PrivateRoute.tsx`)
   - Route-based authentication protection
   - Role-based access control
   - Graceful redirect handling

5. **Comprehensive Testing** (`/src/tests/`)
   - Unit tests for all components
   - Vitest + React Testing Library
   - Mock implementations
   - Coverage for edge cases

## 🔐 **Security Features**

### **Production Security Notes**
The current implementation includes detailed comments about production security best practices:

```typescript
/**
 * SECURITY NOTE: In production, JWT tokens should be stored in HttpOnly cookies
 * and managed by the backend to prevent XSS attacks. This implementation uses
 * localStorage for development purposes but includes comments about proper security.
 */
```

### **Key Security Considerations**

1. **Token Storage**: 
   - Development: localStorage (for simplicity)
   - Production: HttpOnly cookies (recommended)

2. **XSS Protection**:
   - HttpOnly cookies prevent JavaScript access
   - CSRF tokens for state-changing operations

3. **Token Refresh**:
   - Sliding expiration via backend
   - Automatic token rotation

4. **Error Handling**:
   - No sensitive information in error messages
   - Secure failure modes

## 🎨 **UI/UX Features**

### **Modern Design**
- Tailwind UI components
- Responsive design
- Clean, professional appearance
- Loading animations and states

### **Accessibility**
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### **User Experience**
- Form validation with real-time feedback
- Password visibility toggle
- Loading states during API calls
- Clear error messaging

## 🧪 **Testing Strategy**

### **Test Coverage**
- Component rendering and interaction
- Form validation logic
- Authentication state management
- API error handling
- Accessibility compliance

### **Testing Tools**
- **Vitest**: Fast test runner
- **React Testing Library**: Component testing
- **Jest DOM**: DOM assertions
- **User Event**: User interaction simulation

## 📁 **File Structure**

```
frontend/src/
├── api/
│   └── client.ts                 # HTTP client with token management
├── context/
│   └── AuthContext.tsx          # Authentication state provider
├── pages/Auth/
│   └── Login.tsx                # Login form component
├── components/
│   └── PrivateRoute.tsx         # Route protection component
└── tests/
    ├── setup.ts                 # Test configuration
    ├── Login.test.tsx           # Login component tests
    └── AuthContext.test.tsx     # Auth context tests
```

## 🚀 **Usage Examples**

### **Basic Authentication**
```tsx
import { AuthProvider, useAuth } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function LoginPage() {
  const { login, isLoading, error } = useAuth();
  
  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // Redirect handled automatically
    } catch (error) {
      // Error displayed via context
    }
  };
}
```

### **Route Protection**
```tsx
import PrivateRoute from './components/PrivateRoute';

<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route element={<PrivateRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
  </Route>
  
  <Route element={<PrivateRoute roles={['admin']} />}>
    <Route path="/admin" element={<AdminPanel />} />
  </Route>
</Routes>
```

### **Role-Based Access**
```tsx
import { useAuth, useRole } from './context/AuthContext';

function AdminButton() {
  const isAdmin = useRole('admin');
  const { user } = useAuth();
  
  if (!isAdmin) return null;
  
  return <button>Admin Action</button>;
}
```

## 🔧 **API Integration**

### **Backend Compatibility**
The system is designed to work with the FastAPI backend:

- **Login Endpoint**: `POST /auth/login` (OAuth2PasswordRequestForm)
- **User Profile**: `GET /auth/me`
- **Logout**: `POST /auth/logout`

### **Request Format**
```typescript
// Login uses form data for OAuth2 compatibility
const formData = new URLSearchParams();
formData.append('username', username);
formData.append('password', password);

// API calls use Bearer token authorization
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 🧪 **Running Tests**

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 📦 **Dependencies**

### **Runtime Dependencies**
- `react` - UI framework
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching (optional)

### **Development Dependencies**
- `vitest` - Test runner
- `@testing-library/react` - Component testing
- `@testing-library/user-event` - User interaction testing
- `@testing-library/jest-dom` - DOM assertions

### **Styling**
- `tailwindcss` - Utility-first CSS framework
- Modern, responsive design components

## 🎯 **Production Deployment**

### **Environment Variables**
```env
VITE_API_URL=https://api.churchtreasury.com/api/v1
```

### **Build Configuration**
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### **Security Checklist**
- [ ] Configure HttpOnly cookies in backend
- [ ] Implement CSRF protection
- [ ] Set up proper CORS policies
- [ ] Enable HTTPS in production
- [ ] Configure secure cookie attributes
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging

## 🔄 **Future Enhancements**

1. **Multi-Factor Authentication**
   - TOTP integration
   - SMS verification
   - Email confirmation

2. **Session Management**
   - Multiple device sessions
   - Session invalidation
   - Activity monitoring

3. **Social Authentication**
   - Google OAuth
   - Microsoft OAuth
   - Church management system SSO

4. **Advanced Security**
   - Biometric authentication
   - Device fingerprinting
   - Anomaly detection

This authentication system provides a solid foundation for secure church treasury management with modern best practices and comprehensive testing coverage.
