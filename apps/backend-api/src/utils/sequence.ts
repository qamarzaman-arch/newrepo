import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * Atomic per-scope counter.
 *
 * QA refs: A9 (order# race), A47 (expense# race), and any other "count then
 * create" pattern that produces duplicate human-readable numbers under
 * concurrency. The MySQL `INSERT ... ON DUPLICATE KEY UPDATE` ensures the
 * increment happens in one statement; the RETURNING-style read is done by a
 * follow-up SELECT inside the same connection so we always observe our own
 * write.
 *
 * Each `scope` is its own counter, e.g. "ORDER:2026-05-01" or
 * "EXPENSE:2026-05-01". Use date-suffixed scopes to keep numbers reset daily;
 * use a static scope (e.g. "KOT") for monotonically-increasing numbers.
 */
export async function nextSequence(
  scope: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  // Both statements must run on the same connection for the SELECT to see the
  // INSERT. Prisma's raw API runs each call on whatever connection it grabs —
  // running them inside an interactive transaction guarantees the same one.
  if ('$queryRaw' in client && '$executeRaw' in client) {
    return runWithClient(client as Prisma.TransactionClient | typeof prisma, scope);
  }
  return runWithClient(prisma, scope);
}

async function runWithClient(
  client: Prisma.TransactionClient | typeof prisma,
  scope: string,
): Promise<number> {
  // If we are NOT already in a transaction, wrap in one so both statements
  // share a connection and nobody can interleave between them.
  const isAlreadyTx = !('$transaction' in client) || (client as any).$parent !== undefined;
  if (isAlreadyTx) {
    return atomicBump(client, scope);
  }
  return (client as typeof prisma).$transaction(async (tx) => atomicBump(tx, scope));
}

async function atomicBump(
  client: Prisma.TransactionClient | typeof prisma,
  scope: string,
): Promise<number> {
  // MySQL: single-statement atomic increment.
  await client.$executeRaw`
    INSERT INTO \`SequenceCounter\` (\`scope\`, \`value\`, \`updatedAt\`)
    VALUES (${scope}, 1, NOW(3))
    ON DUPLICATE KEY UPDATE \`value\` = \`value\` + 1, \`updatedAt\` = NOW(3)
  `;
  const rows = await client.$queryRaw<Array<{ value: number }>>`
    SELECT \`value\` FROM \`SequenceCounter\` WHERE \`scope\` = ${scope}
  `;
  if (!rows.length) {
    // Should be impossible given the INSERT above, but never silently return 0.
    throw new Error(`SequenceCounter.scope ${scope} vanished after upsert`);
  }
  return rows[0].value;
}

export function dailyScope(prefix: string, date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${prefix}:${yyyy}-${mm}-${dd}`;
}

export function dateStampUTC(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}
