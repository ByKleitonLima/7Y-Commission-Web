import { supabase } from "@/lib/supabase";
import { logAudit } from "@/services/auditLogService";

const TABLE = "seller_discounts";

export interface ManualDiscount {
  id: string;
  sellerCode: string;
  sellerName: string;
  amount: number;
  reason: string;
  discountDate: string;
  createdBy?: string;
  createdAt?: string;
}

function fromDbRow(row: any): ManualDiscount {
  return {
    id: row.id,
    sellerCode: row.seller_code || "",
    sellerName: row.seller_name || "",
    amount: Number(row.amount) || 0,
    reason: row.reason || "",
    discountDate: row.discount_date || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at,
  };
}

export async function fetchManualDiscounts(): Promise<ManualDiscount[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar descontos manuais:", error);
    return [];
  }

  return (data ?? []).map(fromDbRow);
}

export async function createManualDiscount(input: {
  sellerCode: string;
  sellerName: string;
  amount: number;
  reason: string;
  discountDate: string;
  createdBy?: string;
}): Promise<ManualDiscount> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        seller_code: input.sellerCode || null,
        seller_name: input.sellerName,
        amount: input.amount,
        reason: input.reason || null,
        discount_date: input.discountDate || new Date().toISOString().slice(0, 10),
        created_by: input.createdBy || null,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar desconto manual:", error);
    throw error;
  }

  await logAudit({
    action: "create",
    entityType: "discount",
    entityId: data.id,
    entityLabel: input.sellerName,
    description: `Desconto manual de ${input.amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })} lançado para "${input.sellerName}".`,
    changes: { after: input },
    userName: input.createdBy,
  });

  return fromDbRow(data);
}

export async function updateManualDiscount(
  id: string,
  input: {
    sellerCode: string;
    sellerName: string;
    amount: number;
    reason: string;
    discountDate: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      seller_code: input.sellerCode || null,
      seller_name: input.sellerName,
      amount: input.amount,
      reason: input.reason || null,
      discount_date: input.discountDate || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar desconto manual:", error);
    throw error;
  }

  await logAudit({
    action: "update",
    entityType: "discount",
    entityId: id,
    entityLabel: input.sellerName,
    description: `Desconto manual de "${input.sellerName}" atualizado para ${input.amount.toLocaleString(
      "pt-BR",
      { style: "currency", currency: "BRL" }
    )}.`,
    changes: { after: input },
  });
}

export async function deleteManualDiscount(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("Erro ao remover desconto manual:", error);
    throw error;
  }

  await logAudit({
    action: "delete",
    entityType: "discount",
    entityId: id,
    description: `Desconto manual removido (id ${id}).`,
  });
}