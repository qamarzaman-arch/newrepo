/**
 * QA D33: production-safe defaults seed.
 *
 * Unlike `seed.ts`, this script is *idempotent* and *non-destructive* — it
 * only inserts rows that don't already exist. Run it on first deploy and
 * after major upgrades to ensure critical baseline data is present:
 *   - default Settings (currency, timezone, tax rate, etc.)
 *   - default TaxRate row
 *   - default Surcharge (none)
 *   - default FeatureAccess matrix
 *   - default Branch (head office)
 *
 * Usage: ts-node prisma/seed-defaults.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SETTINGS: Array<{ key: string; value: string; category: string }> = [
  { key: 'restaurant_name', value: 'POSLytic Restaurant', category: 'general' },
  { key: 'restaurant_address', value: '', category: 'general' },
  { key: 'restaurant_phone', value: '', category: 'general' },
  { key: 'restaurant_email', value: '', category: 'general' },
  { key: 'currency', value: 'PKR', category: 'business' },
  { key: 'timezone', value: 'Asia/Karachi', category: 'business' },
  { key: 'tax_rate', value: '0', category: 'tax' },
  { key: 'service_charge_rate', value: '0', category: 'tax' },
  { key: 'loyalty_points_per_dollar', value: '1', category: 'loyalty' },
  { key: 'loyalty_min_spend', value: '0', category: 'loyalty' },
  { key: 'loyalty_points_value', value: '0.01', category: 'loyalty' },
  { key: 'low_stock_threshold', value: '10', category: 'inventory' },
];

const DEFAULT_FEATURES = [
  'orders', 'kitchen', 'inventory', 'vendors', 'customers', 'staff',
  'attendance', 'delivery', 'tables', 'menu', 'reports', 'financial', 'settings',
];
const DEFAULT_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'RIDER', 'CASHIER'];

function defaultEnabled(role: string, feature: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER') return feature !== 'settings';
  if (role === 'CASHIER') return ['orders', 'menu', 'tables', 'kitchen', 'customers', 'delivery', 'attendance'].includes(feature);
  if (role === 'STAFF') return ['orders', 'kitchen', 'tables', 'customers', 'attendance'].includes(feature);
  if (role === 'RIDER') return ['delivery', 'attendance'].includes(feature);
  return false;
}

async function seedSettings() {
  let created = 0;
  for (const s of DEFAULT_SETTINGS) {
    const existing = await prisma.setting.findUnique({ where: { key: s.key } });
    if (existing) continue;
    await prisma.setting.create({ data: s });
    created += 1;
  }
  console.log(`Settings: ${created} created, ${DEFAULT_SETTINGS.length - created} already existed`);
}

async function seedTaxRate() {
  const count = await prisma.taxRate.count();
  if (count > 0) {
    console.log('TaxRate: already populated, skipping');
    return;
  }
  await prisma.taxRate.create({
    data: { name: 'Standard Tax', rate: 0, isActive: true, isInclusive: false },
  });
  console.log('TaxRate: seeded default 0% rate');
}

async function seedFeatureAccess() {
  let created = 0;
  for (const feature of DEFAULT_FEATURES) {
    for (const role of DEFAULT_ROLES) {
      const existing = await prisma.featureAccess.findUnique({
        where: { feature_role: { feature, role } },
      });
      if (existing) continue;
      await prisma.featureAccess.create({
        data: { feature, role, enabled: defaultEnabled(role, feature) },
      });
      created += 1;
    }
  }
  console.log(`FeatureAccess: ${created} rows created`);
}

async function seedHeadOffice() {
  const existing = await prisma.branch.findFirst({ where: { isHeadOffice: true } });
  if (existing) {
    console.log('Branch: head office already exists, skipping');
    return;
  }
  await prisma.branch.create({
    data: {
      name: 'Head Office',
      code: 'HO',
      isHeadOffice: true,
      isActive: true,
      timezone: 'Asia/Karachi',
      currency: 'PKR',
    },
  });
  console.log('Branch: created Head Office');
}

async function main() {
  console.log('Seeding production-safe defaults...');
  await seedSettings();
  await seedTaxRate();
  await seedFeatureAccess();
  await seedHeadOffice();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('seed-defaults failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
