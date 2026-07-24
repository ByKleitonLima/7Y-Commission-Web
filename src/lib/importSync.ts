import { supabase } from "@/lib/supabase";

const MANAGERS_TABLE = "managers";
const SELLERS_TABLE = "sellers";
const CLIENTS_TABLE = "clients";

export async function recomputeManagerSellersCount(supervisorIds: string[]) {
  const uniqueIds = Array.from(new Set(supervisorIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const { data: sellersData, error } = await supabase
    .from(SELLERS_TABLE)
    .select("supervisor_id")
    .in("supervisor_id", uniqueIds);

  if (error) {
    console.error("Erro ao recalcular vendedores vinculados ao gerente:", error);
    return;
  }

  const counts = new Map<string, number>();
  (sellersData ?? []).forEach((s: any) => {
    if (!s.supervisor_id) return;
    counts.set(s.supervisor_id, (counts.get(s.supervisor_id) ?? 0) + 1);
  });

  await Promise.all(
    uniqueIds.map((supId) =>
      supabase
        .from(MANAGERS_TABLE)
        .update({ sellers_count: counts.get(supId) ?? 0 })
        .eq("supervisor_id", supId)
    )
  );
}

export async function recomputeSellerClientsCount(sellerCodes: string[]) {
  const uniqueCodes = Array.from(new Set(sellerCodes.filter(Boolean)));
  if (uniqueCodes.length === 0) return;

  const { data: clientsData, error } = await supabase
    .from(CLIENTS_TABLE)
    .select("seller_code")
    .in("seller_code", uniqueCodes);

  if (error) {
    console.error("Erro ao recalcular clientes vinculados ao vendedor:", error);
    return;
  }

  const counts = new Map<string, number>();
  (clientsData ?? []).forEach((c: any) => {
    if (!c.seller_code) return;
    counts.set(c.seller_code, (counts.get(c.seller_code) ?? 0) + 1);
  });

  await Promise.all(
    uniqueCodes.map((code) =>
      supabase
        .from(SELLERS_TABLE)
        .update({ clients_count: counts.get(code) ?? 0 })
        .eq("seller_code", code)
    )
  );
}