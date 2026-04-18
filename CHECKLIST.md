# Getting Started Checklist

Use this checklist to set up and run the Restaurant POS System.

## Prerequisites Installation

- [ ] **Node.js 20+** installed
  - Download from: https://nodejs.org/
  - Verify: `node --version` (should show v20.x.x or higher)
  - Verify: `npm --version` (should show v10.x.x or higher)

- [ ] **MySQL 8.0+** installed and running
  - Download from: https://dev.mysql.com/downloads/
  - Or use Docker: `docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8`
  - Verify: `mysql --version`

- [ ] **Git** installed (optional, for version control)
  - Download from: https://git-scm.com/
  - Verify: `git --version`

- [ ] **Code Editor** installed
  - Recommended: VS Code https://code.visualstudio.com/
  - Recommended extensions: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense

## Project Setup

### 1. Initial Setup

- [ ] Navigate to project directory
  ```bash
  cd restaurantmanagementsystem
  ```

- [ ] Install root dependencies
  ```bash
  npm install
  ```

### 2. Backend API Setup

- [ ] Navigate to backend directory
  ```bash
  cd apps/backend-api
  ```

- [ ] Install backend dependencies
  ```bash
  npm install
  ```

- [ ] Create environment file
  ```bash
  copy .env.example .env
  ```

- [ ] Edit `.env` file with your database credentials
  ```
  DATABASE_URL="mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/restaurant_pos"
  ```

- [ ] Create MySQL database
  ```bash
  # Using mysql client
  mysql -u root -p
  CREATE DATABASE restaurant_pos;
  exit
  ```

- [ ] Generate Prisma Client
  ```bash
  npx prisma generate
  ```

- [ ] Run database migrations
  ```bash
  npx prisma migrate dev --name init
  ```

- [ ] Seed database with sample data
  ```bash
  npm run seed
  ```

- [ ] Start backend server
  ```bash
  npm run dev
  ```

- [ ] Verify backend is running
  - Open browser: http://localhost:3001/health
  - Should see: `{"status":"OK","timestamp":"...","uptime":...}`

✅ **Backend is ready!**

### 3. Desktop Application Setup

- [ ] Open NEW terminal window

- [ ] Navigate to pos-desktop directory
  ```bash
  cd apps/pos-desktop
  ```

- [ ] Install desktop app dependencies
  ```bash
  npm install
  ```

- [ ] Start development server
  ```bash
  npm run dev
  ```

- [ ] Wait for Electron app to launch
  - Should automatically open
  - If not, open browser: http://localhost:5173

✅ **Desktop app is ready!**

### 4. First Login

- [ ] Login screen appears

- [ ] Enter demo credentials:
  - Username: `admin`
  - Password: `admin123`

- [ ] Click Login button

- [ ] Verify you see the POS screen with menu items

✅ **Successfully logged in!**

## Testing Core Features

### POS Interface

- [ ] **Browse Menu**
  - Click different categories (Appetizers, Main Course, etc.)
  - See menu items change

- [ ] **Search Items**
  - Type in search box (e.g., "coffee")
  - See filtered results

- [ ] **Add Items to Order**
  - Click on any menu item
  - See it appear in order panel (right side)
  - Try adding multiple items

- [ ] **Adjust Quantities**
  - Click + button to increase quantity
  - Click - button to decrease
  - Verify total updates

- [ ] **Add Notes**
  - Click "Add note" on an item
  - Type note (e.g., "No onions")
  - Click Save Note
  - See note badge appear

- [ ] **Remove Items**
  - Click trash icon on an item
  - Item should disappear from order

- [ ] **Checkout**
  - Add several items
  - Click "Checkout" button
  - Payment modal opens

- [ ] **Process Payment**
  - See total amount
  - Click payment method (Cash, Card, Mobile, Split)
  - See success message
  - Order clears

### Navigation

- [ ] **Sidebar Navigation**
  - Click different menu items
  - See different screens (even if stubbed)
  - Verify active state highlights

- [ ] **Top Bar Info**
  - See your username and role
  - See current time updating
  - See online/offline status

- [ ] **Logout**
  - Click Logout button in sidebar
  - Confirm logout
  - Return to login screen

## Verification Checklist

### Backend Verification

- [ ] Server responds at http://localhost:3001/health
- [ ] Can access Prisma Studio: `npx prisma studio` (opens at localhost:5555)
- [ ] Database has sample data (check via Prisma Studio)
- [ ] No errors in terminal

### Frontend Verification

- [ ] Electron app launches
- [ ] Login screen displays correctly
- [ ] Can login with demo credentials
- [ ] POS screen shows menu categories
- [ ] Can add items to order
- [ ] Total calculates correctly
- [ ] Payment modal opens
- [ ] Animations are smooth

### Database Verification

- [ ] Users table has admin user
- [ ] Menu categories exist (5 categories)
- [ ] Menu items exist (16 items)
- [ ] Tables exist (12 tables)
- [ ] Sample customers exist (5 customers)

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Verify MySQL is running
2. Check DATABASE_URL in `.env`
3. Ensure database `restaurant_pos` exists
4. Test connection: `mysql -u YOUR_USER -p -e "USE restaurant_pos;"`

### Issue: "Port 3001 already in use"

**Solution:**
1. Find process using port: `netstat -ano | findstr :3001` (Windows) or `lsof -i :3001` (Mac/Linux)
2. Kill the process or change port in `.env`: `PORT=3002`

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Electron app doesn't open

**Solution:**
1. Check if Vite started: Look for "Local: http://localhost:5173"
2. Manually open browser to http://localhost:5173
3. Check console for errors
4. Restart dev server

### Issue: Login doesn't work

**Solution:**
1. Verify backend is running (http://localhost:3001/health)
2. Check browser console for errors
3. Verify database was seeded: `npm run seed`
4. Clear localStorage in browser DevTools

### Issue: Menu items don't show

**Solution:**
1. Check network tab in DevTools for API errors
2. Verify backend is running
3. Check database has menu items (Prisma Studio)
4. Console log the API response

## Next Steps After Setup

### Immediate (Today)

- [ ] Explore all working features
- [ ] Read QUICKSTART.md for overview
- [ ] Read PROJECT_SUMMARY.md for complete picture
- [ ] Check DATABASE_SCHEMA.md for data models

### This Week

- [ ] Implement Orders screen
- [ ] Build Kitchen Display System
- [ ] Add Table Management UI
- [ ] Customize menu with your items

### This Month

- [ ] Complete all core screens
- [ ] Implement offline sync
- [ ] Add receipt printing
- [ ] Test with real restaurant workflow

## Helpful Commands

```bash
# Backend
cd apps/backend-api
npm run dev           # Start dev server
npx prisma studio     # Database GUI
npx prisma migrate    # Run migrations
npm run seed          # Seed database

# Desktop App
cd apps/pos-desktop
npm run dev           # Start dev server
npm run build         # Build for production

# Both (from root)
npm run dev           # Start backend only
npm run dev:pos       # Start desktop only
```

## Resources

- 📖 **Full Documentation:** README.md
- 🏗️ **Architecture:** ARCHITECTURE.md
- 💾 **Database:** DATABASE_SCHEMA.md
- 🚀 **Quick Start:** QUICKSTART.md
- 📋 **Implementation:** IMPLEMENTATION_GUIDE.md
- 📊 **Summary:** PROJECT_SUMMARY.md
- 🔄 **System Overview:** docs/SYSTEM_OVERVIEW.md

## Support

- Check existing GitHub issues
- Read documentation thoroughly
- Review code comments
- Contact project maintainer

---

## Success Criteria ✅

You've successfully set up the system when:

1. ✅ Backend API running on port 3001
2. ✅ Desktop app launches and displays
3. ✅ Can login with admin/admin123
4. ✅ POS screen shows menu items
5. ✅ Can create orders and checkout
6. ✅ No console errors
7. ✅ Database has sample data
8. ✅ All animations smooth

**Congratulations! Your Restaurant POS System is ready for customization! 🎉**

---

**Remember:** The foundation is solid. Everything works. Now it's about adding your specific business logic and customizing for your needs.

Happy coding! 💻🍽️
