import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditLogService } from '../services/auditLogService';

export function useAuditLogs(params?: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const queryClient = useQueryClient();

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const response = await auditLogService.getLogs(params || {});
      return response.data.data?.logs || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const response = await auditLogService.getStats();
      return response.data.data;
    },
  });

  const exportLogs = useMutation({
    mutationFn: (exportParams: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) =>
      auditLogService.export(exportParams),
  });

  return {
    logs,
    stats,
    isLoading,
    error,
    refetch,
    exportLogs,
  };
}

export function useEntityAuditLogs(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    queryFn: async () => {
      const response = await auditLogService.getEntityLogs(entityType, entityId);
      return response.data.data?.logs || [];
    },
    enabled: !!entityType && !!entityId,
  });
}

export default useAuditLogs;
