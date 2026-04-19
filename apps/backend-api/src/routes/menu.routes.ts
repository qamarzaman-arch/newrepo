import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

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
  isActive: z.boolean().optional(),
  image: z.string().optional(),
});

const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  prepTimeMinutes: z.number().positive().default(15),
  taxRate: z.number().min(0).max(100).default(0),
  displayOrder: z.number().default(0),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  prepTimeMinutes: z.number().positive().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  displayOrder: z.number().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const createModifierSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
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
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
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
});

// Create category
router.post('/categories', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
});

// Update category
router.put('/categories/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateCategorySchema.parse(req.body);

    const category = await prisma.menuCategory.update({
      where: { id: req.params.id },
      data,
    });

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
});

// Delete category (soft delete - deactivate)
router.delete('/categories/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.menuCategory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Category deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// Get menu items with filters (public endpoint for cashier)
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId, search, available } = req.query;

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
});

// Get single menu item
router.get('/items/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
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

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Create menu item
router.post('/items', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createMenuItemSchema.parse(req.body);

    // Verify category exists
    const category = await prisma.menuCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || !category.isActive) {
      throw new AppError('Category not found or inactive', 400);
    }

    // Auto-generate SKU if not provided
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
        },
        include: {
          category: true,
          tags: true,
          modifiers: true,
        },
      });

      // Create tags if provided
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

    res.status(201).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Update menu item
router.put('/items/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateMenuItemSchema.parse(req.body);
    const { tags, ...itemData } = data;

    const item = await prisma.$transaction(async (tx) => {
      // Update item
      const updatedItem = await tx.menuItem.update({
        where: { id: req.params.id },
        data: itemData,
        include: {
          category: true,
          tags: true,
          modifiers: true,
        },
      });

      // Update tags if provided
      if (tags) {
        // Delete existing tags
        await tx.menuItemTag.deleteMany({
          where: { menuItemId: req.params.id },
        });

        // Create new tags
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

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
});

// Delete menu item (soft delete)
router.delete('/items/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Menu item deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// Add modifier to menu item
router.post('/items/:id/modifiers', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createModifierSchema.parse(req.body);

    // Verify menu item exists
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
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

      // Create modifier options
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
        where: { id: newModifier.id },
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
});

// Update modifier
router.put('/modifiers/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, type, isRequired, displayOrder } = req.body;

    const modifier = await prisma.itemModifier.update({
      where: { id: req.params.id },
      data: {
        name,
        type,
        isRequired,
        displayOrder,
      },
      include: {
        options: true,
      },
    });

    res.json({
      success: true,
      data: { modifier },
    });
  } catch (error) {
    next(error);
  }
});

// Delete modifier
router.delete('/modifiers/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.itemModifier.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Modifier deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
