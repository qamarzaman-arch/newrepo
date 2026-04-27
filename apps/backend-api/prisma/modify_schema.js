const fs = require('fs');
let code = fs.readFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\prisma\\schema.prisma', 'utf8');

code = code.replace(/tableLocks\s+TableLock\[\]\r?\n\s+orderModifications OrderModificationHistory\[\]\r?\n\r?\n\s+@@index\(\[username\]\)/g, `tableLocks    TableLock[]\n  orderModifications OrderModificationHistory[]\n  openedDrawers      CashDrawer[]       @relation("CashDrawerOpenedBy")\n  closedDrawers      CashDrawer[]       @relation("CashDrawerClosedBy")\n  stockMovements     StockMovement[]    @relation("StockMovementPerformedBy")\n  stockAdjustments   StockAdjustment[]  @relation("StockAdjustmentAdjustedBy")\n  approvedExpenses   Expense[]          @relation("ExpenseApprovedBy")\n\n  @@index([username])`);

code = code.replace(/performedById\s+String\?\r?\n\s+createdAt\s+DateTime\s+@default\(now\(\)\)/g, `performedById     String?\n  performedBy       User?    @relation("StockMovementPerformedBy", fields: [performedById], references: [id])\n  createdAt         DateTime @default(now())`);

code = code.replace(/adjustedById\s+String\r?\n\s+createdAt\s+DateTime\s+@default\(now\(\)\)/g, `adjustedById      String\n  adjustedBy        User     @relation("StockAdjustmentAdjustedBy", fields: [adjustedById], references: [id])\n  createdAt         DateTime @default(now())`);

code = code.replace(/approvedById\s+String\?\r?\n\s+createdById\s+String/g, `approvedById String?\n  approvedBy   User?           @relation("ExpenseApprovedBy", fields: [approvedById], references: [id])\n  createdById  String`);

code = code.replace(/openedById\s+String\r?\n\s+closedById\s+String\?/g, `openedById    String\n  openedBy      User     @relation("CashDrawerOpenedBy", fields: [openedById], references: [id])\n  closedById    String?\n  closedBy      User?    @relation("CashDrawerClosedBy", fields: [closedById], references: [id])`);

fs.writeFileSync('c:\\Users\\techl\\OneDrive - Techlogix\\Documents\\RMS\\newrepo\\apps\\backend-api\\prisma\\schema.prisma', code);
