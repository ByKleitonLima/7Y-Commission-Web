import { supabase } from "@/lib/supabase";
import { StockRecord } from "@/lib/parseStockFile";
import { PriceRecord } from "@/lib/parsePriceFile";

const STOCK_IMPORTS_TABLE = "stock_imports";
const STOCK_ITEMS_TABLE = "stock_snapshot_items";
const PRICE_UPDATES_TABLE = "price_updates";
const PRICE_HISTORY_TABLE = "price_history";

export interface StockImportSummary {
  id: string;
  fileName: string;
  fileSize: number | null;
  referenceDate: string | null;
  uploadedBy: string | null;
  rowCount: number;
  totalQuantity: number;
  totalValue: number;
  columnsFound: string[];
  status: string;
  createdAt: string;
}

function fromStockImportRow(row: any): StockImportSummary {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: row.file_size,
    referenceDate: row.reference_date,
    uploadedBy: row.uploaded_by,
    rowCount: row.row_count,
    totalQuantity: Number(row.total_quantity) || 0,
    totalValue: Number(row.total_value) || 0,
    columnsFound: row.columns_found || [],
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function saveStockSnapshot(params: {
  fileName: string;
  fileSize: number;
  referenceDate: string | null;
  uploadedBy: string;
  records: StockRecord[];
  columnsFound: string[];
  onProgress?: (sent: number, total: number) => void;
}): Promise<StockImportSummary> {
  const { fileName, fileSize, referenceDate, uploadedBy, records, columnsFound, onProgress } = params;

  const totalQuantity = records.reduce((sum, r) => sum + (r.quantity || 0), 0);
  const totalValue = records.reduce((sum, r) => sum + (r.totalValue || 0), 0);

  const { data: importRow, error: importError } = await supabase
    .from(STOCK_IMPORTS_TABLE)
    .insert([
      {
        file_name: fileName,
        file_size: fileSize,
        reference_date: referenceDate,
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
    console.error("Erro ao registrar importação de estoque:", importError);
    throw importError || new Error("Não foi possível registrar a importação.");
  }

  const chunkSize = 300;

  try {
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize).map((r) => ({
        import_id: importRow.id,
        product_code: r.productCode || null,
        product_name: r.productName || null,
        supplier_code: r.supplierCode || null,
        supplier_name: r.supplierName || null,
        category: r.category || null,
        family: r.family || null,
        quantity: r.quantity,
        unit_value: r.unitValue,
        total_value: r.totalValue,
        raw_data: r.raw,
      }));

      const { error } = await supabase.from(STOCK_ITEMS_TABLE).insert(chunk);
      if (error) throw error;

      if (onProgress) onProgress(Math.min(i + chunkSize, records.length), records.length);
    }

    const { data: finalRow, error: statusError } = await supabase
      .from(STOCK_IMPORTS_TABLE)
      .update({ status: "Concluído" })
      .eq("id", importRow.id)
      .select()
      .single();

    if (statusError || !finalRow) throw statusError || new Error("Falha ao finalizar importação.");

    return fromStockImportRow(finalRow);
  } catch (err) {
    await supabase.from(STOCK_IMPORTS_TABLE).update({ status: "Erro" }).eq("id", importRow.id);
    throw err;
  }
}

export async function fetchStockImports(): Promise<StockImportSummary[]> {
  const { data, error } = await supabase
    .from(STOCK_IMPORTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico de estoque:", error);
    return [];
  }
  return (data ?? []).map(fromStockImportRow);
}

export interface StockSnapshotItem {
  id: string;
  productCode: string;
  productName: string;
  supplierCode: string;
  supplierName: string;
  category: string;
  family: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export async function fetchStockImportItems(
  importId: string,
  page = 0,
  pageSize = 100
): Promise<{ items: StockSnapshotItem[]; total: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from(STOCK_ITEMS_TABLE)
    .select("*", { count: "exact" })
    .eq("import_id", importId)
    .order("product_name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Erro ao buscar itens do snapshot de estoque:", error);
    return { items: [], total: 0 };
  }

  return {
    items: (data ?? []).map((row: any) => ({
      id: row.id,
      productCode: row.product_code,
      productName: row.product_name,
      supplierCode: row.supplier_code,
      supplierName: row.supplier_name,
      category: row.category,
      family: row.family,
      quantity: Number(row.quantity) || 0,
      unitValue: Number(row.unit_value) || 0,
      totalValue: Number(row.total_value) || 0,
    })),
    total: count || 0,
  };
}

export async function deleteStockImport(id: string) {
  const { error } = await supabase.from(STOCK_IMPORTS_TABLE).delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir importação de estoque:", error);
    throw error;
  }
}

export interface PriceDiff {
  productCode: string;
  productName: string;
  previousPrice: number | null;
  newPrice: number;
  difference: number;
  percentChange: number | null;
}

export async function buildPriceDiffs(records: PriceRecord[]): Promise<PriceDiff[]> {
  const codes = records.map((r) => r.productCode).filter(Boolean);
  if (codes.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("product_code, name, price")
    .in("product_code", codes);

  if (error) {
    console.error("Erro ao buscar preços atuais dos produtos:", error);
  }

  const currentMap = new Map((data ?? []).map((p: any) => [p.product_code, p]));

  return records
    .filter((r) => r.productCode)
    .map((r) => {
      const current = currentMap.get(r.productCode) as any;
      const previousPrice = current ? Number(current.price) || 0 : null;
      const difference = previousPrice !== null ? r.newPrice - previousPrice : 0;
      const percentChange =
        previousPrice !== null && previousPrice > 0 ? (difference / previousPrice) * 100 : null;

      return {
        productCode: r.productCode,
        productName: r.productName || current?.name || "",
        previousPrice,
        newPrice: r.newPrice,
        difference,
        percentChange,
      };
    });
}

export async function applyPriceUpdate(params: {
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  diffs: PriceDiff[];
}) {
  const { fileName, fileSize, uploadedBy, diffs } = params;
  const changed = diffs.filter((d) => d.previousPrice === null || d.previousPrice !== d.newPrice);

  const { data: updateRow, error: updateError } = await supabase
    .from(PRICE_UPDATES_TABLE)
    .insert([
      {
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: uploadedBy,
        row_count: diffs.length,
        changed_count: changed.length,
        status: "Concluído",
      },
    ])
    .select()
    .single();

  if (updateError || !updateRow) {
    console.error("Erro ao registrar atualização de preços:", updateError);
    throw updateError || new Error("Não foi possível registrar a atualização de preços.");
  }

  if (changed.length > 0) {
    const historyRows = changed.map((d) => ({
      price_update_id: updateRow.id,
      product_code: d.productCode,
      product_name: d.productName,
      previous_price: d.previousPrice,
      new_price: d.newPrice,
      difference: d.difference,
      percent_change: d.percentChange,
      changed_by: uploadedBy,
    }));

    const { error: historyError } = await supabase.from(PRICE_HISTORY_TABLE).insert(historyRows);
    if (historyError) {
      console.error("Erro ao gravar histórico de preços:", historyError);
      throw historyError;
    }

    for (const d of changed) {
      const { error: productError } = await supabase
        .from("products")
        .update({ price: d.newPrice, updated_at: new Date().toISOString() })
        .eq("product_code", d.productCode);

      if (productError) {
        console.error(`Erro ao atualizar preço do produto ${d.productCode}:`, productError);
      }
    }
  }

  return { updateId: updateRow.id, changedCount: changed.length };
}

export interface PriceUpdateSummary {
  id: string;
  fileName: string;
  uploadedBy: string | null;
  rowCount: number;
  changedCount: number;
  status: string;
  createdAt: string;
}

export async function fetchPriceUpdates(): Promise<PriceUpdateSummary[]> {
  const { data, error } = await supabase
    .from(PRICE_UPDATES_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico de atualizações de preço:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    fileName: row.file_name,
    uploadedBy: row.uploaded_by,
    rowCount: row.row_count,
    changedCount: row.changed_count,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export interface PriceHistoryEntry {
  id: string;
  productCode: string;
  productName: string;
  previousPrice: number | null;
  newPrice: number;
  difference: number | null;
  percentChange: number | null;
  changedBy: string | null;
  createdAt: string;
}

export async function fetchPriceHistoryByUpdate(updateId: string): Promise<PriceHistoryEntry[]> {
  const { data, error } = await supabase
    .from(PRICE_HISTORY_TABLE)
    .select("*")
    .eq("price_update_id", updateId)
    .order("percent_change", { ascending: false });

  if (error) {
    console.error("Erro ao buscar detalhes da atualização de preços:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    productCode: row.product_code,
    productName: row.product_name,
    previousPrice: row.previous_price !== null ? Number(row.previous_price) : null,
    newPrice: Number(row.new_price),
    difference: row.difference !== null ? Number(row.difference) : null,
    percentChange: row.percent_change !== null ? Number(row.percent_change) : null,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }));
}

export async function fetchPriceHistoryForProduct(productCode: string): Promise<PriceHistoryEntry[]> {
  const { data, error } = await supabase
    .from(PRICE_HISTORY_TABLE)
    .select("*")
    .eq("product_code", productCode)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico de preços do produto:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    productCode: row.product_code,
    productName: row.product_name,
    previousPrice: row.previous_price !== null ? Number(row.previous_price) : null,
    newPrice: Number(row.new_price),
    difference: row.difference !== null ? Number(row.difference) : null,
    percentChange: row.percent_change !== null ? Number(row.percent_change) : null,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }));
}