import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class InventoryService {
  static async deductIngredientsForMenuItem(menuItemId: string, quantity: number, tx: any) {
    try {
      const recipe = await tx.recipe.findFirst({
        where: { menuItemId, isActive: true },
        include: {
          ingredients: true,
        },
      });

      if (!recipe) {
        logger.debug(`No recipe found for menuItemId: ${menuItemId}. Skipping ingredient deduction.`);
        return;
      }

      for (const ingredient of recipe.ingredients) {
        const deductionAmount = ingredient.quantity * quantity;

        await tx.inventoryItem.update({
          where: { id: ingredient.inventoryItemId },
          data: {
            currentStock: {
              decrement: deductionAmount,
            },
          },
        });

        logger.info(`Deducted ${deductionAmount} ${ingredient.unit} from inventoryItem ${ingredient.inventoryItemId} for menu item ${menuItemId}`);
      }
    } catch (error) {
      logger.error('Error deducting ingredients:', error);
      throw error;
    }
  }
}
