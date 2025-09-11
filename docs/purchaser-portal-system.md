# Purchaser Portal System Documentation

## Overview
The Church Treasury system now includes a dedicated **Purchaser Portal** designed specifically for church members who make purchases on behalf of the church. This addresses the separation of concerns between administrative functions and receipt submission.

## The Problem Solved
Previously, the camera functionality was only available in the admin dashboard, which meant:
- Church members needed admin access to submit receipts
- No clear separation between admin functions and purchase submissions
- Difficult to track who made purchases and who approved them

## The Solution: Dual Portal System

### 1. **Purchaser Portal** (`/purchaser`)
**Target Users**: Church members who buy items for the church
**Access**: No authentication required (public access)
**Purpose**: Submit receipts after making approved purchases

#### Features:
- ✅ **No Login Required**: Easy access for all church members
- ✅ **Camera Capture**: Mobile-optimized receipt photography
- ✅ **Purchase Context**: Capture who bought what, for what purpose
- ✅ **Approval Tracking**: Record who approved the purchase
- ✅ **Step-by-Step Workflow**: Guided process from info to submission

#### Workflow:
1. **Purchase Information**: Enter purchaser details, event/purpose, approver
2. **Receipt Capture**: Take photo or upload file
3. **Review**: Verify information before submission
4. **Submit**: Send to admin for processing

### 2. **Admin Dashboard** (`/dashboard`, `/admin`)
**Target Users**: Pastors, treasurers, administrators
**Access**: Authentication required
**Purpose**: Review submissions, manage treasury, generate reports

#### Features:
- ✅ **Review Portal Submissions**: See receipts from purchaser portal
- ✅ **Admin Camera Access**: Upload receipts directly as admin
- ✅ **Full Treasury Management**: Complete financial oversight
- ✅ **Reports & Analytics**: Financial reporting and insights

## User Roles & Access

### Public Access (No Login)
- **Landing Page** (`/`): Choose between portals
- **Purchaser Portal** (`/purchaser`): Submit receipts
- **Login Page** (`/login`): Access admin functions

### Authenticated Access (Login Required)
- **Dashboard** (`/dashboard`): Role-based dashboard
- **Admin Panel** (`/admin`): Administrative functions
- **Reports** (`/reports`): Financial reports
- **Receipt Upload** (`/receipts/upload`): Admin receipt upload

## Technical Implementation

### Frontend Structure
```
├── pages/
│   ├── LandingPage.tsx           # Public landing page
│   ├── PurchaserPortal.tsx       # No-auth receipt submission
│   └── receipts/
│       └── UploadReceipt.tsx     # Admin receipt upload
├── components/
│   ├── CameraCapture.tsx         # Shared camera component
│   └── FileUpload.tsx            # Enhanced with camera option
```

### Backend API
```
POST /api/v1/receipts/purchaser-submit
- No authentication required
- Stores purchaser information in receipt metadata
- Marks receipts with category "purchaser_portal"
- Background OCR processing
```

### Data Model Changes
```sql
-- Receipt model updated to allow null uploader_id
uploader_id: Optional[str] = Field(
    default=None,  -- Allows purchaser portal submissions
    foreign_key="users.id"
)

-- Purchaser info stored in extracted_items as JSON
extracted_items: {
    "purchaser_name": "John Doe",
    "purchaser_email": "john@example.com", 
    "event_or_purpose": "Youth Event",
    "approved_by": "Pastor Smith",
    "notes": "Food for retreat"
}
```

## User Experience Design

### For Church Members (Purchasers)
1. **Easy Discovery**: Clear landing page directing to purchaser portal
2. **Mobile-First**: Optimized for smartphone use after shopping
3. **No Barriers**: No account creation or login required
4. **Context Capture**: Ensures all relevant purchase information is recorded
5. **Immediate Feedback**: Clear confirmation of successful submission

### For Church Administrators
1. **Clear Separation**: Admin functions separate from public submissions
2. **Enhanced Review**: Can see purchaser context for all portal submissions
3. **Maintained Control**: Full oversight of all financial processes
4. **Audit Trail**: Complete tracking of who purchased what and who approved it

## Security Considerations

### Purchaser Portal Security
- **Public Access**: Designed to be publicly accessible
- **Rate Limiting**: Should implement rate limiting to prevent abuse
- **File Validation**: Same strict file validation as admin uploads
- **No Sensitive Data**: No access to existing treasury data

### Admin Security
- **Authentication Required**: All admin functions protected
- **Role-Based Access**: Different access levels for different roles
- **Audit Logging**: All actions logged for accountability

## Deployment & Usage

### URL Structure
- **Main Site**: `https://treasury.church.org/`
- **Purchaser Portal**: `https://treasury.church.org/purchaser`
- **Admin Login**: `https://treasury.church.org/login`

### Mobile Usage
The purchaser portal is specifically designed for mobile use:
- **Responsive Design**: Works perfectly on phones and tablets
- **Camera Optimized**: Full-screen camera interface
- **Touch Friendly**: Large buttons and intuitive gestures
- **Fast Loading**: Minimal dependencies for quick access

### Church Communication
Recommend sharing the purchaser portal link in:
- **Church bulletins**: Include QR code to `/purchaser`
- **Event planning**: Provide link to event coordinators
- **Ministry leaders**: Share with those who make purchases
- **Church app**: Add as a quick action button

## Benefits

### For Church Members
- ✅ **No Login Hassle**: Submit receipts immediately after purchase
- ✅ **Mobile Convenience**: Use phone camera for instant capture
- ✅ **Clear Process**: Step-by-step guidance through submission
- ✅ **Immediate Confirmation**: Know receipt was submitted successfully

### For Church Administration
- ✅ **Better Context**: See who bought what and why
- ✅ **Approval Tracking**: Know who authorized each purchase
- ✅ **Reduced Admin Burden**: Fewer questions about submissions
- ✅ **Complete Audit Trail**: Full purchase and approval history

### For Church Finance
- ✅ **Faster Processing**: Less manual data entry
- ✅ **Better Records**: More complete purchase information
- ✅ **Improved Compliance**: Clear approval documentation
- ✅ **Enhanced Reporting**: More detailed expense tracking

## Best Practices

### For Purchasers
1. **Get Approval First**: Always get approval before purchasing
2. **Submit Quickly**: Submit receipts immediately after purchase
3. **Include Context**: Provide clear event/purpose information
4. **Check Information**: Review details before submitting

### For Administrators
1. **Regular Review**: Check portal submissions regularly
2. **Verify Approvals**: Confirm approval information with approvers
3. **Provide Feedback**: Let purchasers know about processing status
4. **Update Procedures**: Keep purchase approval processes clear

### For the Church
1. **Communicate Process**: Ensure everyone knows about the portal
2. **Train Key People**: Train ministry leaders on the system
3. **Set Clear Policies**: Define what purchases need approval
4. **Regular Review**: Evaluate and improve the process over time

## Future Enhancements

### Planned Features
- **Email Notifications**: Notify admins of new submissions
- **Status Tracking**: Let purchasers check submission status
- **Batch Processing**: Handle multiple receipts in one session
- **Approval Workflow**: Direct approval routing to designated approvers

### Advanced Features
- **Purchase Requests**: Submit purchase requests before buying
- **Budget Integration**: Check against ministry budgets
- **Automatic Categorization**: AI-powered expense categorization
- **Mobile App**: Dedicated mobile application for purchasers

This purchaser portal system creates a clear separation between operational purchase submissions and administrative treasury management, making the system more user-friendly while maintaining proper financial controls.
