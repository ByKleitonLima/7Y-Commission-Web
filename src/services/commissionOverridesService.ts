import { supabase } from "@/lib/supabase";

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
  const { error } = await supabase.from(TABLE).upsert(
    [
      {
        entity_type: input.entityType,
        entity_code: input.entityCode,
        period_from: input.periodFrom || "",
        period_to: input.periodTo || "",
        override_commission: input.overrideCommission,
        override_percent: input.overridePercent,
        reason: input.reason || null,
        updated_by: input.updatedBy || null,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "entity_type,entity_code,period_from,period_to" }
  );

  if (error) {
    console.error("Erro ao salvar ajuste de comissão:", error);
    throw error;
  }
}

export async function deleteCommissionOverrideByKey(
  entityType: "seller" | "manager",
  entityCode: string,
  periodFrom: string,
  periodTo: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_code", entityCode)
    .eq("period_from", periodFrom || "")
    .eq("period_to", periodTo || "");

  if (error) {
    console.error("Erro ao remover ajuste de comissão:", error);
    throw error;
  }
}