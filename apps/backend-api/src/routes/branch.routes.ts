import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  managerId: z.string().uuid().optional().nullable(),
  isHeadOffice: z.boolean().optional(),
  timezone: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
});

router.get('/', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { branches } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!branch) throw new AppError('Branch not found', 404);
    res.json({ success: true, data: { branch } });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = branchSchema.parse(req.body);
    const existing = await prisma.branch.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError('Branch code already exists', 400);
    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address || undefined,
        city: data.city || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        managerId: data.managerId || undefined,
        isHeadOffice: data.isHeadOffice ?? false,
        timezone: data.timezone || undefined,
        currency: data.currency || undefined,
        taxId: data.taxId || undefined,
        openingTime: data.openingTime || undefined,
        closingTime: data.closingTime || undefined,
      },
    });
    res.status(201).json({ success: true, data: { branch } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = branchSchema.partial().parse(req.body);
    if (data.code) {
      const existing = await prisma.branch.findFirst({ where: { code: data.code, NOT: { id: req.params.id } } });
      if (existing) throw new AppError('Branch code already exists', 400);
    }
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.managerId !== undefined && { managerId: data.managerId || null }),
        ...(data.isHeadOffice !== undefined && { isHeadOffice: data.isHeadOffice }),
        ...(data.timezone !== undefined && { timezone: data.timezone || null }),
        ...(data.currency !== undefined && { currency: data.currency || null }),
        ...(data.taxId !== undefined && { taxId: data.taxId || null }),
        ...(data.openingTime !== undefined && { openingTime: data.openingTime || null }),
        ...(data.closingTime !== undefined && { closingTime: data.closingTime || null }),
      },
    });
    res.json({ success: true, data: { branch } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.branch.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Branch deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
