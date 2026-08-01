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
        defs.push(...row("RUA 017", 6, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 017", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 016 / RUA 015 ---------- */
    {
        const w6 = 6 * (COL_W + GAP) - GAP;

        defs.push(...row("RUA 016", 6, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-016`, x: LEFT_X, y: cursorY, width: w6, height: BAND_H_SM, label: "RUA 016", isStreet: true });
        defs.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, BAND_H_SM));
        cursorY += BAND_H_SM + GAP;

        const rightStreetY = cursorY;

        defs.push(...row("RUA 016", 6, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        defs.push(...row("RUA 015", 6, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-015`, x: LEFT_X, y: cursorY, width: w6, height: BAND_H_SM, label: "RUA 015", isStreet: true });
        cursorY += BAND_H_SM + GAP;

        const rightStreetH = cursorY - rightStreetY - GAP;
        rooms.push({ id: `${codePrefix}-rua-direita-g5`, x: SIDE_X, y: rightStreetY, width: SIDE_W, height: rightStreetH, label: "RUA", isStreet: true });

        defs.push(...row("RUA 015", 6, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 015", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        defs.push(single("RUA 015", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUA 013 ---------- */
    {
        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(single("RUA 013", SIDE_X, cursorY, SIDE_W, COL_H));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-013-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 013", isStreet: true });
        rooms.push({ id: `${codePrefix}-rua-013-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H, label: "RUA 013", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 013", SIDE_X, cursorY));
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- RUAS 012 ATÉ 007 ---------- */
    {
        defs.push(...row("RUA 012", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 012", SIDE_X, cursorY));
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-012-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: "RUA 012", isStreet: true });
        rooms.push({ id: `${codePrefix}-rua-012-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: "RUA 012", isStreet: true });
        cursorY += BAND_H_SM + GAP;

        defs.push(...row("RUA 012", 7, LEFT_X, cursorY, COL_W, COL_H));
        defs.push(...pairRow("RUA 012", SIDE_X, cursorY));
        cursorY += COL_H + GAP;

        for (const rua of ["011", "010", "009", "008", "007"]) {
            const ruaLabel = `RUA ${rua}`;

            defs.push(...row(ruaLabel, 7, LEFT_X, cursorY, COL_W, COL_H));
            defs.push(...pairRow(ruaLabel, SIDE_X, cursorY));
            cursorY += COL_H + GAP;

            rooms.push({ id: `${codePrefix}-rua-${rua}-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: ruaLabel, isStreet: true });
            rooms.push({ id: `${codePrefix}-rua-${rua}-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: ruaLabel, isStreet: true });
            cursorY += BAND_H_SM + GAP;

            defs.push(...row(ruaLabel, 7, LEFT_X, cursorY, COL_W, COL_H));
            defs.push(...pairRow(ruaLabel, SIDE_X, cursorY));
            cursorY += COL_H + GAP;
        }
        cursorY += BLOCK_GAP - GAP;
    }

    /* ---------- RUA 004 & RUA 003 ---------- */
    {
        let ry = cursorY;

        defs.push(...row("RUA 004", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;

        defs.push(single("RUA 004", SIDE_X, ry, SIDE_W, COL_H));
        ry += COL_H + GAP;
        defs.push(single("RUA 004", SIDE_X, ry, SIDE_W, COL_H));
        ry += COL_H + GAP;
        defs.push(...pairRow("RUA 004", SIDE_X, ry));
        ry += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-004-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 004", isStreet: true });
        cursorY += BAND_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-006`, x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 006", isStreet: true });
        ry += BAND_H_SM + GAP;

        defs.push(...row("RUA 004", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;
        defs.push(...pairRow("RUA 004", SIDE_X, ry));
        ry += COL_H + GAP;

        defs.push(...row("RUA 003", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;
        defs.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
        ry += COL_H + GAP;
        defs.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
        ry += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-003-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 003", isStreet: true });
        cursorY += BAND_H + GAP;

        defs.push(...pairRow("RUA 003", SIDE_X, ry));
        ry += COL_H + GAP;
        rooms.push({ id: `${codePrefix}-rua-005`, x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 005", isStreet: true });
        ry += BAND_H_SM + GAP;

        defs.push(...row("RUA 003", 7, LEFT_X, cursorY, COL_W, COL_H));
        cursorY += COL_H + GAP;
        defs.push(...pairRow("RUA 003", SIDE_X, ry));
        ry += COL_H + GAP;
        defs.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
        ry += COL_H + GAP;

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

    /* ---------- BLOCO DE CAIXAS / DOCAS (01 A 43) ---------- */
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

    const MEIO_COLS = 4;
    const MEIO_W = MEIO_COLS * (COL_W + GAP) - GAP;

    /* ---------- TOPO: 4 posições grandes (rótulo "01") ---------- */
    for (let i = 0; i < MEIO_COLS; i++) {
        defs.push(cell("RUA 026", startX + i * (COL_W + GAP), cursorY, COL_W, 120, "01"));
    }
    cursorY += 120 + GAP;

    /* ---------- RUA 026 ---------- */
    rooms.push({ id: `${codePrefix}-rua-026`, x: startX, y: cursorY, width: MEIO_W, height: BAND_H, label: "RUA 026", isStreet: true });
    cursorY += BAND_H + GAP;

    /* ---------- ESTRUTURA DE LINHAS EXATA ---------- */
    const colTopY = cursorY;
    const leftX = startX;
    const midX = startX + COL_W + GAP;
    const midW = COL_W * 2 + GAP;
    const rightX = midX + midW + GAP;

    const rowLabels = ["08", "09", "10", "11", "12", "13", "14", "14", "14"];
    const rowHeight = COL_H;

    for (let i = 0; i < rowLabels.length; i++) {
        const y = colTopY + i * (rowHeight + 2);
        const lbl = rowLabels[i];

        if (i !== 7) {
            defs.push(cell("RUA 026", leftX, y, COL_W, rowHeight, lbl));
        }

        defs.push(cell("RUA 026", midX, y, COL_W, rowHeight, lbl));
        defs.push(cell("RUA 026", midX + COL_W, y, COL_W, rowHeight, lbl));
        defs.push(cell("RUA 026", rightX, y, COL_W, rowHeight, lbl));
    }

    const totalRowsHeight = rowLabels.length * (rowHeight + 2);

    rooms.push({
        id: `${codePrefix}-rua-meio`,
        x: midX + midW / 2 - 2,
        y: colTopY,
        width: 4,
        height: totalRowsHeight,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    cursorY = colTopY + totalRowsHeight + 40;

    const blockWidth = MEIO_W + MARGIN_X * 2;
    const blockHeight = cursorY - offsetY;

    rooms.unshift({
        id: `${codePrefix}-header`,
        x: offsetX + 10,
        y: offsetY + 10,
        width: blockWidth - 20,
        height: 45,
        fill: "#1e293b",
        label: "GALPÃO MEIO",
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
 * FÁBRICA DO GALPÃO 2 (FIDELIDADE EXATA AO LAYOUT SOLICITADO)
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
            code,
            type: "posicao",
            label: code,
            shortLabel: customShort || String(seq),
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

    const COL_COUNT = 8;
    const BLOCK_W = COL_COUNT * (COL_W + GAP) - GAP;
    const HALF_W = (BLOCK_W - GAP) / 2;
    const CORRIDOR_WIDTH = 45;
    const LEFT_SIDE_W = BLOCK_W * 0.58;
    const RIGHT_SIDE_W = BLOCK_W - LEFT_SIDE_W - CORRIDOR_WIDTH;
    const RIGHT_SIDE_X = startX + LEFT_SIDE_W + CORRIDOR_WIDTH;

    /* ---------- 1. TOPO DO GALPÃO 2 (G3_2.png) ---------- */
    {
        const topLabels = ["08", "07", "06", "05", "04", "03", "02", "01"];
        const topCellW = (BLOCK_W - (COL_COUNT - 1) * GAP) / COL_COUNT;

        for (let i = 0; i < COL_COUNT; i++) {
            defs.push(cell("RUA 025", startX + i * (topCellW + GAP), cursorY, topCellW, COL_H, topLabels[i]));
        }
        cursorY += COL_H + GAP;

        rooms.push({ id: `${codePrefix}-rua-025`, x: startX, y: cursorY, width: BLOCK_W, height: BAND_H, label: "RUA 025", isStreet: true });
        cursorY += BAND_H + GAP;

        // Sub-topo: Esquerda (07 a 04 - 4 colunas), Direita (03 a 01 - 3 colunas) com vão central correspondente ao corte da rua
        const subCellW = (BLOCK_W - 6 * GAP) / 7;
        let currentX = startX;
        const bottomTopLabels = ["07", "06", "05", "04", "03", "02", "01"];
        for (let i = 0; i < bottomTopLabels.length; i++) {
            if (i === 4) {
                currentX += subCellW + GAP;
            }
            defs.push(cell("RUA 025", currentX, cursorY, subCellW, COL_H, bottomTopLabels[i]));
            currentX += subCellW + GAP;
        }
        cursorY += COL_H + BLOCK_GAP;
    }

    /* ---------- 2. SEÇÃO DUPLA (ESQUERDA: "004" / DIREITA: "004" COM CORREDOR VERTICAL) ---------- */
    const upperSections = [
        { name: "RUA 024", pairs: 2 },
        { name: "RUA 023", pairs: 2 },
        { name: "RUA 022", pairs: 2 },
        { name: "RUA 021", pairs: 2 },
        { name: "RUA 020", pairs: 2 },
        { name: "RUA 019", pairs: 1 },
        { name: "RUA 018", pairs: 1 },
        { name: "RUA 017", pairs: 1 },
    ];

    for (const sec of upperSections) {
        const leftColW = (LEFT_SIDE_W - GAP) / 2;
        const rightColW = (RIGHT_SIDE_W - GAP) / 2;

        for (let p = 0; p < sec.pairs; p++) {
            // Lado esquerdo (2 blocos "004")
            for (let i = 0; i < 2; i++) {
                defs.push(cell(sec.name, startX + i * (leftColW + GAP), cursorY, leftColW, COL_H, "004"));
            }
            // Lado direito (2 blocos "004")
            for (let i = 0; i < 2; i++) {
                defs.push(cell(sec.name, RIGHT_SIDE_X + i * (rightColW + GAP), cursorY, rightColW, COL_H, "004"));
            }
            cursorY += COL_H + GAP;
        }

        rooms.push({
            id: `${codePrefix}-${sec.name.toLowerCase().replace(" ", "-")}`,
            x: startX,
            y: cursorY,
            width: BLOCK_W,
            height: BAND_H_SM,
            label: sec.name,
            isStreet: true,
        });
        cursorY += BAND_H_SM + GAP;
    }

    /* ---------- 3. SEÇÃO DE RUAS NUMÉRICAS (RUA 016 ATÉ RUA 013) (GP2_2.png) ---------- */
    const numericSections = ["RUA 016", "RUA 015", "RUA 014", "RUA 013"];

    for (const ruaName of numericSections) {
        const subWidth = (BLOCK_W - 13 * GAP) / 14;
        for (let p = 0; p < 2; p++) {
            for (let i = 0; i < 14; i++) {
                const shortLbl = i < 7 ? String(7 - i) : String(i - 6 + 7);
                defs.push(cell(ruaName, startX + i * (subWidth + GAP), cursorY, subWidth, COL_H, shortLbl));
            }
            cursorY += COL_H + GAP;
        }

        rooms.push({
            id: `${codePrefix}-${ruaName.toLowerCase().replace(" ", "-")}`,
            x: startX,
            y: cursorY,
            width: BLOCK_W,
            height: BAND_H_SM,
            label: ruaName,
            isStreet: true,
        });
        cursorY += BAND_H_SM + GAP;
    }

    /* ---------- 4. SEÇÃO INFERIOR ESPECÍFICA (GP1_2.png) ---------- */
    // Bloco Superior com RUA 010 (Esquerda: grid numérico padrão 07-01 / 08-14 | Direita: blocos 004)
    {
        // Esquerda: Padrão numérico duplo (RUA 008 / RUA 007)
        const subWidth = (LEFT_WIDTH - 13 * GAP) / 14;
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < 14; i++) {
                const shortLbl = i < 7 ? String(7 - i) : String(i - 6 + 7);
                defs.push(cell(r === 0 ? "RUA 008" : "RUA 007", startX + i * (subWidth + GAP), cursorY + r * (COL_H + GAP), subWidth, COL_H, shortLbl));
            }
        }
        // Direita: 2 blocos "004" superiores e rua RUA 010
        const rightColW = (RIGHT_SIDE_W - GAP) / 2;
        for (let i = 0; i < 2; i++) {
            defs.push(cell("RUA 010", RIGHT_SIDE_X + i * (rightColW + GAP), cursorY, rightColW, COL_H * 2 + GAP, "004"));
        }

        cursorY += (COL_H * 2 + GAP) + GAP;

        rooms.push({
            id: `${codePrefix}-rua-010-top`,
            x: startX,
            y: cursorY,
            width: BLOCK_W,
            height: BAND_H_SM,
            label: "RUA 010",
            isStreet: true,
        });
        cursorY += BAND_H_SM + GAP;
    }

    // Blocos inferiores repetidos (RUA 006 a RUA 001 à esquerda, e zigue-zague RUA 010, RUA 009, RUA 007 à direita)
    const lowerConfigs = [
        { leftRua: "RUA 006", rightRua: "RUA 010" },
        { leftRua: "RUA 005", rightRua: "RUA 010" },
        { leftRua: "RUA 004", rightRua: "RUA 009" },
        { leftRua: "RUA 003", rightRua: "RUA 009" },
        { leftRua: "RUA 002", rightRua: "RUA 007" },
        { leftRua: "RUA 001", rightRua: "RUA 007" },
    ];

    for (const cfg of lowerConfigs) {
        // Esquerda: Grid numérico padrão
        const subWidth = (LEFT_WIDTH - 13 * GAP) / 14;
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < 14; i++) {
                const shortLbl = i < 7 ? String(7 - i) : String(i - 6 + 7);
                defs.push(cell(cfg.leftRua, startX + i * (subWidth + GAP), cursorY + r * (COL_H + GAP), subWidth, COL_H, shortLbl));
            }
        }

        // Direita: 2 blocos "004"
        const rightColW = (RIGHT_SIDE_W - GAP) / 2;
        for (let r = 0; r < 2; r++) {
            for (let i = 0; i < 2; i++) {
                defs.push(cell(cfg.rightRua, RIGHT_SIDE_X + i * (rightColW + GAP), cursorY + r * (COL_H + GAP), rightColW, COL_H, "004"));
            }
        }

        cursorY += (COL_H * 2 + GAP) + GAP;

        rooms.push({
            id: `${codePrefix}-${cfg.leftRua.toLowerCase().replace(" ", "-")}`,
            x: startX,
            y: cursorY,
            width: BLOCK_W,
            height: BAND_H_SM,
            label: cfg.leftRua,
            isStreet: true,
        });
        cursorY += BAND_H_SM + GAP;
    }

    // Rodapé final esquerdo (RUA 001 linha inferior extra conforme GP1_2)
    {
        const subWidth = (LEFT_WIDTH - 13 * GAP) / 14;
        for (let i = 0; i < 14; i++) {
            const shortLbl = i < 7 ? String(7 - i) : String(i - 6 + 7);
            defs.push(cell("RUA 001", startX + i * (subWidth + GAP), cursorY, subWidth, COL_H, shortLbl));
        }
        cursorY += COL_H + BLOCK_GAP;
    }

    const blockWidth = BLOCK_W + MARGIN_X * 2;
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

export function getAllowedDockCodes(category: string): string[] {
    return category === TOWEL_CATEGORY ? TOWEL_DOCK_CODES : MERCHANDISE_DOCK_CODES;
}

export function isDockAllowedForCategory(dockCode: string, category: string): boolean {
    if (!dockCode) return true;
    return getAllowedDockCodes(category).includes(dockCode);
}