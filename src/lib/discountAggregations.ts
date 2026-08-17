import { SalesRecord } from "@/context/salesDataContext";

function normalizeDescription(desc?: string | null): string {
  return (desc || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEVOLUTION_PATTERN = /\bDEV\w*\s+VEND\w*\s+NF\b/;

export function isDevolutionOrder(record: SalesRecord): boolean {
  const desc = normalizeDescription(record.description);
  if (!desc) return false;
  return DEVOLUTION_PATTERN.test(desc);
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

type DiscountAccumulator = AutomaticSellerDiscount & { orderKeys: Set<string> };

export function buildAutomaticDiscountsFromRecords(
  records: SalesRecord[]
): AutomaticSellerDiscount[] {
  const map = new Map<string, DiscountAccumulator>();

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