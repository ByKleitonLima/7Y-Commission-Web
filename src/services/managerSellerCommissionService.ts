// src/services/managerSellerCommissionService.ts
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/apiClient";

const TABLE = "manager_seller_commission_percents";

export interface ManagerSellerPercentRow {
  id?: string;
  supervisorId: string;
  sellerCode: string;
  percent: number;
  updatedAt?: string;
}

function fromDb(row: any): ManagerSellerPercentRow {
  return {
    id: row.id,
    supervisorId: row.supervisor_id || "",
    sellerCode: row.seller_code,
    percent: Number(row.percent) || 0,
    updatedAt: row.updated_at,
  };
}

export async function fetchManagerSellerPercents(): Promise<ManagerSellerPercentRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) {
    console.error("Erro ao buscar percentuais do gerente por vendedor:", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

// Escrita via rota /api/manager-seller-commission (client admin no
// servidor) — mesmo motivo das outras tabelas de configuração de comissão.
export async function upsertManagerSellerPercent(input: {
  supervisorId: string;
  sellerCode: string;
  percent: number;
}): Promise<void> {
  await authFetch("/api/manager-seller-commission", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteManagerSellerPercent(sellerCode: string): Promise<void> {
  await authFetch("/api/manager-seller-commission/delete", {
    method: "POST",
    body: JSON.stringify({ sellerCode }),
  });
}