import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditLogService {
  static async log(
    userId: string | null,
    action: string,
    entity: string,
    entityId?: string,
    changes?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          changes: changes ? (typeof changes === 'string' ? changes : JSON.stringify(changes)) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}
