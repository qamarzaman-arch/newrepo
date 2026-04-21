import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditLogService } from '../services/auditLog.service';

export const auditAction = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Wrap the original end function to log after response is sent
    const originalEnd = res.end;

    (res as any).end = function (chunk: any, encoding: any, callback: any) {
      res.end = originalEnd;
      const result = res.end(chunk, encoding, callback);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log successful actions
        AuditLogService.log(
          req.user?.userId || null,
          action,
          entity,
          req.params.id || (res as any).locals?.entityId,
          req.method !== 'GET' ? req.body : null,
          req.ip,
          req.headers['user-agent']
        ).catch(err => console.error('Audit log failed:', err));
      }

      return result;
    };

    next();
  };
};
