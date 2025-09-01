# Crop Progress Updates Feature

## Overview

The Crop Progress Updates feature allows farmers to track and update the progress of their farming activities for each accepted contract, while buyers can monitor the real-time progress of their contracted farmers.

## Features Implemented

### 1. Farmer Dashboard - Crop Progress Updates Section

**Location**: `frontend/src/components/dashboards/FarmerDashboard.js` - New "Crop Progress" tab

**Features**:
- View all active contracts with buyers
- Update progress for each farming stage
- Add detailed notes for each stage
- Upload files (images, documents) for each stage
- Real-time progress tracking
- Visual progress indicators

**Progress Stages**:
1. Contract signed with Buyer
2. Seeds purchased
3. Seeds planted in the field
4. Crop growth update (percentage grown / description)
5. Fertilizer requirement update (type & quantity needed)
6. Crop ready for harvesting
7. Crop ready for delivery

### 2. Buyer Dashboard - Progress Tracking Section

**Location**: `frontend/src/components/dashboards/BuyerDashboard.js` - New "Progress Tracking" tab

**Features**:
- View all contracts with farmers
- Real-time progress monitoring
- Timeline view of farming stages
- Access to farmer's notes and uploaded files
- Progress percentage visualization
- Contract status tracking

### 3. Real-Time Updates

**Technology**: Socket.IO
- Instant updates when farmers modify progress
- Real-time file upload notifications
- Live progress percentage updates
- Automatic contract status changes

### 4. File Management

**Supported File Types**:
- Images: JPG, JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX

**Features**:
- Multiple file uploads per stage
- File preview and download
- File deletion (farmers only)
- Organized file management

## Technical Implementation

### Backend Components

#### 1. Contract Model
**File**: `backend/models/Contract.js`

```javascript
const contractSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
  cropName: String,
  quantity: Number,
  unit: String,
  price: Number,
  priceUnit: String,
  expectedDeliveryDate: Date,
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'] },
  progressUpdates: [progressUpdateSchema],
  contractDocuments: [fileSchema]
});
```

#### 2. Progress Updates Schema
```javascript
const progressUpdateSchema = new mongoose.Schema({
  step: { type: Number, required: true, min: 1, max: 7 },
  title: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  notes: String,
  files: [fileSchema],
  updatedAt: { type: Date, default: Date.now }
});
```

#### 3. Progress Routes
**File**: `backend/routes/progress.js`

**Endpoints**:
- `GET /api/progress/contracts` - Get all contracts for user
- `GET /api/progress/contracts/:contractId` - Get specific contract with progress
- `PUT /api/progress/contracts/:contractId/progress/:step` - Update progress stage
- `POST /api/progress/contracts/:contractId/progress/:step/files` - Upload files
- `DELETE /api/progress/contracts/:contractId/progress/:step/files/:filename` - Delete file
- `POST /api/progress/contracts` - Create new contract
- `GET /api/progress/contracts/:contractId/stats` - Get progress statistics

### Frontend Components

#### 1. Progress Updates Component
**File**: `frontend/src/components/dashboards/ProgressUpdates.js`

**Features**:
- Expandable stage cards
- Inline editing for farmers
- File upload interface
- Real-time socket connections
- Progress visualization

#### 2. Create Contract Modal
**File**: `frontend/src/components/common/CreateContractModal.js`

**Features**:
- Contract creation form
- Validation
- Real-time summary
- Error handling

### Socket.IO Integration

#### 1. Real-Time Events
- `progress:update` - When progress stage is updated
- `progress:files:update` - When files are uploaded/deleted
- `join` - Join contract room for updates
- `leave` - Leave contract room

#### 2. Socket Configuration
**File**: `backend/socket.js`
- Room-based updates for contract-specific notifications
- Real-time progress broadcasting
- File update notifications

## Database Schema

### Contracts Collection
```javascript
{
  _id: ObjectId,
  farmerId: ObjectId (ref: 'Farmer'),
  buyerId: ObjectId (ref: 'Buyer'),
  cropName: String,
  quantity: Number,
  unit: String,
  price: Number,
  priceUnit: String,
  contractDate: Date,
  expectedDeliveryDate: Date,
  status: String,
  progressUpdates: [
    {
      step: Number,
      title: String,
      status: String,
      notes: String,
      files: [
        {
          filename: String,
          originalName: String,
          path: String,
          uploadedAt: Date
        }
      ],
      updatedAt: Date
    }
  ],
  contractDocuments: [fileSchema],
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Contract Management
```http
GET /api/progress/contracts
GET /api/progress/contracts/:contractId
POST /api/progress/contracts
```

### Progress Updates
```http
PUT /api/progress/contracts/:contractId/progress/:step
POST /api/progress/contracts/:contractId/progress/:step/files
DELETE /api/progress/contracts/:contractId/progress/:step/files/:filename
```

### Statistics
```http
GET /api/progress/contracts/:contractId/stats
```

## File Upload Configuration

### Multer Configuration
- **Storage**: Local disk storage
- **Destination**: `backend/uploads/progress/`
- **File Size Limit**: 10MB per file
- **Allowed Types**: Images (jpg, jpeg, png, gif, webp) and Documents (pdf, doc, docx)

### File Structure
```
backend/uploads/progress/
├── files-{timestamp}-{random}.jpg
├── files-{timestamp}-{random}.pdf
└── ...
```

## Security Features

### Authorization
- Only farmers can update progress stages
- Only farmers can upload/delete files
- Contract access restricted to involved parties
- JWT token validation for all requests

### File Security
- File type validation
- File size limits
- Secure file naming
- Access control for file downloads

## UI/UX Features

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts
- Touch-friendly interactions

### Visual Indicators
- Progress bars
- Status badges
- Color-coded stages
- Loading states

### User Experience
- Intuitive navigation
- Real-time feedback
- Error handling
- Success notifications

## Usage Instructions

### For Farmers

1. **Access Progress Updates**:
   - Navigate to Farmer Dashboard
   - Click on "Crop Progress" tab
   - View all active contracts

2. **Update Progress**:
   - Click on a contract to view details
   - Expand any stage by clicking on it
   - Click "Edit" to modify status and notes
   - Save changes

3. **Upload Files**:
   - In the expanded stage view
   - Use the file upload input
   - Select multiple files
   - Files will be uploaded automatically

### For Buyers

1. **Access Progress Tracking**:
   - Navigate to Buyer Dashboard
   - Click on "Progress Tracking" tab
   - View all contracts with farmers

2. **Monitor Progress**:
   - Click on a contract to view detailed progress
   - View real-time updates
   - Access farmer's notes and files
   - Track overall progress percentage

## Error Handling

### Common Errors
- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Contract or stage not found
- **413 Payload Too Large**: File size exceeds limit
- **415 Unsupported Media Type**: Invalid file type

### Error Recovery
- Automatic retry for network errors
- User-friendly error messages
- Graceful degradation
- Data validation feedback

## Performance Considerations

### Optimization
- Lazy loading of contract details
- Efficient file uploads
- Optimized database queries
- Cached progress calculations

### Scalability
- Room-based socket connections
- Efficient file storage
- Database indexing
- API rate limiting

## Future Enhancements

### Planned Features
- Email notifications for progress updates
- SMS alerts for critical stages
- Advanced analytics and reporting
- Mobile app integration
- Blockchain integration for transparency

### Technical Improvements
- Cloud file storage (AWS S3, Google Cloud)
- Advanced caching strategies
- Microservices architecture
- API versioning

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**:
   - Check server status
   - Verify port configuration
   - Check firewall settings

2. **File Upload Fails**:
   - Verify file size and type
   - Check upload directory permissions
   - Ensure sufficient disk space

3. **Progress Not Updating**:
   - Refresh the page
   - Check network connection
   - Verify socket connection

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in environment variables.

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.

