import * as XLSX from "xlsx";

export interface StockRecord {
  productCode: string;
  productName: string;
  supplierCode: string;
  supplierName: string;
  category: string;
  family: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  raw: Record<string, unknown>;
}

export interface ParsedStockFile {
  records: StockRecord[];
  columnsFound: string[];
  referenceDate: string | null;
  totalQuantity: number;
  totalValue: number;
}

function normalizeKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return 0;
    const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(parsed)) return parsed;
    const fallback = Number(trimmed.replace(",", "."));
    return Number.isNaN(fallback) ? 0 : fallback;
  }
  return 0;
}

const CODE_KEYS = ["CODIGO", "CODIGO PRODUTO", "COD", "COD PRODUTO", "CODPROD", "COD."];
const NAME_KEYS = ["PRODUTO", "DESCRICAO", "DESCRICAO PRODUTO", "NOME PRODUTO", "MERCADORIA"];
const SUPPLIER_CODE_KEYS = ["FORNECEDOR", "COD FORNECEDOR", "CODIGO FORNECEDOR", "COD. FORNECEDOR"];
const SUPPLIER_NAME_KEYS = ["NOME FORNECEDOR", "FORNECEDOR NOME", "RAZAO SOCIAL FORNECEDOR"];
const CATEGORY_KEYS = ["CATEGORIA", "LINHA"];
const FAMILY_KEYS = ["FAMILIA", "FAMILIA PRODUTO", "GRUPO"];
const QUANTITY_KEYS = ["QUANTIDADE", "QTD", "QTD ESTOQUE", "ESTOQUE", "SALDO", "SALDO ESTOQUE", "QTDE"];
const UNIT_VALUE_KEYS = ["VALOR UNITARIO", "VLR UNITARIO", "PRECO UNITARIO", "PRECO", "VLR UNIT"];
const TOTAL_VALUE_KEYS = ["VALOR TOTAL", "VLR TOTAL", "TOTAL", "VALOR EM ESTOQUE"];

const ALL_KNOWN_KEYS = [
  ...CODE_KEYS,
  ...NAME_KEYS,
  ...QUANTITY_KEYS,
  ...UNIT_VALUE_KEYS,
  ...TOTAL_VALUE_KEYS,
];

function findColumnIndex(headerRow: unknown[], candidates: string[]): number {
  const normalized = headerRow.map((c) => normalizeKey(String(c ?? "")));
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  const scanLimit = Math.min(rows.length, 15);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] || [];
    const normalizedCells = row.map((cell) => normalizeKey(String(cell ?? "")));
    const score = ALL_KNOWN_KEYS.reduce(
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

function extractDateFromFileName(fileName: string): string | null {
  const brMatch = fileName.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;

  const isoMatch = fileName.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  return null;
}

export async function parseStockFile(file: File): Promise<ParsedStockFile> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("A planilha de estoque enviada está vazia ou é inválida.");
  }

  const records: StockRecord[] = [];
  const columnsFoundSet = new Set<string>();
  let totalQuantity = 0;
  let totalValue = 0;
  const referenceDate = extractDateFromFileName(file.name);

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

    headerRow.forEach((cell) => {
      const label = String(cell ?? "").trim();
      if (label) columnsFoundSet.add(label);
    });

    const codeIdx = findColumnIndex(headerRow, CODE_KEYS);
    const nameIdx = findColumnIndex(headerRow, NAME_KEYS);
    const supplierCodeIdx = findColumnIndex(headerRow, SUPPLIER_CODE_KEYS);
    const supplierNameIdx = findColumnIndex(headerRow, SUPPLIER_NAME_KEYS);
    const categoryIdx = findColumnIndex(headerRow, CATEGORY_KEYS);
    const familyIdx = findColumnIndex(headerRow, FAMILY_KEYS);
    const quantityIdx = findColumnIndex(headerRow, QUANTITY_KEYS);
    const unitValueIdx = findColumnIndex(headerRow, UNIT_VALUE_KEYS);
    const totalValueIdx = findColumnIndex(headerRow, TOTAL_VALUE_KEYS);

    if (codeIdx === -1 && nameIdx === -1) continue;

    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
        continue;
      }

      const raw: Record<string, unknown> = {};
      headerRow.forEach((cell, idx) => {
        const key = String(cell ?? "").trim();
        if (key) raw[key] = row[idx] ?? null;
      });

      const quantity = quantityIdx !== -1 ? toNumber(row[quantityIdx]) : 0;
      const unitValue = unitValueIdx !== -1 ? toNumber(row[unitValueIdx]) : 0;
      const rowTotalValue =
        totalValueIdx !== -1 ? toNumber(row[totalValueIdx]) : quantity * unitValue;

      const productCode = codeIdx !== -1 ? String(row[codeIdx] ?? "").trim() : "";
      const productName = nameIdx !== -1 ? String(row[nameIdx] ?? "").trim() : "";

      if (!productCode && !productName) continue;

      const record: StockRecord = {
        productCode,
        productName,
        supplierCode: supplierCodeIdx !== -1 ? String(row[supplierCodeIdx] ?? "").trim() : "",
        supplierName: supplierNameIdx !== -1 ? String(row[supplierNameIdx] ?? "").trim() : "",
        category: categoryIdx !== -1 ? String(row[categoryIdx] ?? "").trim() : "",
        family: familyIdx !== -1 ? String(row[familyIdx] ?? "").trim() : "",
        quantity,
        unitValue,
        totalValue: rowTotalValue,
        raw,
      };

      totalQuantity += quantity;
      totalValue += rowTotalValue;
      records.push(record);
    }
  }

  if (records.length === 0) {
    throw new Error(
      "Não foi possível identificar as colunas de produto/quantidade na planilha. Verifique se o arquivo está no formato esperado."
    );
  }

  return {
    records,
    columnsFound: Array.from(columnsFoundSet),
    referenceDate,
    totalQuantity,
    totalValue,
  };
}