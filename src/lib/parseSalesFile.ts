import * as XLSX from "xlsx";
import { SalesRecord } from "@/context/salesDataContext";

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
    const parsed = Number(value.replace(",", "."));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("pt-BR");
  }
  return String(value ?? "");
}

// Colunas que o parser espera encontrar
const REQUIRED_KEYS = [
  "ID_SUPERVISOR", "GERENTE", "PARCEIRO", "CODVEN", "VENDEDOR", "REDE",
  "CODPARC", "NOMEPARC", "EMISSAO", "NR_UNICO", "REF PEDIDO", "FORNECEDOR",
  "COD", "PRODUTO", "QTDNEG", "QTDFARD", "VLRUNIT", "VLRTOT", "% BOLETO",
  "VLR", "% DESC_BONI", "VLR UNIT", "VLR_LIQUIDO", "TABELA", "%",
  "COMISSAO REPR.", "DESCR.", "APLICATIVO", "DIVISAO", "PREMIO",
  "CODGRUPO", "REGPROMO", "VLRPROMO", "GRUPO", "FAMILIA",
];

const HEADER_ECHO_MARKERS = ["ID_SUPERVISOR", "CODVEN", "CODPARC", "NR_UNICO"];

function isHeaderEchoRow(normalized: Record<string, unknown>): boolean {
  return HEADER_ECHO_MARKERS.every(
    (key) => String(normalized[key] ?? "").trim().toUpperCase() === key
  );
}

export async function parseSalesFile(file: File): Promise<SalesRecord[]> {
  const buffer = await file.arrayBuffer();
  
  // CORREÇÃO: Converter o ArrayBuffer para Uint8Array resolve o erro "TypeError: Cannot set properties of undefined (setting 'name')"
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("A planilha enviada está vazia ou é inválida.");
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

  // Diagnóstico
  if (rawRows.length > 0) {
    const foundKeys = new Set(Object.keys(rawRows[0]).map(normalizeKey));
    const missing = REQUIRED_KEYS.filter((k) => !foundKeys.has(k));
    if (missing.length > 0) {
      console.warn(
        "[parseSalesFile] Colunas esperadas NÃO encontradas na planilha (esses campos virão vazios/zerados):",
        missing
      );
      console.warn(
        "[parseSalesFile] Colunas realmente encontradas na planilha:",
        Array.from(foundKeys)
      );
    }
  }

  const normalizedRows = rawRows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = value;
    }
    return normalized;
  });

  const validRows = normalizedRows.filter((row) => !isHeaderEchoRow(row));
  const headerEchoCount = normalizedRows.length - validRows.length;
  if (headerEchoCount > 0) {
    console.warn(
      `[parseSalesFile] ${headerEchoCount} linha(s) de cabeçalho repetido dentro dos dados foram descartadas.`
    );
  }

  return validRows.map((normalized) => {
    return {
      supervisorId: String(normalized["ID_SUPERVISOR"] ?? ""),
      managerName: String(normalized["GERENTE"] ?? ""),
      partnerCode: String(normalized["PARCEIRO"] ?? ""),
      sellerCode: String(normalized["CODVEN"] ?? ""),
      sellerName: String(normalized["VENDEDOR"] ?? ""),
      network: String(normalized["REDE"] ?? ""),
      clientCode: String(normalized["CODPARC"] ?? ""),
      clientName: String(normalized["NOMEPARC"] ?? ""),
      issueDate: toDateString(normalized["EMISSAO"]),
      uniqueNumber: String(normalized["NR_UNICO"] ?? ""),
      orderRef: String(normalized["REF PEDIDO"] ?? ""),
      supplier: String(normalized["FORNECEDOR"] ?? ""),
      productCode: String(normalized["COD"] ?? ""),
      productName: String(normalized["PRODUTO"] ?? ""),
      quantity: toNumber(normalized["QTDNEG"]),
      bundleQuantity: toNumber(normalized["QTDFARD"]),
      unitValue: toNumber(normalized["VLRUNIT"]),
      totalValue: toNumber(normalized["VLRTOT"]),
      percentBoleto: toNumber(normalized["% BOLETO"]),
      vlr: toNumber(normalized["VLR"]),
      percentDescBoni: toNumber(normalized["% DESC_BONI"]),
      vlrUnitLiq: toNumber(normalized["VLR UNIT"]),
      netValue: toNumber(normalized["VLR_LIQUIDO"]),
      tableType: String(normalized["TABELA"] ?? ""),
      percent: toNumber(normalized["%"]),
      commissionValue: toNumber(normalized["COMISSAO REPR."]),
      description: String(normalized["DESCR."] ?? ""),
      appType: String(normalized["APLICATIVO"] ?? ""),
      division: String(normalized["DIVISAO"] ?? ""),
      premium: String(normalized["PREMIO"] ?? ""),
      groupCode: String(normalized["CODGRUPO"] ?? ""),
      regPromo: String(normalized["REGPROMO"] ?? ""),
      vlrPromo: toNumber(normalized["VLRPROMO"]),
      group: String(normalized["GRUPO"] ?? ""),
      family: String(normalized["FAMILIA"] ?? ""),
    };
  });
}