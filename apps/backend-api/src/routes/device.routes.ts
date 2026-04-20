import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createDeviceSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  model: z.string().optional(),
  ipAddress: z.string().optional(),
  port: z.number().optional(),
  config: z.string().optional(),
});

const updateDeviceSchema = createDeviceSchema.partial();

// Get devices
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, isActive } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const devices = await prisma.device.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: { devices } });
  } catch (error) {
    next(error);
  }
});

// Get single device
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) throw new AppError('Device not found', 404);
    res.json({ success: true, data: { device } });
  } catch (error) {
    next(error);
  }
});

// Create device
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createDeviceSchema.parse(req.body);
    const device = await prisma.device.create({
      data: {
        name: data.name,
        type: data.type,
        model: data.model,
        ipAddress: data.ipAddress,
        port: data.port,
        config: data.config,
      },
    });
    res.status(201).json({ success: true, data: { device } });
  } catch (error) {
    next(error);
  }
});

// Update device
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateDeviceSchema.parse(req.body);
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: { device } });
  } catch (error) {
    next(error);
  }
});

// Update heartbeat
router.post('/:id/heartbeat', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: { lastSeenAt: new Date() },
    });
    res.json({ success: true, data: { device } });
  } catch (error) {
    next(error);
  }
});

// Delete device
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.device.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Device deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
