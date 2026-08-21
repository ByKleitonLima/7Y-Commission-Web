// src/lib/groupCommissionAggregations.ts
import { SalesRecord } from "@/context/salesDataContext";
import { isSaleOrder } from "@/lib/orgAggregations";

// Percentuais padrão por grupo. Usados quando o vendedor NÃO tem um
// percentual customizado salvo em seller_group_commission_percents.
// Confirmado batendo com a planilha REL_COMISSÃO: GRUPO1 = 3%, GRUPO2 = 2%.
export const DEFAULT_GROUP_PERCENTS: Record<string, number> = {
  GRUPO1: 3,
  GRUPO2: 2,
};

// Vendedoras do Gerente 10 (equipe feminina): recebem um percentual FLAT
// sobre o faturamento líquido total, em vez do cálculo por GRUPO1/GRUPO2.
// Estes são os valores padrão — podem ser sobrescritos por vendedor na
// tabela seller_flat_commission_percents via tela de Comissões.
export const DEFAULT_FLAT_SELLER_PERCENTS: Record<string, number> = {
  "1009": 0.5285,
  "1010": 0.5285,
  "1004": 0.5285,
  "1007": 0.5285,
  "1008": 0.5285,
};

// Percentual que o Gerente 10 ganha sobre CADA uma dessas vendedoras
// específicas (calculado sobre o faturamento líquido da vendedora), em vez
// do padrão de 1/4 (25%) da comissão dela. Também sobrescrevível por
// vendedor na tabela manager_seller_commission_percents.
export const DEFAULT_MANAGER_SELLER_PERCENTS: Record<string, number> = {
  "1009": 1.75,
  "1010": 1.75,
  "1004": 1.75,
  "1007": 1.75,
  "1008": 1.75,
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

// ---- Percentual FLAT por vendedor (sobre faturamento líquido) ----

export interface SellerFlatPercentInput {
  sellerCode: string;
  percent: number;
}

// Mapa sellerCode -> percent (carregado de seller_flat_commission_percents).
export type FlatPercentOverrides = Map<string, number>;

export function buildFlatPercentOverridesMap(rows: SellerFlatPercentInput[]): FlatPercentOverrides {
  const map: FlatPercentOverrides = new Map();
  for (const row of rows) {
    const sellerCode = (row.sellerCode || "").trim();
    if (!sellerCode) continue;
    map.set(sellerCode, Number(row.percent) || 0);
  }
  return map;
}

// Retorna o percentual flat efetivo para o vendedor (customizado, senão o
// padrão hardcoded para as 5 vendedoras do Gerente 10), ou null se este
// vendedor usa o cálculo normal por GRUPO1/GRUPO2.
export function resolveFlatSellerPercent(
  sellerCode: string,
  overrides: FlatPercentOverrides
): number | null {
  const custom = overrides.get(sellerCode);
  if (custom !== undefined) return custom;
  const fallback = DEFAULT_FLAT_SELLER_PERCENTS[sellerCode];
  return fallback !== undefined ? fallback : null;
}

// ---- Percentual do GERENTE por vendedor (sobre faturamento líquido) ----

export interface ManagerSellerPercentInput {
  sellerCode: string;
  percent: number;
}

// Mapa sellerCode -> percent (carregado de manager_seller_commission_percents).
export type ManagerSellerPercentOverrides = Map<string, number>;

export function buildManagerSellerPercentOverridesMap(
  rows: ManagerSellerPercentInput[]
): ManagerSellerPercentOverrides {
  const map: ManagerSellerPercentOverrides = new Map();
  for (const row of rows) {
    const sellerCode = (row.sellerCode || "").trim();
    if (!sellerCode) continue;
    map.set(sellerCode, Number(row.percent) || 0);
  }
  return map;
}

// Retorna o percentual que o gerente ganha SOBRE O FATURAMENTO LÍQUIDO
// deste vendedor específico (customizado, senão o padrão hardcoded pras 5
// vendedoras do Gerente 10), ou null se este vendedor usa a regra padrão
// (gerente recebe 1/4 da comissão do vendedor).
export function resolveManagerSellerPercent(
  sellerCode: string,
  overrides: ManagerSellerPercentOverrides
): number | null {
  const custom = overrides.get(sellerCode);
  if (custom !== undefined) return custom;
  const fallback = DEFAULT_MANAGER_SELLER_PERCENTS[sellerCode];
  return fallback !== undefined ? fallback : null;
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
  // Se não-nulo, a comissão deste vendedor foi calculada como
  // netRevenue * flatPercent / 100 (regra flat), ignorando groupBreakdown
  // para fins de valor final — usado pelas vendedoras do Gerente 10.
  flatPercent: number | null;
}

export interface ManagerSellerContribution {
  sellerCode: string;
  sellerName: string;
  netRevenue: number;
  sellerCommission: number;
  // Percentual efetivo aplicado sobre o faturamento líquido do vendedor
  // para chegar na contribuição dele na comissão do gerente.
  percent: number;
  isCustomPercent: boolean;
  contribution: number;
}

export interface ManagerGroupCommissionAggregate {
  supervisorId: string;
  managerName: string;
  netRevenue: number;
  sellersCommissionTotal: number;
  commission: number; // soma das contribuições por vendedor (custom ou 1/4 padrão)
  sellersCount: number;
  orders: number;
  sellerContributions: ManagerSellerContribution[];
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

// Gerente recebe 1/4 (25%) do que os vendedores dele recebem, EXCETO
// quando há um percentual customizado por vendedor (ver
// resolveManagerSellerPercent) — nesse caso o gerente recebe
// netRevenue_do_vendedor * percent / 100 daquele vendedor específico.
const MANAGER_SHARE_OF_SELLERS = 0.25;

interface SellerDraft {
  sellerName: string;
  supervisorId: string;
  managerName: string;
  premium: number;
  orders: Set<string>;
  groupRevenue: Map<string, number>;
}

interface ManagerDraft {
  managerName: string;
  netRevenue: number;
  sellersCommissionTotal: number;
  managerCommission: number;
  sellerCodes: Set<string>;
  orders: Set<string>;
  sellerContributions: ManagerSellerContribution[];
}

// IMPORTANTE: assim como a tela de Comissão já fazia antes, somamos
// TODAS as linhas (vendas, devoluções, bonificações), sem filtrar por
// tipo de pedido — devoluções chegam com VLR_LIQUIDO negativo e por
// isso já se descontam sozinhas do faturamento líquido por grupo.
export function buildGroupCommissionAggregates(
  records: SalesRecord[],
  overrides: GroupPercentOverrides,
  flatOverrides: FlatPercentOverrides = new Map(),
  managerSellerOverrides: ManagerSellerPercentOverrides = new Map()
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

      // Regra FLAT (vendedoras do Gerente 10 e outros configurados):
      // ignora o breakdown por grupo e usa netRevenue * flatPercent / 100.
      const flatPercent = resolveFlatSellerPercent(sellerCode, flatOverrides);
      const commission =
        flatPercent !== null
          ? (netRevenue * flatPercent) / 100
          : groupBreakdown.reduce((sum, g) => sum + g.commission, 0);

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
        flatPercent,
      };
    }
  );

  sellerAggs.sort((a, b) => b.commission - a.commission);

  // Agrupa por gerente (ID_SUPERVISOR, com fallback pelo nome quando a
  // linha não tem supervisor_id) e calcula, PARA CADA VENDEDOR, quanto
  // ele contribui na comissão do gerente — usando o percentual customizado
  // (sobre o faturamento líquido do vendedor) quando existir, senão o
  // padrão de 1/4 da comissão do vendedor.
  const managerDrafts = new Map<string, ManagerDraft>();

  for (const s of sellerAggs) {
    const key = s.supervisorId || `NOME:${s.managerName}`;
    let m = managerDrafts.get(key);
    if (!m) {
      m = {
        managerName: s.managerName,
        netRevenue: 0,
        sellersCommissionTotal: 0,
        managerCommission: 0,
        sellerCodes: new Set<string>(),
        orders: new Set<string>(),
        sellerContributions: [],
      };
      managerDrafts.set(key, m);
    }
    m.managerName = s.managerName || m.managerName;
    m.netRevenue += s.netRevenue;
    m.sellersCommissionTotal += s.commission;
    m.sellerCodes.add(s.sellerCode);

    const customPercent = resolveManagerSellerPercent(s.sellerCode, managerSellerOverrides);

    let contribution: number;
    let percentForDisplay: number;
    const isCustomPercent = customPercent !== null;

    if (customPercent !== null) {
      contribution = (s.netRevenue * customPercent) / 100;
      percentForDisplay = customPercent;
    } else {
      contribution = s.commission * MANAGER_SHARE_OF_SELLERS;
      percentForDisplay = s.netRevenue !== 0 ? (contribution / s.netRevenue) * 100 : 0;
    }

    m.managerCommission += contribution;
    m.sellerContributions.push({
      sellerCode: s.sellerCode,
      sellerName: s.sellerName,
      netRevenue: s.netRevenue,
      sellerCommission: s.commission,
      percent: percentForDisplay,
      isCustomPercent,
      contribution,
    });
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
      commission: m.managerCommission,
      sellersCount: m.sellerCodes.size,
      orders: m.orders.size,
      sellerContributions: m.sellerContributions.sort((a, b) => b.contribution - a.contribution),
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