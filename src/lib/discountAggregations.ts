import { SalesRecord } from "@/context/salesDataContext";

function normalizeDescription(desc?: string | null): string {
  return (desc || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Pedidos de devolução de venda (NF normal ou NF-B) — são os valores que
// devem ser descontados da comissão do vendedor. Como "DEV. VEND NF-B" já
// contém "DEV. VEND NF" como substring, o segundo check é redundante na
// prática, mas mantemos os dois literais explícitos por clareza e como
// proteção contra pequenas variações de grafia na coluna DESCR. da planilha.
export function isDevolutionOrder(record: SalesRecord): boolean {
  const desc = normalizeDescription(record.description);
  return desc.includes("DEV. VEND NF-B") || desc.includes("DEV. VEND NF");
}

export interface DevolutionOrderDetail {
  id: string;
  uniqueNumber: string;
  productCode: string;
  productName: string;
  issueDate: string;
  totalValue: number;
  description: string;
}

export interface AutomaticSellerDiscount {
  sellerCode: string;
  sellerName: string;
  supervisorId: string;
  managerName: string;
  ordersCount: number;
  totalValue: number;
  orders: DevolutionOrderDetail[];
}

// Agrupa por vendedor todos os pedidos de devolução (DEV. VEND NF /
// NF-B) encontrados nos registros de vendas já importados. O valor
// somado é o VLRTOT (totalValue) de cada linha de devolução — o "valor
// do pedido" que deve ser descontado da comissão.
export function buildAutomaticDiscountsFromRecords(
  records: SalesRecord[]
): AutomaticSellerDiscount[] {
  const map = new Map<
    string,
    AutomaticSellerDiscount & { orderKeys: Set<string> }
  >();

  for (const r of records || []) {
    if (!r || !isDevolutionOrder(r)) continue;

    const sellerCode = (r.sellerCode || "").trim() || "SEM-CODIGO";
    const sellerName = r.sellerName || "Sem Vendedor";
    const orderKey =
      r.uniqueNumber?.trim() || `${r.productCode}-${r.issueDate}-${r.totalValue}`;

    let entry = map.get(sellerCode);
    if (!entry) {
      entry = {
        sellerCode,
        sellerName,
        supervisorId: r.supervisorId || "",
        managerName: r.managerName || "",
        ordersCount: 0,
        totalValue: 0,
        orders: [],
        orderKeys: new Set<string>(),
      };
      map.set(sellerCode, entry);
    }

    entry.sellerName = sellerName || entry.sellerName;

    // Evita contar a mesma linha duas vezes (dedupe por pedido+produto).
    if (entry.orderKeys.has(orderKey)) continue;
    entry.orderKeys.add(orderKey);

    const value = Number(r.totalValue) || 0;
    entry.totalValue += value;
    entry.ordersCount += 1;
    entry.orders.push({
      id: orderKey,
      uniqueNumber: r.uniqueNumber || "",
      productCode: r.productCode || "",
      productName: r.productName || "",
      issueDate: r.issueDate || "",
      totalValue: value,
      description: r.description || "",
    });
  }

  return Array.from(map.values())
    .map(({ orderKeys, ...rest }) => rest)
    .sort((a, b) => b.totalValue - a.totalValue);
}