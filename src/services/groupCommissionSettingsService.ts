import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/apiClient";

const TABLE = "seller_group_commission_percents";

export interface SellerGroupPercentRow {
  id?: string;
  sellerCode: string;
  group: string;
  percent: number;
  updatedAt?: string;
}

function fromDb(row: any): SellerGroupPercentRow {
  return {
    id: row.id,
    sellerCode: row.seller_code,
    group: row.group_name,
    percent: Number(row.percent) || 0,
    updatedAt: row.updated_at,
  };
}

export async function fetchSellerGroupPercents(): Promise<SellerGroupPercentRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) {
    console.error("Erro ao buscar percentuais de comissão por grupo:", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

// Escrita passa pela rota /api/group-commission-settings (client admin
// no servidor), mesmo padrão de commission_overrides — grava direto
// pelo client bateria na Row Level Security da tabela.
export async function upsertSellerGroupPercent(input: {
  sellerCode: string;
  group: string;
  percent: number;
}): Promise<void> {
  await authFetch("/api/group-commission-settings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSellerGroupPercent(sellerCode: string, group: string): Promise<void> {
  await authFetch("/api/group-commission-settings/delete", {
    method: "POST",
    body: JSON.stringify({ sellerCode, group }),
  });
}