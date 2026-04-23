import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        hasPin: true,
      },
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.fullName}) - Role: ${user.role}, Active: ${user.isActive}, Has PIN: ${user.hasPin}`);
    });

    // Check specific demo users
    const cashier1 = await prisma.user.findUnique({
      where: { username: 'cashier1' },
      select: { username: true, fullName: true, role: true, isActive: true, pin: true },
    });

    const admin = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { username: true, fullName: true, role: true, isActive: true, pin: true },
    });

    console.log('\nDemo users:');
    console.log('cashier1:', cashier1 ? 'EXISTS' : 'NOT FOUND');
    console.log('admin:', admin ? 'EXISTS' : 'NOT FOUND');

  } catch (error) {
    console.error('Error checking users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
