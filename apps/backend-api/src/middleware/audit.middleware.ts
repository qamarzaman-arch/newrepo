import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditLogService } from '../services/auditLog.service';

export function audit(action: string, entity: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user?.userId || null;
        const entityId = body?.data?.id || req.params.id;
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];

        AuditLogService.log(
          userId,
          action,
          entity,
          entityId,
          req.body,
          ipAddress,
          userAgent
        ).catch(err => console.error('Audit logging failed:', err));
      }
      return originalJson.call(this, body);
    };

    next();
  };
}
