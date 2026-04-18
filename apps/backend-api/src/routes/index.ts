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

export function setupRoutes(app: Application) {
  const apiPrefix = '/api/v1';

  // API routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/menu`, menuRoutes);
  app.use(`${apiPrefix}/orders`, orderRoutes);
  app.use(`${apiPrefix}/tables`, tableRoutes);
  app.use(`${apiPrefix}/customers`, customerRoutes);
  app.use(`${apiPrefix}/inventory`, inventoryRoutes);
  app.use(`${apiPrefix}/kitchen`, kitchenRoutes);
  app.use(`${apiPrefix}/delivery`, deliveryRoutes);
  app.use(`${apiPrefix}/expenses`, expenseRoutes);
  app.use(`${apiPrefix}/discounts`, discountRoutes);
  app.use(`${apiPrefix}/reports`, reportRoutes);
  app.use(`${apiPrefix}/settings`, settingRoutes);
  app.use(`${apiPrefix}/devices`, deviceRoutes);
  app.use(`${apiPrefix}/sync`, syncRoutes);
  app.use(`${apiPrefix}/vendors`, vendorRoutes);
  app.use(`${apiPrefix}/staff`, staffRoutes);
  app.use(`${apiPrefix}/combos`, comboRoutes);
  app.use(`${apiPrefix}/recipes`, recipeRoutes);
  app.use(`${apiPrefix}/purchase-orders`, purchaseOrderRoutes);
  app.use(`${apiPrefix}/payments`, paymentRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}
