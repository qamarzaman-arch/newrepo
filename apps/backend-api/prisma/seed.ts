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

  // Create admin user only
  const adminPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
  const adminPin = await bcrypt.hash(SEED_ADMIN_PIN, 12);
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
  console.log('✅ Created admin user (PIN: ****) - CHANGE PASSWORD IMMEDIATELY');

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
