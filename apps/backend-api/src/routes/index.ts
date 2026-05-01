import { Application } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import menuRoutes from './menu.routes';
import orderRoutes from './order.routes';
import tableRoutes from './table.routes';
import customerRoutes from './customer.routes';
import inventoryRoutes from './inventory.routes';
import kitchenRoutes from './kitchen.routes';
import deliveryRoutes from './delivery.routes';
import expenseRoutes from './expense.routes';
import discountRoutes from './discount.routes';
import reportRoutes from './report.routes';
import settingRoutes from './setting.routes';
import deviceRoutes from './device.routes';
import syncRoutes from './sync.routes';
import vendorRoutes from './vendor.routes';
import staffRoutes from './staff.routes';
import comboRoutes from './combo.routes';
import recipeRoutes from './recipe.routes';
import purchaseOrderRoutes from './purchase-order.routes';
import paymentRoutes from './payment.routes';
import paymentWebhookRoutes from './payment-webhook.routes';
import cashDrawerRoutes from './cash-drawer.routes';
import auditLogRoutes from './audit-log.routes';
import orderModificationRoutes from './order-modification.routes';
import deliveryZoneRoutes from './delivery-zone.routes';
import staffScheduleRoutes from './staff-schedule.routes';
import riderRoutes from './rider.routes';
import commissionRoutes from './commission.routes';
import tableLockRoutes from './table-lock.routes';
import featureAccessRoutes from './feature-access.routes';
import branchRoutes from './branch.routes';
import marketingRoutes from './marketing.routes';
import reviewRoutes from './review.routes';
import accountingRoutes from './accounting.routes';
import taxRoutes from './tax.routes';
import externalPlatformRoutes from './external-platform.routes';
import qrOrderingRoutes from './qr-ordering.routes';
import { authenticate, requireFeature } from '../middleware/auth';

export function setupRoutes(app: Application) {
  const apiPrefix = '/api/v1';

  // QA C48: feature-access enforcement at the route-prefix level. Each prefix
  // gates on the feature ID surfaced in the admin UI. authenticate runs first
  // so requireFeature can read req.user.role; routes inside still apply their
  // own authorize() / role guards on top.
  const gate = (feature: string) => [authenticate, requireFeature(feature)];

  // API routes
  app.use(`${apiPrefix}/auth`, authRoutes); // never feature-gated
  app.use(`${apiPrefix}/feature-access`, featureAccessRoutes); // admin-only inside
  app.use(`${apiPrefix}/payments/webhooks`, paymentWebhookRoutes); // unauth (signature-verified)

  app.use(`${apiPrefix}/users`, gate('staff'), userRoutes);
  app.use(`${apiPrefix}/menu`, gate('menu'), menuRoutes);
  app.use(`${apiPrefix}/orders`, gate('orders'), orderRoutes);
  app.use(`${apiPrefix}/tables`, gate('tables'), tableRoutes);
  app.use(`${apiPrefix}/customers`, gate('customers'), customerRoutes);
  app.use(`${apiPrefix}/inventory`, gate('inventory'), inventoryRoutes);
  app.use(`${apiPrefix}/kitchen`, gate('kitchen'), kitchenRoutes);
  app.use(`${apiPrefix}/delivery`, gate('delivery'), deliveryRoutes);
  app.use(`${apiPrefix}/expenses`, gate('financial'), expenseRoutes);
  app.use(`${apiPrefix}/discounts`, gate('orders'), discountRoutes);
  app.use(`${apiPrefix}/reports`, gate('reports'), reportRoutes);
  app.use(`${apiPrefix}/settings`, gate('settings'), settingRoutes);
  app.use(`${apiPrefix}/devices`, gate('settings'), deviceRoutes);
  app.use(`${apiPrefix}/sync`, syncRoutes);
  app.use(`${apiPrefix}/vendors`, gate('vendors'), vendorRoutes);
  app.use(`${apiPrefix}/staff`, gate('staff'), staffRoutes);
  app.use(`${apiPrefix}/combos`, gate('menu'), comboRoutes);
  app.use(`${apiPrefix}/recipes`, gate('inventory'), recipeRoutes);
  app.use(`${apiPrefix}/purchase-orders`, gate('vendors'), purchaseOrderRoutes);
  app.use(`${apiPrefix}/payments`, gate('orders'), paymentRoutes);
  // Cash drawer is part of a cashier's shift workflow (open at start, close at
  // end), not a finance-team feature. Gate under 'orders' so the same role
  // that can take orders can manage their drawer. The cashier-vs-manager
  // permission distinction is enforced inside the routes via authorize().
  app.use(`${apiPrefix}/cash-drawer`, gate('orders'), cashDrawerRoutes);
  app.use(`${apiPrefix}/audit-logs`, gate('reports'), auditLogRoutes);
  app.use(`${apiPrefix}/order-modifications`, gate('orders'), orderModificationRoutes);
  app.use(`${apiPrefix}/delivery-zones`, gate('delivery'), deliveryZoneRoutes);
  app.use(`${apiPrefix}/staff-schedules`, gate('staff'), staffScheduleRoutes);
  app.use(`${apiPrefix}/riders`, gate('delivery'), riderRoutes);
  app.use(`${apiPrefix}/commissions`, gate('financial'), commissionRoutes);
  app.use(`${apiPrefix}/table-locks`, gate('tables'), tableLockRoutes);
  app.use(`${apiPrefix}/branches`, gate('settings'), branchRoutes);
  app.use(`${apiPrefix}/marketing`, gate('settings'), marketingRoutes);
  app.use(`${apiPrefix}/reviews`, gate('customers'), reviewRoutes);
  app.use(`${apiPrefix}/accounting`, gate('financial'), accountingRoutes);
  app.use(`${apiPrefix}/tax`, gate('financial'), taxRoutes);
  app.use(`${apiPrefix}/external-platform`, gate('delivery'), externalPlatformRoutes);
  app.use(`${apiPrefix}/qr-ordering`, qrOrderingRoutes); // public QR ordering — own gating

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}
