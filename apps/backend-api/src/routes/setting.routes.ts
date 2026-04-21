import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuditLogService } from '../services/auditLog.service';

const router = Router();

const updateSettingSchema = z.object({
  value: z.string(),
});

// Get all settings
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Bulk update settings
router.post('/bulk', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    const results = [];

    for (const [key, value] of Object.entries(settings)) {
      const setting = await prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value: String(value),
          category: 'general'
        },
        update: { value: String(value) },
      });
      results.push(setting);
    }

    await AuditLogService.log(req.user!.userId, 'BULK_UPDATE', 'Setting', 'all', { count: results.length });

    res.json({ success: true, data: { settings: results } });
  } catch (error) {
    next(error);
  }
});

// Get settings by category
router.get('/category/:category', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
router.get('/:key', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) throw new AppError('Setting not found', 404);
    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

// Update setting
router.put('/:key', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { value } = updateSettingSchema.parse(req.body);

    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value, category: req.body.category || 'general' },
      update: { value },
    });

    await AuditLogService.log(req.user!.userId, 'UPDATE', 'Setting', setting.key, { value });

    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

export default router;
