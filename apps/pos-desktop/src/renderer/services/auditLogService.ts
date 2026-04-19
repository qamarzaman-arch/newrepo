import apiClient from './api';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    username: string;
    role: string;
  };
}

export interface CreateAuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export const auditLogService = {
  // Get audit logs with filtering
  getLogs: async (query: AuditLogQuery = {}) => {
    const params = new URLSearchParams();
    if (query.userId) params.append('userId', query.userId);
    if (query.entity) params.append('entity', query.entity);
    if (query.entityId) params.append('entityId', query.entityId);
    if (query.action) params.append('action', query.action);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    
    return apiClient.get(`/audit-logs?${params.toString()}`);
  },

  // Get single audit log
  getLog: async (id: string) => {
    return apiClient.get(`/audit-logs/${id}`);
  },

  // Create audit log
  createLog: async (data: CreateAuditLogData) => {
    return apiClient.post('/audit-logs', {
      ...data,
      userAgent: navigator.userAgent,
    });
  },

  // Get entity logs
  getEntityLogs: async (entityType: string, entityId: string) => {
    return apiClient.get(`/audit-logs?entity=${entityType}&entityId=${entityId}`);
  },

  // Get stats
  getStats: async () => {
    return apiClient.get('/audit-logs/stats');
  },

  // Export logs
  export: async (params: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) => {
    return apiClient.get(`/audit-logs/export?format=${params.format}&startDate=${params.startDate || ''}&endDate=${params.endDate || ''}`);
  },
};

// Helper function to log common actions
export const logAction = async (
  action: string,
  entity: string,
  entityId?: string,
  changes?: Record<string, any>
) => {
  try {
    await auditLogService.createLog({
      action,
      entity,
      entityId,
      changes,
    });
  } catch (error) {
    // Silently fail - don't block user actions for logging
    console.error('Failed to create audit log:', error);
  }
};

export default auditLogService;
