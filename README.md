# Assured Contract Farming for Stable Market

A full-stack web application that connects landowners, farmers, and buyers in the agricultural sector for contract farming opportunities.

## Features

### 🔐 Authentication System
- User registration and login
- Role-based access control (Landowner, Farmer/Company, Buyer)
- JWT token-based authentication

### 🏠 Landowner Dashboard
- Land details management (size, location, soil type, climate)
- Available crops for lease
- Contract papers and land images upload
- View interested farmers
- Manage farmer interest status

### 👨‍🌾 Farmer Dashboard
- Farm and company information
- Crop details and availability
- Resource availability tracking
- Browse available lands
- View interested buyers
- Upload contract documents

### 🛒 Buyer Dashboard
- Crop requirements specification
- Preferred area and price range
- Browse available farmers
- Upload requirement documents
- Manage farmer interest status

### 📄 Contract & File Management
- Document upload system (PDF, DOC, Images)
- File storage and retrieval
- Cross-stakeholder visibility

### 🔍 Mutual Visibility
- Farmers can see available lands and interested buyers
- Buyers can see available farmers and crops
- Landowners can see interested farmers

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Express Validator** for input validation

### Frontend
- **React.js** with modern hooks
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls

## Project Structure

```
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── uploads/         # File uploads
│   └── server.js        # Main server file
├── frontend/            # React application
├── package.json         # Backend dependencies
└── README.md           # This file
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/contract-farming
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

3. **Start MongoDB:**
   ```bash
   # Local MongoDB
   mongod
   
   # Or use MongoDB Atlas cloud service
   ```

4. **Run the server:**
   ```bash
   npm run server
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

### Full Stack Development

To run both backend and frontend simultaneously:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/change-password` - Change password

### Landowners
- `GET /api/landowners/profile` - Get profile
- `PUT /api/landowners/profile` - Update profile
- `POST /api/landowners/upload-contracts` - Upload contracts
- `POST /api/landowners/upload-images` - Upload land images
- `GET /api/landowners/interested-farmers` - Get interested farmers
- `PUT /api/landowners/farmer-interest/:id` - Update farmer interest status

### Farmers
- `GET /api/farmers/profile` - Get profile
- `PUT /api/farmers/profile` - Update profile
- `POST /api/farmers/upload-contracts` - Upload contracts
- `POST /api/farmers/interest-in-land/:id` - Show interest in land
- `GET /api/farmers/available-lands` - Browse available lands
- `GET /api/farmers/interested-buyers` - Get interested buyers

### Buyers
- `GET /api/buyers/profile` - Get profile
- `PUT /api/buyers/profile` - Update profile
- `POST /api/buyers/upload-docs` - Upload requirement documents
- `POST /api/buyers/interest-in-farmer/:id` - Show interest in farmer
- `GET /api/buyers/available-farmers` - Browse available farmers

### Contracts
- `GET /api/contracts/overview` - Get contract overview
- `GET /api/contracts/stakeholders/:role` - Get stakeholders
- `GET /api/contracts/stats` - Get contract statistics
- `GET /api/contracts/search` - Search stakeholders
- `GET /api/contracts/recent-activities` - Get recent activities

## Database Models

### User
- Email, password, role, active status

### Landowner
- Personal info, land details, available crops, documents, images

### Farmer
- Personal/company info, farm details, crops, resources, documents

### Buyer
- Personal/company info, crop requirements, preferences, documents

## File Upload Support

- **Images:** JPEG, JPG, PNG, GIF
- **Documents:** PDF, DOC, DOCX
- **Size Limit:** 10MB per file
- **Storage:** Local file system (configurable for cloud storage)

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- File type validation

## Development Notes

- The application uses local file storage for uploads
- MongoDB connection is configured for local development
- JWT secret should be changed in production
- File upload directories are created automatically

## Production Considerations

- Use environment variables for sensitive data
- Implement cloud storage (AWS S3, Google Cloud Storage)
- Add rate limiting and security headers
- Use HTTPS in production
- Implement proper error logging
- Add monitoring and health checks

## License

MIT License - see LICENSE file for details
