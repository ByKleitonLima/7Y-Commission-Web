import { SalesRecord } from "@/context/salesDataContext";

// Mesma lógica de chave de pedido usada em salesAggregations.ts /
// orgAggregations.ts, para manter a contagem de pedidos consistente em
// todo o app.
function getOrderKey(r: SalesRecord): string {
  return r.uniqueNumber?.trim() || r.orderRef || `${r.productCode}-${r.issueDate}-${r.totalValue}`;
}

// IMPORTANTE: diferente do Dashboard (Home), que filtra só "PED. VENDA"
// antes de agregar, a tela de Comissão soma TODAS as linhas (vendas,
// devoluções NF/NF-B e bonificações), sem filtrar por tipo de pedido.
// Isso foi conferido diretamente contra a planilha oficial de comissão
// (abas REL_VEND / REL_GERENTE): somando COMISSÃO REPRESENTANTE e
// COMISSÃO GERENTE de TODAS as linhas de DADOS por vendedor/supervisor,
// o resultado bate centavo a centavo com o relatório oficial. Filtrar
// por "PED. VENDA" aqui produziria um valor de comissão errado, pois
// devoluções reduzem a comissão paga.

export interface SellerCommissionAggregate {
  sellerCode: string;
  sellerName: string;
  supervisorId: string;
  managerName: string;
  netRevenue: number;
  commission: number;
  premium: number;
  effectivePercent: number;
  orders: number;
}

export interface ManagerCommissionAggregate {
  supervisorId: string;
  managerName: string;
  netRevenue: number;
  commission: number;
  effectivePercent: number;
  sellersCount: number;
  orders: number;
}

export interface CommissionTotals {
  netRevenue: number;
  representativeCommission: number;
  managerCommission: number;
  premium: number;
  orders: number;
}

export interface CommissionAggregates {
  sellers: SellerCommissionAggregate[];
  managers: ManagerCommissionAggregate[];
  totals: CommissionTotals;
}

interface SellerDraft {
  sellerName: string;
  supervisorId: string;
  managerName: string;
  netRevenue: number;
  commission: number;
  premium: number;
  orders: Set<string>;
}

interface ManagerDraft {
  managerName: string;
  netRevenue: number;
  commission: number;
  orders: Set<string>;
  sellerCodes: Set<string>;
}

export function buildCommissionAggregates(records: SalesRecord[]): CommissionAggregates {
  const sellers = new Map<string, SellerDraft>();
  const managers = new Map<string, ManagerDraft>();

  let totalNet = 0;
  let totalRepComm = 0;
  let totalMgrComm = 0;
  let totalPremium = 0;
  const allOrders = new Set<string>();

  for (const r of records || []) {
    if (!r) continue;

    const sellerCode = (r.sellerCode || "").trim() || "SEM-CODIGO";
    const sellerName = r.sellerName || "Sem Vendedor";
    const supervisorId = (r.supervisorId || "").trim();
    const managerName = r.managerName || "Sem Gerente";

    const net = Number(r.netValue) || 0;
    const repComm = Number(r.representativeCommission) || 0;
    const mgrComm = Number(r.managerCommission) || 0;
    const premium = Number(r.premiumPaidValue) || 0;
    const orderKey = getOrderKey(r);

    totalNet += net;
    totalRepComm += repComm;
    totalMgrComm += mgrComm;
    totalPremium += premium;
    allOrders.add(orderKey);

    let s = sellers.get(sellerCode);
    if (!s) {
      s = {
        sellerName,
        supervisorId,
        managerName,
        netRevenue: 0,
        commission: 0,
        premium: 0,
        orders: new Set<string>(),
      };
      sellers.set(sellerCode, s);
    }
    s.sellerName = sellerName || s.sellerName;
    s.supervisorId = supervisorId || s.supervisorId;
    s.managerName = managerName || s.managerName;
    s.netRevenue += net;
    s.commission += repComm;
    s.premium += premium;
    s.orders.add(orderKey);

    // Agrupa gerentes por ID_SUPERVISOR quando existir; cai pro nome como
    // chave de fallback só pra não perder linhas sem supervisor_id.
    const managerKey = supervisorId || `NOME:${managerName}`;
    let m = managers.get(managerKey);
    if (!m) {
      m = { managerName, netRevenue: 0, commission: 0, orders: new Set<string>(), sellerCodes: new Set<string>() };
      managers.set(managerKey, m);
    }
    m.managerName = managerName || m.managerName;
    m.netRevenue += net;
    m.commission += mgrComm;
    m.orders.add(orderKey);
    if (sellerCode) m.sellerCodes.add(sellerCode);
  }

  const sellerAggs: SellerCommissionAggregate[] = Array.from(sellers.entries())
    .map(([sellerCode, s]) => ({
      sellerCode,
      sellerName: s.sellerName,
      supervisorId: s.supervisorId,
      managerName: s.managerName,
      netRevenue: s.netRevenue,
      commission: s.commission,
      premium: s.premium,
      effectivePercent: s.netRevenue !== 0 ? (s.commission / s.netRevenue) * 100 : 0,
      orders: s.orders.size,
    }))
    .sort((a, b) => b.commission - a.commission);

  const managerAggs: ManagerCommissionAggregate[] = Array.from(managers.entries())
    .map(([key, m]) => ({
      supervisorId: key.startsWith("NOME:") ? "" : key,
      managerName: m.managerName,
      netRevenue: m.netRevenue,
      commission: m.commission,
      effectivePercent: m.netRevenue !== 0 ? (m.commission / m.netRevenue) * 100 : 0,
      sellersCount: m.sellerCodes.size,
      orders: m.orders.size,
    }))
    .sort((a, b) => b.commission - a.commission);

  return {
    sellers: sellerAggs,
    managers: managerAggs,
    totals: {
      netRevenue: totalNet,
      representativeCommission: totalRepComm,
      managerCommission: totalMgrComm,
      premium: totalPremium,
      orders: allOrders.size,
    },
  };
}