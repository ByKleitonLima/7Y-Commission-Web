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
    const trimmed = value.trim();
    if (trimmed === "") return 0;
    const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(parsed)) return parsed;
    const fallback = Number(trimmed.replace(",", "."));
    return Number.isNaN(fallback) ? 0 : fallback;
  }
  return 0;
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("pt-BR");
  }
  return String(value ?? "");
}

// Mapa de coluna normalizada -> campo do SalesRecord. Cobre TODAS as
// colunas presentes na planilha de comissão (54 colunas), sem descartar
// nenhuma informação. A chave é o resultado de normalizeKey() aplicado ao
// cabeçalho real da planilha.
const COLUMN_FIELD_MAP: Record<string, keyof SalesRecord> = {
  ID_SUPERVISOR: "supervisorId",
  GERENTE: "managerName",
  PARCEIRO: "partnerCode",
  CODVEN: "sellerCode",
  VENDEDOR: "sellerName",
  REDE: "network",
  CODPARC: "clientCode",
  NOMEPARC: "clientName",
  EMISSAO: "issueDate",
  NR_UNICO: "uniqueNumber",
  "REF PEDIDO": "orderRef",
  FORNECEDOR: "supplier",
  COD: "productCode",
  PRODUTO: "productName",
  QTDNEG: "quantity",
  QTDFARD: "bundleQuantity",
  VLRUNIT: "unitValue",
  VLRTOT: "totalValue",
  "% BOLETO": "percentBoleto",
  VLR: "vlr",
  "% DESC_BONI": "percentDescBoni",
  "VLR UNIT LIQUIDO": "vlrUnitLiq",
  VLR_LIQUIDO: "netValue",
  TABELA: "tableType",
  "% COMISSAO": "percent",
  "COMISSAO REPR.": "commissionValue",
  "DESCR.": "description",
  APLICATIVO: "appType",
  DIVISAO: "division",
  PREMIO: "premium",
  CODGRUPO: "groupCode",
  "DESCRICAO PRODUTO": "productDescription",
  REGPROMO: "regPromo",
  VLRPROMO: "vlrPromo",
  GRUPO: "group",
  "FAMILIA PRODUTO": "family",
  "VALOR PROMO 1": "promoValue1",
  "VALOR PROMO 2": "promoValue2",
  "VALOR TOTAL PEDIDO": "orderTotalValue",
  "VALOR TOTAL BONIFICACAO": "bonusTotalValue",
  "VENDA TOTAL CLIENTE": "clientTotalSale",
  "Nº UNICO BONI.": "bonusUniqueNumber",
  "DESCRICAO OPERACAO": "operationDescription",
  "VALOR CONSIDERADO": "consideredValue",
  "% DESCONTO PRECO VENDA": "percentSalePriceDiscount",
  "% DESC. CONTRATO": "percentContractDiscount",
  "% BONI. MANUAL": "percentManualBonus",
  "TOTAL % DE DESCONTOS": "totalPercentDiscounts",
  "% BRUTO A PAGAR": "percentGrossToPay",
  "% DESCONTO": "percentDiscount",
  "% FINAL COMISSAO": "percentFinalCommission",
  "COMISSAO REPRESENTANTE": "representativeCommission",
  "COMISSAO GERENTE": "managerCommission",
  "VLR A SER PAGO COMO PREMIO": "premiumPaidValue",
};

// Campos que representam número (o restante é tratado como texto/data).
const NUMERIC_FIELDS = new Set<keyof SalesRecord>([
  "quantity",
  "bundleQuantity",
  "unitValue",
  "totalValue",
  "percentBoleto",
  "vlr",
  "percentDescBoni",
  "vlrUnitLiq",
  "netValue",
  "percent",
  "commissionValue",
  "vlrPromo",
  "promoValue1",
  "promoValue2",
  "orderTotalValue",
  "bonusTotalValue",
  "clientTotalSale",
  "consideredValue",
  "percentSalePriceDiscount",
  "percentContractDiscount",
  "percentManualBonus",
  "totalPercentDiscounts",
  "percentGrossToPay",
  "percentDiscount",
  "percentFinalCommission",
  "representativeCommission",
  "managerCommission",
  "premiumPaidValue",
]);

const DATE_FIELDS = new Set<keyof SalesRecord>(["issueDate"]);

const REQUIRED_HEADER_KEYS = Object.keys(COLUMN_FIELD_MAP);

const HEADER_ECHO_MARKERS = ["ID_SUPERVISOR", "CODVEN", "CODPARC", "NR_UNICO"];

// Algumas planilhas trazem uma linha de totais/resumo antes do cabeçalho
// real (ex.: linha 1 com "TOTAIS" e somatórios, cabeçalho de verdade na
// linha 2). Em vez de assumir que a primeira linha é sempre o cabeçalho,
// varremos as primeiras linhas em busca daquela que mais se parece com o
// cabeçalho esperado.
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

function isHeaderEchoRow(normalized: Record<string, unknown>): boolean {
  return HEADER_ECHO_MARKERS.every(
    (key) => String(normalized[key] ?? "").trim().toUpperCase() === key
  );
}

export async function parseSalesFile(file: File): Promise<SalesRecord[]> {
  const buffer = await file.arrayBuffer();

  // Converter o ArrayBuffer para Uint8Array resolve o erro "TypeError:
  // Cannot set properties of undefined (setting 'name')".
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: "array", cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("A planilha enviada está vazia ou é inválida.");
  }

  const allRecords: SalesRecord[] = [];

  // Lê TODAS as abas da planilha, não apenas a primeira, para não perder
  // dados caso o arquivo tenha múltiplas abas com registros de comissão.
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // header: 1 -> array de arrays "cru", sem o SheetJS assumir sozinho
    // qual linha é o cabeçalho (o que causava a leitura errada quando a
    // primeira linha era uma linha de totais).
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (rawRows.length === 0) continue;

    const headerRowIndex = findHeaderRowIndex(rawRows);
    const headerRow = rawRows[headerRowIndex] || [];

    const columnIndexToField: Array<{ index: number; field: keyof SalesRecord }> = [];
    const foundKeys = new Set<string>();

    headerRow.forEach((cell, index) => {
      const normalizedHeader = normalizeKey(String(cell ?? ""));
      if (!normalizedHeader) return;
      foundKeys.add(normalizedHeader);
      const field = COLUMN_FIELD_MAP[normalizedHeader];
      if (field) {
        columnIndexToField.push({ index, field });
      }
    });

    const missing = REQUIRED_HEADER_KEYS.filter((k) => !foundKeys.has(k));
    if (missing.length > 0) {
      console.warn(
        `[parseSalesFile] Aba "${sheetName}": colunas esperadas NÃO encontradas na planilha (esses campos virão vazios/zerados):`,
        missing
      );
      console.warn(
        `[parseSalesFile] Aba "${sheetName}": colunas realmente encontradas no cabeçalho (linha ${headerRowIndex + 1}):`,
        Array.from(foundKeys)
      );
    }

    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      if (!row || row.every((cell) => cell === null || cell === undefined || cell === "")) {
        continue;
      }

      const normalized: Record<string, unknown> = {};
      for (const { index, field } of columnIndexToField) {
        normalized[field] = row[index];
      }

      // Reconstrói um dicionário normalizado (chave = cabeçalho normalizado)
      // apenas para a checagem de linha de cabeçalho repetido no meio dos
      // dados (artefato de paginação do gerador de relatório).
      const normalizedByHeader: Record<string, unknown> = {};
      headerRow.forEach((cell, index) => {
        const normalizedHeader = normalizeKey(String(cell ?? ""));
        if (normalizedHeader) normalizedByHeader[normalizedHeader] = row[index];
      });

      if (isHeaderEchoRow(normalizedByHeader)) continue;

      const record: Partial<SalesRecord> = {};

      for (const { field } of columnIndexToField) {
        const rawValue = normalized[field];
        if (NUMERIC_FIELDS.has(field)) {
          (record as any)[field] = toNumber(rawValue);
        } else if (DATE_FIELDS.has(field)) {
          (record as any)[field] = toDateString(rawValue);
        } else {
          (record as any)[field] = String(rawValue ?? "");
        }
      }

      // Garante que todos os campos numéricos e de texto existam mesmo
      // quando a coluna correspondente não foi encontrada na planilha,
      // para nunca quebrar o restante do sistema.
      const complete: SalesRecord = {
        supervisorId: record.supervisorId ?? "",
        managerName: record.managerName ?? "",
        partnerCode: record.partnerCode ?? "",
        sellerCode: record.sellerCode ?? "",
        sellerName: record.sellerName ?? "",
        network: record.network ?? "",
        clientCode: record.clientCode ?? "",
        clientName: record.clientName ?? "",
        issueDate: record.issueDate ?? "",
        uniqueNumber: record.uniqueNumber ?? "",
        orderRef: record.orderRef ?? "",
        supplier: record.supplier ?? "",
        productCode: record.productCode ?? "",
        productName: record.productName ?? "",
        quantity: record.quantity ?? 0,
        bundleQuantity: record.bundleQuantity ?? 0,
        unitValue: record.unitValue ?? 0,
        totalValue: record.totalValue ?? 0,
        percentBoleto: record.percentBoleto ?? 0,
        vlr: record.vlr ?? 0,
        percentDescBoni: record.percentDescBoni ?? 0,
        vlrUnitLiq: record.vlrUnitLiq ?? 0,
        netValue: record.netValue ?? 0,
        tableType: record.tableType ?? "",
        percent: record.percent ?? 0,
        commissionValue: record.commissionValue ?? 0,
        description: record.description ?? "",
        appType: record.appType ?? "",
        division: record.division ?? "",
        premium: record.premium ?? "",
        groupCode: record.groupCode ?? "",
        productDescription: record.productDescription ?? "",
        regPromo: record.regPromo ?? "",
        vlrPromo: record.vlrPromo ?? 0,
        group: record.group ?? "",
        family: record.family ?? "",
        promoValue1: record.promoValue1 ?? 0,
        promoValue2: record.promoValue2 ?? 0,
        orderTotalValue: record.orderTotalValue ?? 0,
        bonusTotalValue: record.bonusTotalValue ?? 0,
        clientTotalSale: record.clientTotalSale ?? 0,
        bonusUniqueNumber: record.bonusUniqueNumber ?? "",
        operationDescription: record.operationDescription ?? "",
        consideredValue: record.consideredValue ?? 0,
        percentSalePriceDiscount: record.percentSalePriceDiscount ?? 0,
        percentContractDiscount: record.percentContractDiscount ?? 0,
        percentManualBonus: record.percentManualBonus ?? 0,
        totalPercentDiscounts: record.totalPercentDiscounts ?? 0,
        percentGrossToPay: record.percentGrossToPay ?? 0,
        percentDiscount: record.percentDiscount ?? 0,
        percentFinalCommission: record.percentFinalCommission ?? 0,
        representativeCommission: record.representativeCommission ?? 0,
        managerCommission: record.managerCommission ?? 0,
        premiumPaidValue: record.premiumPaidValue ?? 0,
      };

      allRecords.push(complete);
    }
  }

  return allRecords;
}