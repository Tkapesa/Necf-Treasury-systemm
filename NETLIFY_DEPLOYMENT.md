# Netlify Deployment Guide

## Church Treasury Management System - Demo Deployment

This guide walks you through deploying the Church Treasury Management System demo to Netlify.

### 📋 Prerequisites

- Git repository with the project
- Netlify account (free tier is sufficient)
- Node.js 18+ for local testing

### 🚀 Deployment Steps

#### Option 1: Netlify CLI (Recommended)

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

4. **Deploy to Netlify**
   ```bash
   netlify deploy --build --prod
   ```

   When prompted:
   - **Build command**: `npm run build:demo`
   - **Publish directory**: `dist`

#### Option 2: Netlify Web Interface

1. **Connect Repository**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Connect your Git provider (GitHub, GitLab, etc.)
   - Select your repository

2. **Configure Build Settings**
   - **Branch to deploy**: `main` (or your default branch)
   - **Base directory**: `frontend`
   - **Build command**: `npm run build:demo`
   - **Publish directory**: `dist`

3. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete (3-5 minutes)

#### Option 3: Manual Deploy

1. **Build locally**
   ```bash
   cd frontend
   npm run build:demo
   ```

2. **Upload to Netlify**
   - Go to https://app.netlify.com
   - Drag and drop the `dist` folder to the deploy area

### ⚙️ Configuration Files

The project includes pre-configured files for Netlify:

**netlify.toml** (in project root):
```toml
[build]
  base = "frontend"
  publish = "frontend/dist"
  command = "npm run build:demo"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 🎯 Demo Features

The deployed demo includes:

- ✅ **Full UI/UX** - Complete responsive interface
- ✅ **Mock Authentication** - Login with admin@church.org / admin123
- ✅ **Sample Data** - 5 realistic receipts with images
- ✅ **Interactive Charts** - Financial analytics and reporting
- ✅ **Image Viewing** - Receipt image modal with zoom
- ✅ **Responsive Design** - Works on mobile, tablet, desktop
- ✅ **Mock API** - Simulated backend functionality

### 🔧 Customization

#### Update Demo Credentials
Edit `frontend/src/api/client.demo.ts`:
```typescript
if ((loginData.username === 'your-email' || loginData.username === 'your-username') && 
    loginData.password === 'your-password') {
```

#### Add More Sample Data
Add receipts to the `dummyReceipts` array in `client.demo.ts`:
```typescript
const dummyReceipts: Receipt[] = [
  // Add new receipt objects here
];
```

#### Change Sample Images
Update the `receiptImages` object with your preferred Unsplash images:
```typescript
const receiptImages = {
  'receipt-id': 'https://images.unsplash.com/photo-xxx?w=400&h=600&fit=crop',
};
```

### 📊 Performance Optimization

The demo build is optimized with:
- **Code splitting** for faster loading
- **Compressed assets** (gzip)
- **Tree shaking** to remove unused code
- **CDN delivery** via Netlify's global network

### 🔍 Troubleshooting

#### Build Fails
- Check Node.js version: `node --version` (should be 18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

#### App Doesn't Load
- Check browser console for errors
- Verify the `netlify.toml` redirects are working
- Ensure all assets are properly linked

#### Demo Features Don't Work
- Check that `client.demo.ts` is being used (should see console log)
- Verify demo credentials: `admin@church.org` / `admin123`
- Check browser network tab for failed requests

### 📱 Testing the Demo

After deployment, test these features:

1. **Login** with demo credentials
2. **View receipts** in the admin dashboard
3. **Upload a receipt** (simulated)
4. **View receipt images** with zoom functionality
5. **Check analytics** charts and data
6. **Generate reports** (simulated)
7. **Test responsive design** on different screen sizes

### 🔄 Updates

To update the demo:

1. **Make changes** to your code
2. **Commit and push** to your repository
3. **Netlify auto-deploys** (if using Git integration)
4. **Or run** `netlify deploy --build --prod` for manual deploy

### 💡 Next Steps

After the demo is live:

1. **Share the URL** with stakeholders
2. **Gather feedback** on UI/UX
3. **Plan production deployment** with full backend
4. **Set up monitoring** for the production system

---

### Demo URL Example
Your demo will be available at: `https://your-site-name.netlify.app`

### Production Considerations
This is a demo-only version. For production:
- Deploy the FastAPI backend
- Set up PostgreSQL database
- Configure real authentication
- Implement file storage
- Set up email services
- Add monitoring and logging
