# Church Treasury Management System - Demo

🎭 **This is a fully functional demo of the Church Treasury Management System**

## Demo Access

- **Demo URL**: https://church-treasury-demo.netlify.app
- **Demo Credentials**: 
  - Email: `admin@church.org`
  - Password: `admin123`

## Demo Features

This demo showcases all the key features of the Church Treasury Management System:

### ✅ **Authentication System**
- Secure login with JWT tokens
- Role-based access control
- Admin dashboard access

### ✅ **Receipt Management**
- Upload receipt images
- Automatic OCR text extraction
- Manual data entry and editing
- Receipt status tracking
- Image viewing with zoom capabilities

### ✅ **Financial Analytics**
- Dashboard with spending overview
- Category breakdown charts
- Monthly spending trends
- Recent activity tracking

### ✅ **Reporting System**
- Monthly report generation
- PDF report downloads (simulated)
- Email report distribution (simulated)
- Financial summaries

### ✅ **Responsive Design**
- Mobile-friendly interface
- Tablet and desktop optimization
- Consistent maroon church theme
- Modern UI components

## Demo Data

The demo includes realistic sample data:
- **5 sample receipts** with realistic vendors and amounts
- **Multiple categories**: Kitchen Supplies, Office Supplies, Utilities, Events & Catering, Maintenance & Repairs
- **Receipt images**: High-quality placeholder images from Unsplash
- **Financial analytics**: Realistic spending data and trends
- **OCR data**: Realistic extracted text and parsed information

## Technical Implementation

### Demo Architecture
- **Frontend**: React + TypeScript + Tailwind CSS
- **State Management**: React Context + React Query
- **Routing**: React Router
- **Charts**: Recharts + Chart.js
- **Mock Backend**: Client-side API simulation
- **Deployment**: Netlify (static hosting)

### Demo Limitations
This is a frontend-only demo with simulated backend functionality:
- ❌ No real file uploads (simulated with placeholder images)
- ❌ No real PDF generation (download links are placeholders)
- ❌ No real email sending (shows success messages)
- ❌ Data resets on page refresh (no persistent storage)
- ❌ No real user registration (demo account only)

### Production Features (Not in Demo)
The full production system includes:
- **FastAPI backend** with PostgreSQL database
- **Real OCR processing** with Tesseract
- **Actual file storage** with secure image handling
- **PDF report generation** with detailed financial data
- **Email integration** for report distribution
- **Multi-user support** with different roles
- **Data persistence** with backup and recovery
- **Security features** including rate limiting and validation

## Local Development

To run this project locally:

```bash
# Clone the repository
git clone <repository-url>
cd church-treasury

# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Build demo version
npm run build:demo
```

## Full System Deployment

For production deployment with full backend functionality:

1. **Backend Setup**: Deploy FastAPI backend with PostgreSQL
2. **File Storage**: Configure secure file storage (AWS S3 or local)
3. **OCR Service**: Set up Tesseract OCR processing
4. **Email Service**: Configure SMTP for report distribution
5. **Authentication**: Set up proper JWT with refresh tokens
6. **Database**: Set up PostgreSQL with proper migrations
7. **Security**: Configure HTTPS, CORS, and rate limiting

## Support

For questions about the full system implementation or deployment:
- Review the full documentation in the repository
- Check the backend setup instructions
- Review the security checklist
- See the deployment guide for production setup

---

**Note**: This demo represents the complete UI/UX of the Church Treasury Management System with simulated backend functionality. The full production system includes a robust FastAPI backend with real data processing, file storage, and business logic.
