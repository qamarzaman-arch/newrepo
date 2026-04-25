# Restaurant POS System - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Configuration](#configuration)
8. [Environment Setup](#environment-setup)
9. [Build & Deployment](#build--deployment)
10. [Known Issues & Fixes](#known-issues--fixes)
11. [Current Status](#current-status)

---

## Project Overview

### Project Name
Restaurant POS System (POSLytic)

### Description
A comprehensive Point of Sale (POS) system for restaurant management, built with Electron for desktop deployment. The system handles orders, inventory, staff management, customer management, delivery operations, and more.

### Tech Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Desktop Framework**: Electron
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Routing**: React Router DOM
- **UI Components**: Custom component library
- **Notifications**: React Hot Toast
- **Forms**: Custom form handling

#### Backend
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Zod
- **Logging**: Custom logger utility
- **Error Handling**: Custom error handler middleware

#### Development Tools
- **Package Manager**: npm
- **Build Tool**: Vite (for frontend), tsc (for backend)
- **Process Management**: concurrently (for running both frontend and backend)
- **Database Migrations**: Prisma Migrate

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│                  (Node.js Runtime)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Renderer Process                     │
│              (Chromium Browser Context)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Server                         │
│                  (Express.js on port 3001)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   MySQL Database                              │
│                  (Prisma ORM)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: User interacts with React components in the Electron renderer
2. **State Management**: Zustand stores manage local state (auth, settings, etc.)
3. **API Calls**: React Query handles data fetching from backend API
4. **Backend Processing**: Express routes process requests with Prisma ORM
5. **Database Operations**: Prisma executes queries on MySQL database
6. **Response**: Data flows back through the chain to update UI

---

## Project Structure

```
newrepo/
├── apps/
│   ├── backend-api/              # Express.js Backend API
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema definition
│   │   │   ├── seed.ts           # Database seeding script
│   │   │   └── migrations/       # Database migrations
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── database.ts  # Prisma client configuration
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # Authentication middleware
│   │   │   │   └── errorHandler.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── menu.routes.ts
│   │   │   │   ├── order.routes.ts
│   │   │   │   ├── table.routes.ts
│   │   │   │   ├── customer.routes.ts
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── kitchen.routes.ts
│   │   │   │   ├── delivery.routes.ts
│   │   │   │   ├── expense.routes.ts
│   │   │   │   ├── discount.routes.ts
│   │   │   │   ├── report.routes.ts
│   │   │   │   ├── setting.routes.ts
│   │   │   │   ├── device.routes.ts
│   │   │   │   ├── sync.routes.ts
│   │   │   │   ├── vendor.routes.ts
│   │   │   │   ├── staff.routes.ts
│   │   │   │   ├── combo.routes.ts
│   │   │   │   ├── recipe.routes.ts
│   │   │   │   ├── purchase-order.routes.ts
│   │   │   │   ├── payment.routes.ts
│   │   │   │   ├── cash-drawer.routes.ts
│   │   │   │   ├── audit-log.routes.ts
│   │   │   │   ├── order-modification.routes.ts
│   │   │   │   ├── delivery-zone.routes.ts
│   │   │   │   ├── payment-gateway.routes.ts
│   │   │   │   ├── staff-schedule.routes.ts
│   │   │   │   ├── rider.routes.ts
│   │   │   │   ├── commission.routes.ts
│   │   │   │   └── table-lock.routes.ts
│   │   │   ├── utils/
│   │   │   │   └── logger.ts
│   │   │   └── index.ts            # Backend entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── pos-desktop/              # Electron Desktop App
│       ├── src/
│       │   ├── main/             # Electron main process
│       │   │   └── index.ts
│       │   ├── renderer/         # React frontend
│       │   │   ├── components/
│       │   │   │   └── ui/       # UI component library
│       │   │   ├── screens/      # Page components
│       │   │   │   ├── LoginScreen.tsx
│       │   │   │   ├── DashboardScreen.tsx
│       │   │   │   ├── AdvancedStaffScreen.tsx
│       │   │   │   ├── AdvancedInventoryScreen.tsx
│       │   │   │   ├── AdvancedSettingsScreen.tsx
│       │   │   │   └── ...
│       │   │   ├── services/     # API service layer
│       │   │   │   ├── api.ts
│       │   │   │   ├── authService.ts
│       │   │   │   ├── staffService.ts
│       │   │   │   ├── inventoryService.ts
│   │   │   │   ├── settingsService.ts
│   │   │   │   └── ...
│       │   │   ├── stores/       # Zustand state stores
│       │   │   │   ├── authStore.ts
│       │   │   │   ├── settingsStore.ts
│       │   │   │   └── ...
│       │   │   ├── index.css     # Global styles
│       │   │   └── index.tsx     # React entry point
│       │   └── preload.ts        # Electron preload script
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── node_modules/
├── package.json                  # Root package.json
├── tsconfig.json                 # Root TypeScript config
└── .windsurf/
    └── workflows/               # Custom workflows
```

---

## Database Schema

### Core Models

#### User
```prisma
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  email         String?   @unique
  passwordHash  String
  fullName      String
  role          String    @default("STAFF")
  pin           String?
  phone         String?
  avatar        String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  
  // Rider-specific fields
  status          String?   @default("ACTIVE")
  isAvailable     Boolean   @default(true)
  lastLocationLat Decimal?  @db.Decimal(10, 8)
  lastLocationLng Decimal?  @db.Decimal(11, 8)
  lastLocationAt  DateTime?
  vehicleType     String?
  vehiclePlate    String?

  // Relations
  orders        Order[]          @relation("CashierOrders")
  servedOrders  Order[]          @relation("ServerOrders")
  expenses      Expense[]
  shifts        Shift[]
  auditLogs     AuditLog[]
  deliveries    Delivery[]       @relation("RiderDeliveries")
  sessions      Session[]
  deliveryZones DeliveryZone[]  @relation("DeliveryZoneCreator")
  tableLocks    TableLock[]
}
```

#### Order
```prisma
model Order {
  id              String         @id @default(uuid())
  orderNumber     String         @unique
  ticketNumber    String
  type            String         @default("DINE_IN")
  status          String         @default("PENDING")
  
  subtotal        Float          @default(0)
  tax             Float          @default(0)
  serviceCharge   Float          @default(0)
  discount        Float          @default(0)
  total           Float          @default(0)
  
  tableId         String?
  customerId      String?
  cashierId       String
  serverId        String?
  
  orderedAt       DateTime       @default(now())
  completedAt     DateTime?
  
  // Relations
  table      Table?   @relation(fields: [tableId], references: [id])
  customer   Customer? @relation(fields: [customerId], references: [id])
  cashier    User     @relation("CashierOrders", fields: [cashierId], references: [id])
  server     User?    @relation("ServerOrders", fields: [serverId], references: [id])
  items      OrderItem[]
  payments   Payment[]
  delivery   Delivery?
}
```

#### Menu
```prisma
model Menu {
  id          String   @id @default(uuid())
  name        String
  description String?
  category    String
  price       Float
  imageUrl    String?
  isActive    Boolean  @default(true)
  isAvailable Boolean  @default(true)
  preparationTime Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  items       MenuItem[]
}
```

#### Customer
```prisma
model Customer {
  id          String   @id @default(uuid())
  firstName   String
  lastName    String
  email       String?  @unique
  phone       String?
  address     String?
  city        String?
  loyaltyTier String   @default("BRONZE")
  points      Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  orders      Order[]
}
```

#### Inventory
```prisma
model InventoryItem {
  id              String   @id @default(uuid())
  sku             String   @unique
  name            String
  barcode         String?  @unique
  category        String
  unit            String   @default("pcs")
  currentStock    Float    @default(0)
  minStock        Float    @default(0)
  maxStock        Float
  costPerUnit     Float
  sellingPrice    Float
  supplierId      String?
  status          String   @default("IN_STOCK")
  isActive        Boolean  @default(true)
  warehouseId     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  recipes         Recipe[]
  purchaseOrders  PurchaseOrderItem[]
}
```

#### DeliveryZone
```prisma
model DeliveryZone {
  id                        String   @id @default(uuid())
  name                      String
  description               String?
  baseFee                   Float    @default(0)
  minimumOrder              Float    @default(0)
  freeDeliveryThreshold     Float?
  estimatedTimeMin          Int
  estimatedTimeMax          Int
  isActive                  Boolean  @default(true)
  color                     String?
  coordinates               Json?
  createdById               String
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  createdBy                 User     @relation("DeliveryZoneCreator", fields: [createdById], references: [id])
}
```

### Additional Models
- **MenuItem**: Individual menu items within categories
- **OrderItem**: Items within an order
- **Payment**: Payment records for orders
- **Table**: Restaurant tables
- **Shift**: Staff shift records
- **Expense**: Business expenses
- **Discount**: Discount codes and promotions
- **Vendor**: Inventory suppliers
- **Recipe**: Recipe items for menu items
- **PurchaseOrder**: Purchase orders for inventory
- **Delivery**: Delivery orders
- **Session**: User authentication sessions
- **AuditLog**: System audit logs
- **TableLock**: Table locking mechanism
- **Combo**: Menu combo deals
- **StaffSchedule**: Staff scheduling
- **Commission**: Rider commissions
- **PaymentGateway**: Payment gateway configurations

---

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - Login with username/password
- `POST /login-pin` - Login with username/PIN
- `POST /logout` - Logout user
- `GET /me` - Get current user info
- `PUT /change-password` - Change password

### Users (`/api/v1/users`)
- `GET /` - Get all users
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user

### Menu (`/api/v1/menu`)
- `GET /` - Get all menu items
- `GET /:id` - Get menu item by ID
- `POST /` - Create menu item
- `PUT /:id` - Update menu item
- `DELETE /:id` - Delete menu item

### Orders (`/api/v1/orders`)
- `GET /` - Get all orders
- `GET /:id` - Get order by ID
- `POST /` - Create order
- `PUT /:id` - Update order
- `DELETE /:id` - Delete order
- `POST /:id/items` - Add item to order
- `PUT /:id/status` - Update order status

### Tables (`/api/v1/tables`)
- `GET /` - Get all tables
- `GET /:id` - Get table by ID
- `POST /` - Create table
- `PUT /:id` - Update table
- `DELETE /:id` - Delete table

### Customers (`/api/v1/customers`)
- `GET /` - Get all customers
- `GET /:id` - Get customer by ID
- `GET /promotions` - Get promotions
- `GET /segments` - Get customer segments
- `GET /loyalty/tiers` - Get loyalty tiers
- `POST /` - Create customer
- `PUT /:id` - Update customer
- `DELETE /:id` - Delete customer

### Inventory (`/api/v1/inventory`)
- `GET /` - Get all inventory items
- `GET /:id` - Get item by ID
- `POST /` - Create item
- `PUT /:id` - Update item
- `DELETE /:id` - Delete item
- `POST /:id/stock` - Adjust stock

### Staff (`/api/v1/staff`)
- `GET /` - Get all staff
- `POST /` - Create staff
- `PUT /:id` - Update staff
- `DELETE /:id` - Delete staff
- `GET /shifts` - Get active shifts
- `POST /clock-in` - Clock in
- `POST /clock-out` - Clock out
- `GET /performance` - Get staff performance

### Settings (`/api/v1/settings`)
- `GET /` - Get all settings
- `GET /:key` - Get setting by key
- `PUT /:key` - Update setting
- `POST /bulk-sync` - Bulk sync settings
- `GET /current-rates` - Get current tax and service rates

### Vendors (`/api/v1/vendors`)
- `GET /` - Get all vendors
- `POST /` - Create vendor
- `PUT /:id` - Update vendor
- `DELETE /:id` - Delete vendor

### Delivery Zones (`/api/v1/delivery-zones`)
- `GET /` - Get all delivery zones
- `GET /:id` - Get zone by ID
- `POST /` - Create zone
- `PUT /:id` - Update zone
- `DELETE /:id` - Delete zone
- `POST /calculate-fee` - Calculate delivery fee

---

## Frontend Components

### Screens (Pages)

#### LoginScreen
- **Purpose**: User authentication
- **Features**:
  - Username/password login
  - Username/PIN login
  - Form validation
  - Error handling
- **Location**: `apps/pos-desktop/src/renderer/screens/LoginScreen.tsx`

#### DashboardScreen
- **Purpose**: Main dashboard overview
- **Features**:
  - Sales statistics
  - Order overview
  - Quick actions
- **Location**: `apps/pos-desktop/src/renderer/screens/DashboardScreen.tsx`

#### AdvancedStaffScreen
- **Purpose**: Staff management
- **Features**:
  - Staff list with filtering
  - Add/Edit/Delete staff
  - Role-based PIN/password logic
  - Shift management
  - Time tracking
  - Performance metrics
- **Location**: `apps/pos-desktop/src/renderer/screens/AdvancedStaffScreen.tsx`

#### AdvancedInventoryScreen
- **Purpose**: Inventory management
- **Features**:
  - Inventory items list
  - Add/Edit/Delete items
  - Stock management
  - Purchase orders
  - Recipes
  - Vendors
- **Location**: `apps/pos-desktop/src/renderer/screens/AdvancedInventoryScreen.tsx`

#### AdvancedSettingsScreen
- **Purpose**: System settings
- **Features**:
  - General settings (currency, tax, restaurant info)
  - Business rules
  - Payment methods
  - Hardware configuration
  - Notifications
  - Security settings
  - Appearance settings
- **Location**: `apps/pos-desktop/src/renderer/screens/AdvancedSettingsScreen.tsx`

### State Stores (Zustand)

#### authStore
- **Purpose**: Authentication state management
- **State**: user, token, isAuthenticated
- **Actions**: login, logout, setUser
- **Location**: `apps/pos-desktop/src/renderer/stores/authStore.ts`

#### settingsStore
- **Purpose**: Settings state management
- **State**: settings object with all configuration
- **Actions**: updateSettings, resetSettings, loadFromDatabase, saveToDatabase
- **Location**: `apps/pos-desktop/src/renderer/stores/settingsStore.ts`

### Services

#### api
- **Purpose**: Axios HTTP client configuration
- **Features**: Base URL, interceptors, error handling
- **Location**: `apps/pos-desktop/src/renderer/services/api.ts`

#### authService
- **Purpose**: Authentication API calls
- **Methods**: login, loginWithPin, logout, register, getCurrentUser
- **Location**: `apps/pos-desktop/src/renderer/services/authService.ts`

#### staffService
- **Purpose**: Staff management API calls
- **Methods**: getStaff, createStaff, updateStaff, deleteStaff, getActiveShifts, clockIn, clockOut
- **Location**: `apps/pos-desktop/src/renderer/services/staffService.ts`

#### inventoryService
- **Purpose**: Inventory management API calls
- **Methods**: getItems, createItem, updateItem, deleteItem, getVendors, createVendor
- **Location**: `apps/pos-desktop/src/renderer/services/inventoryService.ts`

#### settingsService
- **Purpose**: Settings API calls
- **Methods**: getSettings, updateSetting, bulkSyncSettings, getCurrentRates
- **Location**: `apps/pos-desktop/src/renderer/services/settingsService.ts`

---

## Configuration

### Backend Configuration

#### Database (`.env`)
```env
DATABASE_URL="mysql://user:password@localhost:3306/restaurant_pos"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
```

#### TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  }
}
```

### Frontend Configuration

#### Vite (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176
  }
})
```

#### TypeScript (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

---

## Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd newrepo
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd apps/backend-api
npm install
```

4. **Install frontend dependencies**
```bash
cd ../pos-desktop
npm install
```

5. **Configure environment variables**
```bash
cd apps/backend-api
cp .env.example .env
# Edit .env with your database credentials
```

6. **Set up database**
```bash
cd apps/backend-api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

7. **Run development servers**
```bash
cd ../../
npm run dev
```

---

## Build & Deployment

### Development
```bash
npm run dev
```
This runs both backend and frontend concurrently.

### Backend Build
```bash
cd apps/backend-api
npm run build
```

### Frontend Build
```bash
cd apps/pos-desktop
npm run build
```

### Electron Build
```bash
cd apps/pos-desktop
npm run build:electron
```

---

## Known Issues & Fixes

### 1. Customers Page - Resource Not Found
- **Issue**: Promotions, segments, and loyalty tiers returning 404
- **Fix**: Moved static routes before dynamic `/:id` route in `customer.routes.ts`

### 2. Staff Management - Button Functionality
- **Issue**: Buttons not connected to database, missing role-based PIN/password logic
- **Fix**: 
  - Added staff CRUD endpoints with password/PIN hashing
  - Updated frontend to conditionally show PIN/password fields
  - Added validation for PIN (4 digits)

### 3. Staff Table - Missing Roles
- **Issue**: Cashier role not appearing in staff table
- **Fix**: Updated backend filter to include all roles (STAFF, KITCHEN, CASHIER, MANAGER, RIDER, ADMIN)

### 4. Staff Performance Tab Error
- **Issue**: `performanceData.find is not a function`
- **Fix**: Added `Array.isArray()` check before calling `.find()`

### 5. Staff Tab Functionality
- **Issue**: Schedule, time-tracking, performance tabs not functional
- **Fix**: Added modal forms and handlers for shift and time entry

### 6. Admin Login Issues
- **Issue**: Unable to login with admin credentials
- **Fix**: Re-seeded database with correct admin credentials

### 7. Port Conflicts
- **Issue**: `EADDRINUSE` error on port 3001
- **Fix**: Killed process using port 3001

### 8. Settings Not Synced to Database
- **Issue**: Settings only in localStorage
- **Fix**: 
  - Added `loadFromDatabase` and `saveToDatabase` methods to settingsStore
  - Updated AdvancedSettingsScreen to sync with database

### 9. PostCSS/Tailwind CSS Error
- **Issue**: Parser error with attribute selectors containing colons
- **Fix**: Removed problematic attribute selectors from CSS

### 10. Delivery Zone Routes Error
- **Issue**: `Cannot read properties of undefined (reading 'findMany')`
- **Fix**: Added missing DeliveryZone model to Prisma schema and ran migration

---

## Current Status

### Working Features
✅ **Customers Page** - All endpoints working (promotions, segments, loyalty tiers)
✅ **Staff Management** - Full CRUD with role-based PIN/password logic
✅ **Staff Table** - All roles displayed
✅ **Staff Tabs** - Schedule, time-tracking, performance functional
✅ **Vendor Management** - Add vendor button working
✅ **Settings** - All tabs connected to database
✅ **Authentication** - Admin login working
✅ **Delivery Zones** - Backend routes functional

### Database
✅ Complete Prisma schema with all models
✅ All migrations applied
✅ Proper relations between models

### Configuration
✅ Backend: port 3001
✅ Frontend: http://localhost:5176
✅ Database: MySQL with Prisma ORM

### Default Credentials
- Production deployments must provision unique credentials through environment variables or an admin bootstrap process.

---

## Future Enhancements

### Potential Improvements
1. Add real-time order updates with WebSockets
2. Implement offline mode with local storage sync
3. Add advanced reporting and analytics
4. Implement multi-restaurant support
5. Add mobile companion app
6. Implement receipt printing integration
7. Add kitchen display system (KDS)
8. Implement customer loyalty program
9. Add table reservation system
10. Implement advanced inventory forecasting

---

## Support & Maintenance

### Common Commands

#### Database
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration-name>

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

#### Backend
```bash
# Run in development
npm run dev:api

# Build for production
npm run build

# Run production build
npm start
```

#### Frontend
```bash
# Run in development
npm run dev:pos

# Build for production
npm run build

# Build Electron app
npm run build:electron
```

---

## License

[Add license information here]

## Contact

[Add contact information here]

---

**Last Updated**: April 23, 2026
**Version**: 1.0.0
