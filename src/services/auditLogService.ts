import { authFetch } from "@/lib/apiClient";

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  description: string | null;
  changes: any;
  metadata: any;
}

export interface AuditLogFilters {
  from?: string;
  to?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function fromApi(row: any): AuditLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    description: row.description,
    changes: row.changes,
    metadata: row.metadata,
  };
}

export async function fetchAuditLogs(
  filters: AuditLogFilters
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 0));
  params.set("pageSize", String(filters.pageSize ?? 50));

  const result = await authFetch(`/api/audit-logs?${params.toString()}`, { method: "GET" });
  return {
    items: (result?.items ?? []).map(fromApi),
    total: result?.total ?? 0,
  };
}

// Chame isso depois de qualquer criação/edição/exclusão/importação nas
// telas do sistema. Nunca deixa uma falha no log quebrar a ação principal.
export async function logAudit(entry: {
  action: "create" | "update" | "delete" | "upload" | string;
  entityType: string;
  entityId?: string | number | null;
  entityLabel?: string;
  description?: string;
  changes?: { before?: any; after?: any } | Record<string, any>;
  metadata?: Record<string, any>;
  userName?: string;
  userEmail?: string;
}): Promise<void> {
  try {
    await authFetch("/api/audit-logs", {
      method: "POST",
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}