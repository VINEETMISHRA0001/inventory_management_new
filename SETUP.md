# Setup Instructions

## Environment Variables

Create a `.env.local` file in the root directory with the following:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key_change_in_production
```

## Initial Admin Setup

**Important:** The system uses the `users` collection/table in MongoDB to store and verify admin users.

Only one admin user can exist in the database. To create the initial admin user:

1. Start the development server:
```bash
npm run dev
```

2. Make a POST request to `/api/auth/init-admin` with:
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

### PowerShell (Windows)

Use the PowerShell script:
```powershell
.\scripts\reset-admin-password.ps1
```

Or use Invoke-RestMethod:
```powershell
$body = @{
    email = "admin@example.com"
    newPassword = "your_new_password"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/reset-admin-password" -Method POST -Body $body -ContentType "application/json"
```

### Bash/Linux/Mac

Use curl:
```bash
curl -X POST http://localhost:3000/api/auth/reset-admin-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","newPassword":"your_new_password"}'
```

### Check Existing Admin

To check if an admin already exists:
```bash
node scripts/check-admin.js
```

**Note:** Passwords are hashed using bcrypt and cannot be retrieved. If you forgot the password:
- Use the forgot password feature at `/api/auth/forgot-password`
- Or delete the admin from the `users` collection and create a new one

## Features Implemented

### Authentication
- ✅ Secure login with email/password
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Forgot password functionality
- ✅ Reset password functionality
- ✅ Single admin user restriction
- ✅ Auth type display (Email-Password or Google)

### Products Management
- ✅ Products table with pagination (50 items per page)
- ✅ Search functionality (by name, SKU, brand, category)
- ✅ Redux state management
- ✅ Real-time product data from MongoDB
- ✅ Low stock indicators
- ✅ Product status badges

### Dashboard
- ✅ Protected routes with authentication
- ✅ Statistics cards
- ✅ Products table with search and pagination
- ✅ Responsive design
- ✅ Dark/Light mode support

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (requires current password)
- `POST /api/auth/reset-admin-password` - Reset admin password (utility endpoint)
- `POST /api/auth/init-admin` - Initialize admin user (one-time)

### Products
- `GET /api/products?page=1&limit=50&search=query` - Get paginated products

## Database Collections

### users
- `_id`: ObjectId
- `email`: string (unique)
- `password`: string (hashed)
- `role`: string (default: 'admin')
- `authType`: 'email' | 'google'
- `resetPasswordToken`: string (optional)
- `resetPasswordExpiry`: Date (optional)
- `createdAt`: Date
- `updatedAt`: Date

### products
- All product fields as per your MongoDB schema
- Supports search by: name, sku, brand, category

## Redux Store Structure

### authSlice
- `user`: Current user object
- `token`: JWT token
- `isLoading`: Loading state
- `isAuthenticated`: Authentication status

### productsSlice
- `products`: Array of products
- `pagination`: Pagination metadata
- `isLoading`: Loading state
- `error`: Error message
- `search`: Search query

