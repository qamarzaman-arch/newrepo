import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const SEED_ADMIN_PIN = process.env.SEED_ADMIN_PIN || '9876';
const SEED_CASHIER_PASSWORD = process.env.SEED_CASHIER_PASSWORD || 'ChangeMe123!';
const SEED_CASHIER_PIN = process.env.SEED_CASHIER_PIN || '5678';
const SEED_MANAGER_PASSWORD = process.env.SEED_MANAGER_PASSWORD || 'ChangeMe123!';
const SEED_MANAGER_PIN = process.env.SEED_MANAGER_PIN || '4567';

async function main() {
  console.log('🌱 Seeding database...');
  console.log('⚠️  WARNING: Change default passwords after first login!');

  const requirePasswordChange = true;

  // Create admin user
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

  // Create cashier users
  const cashierPassword = await bcrypt.hash(SEED_CASHIER_PASSWORD, 12);
  const cashierPin1 = await bcrypt.hash(SEED_CASHIER_PIN, 12);
  await prisma.user.upsert({
    where: { username: 'cashier' },
    update: { 
      pin: cashierPin1,
      passwordHash: cashierPassword,
    },
    create: {
      username: 'cashier',
      email: 'cashier@restaurant.com',
      passwordHash: cashierPassword,
      fullName: 'Default Cashier',
      role: 'CASHIER',
      phone: '+1234567899',
      pin: cashierPin1,
    },
  });
  console.log('✅ Created cashier user (PIN: ****) - CHANGE PASSWORD IMMEDIATELY');

  await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {},
    create: {
      username: 'cashier1',
      email: 'cashier1@restaurant.com',
      passwordHash: cashierPassword,
      fullName: 'John Cashier',
      role: 'CASHIER',
      phone: '+1234567891',
    },
  });
  console.log('✅ Created cashier1 user (No PIN - requires setup)');

  await prisma.user.upsert({
    where: { username: 'cashier2' },
    update: {},
    create: {
      username: 'cashier2',
      email: 'cashier2@restaurant.com',
      passwordHash: cashierPassword,
      fullName: 'Sarah Cashier',
      role: 'CASHIER',
      phone: '+1234567892',
    },
  });
  console.log('✅ Created cashier2 user (No PIN - requires setup)');

  // Create manager user
  const managerPassword = await bcrypt.hash(SEED_MANAGER_PASSWORD, 12);
  const managerPin = await bcrypt.hash(SEED_MANAGER_PIN, 12);
  await prisma.user.upsert({
    where: { username: 'manager' },
    update: { 
      pin: managerPin,
      passwordHash: managerPassword,
    },
    create: {
      username: 'manager',
      email: 'manager@restaurant.com',
      passwordHash: managerPassword,
      fullName: 'Mike Manager',
      role: 'MANAGER',
      phone: '+1234567893',
      pin: managerPin,
    },
  });
  console.log('✅ Created manager user (PIN: ****) - CHANGE PASSWORD IMMEDIATELY');

  // Create kitchen staff user
  const SEED_KITCHEN_PASSWORD = process.env.SEED_KITCHEN_PASSWORD || 'ChangeMe123!';
  const kitchenPassword = await bcrypt.hash(SEED_KITCHEN_PASSWORD, 12);
  const kitchenPassword = await bcrypt.hash('kitchen123', 12);
  await prisma.user.upsert({
    where: { username: 'kitchen' },
    update: {},
    create: {
      username: 'kitchen',
      email: 'kitchen@restaurant.com',
      passwordHash: kitchenPassword,
      fullName: 'Chef Kitchen',
      role: 'KITCHEN',
      phone: '+1234567894',
    },
  });
  console.log('✅ Created kitchen user (No PIN)');

  // Create menu categories
  const categories = await Promise.all([
    prisma.menuCategory.create({
      data: {
        name: 'Appetizers',
        description: 'Start your meal right',
        displayOrder: 1,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Main Course',
        description: 'Hearty and satisfying',
        displayOrder: 2,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Desserts',
        description: 'Sweet endings',
        displayOrder: 3,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Beverages',
        description: 'Refreshing drinks',
        displayOrder: 4,
      },
    }),
    prisma.menuCategory.create({
      data: {
        name: 'Sides',
        description: 'Perfect complements',
        displayOrder: 5,
      },
    }),
  ]);
  console.log('✅ Created menu categories');

  // Create menu items with emoji images
  const menuItems = [
    { categoryId: categories[0].id, name: 'Caesar Salad', price: 8.99, cost: 3.50, description: 'Fresh romaine lettuce with parmesan cheese', image: '🥗' },
    { categoryId: categories[0].id, name: 'Spring Rolls', price: 6.99, cost: 2.50, description: 'Crispy vegetable spring rolls', image: '🌯' },
    { categoryId: categories[0].id, name: 'Garlic Bread', price: 5.99, cost: 2.00, description: 'Toasted bread with garlic butter', image: '🍞' },
    { categoryId: categories[1].id, name: 'Grilled Steak', price: 24.99, cost: 10.00, description: 'Premium beef steak with herbs', image: '🥩' },
    { categoryId: categories[1].id, name: 'Chicken Curry', price: 16.99, cost: 6.50, description: 'Spicy chicken curry with rice', image: '🍛' },
    { categoryId: categories[1].id, name: 'Pasta Carbonara', price: 14.99, cost: 5.50, description: 'Creamy pasta with bacon and egg', image: '🍝' },
    { categoryId: categories[1].id, name: 'Fish & Chips', price: 15.99, cost: 6.00, description: 'Beer-battered fish with fries', image: '🐟' },
    { categoryId: categories[2].id, name: 'Chocolate Cake', price: 7.99, cost: 3.00, description: 'Rich chocolate layer cake', image: '🍰' },
    { categoryId: categories[2].id, name: 'Ice Cream', price: 5.99, cost: 2.00, description: 'Vanilla bean ice cream', image: '🍦' },
    { categoryId: categories[2].id, name: 'Tiramisu', price: 8.99, cost: 3.50, description: 'Classic Italian dessert', image: '🧁' },
    { categoryId: categories[3].id, name: 'Coffee', price: 3.99, cost: 1.00, description: 'Freshly brewed coffee', image: '☕' },
    { categoryId: categories[3].id, name: 'Fresh Juice', price: 4.99, cost: 1.50, description: 'Orange or apple juice', image: '🧃' },
    { categoryId: categories[3].id, name: 'Smoothie', price: 6.99, cost: 2.50, description: 'Mixed fruit smoothie', image: '🥤' },
    { categoryId: categories[4].id, name: 'French Fries', price: 4.99, cost: 1.50, description: 'Crispy golden fries', image: '🍟' },
    { categoryId: categories[4].id, name: 'Onion Rings', price: 5.99, cost: 2.00, description: 'Beer-battered onion rings', image: '🧅' },
    { categoryId: categories[4].id, name: 'Garden Salad', price: 6.99, cost: 2.50, description: 'Mixed greens with dressing', image: '🥬' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        ...item,
        sku: `ITEM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        prepTimeMinutes: 15,
        taxRate: 0,
        isAvailable: true,
        isActive: true,
      },
    });
  }
  console.log('✅ Created menu items');

  // Create tables
  const tableLocations = ['Main Hall', 'Patio', 'Bar Area'];
  for (let i = 1; i <= 12; i++) {
    await prisma.table.create({
      data: {
        number: `T${i}`,
        capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
        location: tableLocations[i % 3],
        shape: i % 3 === 0 ? 'rectangular' : 'round',
        posX: (i % 4) * 200,
        posY: Math.floor(i / 4) * 200,
        width: 150,
        height: 150,
      },
    });
  }
  console.log('✅ Created tables');

  // Create sample customers
  for (let i = 1; i <= 5; i++) {
    await prisma.customer.upsert({
      where: { phone: `+12345678${String(i).padStart(2, '0')}` },
      update: {},
      create: {
        firstName: `Customer${i}`,
        lastName: 'Test',
        email: `customer${i}@example.com`,
        phone: `+12345678${String(i).padStart(2, '0')}`,
        loyaltyPoints: i * 100,
        totalOrders: i * 5,
        totalSpent: i * 250,
      },
    });
  }
  console.log('✅ Created sample customers');

  // Create settings
  const settings = [
    { key: 'restaurant_name', value: 'My Restaurant', category: 'general' },
    { key: 'tax_rate', value: '0', category: 'financial' },
    { key: 'currency', value: 'USD', category: 'general' },
    { key: 'loyalty_points_per_dollar', value: '10', category: 'loyalty' },
    { key: 'auto_print_kot', value: 'true', category: 'kitchen' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Created settings');

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'Fresh Farm Produce',
        contactName: 'Alice Green',
        email: 'alice@freshfarm.com',
        phone: '+15550101',
        city: 'Green Valley',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Premium Meat Co.',
        contactName: 'Bob Butcher',
        email: 'bob@premiummeat.com',
        phone: '+15550102',
        city: 'Meatville',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Beverage Plus',
        contactName: 'Charlie Drinks',
        email: 'charlie@bevplus.com',
        phone: '+15550103',
        city: 'Soda Springs',
      },
    }),
  ]);
  console.log('✅ Created vendors');

  // Create inventory items
  const inventoryItems = [
    { name: 'Romaine Lettuce', category: 'Produce', unit: 'kg', currentStock: 25, minStock: 10, costPerUnit: 2.50, supplierId: vendors[0].id },
    { name: 'Parmesan Cheese', category: 'Dairy', unit: 'kg', currentStock: 5, minStock: 2, costPerUnit: 15.00, supplierId: vendors[0].id },
    { name: 'Beef Strips', category: 'Meat', unit: 'kg', currentStock: 40, minStock: 15, costPerUnit: 12.00, supplierId: vendors[1].id },
    { name: 'Chicken Breast', category: 'Meat', unit: 'kg', currentStock: 30, minStock: 12, costPerUnit: 8.00, supplierId: vendors[1].id },
    { name: 'Coffee Beans', category: 'Dry Goods', unit: 'kg', currentStock: 15, minStock: 5, costPerUnit: 18.00, supplierId: vendors[2].id },
    { name: 'Milk', category: 'Dairy', unit: 'L', currentStock: 2, minStock: 10, costPerUnit: 1.50, supplierId: vendors[0].id }, // LOW STOCK
    { name: 'Flour', category: 'Dry Goods', unit: 'kg', currentStock: 0, minStock: 20, costPerUnit: 1.20, supplierId: vendors[2].id }, // OUT OF STOCK
  ];

  for (const item of inventoryItems) {
    const { supplierId, ...otherFields } = item;
    await prisma.inventoryItem.create({
      data: {
        ...otherFields,
        maxStock: item.minStock * 5,
        status: item.currentStock <= 0 ? 'OUT_OF_STOCK' : (item.currentStock <= item.minStock ? 'LOW_STOCK' : 'IN_STOCK'),
        sku: `INV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        supplier: { connect: { id: supplierId } },
      },
    });
  }
  console.log('✅ Created inventory items');

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
