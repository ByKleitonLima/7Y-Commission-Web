import { SalesRecord } from "@/context/salesDataContext";

export function isSaleOrder(record: SalesRecord): boolean {
  const desc = (record.description || "").toUpperCase();
  return desc.includes("PED. VENDA") || desc.includes("PED VENDA");
}

export interface ManagerAgg {
  supervisorId: string;
  code: string;
  name: string;
  sellersCount: number;
  ordersCount: number;
}

export interface SellerAgg {
  code: string;
  supervisorId: string;
  name: string;
  clientsCount: number;
  ordersCount: number;
}

export interface ClientAgg {
  code: string;
  sellerCode: string;
  sellerName: string;
  supervisorId: string;
  name: string;
  region: string;
  ordersCount: number;
}

export function buildOrganizationFromRecords(records: SalesRecord[]) {
  const managers = new Map<
    string,
    { name: string; sellerCodes: Set<string>; orderNumbers: Set<string> }
  >();
  const sellers = new Map<
    string,
    { name: string; supervisorId: string; clientCodes: Set<string>; orderNumbers: Set<string> }
  >();
  const clients = new Map<
    string,
    { name: string; sellerCode: string; sellerName: string; supervisorId: string; region: string; orderNumbers: Set<string> }
  >();

  for (const record of records) {
    const supervisorId = (record.supervisorId || "").trim();
    const sellerCode = (record.sellerCode || "").trim();
    const clientCode = (record.clientCode || "").trim();
    const orderKey =
      record.uniqueNumber?.trim() ||
      `${record.productCode}-${record.issueDate}-${record.totalValue}`;
    const saleOrder = isSaleOrder(record);

    if (supervisorId) {
      const m =
        managers.get(supervisorId) ??
        { name: record.managerName, sellerCodes: new Set<string>(), orderNumbers: new Set<string>() };
      m.name = record.managerName || m.name;
      if (sellerCode) m.sellerCodes.add(sellerCode);
      if (saleOrder) m.orderNumbers.add(orderKey);
      managers.set(supervisorId, m);
    }

    if (sellerCode) {
      const s =
        sellers.get(sellerCode) ??
        { name: record.sellerName, supervisorId, clientCodes: new Set<string>(), orderNumbers: new Set<string>() };
      s.name = record.sellerName || s.name;
      s.supervisorId = supervisorId || s.supervisorId;
      if (clientCode) s.clientCodes.add(clientCode);
      if (saleOrder) s.orderNumbers.add(orderKey);
      sellers.set(sellerCode, s);
    }

    if (clientCode) {
      const c =
        clients.get(clientCode) ??
        { name: record.clientName, sellerCode, sellerName: record.sellerName, supervisorId, region: record.division || "", orderNumbers: new Set<string>() };
      c.name = record.clientName || c.name;
      c.sellerCode = sellerCode || c.sellerCode;
      c.sellerName = record.sellerName || c.sellerName;
      c.supervisorId = supervisorId || c.supervisorId;
      // Região real do cliente vem de "division" (coluna DIVISAO da planilha).
      // "network" é só a flag S/N de rede, não a região — não usar aqui.
      c.region = record.division || c.region;
      if (saleOrder) c.orderNumbers.add(orderKey);
      clients.set(clientCode, c);
    }
  }

  const managerAggs: ManagerAgg[] = Array.from(managers.entries()).map(([supervisorId, m]) => ({
    supervisorId,
    code: supervisorId,
    name: m.name,
    sellersCount: m.sellerCodes.size,
    ordersCount: m.orderNumbers.size,
  }));

  const sellerAggs: SellerAgg[] = Array.from(sellers.entries()).map(([code, s]) => ({
    code,
    supervisorId: s.supervisorId,
    name: s.name,
    clientsCount: s.clientCodes.size,
    ordersCount: s.orderNumbers.size,
  }));

  const clientAggs: ClientAgg[] = Array.from(clients.entries()).map(([code, c]) => ({
    code,
    sellerCode: c.sellerCode,
    sellerName: c.sellerName,
    supervisorId: c.supervisorId,
    name: c.name,
    region: c.region,
    ordersCount: c.orderNumbers.size,
  }));

  return { managers: managerAggs, sellers: sellerAggs, clients: clientAggs };
}