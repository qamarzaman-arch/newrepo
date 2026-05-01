import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attach a stable per-request id used for log correlation and surfaced back to
 * the caller via the `X-Request-Id` response header and the error payload.
 *
 * QA refs: A79 (no correlation id), D56 (no request-id middleware).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = (req.headers['x-request-id'] as string | undefined)?.trim();
  // Trust an incoming id only if it looks like a UUID — otherwise we'd let
  // a caller poison logs with arbitrary strings.
  const isUuid = incoming && /^[0-9a-fA-F-]{8,64}$/.test(incoming);
  const id = isUuid ? incoming! : randomUUID();
  (req as any).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
