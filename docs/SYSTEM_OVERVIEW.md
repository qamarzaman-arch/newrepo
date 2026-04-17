# System Architecture Overview

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
├──────────────────────────┬──────────────────────────────────┤
│   Desktop POS App        │   Web Admin Panel                │
│   (Electron + React)     │   (Next.js)                      │
│                          │                                  │
│  ┌────────────────────┐  │  ┌────────────────────┐         │
│  │  UI Components     │  │  │  Dashboard         │         │
│  │  - POS Interface   │  │  │  Analytics         │         │
│  │  - Orders          │  │  │  Multi-branch Mgmt │         │
│  │  - Kitchen Display │  │  │  Remote Monitoring │         │
│  │  - Tables          │  │  └────────────────────┘         │
│  └────────────────────┘  │                                  │
│                          │                                  │
│  ┌────────────────────┐  │                                  │
│  │  Local SQLite DB   │◄─┼── Offline Operations            │
│  │  - Orders Queue    │  │                                  │
│  │  - Menu Cache      │  │                                  │
│  │  - Settings        │  │                                  │
│  └────────────────────┘  │                                  │
└──────────────────────────┴──────────────────────────────────┘
                           │
                           │ HTTPS / WebSocket
                           │ (Sync when online)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                 │
├─────────────────────────────────────────────────────────────┤
│              Node.js / Express Server                        │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  Authentication & Authorization              │           │
│  │  - JWT Validation                            │           │
│  │  - Role-Based Access Control                 │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  API Routes (REST)                           │           │
│  │  - /api/v1/auth       (Login, Register)      │           │
│  │  - /api/v1/orders     (CRUD Orders)          │           │
│  │  - /api/v1/menu       (Menu Management)      │           │
│  │  - /api/v1/customers  (Customer Mgmt)        │           │
│  │  - /api/v1/inventory  (Stock Management)     │           │
│  │  - /api/v1/kitchen    (KOT Management)       │           │
│  │  - /api/v1/reports    (Analytics)            │           │
│  │  - ... (17+ modules)                         │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  Real-Time Engine (Socket.io)                │           │
│  │  - Order Updates                             │           │
│  │  - Kitchen Tickets                           │           │
│  │  - Table Status                              │           │
│  │  - Inventory Changes                         │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Prisma ORM
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                 │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL Database                             │
│                                                              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Users       │ │ Orders       │ │ Menu Items   │         │
│  │ Sessions    │ │ Order Items  │ │ Categories   │         │
│  │ Roles       │ │ Payments     │ │ Modifiers    │         │
│  └─────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Customers   │ │ Tables       │ │ Inventory    │         │
│  │ Loyalty     │ │ Floor Plan   │ │ Stock Movmt  │         │
│  └─────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ KOT Tickets │ │ Deliveries   │ │ Expenses     │         │
│  │ Riders      │ │ Tracking     │ │ Discounts    │         │
│  └─────────────┘ └──────────────┘ └──────────────┘         │
│                                                              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Sync Queue  │ │ Audit Logs   │ │ Settings     │         │
│  │ Report Cache│ │ Devices      │ │ Vendors      │         │
│  └─────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Order Creation Flow (Online)

```
Cashier adds items → Order Store (Zustand)
                    ↓
            Click Checkout
                    ↓
            Payment Modal Opens
                    ↓
            Select Payment Method
                    ↓
            API Call: POST /api/v1/orders
                    ↓
            Backend validates & processes
                    ↓
            ┌───────┴───────┐
            ↓               ↓
    Create Order in DB   Create KOT Tickets
            ↓               ↓
    Update Table Status  Emit WebSocket Event
            ↓               ↓
    Return Order Data   Kitchen Display Updates
            ↓
    Show Success Message
            ↓
    Clear Current Order
```

### 2. Order Creation Flow (Offline)

```
Cashier adds items → Order Store (Zustand)
                    ↓
            Click Checkout
                    ↓
            Save to Local SQLite
                    ↓
            Add to Sync Queue
                    ↓
            Show "Queued" indicator
                    ↓
            [When internet returns]
                    ↓
            Sync Engine detects connection
                    ↓
            Process sync queue
                    ↓
            Send to backend API
                    ↓
            Handle conflicts if any
                    ↓
            Mark as synced
```

### 3. Kitchen Ticket Flow

```
Order Created → Backend creates KOT tickets
                    ↓
            Socket.io emits 'new-kot' event
                    ↓
            Kitchen Display receives event
                    ↓
            New ticket appears instantly
                    ↓
            Chef marks as "In Progress"
                    ↓
            WebSocket update to all clients
                    ↓
            Chef marks as "Completed"
                    ↓
            Order status updates
                    ↓
            Waiter notified (optional)
```

## Component Architecture

### Desktop App Structure

```
pos-desktop/
├── main/ (Electron Main Process)
│   ├── index.ts (Entry point)
│   ├── database.ts (SQLite operations)
│   └── ipc-handlers.ts (IPC communication)
│
├── preload/
│   └── index.ts (Secure bridge)
│
└── renderer/ (React Frontend)
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── TopBar.tsx
    │   └── [Reusable UI components]
    │
    ├── screens/
    │   ├── LoginScreen.tsx ✅
    │   ├── POSScreen.tsx ✅
    │   ├── OrdersScreen.tsx 🔄
    │   ├── KitchenScreen.tsx 🔄
    │   ├── TablesScreen.tsx 🔄
    │   └── [Other screens]
    │
    ├── stores/
    │   ├── authStore.ts ✅
    │   ├── orderStore.ts ✅
    │   └── [Feature stores]
    │
    ├── services/
    │   ├── api.ts (HTTP client)
    │   ├── socket.ts (WebSocket)
    │   └── sync.ts (Sync engine)
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useOrders.ts
    │   └── [Custom hooks]
    │
    └── types/
        ├── api.types.ts
        ├── order.types.ts
        └── [Type definitions]
```

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. Network Layer                       │
│     - HTTPS/TLS encryption              │
│     - CORS configuration                │
│     - Rate limiting                     │
│                                         │
│  2. Application Layer                   │
│     - JWT authentication                │
│     - Session management                │
│     - Role-based access control         │
│                                         │
│  3. Data Layer                          │
│     - Password hashing (bcrypt)         │
│     - Input validation (Zod)            │
│     - SQL injection prevention (Prisma) │
│                                         │
│  4. Client Layer                        │
│     - Context isolation (Electron)      │
│     - XSS protection (React)            │
│     - Secure storage                    │
│                                         │
└─────────────────────────────────────────┘
```

## Deployment Architecture

### Development

```
Developer Machine
├── Backend API (localhost:3001)
├── Desktop App (localhost:5173 → Electron)
└── SQLite (local file) + PostgreSQL (local)
```

### Production

```
Cloud Infrastructure
├── Load Balancer
│   └── Multiple API Servers
│       ├── Server 1
│       ├── Server 2
│       └── Server N
│
├── PostgreSQL Cluster
│   ├── Primary DB
│   └── Read Replicas
│
├── Redis Cache (optional)
├── File Storage (S3/Cloudinary)
└── CDN for static assets

Desktop Clients
├── Branch 1 (5 POS terminals)
├── Branch 2 (3 POS terminals)
└── Branch N (N POS terminals)
```

## Technology Stack Visualization

```
Frontend (Desktop)
├── Electron 28        → Cross-platform desktop app
├── React 18           → UI framework
├── TypeScript 5       → Type safety
├── Tailwind CSS 3     → Styling
├── Framer Motion 10   → Animations
├── Zustand 4          → State management
└── React Router 6     → Navigation

Backend
├── Node.js 20         → Runtime
├── Express 4          → Web framework
├── TypeScript 5       → Type safety
├── Prisma 5           → ORM
├── Socket.io 4        → Real-time
├── JWT                → Authentication
├── bcrypt             → Password hashing
└── Winston            → Logging

Database
├── PostgreSQL 15      → Cloud database
├── SQLite             → Local database
└── Prisma Migrate     → Schema migrations

DevOps
├── npm Workspaces     → Monorepo
├── Vite               → Build tool
├── electron-builder   → Desktop packaging
└── Docker (optional)  → Containerization
```

---

This architecture supports:
- ✅ Offline-first operations
- ✅ Real-time updates
- ✅ Multi-branch scaling
- ✅ Role-based security
- ✅ Cross-platform deployment
- ✅ Easy maintenance
- ✅ Future enhancements
