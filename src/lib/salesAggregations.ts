// Helper para extrair propriedades dinamicamente ignorando maiúsculas/minúsculas
function getProp(record: any, possibleNames: string[]): any {
  if (!record) return undefined;
  const keys = Object.keys(record);
  const lowerNames = possibleNames.map((n) => n.toLowerCase());

  for (const key of keys) {
    if (lowerNames.includes(key.toLowerCase())) {
      const val = record[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return val;
      }
    }
  }
  return undefined;
}

// Conversores rigorosos numéricos
const getNumber = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatNumber = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// Parser de data robusto: aceita Date, ISO ("AAAA-MM-DD") e o formato
// salvo pelo importador ("DD/MM/AAAA"). Retorna null se não conseguir interpretar.
function parseFlexibleDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

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

export function extractCompany(r: any): string {
  return String(getProp(r, ["companyname", "empresa", "company", "filial"]) || "");
}

export function extractGroup(r: any): string {
  return String(getProp(r, ["group", "grupo", "categoria", "linha", "family", "familia"]) || "Sem Grupo");
}

export function extractProduct(r: any): string {
  return String(getProp(r, ["productName", "produto", "mercadoria", "nome", "product_name"]) || "Desconhecido");
}

export function extractRegion(r: any): string {
  return String(getProp(r, ["division", "divisao", "region", "regiao"]) || "Sem Região");
}

export function extractSupplier(r: any): string {
  return String(getProp(r, ["supplier", "fornecedor"]) || "Sem Fornecedor");
}

// Data real do registro (usada pelo filtro de período e pela evolução diária)
export function extractDate(r: any): Date | null {
  const raw = getProp(r, [
    "issueDate",
    "issue_date",
    "date",
    "data",
    "dataPedido",
    "emissao",
    "createdAt",
  ]);
  return parseFlexibleDate(raw);
}

// Identificador de pedido: usa o número único da planilha; se não existir,
// cai para uma combinação de campos que aproxima um pedido único.
function getOrderKey(r: any): string {
  const unique = getProp(r, ["uniqueNumber", "unique_number", "orderRef", "order_ref"]);
  if (unique) return String(unique);
  return `${getProp(r, ["productCode", "product_code"]) || ""}-${getProp(r, ["issueDate", "issue_date"]) || ""}-${getProp(r, ["totalValue", "total_value"]) || ""}`;
}

// Lista de produtos existentes nos registros, para popular o filtro de mercadoria.
export function getSortedProducts(records: any[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => {
    const p = extractProduct(r).trim();
    if (p) set.add(p);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Lista de regiões existentes nos registros, para popular o filtro de região.
export function getSortedRegions(records: any[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => {
    const g = extractRegion(r).trim();
    if (g && g !== "Sem Região") set.add(g);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Retorna os nomes de grupo reais (ignorando "Sem Grupo") em ordem alfabética,
// para que "Grupo 1" e "Grupo 2" sejam sempre consistentes entre atualizações
// (ex: GRUPO1 antes de GRUPO2), em vez de depender da ordem de aparição nos dados.
export function getSortedGroups(records: any[]): string[] {
  const groups = new Set<string>();
  records.forEach((r) => {
    const g = extractGroup(r).trim();
    if (g && g !== "Sem Grupo") groups.add(g);
  });
  return Array.from(groups).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Filtra os registros por um período (formato DD/MM/AAAA em ambas as pontas).
// Se as datas não forem válidas, retorna os registros sem filtrar (falha segura).
export function filterByDateRange(records: any[], fromStr: string, toStr: string): any[] {
  const from = parseFlexibleDate(fromStr);
  const to = parseFlexibleDate(toStr);
  if (!from || !to) return records;

  const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toTime = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).getTime();

  return records.filter((r) => {
    const d = extractDate(r);
    if (!d) return false;
    const t = d.getTime();
    return t >= fromTime && t <= toTime;
  });
}

// 1. Gerentes (Agrupamento por Faturamento - Valor), com fardos, pedidos e % para o tooltip.
export function getTopManagers(records: any[]) {
  const revenueMap: Record<string, number> = {};
  const fardosMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  records.forEach((r) => {
    const manager = getProp(r, ["managerName", "gerente", "manager", "manager_name"]) || "Sem Gerente";
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));

    revenueMap[manager] = (revenueMap[manager] || 0) + value;
    fardosMap[manager] = (fardosMap[manager] || 0) + fardos;
    if (!orderSets[manager]) orderSets[manager] = new Set();
    orderSets[manager].add(getOrderKey(r));
  });

  const totalRevenue = Object.values(revenueMap).reduce((a, b) => a + b, 0);

  return Object.entries(revenueMap)
    .map(([name, revenue]) => {
      const fardos = fardosMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      return {
        name,
        value: formatCurrency(revenue),
        subtitle: `${formatNumber(fardos)} fardos`,
        rawRevenue: revenue,
        details: [
          { label: "Faturamento total", value: formatCurrency(revenue) },
          { label: "Fardos vendidos", value: `${formatNumber(fardos)} un.` },
          { label: "Pedidos", value: `${orders}` },
          { label: "% do faturamento geral", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawRevenue - a.rawRevenue)
    .slice(0, 5)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 2. Vendedores (Agrupamento por Quantidade), com faturamento, fardos, pedidos e % para o tooltip.
export function getTopSellers(records: any[]) {
  const volumeMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};
  const fardosMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  records.forEach((r) => {
    const seller = getProp(r, ["sellerName", "vendedor", "seller", "seller_name"]) || "Sem Vendedor";
    const quantity = getNumber(getProp(r, ["quantity", "quantidade", "qtd"]));
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));

    volumeMap[seller] = (volumeMap[seller] || 0) + quantity;
    revenueMap[seller] = (revenueMap[seller] || 0) + value;
    fardosMap[seller] = (fardosMap[seller] || 0) + fardos;
    if (!orderSets[seller]) orderSets[seller] = new Set();
    orderSets[seller].add(getOrderKey(r));
  });

  const totalVolume = Object.values(volumeMap).reduce((a, b) => a + b, 0);

  return Object.entries(volumeMap)
    .map(([name, volume]) => {
      const revenue = revenueMap[name] || 0;
      const fardos = fardosMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
      return {
        name,
        value: `${formatNumber(volume)} un.`,
        subtitle: formatCurrency(revenue),
        rawVolume: volume,
        details: [
          { label: "Volume vendido", value: `${formatNumber(volume)} un.` },
          { label: "Faturamento", value: formatCurrency(revenue) },
          { label: "Fardos", value: `${formatNumber(fardos)} un.` },
          { label: "Pedidos", value: `${orders}` },
          { label: "% do volume geral", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawVolume - a.rawVolume)
    .slice(0, 5)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 3. Produtos Campeões de Vendas (Soma estrita de Fardos / bundleQuantity), com faturamento e pedidos.
export function getTopProducts(records: any[]) {
  const fardosMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  records.forEach((r) => {
    const product = extractProduct(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));

    fardosMap[product] = (fardosMap[product] || 0) + fardos;
    revenueMap[product] = (revenueMap[product] || 0) + value;
    if (!orderSets[product]) orderSets[product] = new Set();
    orderSets[product].add(getOrderKey(r));
  });

  const totalFardos = Object.values(fardosMap).reduce((a, b) => a + b, 0);

  return Object.entries(fardosMap)
    .map(([name, fardos]) => {
      const revenue = revenueMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalFardos > 0 ? (fardos / totalFardos) * 100 : 0;
      return {
        name,
        value: `${formatNumber(fardos)} Fardos`,
        subtitle: formatCurrency(revenue),
        rawFardos: fardos,
        details: [
          { label: "Fardos vendidos", value: `${formatNumber(fardos)} un.` },
          { label: "Faturamento", value: formatCurrency(revenue) },
          { label: "Pedidos", value: `${orders}` },
          { label: "% do total de fardos", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawFardos - a.rawFardos)
    .slice(0, 5)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 4. Produtos por Grupo (Top 3 filtrando rigorosamente pelo grupo correspondente)
export function getTopProductsByGroup(records: any[], groupName: string) {
  if (!groupName || groupName.startsWith("Grupo ")) return [];

  const filtered = records.filter((r) => {
    const g = extractGroup(r);
    return g.trim().toLowerCase() === groupName.trim().toLowerCase();
  });

  const fardosMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  filtered.forEach((r) => {
    const product = extractProduct(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));

    fardosMap[product] = (fardosMap[product] || 0) + fardos;
    revenueMap[product] = (revenueMap[product] || 0) + value;
    if (!orderSets[product]) orderSets[product] = new Set();
    orderSets[product].add(getOrderKey(r));
  });

  const totalFardos = Object.values(fardosMap).reduce((a, b) => a + b, 0);

  return Object.entries(fardosMap)
    .map(([name, fardos]) => {
      const revenue = revenueMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalFardos > 0 ? (fardos / totalFardos) * 100 : 0;
      return {
        name,
        value: `${formatNumber(fardos)} Fardos`,
        subtitle: formatCurrency(revenue),
        rawFardos: fardos,
        details: [
          { label: "Fardos vendidos", value: `${formatNumber(fardos)} un.` },
          { label: "Faturamento", value: formatCurrency(revenue) },
          { label: "Pedidos", value: `${orders}` },
          { label: "% dentro do grupo", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawFardos - a.rawFardos)
    .slice(0, 3)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 5. Evolução diária por produto, dentro do período selecionado (De/Até).
// Diferente da versão anterior, NÃO limita a top 5 + "Outros": todos os produtos
// existentes no período aparecem. O filtro de quais produtos exibir fica a cargo
// do próprio componente do gráfico (seleção único/vários/todos).
function generateColor(index: number, total: number): string {
  const hue = Math.round((index * 360) / Math.max(total, 1));
  return `hsl(${hue}, 65%, 48%)`;
}

export function getFullProductEvolution(records: any[], fromStr?: string, toStr?: string) {
  const productSet = new Set<string>();
  records.forEach((r) => productSet.add(extractProduct(r)));
  const products = Array.from(productSet).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const from = fromStr ? parseFlexibleDate(fromStr) : null;
  const to = toStr ? parseFlexibleDate(toStr) : null;

  // Monta a lista contínua de dias do período (ex: 01/04, 02/04 ... 30/04),
  // mesmo que não haja vendas em algum dia (fica com valor 0).
  const dayKeys: string[] = [];
  const dayLabels: Record<string, string> = {};

  if (from && to) {
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor.getTime() <= end.getTime()) {
      const dd = String(cursor.getDate()).padStart(2, "0");
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const key = `${cursor.getFullYear()}-${mm}-${dd}`;
      dayKeys.push(key);
      dayLabels[key] = `${dd}/${mm}`;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const dailyData: Record<string, Record<string, number>> = {};
  dayKeys.forEach((key) => {
    dailyData[key] = {};
    products.forEach((p) => (dailyData[key][p] = 0));
  });

  records.forEach((r) => {
    const parsed = extractDate(r);
    if (!parsed) return;

    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const key = `${parsed.getFullYear()}-${mm}-${dd}`;

    if (!dailyData[key]) {
      dailyData[key] = {};
      products.forEach((p) => (dailyData[key][p] = 0));
      dayKeys.push(key);
      dayLabels[key] = `${dd}/${mm}`;
    }

    const product = extractProduct(r);
    const quantity = getNumber(getProp(r, ["quantity", "quantidade", "qtd"]));
    dailyData[key][product] = (dailyData[key][product] || 0) + quantity;
  });

  const sortedKeys = Array.from(new Set(dayKeys)).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));

  const data = sortedKeys.map((key) => ({ day: dayLabels[key] || key, ...dailyData[key] }));
  const colors = products.map((p, i) => ({ key: p, color: generateColor(i, products.length) }));

  return { data, products: colors };
}

// Como todos os pedidos são dentro do estado de São Paulo, agrupamos qualquer
// valor de divisão que não seja uma das sub-regiões conhecidas em "Outras Regiões",
// em vez de mostrar rótulos crus da planilha (ex: "OUTROS ESTADOS").
const KNOWN_SP_REGIONS = ["SAO PAULO", "SÃO PAULO", "INTERIOR", "LITORAL"];

function normalizeRegionLabel(region: string): string {
  const clean = region.trim().toUpperCase();
  if (!clean || clean === "SEM REGIÃO") return "Sem Região";
  if (KNOWN_SP_REGIONS.includes(clean)) return region.trim();
  return "Outras Regiões";
}

// 6.1 Vendas por Região (Agrupamento por Divisão/Região somando Faturamento), com fardos e pedidos.
export function getTopRegions(records: any[]) {
  const revenueMap: Record<string, number> = {};
  const fardosMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  records.forEach((r) => {
    const region = normalizeRegionLabel(extractRegion(r));
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));

    revenueMap[region] = (revenueMap[region] || 0) + value;
    fardosMap[region] = (fardosMap[region] || 0) + fardos;
    if (!orderSets[region]) orderSets[region] = new Set();
    orderSets[region].add(getOrderKey(r));
  });

  const totalRevenue = Object.values(revenueMap).reduce((a, b) => a + b, 0);

  return Object.entries(revenueMap)
    .map(([name, revenue]) => {
      const fardos = fardosMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
      return {
        name,
        subtitle: `${orders.toLocaleString("pt-BR")} pedidos`,
        value: formatCurrency(revenue),
        rawRevenue: revenue,
        details: [
          { label: "Faturamento", value: formatCurrency(revenue) },
          { label: "Fardos vendidos", value: `${formatNumber(fardos)} un.` },
          { label: "Pedidos", value: `${orders}` },
          { label: "% do faturamento geral", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawRevenue - a.rawRevenue)
    .slice(0, 8)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 6.2 Vendas por Fornecedor (Agrupamento por Fornecedor somando Fardos), com faturamento e pedidos.
export function getTopSuppliers(records: any[]) {
  const fardosMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};
  const orderSets: Record<string, Set<string>> = {};

  records.forEach((r) => {
    const supplier = extractSupplier(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));

    fardosMap[supplier] = (fardosMap[supplier] || 0) + fardos;
    revenueMap[supplier] = (revenueMap[supplier] || 0) + value;
    if (!orderSets[supplier]) orderSets[supplier] = new Set();
    orderSets[supplier].add(getOrderKey(r));
  });

  const totalFardos = Object.values(fardosMap).reduce((a, b) => a + b, 0);

  return Object.entries(fardosMap)
    .map(([name, fardos]) => {
      const revenue = revenueMap[name] || 0;
      const orders = orderSets[name]?.size || 0;
      const percent = totalFardos > 0 ? (fardos / totalFardos) * 100 : 0;
      return {
        name,
        subtitle: `${orders.toLocaleString("pt-BR")} pedidos`,
        value: `${formatNumber(fardos)} Fardos`,
        rawFardos: fardos,
        details: [
          { label: "Fardos vendidos", value: `${formatNumber(fardos)} un.` },
          { label: "Faturamento", value: formatCurrency(revenue) },
          { label: "Pedidos com este fornecedor", value: `${orders}` },
          { label: "% do total de fardos", value: `${percent.toFixed(1)}%` },
        ],
      };
    })
    .sort((a, b) => b.rawFardos - a.rawFardos)
    .slice(0, 8)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 7. Comparativo entre Grupos (Agrupamento por Grupo somando Valor e Fardos)
export function getGroupSalesComparison(records: any[]) {
  const groupValue: Record<string, number> = {};
  const groupFardos: Record<string, number> = {};

  records.forEach((r) => {
    const group = extractGroup(r);
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    groupValue[group] = (groupValue[group] || 0) + value;
    groupFardos[group] = (groupFardos[group] || 0) + fardos;
  });

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#334155"];
  return Object.entries(groupValue)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fardos: groupFardos[name] || 0,
      color: colors[i % colors.length],
    }));
}