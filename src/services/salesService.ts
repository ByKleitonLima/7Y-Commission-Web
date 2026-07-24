import { supabase } from "@/lib/supabase";
import { SalesRecord } from "@/context/salesDataContext";
import { SalesManager } from "@/components/managerStable";
import { Seller } from "@/components/sellersStable";
import { Client } from "@/components/clientsStable";
import { buildOrganizationFromRecords } from "@/lib/orgAggregations";

const TABLE = "sales_records";
const HISTORY_TABLE = "upload_history";
const MANAGERS_TABLE = "managers";
const SELLERS_TABLE = "sellers";
const CLIENTS_TABLE = "clients";

function toDbRecord(record: SalesRecord) {
  return {
    supervisor_id: record.supervisorId,
    manager_name: record.managerName,
    partner_code: record.partnerCode ?? null,
    seller_code: record.sellerCode,
    seller_name: record.sellerName,
    network: record.network ?? null,
    client_code: record.clientCode,
    client_name: record.clientName,
    issue_date: record.issueDate || new Date().toLocaleDateString("pt-BR"),
    unique_number: record.uniqueNumber ?? null,
    order_ref: record.orderRef ?? null,
    supplier: record.supplier,
    product_code: record.productCode,
    product_name: record.productName,
    quantity: record.quantity,
    bundle_quantity: record.bundleQuantity,
    unit_value: record.unitValue,
    total_value: record.totalValue,
    percent_boleto: record.percentBoleto ?? null,
    vlr: record.vlr ?? null,
    percent_desc_boni: record.percentDescBoni ?? null,
    vlr_unit_liq: record.vlrUnitLiq ?? null,
    net_value: record.netValue,
    table_type: record.tableType ?? null,
    percent: record.percent ?? null,
    commission_value: record.commissionValue,
    description: record.description ?? null,
    app_type: record.appType ?? null,
    division: record.division,
    premium: record.premium ?? null,
    group_code: record.groupCode ?? null,
    reg_promo: record.regPromo ?? null,
    vlr_promo: record.vlrPromo ?? null,
    group: record.group,
    family: record.family,
    imported_at: new Date().toISOString(),
  };
}

function fromDbRecord(row: any): SalesRecord {
  return {
    id: row.id,
    supervisorId: row.supervisor_id,
    managerName: row.manager_name,
    partnerCode: row.partner_code,
    sellerCode: row.seller_code,
    sellerName: row.seller_name,
    network: row.network,
    clientCode: row.client_code,
    clientName: row.client_name,
    issueDate: row.issue_date,
    uniqueNumber: row.unique_number,
    orderRef: row.order_ref,
    supplier: row.supplier,
    productCode: row.product_code,
    productName: row.product_name,
    quantity: row.quantity,
    bundleQuantity: row.bundle_quantity,
    unitValue: row.unit_value,
    totalValue: row.total_value,
    percentBoleto: row.percent_boleto,
    vlr: row.vlr,
    percentDescBoni: row.percent_desc_boni,
    vlrUnitLiq: row.vlr_unit_liq,
    netValue: row.net_value,
    tableType: row.table_type,
    percent: row.percent,
    commissionValue: row.commission_value,
    description: row.description,
    appType: row.app_type,
    division: row.division,
    premium: row.premium,
    groupCode: row.group_code,
    regPromo: row.reg_promo,
    vlrPromo: row.vlr_promo,
    group: row.group,
    family: row.family,
    importedAt: row.imported_at,
  };
}

export async function uploadSalesRecordsInBatches(
  records: SalesRecord[],
  onProgress?: (sent: number, total: number) => void
) {
  const chunkSize = 200;
  let totalSent = 0;

  const mappedRecords = records.map(toDbRecord);

  for (let i = 0; i < mappedRecords.length; i += chunkSize) {
    const chunk = mappedRecords.slice(i, i + chunkSize);

    const { error } = await supabase.from(TABLE).insert(chunk);
    if (error) throw error;

    totalSent += chunk.length;
    if (onProgress) onProgress(totalSent, records.length);
  }
}

export async function fetchSalesByMonth(month: string): Promise<SalesRecord[]> {
  const [year, monthNumber] = month.split("-");
  const suffix = `%/${monthNumber}/${year}`;

  const { data, error } = await supabase.from(TABLE).select("*").like("issue_date", suffix);
  if (error) {
    console.error("Erro ao buscar vendas do mês:", error);
    throw error;
  }

  return (data ?? []).map(fromDbRecord);
}

export async function saveUploadHistory(historyData: {
  fileName: string;
  rowCount: number;
  uploadedBy: string;
  totalValue: number;
}) {
  try {
    const { error } = await supabase.from(HISTORY_TABLE).insert([
      {
        file_name: historyData.fileName,
        row_count: historyData.rowCount,
        uploaded_by: historyData.uploadedBy,
        total_value: historyData.totalValue,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.warn(
        "Aviso: Não foi possível salvar o histórico. Verifique se a tabela 'upload_history' existe."
      );
    }
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
}

export async function fetchUploadHistory() {
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    fileName: row.file_name,
    rowCount: row.row_count,
    uploadedBy: row.uploaded_by,
    totalValue: row.total_value,
    created_at: row.created_at,
  }));
}

export async function syncOrganizationFromRecords(records: SalesRecord[]) {
  const { managers, sellers, clients } = buildOrganizationFromRecords(records);

  await syncManagers(managers);
  await syncSellers(sellers);
  await syncClients(clients);
}

async function syncManagers(managers: ReturnType<typeof buildOrganizationFromRecords>["managers"]) {
  if (managers.length === 0) return;

  const codes = managers.map((m) => m.supervisorId);
  const { data: existing } = await supabase
    .from(MANAGERS_TABLE)
    .select("supervisor_id, status")
    .in("supervisor_id", codes);

  const statusMap = new Map((existing ?? []).map((e: any) => [e.supervisor_id, e.status]));

  const rows = managers.map((m) => ({
    supervisor_id: m.supervisorId,
    code: m.code,
    name: m.name,
    sellers_count: m.sellersCount,
    orders_count: m.ordersCount,
    status: statusMap.get(m.supervisorId) ?? "Ativo",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from(MANAGERS_TABLE).upsert(rows, { onConflict: "supervisor_id" });
  if (error) console.error("Erro ao sincronizar gerentes:", error);
}

async function syncSellers(sellers: ReturnType<typeof buildOrganizationFromRecords>["sellers"]) {
  if (sellers.length === 0) return;

  const codes = sellers.map((s) => s.code);
  const { data: existing } = await supabase
    .from(SELLERS_TABLE)
    .select("seller_code, status")
    .in("seller_code", codes);

  const statusMap = new Map((existing ?? []).map((e: any) => [e.seller_code, e.status]));

  const rows = sellers.map((s) => ({
    seller_code: s.code,
    supervisor_id: s.supervisorId || null,
    name: s.name,
    clients_count: s.clientsCount,
    orders_count: s.ordersCount,
    status: statusMap.get(s.code) ?? "Ativo",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from(SELLERS_TABLE).upsert(rows, { onConflict: "seller_code" });
  if (error) console.error("Erro ao sincronizar vendedores:", error);
}

async function syncClients(clients: ReturnType<typeof buildOrganizationFromRecords>["clients"]) {
  if (clients.length === 0) return;

  const codes = clients.map((c) => c.code);
  const { data: existing } = await supabase
    .from(CLIENTS_TABLE)
    .select("client_code, status")
    .in("client_code", codes);

  const statusMap = new Map((existing ?? []).map((e: any) => [e.client_code, e.status]));

  const rows = clients.map((c) => ({
    client_code: c.code,
    supervisor_id: c.supervisorId || null,
    seller_code: c.sellerCode || null,
    seller_name: c.sellerName,
    name: c.name,
    region: c.region,
    orders_count: c.ordersCount,
    status: statusMap.get(c.code) ?? "Ativo",
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from(CLIENTS_TABLE).upsert(rows, { onConflict: "client_code" });
  if (error) console.error("Erro ao sincronizar clientes:", error);
}

export async function fetchManagers(): Promise<SalesManager[]> {
  const { data, error } = await supabase.from(MANAGERS_TABLE).select("*").order("name");
  if (error) {
    console.error("Erro ao buscar gerentes:", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    supId: row.supervisor_id,
    code: row.code,
    name: row.name,
    sellersCount: row.sellers_count,
    ordersCount: row.orders_count,
    status: row.status,
  }));
}

export async function fetchSellers(): Promise<Seller[]> {
  const { data, error } = await supabase.from(SELLERS_TABLE).select("*").order("name");
  if (error) {
    console.error("Erro ao buscar vendedores:", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    supId: row.supervisor_id,
    code: row.seller_code,
    name: row.name,
    clientsCount: row.clients_count,
    ordersCount: row.orders_count,
    status: row.status,
  }));
}

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase.from(CLIENTS_TABLE).select("*").order("name");
  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    supId: row.supervisor_id,
    sellerCode: row.seller_code,
    sellerName: row.seller_name,
    code: row.client_code,
    name: row.name,
    region: row.region,
    ordersCount: row.orders_count,
    status: row.status,
  }));
}

export async function createManager(manager: {
  supId: string;
  code: string;
  name: string;
  status: "Ativo" | "Inativo";
}): Promise<SalesManager> {
  const { data, error } = await supabase
    .from(MANAGERS_TABLE)
    .insert([
      {
        supervisor_id: manager.supId || null,
        code: manager.code,
        name: manager.name,
        sellers_count: 0,
        orders_count: 0,
        status: manager.status,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar gerente:", error);
    throw error;
  }

  return {
    id: data.id,
    supId: data.supervisor_id,
    code: data.code,
    name: data.name,
    sellersCount: data.sellers_count,
    ordersCount: data.orders_count,
    status: data.status,
  };
}

export async function updateManager(
  id: string,
  manager: {
    supId: string;
    code: string;
    name: string;
    status: "Ativo" | "Inativo";
  }
): Promise<void> {
  const { error } = await supabase
    .from(MANAGERS_TABLE)
    .update({
      supervisor_id: manager.supId || null,
      code: manager.code,
      name: manager.name,
      status: manager.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar gerente:", error);
    throw error;
  }
}

export async function updateManagerStatus(id: string, status: "Ativo" | "Inativo") {
  const { error } = await supabase.from(MANAGERS_TABLE).update({ status }).eq("id", id);
  if (error) console.error("Erro ao atualizar status do gerente:", error);
}

export async function createSeller(seller: {
  supId: string;
  code: string;
  name: string;
  clientsCount: number;
  ordersCount: number;
  status: "Ativo" | "Inativo";
}): Promise<Seller> {
  const { data, error } = await supabase
    .from(SELLERS_TABLE)
    .insert([
      {
        supervisor_id: seller.supId || null,
        seller_code: seller.code,
        name: seller.name,
        clients_count: seller.clientsCount ?? 0,
        orders_count: seller.ordersCount ?? 0,
        status: seller.status,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar vendedor:", error);
    throw error;
  }

  return {
    id: data.id,
    supId: data.supervisor_id,
    code: data.seller_code,
    name: data.name,
    clientsCount: data.clients_count,
    ordersCount: data.orders_count,
    status: data.status,
  };
}

export async function updateSeller(
  id: string,
  seller: {
    supId: string;
    code: string;
    name: string;
    status: "Ativo" | "Inativo";
  }
): Promise<void> {
  const { error } = await supabase
    .from(SELLERS_TABLE)
    .update({
      supervisor_id: seller.supId || null,
      seller_code: seller.code,
      name: seller.name,
      status: seller.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar vendedor:", error);
    throw error;
  }
}

export async function updateSellerStatus(id: string, status: "Ativo" | "Inativo") {
  const { error } = await supabase.from(SELLERS_TABLE).update({ status }).eq("id", id);
  if (error) console.error("Erro ao atualizar status do vendedor:", error);
}

export async function createClient(client: {
  supId?: string;
  sellerCode?: string;
  code: string;
  name: string;
  region?: string;
  status: "Ativo" | "Inativo";
}): Promise<Client> {
  const { data, error } = await supabase
    .from(CLIENTS_TABLE)
    .insert([
      {
        supervisor_id: client.supId || null,
        seller_code: client.sellerCode || null,
        client_code: client.code,
        name: client.name,
        region: client.region || null,
        status: client.status,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar cliente:", error);
    throw error;
  }

  return {
    id: data.id,
    supId: data.supervisor_id,
    sellerCode: data.seller_code,
    sellerName: data.seller_name,
    code: data.client_code,
    name: data.name,
    region: data.region,
    ordersCount: data.orders_count,
    status: data.status,
  };
}

export async function updateClient(
  id: string,
  client: {
    supId?: string;
    sellerCode?: string;
    code: string;
    name: string;
    region?: string;
    status: "Ativo" | "Inativo";
  }
): Promise<void> {
  const { error } = await supabase
    .from(CLIENTS_TABLE)
    .update({
      supervisor_id: client.supId || null,
      seller_code: client.sellerCode || null,
      client_code: client.code,
      name: client.name,
      region: client.region || null,
      status: client.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar cliente:", error);
    throw error;
  }
}

export async function updateClientStatus(id: string, status: "Ativo" | "Inativo") {
  const { error } = await supabase.from(CLIENTS_TABLE).update({ status }).eq("id", id);
  if (error) console.error("Erro ao atualizar status do cliente:", error);
}

export async function deleteManager(id: string) {
  const { error } = await supabase.from(MANAGERS_TABLE).delete().eq("id", id);
  if (error) console.error("Erro ao remover gerente:", error);
}

export async function deleteSeller(id: string) {
  const { error } = await supabase.from(SELLERS_TABLE).delete().eq("id", id);
  if (error) console.error("Erro ao remover vendedor:", error);
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from(CLIENTS_TABLE).delete().eq("id", id);
  if (error) console.error("Erro ao remover cliente:", error);
}