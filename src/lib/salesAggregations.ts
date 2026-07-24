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

// 1. Gerentes (Agrupamento por Faturamento - Valor)
export function getTopManagers(records: any[]) {
  const map: Record<string, number> = {};
  records.forEach((r) => {
    const manager = getProp(r, ["managerName", "gerente", "manager", "manager_name"]) || "Sem Gerente";
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    map[manager] = (map[manager] || 0) + value;
  });

  return Object.entries(map)
    .map(([name, revenue]) => ({
      name,
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenue),
      rawRevenue: revenue,
    }))
    .sort((a, b) => b.rawRevenue - a.rawRevenue)
    .slice(0, 5)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 2. Vendedores (Agrupamento por Quantidade)
export function getTopSellers(records: any[]) {
  const map: Record<string, number> = {};
  records.forEach((r) => {
    const seller = getProp(r, ["sellerName", "vendedor", "seller", "seller_name"]) || "Sem Vendedor";
    const quantity = getNumber(getProp(r, ["quantity", "quantidade", "qtd"]));
    map[seller] = (map[seller] || 0) + quantity;
  });

  return Object.entries(map)
    .map(([name, volume]) => ({
      name,
      value: `${volume} un.`,
      rawVolume: volume,
    }))
    .sort((a, b) => b.rawVolume - a.rawVolume)
    .slice(0, 5)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 3. Produtos Campeões de Vendas (Soma estrita de Fardos / bundleQuantity)
export function getTopProducts(records: any[]) {
  const map: Record<string, number> = {};
  records.forEach((r) => {
    const product = extractProduct(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    map[product] = (map[product] || 0) + fardos;
  });

  return Object.entries(map)
    .map(([name, fardos]) => ({
      name,
      value: `${fardos} Fardos`,
      rawFardos: fardos,
    }))
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

  const map: Record<string, number> = {};
  filtered.forEach((r) => {
    const product = extractProduct(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    map[product] = (map[product] || 0) + fardos;
  });

  return Object.entries(map)
    .map(([name, fardos]) => ({
      name,
      value: `${fardos} Fardos`,
      rawFardos: fardos,
    }))
    .sort((a, b) => b.rawFardos - a.rawFardos)
    .slice(0, 3)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 5. Evolução Diária dentro do mês selecionado (Agrupamento por Dia e Produto somando Quantidade)
//
// Importante: como os registros que chegam aqui já vêm filtrados para UM único mês
// (via fetchSalesByMonth), agrupar por "mês" sempre resultaria em uma única barra.
// Por isso agrupamos por DIA, o que gera a evolução real dentro do período escolhido.
export function getMonthlySalesByProduct(records: any[]) {
  const productTotals: Record<string, number> = {};
  records.forEach((r) => {
    const product = extractProduct(r);
    const quantity = getNumber(getProp(r, ["quantity", "quantidade", "qtd"]));
    productTotals[product] = (productTotals[product] || 0) + quantity;
  });

  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((p) => p[0]);

  const dailyData: Record<string, Record<string, number>> = {};
  const dayOrder: Record<string, number> = {};
  const productSet = new Set<string>(topProducts);

  records.forEach((r) => {
    const rawDate = getProp(r, ["date", "data", "createdAt", "dataPedido", "emissao", "issueDate", "issue_date"]);
    const parsed = parseFlexibleDate(rawDate);

    let dayLabel = "Sem Data";
    let sortKey = Number.MAX_SAFE_INTEGER;

    if (parsed) {
      const dd = String(parsed.getDate()).padStart(2, "0");
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      dayLabel = `${dd}/${mm}`;
      sortKey = parsed.getTime();
    }

    dayOrder[dayLabel] = sortKey;

    let product = extractProduct(r);
    if (!topProducts.includes(product)) {
      productSet.add("Outros");
      product = "Outros";
    }

    const quantity = getNumber(getProp(r, ["quantity", "quantidade", "qtd"]));

    if (!dailyData[dayLabel]) dailyData[dayLabel] = {};
    dailyData[dayLabel][product] = (dailyData[dayLabel][product] || 0) + quantity;
  });

  const data = Object.keys(dailyData)
    .sort((a, b) => dayOrder[a] - dayOrder[b])
    .map((day) => ({ month: day, ...dailyData[day] }));

  const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const products = Array.from(productSet).map((prod, i) => ({
    key: prod,
    color: prod === "Outros" ? "#94a3b8" : colors[i % colors.length],
  }));

  return { data, products };
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

// 6.1 Vendas por Região (Agrupamento por Divisão/Região somando Faturamento)
export function getTopRegions(records: any[]) {
  const value: Record<string, number> = {};
  const orders: Record<string, number> = {};
  records.forEach((r) => {
    const region = normalizeRegionLabel(extractRegion(r));
    const v = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    value[region] = (value[region] || 0) + v;
    orders[region] = (orders[region] || 0) + 1;
  });

  return Object.entries(value)
    .map(([name, revenue]) => ({
      name,
      subtitle: `${(orders[name] || 0).toLocaleString("pt-BR")} pedidos`,
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(revenue),
      rawRevenue: revenue,
    }))
    .sort((a, b) => b.rawRevenue - a.rawRevenue)
    .slice(0, 8)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 6.2 Vendas por Fornecedor (Agrupamento por Fornecedor somando Fardos)
export function getTopSuppliers(records: any[]) {
  const fardosMap: Record<string, number> = {};
  const orders: Record<string, number> = {};
  records.forEach((r) => {
    const supplier = extractSupplier(r);
    const fardos = getNumber(getProp(r, ["bundleQuantity", "bundle_quantity", "fardos", "fardo", "volumes"]));
    fardosMap[supplier] = (fardosMap[supplier] || 0) + fardos;
    orders[supplier] = (orders[supplier] || 0) + 1;
  });

  return Object.entries(fardosMap)
    .map(([name, fardos]) => ({
      name,
      subtitle: `${(orders[name] || 0).toLocaleString("pt-BR")} pedidos`,
      value: `${fardos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} Fardos`,
      rawFardos: fardos,
    }))
    .sort((a, b) => b.rawFardos - a.rawFardos)
    .slice(0, 8)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

// 7. Comparativo entre Grupos (Agrupamento por Grupo somando Valor)
export function getGroupSalesComparison(records: any[]) {
  const groupData: Record<string, number> = {};

  records.forEach((r) => {
    const group = extractGroup(r);
    const value = getNumber(getProp(r, ["totalValue", "valorTotal", "value", "valor", "total", "total_value"]));
    groupData[group] = (groupData[group] || 0) + value;
  });

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#334155"];
  return Object.entries(groupData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
}