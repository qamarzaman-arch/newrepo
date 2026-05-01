import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Lightweight in-process advisory lock using the `SequenceCounter` table.
 * Each job claims a unique scope via INSERT-then-UPDATE with TTL semantics:
 * if the row's updatedAt is older than the TTL we steal it (handles a crashed
 * worker), otherwise we abort.
 *
 * QA refs: A58 (no overlap protection), A60 (no alerting), A61 (DB readiness).
 */
async function withCronLock(jobName: string, ttlMs: number, run: () => Promise<void>): Promise<void> {
  const scope = `CRON_LOCK:${jobName}`;
  const now = Date.now();
  try {
    const existing = await prisma.sequenceCounter.findUnique({ where: { scope } });
    if (existing && now - existing.updatedAt.getTime() < ttlMs) {
      logger.warn(`Cron ${jobName} skipped: previous run still in progress (lock age ${now - existing.updatedAt.getTime()}ms)`);
      return;
    }
    await prisma.sequenceCounter.upsert({
      where: { scope },
      create: { scope, value: 1 },
      update: { value: { increment: 1 } },
    });
    await run();
  } catch (err) {
    logger.error(`Cron ${jobName} failed:`, err);
    notifyOps(jobName, err);
  } finally {
    // Release lock so the next scheduled tick can proceed promptly.
    await prisma.sequenceCounter.delete({ where: { scope } }).catch(() => undefined);
  }
}

function notifyOps(jobName: string, err: unknown): void {
  // QA A60: minimal hook to forward critical cron failures somewhere durable.
  // Prefer ALERT_WEBHOOK_URL when set; otherwise just log at warn level.
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const body = JSON.stringify({
    text: `[POSLytic] cron ${jobName} failed: ${(err as Error).message}`,
    level: 'critical',
    job: jobName,
    timestamp: new Date().toISOString(),
  });
  // Fire-and-forget; don't block the cron tick on the alert call.
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    .catch((alertErr) => logger.warn(`ALERT_WEBHOOK_URL post failed: ${alertErr.message}`));
}

async function ensureDbReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.warn(`Cron paused: DB not ready (${(err as Error).message})`);
    return false;
  }
}

// Clean up expired sessions every hour
export function initSessionCleanupJob(): void {
  cron.schedule('0 * * * *', async () => {
    if (!(await ensureDbReady())) return;
    await withCronLock('sessionCleanup', 50 * 60 * 1000, async () => {
      const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`Session cleanup: deleted ${result.count} expired sessions`);
    });
  });

  logger.info('Session cleanup cron initialised (runs every hour)');
}

export function initTableLockCleanupJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    if (!(await ensureDbReady())) return;
    await withCronLock('tableLockCleanup', 14 * 60 * 1000, async () => {
      const result = await (prisma as any).tableLock.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (result.count > 0) logger.info(`Table-lock cleanup: deleted ${result.count} locks`);
    });
  });

  logger.info('Table-lock cleanup cron initialised (runs every 15 minutes)');
}

/**
 * Daily archive + delete of old audit logs.
 *
 * QA A59: previously these rows were just hard-deleted at 90 days, leaving
 * no compliance trail. We now write them to a dated NDJSON file under
 * AUDIT_ARCHIVE_DIR (default: ./audit-archive) before removal, so they can be
 * shipped to cold storage by the host.
 */
export function initAuditLogCleanupJob(): void {
  cron.schedule('0 2 * * *', async () => {
    if (!(await ensureDbReady())) return;
    await withCronLock('auditLogCleanup', 60 * 60 * 1000, async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const archiveDir = process.env.AUDIT_ARCHIVE_DIR || path.resolve(process.cwd(), 'audit-archive');

      // Stream-archive in chunks so a 6M-row table doesn't OOM the API.
      const CHUNK = 5000;
      try {
        fs.mkdirSync(archiveDir, { recursive: true });
      } catch (err) {
        logger.error(`Cannot create audit archive dir ${archiveDir}: ${(err as Error).message}`);
        throw err;
      }

      const fileName = path.join(archiveDir, `audit-${new Date().toISOString().slice(0, 10)}.ndjson`);
      const stream = fs.createWriteStream(fileName, { flags: 'a' });

      let archived = 0;
      while (true) {
        const batch = await prisma.auditLog.findMany({
          where: { createdAt: { lt: ninetyDaysAgo } },
          take: CHUNK,
          orderBy: { createdAt: 'asc' },
        });
        if (batch.length === 0) break;
        for (const row of batch) {
          stream.write(JSON.stringify(row) + '\n');
        }
        await prisma.auditLog.deleteMany({
          where: { id: { in: batch.map((r) => r.id) } },
        });
        archived += batch.length;
        if (batch.length < CHUNK) break;
      }
      stream.end();
      logger.info(`Audit log archive: wrote ${archived} rows to ${fileName} then deleted from DB`);
    });
  });

  logger.info('Audit-log archive cron initialised (runs daily at 02:00)');
}

/**
 * QA D51 / D52: QrSession rows accumulate forever and stay status=ACTIVE long
 * after the customer has left. This job runs every 15 minutes:
 *   1. Marks ACTIVE sessions whose expiresAt has passed as status=EXPIRED
 *      (so dashboards/reports stop counting them as live).
 *   2. Hard-deletes rows that have been in EXPIRED/CLOSED state for >7 days
 *      and have no orders attached.
 */
export function initQrSessionCleanupJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    if (!(await ensureDbReady())) return;
    await withCronLock('qrSessionCleanup', 14 * 60 * 1000, async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const expired = await prisma.qrSession.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
        data: { status: 'EXPIRED', closedAt: now },
      });

      // Find old terminal sessions with zero orders, then delete in a batch.
      const purgeable = await prisma.qrSession.findMany({
        where: {
          status: { in: ['EXPIRED', 'CLOSED'] },
          expiresAt: { lt: sevenDaysAgo },
          orders: { none: {} },
        },
        select: { id: true },
        take: 1000,
      });
      let purged = 0;
      if (purgeable.length) {
        const result = await prisma.qrSession.deleteMany({
          where: { id: { in: purgeable.map((r) => r.id) } },
        });
        purged = result.count;
      }

      if (expired.count || purged) {
        logger.info(`QR session cleanup: expired=${expired.count}, purged=${purged}`);
      }
    });
  });

  logger.info('QR session cleanup cron initialised (runs every 15 minutes)');
}
