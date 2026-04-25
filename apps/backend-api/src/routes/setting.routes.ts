import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

const updateSettingSchema = z.object({
  value: z.string(),
});

const updateManagerPinSchema = z.object({
  newPin: z.string().min(4).max(10),
});

// Get all settings
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = category;

    const settings = await prisma.setting.findMany({ where, orderBy: { key: 'asc' } });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

// Get current tax rate and surcharges for order calculation (public endpoint for POS)
router.get('/current-rates', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get tax rate from settings
    const taxRateSetting = await prisma.setting.findUnique({
      where: { key: 'tax_rate' },
    });
    const taxRate = taxRateSetting ? parseFloat(taxRateSetting.value) : 0;

    // Get service charge rate from settings
    const serviceChargeSetting = await prisma.setting.findUnique({
      where: { key: 'service_charge_rate' },
    });
    const serviceChargeRate = serviceChargeSetting ? parseFloat(serviceChargeSetting.value) : 0;

    // Get active surcharges from Surcharge table
    const surcharges = await prisma.surcharge.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, value: true },
    });

    res.json({
      success: true,
      data: {
        taxRate,
        serviceChargeRate,
        surcharges,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get settings by category
router.get('/category/:category', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { category: req.params.category },
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

// Get setting by key
router.get('/:key', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) throw new AppError('Setting not found', 404);
    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

// Update manager PIN (requires manager/admin role)
router.put('/manager-pin', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newPin } = updateManagerPinSchema.parse(req.body);

    const pinHash = await bcrypt.hash(newPin, 12);

    await prisma.setting.upsert({
      where: { key: 'manager_pin' },
      create: { key: 'manager_pin', value: pinHash, category: 'security' },
      update: { value: pinHash },
    });

    logger.info(`Manager PIN updated by ${sanitize(req.user!.username)}`);

    res.json({ success: true, message: 'Manager PIN updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Bulk update settings (for POS sync)
router.post('/bulk-sync', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string; category?: string }> };

    if (!Array.isArray(settings)) {
      throw new AppError('Settings must be an array', 400);
    }

    const results = await Promise.all(
      settings.map(async ({ key, value, category = 'general' }) => {
        return prisma.setting.upsert({
          where: { key },
          create: { key, value, category },
          update: { value },
        });
      })
    );

    logger.info(`Bulk settings sync: ${results.length} settings updated by ${sanitize(req.user!.username)}`);

    res.json({ success: true, data: { updated: results.length } });
  } catch (error) {
    next(error);
  }
});

// Update setting
router.put('/:key', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { value } = updateSettingSchema.parse(req.body);

    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value, category: req.body.category || 'general' },
      update: { value },
    });

    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

export default router;
