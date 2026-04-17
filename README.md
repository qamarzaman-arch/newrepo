# POSLytic - Enterprise Restaurant POS System

![POSLytic Logo](./logo.png)

**A modern, enterprise-grade Point of Sale system designed for restaurants, cafes, and food service businesses.**

---

## 🚀 Features

### Core Modules
- ✅ **Role-Based Access Control** - Admin, Manager, Cashier, Kitchen Staff, Delivery Riders
- ✅ **Advanced Dashboard** - Real-time analytics, charts, business insights
- ✅ **Menu Management** - Categories, items, modifiers, combo meals, bulk operations
- ✅ **Order Management** - Dine-in, Takeaway, Delivery, Reservations with table management
- ✅ **Inventory Control** - Stock tracking, purchase orders, recipe costing, vendor management
- ✅ **Customer CRM** - Customer database, loyalty programs, promotions, segmentation
- ✅ **Staff Management** - Employee profiles, scheduling, time tracking, performance metrics
- ✅ **Kitchen Display System** - Real-time ticket management, station routing, timing analytics
- ✅ **Delivery Management** - Rider tracking, route optimization, platform integration
- ✅ **Financial Reports** - Expense tracking, tax reports, P&L statements, budget control
- ✅ **Hardware Integration** - Thermal printers, barcode scanners, cash drawers, customer displays
- ✅ **Real-Time Updates** - WebSocket-based instant synchronization across devices

### Technical Highlights
- ⚡ **Modern Tech Stack** - React 18, TypeScript, Electron, Node.js, Prisma ORM
- 🎨 **Beautiful UI** - Framer Motion animations, Tailwind CSS, responsive design
- 🔒 **Enterprise Security** - JWT authentication, role-based authorization, rate limiting
- 📊 **Real-Time Analytics** - Live dashboards, interactive charts, business intelligence
- 🖨️ **Hardware Ready** - ESC/POS printer support, serial/USB device integration
- 🌐 **Cross-Platform** - Windows, macOS, Linux (Electron-based desktop app)
- ☁️ **Cloud-Ready** - RESTful API backend, WebSocket events, scalable architecture

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** >= 18.x ([Download](https://nodejs.org/))
- **npm** >= 9.x or **yarn** >= 1.22.x
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** >= 14.x (for production) or SQLite (for development)

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/restaurantmanagementsystem.git
cd restaurantmanagementsystem
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd apps/backend-api
npm install

# Install desktop app dependencies
cd ../pos-desktop
npm install
```

### 3. Environment Setup

#### Backend Configuration

Create a `.env` file in `apps/backend-api/`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://user:password@localhost:5432/poslytic"  # PostgreSQL for production

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

#### Desktop App Configuration

The desktop app connects to the backend API automatically. No additional configuration needed for development.

### 4. Database Setup

```bash
cd apps/backend-api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npx prisma db seed
```

---

## 🚀 Running the Application

### Development Mode

#### Option 1: Run Backend and Desktop Separately

**Terminal 1 - Backend API:**
```bash
cd apps/backend-api
npm run dev
```

**Terminal 2 - Desktop App:**
```bash
cd apps/pos-desktop
npm run electron:dev
```

#### Option 2: Run Both Concurrently (Recommended)

From the root directory:
```bash
npm run dev
```

This will start both the backend API and desktop app simultaneously.

### Production Build

```bash
# Build backend
cd apps/backend-api
npm run build

# Build desktop app
cd ../pos-desktop
npm run electron:build
```

The built application will be available in `apps/pos-desktop/dist/`.

---

## 📖 Usage Guide

### First Login

Default admin credentials (after seeding):
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials immediately in production!

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features, system settings, user management |
| **Manager** | Dashboard, orders, menu, inventory, staff, reports (no system settings) |
| **Cashier** | POS terminal, order creation, payment processing |
| **Kitchen Staff** | Kitchen display system, ticket management |
| **Delivery Rider** | Delivery assignments, route tracking |

### Quick Start Workflow

1. **Login** as Admin or Manager
2. **Configure Settings** - Set up tax rates, payment methods, printers
3. **Add Menu Items** - Create categories and menu items
4. **Create Staff Accounts** - Add cashiers and kitchen staff
5. **Start Taking Orders** - Switch to Cashier role or use POS terminal

---

## 🏗️ Project Structure

```
restaurantmanagementsystem/
├── apps/
│   ├── backend-api/           # Node.js/Express backend
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── middleware/    # Auth, error handling
│   │   │   ├── utils/         # Helpers, logger, WebSocket
│   │   │   └── server.ts      # Entry point
│   │   ├── prisma/            # Database schema & migrations
│   │   └── package.json
│   │
│   └── pos-desktop/           # Electron desktop app
│       ├── src/
│       │   ├── main/          # Electron main process
│       │   ├── preload/       # IPC bridge
│       │   └── renderer/      # React frontend
│       │       ├── components/    # Reusable UI components
│       │       ├── screens/       # Page components
│       │       ├── layouts/       # Role-based layouts
│       │       ├── services/      # API clients, hardware manager
│       │       ├── stores/        # Zustand state management
│       │       ├── hooks/         # Custom React hooks
│       │       └── App.tsx        # Main app component
│       └── package.json
│
├── packages/                  # Shared packages (monorepo)
├── docs/                      # Documentation
└── README.md
```

---

## 🔧 Configuration

### Hardware Setup

#### Thermal Printer Configuration

1. Connect your thermal printer via USB or Network
2. Go to **Settings → Hardware & Devices**
3. Enable printer and select connection type
4. Enter device path (USB) or IP address (Network)
5. Click "Test Connection" to verify

Supported printers:
- Epson TM series
- Star Micronics TSP series
- Any ESC/POS compatible printer

#### Barcode Scanner

Most USB barcode scanners work in HID (keyboard emulation) mode automatically. For serial mode:

1. Connect scanner via USB
2. Go to **Settings → Hardware & Devices**
3. Enable barcode scanner
4. Select connection type: USB-HID or USB-Serial
5. Configure prefix/suffix if needed

#### Cash Drawer

Connect cash drawer to printer's cash drawer port (RJ11/RJ12):

1. Enable cash drawer in settings
2. Select connection type: Printer
3. Choose kick pin (2 or 5)
4. Set pulse duration (default: 100ms)
5. Test connection

---

## 🧪 Testing

### Unit Tests

```bash
cd apps/pos-desktop
npm test
```

### End-to-End Tests

```bash
cd apps/pos-desktop
npm run test:e2e
```

### Backend Tests

```bash
cd apps/backend-api
npm test
```

---

## 📚 API Documentation

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

### Orders

```http
GET /api/orders?status=PENDING&page=1&limit=20
Authorization: Bearer <token>
```

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderType": "DINE_IN",
  "tableId": "table-uuid",
  "items": [
    {
      "menuItemId": "item-uuid",
      "quantity": 2,
      "notes": "No onions"
    }
  ]
}
```

### WebSocket Events

Connect to WebSocket:
```javascript
const socket = io('http://localhost:3001');

// Join room
socket.emit('join-room', 'kitchen');

// Listen for events
socket.on('order:created', (order) => {
  console.log('New order:', order);
});

socket.on('ticket:updated', (ticket) => {
  console.log('Ticket updated:', ticket);
});
```

Available events:
- `order:created` - New order placed
- `order:updated` - Order modified
- `order:status-changed` - Order status update
- `ticket:created` - New kitchen ticket
- `ticket:completed` - Ticket marked complete
- `inventory:low-stock` - Low stock alert
- `notification:new` - System notification

Full API documentation: [API Docs](./docs/API_REFERENCE.md)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Document public APIs

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help

- 📖 **Documentation**: [docs/](./docs/)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/restaurantmanagementsystem/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/restaurantmanagementsystem/discussions)
- 📧 **Email**: support@poslytic.com

### Common Issues

**Q: Backend won't start**
A: Check if PostgreSQL is running and DATABASE_URL is correct. Run `npx prisma migrate dev` to apply migrations.

**Q: Desktop app shows blank screen**
A: Ensure backend is running on port 3001. Check browser console for errors (Ctrl+Shift+I in DevTools).

**Q: Printer not working**
A: Verify printer is connected and powered on. Check device path in Settings. Test connection from hardware settings.

**Q: Database errors**
A: Delete `apps/backend-api/prisma/dev.db` and run `npx prisma migrate dev` to reset database.

---

## 🙏 Acknowledgments

- **React** - UI framework
- **Electron** - Desktop app framework
- **Prisma** - Database ORM
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide Icons** - Beautiful icons
- **Socket.IO** - Real-time communication

---

## 📊 System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.15, or Linux (Ubuntu 20.04+)
- **RAM**: 4 GB
- **Storage**: 500 MB free space
- **Display**: 1280x720 resolution

### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or Linux (Ubuntu 22.04+)
- **RAM**: 8 GB
- **Storage**: 1 GB free space (SSD recommended)
- **Display**: 1920x1080 resolution or higher
- **Network**: Stable internet connection for cloud sync

---

## 🔐 Security

### Best Practices

1. **Change default credentials** immediately after installation
2. **Use HTTPS** in production (configure reverse proxy with SSL)
3. **Update dependencies** regularly (`npm audit fix`)
4. **Backup database** daily
5. **Restrict network access** to backend API
6. **Enable firewall** rules for database port
7. **Use strong JWT secrets** (minimum 32 characters)

### Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on API endpoints
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation with Zod
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection

---

## 🚀 Deployment

### Docker Deployment (Coming Soon)

```bash
docker-compose up -d
```

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set up PostgreSQL**:
   ```sql
   CREATE DATABASE poslytic;
   CREATE USER poslytic WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE poslytic TO poslytic;
   ```

3. **Configure environment variables** for production

4. **Start the backend**:
   ```bash
   cd apps/backend-api
   npm start
   ```

5. **Distribute desktop app** to POS terminals

---

## 📈 Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Memoization with React.memo and useMemo
- Virtual scrolling for large lists
- Service workers for offline support

### Backend
- Database indexing on frequently queried fields
- Query optimization with Prisma
- Redis caching for frequently accessed data
- Compression with gzip/brotli
- Connection pooling

---

**Made with ❤️ by the POSLytic Team**

For more information, visit [poslytic.com](https://poslytic.com)
