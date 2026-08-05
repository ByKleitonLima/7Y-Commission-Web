export type PositionType = "doca" | "posicao";

export interface DockLevel {
    level: number;
    status: "vazio" | "ocupado" | "bloqueado";
    product?: string;
    product_code?: string;
    qty?: number;
}

export interface DockDefinition {
    code: string;
    type: PositionType;
    label: string;
    shortLabel?: string;
    galpao: number;
    rua?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    defaultCapacity: number;
    levels: DockLevel[];
}

export interface WarehouseRoom {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    fill?: string;
    stroke?: string;
    vertical?: boolean;
    isStreet?: boolean;
}

/* ============================================================
 * HELPER DE NÍVEIS
 * ============================================================ */

function default1Level(): DockLevel[] {
    return [{ level: 1, status: "vazio" }];
}

function default4Levels(): DockLevel[] {
    return [
        { level: 4, status: "vazio" },
        { level: 3, status: "vazio" },
        { level: 2, status: "vazio" },
        { level: 1, status: "vazio" },
    ];
}

/* ============================================================
 * CONFIGURAÇÕES GLOBAIS DE GRADE
 * ============================================================ */

const GAP = 5;
const COL_W = 44;
const COL_H = 38;
const BAND_H = 90;
const BAND_H_SM = 30;
const BLOCK_GAP = 12;
const MARGIN_X = 30;

const LEFT_COLS = 7;
const LEFT_WIDTH = LEFT_COLS * (COL_W + GAP) - GAP;
const CORRIDOR_W = 50;
const SIDE_W = LEFT_WIDTH;
const TOTAL_W = LEFT_WIDTH + CORRIDOR_W + SIDE_W + GAP * 2;

interface BuiltBlock {
    defs: DockDefinition[];
    rooms: WarehouseRoom[];
    width: number;
    height: number;
}

/* ============================================================
 * FÁBRICA DO GALPÃO 1
 *
 * Layout replicado a partir da referência visual do galpão 1:
 * RUA 017 (topo) -> RUA 016 -> RUA 013 -> RUA 12..07 (docas
 * emparelhadas à direita) -> RUA 04/03 (com Estoque de Amostras
 * e RUA 02/06/05 na coluna direita) -> bloco "AQUI SÃO PALLETS"
 * (docas numeradas 01 a 43, em formato de escada) + área "INÍCIO".
 * ============================================================ */

function buildGalpao1Block(
    galpaoNum: number,
    codePrefix: string,
    docaPrefix: string,
    offsetX: number,
    offsetY: number,
    headerLabel: string
): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const LEFT_X = offsetX + MARGIN_X;
    const CORRIDOR_X = LEFT_X + LEFT_WIDTH + GAP;
    const SIDE_X = CORRIDOR_X + CORRIDOR_W + GAP;

    function cell(rua: string, x: number, y: number, w: number, h: number): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        return {
            code,
            type: "posicao",
            label: code,
            shortLabel: String(seq),
            galpao: galpaoNum,
            rua,
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 1,
            levels: default1Level(),
        };
    }

    function docaCell(num: number, x: number, y: number, w: number, h: number): DockDefinition {
        const numStr = String(num).padStart(2, "0");
        const code = `${docaPrefix}-${numStr}`;
        return {
            code,
            type: "doca",
            label: code,
            shortLabel: numStr,
            galpao: galpaoNum,
            rua: "RUA 001",
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 4,
            levels: default4Levels(),
        };
    }

    function row(rua: string, count: number, x: number, y: number, w = COL_W, h = COL_H): DockDefinition[] {
        return Array.from({ length: count }, (_, i) => cell(rua, x + i * (w + GAP), y, w, h));
    }

    function pairRow(rua: string, x: number, y: number, w = SIDE_W, h = COL_H): DockDefinition[] {
        const half = (w - GAP) / 2;
        return [cell(rua, x, y, half, h), cell(rua, x + half + GAP, y, half, h)];
    }

    function single(rua: string, x: number, y: number, w: number, h: number): DockDefinition {
        return cell(rua, x, y, w, h);
    }

    let cursorY = offsetY + 70;

    /* ---------- TOPO (RUA 017) ---------- */
    {
        const topCellW = (TOTAL_W - 7 * GAP) / 8;
        defs.push(...row("RUA 017", 8, LEFT_X, cursorY, topCellW, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-017`, x: LEFT_X, y: cursorY, width: TOTAL_W, height: BAND_H, label: "RUA 017", isStreet: true });
        cursorY += BAND_H + GAP;
    }

    const corridorTopY = cursorY;

    {
        // Linha curta (6 posições) + doca larga isolada à direita — igual à referência.
        defs.push(...row("RUA 017", 6, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 017", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 016 (grade de 7 colunas + 2 docas largas à direita) ---------- */
    {
        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-016`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: "RUA 016", isStreet: true });
        cursorY += BAND_H_SM + GAP;

        defs.push(...row("RUA 016", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 013 (grade de 7 colunas + doca larga e docas emparelhadas) ---------- */
    {
        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 013", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-013-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 013", isStreet: true });
        rooms.push({ id: `${codePrefix}-rua-013-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H, label: "RUA 013", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 013", SIDE_X, cursorY));
        cursorY += COL_H + GAP;

        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 013", SIDE_X, cursorY));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUAS 12 A 07 (docas emparelhadas à direita) ----------
     * Na referência: RUA 12 e RUA 07 têm 1 linha cada; RUA 11, 10, 09 e
     * 08 têm 2 linhas cada — por isso o array abaixo controla `rows`
     * por rua em vez de repetir sempre 2 linhas.
     */
    {
        const midStreets: { label: string; rows: number }[] = [
            { label: "RUA 12", rows: 1 },
            { label: "RUA 11", rows: 2 },
            { label: "RUA 10", rows: 2 },
            { label: "RUA 09", rows: 2 },
            { label: "RUA 08", rows: 2 },
            { label: "RUA 07", rows: 1 },
        ];

        for (const street of midStreets) {
            for (let r = 0; r < street.rows; r++) {
                defs.push(...row(street.label, 7, LEFT_X, cursorY, COL_W, COL_H));
                defs.push(...pairRow(street.label, SIDE_X, cursorY));
                cursorY += COL_H + GAP;
            }

            const slug = street.label.replace(/\s+/g, "-").toLowerCase();
            rooms.push({ id: `${codePrefix}-${slug}-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: street.label, isStreet: true });
            rooms.push({ id: `${codePrefix}-${slug}-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: street.label, isStreet: true });
            cursorY += BAND_H_SM + GAP;
        }
        cursorY += BLOCK_GAP - GAP;
    }

    /* ---------- RUA 04 / RUA 03 + coluna direita (Amostras / RUA 02, 06, 05) ---------- */
    {
        let ry = cursorY;

        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-04`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 04", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;
        defs.push(...row("RUA 04", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-03`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 03", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 03", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        // Coluna direita: Estoque de Amostras no topo, depois docas
        // emparelhadas sob as ruas 02 / 06 / 02 / 05 / 02 (nesta ordem
        // exata, igual à referência).
        const estoqueH = COL_H;
        const amostras = cell("ESTOQUE AMOSTRAS", SIDE_X, ry, SIDE_W, estoqueH);
        amostras.label = "ESTOQUE AMOSTRAS";
        amostras.shortLabel = "AMOSTRAS";
        defs.push(amostras);
        ry += estoqueH + GAP;

        const sideLabels = ["RUA 02", "RUA 06", "RUA 02", "RUA 05"];

        sideLabels.forEach((label, i) => {
            rooms.push({
                id: `${codePrefix}-side-${i}-${label.replace(/\s+/g, "-")}`,
                x: SIDE_X,
                y: ry,
                width: SIDE_W,
                height: BAND_H_SM,
                label,
                isStreet: true,
            });
            ry += BAND_H_SM + GAP;

            defs.push(...pairRow(label, SIDE_X, ry));
            ry += COL_H + GAP;
        });

        rooms.push({ id: `${codePrefix}-side-final-rua-02`, x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 02", isStreet: true });
        ry += BAND_H_SM + GAP;

        cursorY = Math.max(cursorY, ry) + BLOCK_GAP;
    }

    const corridorBottomY = cursorY;

    /* ---------- CORREDOR CENTRAL ---------- */
    rooms.push({
        id: `${codePrefix}-corredor-central`,
        x: CORRIDOR_X,
        y: corridorTopY,
        width: CORRIDOR_W,
        height: corridorBottomY - corridorTopY,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    /* ---------- BLOCO DE CAIXAS / DOCAS (01 A 43) — "AQUI SÃO PALLETS" ---------- */
    {
        const ITEM_W = (LEFT_WIDTH - 14 * GAP) / 15;
        const ITEM_H = 26;
        const STREET_SIZE = 35;

        const startX = LEFT_X;
        const startY = cursorY + 10;

        rooms.push({
            id: `${codePrefix}-doca-canto-vazio`,
            x: startX,
            y: startY,
            width: ITEM_W,
            height: ITEM_H,
            fill: "#1e293b",
            stroke: "#0f172a",
            label: "",
        });

        for (let num = 30; num <= 43; num++) {
            const i = num - 30;
            const x = startX + ITEM_W + GAP + i * (ITEM_W + GAP);
            defs.push(docaCell(num, x, startY, ITEM_W, ITEM_H));
        }

        for (let num = 29; num >= 21; num--) {
            const i = 29 - num;
            const y = startY + ITEM_H + GAP + i * (ITEM_H + GAP);
            defs.push(docaCell(num, startX, y, ITEM_W, ITEM_H));
        }

        const ruaHW = LEFT_WIDTH - (ITEM_W + GAP);
        rooms.push({
            id: `${codePrefix}-doca-rua-h`,
            x: startX + ITEM_W + GAP,
            y: startY + ITEM_H + GAP,
            width: ruaHW,
            height: STREET_SIZE,
            label: "RUA",
            isStreet: true,
        });

        const ruaVH = 9 * (ITEM_H + GAP) - GAP;
        rooms.push({
            id: `${codePrefix}-doca-rua-v`,
            x: startX + ITEM_W + GAP,
            y: startY + ITEM_H + GAP,
            width: STREET_SIZE,
            height: ruaVH,
            label: "RUA",
            vertical: true,
            isStreet: true,
        });

        const innerStartX = startX + ITEM_W + GAP + STREET_SIZE + GAP;
        const innerStartY = startY + ITEM_H + GAP + STREET_SIZE + GAP;

        const INNER_ITEM_W = (LEFT_WIDTH - (ITEM_W + 2 * GAP + STREET_SIZE) - 13 * GAP) / 14;

        for (let num = 14; num >= 1; num--) {
            const i = 14 - num;
            const x = innerStartX + i * (INNER_ITEM_W + GAP);
            defs.push(docaCell(num, x, innerStartY, INNER_ITEM_W, ITEM_H));
        }

        for (let num = 15; num <= 20; num++) {
            const i = num - 15;
            const y = innerStartY + (i + 1) * (ITEM_H + GAP);
            defs.push(docaCell(num, innerStartX, y, INNER_ITEM_W, ITEM_H));
        }

        const leftBottomY = startY + ITEM_H + GAP + 9 * (ITEM_H + GAP);

        cursorY = leftBottomY + 40;
    }

    const blockWidth = TOTAL_W + MARGIN_X * 2;
    const blockHeight = cursorY - offsetY;

    rooms.unshift({
        id: `${codePrefix}-header`,
        x: offsetX + 10,
        y: offsetY + 10,
        width: blockWidth - 20,
        height: 45,
        fill: "#1e293b",
        label: headerLabel,
    });
    rooms.unshift({
        id: `${codePrefix}-outline`,
        x: offsetX + 10,
        y: offsetY + 10,
        width: blockWidth - 20,
        height: blockHeight,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
    });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * FÁBRICA DO GALPÃO MEIO
 * ============================================================ */

function buildMeioBlock(offsetX: number, offsetY: number, codePrefix: string): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const startX = offsetX + MARGIN_X;
    let cursorY = offsetY + 70;

    function cell(rua: string, x: number, y: number, w: number, h: number, customShort?: string): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        return {
            code,
            type: "posicao",
            label: code,
            shortLabel: customShort || String(seq),
            galpao: 0,
            rua,
            x,
            y,
            width: w,
            height: h,
            defaultCapacity: 1,
            levels: default1Level(),
        };
    }

    const totalBlockW = TOTAL_W;
    const topColWidth = (totalBlockW - 3 * GAP) / 4;

    /* ---------- TOPO ---------- */
    for (let i = 0; i < 4; i++) {
        defs.push(cell("RUA 026", startX + i * (topColWidth + GAP), cursorY, topColWidth, 120, "01"));
    }
    cursorY += 120 + GAP;

    /* ---------- RUA 026 ---------- */
    rooms.push({ id: `${codePrefix}-rua-026`, x: startX, y: cursorY, width: totalBlockW, height: BAND_H, label: "RUA 026", isStreet: true });
    cursorY += BAND_H + GAP;

    const contentTopY = cursorY;
    const rowHeight = COL_H;

    const bottomColW = 130;
    const leftX = startX;
    const rightX = startX + totalBlockW - bottomColW;

    const centerGroupW = bottomColW * 2 + GAP;
    const centerX = startX + (totalBlockW - centerGroupW) / 2;

    const rowLabels = ["08", "09", "10", "11", "12", "13", "14", "14", "14", "14"];
    const totalRows = 10;

    for (let r = 0; r < totalRows; r++) {
        const lbl = rowLabels[r];
        const currentY = contentTopY + r * (rowHeight + GAP);

        if (r <= 5 || r === 7 || r === 9) {
            defs.push(cell("RUA 026", leftX, currentY, bottomColW, rowHeight, lbl));
        } else {
            rooms.push({ id: `${codePrefix}-gap-esq-${r}`, x: leftX, y: currentY, width: bottomColW, height: rowHeight, label: "", isStreet: true });
        }

        defs.push(cell("RUA 026", centerX, currentY, bottomColW, rowHeight, lbl));
        defs.push(cell("RUA 026", centerX + bottomColW + GAP, currentY, bottomColW, rowHeight, lbl));

        defs.push(cell("RUA 026", rightX, currentY, bottomColW, rowHeight, lbl));
    }

    const totalHeightDown = totalRows * (rowHeight + GAP) - GAP;

    rooms.push({
        id: `${codePrefix}-corredor-esq`, x: leftX + bottomColW, y: contentTopY, width: centerX - (leftX + bottomColW), height: totalHeightDown, label: "", isStreet: true,
    });

    rooms.push({
        id: `${codePrefix}-corredor-dir`, x: centerX + centerGroupW, y: contentTopY, width: rightX - (centerX + centerGroupW), height: totalHeightDown, label: "", isStreet: true,
    });

    cursorY = contentTopY + totalHeightDown + 20;

    const blockWidth = totalBlockW + MARGIN_X * 2;
    const blockHeight = cursorY - offsetY;

    rooms.unshift({ id: `${codePrefix}-header`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: 45, fill: "#1e293b", label: "GALPÃO MEIO" });
    rooms.unshift({ id: `${codePrefix}-outline`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: blockHeight, fill: "#f8fafc", stroke: "#e2e8f0" });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * FÁBRICA DO GALPÃO 2 (EXATAMENTE COMO NA IMAGEM EM ANEXO)
 * ============================================================ */

function buildGalpao2Block(
    galpaoNum: number,
    codePrefix: string,
    docaPrefix: string,
    offsetX: number,
    offsetY: number,
    headerLabel: string
): BuiltBlock {
    let seq = 0;
    const defs: DockDefinition[] = [];
    const rooms: WarehouseRoom[] = [];

    const startX = offsetX + MARGIN_X;
    let cursorY = offsetY + 70;

    function cell(rua: string, x: number, y: number, w: number, h: number, customShort?: string): DockDefinition {
        seq += 1;
        const code = `${codePrefix}${String(seq).padStart(3, "0")}`;
        return {
            code, type: "posicao", label: code, shortLabel: customShort || String(seq),
            galpao: galpaoNum, rua, x, y, width: w, height: h, defaultCapacity: 1, levels: default1Level(),
        };
    }

    const G2_GAP = 8;
    const baseColW = 92;

    // Dimensões exatas espelhando a estrutura do layout do Galpão 2 fornecido na imagem
    const LEFT_W = 4 * baseColW + 3 * G2_GAP;
    const RIGHT_W = 3 * baseColW + 2 * G2_GAP;
    const CORRIDOR_WIDTH = 65;
    const TOTAL_W = LEFT_W + CORRIDOR_WIDTH + RIGHT_W + G2_GAP * 2;
    const RIGHT_START_X = startX + LEFT_W + G2_GAP + CORRIDOR_WIDTH + G2_GAP;

    const TOP_H = 120;
    const ROW2_H = 100;
    const STREET_H = 35;
    const MID_H = 75;
    const THIN_H = 65;
    const LARGE_H = 110;

    const middleTopY = cursorY + TOP_H + G2_GAP + (STREET_H * 1.5) + G2_GAP + ROW2_H + G2_GAP;

    /* --- TOPO --- */
    const topW1 = (TOTAL_W - 7 * G2_GAP) / 8;
    const topLabels1 = ["08", "07", "06", "05", "04", "03", "02", "01"];
    for (let i = 0; i < 8; i++) {
        defs.push(cell("RUA 025", startX + i * (topW1 + G2_GAP), cursorY, topW1, TOP_H, topLabels1[i]));
    }
    cursorY += TOP_H + G2_GAP;

    rooms.push({ id: `${codePrefix}-rua-025`, x: startX, y: cursorY, width: TOTAL_W, height: STREET_H * 1.5, label: "RUA 025", isStreet: true });
    cursorY += (STREET_H * 1.5) + G2_GAP;

    const row2LeftLabels = ["07", "06", "05", "04"];
    for (let i = 0; i < 4; i++) {
        defs.push(cell("RUA 025", startX + i * (baseColW + G2_GAP), cursorY, baseColW, ROW2_H, row2LeftLabels[i]));
    }
    const row2RightLabels = ["03", "02", "01"];
    for (let i = 0; i < 3; i++) {
        defs.push(cell("RUA 025", RIGHT_START_X + i * (baseColW + G2_GAP), cursorY, baseColW, ROW2_H, row2RightLabels[i]));
    }

    let lY = middleTopY;
    let rY = middleTopY;

    /* --- MEIO ESQUERDA (Ruas 024 a 016) --- */
    const leftMidData = [
        { count: 1, streetName: "RUA 024" },
        { count: 2, streetName: "RUA 023" },
        { count: 2, streetName: "RUA 022" },
        { count: 2, streetName: "RUA 021" },
        { count: 2, streetName: "RUA 020" },
        { count: 1, streetName: "RUA 019" },
    ];
    for (const step of leftMidData) {
        for (let r = 0; r < step.count; r++) {
            for (let c = 0; c < 4; c++) {
                defs.push(cell(step.streetName, startX + c * (baseColW + G2_GAP), lY, baseColW, MID_H, "004"));
            }
            lY += MID_H + G2_GAP;
        }
        rooms.push({ id: `g2-lm-${step.streetName}`, x: startX, y: lY, width: LEFT_W, height: STREET_H, label: step.streetName, isStreet: true });
        lY += STREET_H + G2_GAP;
    }

    /* --- MEIO DIREITA (Ruas 024 a 017) --- */
    const rightMidData = [
        { count: 2, streetName: "RUA 024" },
        { count: 2, streetName: "RUA 023" },
        { count: 2, streetName: "RUA 022" },
        { count: 2, streetName: "RUA 021" },
        { count: 2, streetName: "RUA 020" },
        { count: 2, streetName: "RUA 019" },
        { count: 2, streetName: "RUA 018" },
        { count: 1, streetName: "RUA 017" },
    ];
    for (const step of rightMidData) {
        for (let r = 0; r < step.count; r++) {
            for (let c = 0; c < 3; c++) {
                defs.push(cell(step.streetName, RIGHT_START_X + c * (baseColW + G2_GAP), rY, baseColW, MID_H, "004"));
            }
            rY += MID_H + G2_GAP;
        }
        rooms.push({ id: `g2-rm-${step.streetName}`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height: STREET_H, label: step.streetName, isStreet: true });
        rY += STREET_H + G2_GAP;
    }

    /* --- BLOCO CENTRAL ESQUERDO (Ruas 016 até 001 - Estilo grade com 7 colunas) --- */
    const thinW = (LEFT_W - 6 * G2_GAP) / 7;

    function drawThin(count: number, assignedRua: string | null) {
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < 7; c++) {
                const lbl = (r === 0 && count === 2) ? String(7 - c).padStart(2, '0') : String(c + 8).padStart(2, '0');
                defs.push(cell(assignedRua || "RUA 001", startX + c * (thinW + G2_GAP), lY, thinW, THIN_H, lbl));
            }
            lY += THIN_H + G2_GAP;
        }
    }

    const leftLowerData = [
        { count: 2, streetName: "RUA 016" },
        { count: 2, streetName: "RUA 015" },
        { count: 2, streetName: "RUA 014" },
        { count: 2, streetName: "RUA 013" },
        { count: 1, gap: STREET_H },
        { count: 2, streetName: "RUA 008" },
        { count: 2, streetName: "RUA 007" },
        { count: 2, streetName: "RUA 006" },
        { count: 2, streetName: "RUA 005" },
        { count: 2, streetName: "RUA 004" },
        { count: 2, streetName: "RUA 003" },
        { count: 2, streetName: "RUA 002" },
        { count: 2, streetName: "RUA 001" },
    ];

    for (const step of leftLowerData) {
        if (step.gap) {
            lY += step.gap;
        } else {
            drawThin(step.count, step.streetName || null);
            if (step.streetName) {
                rooms.push({ id: `g2-ll-${step.streetName}`, x: startX, y: lY, width: LEFT_W, height: STREET_H, label: step.streetName, isStreet: true });
                lY += STREET_H + G2_GAP;
            }
        }
    }

    /* --- BLOCO INFERIOR DIREITO (Blocos Duplos Largos) --- */
    const largeW = (RIGHT_W - G2_GAP) / 2;

    function drawLarge(count: number, assignedRua: string) {
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < 2; c++) {
                defs.push(cell(assignedRua, RIGHT_START_X + c * (largeW + G2_GAP), rY, largeW, LARGE_H, "004"));
            }
            rY += LARGE_H + G2_GAP;
        }
    }

    drawLarge(1, "RUA 010");
    rY += STREET_H + G2_GAP;

    rooms.push({ id: `g2-rl-rua-010-1`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height: STREET_H, label: "RUA 010", isStreet: true });
    rY += STREET_H + G2_GAP;

    drawLarge(2, "RUA 010");
    rooms.push({ id: `g2-rl-rua-010-2`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height: STREET_H, label: "RUA 010", isStreet: true });
    rY += STREET_H + G2_GAP;

    drawLarge(2, "RUA 009");
    rooms.push({ id: `g2-rl-rua-009`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height: STREET_H, label: "RUA 009", isStreet: true });
    rY += STREET_H + G2_GAP;

    drawLarge(2, "RUA 007");
    rooms.push({ id: `g2-rl-rua-007`, x: RIGHT_START_X, y: rY, width: RIGHT_W, height: STREET_H, label: "RUA 007", isStreet: true });
    rY += STREET_H + G2_GAP;

    drawLarge(1, "RUA 007");

    /* --- CORREDOR CENTRAL --- */
    const maxY = Math.max(lY, rY);
    rooms.push({
        id: `${codePrefix}-corredor-central`,
        x: startX + LEFT_W + G2_GAP,
        y: middleTopY,
        width: CORRIDOR_WIDTH,
        height: maxY - middleTopY,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    const blockWidth = TOTAL_W + MARGIN_X * 2;
    const blockHeight = maxY - offsetY + 40;

    rooms.unshift({ id: `${codePrefix}-header`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: 45, fill: "#1e293b", label: headerLabel });
    rooms.unshift({ id: `${codePrefix}-outline`, x: offsetX + 10, y: offsetY + 10, width: blockWidth - 20, height: blockHeight, fill: "#f8fafc", stroke: "#e2e8f0" });

    return { defs, rooms, width: blockWidth, height: blockHeight };
}

/* ============================================================
 * MONTAGEM FINAL
 * ============================================================ */

const GALPAO_GAP = 60;

const galpao1Block = buildGalpao1Block(1, "G1-P", "DOCA", 0, 0, "GALPÃO 01 - ARMAZÉM PRINCIPAL");

const meioBlock = buildMeioBlock(
    galpao1Block.width + GALPAO_GAP,
    0,
    "GM-P"
);

const galpao2Block = buildGalpao2Block(
    2,
    "G2-P",
    "DOCA2",
    galpao1Block.width + GALPAO_GAP + meioBlock.width + GALPAO_GAP,
    0,
    "GALPÃO 02 - ARMAZÉM"
);

/* ============================================================
 * EXPORTAÇÕES OBRIGATÓRIAS
 * ============================================================ */

export const DOCK_DEFINITIONS: DockDefinition[] = [
    ...galpao1Block.defs,
    ...meioBlock.defs,
    ...galpao2Block.defs,
];

export const GALPAO_1_POSITIONS = galpao1Block.defs;
export const GALPAO_2_POSITIONS = galpao2Block.defs;
export const GALPAO_MEIO_POSITIONS = meioBlock.defs;

export function getDockDefinition(code: string): DockDefinition | undefined {
    return DOCK_DEFINITIONS.find((d) => d.code === code || d.shortLabel === code);
}

export const WAREHOUSE_ROOMS: WarehouseRoom[] = [
    ...galpao1Block.rooms,
    ...meioBlock.rooms,
    ...galpao2Block.rooms,
];

export const WAREHOUSE_VIEWBOX = {
    width: galpao1Block.width + GALPAO_GAP + meioBlock.width + GALPAO_GAP + galpao2Block.width,
    height: Math.max(galpao1Block.height, meioBlock.height, galpao2Block.height) + 40,
};

export const TOWEL_CATEGORY = "Toalha e lenços";

export const TOWEL_DOCK_CODES: string[] = DOCK_DEFINITIONS
    .filter((d) => d.type === "doca")
    .map((d) => d.code);

export const MERCHANDISE_DOCK_CODES: string[] = DOCK_DEFINITIONS
    .filter((d) => d.type === "posicao")
    .map((d) => d.code);

const ALL_DOCK_CODES: string[] = DOCK_DEFINITIONS.map((d) => d.code);

function normalizeCategory(value: string): string {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

const NORMALIZED_TOWEL_CATEGORY = normalizeCategory(TOWEL_CATEGORY);

export function getAllowedDockCodes(category: string): string[] {
    const isTowel = normalizeCategory(category) === NORMALIZED_TOWEL_CATEGORY;
    const codes = isTowel ? TOWEL_DOCK_CODES : MERCHANDISE_DOCK_CODES;
    return codes.length > 0 ? codes : ALL_DOCK_CODES;
}

export function isDockAllowedForCategory(dockCode: string, category: string): boolean {
    if (!dockCode) return true;
    return getAllowedDockCodes(category).includes(dockCode);
}