import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Clean up expired sessions every hour
export function initSessionCleanupJob(): void {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info(`Session cleanup job: Deleted ${result.count} expired sessions`);
    } catch (error) {
      logger.error('Session cleanup job failed:', error);
    }
  });

  logger.info('Session cleanup cron job initialized (runs every hour)');
}

export function initTableLockCleanupJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();

      const result = await (prisma as any).tableLock.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      if (result.count > 0) {
        logger.info(`Table lock cleanup job: Deleted ${result.count} expired table locks`);
      }
    } catch (error) {
      logger.error('Table lock cleanup job failed:', error);
    }
  });

  logger.info('Table lock cleanup cron job initialized (runs every 15 minutes)');
}

// Also clean up old audit logs (keep only 90 days)
export function initAuditLogCleanupJob(): void {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      logger.info(`Audit log cleanup job: Deleted ${result.count} old records`);
    } catch (error) {
      logger.error('Audit log cleanup job failed:', error);
    }
  });

  logger.info('Audit log cleanup cron job initialized (runs daily at 2 AM)');
}
