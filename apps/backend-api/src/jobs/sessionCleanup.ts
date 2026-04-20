import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// Clean up expired sessions every hour
export function initSessionCleanupJob(): void {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      // Delete expired sessions (created more than 24 hours ago)
      const result = await prisma.session.deleteMany({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
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
