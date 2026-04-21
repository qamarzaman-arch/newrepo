import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

const router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().default(0),
  image: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createMenuItemSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  cost: z.number().min(0).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  prepTimeMinutes: z.number().min(0).default(10),
  taxRate: z.number().min(0).default(0),
  displayOrder: z.number().default(0),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
  station: z.string().optional().default('GRILL'), // Added station
});

const updateMenuItemSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  prepTimeMinutes: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  displayOrder: z.number().optional(),
  image: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  station: z.string().optional(),
});

const createModifierSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SINGLE', 'MULTIPLE']),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().default(0),
  options: z.array(z.object({
    name: z.string().min(1),
    priceAdjustment: z.number().default(0),
    isDefault: z.boolean().default(false),
    displayOrder: z.number().default(0),
  })).min(1),
});

// Get all categories with items (public endpoint for cashier)
router.get('/categories', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { storeId: req.storeId, isActive: true },
      include: {
        items: {
          where: { storeId: req.storeId, isActive: true, isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Create category
router.post('/categories', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCategorySchema.parse(req.body);

    const category = await prisma.menuCategory.create({
      data: {
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder,
        image: data.image,
      },
    });

    logger.info(`Category created: ${sanitize(category.name)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Update category
router.put('/categories/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateCategorySchema.parse(req.body);

    const category = await prisma.menuCategory.update({
      where: { storeId: req.storeId, id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Delete category (soft delete - deactivate)
router.delete('/categories/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.menuCategory.update({
      where: { storeId: req.storeId, id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Category deactivated',
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Get menu items with filters (public endpoint for cashier)
router.get('/items', (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { categoryId, search, available } = req.query as any;

    const where: any = { isActive: true };

    if (categoryId) where.categoryId = categoryId;
    if (available === 'true') where.isAvailable = true;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        modifiers: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Get single menu item
router.get('/items/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { storeId: req.storeId, id: req.params.id },
      include: {
        category: true,
        modifiers: {
          include: {
            options: true,
          },
        },
        tags: true,
      },
    });

    if (!item) {
      throw new AppError('Menu item not found', 404);
    }

    await AuditLogService.log(req.user!.userId, 'READ', 'MenuItem', item.id, { name: item.name });
    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Create menu item
router.post('/items', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMenuItemSchema.parse(req.body);

    const category = await prisma.menuCategory.findUnique({
      where: { storeId: req.storeId, id: data.categoryId },
    });

    if (!category || !category.isActive) {
      throw new AppError('Category not found or inactive', 400);
    }

    const sku = data.sku || `ITEM-${Date.now()}`;

    const { tags, ...itemData } = data;

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.menuItem.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost || 0,
          sku,
          barcode: data.barcode,
          prepTimeMinutes: data.prepTimeMinutes,
          taxRate: data.taxRate,
          displayOrder: data.displayOrder,
          image: data.image,
          station: data.station,
        },
        include: {
          category: true,
          tags: true,
          modifiers: true,
        },
      });

      if (tags && tags.length > 0) {
        await Promise.all(
          tags.map((tag) =>
            tx.menuItemTag.create({
              data: {
                menuItemId: newItem.id,
                tag,
              },
            })
          )
        );
      }

      return newItem;
    });

    logger.info(`Menu item created: ${sanitize(item.name)} by ${sanitize(req.user!.username)}`);
      await AuditLogService.log(req.user!.userId, 'CREATE', 'MenuItem', item.id, { name: item.name });

    res.status(201).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Update menu item
router.put('/items/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMenuItemSchema.parse(req.body);
    const { tags, ...itemData } = data;

    const item = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.menuItem.update({
        where: { storeId: req.storeId, id: req.params.id },
        data: itemData,
        include: {
          category: true,
          tags: true,
          modifiers: true,
        },
      });

      if (tags) {
        await tx.menuItemTag.deleteMany({
          where: { storeId: req.storeId, menuItemId: req.params.id },
        });

        if (tags.length > 0) {
          await Promise.all(
            tags.map((tag) =>
              tx.menuItemTag.create({
                data: {
                  menuItemId: req.params.id,
                  tag,
                },
              })
            )
          );
        }
      }

      return updatedItem;
    });

    await AuditLogService.log(req.user!.userId, 'UPDATE', 'MenuItem', item.id, { name: item.name });
    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Delete menu item
router.delete('/items/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.menuItem.update({
      where: { storeId: req.storeId, id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Menu item deactivated',
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Add modifier
router.post('/items/:id/modifiers', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createModifierSchema.parse(req.body);

    const item = await prisma.menuItem.findUnique({
      where: { storeId: req.storeId, id: req.params.id },
    });

    if (!item) {
      throw new AppError('Menu item not found', 404);
    }

    const { options, ...modifierData } = data;

    const modifier = await prisma.$transaction(async (tx) => {
      const newModifier = await tx.itemModifier.create({
        data: {
          menuItemId: req.params.id,
          name: modifierData.name,
          type: modifierData.type,
          isRequired: modifierData.isRequired,
          displayOrder: modifierData.displayOrder,
        },
        include: {
          options: true,
        },
      });

      await Promise.all(
        options.map((option, index) =>
          tx.modifierOption.create({
            data: {
              modifierId: newModifier.id,
              name: option.name,
              priceAdjustment: option.priceAdjustment,
              isDefault: option.isDefault,
              displayOrder: option.displayOrder || index,
            },
          })
        )
      );

      return tx.itemModifier.findUnique({
        where: { storeId: req.storeId, id: newModifier.id },
        include: {
          options: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      data: { modifier },
    });
  } catch (error) {
    next(error);
  }
}) as any);

export default router;
