import { SalesRecord } from "@/context/salesDataContext";
import { isSaleOrder } from "@/lib/orgAggregations";

// Percentuais padrão por grupo. Usados quando o vendedor NÃO tem um
// percentual customizado salvo em seller_group_commission_percents.
// Confirmado batendo com a planilha REL_COMISSÃO: GRUPO1 = 3%, GRUPO2 = 2%.
export const DEFAULT_GROUP_PERCENTS: Record<string, number> = {
  GRUPO1: 3,
  GRUPO2: 2,
};

function normalizeGroupKey(group: string | undefined | null): string {
  return (group || "").trim().toUpperCase();
}

function getOrderKey(r: SalesRecord): string {
  return r.uniqueNumber?.trim() || r.orderRef || `${r.productCode}-${r.issueDate}-${r.totalValue}`;
}

export interface SellerGroupPercentInput {
  sellerCode: string;
  group: string;
  percent: number;
}

// Mapa sellerCode -> group -> percent (percentuais customizados por
// vendedor, carregados da tabela seller_group_commission_percents).
export type GroupPercentOverrides = Map<string, Map<string, number>>;

export function buildGroupPercentOverridesMap(rows: SellerGroupPercentInput[]): GroupPercentOverrides {
  const map: GroupPercentOverrides = new Map();
  for (const row of rows) {
    const sellerCode = (row.sellerCode || "").trim();
    if (!sellerCode) continue;
    const group = normalizeGroupKey(row.group);
    let inner = map.get(sellerCode);
    if (!inner) map.set(sellerCode, (inner = new Map()));
    inner.set(group, Number(row.percent) || 0);
  }
  return map;
}

// Resolve o percentual efetivo de um vendedor para um grupo: usa o
// customizado se existir, senão cai no padrão da tabela (3%/2%). Grupos
// desconhecidos (fora de GRUPO1/GRUPO2) sem customização ficam em 0%.
export function resolveGroupPercent(
  sellerCode: string,
  group: string,
  overrides: GroupPercentOverrides
): number {
  const normalizedGroup = normalizeGroupKey(group);
  const custom = overrides.get(sellerCode)?.get(normalizedGroup);
  if (custom !== undefined) return custom;
  return DEFAULT_GROUP_PERCENTS[normalizedGroup] ?? 0;
}

export interface GroupBreakdown {
  group: string;
  netRevenue: number;
  percent: number;
  commission: number;
}

export interface SellerGroupCommissionAggregate {
  sellerCode: string;
  sellerName: string;
  supervisorId: string;
  managerName: string;
  groupBreakdown: GroupBreakdown[];
  netRevenue: number;
  commission: number;
  premium: number;
  orders: number;
}

export interface ManagerGroupCommissionAggregate {
  supervisorId: string;
  managerName: string;
  netRevenue: number;
  sellersCommissionTotal: number;
  commission: number; // 25% (um quarto) do total que os vendedores dele recebem
  sellersCount: number;
  orders: number;
}

export interface GroupCommissionTotals {
  netRevenue: number;
  sellerCommission: number;
  managerCommission: number;
  premium: number;
  orders: number;
}

export interface GroupCommissionAggregates {
  sellers: SellerGroupCommissionAggregate[];
  managers: ManagerGroupCommissionAggregate[];
  totals: GroupCommissionTotals;
  groupsFound: string[];
}

// Gerente recebe 1/4 (25%) do que os vendedores dele recebem.
const MANAGER_SHARE_OF_SELLERS = 0.25;

interface SellerDraft {
  sellerName: string;
  supervisorId: string;
  managerName: string;
  premium: number;
  orders: Set<string>;
  groupRevenue: Map<string, number>;
}

// IMPORTANTE: assim como a tela de Comissão já fazia antes, somamos
// TODAS as linhas (vendas, devoluções, bonificações), sem filtrar por
// tipo de pedido — devoluções chegam com VLR_LIQUIDO negativo e por
// isso já se descontam sozinhas do faturamento líquido por grupo.
export function buildGroupCommissionAggregates(
  records: SalesRecord[],
  overrides: GroupPercentOverrides
): GroupCommissionAggregates {
  const sellers = new Map<string, SellerDraft>();
  const groupsFound = new Set<string>();

  for (const r of records || []) {
    if (!r) continue;

    const sellerCode = (r.sellerCode || "").trim() || "SEM-CODIGO";
    const sellerName = r.sellerName || "Sem Vendedor";
    const supervisorId = (r.supervisorId || "").trim();
    const managerName = r.managerName || "Sem Gerente";
    const group = normalizeGroupKey(r.group);
    if (group) groupsFound.add(group);

    let s = sellers.get(sellerCode);
    if (!s) {
      s = {
        sellerName,
        supervisorId,
        managerName,
        premium: 0,
        orders: new Set<string>(),
        groupRevenue: new Map<string, number>(),
      };
      sellers.set(sellerCode, s);
    }
    s.sellerName = sellerName || s.sellerName;
    s.supervisorId = supervisorId || s.supervisorId;
    s.managerName = managerName || s.managerName;

    const net = Number(r.netValue) || 0;
    const premium = Number(r.premiumPaidValue) || 0;

    if (group) {
      s.groupRevenue.set(group, (s.groupRevenue.get(group) || 0) + net);
    }

    s.premium += premium;
    if (isSaleOrder(r)) s.orders.add(getOrderKey(r));
  }

  const sellerAggs: SellerGroupCommissionAggregate[] = Array.from(sellers.entries()).map(
    ([sellerCode, s]) => {
      const groupBreakdown: GroupBreakdown[] = Array.from(s.groupRevenue.entries())
        .map(([group, netRevenue]) => {
          const percent = resolveGroupPercent(sellerCode, group, overrides);
          return { group, netRevenue, percent, commission: (netRevenue * percent) / 100 };
        })
        .sort((a, b) => a.group.localeCompare(b.group));

      const netRevenue = groupBreakdown.reduce((sum, g) => sum + g.netRevenue, 0);
      const commission = groupBreakdown.reduce((sum, g) => sum + g.commission, 0);

      return {
        sellerCode,
        sellerName: s.sellerName,
        supervisorId: s.supervisorId,
        managerName: s.managerName,
        groupBreakdown,
        netRevenue,
        commission,
        premium: s.premium,
        orders: s.orders.size,
      };
    }
  );

  sellerAggs.sort((a, b) => b.commission - a.commission);

  // Agrupa por gerente (ID_SUPERVISOR, com fallback pelo nome quando a
  // linha não tem supervisor_id) e soma a comissão FINAL de cada
  // vendedor vinculado, pra depois aplicar o 1/4.
  const managerDrafts = new Map< // <--- O ERRO ESTAVA AQUI, FALTAVA O "<"
    string,
    {
      managerName: string;
      netRevenue: number;
      sellersCommissionTotal: number;
      sellerCodes: Set<string>;
      orders: Set<string>;
    }
  >();

  for (const s of sellerAggs) {
    const key = s.supervisorId || `NOME:${s.managerName}`;
    let m = managerDrafts.get(key);
    if (!m) {
      m = {
        managerName: s.managerName,
        netRevenue: 0,
        sellersCommissionTotal: 0,
        sellerCodes: new Set<string>(),
        orders: new Set<string>(),
      };
      managerDrafts.set(key, m);
    }
    m.managerName = s.managerName || m.managerName;
    m.netRevenue += s.netRevenue;
    m.sellersCommissionTotal += s.commission;
    m.sellerCodes.add(s.sellerCode);
  }

  const allOrders = new Set<string>();
  for (const r of records || []) {
    if (!r || !isSaleOrder(r)) continue;
    allOrders.add(getOrderKey(r));

    const supervisorId = (r.supervisorId || "").trim();
    const managerName = r.managerName || "Sem Gerente";
    const key = supervisorId || `NOME:${managerName}`;
    managerDrafts.get(key)?.orders.add(getOrderKey(r));
  }

  const managerAggs: ManagerGroupCommissionAggregate[] = Array.from(managerDrafts.entries())
    .map(([key, m]) => ({
      supervisorId: key.startsWith("NOME:") ? "" : key,
      managerName: m.managerName,
      netRevenue: m.netRevenue,
      sellersCommissionTotal: m.sellersCommissionTotal,
      commission: m.sellersCommissionTotal * MANAGER_SHARE_OF_SELLERS,
      sellersCount: m.sellerCodes.size,
      orders: m.orders.size,
    }))
    .sort((a, b) => b.commission - a.commission);

  const totals: GroupCommissionTotals = {
    netRevenue: sellerAggs.reduce((sum, s) => sum + s.netRevenue, 0),
    sellerCommission: sellerAggs.reduce((sum, s) => sum + s.commission, 0),
    managerCommission: managerAggs.reduce((sum, m) => sum + m.commission, 0),
    premium: sellerAggs.reduce((sum, s) => sum + s.premium, 0),
    orders: allOrders.size,
  };

  return {
    sellers: sellerAggs,
    managers: managerAggs,
    totals,
    groupsFound: Array.from(groupsFound).sort(),
  };
}