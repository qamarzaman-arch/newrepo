# Quick Start Guide

Get the Restaurant POS System up and running in 5 minutes!

## Prerequisites Checklist

- [ ] Node.js 20+ installed ([Download](https://nodejs.org/))
- [ ] PostgreSQL 15+ installed and running ([Download](https://www.postgresql.org/download/))
- [ ] Git installed (optional)
- [ ] Code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Navigate to project directory
cd restaurantmanagementsystem

# Install all dependencies
npm install
```

### 2. Setup Database

```bash
# Make sure PostgreSQL is running
# Then navigate to backend API
cd apps/backend-api

# Copy environment file
copy .env.example .env

# Edit .env file with your database credentials
# Update this line:
# DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/restaurant_pos"

# Generate Prisma Client
npx prisma generate

# Run database migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Seed database with sample data
npm run seed
```

### 3. Start Backend API

```bash
# From apps/backend-api directory
npm run dev

# You should see:
# "Server running on port 3001"
```

Keep this terminal running!

### 4. Start Desktop Application

Open a **new terminal** window:

```bash
# Navigate to pos-desktop
cd apps/pos-desktop

# Install dependencies (if not done already)
npm install

# Start development server
npm run dev
```

The Electron app should launch automatically!

### 5. Login

Use these demo credentials:
- **Username**: admin
- **Password**: admin123

## Verify Installation

✅ Backend API running on `http://localhost:3001`
✅ Desktop app launched and showing login screen
✅ Can login successfully
✅ POS screen displays with menu items
✅ Can add items to order
✅ Can process checkout

## Common Issues

### "Cannot connect to database"

**Solution:**
1. Verify PostgreSQL is running
2. Check DATABASE_URL in `.env` file
3. Create database manually if needed:
   ```sql
   CREATE DATABASE restaurant_pos;
   ```

### "Port 3001 already in use"

**Solution:**
Change port in `.env`:
```
PORT=3002
```

### "Module not found" errors

**Solution:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Electron app doesn't open

**Solution:**
```bash
# Check if Vite is running
# Should be on http://localhost:5173

# Manually open browser to http://localhost:5173
# Or restart the dev server
```

## Next Steps

1. **Explore the POS Interface**
   - Add items to order
   - Try different payment methods
   - Add notes to items

2. **Configure Your Restaurant**
   - Add menu categories and items
   - Set up tables
   - Configure tax rates
   - Add staff accounts

3. **Test Offline Mode**
   - Disconnect internet
   - Create orders
   - Reconnect and verify sync

4. **Read Documentation**
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System design
   - [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database structure
   - [README.md](README.md) - Full documentation

## Development Tips

### Hot Reload
Both backend and frontend support hot reload. Changes will appear automatically!

### Database GUI
Use Prisma Studio to view/edit database:
```bash
cd apps/backend-api
npx prisma studio
```

### API Testing
Test API endpoints with:
- Postman
- Thunder Client (VS Code extension)
- curl commands

### Debugging
- Frontend: Chrome DevTools (auto-opens in dev mode)
- Backend: Check terminal logs
- Electron: DevTools available in development

## Getting Help

- 📖 Read full documentation in README.md
- 🐛 Report issues on GitHub
- 💬 Check existing issues for solutions
- 📧 Contact support

---

Happy coding! 🚀
