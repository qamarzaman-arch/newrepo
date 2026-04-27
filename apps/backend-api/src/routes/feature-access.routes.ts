import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { authorize } from '../middleware/auth';

const router = Router();

// Validation schema
const updateFeatureAccessSchema = z.object({
  feature: z.string(),
  role: z.string(),
  enabled: z.boolean(),
});

const bulkUpdateSchema = z.object({
  feature: z.string(),
  enabled: z.boolean(),
});

// List of available features
const AVAILABLE_FEATURES = [
  { id: 'orders', name: 'Orders Management', description: 'Create, view, and manage orders' },
  { id: 'kitchen', name: 'Kitchen Display System', description: 'View and manage kitchen orders' },
  { id: 'inventory', name: 'Inventory Management', description: 'Manage inventory items and stock' },
  { id: 'vendors', name: 'Vendor Management', description: 'Manage vendors and purchase orders' },
  { id: 'customers', name: 'Customer Management', description: 'Manage customer data and loyalty' },
  { id: 'staff', name: 'Staff Management', description: 'Manage staff and schedules' },
  { id: 'attendance', name: 'Attendance Management', description: 'Mark and track employee attendance' },
  { id: 'delivery', name: 'Delivery Management', description: 'Manage deliveries and riders' },
  { id: 'tables', name: 'Table Management', description: 'Manage dining tables' },
  { id: 'menu', name: 'Menu Management', description: 'Manage menu items and categories' },
  { id: 'reports', name: 'Reports & Analytics', description: 'View financial and sales reports' },
  { id: 'financial', name: 'Financial Management', description: 'Manage expenses and budgets' },
  { id: 'settings', name: 'System Settings', description: 'Configure system settings' },
];

const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'RIDER', 'CASHIER'];

/**
 * Get all feature access settings
 */
router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const featureAccess = await prisma.featureAccess.findMany({
      orderBy: [{ feature: 'asc' }, { role: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        features: AVAILABLE_FEATURES,
        roles: ROLES,
        access: featureAccess,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a single feature access setting
 */
router.patch('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateFeatureAccessSchema.parse(req.body);

    const featureAccess = await prisma.featureAccess.upsert({
      where: {
        feature_role: {
          feature: validatedData.feature,
          role: validatedData.role,
        },
      },
      update: {
        enabled: validatedData.enabled,
      },
      create: {
        feature: validatedData.feature,
        role: validatedData.role,
        enabled: validatedData.enabled,
      },
    });

    logger.info(`Feature access updated: ${validatedData.feature} for ${validatedData.role} -> ${validatedData.enabled}`);

    res.json({
      success: true,
      data: featureAccess,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk update feature access for all roles
 */
router.patch('/bulk', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = bulkUpdateSchema.parse(req.body);

    // Update or create feature access for all roles
    const updates = ROLES.map(async (role) => {
      return prisma.featureAccess.upsert({
        where: {
          feature_role: {
            feature: validatedData.feature,
            role,
          },
        },
        update: {
          enabled: validatedData.enabled,
        },
        create: {
          feature: validatedData.feature,
          role,
          enabled: validatedData.enabled,
        },
      });
    });

    const results = await Promise.all(updates);

    logger.info(`Bulk feature access updated: ${validatedData.feature} for all roles -> ${validatedData.enabled}`);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reset feature access to defaults (enable all for ADMIN, disable for others)
 */
router.post('/reset', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Delete all existing feature access
    await prisma.featureAccess.deleteMany({});

    // Create default feature access
    const defaults = [];
    for (const feature of AVAILABLE_FEATURES) {
      for (const role of ROLES) {
        // Enable all features for ADMIN
        // Enable most features for MANAGER
        // Enable specific features for other roles
        const enabled = role === 'ADMIN' || 
                        (role === 'MANAGER' && feature.id !== 'settings') ||
                        (role === 'STAFF' && ['orders', 'kitchen'].includes(feature.id)) ||
                        (role === 'RIDER' && ['delivery'].includes(feature.id)) ||
                        (role === 'CASHIER' && ['orders', 'menu', 'tables'].includes(feature.id));
        
        defaults.push({
          feature: feature.id,
          role,
          enabled,
        });
      }
    }

    await prisma.featureAccess.createMany({
      data: defaults,
    });

    logger.info('Feature access reset to defaults');

    res.json({
      success: true,
      message: 'Feature access reset to defaults',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all feature access settings for the logged-in user's role
 */
router.get('/my-access', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role || 'STAFF';

    // Admin always has access to all features
    if (userRole === 'ADMIN') {
      const allFeaturesEnabled = AVAILABLE_FEATURES.map(feature => ({
        feature: feature.id,
        enabled: true,
      }));
      return res.json({
        success: true,
        data: {
          role: userRole,
          features: allFeaturesEnabled,
        },
      });
    }

    const featureAccess = await prisma.featureAccess.findMany({
      where: {
        role: userRole,
      },
    });

    // Create a map of feature -> enabled status
    const featureMap = new Map(featureAccess.map(fa => [fa.feature, fa.enabled]));

    // Build response with all features and their enabled status
    const features = AVAILABLE_FEATURES.map(feature => ({
      feature: feature.id,
      enabled: featureMap.get(feature.id) ?? true, // Default to enabled if no setting exists
    }));

    res.json({
      success: true,
      data: {
        role: userRole,
        features,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check if a user has access to a specific feature
 */
router.get('/check/:feature', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { feature } = req.params;
    const userRole = req.user?.role || 'STAFF';

    // Admin always has access
    if (userRole === 'ADMIN') {
      return res.json({
        success: true,
        data: { enabled: true },
      });
    }

    const featureAccess = await prisma.featureAccess.findUnique({
      where: {
        feature_role: {
          feature,
          role: userRole,
        },
      },
    });

    // Default to enabled if no setting exists
    const enabled = featureAccess?.enabled ?? true;

    res.json({
      success: true,
      data: { enabled },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
