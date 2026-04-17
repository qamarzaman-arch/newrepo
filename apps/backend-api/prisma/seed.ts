import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@restaurant.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
      phone: '+1234567890',
    },
  });
  console.log('✅ Created admin user');

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

  // Create menu items
  const menuItems = [
    { categoryId: categories[0].id, name: 'Caesar Salad', price: 8.99, cost: 3.50, description: 'Fresh romaine lettuce with parmesan cheese' },
    { categoryId: categories[0].id, name: 'Spring Rolls', price: 6.99, cost: 2.50, description: 'Crispy vegetable spring rolls' },
    { categoryId: categories[0].id, name: 'Garlic Bread', price: 5.99, cost: 2.00, description: 'Toasted bread with garlic butter' },
    { categoryId: categories[1].id, name: 'Grilled Steak', price: 24.99, cost: 10.00, description: 'Premium beef steak with herbs' },
    { categoryId: categories[1].id, name: 'Chicken Curry', price: 16.99, cost: 6.50, description: 'Spicy chicken curry with rice' },
    { categoryId: categories[1].id, name: 'Pasta Carbonara', price: 14.99, cost: 5.50, description: 'Creamy pasta with bacon and egg' },
    { categoryId: categories[1].id, name: 'Fish & Chips', price: 15.99, cost: 6.00, description: 'Beer-battered fish with fries' },
    { categoryId: categories[2].id, name: 'Chocolate Cake', price: 7.99, cost: 3.00, description: 'Rich chocolate layer cake' },
    { categoryId: categories[2].id, name: 'Ice Cream', price: 5.99, cost: 2.00, description: 'Vanilla bean ice cream' },
    { categoryId: categories[2].id, name: 'Tiramisu', price: 8.99, cost: 3.50, description: 'Classic Italian dessert' },
    { categoryId: categories[3].id, name: 'Coffee', price: 3.99, cost: 1.00, description: 'Freshly brewed coffee' },
    { categoryId: categories[3].id, name: 'Fresh Juice', price: 4.99, cost: 1.50, description: 'Orange or apple juice' },
    { categoryId: categories[3].id, name: 'Smoothie', price: 6.99, cost: 2.50, description: 'Mixed fruit smoothie' },
    { categoryId: categories[4].id, name: 'French Fries', price: 4.99, cost: 1.50, description: 'Crispy golden fries' },
    { categoryId: categories[4].id, name: 'Onion Rings', price: 5.99, cost: 2.00, description: 'Beer-battered onion rings' },
    { categoryId: categories[4].id, name: 'Garden Salad', price: 6.99, cost: 2.50, description: 'Mixed greens with dressing' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        ...item,
        sku: `ITEM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        prepTimeMinutes: 15,
        taxRate: 0,
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
    await prisma.customer.create({
      data: {
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
    await prisma.setting.create({
      data: setting,
    });
  }
  console.log('✅ Created settings');

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
