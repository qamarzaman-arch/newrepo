import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const campaignSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  message: z.string().min(1),
  description: z.string().optional().nullable(),
  audience: z.string().optional(),
  audienceFilter: z.any().optional(),
  subject: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

router.get('/campaigns', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, type, branchId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (branchId) where.branchId = String(branchId);
    const campaigns = await prisma.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { branch: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: { campaigns } });
  } catch (error) {
    next(error);
  }
});

router.get('/campaigns/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });
    if (!campaign) throw new AppError('Campaign not found', 404);

    const statusCounts = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId: req.params.id },
      _count: { id: true },
    });
    res.json({ success: true, data: { campaign, statusCounts } });
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = campaignSchema.parse(req.body);
    const campaign = await prisma.marketingCampaign.create({
      data: {
        name: data.name,
        type: data.type,
        message: data.message,
        description: data.description || undefined,
        audience: data.audience || 'ALL',
        audienceFilter: data.audienceFilter || undefined,
        subject: data.subject || undefined,
        imageUrl: data.imageUrl || undefined,
        ctaUrl: data.ctaUrl || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        branchId: data.branchId || undefined,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json({ success: true, data: { campaign } });
  } catch (error) {
    next(error);
  }
});

router.put('/campaigns/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Campaign not found', 404);
    if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
      throw new AppError('Only DRAFT or SCHEDULED campaigns can be updated', 400);
    }
    const data = campaignSchema.partial().parse(req.body);
    const campaign = await prisma.marketingCampaign.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.message !== undefined && { message: data.message }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.audience !== undefined && { audience: data.audience }),
        ...(data.audienceFilter !== undefined && { audienceFilter: data.audienceFilter }),
        ...(data.subject !== undefined && { subject: data.subject || null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
        ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl || null }),
        ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null }),
        ...(data.branchId !== undefined && { branchId: data.branchId || null }),
      },
    });
    res.json({ success: true, data: { campaign } });
  } catch (error) {
    next(error);
  }
});

router.post('/campaigns/:id/send', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) throw new AppError('Campaign not found', 404);
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      throw new AppError('Campaign already sent', 400);
    }

    // Build customer filter based on audience
    const now = new Date();
    const customerWhere: any = { isActive: true };
    if (campaign.audience === 'VIP') {
      customerWhere.totalSpent = { gt: 10000 };
    } else if (campaign.audience === 'NEW') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      customerWhere.createdAt = { gte: cutoff };
    } else if (campaign.audience === 'INACTIVE') {
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      customerWhere.lastVisitAt = { lt: cutoff };
    }

    const customers = await prisma.customer.findMany({ where: customerWhere, select: { id: true } });

    const result = await prisma.$transaction(async (tx) => {
      // Remove existing recipients (idempotent re-send protection not implemented; skipDuplicates would be ideal)
      await tx.campaignRecipient.deleteMany({ where: { campaignId: campaign.id } });
      if (customers.length > 0) {
        await tx.campaignRecipient.createMany({
          data: customers.map((c) => ({
            campaignId: campaign.id,
            customerId: c.id,
            status: 'SENT',
            sentAt: now,
          })),
        });
      }
      const updated = await tx.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'ACTIVE',
          sentAt: now,
          recipientsCount: customers.length,
          deliveredCount: customers.length,
        },
      });
      return updated;
    });

    res.json({ success: true, data: { campaign: result, sent: customers.length } });
  } catch (error) {
    next(error);
  }
});

router.delete('/campaigns/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Campaign not found', 404);
    if (existing.status !== 'DRAFT') throw new AppError('Only DRAFT campaigns can be deleted', 400);
    await prisma.marketingCampaign.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
