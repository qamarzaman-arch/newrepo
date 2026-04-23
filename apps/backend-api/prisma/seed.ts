import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const SEED_ADMIN_PIN = process.env.SEED_ADMIN_PIN || '9876';

async function main() {
  console.log('🌱 Seeding database...');
  console.log('⚠️  WARNING: Change default password after first login!');

  // Delete all data from all tables (cascade deletes)
  console.log('🗑️  Cleaning up existing data...');
  
  await prisma.kotTicket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.comboItem.deleteMany();
  await prisma.combo.deleteMany();
  await prisma.menuItemTag.deleteMany();
  await prisma.itemModifier.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.table.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.staffPerformance.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.surcharge.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.cashDrawer.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.device.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockAlert.deleteMany();
  await prisma.syncQueue.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.reportCache.deleteMany();
  
  // Delete all users except admin (will be recreated)
  await prisma.user.deleteMany({
    where: { username: { not: 'admin' } }
  });
  
  console.log('✅ Cleanup completed');

  // Create demo users with credentials matching the frontend LoginScreen
  
  // Admin user: admin / admin123 / PIN: 0000
  const adminPassword = await bcrypt.hash('admin123', 12);
  const adminPin = await bcrypt.hash('0000', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      pin: adminPin,
      passwordHash: adminPassword,
      isActive: true,
    },
    create: {
      username: 'admin',
      email: 'admin@restaurant.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      phone: '+1234567890',
      pin: adminPin,
    },
  });
  console.log('✅ Created admin user (admin / admin123 / PIN: 0000)');

  // Cashier user: cashier1 / cashier123 / PIN: 1234
  const cashierPassword = await bcrypt.hash('cashier123', 12);
  const cashierPin = await bcrypt.hash('1234', 12);
  await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {
      pin: cashierPin,
      passwordHash: cashierPassword,
      isActive: true,
    },
    create: {
      username: 'cashier1',
      email: 'cashier1@restaurant.com',
      passwordHash: cashierPassword,
      fullName: 'Cashier One',
      role: 'CASHIER',
      phone: '+1234567891',
      pin: cashierPin,
    },
  });
  console.log('✅ Created cashier1 user (cashier1 / cashier123 / PIN: 1234)');

  // Manager user: manager1 / manager123 / PIN: 5678
  const managerPassword = await bcrypt.hash('manager123', 12);
  const managerPin = await bcrypt.hash('5678', 12);
  await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {
      pin: managerPin,
      passwordHash: managerPassword,
      isActive: true,
    },
    create: {
      username: 'manager1',
      email: 'manager@restaurant.com',
      passwordHash: managerPassword,
      fullName: 'Manager One',
      role: 'MANAGER',
      phone: '+1234567892',
      pin: managerPin,
    },
  });
  console.log('✅ Created manager1 user (manager1 / manager123 / PIN: 5678)');

  // Kitchen user: kitchen1 / kitchen123 / PIN: 9999
  const kitchenPassword = await bcrypt.hash('kitchen123', 12);
  const kitchenPin = await bcrypt.hash('9999', 12);
  await prisma.user.upsert({
    where: { username: 'kitchen1' },
    update: {
      pin: kitchenPin,
      passwordHash: kitchenPassword,
      isActive: true,
    },
    create: {
      username: 'kitchen1',
      email: 'kitchen@restaurant.com',
      passwordHash: kitchenPassword,
      fullName: 'Kitchen Staff',
      role: 'KITCHEN',
      phone: '+1234567893',
      pin: kitchenPin,
    },
  });
  console.log('✅ Created kitchen1 user (kitchen1 / kitchen123 / PIN: 9999)');

  // Rider user: rider1 / rider123 / PIN: 8888
  const riderPassword = await bcrypt.hash('rider123', 12);
  const riderPin = await bcrypt.hash('8888', 12);
  await prisma.user.upsert({
    where: { username: 'rider1' },
    update: {
      pin: riderPin,
      passwordHash: riderPassword,
      isActive: true,
    },
    create: {
      username: 'rider1',
      email: 'rider@restaurant.com',
      passwordHash: riderPassword,
      fullName: 'Delivery Rider',
      role: 'RIDER',
      phone: '+1234567894',
      pin: riderPin,
    },
  });
  console.log('✅ Created rider1 user (rider1 / rider123 / PIN: 8888)');

  console.log('\n⚠️  WARNING: These are demo credentials. Change them immediately in production!');
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
