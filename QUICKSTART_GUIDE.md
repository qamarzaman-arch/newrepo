# Quick Start Guide - POSLytic

Get your restaurant POS system up and running in 5 minutes!

---

## ⚡ Super Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
# From project root
npm install

# Install backend
cd apps/backend-api
npm install

# Install desktop app
cd ../pos-desktop
npm install
cd ..
```

### Step 2: Setup Database

```bash
cd apps/backend-api

# Generate Prisma client
npx prisma generate

# Create and seed database
npx prisma migrate dev --name init
npx prisma db seed
```

### Step 3: Start the Application

**Option A: Run both together (Recommended)**
```bash
# From project root
npm run dev
```

**Option B: Run separately**

Terminal 1:
```bash
cd apps/backend-api
npm run dev
```

Terminal 2:
```bash
cd apps/pos-desktop
npm run electron:dev
```

### Step 4: Login

- **Username**: `admin`
- **Password**: `admin123`

🎉 **You're ready to go!**

---

## 📋 First-Time Setup Checklist

After logging in, complete these steps:

### 1. Change Admin Password
- Go to **Settings → Security**
- Update your password
- Enable two-factor authentication (optional)

### 2. Configure Restaurant Info
- Go to **Settings → General**
- Enter restaurant name, address, phone
- Set timezone and language

### 3. Set Up Tax Rates
- Go to **Settings → Business Rules**
- Configure tax rate (e.g., 8.5%)
- Set service charge if applicable

### 4. Add Payment Methods
- Go to **Settings → Payment Methods**
- Enable accepted payment types:
  - ✅ Cash
  - ✅ Credit/Debit Cards
  - ✅ Mobile Wallets
  - ✅ Gift Cards

### 5. Configure Hardware (Optional)
- Go to **Settings → Hardware & Devices**
- Set up thermal printer
- Connect cash drawer
- Configure barcode scanner
- Test all devices

### 6. Create Menu Categories
- Go to **Menu Management**
- Click "Add Category"
- Create categories like:
  - Appetizers
  - Main Courses
  - Desserts
  - Beverages

### 7. Add Menu Items
- For each category, add items
- Set prices and descriptions
- Upload item images (optional)
- Mark availability

### 8. Create Staff Accounts
- Go to **Staff Management**
- Add cashier accounts
- Add kitchen staff accounts
- Assign roles and permissions

### 9. Set Up Tables (For Dine-In)
- Go to **Tables & Reservations**
- Create floor plan
- Add tables with numbers/capacity
- Mark table status

### 10. Test Complete Workflow
1. Switch to Cashier role
2. Create a test order
3. Send to kitchen
4. Mark as complete from KDS
5. Process payment
6. Print receipt

---

## 🎯 Common Tasks

### Creating an Order (Cashier)

1. Click **POS Terminal** or press `Ctrl+P`
2. Select order type:
   - 🍽️ Dine-in (select table)
   - 🥡 Takeaway
   - 🚚 Delivery
3. Browse menu and tap items
4. Add special instructions if needed
5. Click **Send to Kitchen** or **Checkout**
6. Process payment
7. Print receipt

### Managing Kitchen Orders

1. Open **Kitchen Display** (Kitchen staff only)
2. View incoming tickets
3. Tap ticket to mark "In Progress"
4. Tap again when complete
5. Monitor timing and delays

### Viewing Reports

1. Go to **Financial Reports**
2. Select report type:
   - Sales Summary
   - Product Performance
   - Employee Performance
   - Inventory Status
3. Choose date range
4. Export to PDF/Excel

### Processing Refunds

1. Go to **Orders**
2. Find the order
3. Click **View Details**
4. Click **Process Refund**
5. Enter refund amount and reason
6. Confirm (requires manager PIN)

---

## 🔧 Troubleshooting

### App Won't Start

**Problem**: Desktop app shows blank screen

**Solution**:
```bash
# Check if backend is running
curl http://localhost:3001/health

# If not running, start backend
cd apps/backend-api
npm run dev

# Restart desktop app
cd apps/pos-desktop
npm run electron:dev
```

### Database Errors

**Problem**: "Database not found" or migration errors

**Solution**:
```bash
cd apps/backend-api

# Reset database
rm prisma/dev.db
npx prisma migrate dev
npx prisma db seed
```

### Printer Not Working

**Problem**: Receipts won't print

**Solution**:
1. Check printer is powered on and connected
2. Go to **Settings → Hardware**
3. Verify device path or IP address
4. Click "Test Connection"
5. Check printer paper and ink

### Can't Login

**Problem**: "Invalid credentials" error

**Solution**:
1. Default credentials: `admin` / `admin123`
2. If changed and forgotten, reset database:
   ```bash
   cd apps/backend-api
   rm prisma/dev.db
   npx prisma migrate dev
   npx prisma db seed
   ```

### Slow Performance

**Problem**: App feels sluggish

**Solution**:
1. Close unnecessary applications
2. Check system resources (Task Manager)
3. Clear browser cache (if using web version)
4. Restart the application
5. Check network connection (for cloud sync)

---

## 💡 Pro Tips

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Open POS Terminal |
| `Ctrl+O` | View Orders |
| `Ctrl+M` | Menu Management |
| `Ctrl+R` | Reports |
| `Ctrl+S` | Settings |
| `F5` | Refresh Data |
| `Esc` | Go Back |

### Speed Tips for Cashiers

1. **Use Search**: Type item names instead of browsing
2. **Favorites**: Pin frequently sold items
3. **Quick Keys**: Use number pad for quantities
4. **Templates**: Save common order combinations
5. **Barcode Scanning**: Scan items directly into cart

### Best Practices

1. **End-of-Day Routine**:
   - Close all open orders
   - Run Z-report (daily summary)
   - Count cash drawer
   - Backup database
   - Clean printers

2. **Inventory Management**:
   - Update stock levels daily
   - Set low-stock alerts
   - Review usage reports weekly
   - Place purchase orders before stockouts

3. **Staff Management**:
   - Schedule shifts in advance
   - Track employee performance
   - Review labor costs weekly
   - Provide regular training

---

## 📞 Need Help?

- 📖 **Full Documentation**: [README.md](./README.md)
- 🐛 **Report Bugs**: [GitHub Issues](https://github.com/yourusername/restaurantmanagementsystem/issues)
- 💬 **Community**: [Discussions](https://github.com/yourusername/restaurantmanagementsystem/discussions)
- 📧 **Support**: support@poslytic.com

---

## 🎓 Next Steps

Now that you're set up:

1. ✅ Read the [User Guide](./docs/USER_GUIDE.md)
2. ✅ Explore [API Documentation](./docs/API_REFERENCE.md)
3. ✅ Watch [Video Tutorials](https://youtube.com/poslytic)
4. ✅ Join our [Community Forum](https://community.poslytic.com)
5. ✅ Follow us on [Twitter](https://twitter.com/poslytic)

---

**Happy Selling! 🎉**

*POSLytic Team*
