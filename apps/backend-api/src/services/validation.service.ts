import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class ValidationService {
  static async validateManagerPin(pin: string): Promise<boolean> {
    const managerPinSetting = await prisma.setting.findUnique({
      where: { key: 'manager_pin' },
    });

    if (!managerPinSetting) {
      // Fallback to default if not set in DB
      return pin === '123456';
    }

    // Settings might be stored as plain text or hashed depending on implementation
    // For enterprise security, we should hash them, but let's support both
    if (managerPinSetting.value.startsWith('')) {
      return await bcrypt.compare(pin, managerPinSetting.value);
    }

    return pin === managerPinSetting.value;
  }

  static async authorizeAction(pin: string, action: string) {
    const isValid = await this.validateManagerPin(pin);
    if (!isValid) {
      throw new AppError(`Unauthorized: Invalid Manager PIN for ${action}`, 401);
    }
    return true;
  }
}
