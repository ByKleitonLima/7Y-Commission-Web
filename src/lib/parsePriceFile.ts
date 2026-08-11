import * as XLSX from "xlsx";

export interface PriceRecord {
  productCode: string;
  productName: string;
  newPrice: number;
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
const NAME_KEYS = ["PRODUTO", "DESCRICAO", "DESCRICAO PRODUTO", "NOME PRODUTO"];
const PRICE_KEYS = [
  "PRECO",
  "NOVO PRECO",
  "PRECO NOVO",
  "PRECO ATUALIZADO",
  "VALOR",
  "PRECO UNITARIO",
  "PRECO VENDA",
  "VLR VENDA",
];

const ALL_KNOWN_KEYS = [...CODE_KEYS, ...NAME_KEYS, ...PRICE_KEYS];

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

export async function parsePriceFile(file: File): Promise<PriceRecord[]> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("A planilha de preços enviada está vazia ou é inválida.");
  }

  const records: PriceRecord[] = [];

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

    const codeIdx = findColumnIndex(headerRow, CODE_KEYS);
    const nameIdx = findColumnIndex(headerRow, NAME_KEYS);
    const priceIdx = findColumnIndex(headerRow, PRICE_KEYS);

    if (codeIdx === -1 || priceIdx === -1) continue;

    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
        continue;
      }

      const productCode = String(row[codeIdx] ?? "").trim();
      if (!productCode) continue;

      records.push({
        productCode,
        productName: nameIdx !== -1 ? String(row[nameIdx] ?? "").trim() : "",
        newPrice: toNumber(row[priceIdx]),
      });
    }
  }

  if (records.length === 0) {
    throw new Error(
      "Não foi possível identificar as colunas de código e preço na planilha. Verifique o formato do arquivo."
    );
  }

  return records;
}