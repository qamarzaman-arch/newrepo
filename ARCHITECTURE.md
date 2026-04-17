# Restaurant POS System - Architecture & Database Schema

## System Overview

Modern, offline-first restaurant POS system built with Electron + React for desktop application and Next.js for web admin panel.

## Tech Stack

### Desktop Application (POS)
- **Framework**: Electron 28+
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **UI Framework**: Tailwind CSS + Headless UI
- **Database**: SQLite (better-sqlite3)
- **ORM**: Prisma
- **Real-time**: Socket.io Client
- **Printing**: electron-printer

### Backend API
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io Server
- **File Storage**: Local + Cloud (optional S3)

### Web Admin Panel
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Charts**: Recharts
- **Tables**: TanStack Table

## Project Structure

```
restaurantmanagementsystem/
├── apps/
│   ├── pos-desktop/          # Electron POS Application
│   │   ├── src/
│   │   │   ├── main/         # Electron main process
│   │   │   ├── renderer/     # React frontend
│   │   │   │   ├── components/
│   │   │   │   ├── screens/
│   │   │   │   ├── stores/
│   │   │   │   ├── services/
│   │   │   │   └── hooks/
│   │   │   └── preload/      # Electron preload scripts
│   │   ├── prisma/
│   │   └── package.json
│   │
│   ├── backend-api/          # Node.js API Server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── prisma/
│   │   └── package.json
│   │
│   └── web-admin/            # Next.js Admin Panel
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
│
├── packages/
│   ├── shared-types/         # Shared TypeScript types
│   ├── ui-components/        # Shared UI components
│   └── sync-engine/          # Offline sync logic
│
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    └── API_DOCS.md
```

## Core Features Implementation

### 1. Cashier POS Interface
- Touch-optimized UI with large buttons (min 56px touch targets)
- Category-based menu navigation
- Quick add/remove items with +/- controls
- Item notes/modifiers support
- Auto price calculation
- Multiple payment methods (cash, card, split)
- < 3 clicks checkout
- Keyboard shortcuts for power users

### 2. Order Management
- Order types: Dine-in, Takeaway, Delivery, Pickup
- Table-based ordering with visual floor plan
- Split orders by items or amount
- Merge tables functionality
- Move items between orders
- Complete order history with search/filter
- Order status tracking (pending, preparing, ready, served, completed, cancelled)

### 3. Kitchen Integration
- Kitchen Order Ticket (KOT) printing
- Kitchen Display System (KDS) with real-time updates
- Course-based cooking (appetizer, main, dessert)
- Food availability toggle (in stock / out of stock)
- Prep time tracking
- Order priority management

### 4. Inventory & Stock Management
- Real-time inventory tracking
- Auto-deduction on order completion
- Low stock alerts with configurable thresholds
- Multi-warehouse support
- Stock transfer between warehouses
- Supplier/vendor management
- Purchase order creation
- Stock adjustment logs

### 5. Customer & Staff Management
**Customers:**
- Customer profiles with contact info
- Loyalty points system (configurable earning rate)
- Order history per customer
- Customer preferences and notes
- Birthday/anniversary tracking
- SMS/Email marketing integration

**Staff:**
- Role-based access control (Admin, Manager, Cashier, Staff, Kitchen, Rider)
- Staff login with PIN/password
- Shift management (clock in/out)
- Performance tracking
- Commission calculation
- Attendance records

### 6. Financial & Billing
- Discount management (% or fixed amount)
- Surcharge management (service charge, delivery fee)
- Tax/tariff management (configurable rates)
- Expense tracking with categories
- Cash drawer tracking (opening/closing balances)
- Payout/settlement management
- Multi-currency support

### 7. Reports & Analytics
- Sales reports (daily, weekly, monthly, custom range)
- Profit & loss reports
- Expense reports with categorization
- Inventory reports (stock levels, movement, valuation)
- Customer reports (top customers, frequency, spending)
- Staff performance reports (sales per staff, efficiency)
- Courier/delivery performance reports
- Stock reports (supply, demand, wastage)
- Discount & surcharge usage reports
- Order cancellation report with reasons
- Delivery analytics (times, success rate)
- Session/Z-report (end of day)
- Cash drawer reconciliation
- Warehouse summary
- SMS campaign reports
- Product performance (best sellers, slow movers)

### 8. Advanced Features
- Device management (printers, scanners, cash drawers)
- Receipt design customization
- FBR integration (Pakistan tax compliance)
- Mass checkout (close multiple orders)
- Quick sale mode (ultra-fast transactions)
- Rider tracking with GPS (optional)
- Giveaway/promotional item management
- Points/rewards configuration
- Email alerts for low stock, high expenses
- System lock (auto-lock after inactivity)
- Start/end session with cash counting
- Language settings (multi-language support)
- Currency exchange rates
- Data backup & restore
- Audit logs for all critical actions

## Database Schema

See `DATABASE_SCHEMA.md` for complete Prisma schema.

## Offline-First Sync Engine

### Architecture
1. **Local Database**: SQLite for offline operation
2. **Cloud Database**: PostgreSQL for multi-device sync
3. **Sync Queue**: Track all mutations locally
4. **Conflict Resolution**: Last-write-wins with manual override option
5. **Auto-Sync**: Background sync when online
6. **Manual Sync**: Force sync button for immediate update

### Sync Process
```
1. User performs action → Write to SQLite
2. Add mutation to sync_queue table
3. If online: Send to API immediately
4. If offline: Queue for later sync
5. On reconnect: Process queue in order
6. Handle conflicts via timestamp comparison
7. Update local DB with server response
8. Mark mutation as synced
```

### Conflict Resolution Strategies
- **Timestamp-based**: Latest write wins
- **Version vectors**: Track changes per field
- **Manual merge**: Flag for user review
- **Business rules**: e.g., can't reduce stock below 0

## Security

### Authentication
- JWT tokens with refresh mechanism
- Password hashing with bcrypt (12 rounds)
- Session management with expiry
- Multi-factor authentication (optional)
- Failed login attempt limiting

### Authorization
- Role-based access control (RBAC)
- Permission checks at API level
- Frontend route protection
- Resource-level permissions

### Data Protection
- HTTPS for all API communication
- Encrypted local database (SQLCipher optional)
- Sensitive data encryption at rest
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection (React auto-escapes)

### Audit Trail
- Log all critical operations
- Track user actions (who, what, when)
- Maintain change history for important entities
- Exportable audit logs

## Performance Optimization

### Desktop App
- Code splitting and lazy loading
- Image optimization and caching
- Virtual scrolling for large lists
- Debounced search inputs
- Optimistic UI updates
- Background data prefetching

### Backend API
- Database query optimization
- Indexing strategy
- Connection pooling
- Response caching (Redis optional)
- Rate limiting
- Compression (gzip/brotli)

### Sync Efficiency
- Batch mutations for bulk operations
- Delta sync (only changed data)
- Compression for large payloads
- Retry with exponential backoff
- Partial sync for specific modules

## Deployment

### Desktop Application
- Build with electron-builder
- Platforms: Windows (.exe), macOS (.dmg), Linux (.AppImage)
- Auto-update mechanism
- Installer with dependencies check

### Backend API
- Docker containerization
- Deploy to AWS/DigitalOcean/VPS
- Nginx reverse proxy
- SSL certificates (Let's Encrypt)
- Database backups (automated)

### Web Admin
- Vercel/Netlify deployment
- Environment variables management
- CDN for static assets
- SSR for better performance

## Monitoring & Logging

### Application Monitoring
- Error tracking (Sentry optional)
- Performance monitoring
- User analytics (anonymous)
- Crash reporting

### Server Monitoring
- Uptime monitoring
- Resource usage (CPU, memory, disk)
- Database performance
- API response times
- Error rates

### Logs
- Application logs (winston)
- Access logs
- Error logs
- Audit logs
- Log rotation and retention

## Future Enhancements

### AI/ML Features
- Sales forecasting
- Demand prediction for inventory
- Customer churn prediction
- Dynamic pricing suggestions
- Menu optimization recommendations
- Staff scheduling optimization

### Integrations
- Payment gateways (Stripe, PayPal, local providers)
- Delivery platforms (Uber Eats, DoorDash APIs)
- Accounting software (QuickBooks, Xero)
- SMS gateways (Twilio, local providers)
- Email services (SendGrid, Mailgun)
- Social media integration

### Mobile Apps
- iOS/Android customer app
- Rider mobile app
- Manager dashboard mobile
- Kitchen display on tablets

### Advanced Features
- Voice ordering
- QR code menu & ordering
- Self-service kiosks
- Reservation system
- Waitlist management
- Employee scheduling
- Recipe management
- Nutritional information tracking
