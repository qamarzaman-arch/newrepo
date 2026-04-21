import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export interface TenantRequest extends AuthRequest {
  storeId?: string;
}

export function tenantContext(req: TenantRequest, res: Response, next: NextFunction) {
  // Extract storeId from headers or query, default to 'MAIN'
  const storeId = (req.headers['x-store-id'] as string) || (req.query.storeId as string) || 'MAIN';
  req.storeId = storeId;
  next();
}
