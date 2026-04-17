import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createVendorSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

// Get vendors
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: { inventoryItems: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { vendors } });
  } catch (error) {
    next(error);
  }
});

// Get single vendor
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: { inventoryItems: true },
    });
    if (!vendor) throw new AppError('Vendor not found', 404);
    res.json({ success: true, data: { vendor } });
  } catch (error) {
    next(error);
  }
});

// Create vendor
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createVendorSchema.parse(req.body);
    const vendor = await prisma.vendor.create({ data });
    res.status(201).json({ success: true, data: { vendor } });
  } catch (error) {
    next(error);
  }
});

// Update vendor
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: { vendor } });
  } catch (error) {
    next(error);
  }
});

// Delete vendor
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.vendor.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Vendor deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
