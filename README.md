# Restaurant POS System

A modern, offline-first restaurant Point of Sale (POS) system built with Electron, React, and Node.js.

## Features

### Core POS Interface
- ⚡ Ultra-fast order processing (< 3 clicks)
- 🎨 Touch-friendly UI with large buttons
- 🍽️ Category-based menu navigation
- 📝 Item notes and modifiers
- 💰 Multiple payment methods (Cash, Card, Mobile, Split)
- 🧾 Real-time price calculation

### Order Management
- Dine-in, Takeaway, Delivery, Pickup orders
- Table management with visual floor plan
- Order history and search
- Split and merge orders
- Move items between orders

### Kitchen Integration
- Kitchen Order Ticket (KOT) printing
- Real-time Kitchen Display System (KDS)
- Course-based cooking
- Food availability toggle

### Inventory & Stock
- Real-time inventory tracking
- Auto-deduction on orders
- Low stock alerts
- Multi-warehouse support
- Supplier management

### Customer & Staff
- Customer profiles with loyalty points
- Role-based access (Admin, Manager, Cashier, Staff, Kitchen, Rider)
- Staff performance tracking
- Shift management

### Financial Management
- Discount and surcharge management
- Tax configuration
- Expense tracking
- Cash drawer management
- Multi-currency support

### Reports & Analytics
- Sales reports (daily, weekly, monthly)
- Profit & loss statements
- Inventory reports
- Customer analytics
- Staff performance metrics
- And many more...

### Offline-First Architecture
- Works without internet
- Local SQLite database
- Auto-sync when online
- Conflict resolution
- Queue-based sync engine

## Tech Stack

### Desktop Application
- **Framework**: Electron 28+
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **UI Framework**: Tailwind CSS + Framer Motion
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Socket.io Client

### Backend API
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io Server

### Web Admin Panel
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 15+ (for backend API)
- Git

### Installation

1. **Clone the repository**
```bash
cd restaurantmanagementsystem
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Backend API**
```bash
cd apps/backend-api

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_pos"

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed
```

4. **Setup Desktop Application**
```bash
cd apps/pos-desktop
npm install
```

5. **Setup Web Admin (Optional)**
```bash
cd apps/web-admin
npm install
```

### Running the Application

**Development Mode:**

1. Start Backend API:
```bash
cd apps/backend-api
npm run dev
```

2. Start Desktop App (in another terminal):
```bash
cd apps/pos-desktop
npm run dev
```

3. Start Web Admin (optional, in another terminal):
```bash
cd apps/web-admin
npm run dev
```

**Production Build:**

```bash
# Build all applications
npm run build

# Build desktop installer
cd apps/pos-desktop
npm run electron:build
```

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
│   │   │   │   └── services/
│   │   │   └── preload/      # Electron preload
│   │   └── prisma/
│   │
│   ├── backend-api/          # Node.js API Server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   └── prisma/
│   │
│   └── web-admin/            # Next.js Admin Panel
│
├── packages/                 # Shared packages
├── docs/                     # Documentation
├── ARCHITECTURE.md           # System architecture
└── DATABASE_SCHEMA.md        # Database schema
```

## Default Credentials

After seeding the database:
- **Username**: admin
- **Password**: admin123
- **Role**: ADMIN

## Key Features Implementation

### 1. Fast Order Processing
- One-click item addition
- Quick quantity adjustment (+/-)
- Instant price calculation
- < 3 clicks to checkout

### 2. Offline Support
- All operations work offline
- Local SQLite database
- Sync queue for pending operations
- Automatic sync when online

### 3. Touch-Friendly Design
- Minimum 56px touch targets
- Large buttons and icons
- Swipe gestures (coming soon)
- Optimized for tablets and touchscreens

### 4. Real-time Updates
- WebSocket for live updates
- Kitchen display syncs instantly
- Table status updates in real-time
- Multi-device synchronization

### 5. Security
- JWT authentication
- Role-based access control
- Encrypted passwords (bcrypt)
- Audit logging
- Session management

## API Documentation

API documentation is available at `http://localhost:3001/api-docs` (when running).

### Key Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/menu/items` - Get menu items
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders` - List orders
- `POST /api/v1/orders/:id/payment` - Process payment
- `GET /api/v1/reports/sales` - Sales reports

## Database Schema

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete database schema documentation.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture.

## Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint + Prettier configured
- Component-based architecture
- Zustand for state management
- React Query for server state

### Git Workflow
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-description`
- Commit messages: Conventional Commits format

### Testing
- Unit tests: Jest
- E2E tests: Playwright (coming soon)
- Component tests: React Testing Library

## Deployment

### Desktop Application
Build installers for all platforms:
```bash
cd apps/pos-desktop
npm run electron:build
```

Outputs:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage` file

### Backend API
Deploy to any Node.js hosting platform:
- Docker containerization ready
- Environment variables for configuration
- Database migrations automated

### Web Admin
Deploy to Vercel/Netlify:
```bash
cd apps/web-admin
npm run build
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists
- Run `npx prisma migrate dev`

### Electron App Won't Start
- Check Node.js version (20+)
- Clear node_modules and reinstall
- Check for port conflicts (5173)

### Sync Issues
- Verify backend API is running
- Check network connectivity
- Review sync queue in local database
- Check browser console for errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Create an issue on GitHub
- Email: support@restaurantpos.com
- Documentation: See docs/ folder

## Roadmap

### Phase 1 (Current)
- ✅ Core POS interface
- ✅ Order management
- ✅ Basic inventory
- ✅ Authentication
- ⏳ Kitchen display system
- ⏳ Reports dashboard

### Phase 2 (Next)
- Advanced inventory features
- Customer loyalty program
- Delivery tracking
- Mobile apps
- AI-powered insights

### Phase 3 (Future)
- Multi-language support
- Voice ordering
- QR code menus
- Self-service kiosks
- Integration with delivery platforms

---

Built with ❤️ for the restaurant industry
