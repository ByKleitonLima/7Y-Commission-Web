// src/services/sellerFlatCommissionService.ts
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/apiClient";

const TABLE = "seller_flat_commission_percents";

export interface SellerFlatPercentRow {
  id?: string;
  sellerCode: string;
  percent: number;
  updatedAt?: string;
}

function fromDb(row: any): SellerFlatPercentRow {
  return {
    id: row.id,
    sellerCode: row.seller_code,
    percent: Number(row.percent) || 0,
    updatedAt: row.updated_at,
  };
}

export async function fetchSellerFlatPercents(): Promise<SellerFlatPercentRow[]> {
  const { data, error } = await supabase.from(TABLE).select("*");
  if (error) {
    console.error("Erro ao buscar percentuais flat de vendedores:", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

// Escrita via rota /api/seller-flat-commission (client admin no servidor),
// mesmo padrão de group-commission-settings — grava direto pelo client
// bateria na Row Level Security da tabela.
export async function upsertSellerFlatPercent(input: {
  sellerCode: string;
  percent: number;
}): Promise<void> {
  await authFetch("/api/seller-flat-commission", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSellerFlatPercent(sellerCode: string): Promise<void> {
  await authFetch("/api/seller-flat-commission/delete", {
    method: "POST",
    body: JSON.stringify({ sellerCode }),
  });
}