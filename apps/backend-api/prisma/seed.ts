import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const SEED_ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || 'System Administrator';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@restaurant.local';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const SEED_ADMIN_PIN = process.env.SEED_ADMIN_PIN || '9876';
const SEED_INCLUDE_DEMO_USERS = process.env.SEED_INCLUDE_DEMO_USERS === 'true';
const ALLOW_DESTRUCTIVE_SEED = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';

async function cleanupData() {
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
  await prisma.user.deleteMany({
    where: { username: { not: SEED_ADMIN_USERNAME } },
  });
}

async function ensureUser(input: {
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'RIDER';
  password: string;
  pin: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const pinHash = await bcrypt.hash(input.pin, 12);

  await prisma.user.upsert({
    where: { username: input.username },
    update: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      pin: pinHash,
      isActive: true,
    },
    create: {
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash,
      pin: pinHash,
      isActive: true,
    },
  });
}

async function main() {
  console.log('Seeding database...');
  console.log('WARNING: Use unique credentials outside development.');

  if (ALLOW_DESTRUCTIVE_SEED) {
    console.log('ALLOW_DESTRUCTIVE_SEED=true detected. Cleaning existing data...');
    await cleanupData();
    console.log('Cleanup completed');
  }

  await ensureUser({
    username: SEED_ADMIN_USERNAME,
    email: SEED_ADMIN_EMAIL,
    fullName: SEED_ADMIN_FULL_NAME,
    role: 'ADMIN',
    password: SEED_ADMIN_PASSWORD,
    pin: SEED_ADMIN_PIN,
  });

  console.log(`Admin user ensured: ${SEED_ADMIN_USERNAME}`);

  if (SEED_INCLUDE_DEMO_USERS) {
    const demoUsers = [
      {
        username: 'cashier1',
        email: 'cashier1@restaurant.local',
        fullName: 'Cashier One',
        role: 'CASHIER' as const,
        password: 'cashier123',
        pin: '1234',
      },
      {
        username: 'manager1',
        email: 'manager1@restaurant.local',
        fullName: 'Manager One',
        role: 'MANAGER' as const,
        password: 'manager123',
        pin: '5678',
      },
      {
        username: 'kitchen1',
        email: 'kitchen1@restaurant.local',
        fullName: 'Kitchen Staff',
        role: 'KITCHEN' as const,
        password: 'kitchen123',
        pin: '9999',
      },
      {
        username: 'rider1',
        email: 'rider1@restaurant.local',
        fullName: 'Delivery Rider',
        role: 'RIDER' as const,
        password: 'rider123',
        pin: '8888',
      },
    ];

    for (const demoUser of demoUsers) {
      await ensureUser(demoUser);
    }

    console.log('Demo users seeded because SEED_INCLUDE_DEMO_USERS=true');
  }

  console.log('Database seeding completed');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
