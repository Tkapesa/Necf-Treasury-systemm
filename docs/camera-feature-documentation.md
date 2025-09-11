# Camera Capture Feature Documentation

## Overview
The Church Treasury application now includes camera capture functionality, allowing users to take photos of receipts directly from their device's camera instead of just uploading files.

## Features Added

### 1. CameraCapture Component (`/frontend/src/components/CameraCapture.tsx`)
A standalone camera component that provides:
- **Camera Access**: Requests permission and accesses device cameras
- **Front/Back Camera Toggle**: Switch between front-facing and rear-facing cameras
- **Photo Capture**: Capture photos with a simple tap
- **Preview & Retake**: Preview captured images with option to retake
- **Error Handling**: Comprehensive error messages for different camera issues

#### Key Features:
- ✅ Auto-starts with back camera (ideal for document capture)
- ✅ Full-screen camera interface with intuitive controls
- ✅ High-quality image capture (up to 1920x1080)
- ✅ Mobile-optimized UI with touch-friendly buttons
- ✅ Proper cleanup of camera resources

### 2. Enhanced FileUpload Component
Updated the existing FileUpload component to optionally include camera functionality:
- **New Prop**: `showCamera={true}` to enable camera button
- **Dual Options**: Users can choose between "Choose File" or "Take Photo"
- **Seamless Integration**: Camera-captured images are processed the same as uploaded files

### 3. Updated Upload Pages
Enhanced two key pages with camera functionality:

#### Upload Receipt Page (`/pages/receipts/UploadReceipt.tsx`)
- Added camera capture button alongside file upload
- Integrated camera workflow with existing OCR processing
- Maintains all existing functionality while adding camera option

#### Receipt Upload Modal (`/components/ReceiptUploadModal.tsx`)
- Enabled camera functionality in the modal upload interface
- Perfect for quick receipt capture during events or meetings

## User Experience

### Desktop Users
- Can use camera if device has a webcam
- Primarily designed for file uploads
- Camera serves as secondary option

### Mobile Users
- **Primary Use Case**: Camera capture is the main method
- **One-handed Operation**: Large, easy-to-tap buttons
- **Auto-orientation**: Works in portrait or landscape
- **Touch Optimized**: Gesture-friendly interface

### Workflow
1. **Access**: Click "Take Photo" button on upload screens
2. **Permission**: Grant camera access when prompted
3. **Position**: Frame the receipt in the camera view
4. **Capture**: Tap the large white capture button
5. **Review**: Preview the captured image
6. **Options**: 
   - "Retake" to capture again
   - "Use Photo" to proceed with OCR processing

## Technical Implementation

### Camera Constraints
```javascript
{
  video: {
    facingMode: 'environment', // Rear camera by default
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false, // No audio needed
}
```

### File Output
- **Format**: JPEG with 80% quality
- **Naming**: `receipt-{timestamp}.jpg`
- **Size**: Optimized for web upload and OCR processing

### Error Handling
Comprehensive error messages for:
- **NotAllowedError**: Permission denied
- **NotFoundError**: No camera available
- **NotReadableError**: Camera in use by another app
- **OverconstrainedError**: Unsupported camera configuration

### Browser Compatibility
- **Modern Browsers**: Full support in Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: Optimized for iOS Safari and Chrome on Android
- **HTTPS Required**: Camera access requires secure context
- **Fallback**: Graceful degradation to file upload only

## Security & Privacy

### Permissions
- **Just-in-Time**: Camera access requested only when needed
- **Scope Limited**: Only camera access, no microphone
- **User Control**: Easy to deny or revoke permissions

### Data Handling
- **No Storage**: Images are not stored in browser
- **Direct Upload**: Photos go directly to processing pipeline
- **Same Security**: Uses existing authentication and upload security

### Privacy
- **No Recording**: Only captures single images
- **Local Processing**: Image capture happens locally
- **User Initiated**: All captures require explicit user action

## Mobile Optimization

### Responsive Design
- **Full Screen**: Camera uses entire viewport on mobile
- **Large Targets**: Touch targets meet accessibility guidelines
- **Clear Icons**: Intuitive camera and switch icons
- **Status Indicators**: Clear feedback on camera state

### Performance
- **Fast Startup**: Quick camera initialization
- **Low Memory**: Efficient resource management
- **Battery Friendly**: Camera shuts down when not needed

## Usage Examples

### Basic Implementation
```tsx
import CameraCapture from './components/CameraCapture';

const [isCameraOpen, setIsCameraOpen] = useState(false);

const handleCapture = (file: File) => {
  // Process the captured file
  console.log('Captured:', file.name);
  setIsCameraOpen(false);
};

return (
  <>
    <button onClick={() => setIsCameraOpen(true)}>
      Take Photo
    </button>
    
    <CameraCapture
      isOpen={isCameraOpen}
      onCapture={handleCapture}
      onClose={() => setIsCameraOpen(false)}
    />
  </>
);
```

### With FileUpload Component
```tsx
<FileUpload
  onUpload={handleUpload}
  showCamera={true} // Enables camera button
  accept=".jpg,.jpeg,.png,.pdf"
  maxSize={10 * 1024 * 1024}
/>
```

## Benefits for Church Treasury

### Convenience
- **Quick Capture**: Instant receipt photography during events
- **No File Management**: Skip saving files to device first
- **One-Click Processing**: Direct capture to OCR pipeline

### Accuracy
- **Better Quality**: Camera optimized for document capture
- **Immediate Feedback**: See exactly what will be processed
- **Retake Option**: Ensure perfect capture before processing

### Accessibility
- **Mobile First**: Perfect for phones and tablets
- **Touch Friendly**: Large, easy-to-use controls
- **Visual Feedback**: Clear status indicators

### Efficiency
- **Faster Workflow**: Eliminate file upload steps
- **Real-time Processing**: Immediate transition to OCR
- **Batch Friendly**: Quickly capture multiple receipts

## Future Enhancements

### Planned Features
- **Auto-crop**: Automatic receipt edge detection
- **Flash Control**: Toggle device flash for low-light conditions
- **Multi-capture**: Capture multiple images in sequence
- **Quality Settings**: User-selectable image quality

### Advanced Features
- **Document Detection**: Automatic receipt boundary detection
- **Perspective Correction**: Auto-straighten skewed documents
- **Batch Upload**: Capture multiple receipts before processing
- **Offline Support**: Queue captures when network unavailable

## Testing

### Test Scenarios
1. **Permission Grant/Deny**: Test both permission states
2. **Camera Switch**: Verify front/back camera toggle
3. **Capture Quality**: Test image quality and file size
4. **Error States**: Test with no camera, camera in use, etc.
5. **Mobile Devices**: Test on various phones and tablets

### Browser Testing
- ✅ Chrome (desktop & mobile)
- ✅ Safari (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Edge (desktop)

## Support

### User Issues
- **Camera Permission**: Guide users through browser settings
- **Camera Not Working**: Troubleshoot hardware/software issues
- **Quality Issues**: Advise on lighting and positioning

### Technical Support
- **HTTPS Required**: Ensure secure context for camera access
- **Browser Compatibility**: Guide users to supported browsers
- **Mobile Optimization**: Help with mobile browser settings
