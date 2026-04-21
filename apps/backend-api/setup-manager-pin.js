/**
 * Setup Script: Initialize Manager PIN
 * 
 * This script sets up the manager PIN in the database settings table.
 * The PIN is stored as a bcrypt hash for security.
 * 
 * Usage:
 *   node setup-manager-pin.js [PIN]
 * 
 * Example:
 *   node setup-manager-pin.js 123456
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupManagerPin(pin) {
  try {
    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 12);

    // Store in settings
    await prisma.setting.upsert({
      where: { key: 'manager_pin' },
      update: { value: hashedPin },
      create: {
        key: 'manager_pin',
        value: hashedPin,
        category: 'security',
      },
    });

    console.log('✅ Manager PIN has been set successfully!');
    console.log('⚠️  Keep this PIN secure and share only with authorized managers.');
  } catch (error) {
    console.error('❌ Error setting manager PIN:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get PIN from command line argument or use default
const pin = process.argv[2] || '123456';

console.log('🔐 Setting up Manager PIN...');
setupManagerPin(pin);
