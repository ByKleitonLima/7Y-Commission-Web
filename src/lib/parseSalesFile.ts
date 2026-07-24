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

export async function parseSalesFile(file: File): Promise<SalesRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });

  return rawRows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeKey(key)] = value;
    }

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