import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const recipeIngredientSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
});

const recipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  prepTimeMinutes: z.number().min(0).default(0),
  cookTimeMinutes: z.number().min(0).default(0),
  servings: z.number().min(1).default(1),
  cost: z.number().min(0).default(0),
  menuItemId: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isActive: true },
      include: {
        ingredients: {
          include: { inventoryItem: true },
        },
        menuItem: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { recipes } });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = recipeSchema.parse(req.body);
    const recipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: {
          name: data.name,
          description: data.description,
          instructions: data.instructions,
          prepTimeMinutes: data.prepTimeMinutes,
          cookTimeMinutes: data.cookTimeMinutes,
          servings: data.servings,
          cost: data.cost,
          menuItemId: data.menuItemId,
        },
      });

      if (data.ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: data.ingredients.map((ing) => ({
            recipeId: newRecipe.id,
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        });
      }

      return newRecipe;
    });
    res.status(201).json({ success: true, data: { recipe } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = recipeSchema.partial().parse(req.body);
    const recipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        prepTimeMinutes: data.prepTimeMinutes,
        cookTimeMinutes: data.cookTimeMinutes,
        servings: data.servings,
        cost: data.cost,
        menuItemId: data.menuItemId,
      },
    });
    res.json({ success: true, data: { recipe } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.recipe.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Recipe deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;