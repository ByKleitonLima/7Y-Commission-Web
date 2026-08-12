import * as XLSX from "xlsx";

// Mapeia TODAS as 39 colunas da planilha ESTOQUE_MKT (estoque + preços +
// comissão + dados fiscais já vêm juntos nessa única planilha — não é
// preciso mais enviar duas planilhas separadas).
export interface StockPriceRecord {
  dtAlter: string | null; // data da última alteração no ERP
  productCode: string;
  productName: string;
  bundleQuantity: number; // Qtd Fardo (pacotes por fardo)
  active: string; // Ativo
  fbsCnx: string;
  activeMobile: string;
  showCatalog: string;
  stock7y: number; // Estoque 7Y
  stockGalpao: number; // Estoque GALPÃO
  stockConexao: number; // Estoque CONEXÃO
  stockFwyLoja: number; // Estoque FWY Loja
  supplierName: string; // Fornecedor
  groupCode: string; // Cod Grupo
  groupDescription: string; // Descrição CodGrupo
  priceT1: number;
  priceT2: number;
  priceT3: number;
  priceT4: number;
  priceT5: number;
  priceT11: number;
  promoValue: number; // VALOR PROMOCIONAL
  promoQuantity: number; // QTD PROMOCIONAL
  promoValue2: number;
  promoQuantity2: number;
  cest: string;
  ncm: string;
  ean: string; // Ean (CodBarra PCT)
  dun: string; // Dun (Cx/Fd)
  commissionPercent: number; // % COMISSÃO
  verbaPercent: number; // % Verba
  legend: string;
  group: string; // GRUPO
  family: string; // FAMILIA
  premiumValue: number; // VALOR PREMIAÇÃO
  size: string; // TAM
  stripQuantity: number; // Qtd TIRAS
  brand: string; // MARCA
  imageOrder: number; // ORDEM IMAG
  // Estoque total somado (todos os depósitos) — usado para totais e valorização.
  totalStock: number;
  // Registro cru completo (cabeçalho original -> valor original), para
  // nunca perder nenhuma informação, mesmo que o schema mude no futuro.
  raw: Record<string, unknown>;
}

export interface ParsedStockPriceFile {
  records: StockPriceRecord[];
  columnsFound: string[];
  totalStockUnits: number;
  totalValueT1: number; // valorização do estoque pelo preço T1
}

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Aceita tanto "14.39" (ponto decimal, como vem nessa planilha) quanto
// "1.234,56" (formato BR com milhar e vírgula decimal), e trata "null"
// (string literal que aparece nas células vazias dessa planilha) como 0.
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    let s = value.trim();
    if (!s || s.toLowerCase() === "null") return 0;
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s.toLowerCase() === "null") return "";
  return s;
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const s = String(value).trim();
  if (!s || s.toLowerCase() === "null") return null;
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Cada chave é o cabeçalho normalizado (normalizeKey aplicado ao header
// real da planilha ESTOQUE_MKT). Cobre as 39 colunas confirmadas por
// inspeção direta do arquivo — nenhuma é assumida "de memória".
const COLUMN_FIELD_MAP: Record<string, keyof StockPriceRecord> = {
  DTALTER: "dtAlter",
  CODIGO: "productCode",
  DESCRICAO: "productName",
  "QTD FARDO": "bundleQuantity",
  ATIVO: "active",
  FBS_CNX: "fbsCnx",
  "ATIVO MOBILE": "activeMobile",
  "EXIBIR CATALAGO": "showCatalog",
  "ESTOQUE 7Y": "stock7y",
  "ESTOQUE GALPAO": "stockGalpao",
  "ESTOQUE CONEXAO": "stockConexao",
  "ESTOQUE FWY LOJA": "stockFwyLoja",
  FORNECEDOR: "supplierName",
  "COD GRUPO": "groupCode",
  "DESCRICAO CODGRUPO": "groupDescription",
  "TABELA T1": "priceT1",
  "TABELA T2": "priceT2",
  "TABELA T3": "priceT3",
  "TABELA T4": "priceT4",
  "TABELA T5": "priceT5",
  "TABELA T11": "priceT11",
  "VALOR PROMOCIONAL": "promoValue",
  "QTD PROMOCIONAL": "promoQuantity",
  "VALOR PROMO2": "promoValue2",
  "QTD PROMO2": "promoQuantity2",
  CEST: "cest",
  NCM: "ncm",
  "EAN ( CODBARRA PCT)": "ean",
  "DUN (CX/FD)": "dun",
  "% COMISSAO": "commissionPercent",
  "% VERBA": "verbaPercent",
  LEGENDA: "legend",
  GRUPO: "group",
  FAMILIA: "family",
  "VALOR PREMIACAO": "premiumValue",
  TAM: "size",
  "QTD TIRAS": "stripQuantity",
  MARCA: "brand",
  "ORDEM IMAG": "imageOrder",
};

const NUMERIC_FIELDS = new Set<keyof StockPriceRecord>([
  "bundleQuantity",
  "stock7y",
  "stockGalpao",
  "stockConexao",
  "stockFwyLoja",
  "priceT1",
  "priceT2",
  "priceT3",
  "priceT4",
  "priceT5",
  "priceT11",
  "promoValue",
  "promoQuantity",
  "promoValue2",
  "promoQuantity2",
  "commissionPercent",
  "verbaPercent",
  "premiumValue",
  "stripQuantity",
  "imageOrder",
]);

const DATE_FIELDS = new Set<keyof StockPriceRecord>(["dtAlter"]);

const REQUIRED_HEADER_KEYS = ["CODIGO", "DESCRICAO", "TABELA T1", "ESTOQUE 7Y", "FORNECEDOR"];

function findHeaderRowIndex(rows: unknown[][]): number {
  const scanLimit = Math.min(rows.length, 15);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] || [];
    const normalizedCells = row.map((cell) => normalizeKey(String(cell ?? "")));
    const score = REQUIRED_HEADER_KEYS.reduce(
      (count, key) => count + (normalizedCells.includes(key) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export async function parseStockPriceFile(file: File): Promise<ParsedStockPriceFile> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("A planilha ESTOQUE_MKT enviada está vazia ou é inválida.");
  }

  const records: StockPriceRecord[] = [];
  const columnsFoundSet = new Set<string>();
  let totalStockUnits = 0;
  let totalValueT1 = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });
    if (rawRows.length === 0) continue;

    const headerRowIndex = findHeaderRowIndex(rawRows);
    const headerRow = rawRows[headerRowIndex] || [];

    const columnIndexToField: Array<{ index: number; field: keyof StockPriceRecord }> = [];
    const originalHeaderByIndex: Record<number, string> = {};

    headerRow.forEach((cell, index) => {
      const original = String(cell ?? "").trim();
      if (!original) return;
      originalHeaderByIndex[index] = original;
      columnsFoundSet.add(original);

      const normalized = normalizeKey(original);
      const field = COLUMN_FIELD_MAP[normalized];
      if (field) columnIndexToField.push({ index, field });
    });

    const missing = REQUIRED_HEADER_KEYS.filter(
      (k) => !headerRow.some((c) => normalizeKey(String(c ?? "")) === k)
    );
    if (missing.length > 0) {
      console.warn(
        `[parseStockPriceFile] Aba "${sheetName}": colunas esperadas não encontradas:`,
        missing
      );
    }

    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
        continue;
      }

      const partial: Partial<Record<keyof StockPriceRecord, unknown>> = {};
      for (const { index, field } of columnIndexToField) {
        partial[field] = row[index];
      }

      const productCode = toText(partial.productCode);
      const productName = toText(partial.productName);
      if (!productCode && !productName) continue;

      const raw: Record<string, unknown> = {};
      Object.entries(originalHeaderByIndex).forEach(([idxStr, header]) => {
        raw[header] = row[Number(idxStr)] ?? null;
      });

      const record: any = {
        productCode,
        productName,
        raw,
      };

      for (const field of Object.values(COLUMN_FIELD_MAP)) {
        if (field === "productCode" || field === "productName") continue;
        const rawValue = partial[field];
        if (NUMERIC_FIELDS.has(field)) {
          record[field] = toNumber(rawValue);
        } else if (DATE_FIELDS.has(field)) {
          record[field] = toDateString(rawValue);
        } else {
          record[field] = toText(rawValue);
        }
      }

      const totalStock =
        (record.stock7y || 0) +
        (record.stockGalpao || 0) +
        (record.stockConexao || 0) +
        (record.stockFwyLoja || 0);

      record.totalStock = totalStock;

      totalStockUnits += totalStock;
      totalValueT1 += totalStock * (record.priceT1 || 0);

      records.push(record as StockPriceRecord);
    }
  }

  if (records.length === 0) {
    throw new Error(
      "Não foi possível identificar produtos na planilha. Verifique se é o arquivo ESTOQUE_MKT correto."
    );
  }

  return {
    records,
    columnsFound: Array.from(columnsFoundSet),
    totalStockUnits,
    totalValueT1,
  };
}