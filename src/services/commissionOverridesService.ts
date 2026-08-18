import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/apiClient";

const TABLE = "commission_overrides";

export interface CommissionOverride {
  id?: string;
  entityType: "seller" | "manager";
  entityCode: string;
  periodFrom: string;
  periodTo: string;
  overrideCommission: number | null;
  overridePercent: number | null;
  reason?: string;
  updatedBy?: string;
  updatedAt?: string;
}

function fromDb(row: any): CommissionOverride {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityCode: row.entity_code,
    periodFrom: row.period_from || "",
    periodTo: row.period_to || "",
    overrideCommission: row.override_commission === null ? null : Number(row.override_commission),
    overridePercent: row.override_percent === null ? null : Number(row.override_percent),
    reason: row.reason || "",
    updatedBy: row.updated_by || "",
    updatedAt: row.updated_at,
  };
}

// Busca os ajustes manuais válidos para o período selecionado (mesmo
// range de datas usado no filtro da tela de Comissões). Sem filtro de
// data, period_from/period_to ficam vazios ("GERAL").
// A LEITURA continua indo direto pelo client (a policy de SELECT do
// Supabase já permite isso); só a ESCRITA precisou mudar por causa do
// RLS (ver upsertCommissionOverride/deleteCommissionOverrideByKey).
export async function fetchCommissionOverrides(
  periodFrom: string,
  periodTo: string
): Promise<CommissionOverride[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("period_from", periodFrom || "")
    .eq("period_to", periodTo || "");

  if (error) {
    console.error("Erro ao buscar ajustes de comissão:", error);
    return [];
  }
  return (data ?? []).map(fromDb);
}

// IMPORTANTE: a escrita (insert/update) agora passa pela rota
// /api/commission-overrides, que usa o client admin (service role) no
// servidor. Gravar direto pelo client do navegador batia na Row Level
// Security da tabela ("new row violates row-level security policy for
// table commission_overrides") — esse era o erro reportado.
export async function upsertCommissionOverride(input: {
  entityType: "seller" | "manager";
  entityCode: string;
  periodFrom: string;
  periodTo: string;
  overrideCommission: number | null;
  overridePercent: number | null;
  reason?: string;
  updatedBy?: string;
}): Promise<void> {
  await authFetch("/api/commission-overrides", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteCommissionOverrideByKey(
  entityType: "seller" | "manager",
  entityCode: string,
  periodFrom: string,
  periodTo: string
): Promise<void> {
  await authFetch("/api/commission-overrides/delete", {
    method: "POST",
    body: JSON.stringify({ entityType, entityCode, periodFrom, periodTo }),
  });
}