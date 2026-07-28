import { SalesRecord } from "@/context/salesDataContext";
import type { RankingItem } from "@/components/topRankCard";
import type { GroupSalesData } from "@/components/groupProducts";
import { isSaleOrder } from "@/lib/orgAggregations";

/*
 * MAPEAMENTO OFICIAL DE COLUNAS (definido pelo time de negócio):
 *
 *  QTDNEG        (quantity)       -> Quantidade em PACOTES. Usar em todo
 *                                     indicador/gráfico/ranking de quantidade.
 *  QTDFARD       (bundleQuantity) -> Quantidade em FARDOS. Indicador próprio,
 *                                     sempre exibido separado de "pacotes".
 *  VLRUNIT       (unitValue)      -> Valor unitário de COMPRA. NUNCA usar para
 *                                     calcular faturamento. Só aparece em
 *                                     detalhe/tooltip/tabela de produto.
 *  VLRTOT        (totalValue)     -> Valor BRUTO do pedido. Usado só como
 *                                     métrica complementar (comparação bruto x
 *                                     líquido), nunca como "faturamento".
 *  % BOLETO / VLR / % DESC_BONI   -> Descontos. Só em detalhe/tooltip.
 *  VLR_LIQUIDO   (netValue)       -> COLUNA OFICIAL para qualquer valor
 *                                     financeiro: Receita, Faturamento, KPIs,
 *                                     gráficos, cards, evolução, ranking
 *                                     financeiro, ticket médio, comparações.
 *  COMISSAO REPR (commissionValue)-> Comissão do representante. Indicadores
 *                                     próprios (por fornecedor, produto,
 *                                     cliente, representante, evolução).
 *  Coluna "Z" (ignorada)          -> Não utilizada em nenhum cálculo da Home.
 *
 * Este arquivo é o único ponto de transformação dos dados usados pela Home —
 * qualquer novo indicador financeiro DEVE ler `netValue`, nunca `totalValue`.
 */

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (v: number) => currency.format(v || 0);
const formatNumber = (v: number) => (v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const formatPercent = (v: number) => `${(v || 0).toFixed(1)}%`;

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

// Mantida por compatibilidade (nome do produto isolado); o agrupamento por
// descrição completa agora vive em buildProductAggregates().
export function extractProduct(r: SalesRecord): string {
  return r?.productName || "Desconhecido";
}

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
// lançamentos (devolução, bonificação etc.) fica de fora.
export function filterSaleOrders(records: SalesRecord[]): SalesRecord[] {
  return (records || []).filter(isSaleOrder);
}

// ---- Listas para popular os dropdowns de filtro (De/Até já aplicado antes) ----

export function getSortedProducts(records: SalesRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records || []) {
    const p = extractProduct(r).trim();
    if (p) set.add(p);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Filtro global "Família" (continua existindo mesmo com o gráfico de
// família removido da Home, conforme pedido — os filtros globais precisam
// continuar disponíveis para todos os gráficos).
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

// ---- Crescimento: compara Receita Líquida do período atual contra o
// período imediatamente anterior, de mesma duração. ----

export interface PeriodGrowth {
  currentNetRevenue: number;
  previousNetRevenue: number;
  growthPercent: number | null; // null quando não há base de comparação
}

export function calculatePeriodGrowth(
  records: SalesRecord[],
  fromStr: string,
  toStr: string
): PeriodGrowth | null {
  const from = parseFlexibleDate(fromStr);
  const to = parseFlexibleDate(toStr);
  if (!from || !to) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime() + dayMs - 1;
  const periodDays = Math.round((toTime - fromTime) / dayMs) + 1;

  const prevToTime = fromTime - 1;
  const prevFromTime = prevToTime - periodDays * dayMs + 1;

  let currentNetRevenue = 0;
  let previousNetRevenue = 0;

  for (const r of records || []) {
    const d = extractDate(r);
    if (!d) continue;
    const t = d.getTime();
    const net = Number(r.netValue) || 0;
    if (t >= fromTime && t <= toTime) currentNetRevenue += net;
    else if (t >= prevFromTime && t <= prevToTime) previousNetRevenue += net;
  }

  const growthPercent =
    previousNetRevenue > 0 ? ((currentNetRevenue - previousNetRevenue) / previousNetRevenue) * 100 : null;

  return { currentNetRevenue, previousNetRevenue, growthPercent };
}

// ---- Núcleo: 1 passagem só para todos os agregados da Home ----

interface Accumulator {
  netRevenue: number; // VLR_LIQUIDO — coluna oficial de faturamento
  grossRevenue: number; // VLRTOT — só comparativo
  commission: number; // COMISSAO REPR.
  fardos: number; // QTDFARD
  volume: number; // QTDNEG (pacotes)
  orders: Set<string>;
}

function newAcc(): Accumulator {
  return { netRevenue: 0, grossRevenue: 0, commission: 0, fardos: 0, volume: 0, orders: new Set() };
}

interface RegionBreakdown {
  netRevenue: number;
  fardos: number;
}

interface SupplierAccumulator extends Accumulator {
  regions: Map<string, RegionBreakdown>;
}

function newSupplierAcc(): SupplierAccumulator {
  return {
    netRevenue: 0,
    grossRevenue: 0,
    commission: 0,
    fardos: 0,
    volume: 0,
    orders: new Set(),
    regions: new Map(),
  };
}

function rankFromMap(
  map: Map<string, Accumulator>,
  sortKey: "netRevenue" | "fardos" | "volume" | "commission",
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
  revenue: number; // SEMPRE VLR_LIQUIDO (faturamento líquido)
  fardos: number; // QTDFARD
}

// Agrupamento por descrição completa do produto (substitui o antigo
// agrupamento por Família na Home, conforme solicitado).
export interface ProductAggregate {
  productCode: string;
  productName: string;
  supplier: string;
  family: string;
  quantity: number; // QTDNEG (pacotes)
  fardos: number; // QTDFARD
  avgUnitValue: number; // VLRUNIT médio — informativo, não é faturamento
  grossRevenue: number; // VLRTOT — informativo
  netRevenue: number; // VLR_LIQUIDO — oficial
  discountTotal: number; // grossRevenue - netRevenue, informativo
  commission: number; // COMISSAO REPR.
  orders: number;
}

export interface SupplierAggregate {
  name: string;
  netRevenue: number;
  grossRevenue: number;
  quantity: number;
  fardos: number;
  commission: number;
  orders: number;
  participation: number; // % do faturamento líquido total entre fornecedores
}

export interface DashboardAggregates {
  // KPIs gerais
  totalNetRevenue: number; // Receita Total (VLR_LIQUIDO) — oficial
  totalGrossRevenue: number; // Receita Bruta (VLRTOT) — comparativo
  totalCommission: number; // Comissão Total (COMISSAO REPR.)
  totalOrders: number;
  avgTicket: number; // totalNetRevenue / totalOrders

  topManagers: RankingItem[];
  topSellers: RankingItem[];
  // Mantido por compatibilidade com a tela de Importação (ranking simples
  // por família), mas a Home não usa mais isso como visualização principal.
  topProducts: RankingItem[];
  productsByGroup: Record<string, RankingItem[]>;
  dailyTotals: DailyTotal[];
  groupSalesData: GroupSalesData[];
  topRegions: RankingItem[];
  topSuppliers: RankingItem[]; // ranking existente (ordenado por fardos)

  // Novidades pedidas
  productAggregates: ProductAggregate[]; // tabela por Descrição do Produto
  supplierAggregates: SupplierAggregate[]; // gráfico exclusivo de fornecedores
  commissionBySupplier: RankingItem[];
}

// Monta o mapa dia -> { revenue, fardos } a partir de um conjunto de
// registros. `revenue` é SEMPRE VLR_LIQUIDO. Preenche com zero os dias do
// período sem venda (se fromStr/toStr forem passados) pra o eixo do gráfico
// ficar contínuo.
function buildDailyMap(records: SalesRecord[], fromStr?: string, toStr?: string): DailyTotal[] {
  const dailyMap = new Map<string, { revenue: number; fardos: number }>();

  for (const r of records || []) {
    const revenue = Number(r.netValue) || 0; // VLR_LIQUIDO — oficial
    const fardos = Number(r.bundleQuantity) || 0; // QTDFARD
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
// específico do gráfico "Faturamento Total de Mercadorias".
export function buildDailyTotals(records: SalesRecord[], fromStr?: string, toStr?: string): DailyTotal[] {
  return buildDailyMap(records || [], fromStr, toStr);
}

// Agrupamento por descrição completa do produto (chave = código + nome,
// pra não misturar produtos homônimos de fornecedores diferentes).
export function buildProductAggregates(records: SalesRecord[]): ProductAggregate[] {
  interface Draft extends ProductAggregate {
    unitValueSum: number;
    unitValueCount: number;
    orderSet: Set<string>;
  }

  const map = new Map<string, Draft>();

  for (const r of records || []) {
    if (!r) continue;
    const key = `${r.productCode || ""}__${r.productName || "Sem descrição"}`;
    let p = map.get(key);
    if (!p) {
      p = {
        productCode: r.productCode || "",
        productName: r.productName || "Sem descrição",
        supplier: extractSupplier(r),
        family: extractFamily(r),
        quantity: 0,
        fardos: 0,
        avgUnitValue: 0,
        grossRevenue: 0,
        netRevenue: 0,
        discountTotal: 0,
        commission: 0,
        orders: 0,
        unitValueSum: 0,
        unitValueCount: 0,
        orderSet: new Set<string>(),
      };
      map.set(key, p);
    }

    const gross = Number(r.totalValue) || 0;
    const net = Number(r.netValue) || 0;

    p.quantity += Number(r.quantity) || 0;
    p.fardos += Number(r.bundleQuantity) || 0;
    p.grossRevenue += gross;
    p.netRevenue += net;
    p.discountTotal += gross - net;
    p.commission += Number(r.commissionValue) || 0;
    if (r.unitValue) {
      p.unitValueSum += Number(r.unitValue) || 0;
      p.unitValueCount += 1;
    }
    p.orderSet.add(getOrderKey(r));
  }

  return Array.from(map.values()).map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
    supplier: p.supplier,
    family: p.family,
    quantity: p.quantity,
    fardos: p.fardos,
    avgUnitValue: p.unitValueCount > 0 ? p.unitValueSum / p.unitValueCount : 0,
    grossRevenue: p.grossRevenue,
    netRevenue: p.netRevenue,
    discountTotal: p.discountTotal,
    commission: p.commission,
    orders: p.orderSet.size,
  }));
}

// Faz UMA única varredura no array de registros já filtrado (período,
// família, região) e monta todos os cards/gráficos da Home de uma vez.
// fromStr/toStr (DD/MM/AAAA) são opcionais e servem só pra preencher com
// zero os dias do período que não tiveram venda no gráfico diário.
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
  const groupTotals = new Map<string, { netRevenue: number; fardos: number }>();
  const familiesByGroupMap = new Map<string, Map<string, Accumulator>>();
  const products = new Map<string, ReturnType<typeof newAcc> & { productCode: string; productName: string }>();

  let totalNetRevenue = 0;
  let totalGrossRevenue = 0;
  let totalCommission = 0;
  const allOrders = new Set<string>();

  for (const r of safeRecords) {
    if (!r) continue;

    const manager = r.managerName || "Sem Gerente";
    const seller = r.sellerName || "Sem Vendedor";
    const family = extractFamily(r);
    const region = extractRegion(r);
    const normalizedRegion = normalizeRegionLabel(region);
    const supplier = extractSupplier(r);
    const group = extractGroup(r);

    // ---- Colunas oficiais ----
    const netRevenue = Number(r.netValue) || 0; // VLR_LIQUIDO — faturamento oficial
    const grossRevenue = Number(r.totalValue) || 0; // VLRTOT — comparativo
    const commission = Number(r.commissionValue) || 0; // COMISSAO REPR.
    const fardos = Number(r.bundleQuantity) || 0; // QTDFARD
    const volume = Number(r.quantity) || 0; // QTDNEG (pacotes)
    const orderKey = getOrderKey(r);

    totalNetRevenue += netRevenue;
    totalGrossRevenue += grossRevenue;
    totalCommission += commission;
    allOrders.add(orderKey);

    let m = managers.get(manager);
    if (!m) managers.set(manager, (m = newAcc()));
    m.netRevenue += netRevenue;
    m.grossRevenue += grossRevenue;
    m.commission += commission;
    m.fardos += fardos;
    m.orders.add(orderKey);

    let s = sellers.get(seller);
    if (!s) sellers.set(seller, (s = newAcc()));
    s.netRevenue += netRevenue;
    s.grossRevenue += grossRevenue;
    s.commission += commission;
    s.fardos += fardos;
    s.volume += volume;
    s.orders.add(orderKey);

    let f = families.get(family);
    if (!f) families.set(family, (f = newAcc()));
    f.netRevenue += netRevenue;
    f.commission += commission;
    f.fardos += fardos;
    f.orders.add(orderKey);

    let rg = regions.get(normalizedRegion);
    if (!rg) regions.set(normalizedRegion, (rg = newAcc()));
    rg.netRevenue += netRevenue;
    rg.fardos += fardos;
    rg.orders.add(orderKey);

    let sp = suppliers.get(supplier);
    if (!sp) suppliers.set(supplier, (sp = newSupplierAcc()));
    sp.netRevenue += netRevenue;
    sp.grossRevenue += grossRevenue;
    sp.commission += commission;
    sp.fardos += fardos;
    sp.volume += volume;
    sp.orders.add(orderKey);
    const spRegion = sp.regions.get(region) || { netRevenue: 0, fardos: 0 };
    spRegion.netRevenue += netRevenue;
    spRegion.fardos += fardos;
    sp.regions.set(region, spRegion);

    const gTotal = groupTotals.get(group) || { netRevenue: 0, fardos: 0 };
    gTotal.netRevenue += netRevenue;
    gTotal.fardos += fardos;
    groupTotals.set(group, gTotal);

    let groupFamilies = familiesByGroupMap.get(group);
    if (!groupFamilies) familiesByGroupMap.set(group, (groupFamilies = new Map()));
    let gf = groupFamilies.get(family);
    if (!gf) groupFamilies.set(family, (gf = newAcc()));
    gf.netRevenue += netRevenue;
    gf.fardos += fardos;
    gf.orders.add(orderKey);

    const productKey = `${r.productCode || ""}__${r.productName || "Sem descrição"}`;
    let pr = products.get(productKey);
    if (!pr) products.set(productKey, (pr = { ...newAcc(), productCode: r.productCode || "", productName: r.productName || "Sem descrição" }));
    pr.netRevenue += netRevenue;
    pr.grossRevenue += grossRevenue;
    pr.commission += commission;
    pr.fardos += fardos;
    pr.volume += volume;
    pr.orders.add(orderKey);
  }

  const totalOrders = allOrders.size;
  const avgTicket = totalOrders > 0 ? totalNetRevenue / totalOrders : 0;

  const topManagers = rankFromMap(managers, "netRevenue", 5, (name, acc, total) => ({
    name,
    value: formatCurrency(acc.netRevenue),
    subtitle: `${formatNumber(acc.fardos)} fardos`,
    details: [
      { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
      { label: "Faturamento bruto", value: formatCurrency(acc.grossRevenue) },
      { label: "Comissão", value: formatCurrency(acc.commission) },
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do faturamento líquido geral", value: formatPercent(total > 0 ? (acc.netRevenue / total) * 100 : 0) },
    ],
  }));

  const topSellers = rankFromMap(sellers, "volume", 5, (name, acc, total) => ({
    name,
    value: `${formatNumber(acc.volume)} un.`,
    subtitle: formatCurrency(acc.netRevenue),
    details: [
      { label: "Volume vendido (pacotes)", value: `${formatNumber(acc.volume)} un.` },
      { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
      { label: "Fardos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Comissão", value: formatCurrency(acc.commission) },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do volume geral", value: formatPercent(total > 0 ? (acc.volume / total) * 100 : 0) },
    ],
  }));

  // "topProducts": ranking simples por família, mantido só por
  // compatibilidade com a tela de Importação (a Home não exibe mais isso —
  // ver ProductsTable, que agrupa por descrição do produto).
  const topProducts = rankFromMap(families, "fardos", 5, (name, acc, total) => ({
    name,
    value: `${formatNumber(acc.fardos)} Fardos`,
    subtitle: formatCurrency(acc.netRevenue),
    details: [
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
      { label: "Comissão", value: formatCurrency(acc.commission) },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do total de fardos", value: formatPercent(total > 0 ? (acc.fardos / total) * 100 : 0) },
    ],
  }));

  const topRegions = rankFromMap(regions, "netRevenue", 8, (name, acc, total) => ({
    name,
    subtitle: `${acc.orders.size.toLocaleString("pt-BR")} pedidos`,
    value: formatCurrency(acc.netRevenue),
    details: [
      { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
      { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
      { label: "Pedidos", value: `${acc.orders.size}` },
      { label: "% do faturamento líquido geral", value: formatPercent(total > 0 ? (acc.netRevenue / total) * 100 : 0) },
    ],
  }));

  // Fornecedores: ranking existente (ordenado por fardos), agora com
  // faturamento líquido/bruto e comissão + região que mais compra.
  const supplierTotalFardos = Array.from(suppliers.values()).reduce((sum, a) => sum + a.fardos, 0);
  const topSuppliers: RankingItem[] = Array.from(suppliers.entries())
    .sort((a, b) => b[1].fardos - a[1].fardos)
    .slice(0, 8)
    .map(([name, acc], index) => {
      let topRegionName = "Sem região";
      let topRegionData: RegionBreakdown = { netRevenue: 0, fardos: 0 };
      for (const [regionName, regionData] of acc.regions.entries()) {
        if (regionData.netRevenue > topRegionData.netRevenue) {
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
          { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
          { label: "Faturamento bruto", value: formatCurrency(acc.grossRevenue) },
          { label: "Comissão", value: formatCurrency(acc.commission) },
          { label: "Pedidos com este fornecedor", value: `${acc.orders.size}` },
          {
            label: "% do total de fardos",
            value: formatPercent(supplierTotalFardos > 0 ? (acc.fardos / supplierTotalFardos) * 100 : 0),
          },
          { label: "Região que mais compra", value: topRegionName },
          { label: "Fardos vendidos nessa região", value: `${formatNumber(topRegionData.fardos)} un.` },
          { label: "Faturamento líquido nessa região", value: formatCurrency(topRegionData.netRevenue) },
        ],
      };
    });

  // Comissão por fornecedor — indicador próprio pedido explicitamente.
  const commissionBySupplier = rankFromMap(
    // reaproveita o mapa de fornecedores (já tem commission), só precisa
    // encaixar no formato Accumulator simples
    new Map(Array.from(suppliers.entries()).map(([name, acc]) => [name, acc as Accumulator])),
    "commission",
    8,
    (name, acc, total) => ({
      name,
      value: formatCurrency(acc.commission),
      subtitle: formatCurrency(acc.netRevenue),
      details: [
        { label: "Comissão", value: formatCurrency(acc.commission) },
        { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
        { label: "Pedidos", value: `${acc.orders.size}` },
        { label: "% da comissão total", value: formatPercent(total > 0 ? (acc.commission / total) * 100 : 0) },
      ],
    })
  );

  const groupColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#334155"];
  const groupSalesData: GroupSalesData[] = Array.from(groupTotals.entries())
    .sort((a, b) => b[1].netRevenue - a[1].netRevenue)
    .map(([name, t], i) => ({
      name,
      value: t.netRevenue,
      fardos: t.fardos,
      color: groupColors[i % groupColors.length],
    }));

  const productsByGroup: Record<string, RankingItem[]> = {};
  for (const [group, groupFamilies] of familiesByGroupMap.entries()) {
    productsByGroup[group] = rankFromMap(groupFamilies, "fardos", 3, (name, acc, total) => ({
      name,
      value: `${formatNumber(acc.fardos)} Fardos`,
      subtitle: formatCurrency(acc.netRevenue),
      details: [
        { label: "Fardos vendidos", value: `${formatNumber(acc.fardos)} un.` },
        { label: "Faturamento líquido", value: formatCurrency(acc.netRevenue) },
        { label: "Pedidos", value: `${acc.orders.size}` },
        { label: "% dentro do grupo", value: formatPercent(total > 0 ? (acc.fardos / total) * 100 : 0) },
      ],
    }));
  }

  const dailyTotals = buildDailyMap(safeRecords, fromStr, toStr);

  // Agregado por descrição de produto (tabela pesquisável/ordenável).
  const productAggregates: ProductAggregate[] = buildProductAggregates(safeRecords);

  // Agregado por fornecedor (novo gráfico exclusivo, com toggle de
  // ordenação no componente).
  const supplierAggregates: SupplierAggregate[] = Array.from(suppliers.entries()).map(([name, acc]) => ({
    name,
    netRevenue: acc.netRevenue,
    grossRevenue: acc.grossRevenue,
    quantity: acc.volume,
    fardos: acc.fardos,
    commission: acc.commission,
    orders: acc.orders.size,
    participation: totalNetRevenue > 0 ? (acc.netRevenue / totalNetRevenue) * 100 : 0,
  }));

  return {
    totalNetRevenue,
    totalGrossRevenue,
    totalCommission,
    totalOrders,
    avgTicket,
    topManagers,
    topSellers,
    topProducts,
    productsByGroup,
    dailyTotals,
    groupSalesData,
    topRegions,
    topSuppliers,
    productAggregates,
    supplierAggregates,
    commissionBySupplier,
  };
}