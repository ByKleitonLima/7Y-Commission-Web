import { SalesRecord } from "@/context/salesDataContext";
import type { RankingItem } from "@/components/topRankCard";
import type { GroupSalesData } from "@/components/groupProducts";
import { isSaleOrder } from "@/lib/orgAggregations";

/*
 * ATENÇÃO — reescrita para performance:
 * A versão anterior usava getProp() (varredura de todas as chaves do objeto +
 * toLowerCase em cada uma, a cada campo lido, em 9 loops separados sobre o
 * array completo de registros). Como os SalesRecord já são tipados e vêm
 * normalizados de fromDbRecord()/parseSalesFile.ts, esse acesso "flexível"
 * era puro overhead e é a causa raiz do travamento da Home.
 *
 * Agora: 1 único loop sobre os registros (buildDashboardAggregates) monta
 * TODOS os agregados de uma vez, com acesso direto aos campos (r.totalValue,
 * r.managerName, etc). As funções antigas (getTopManagers, getTopSellers...)
 * continuam existindo para não quebrar imports existentes, mas cada uma é
 * apenas uma fatia do resultado de buildDashboardAggregates — chame
 * buildDashboardAggregates() UMA vez em page.tsx e reuse o resultado.
 *
 * ATUALIZAÇÃO (correção Home):
 * O dashboard passou a agrupar pela coluna FAMILIA da planilha (campo
 * `family` do SalesRecord) em vez da "Mercadoria" (nome do produto). Isso
 * afeta: filtro principal, ranking "topProducts" (mantém o nome do campo
 * por compatibilidade com a tela de Importação, mas os itens agora
 * representam Famílias), o agrupamento "Top 3 por Grupo" e o ranking de
 * fornecedores. O ranking de fornecedores também ganhou detalhamento por
 * região (qual região mais compra de cada fornecedor).
 */

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (v: number) => currency.format(v || 0);
const formatNumber = (v: number) => (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Cache de datas parseadas por registro (evita reparsear a mesma string
// várias vezes em diferentes funções/rerenders do mesmo array de records).
const dateCache = new WeakMap<SalesRecord, Date | null>();

function parseFlexibleDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (!str) return null;

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `20${y}` : y;
      const iso = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const parsed = new Date(iso);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function extractDate(r: SalesRecord): Date | null {
  if (!r) return null;
  if (dateCache.has(r)) return dateCache.get(r)!;
  const d = parseFlexibleDate(r.issueDate);
  dateCache.set(r, d);
  return d;
}

// Mantida por compatibilidade (algumas telas ainda podem exibir o nome do
// produto individualmente), mas o Dashboard não usa mais isso para
// agrupar/filtrar — ver extractFamily().
export function extractProduct(r: SalesRecord): string {
  return r?.productName || "Desconhecido";
}

// Chave principal de agrupamento do Dashboard (coluna FAMILIA da planilha).
export function extractFamily(r: SalesRecord): string {
  const f = (r?.family || "").trim();
  return f || "Sem Família";
}

export function extractRegion(r: SalesRecord): string {
  return (r?.division || "").trim() || "Sem Região";
}

export function extractGroup(r: SalesRecord): string {
  return r?.group || r?.family || "Sem Grupo";
}

export function extractSupplier(r: SalesRecord): string {
  return r?.supplier || "Sem Fornecedor";
}

function getOrderKey(r: SalesRecord): string {
  return r.uniqueNumber || r.orderRef || `${r.productCode}-${r.issueDate}-${r.totalValue}`;
}

// Só considera pedidos de venda de fato (DESCR. = "[D] - PED. VENDA" ou
// "PED. VENDA"). Usado pelos relatórios da Home — o restante dos
// lançamentos (devolução, bonificação etc.) fica de fora e é usado em
// outras telas.
export function filterSaleOrders(records: SalesRecord[]): SalesRecord[] {
  return (records || []).filter(isSaleOrder);
}

// ---- Listas para popular os dropdowns de filtro (De/Até já aplicado antes) ----

// Mantida por compatibilidade (não usada mais no filtro principal da Home).
export function getSortedProducts(records: SalesRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records || []) {
    const p = extractProduct(r).trim();
    if (p) set.add(p);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Filtro principal da Home (antes "Mercadoria", agora "Família").
export function getSortedFamilies(records: SalesRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records || []) {
    const f = extractFamily(r).trim();
    if (f && f !== "Sem Família") set.add(f);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function getSortedRegions(records: SalesRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records || []) {
    const g = extractRegion(r).trim();
    if (g && g !== "Sem Região") set.add(g);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function getSortedGroups(records: SalesRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records || []) {
    const g = extractGroup(r).trim();
    if (g && g !== "Sem Grupo") set.add(g);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Filtra por período (De/Até em DD/MM/AAAA). Falha segura: se as datas do
// filtro não forem válidas, retorna os registros sem filtrar.
export function filterByDateRange(records: SalesRecord[], fromStr: string, toStr: string): SalesRecord[] {
  const safeRecords = records || [];
  const from = parseFlexibleDate(fromStr);
  const to = parseFlexibleDate(toStr);
  if (!from || !to) return safeRecords;

  const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();

  return safeRecords.filter((r) => {
    const d = extractDate(r);
    if (!d) return false;
    const t = d.getTime();
    return t >= fromTime && t <= toTime;
  });
}

// ---- Núcleo: 1 passagem só para todos os agregados da Home ----

interface Accumulator {
  revenue: number;
  fardos: number;
  volume: number;
  orders: Set<string>;
}

function newAcc(): Accumulator {
  return { revenue: 0, fardos: 0, volume: 0, orders: new Set() };
}

interface RegionBreakdown {
  revenue: number;
  fardos: number;
}

interface SupplierAccumulator extends Accumulator {
  regions: Map<string, RegionBreakdown>;
}

function newSupplierAcc(): SupplierAccumulator {
  return { revenue: 0, fardos: 0, volume: 0, orders: new Set(), regions: new Map() };
}

function rankFromMap(
  map: Map<string, Accumulator>,
  sortKey: "revenue" | "fardos" | "volume",
  limit: number,
  buildValue: (name: string, acc: Accumulator, totalForPercent: number) => Omit<RankingItem, "position">
): RankingItem[] {
  const total = Array.from(map.values()).reduce((sum, a) => sum + a[sortKey], 0);
  return Array.from(map.entries())
    .sort((a, b) => b[1][sortKey] - a[1][sortKey])
    .slice(0, limit)
    .map(([name, acc], index) => ({ ...buildValue(name, acc, total), position: index + 1 }));
}

const KNOWN_SP_REGIONS = ["SAO PAULO", "SÃO PAULO", "INTERIOR", "LITORAL"];
function normalizeRegionLabel(region: string): string {
  const clean = (region || "").trim().toUpperCase();
  if (!clean || clean === "SEM REGIÃO") return "Sem Região";
  if (KNOWN_SP_REGIONS.includes(clean)) return region.trim();
  return "Outras Regiões";
}

export interface DailyTotal {
  day: string; // rótulo DD/MM pra exibir no eixo X
  dateKey: string; // AAAA-MM-DD, pra ordenação estável
  revenue: number;
  fardos: number;
}

export interface DashboardAggregates {
  topManagers: RankingItem[];
  topSellers: RankingItem[];
  // Mantido com esse nome por compatibilidade com a tela de Importação,
  // mas os itens agora representam FAMÍLIAS (não mais "Mercadoria").
  topProducts: RankingItem[];
  productsByGroup: Record<string, RankingItem[]>;
  dailyTotals: DailyTotal[];
  groupSalesData: GroupSalesData[];
  topRegions: RankingItem[];
  topSuppliers: RankingItem[];
}

// Monta o mapa dia -> { revenue, fardos } a partir de um conjunto de
// registros, preenchendo com zero os dias do período sem venda (se
// fromStr/toStr forem passados) pra o eixo do gráfico ficar contínuo.
function buildDailyMap(
  records: SalesRecord[],
  fromStr?: string,
  toStr?: string
): DailyTotal[] {
  const dailyMap = new Map<string, { revenue: number; fardos: number }>();

  for (const r of records || []) {
    const revenue = Number(r.totalValue) || 0;
    const fardos = Number(r.bundleQuantity) || 0;
    const parsedDate = extractDate(r);
    if (parsedDate) {
      const dateKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
      const day = dailyMap.get(dateKey) || { revenue: 0, fardos: 0 };
      day.revenue += revenue;
      day.fardos += fardos;
      dailyMap.set(dateKey, day);
    }
  }

  const from = fromStr ? parseFlexibleDate(fromStr) : null;
  const to = toStr ? parseFlexibleDate(toStr) : null;

  if (from && to) {
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor.getTime() <= end.getTime()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (!dailyMap.has(key)) dailyMap.set(key, { revenue: 0, fardos: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(dailyMap.entries())
    .sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0))
    .map(([dateKey, totals]) => {
      const [, m, d] = dateKey.split("-");
      return { day: `${d}/${m}`, dateKey, revenue: totals.revenue, fardos: totals.fardos };
    });
}

// Total diário isolado (sem os rankings), usado pelo filtro de Família
// específico do gráfico "Faturamento Total de Mercadorias" — que pode ser
// diferente do filtro geral da página.
export function buildDailyTotals(
  records: SalesRecord[],
  fromStr?: string,
  toStr?: string
): DailyTotal[] {
  return buildDailyMap(records || [], fromStr, toStr);
}

// Faz UMA única varredura no array de registros já filtrado (período,
// família, região) e monta todos os cards/gráficos da Home de uma vez.
// fromStr/toStr (DD/MM/AAAA) são opcionais e servem só pra preencher com
// zero os dias do período que não tiveram venda, deixando o eixo do
// gráfico diário contínuo (sem "buracos").
export function buildDashboardAggregates(
  records: SalesRecord[],
  fromStr?: string,
  toStr?: string
): DashboardAggregates {
  const safeRecords = records || [];

  const managers = new Map<string, Accumulator>();
  const sellers = new Map<string, Accumulator>();
  const families = new Map<string, Accumulator>();
  const regions = new Map<string, Accumulator>();
  const suppliers = new Map<string, SupplierAccumulator>();
  const groupTotals = new Map<string, { value: number; fardos: number }>();
  // família -> acumulador, particionado por grupo (pra Top 3 por grupo sem 2ª passagem)
  const familiesByGroupMap = new Map<string, Map<string, Accumulator>>();

  for (const r of safeRecords) {
    if (!r) continue;

    const manager = r.managerName || "Sem Gerente";
    const seller = r.sellerName || "Sem Vendedor";
    const family = extractFamily(r);
    const region = extractRegion(r);
    const normalizedRegion = normalizeRegionLabel(region);
    const supplier = extractSupplier(r);
    const group = extractGroup(r);

    const revenue = Number(r.totalValue) || 0;
    const fardos = Number(r.bundleQuantity) || 0;
    const quantity = Number(r.quantity) || 0;
    const orderKey = getOrderKey(r);

    let m = managers.get(manager);
    if (!m) managers.set(manager, (m = newAcc()));
    m.revenue += revenue;
    m.fardos += fardos;
    m.orders.add(orderKey);

    let s = sellers.get(seller);
    if (!s) sellers.set(seller, (s = newAcc()));
    s.revenue += revenue;
    s.fardos += fardos;
    s.volume += quantity;
    s.orders.add(orderKey);

    let f = families.get(family);
    if (!f) families.set(family, (f = newAcc()));
    f.revenue += revenue;
    f.fardos += fardos;
    f.orders.add(orderKey);

    let rg = regions.get(normalizedRegion);
    if (!rg) regions.set(normalizedRegion, (rg = newAcc()));
    rg.revenue += revenue;
    rg.fardos += fardos;
    rg.orders.add(orderKey);

    let sp = suppliers.get(supplier);
    if (!sp) suppliers.set(supplier, (sp = newSupplierAcc()));
    sp.revenue += revenue;
    sp.fardos += fardos;
    sp.orders.add(orderKey);
    const spRegion = sp.regions.get(region) || { revenue: 0, fardos: 0 };
    spRegion.revenue += revenue;
    spRegion.fardos += fardos;
    sp.regions.set(region, spRegion);

    const gTotal = groupTotals.get(group) || { value: 0, fardos: 0 };
    gTotal.value += revenue;
    gTotal.fardos += fardos;
    groupTotals.set(group, gTotal);

    let groupFamilies = familiesByGroupMap.get(group);
    if (!groupFamilies) familiesByGroupMap.set(group, (groupFamilies = new Map()));
    let gf = groupFamilies.get(family);
    if (!gf) groupFamilies.set(family, (gf = newAcc()));
    gf.revenue += revenue;
    gf.fardos += fardos;
    gf.orders.add(orderKey);
  }

  const topManagers = rankFromMap(managers, "revenue", 5, (name, acc, total) => ({
    name,
    value: formatCurrency(acc.revenue),
    subtitle: `${formatNumber(acc.fardos)} fardos`,
    details: [
      { label: "Faturamento total", value: formatCurrency(acc.revenue) },
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do faturamento geral", value: `${total > 0 ? ((acc.revenue / total) * 100).toFixed(1) : "0"}%` },
    ],
  }));

  const topSellers = rankFromMap(sellers, "volume", 5, (name, acc, total) => ({
    name,
    value: `${formatNumber(acc.volume)} un.`,
    subtitle: formatCurrency(acc.revenue),
    details: [
      { label: "Volume vendido", value: `${formatNumber(acc.volume)} un.` },
      { label: "Faturamento", value: formatCurrency(acc.revenue) },
      { label: "Fardos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do volume geral", value: `${total > 0 ? ((acc.volume / total) * 100).toFixed(1) : "0"}%` },
    ],
  }));

  // "topProducts": mantém o nome do campo por compatibilidade, mas agora
  // representa as FAMÍLIAS campeãs (coluna FAMILIA da planilha).
  const topProducts = rankFromMap(families, "fardos", 5, (name, acc, total) => ({
    name,
    value: `${formatNumber(acc.fardos)} Fardos`,
    subtitle: formatCurrency(acc.revenue),
    details: [
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Faturamento", value: formatCurrency(acc.revenue) },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do total de fardos", value: `${total > 0 ? ((acc.fardos / total) * 100).toFixed(1) : "0"}%` },
    ],
  }));

  const topRegions = rankFromMap(regions, "revenue", 8, (name, acc, total) => ({
    name,
    subtitle: `${acc.orders.size.toLocaleString("pt-BR")} pedidos`,
    value: formatCurrency(acc.revenue),
    details: [
      { label: "Faturamento", value: formatCurrency(acc.revenue) },
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do faturamento geral", value: `${total > 0 ? ((acc.revenue / total) * 100).toFixed(1) : "0"}%` },
    ],
  }));

  // Fornecedores: além de fardos/faturamento/pedidos/%, mostra qual região
  // mais compra daquele fornecedor (por faturamento), com a quantidade de
  // fardos e o faturamento gerado especificamente naquela região.
  const supplierTotalFardos = Array.from(suppliers.values()).reduce((sum, a) => sum + a.fardos, 0);
  const topSuppliers: RankingItem[] = Array.from(suppliers.entries())
    .sort((a, b) => b[1].fardos - a[1].fardos)
    .slice(0, 8)
    .map(([name, acc], index) => {
      let topRegionName = "Sem região";
      let topRegionData: RegionBreakdown = { revenue: 0, fardos: 0 };
      for (const [regionName, regionData] of acc.regions.entries()) {
        if (regionData.revenue > topRegionData.revenue) {
          topRegionName = regionName || "Sem região";
          topRegionData = regionData;
        }
      }

      return {
        position: index + 1,
        name,
        subtitle: `${acc.orders.size.toLocaleString("pt-BR")} pedidos`,
        value: `${formatNumber(acc.fardos)} Fardos`,
        details: [
          { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
          { label: "Faturamento", value: formatCurrency(acc.revenue) },
          { label: "Pedidos com este fornecedor", value: `${acc.orders.size}` },
          {
            label: "% do total de fardos",
            value: `${supplierTotalFardos > 0 ? ((acc.fardos / supplierTotalFardos) * 100).toFixed(1) : "0"}%`,
          },
          { label: "Região que mais compra", value: topRegionName },
          { label: "Fardos vendidos nessa região", value: `${formatNumber(topRegionData.fardos)} un.` },
          { label: "Faturamento nessa região", value: formatCurrency(topRegionData.revenue) },
        ],
      };
    });

  const groupColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#334155"];
  const groupSalesData: GroupSalesData[] = Array.from(groupTotals.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .map(([name, t], i) => ({ name, value: t.value, fardos: t.fardos, color: groupColors[i % groupColors.length] }));

  const productsByGroup: Record<string, RankingItem[]> = {};
  for (const [group, groupFamilies] of familiesByGroupMap.entries()) {
    productsByGroup[group] = rankFromMap(groupFamilies, "fardos", 3, (name, acc, total) => ({
      name,
      value: `${formatNumber(acc.fardos)} Fardos`,
      subtitle: formatCurrency(acc.revenue),
      details: [
        { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
        { label: "Faturamento", value: formatCurrency(acc.revenue) },
        { label: "Pedidos", value: `${acc.orders.size}` },
        { label: "% dentro do grupo", value: `${total > 0 ? ((acc.fardos / total) * 100).toFixed(1) : "0"}%` },
      ],
    }));
  }

  // Gráfico "Faturamento Total de Mercadorias": total de fardos vendidos +
  // faturamento, dia a dia. Preenche com zero os dias do período sem venda
  // pra o eixo ficar contínuo. Reage ao filtro de família/região porque
  // `records` já chega filtrado do page.tsx.
  const dailyTotals = buildDailyMap(safeRecords, fromStr, toStr);

  return {
    topManagers,
    topSellers,
    topProducts,
    productsByGroup,
    dailyTotals,
    groupSalesData,
    topRegions,
    topSuppliers,
  };
}