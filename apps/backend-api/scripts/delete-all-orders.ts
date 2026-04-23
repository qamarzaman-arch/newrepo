import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllOrders() {
  try {
    console.log('Starting to delete all orders...');

    // Delete all orders (this will cascade delete OrderItem, Payment, KotTicket due to schema)
    const orders = await prisma.order.deleteMany({});
    console.log(`Deleted ${orders.count} orders`);

    console.log('Successfully deleted all orders from database');
  } catch (error) {
    console.error('Error deleting orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllOrders()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
