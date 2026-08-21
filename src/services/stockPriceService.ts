import { supabase } from "@/lib/supabase";
import { StockPriceRecord } from "@/lib/parseStockPriceFile";
import { logAudit } from "@/services/auditLogService";

const STOCK_IMPORTS_TABLE = "stock_imports";
const STOCK_ITEMS_TABLE = "stock_snapshot_items";
const PRICE_UPDATES_TABLE = "price_updates";
const PRICE_HISTORY_TABLE = "price_history";
const PRODUCTS_TABLE = "products";

export interface StockImportSummary {
  id: string;
  fileName: string;
  fileSize: number | null;
  uploadedBy: string | null;
  rowCount: number;
  totalQuantity: number;
  totalValue: number;
  columnsFound: string[];
  status: string;
  priceChangesCount: number;
  createdAt: string;
}

function fromStockImportRow(row: any): StockImportSummary {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    uploadedBy: row.uploaded_by,
    rowCount: row.row_count,
    totalQuantity: Number(row.total_quantity) || 0,
    totalValue: Number(row.total_value) || 0,
    columnsFound: row.columns_found || [],
    status: row.status,
    priceChangesCount: Number(row.price_changes_count) || 0,
    createdAt: row.created_at,
  };
}

export interface StockSnapshotItem {
  id: string;
  productCode: string;
  productName: string;
  supplierName: string;
  active: string;
  activeMobile: string;
  showCatalog: string;
  stock7y: number;
  stockGalpao: number;
  stockConexao: number;
  stockFwyLoja: number;
  totalStock: number;
  bundleQuantity: number;
  groupCode: string;
  groupDescription: string;
  priceT1: number;
  priceT2: number;
  priceT3: number;
  priceT4: number;
  priceT5: number;
  priceT11: number;
  promoValue: number;
  promoQuantity: number;
  promoValue2: number;
  promoQuantity2: number;
  cest: string;
  ncm: string;
  ean: string;
  dun: string;
  commissionPercent: number;
  verbaPercent: number;
  legend: string;
  group: string;
  family: string;
  premiumValue: number;
  size: string;
  stripQuantity: number;
  brand: string;
  imageOrder: number;
  dtAlter: string | null;
  raw: Record<string, unknown>;
}

function fromStockItemRow(row: any): StockSnapshotItem {
  return {
    id: row.id,
    productCode: row.product_code || "",
    productName: row.product_name || "",
    supplierName: row.supplier_name || "",
    active: row.active || "",
    activeMobile: row.active_mobile || "",
    showCatalog: row.show_catalog || "",
    stock7y: Number(row.stock_7y) || 0,
    stockGalpao: Number(row.stock_galpao) || 0,
    stockConexao: Number(row.stock_conexao) || 0,
    stockFwyLoja: Number(row.stock_fwy_loja) || 0,
    totalStock: Number(row.total_stock) || 0,
    bundleQuantity: Number(row.bundle_quantity) || 0,
    groupCode: row.group_code || "",
    groupDescription: row.group_description || "",
    priceT1: Number(row.price_t1) || 0,
    priceT2: Number(row.price_t2) || 0,
    priceT3: Number(row.price_t3) || 0,
    priceT4: Number(row.price_t4) || 0,
    priceT5: Number(row.price_t5) || 0,
    priceT11: Number(row.price_t11) || 0,
    promoValue: Number(row.promo_value) || 0,
    promoQuantity: Number(row.promo_quantity) || 0,
    promoValue2: Number(row.promo_value_2) || 0,
    promoQuantity2: Number(row.promo_quantity_2) || 0,
    cest: row.cest || "",
    ncm: row.ncm || "",
    ean: row.ean || "",
    dun: row.dun || "",
    commissionPercent: Number(row.commission_percent) || 0,
    verbaPercent: Number(row.verba_percent) || 0,
    legend: row.legend || "",
    group: row.group_name || "",
    family: row.family || "",
    premiumValue: Number(row.premium_value) || 0,
    size: row.size || "",
    stripQuantity: Number(row.strip_quantity) || 0,
    brand: row.brand || "",
    imageOrder: Number(row.image_order) || 0,
    dtAlter: row.dt_alter,
    raw: row.raw_data || {},
  };
}

function toDbItemRow(r: StockPriceRecord, importId: string) {
  return {
    import_id: importId,
    product_code: r.productCode || null,
    product_name: r.productName || null,
    supplier_name: r.supplierName || null,
    active: r.active || null,
    fbs_cnx: r.fbsCnx || null,
    active_mobile: r.activeMobile || null,
    show_catalog: r.showCatalog || null,
    stock_7y: r.stock7y ?? 0,
    stock_galpao: r.stockGalpao ?? 0,
    stock_conexao: r.stockConexao ?? 0,
    stock_fwy_loja: r.stockFwyLoja ?? 0,
    total_stock: r.totalStock ?? 0,
    bundle_quantity: r.bundleQuantity ?? 0,
    group_code: r.groupCode || null,
    group_description: r.groupDescription || null,
    price_t1: r.priceT1 ?? 0,
    price_t2: r.priceT2 ?? 0,
    price_t3: r.priceT3 ?? 0,
    price_t4: r.priceT4 ?? 0,
    price_t5: r.priceT5 ?? 0,
    price_t11: r.priceT11 ?? 0,
    promo_value: r.promoValue ?? 0,
    promo_quantity: r.promoQuantity ?? 0,
    promo_value_2: r.promoValue2 ?? 0,
    promo_quantity_2: r.promoQuantity2 ?? 0,
    cest: r.cest || null,
    ncm: r.ncm || null,
    ean: r.ean || null,
    dun: r.dun || null,
    commission_percent: r.commissionPercent ?? 0,
    verba_percent: r.verbaPercent ?? 0,
    legend: r.legend || null,
    group_name: r.group || null,
    family: r.family || null,
    premium_value: r.premiumValue ?? 0,
    size: r.size || null,
    strip_quantity: r.stripQuantity ?? 0,
    brand: r.brand || null,
    image_order: r.imageOrder ?? 0,
    dt_alter: r.dtAlter,
    // quantity/unit_value/total_value: mantidos por compatibilidade com
    // código antigo que ainda possa ler essas colunas genéricas.
    quantity: r.totalStock ?? 0,
    unit_value: r.priceT1 ?? 0,
    total_value: (r.totalStock ?? 0) * (r.priceT1 ?? 0),
    raw_data: r.raw,
  };
}

// Salva o snapshot completo de estoque+preços (uma planilha só) E já
// aplica o preço T1 no catálogo de produtos, registrando cada alteração
// no histórico de preços — tudo em uma única operação, sem precisar de
// um segundo upload separado de preços.
export async function saveStockAndPriceSnapshot(params: {
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  records: StockPriceRecord[];
  columnsFound: string[];
  onProgress?: (sent: number, total: number) => void;
}): Promise<StockImportSummary> {
  const { fileName, fileSize, uploadedBy, records, columnsFound, onProgress } = params;

  const totalQuantity = records.reduce((sum, r) => sum + (r.totalStock || 0), 0);
  const totalValue = records.reduce((sum, r) => sum + (r.totalStock || 0) * (r.priceT1 || 0), 0);

  const { data: importRow, error: importError } = await supabase
    .from(STOCK_IMPORTS_TABLE)
    .insert([
      {
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        row_count: records.length,
        total_quantity: totalQuantity,
        total_value: totalValue,
        columns_found: columnsFound,
        status: "Processando",
      },
    ])
    .select()
    .single();

  if (importError || !importRow) {
    console.error("Erro ao registrar importação de estoque/preços:", importError);
    throw importError || new Error("Não foi possível registrar a importação.");
  }

  const chunkSize = 300;

  try {
    // 1) Grava TODOS os campos da planilha, linha a linha, em blocos.
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize).map((r) => toDbItemRow(r, importRow.id));

      const { error } = await supabase.from(STOCK_ITEMS_TABLE).insert(chunk);
      if (error) throw error;

      if (onProgress) onProgress(Math.min(i + chunkSize, records.length), records.length);
    }

    // 2) Aplica o preço T1 no catálogo (products) e registra o histórico,
    // comparando com o preço atualmente salvo em cada produto.
    const priceChangesCount = await applyT1PricesFromRecords(records, {
      fileName,
      fileSize,
      uploadedBy,
      sourceImportId: importRow.id,
    });

    // 3) Fecha a importação como concluída.
    const { data: finalRow, error: statusError } = await supabase
      .from(STOCK_IMPORTS_TABLE)
      .update({ status: "Concluído", price_changes_count: priceChangesCount })
      .eq("id", importRow.id)
      .select()
      .single();

    if (statusError || !finalRow) throw statusError || new Error("Falha ao finalizar importação.");

    await logAudit({
      action: "upload",
      entityType: "stock_price_import",
      entityId: importRow.id,
      entityLabel: fileName,
      description: `Importação de estoque/preços: ${records.length} produto(s), ${priceChangesCount} preço(s) alterado(s).`,
      userName: uploadedBy,
    });

    return fromStockImportRow(finalRow);
  } catch (err) {
    await supabase.from(STOCK_IMPORTS_TABLE).update({ status: "Erro" }).eq("id", importRow.id);
    throw err;
  }
}

async function applyT1PricesFromRecords(
  records: StockPriceRecord[],
  ctx: { fileName: string; fileSize: number; uploadedBy: string; sourceImportId: string }
): Promise<number> {
  const withCode = records.filter((r) => r.productCode);
  if (withCode.length === 0) return 0;

  // Dedup + batch: .in() vira query string GET no PostgREST, então uma
  // lista com milhares de códigos (planilha grande) estoura o limite de
  // tamanho da URL e a Supabase responde "Bad Request" (400). Buscamos
  // em blocos pequenos e juntamos os resultados no mesmo Map de antes.
  const uniqueCodes = Array.from(new Set(withCode.map((r) => r.productCode)));
  const FETCH_CHUNK = 150;
  const currentMap = new Map<string, any>();

  for (let i = 0; i < uniqueCodes.length; i += FETCH_CHUNK) {
    const chunk = uniqueCodes.slice(i, i + FETCH_CHUNK);
    const { data: chunkProducts, error: fetchError } = await supabase
      .from(PRODUCTS_TABLE)
      .select("product_code, name, price")
      .in("product_code", chunk);

    if (fetchError) {
      console.error("Erro ao buscar preços atuais para comparação:", fetchError);
      continue;
    }

    (chunkProducts ?? []).forEach((p: any) => currentMap.set(p.product_code, p));
  }

  const changed = withCode
    .map((r) => {
      const current = currentMap.get(r.productCode) as any;
      const previousPrice = current ? Number(current.price) || 0 : null;
      const newPrice = r.priceT1 || 0;
      return { record: r, previousPrice, newPrice, name: current?.name || r.productName };
    })
    .filter((d) => d.previousPrice === null || d.previousPrice !== d.newPrice);

  if (changed.length === 0) return 0;

  const { data: updateRow, error: updateError } = await supabase
    .from(PRICE_UPDATES_TABLE)
    .insert([
      {
        file_name: ctx.fileName,
        file_size: ctx.fileSize,
        uploaded_by: ctx.uploadedBy,
        row_count: withCode.length,
        changed_count: changed.length,
        status: "Concluído",
        source_import_id: ctx.sourceImportId,
      },
    ])
    .select()
    .single();

  if (updateError || !updateRow) {
    console.error("Erro ao registrar atualização automática de preços:", updateError);
    return 0;
  }

  const historyRows = changed.map((d) => ({
    price_update_id: updateRow.id,
    product_code: d.record.productCode,
    product_name: d.name,
    previous_price: d.previousPrice,
    new_price: d.newPrice,
    difference: d.previousPrice !== null ? d.newPrice - d.previousPrice : 0,
    percent_change:
      d.previousPrice !== null && d.previousPrice > 0
        ? ((d.newPrice - d.previousPrice) / d.previousPrice) * 100
        : null,
    changed_by: ctx.uploadedBy,
  }));

  const { error: historyError } = await supabase.from(PRICE_HISTORY_TABLE).insert(historyRows);
  if (historyError) console.error("Erro ao gravar histórico de preços:", historyError);

  for (const d of changed) {
    const { error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ price: d.newPrice, updated_at: new Date().toISOString() })
      .eq("product_code", d.record.productCode);

    if (productError) {
      console.error(`Erro ao atualizar preço do produto ${d.record.productCode}:`, productError);
    }
  }

  return changed.length;
}

export async function fetchStockImports(): Promise<StockImportSummary[]> {
  const { data, error } = await supabase
    .from(STOCK_IMPORTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico de estoque/preços:", error);
    return [];
  }
  return (data ?? []).map(fromStockImportRow);
}

export async function fetchStockImportItems(
  importId: string,
  page = 0,
  pageSize = 50,
  search = ""
): Promise<{ items: StockSnapshotItem[]; total: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(STOCK_ITEMS_TABLE)
    .select("*", { count: "exact" })
    .eq("import_id", importId);

  const term = search.trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(
      `product_name.ilike.${like},product_code.ilike.${like},supplier_name.ilike.${like},brand.ilike.${like}`
    );
  }

  const { data, error, count } = await query
    .order("product_name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Erro ao buscar itens do snapshot:", error);
    return { items: [], total: 0 };
  }

  return {
    items: (data ?? []).map(fromStockItemRow),
    total: count || 0,
  };
}

export async function deleteStockImport(id: string) {
  const { error } = await supabase.from(STOCK_IMPORTS_TABLE).delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir importação:", error);
    throw error;
  }

  await logAudit({
    action: "delete",
    entityType: "stock_price_import",
    entityId: id,
    description: `Importação de estoque/preços removida (id ${id}).`,
  });
}