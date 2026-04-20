import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const vendorSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { vendors } });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = vendorSchema.parse(req.body);
    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        website: data.website,
        notes: data.notes,
      }
    });
    res.status(201).json({ success: true, data: { vendor } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = vendorSchema.parse(req.body);
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        website: data.website,
        notes: data.notes,
      },
    });
    res.json({ success: true, data: { vendor } });
  } catch (error) {
    next(error);
  }
});

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
