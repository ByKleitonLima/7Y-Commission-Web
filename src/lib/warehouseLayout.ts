export type PositionType = "doca" | "posicao";

export interface DockDefinition {
    code: string;
    type: PositionType;
    /** Texto completo (rua + número/descrição), usado em tooltips/buscas. */
    label: string;
    /** Texto curto exibido dentro da célula no mapa (ex: "07", "017", "004"). */
    shortLabel?: string;
    galpao: 1 | 2;
    rua?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    defaultCapacity: number;
}

export interface WallSegment {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thick?: boolean;
}

export interface DoorSymbol {
    id: string;
    x: number;
    y: number;
    width: number;
    rotation: number;
}

/* ============================================================
 * GALPÃO 1 — réplica do mapa de endereçamento (rua 017 até rua 001/doca)
 * A ordem e os números abaixo seguem exatamente a estrutura do
 * galpao_layout_figma.html enviado como referência.
 * ============================================================ */

const GAP = 6;
const COL_W = 46;
const COL_H = 40;
const MARGIN_X = 60;
const MAIN_WIDTH = 14 * (COL_W + GAP) - GAP; // largura de uma fileira de 14 posições
const SIDE_X = MARGIN_X + MAIN_WIDTH + 70; // coluna lateral (racks/estoque de amostras)
const SIDE_W = 170;
const SIDE_H = 50;
const BLOCK_GAP = 50;

let g1SeqCounter = 0;

function g1Cell(
    rua: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    type: PositionType = "posicao",
    capacity = 1
): DockDefinition {
    g1SeqCounter += 1;
    return {
        code: `G1-${g1SeqCounter}`,
        type,
        label: `${rua} ${text}`,
        shortLabel: text,
        galpao: 1,
        rua,
        x,
        y,
        width: w,
        height: h,
        defaultCapacity: capacity,
    };
}

function g1NumRow(rua: string, nums: number[], x: number, y: number, w = COL_W, h = COL_H): DockDefinition[] {
    return nums.map((n, i) => g1Cell(rua, x + i * (w + GAP), y, w, h, String(n).padStart(2, "0")));
}

function g1Pair(rua: string, values: [string, string], x: number, y: number, w = SIDE_W, h = SIDE_H): DockDefinition[] {
    const halfW = (w - GAP) / 2;
    return [
        g1Cell(rua, x, y, halfW, h, values[0]),
        g1Cell(rua, x + halfW + GAP, y, halfW, h, values[1]),
    ];
}

function g1Label(rua: string, x: number, y: number, w: number, h: number, text: string): DockDefinition {
    return g1Cell(rua, x, y, w, h, text);
}

const g1: DockDefinition[] = [];
let cursorY = 90;

// ---- Rua 017 ----
g1.push(...g1NumRow("RUA 017", [8, 7, 6, 5, 4, 3, 2, 1], MARGIN_X, cursorY));
cursorY += COL_H + 34;
g1.push(...g1NumRow("RUA 017", [7, 6, 5, 4, 3, 2, 1], MARGIN_X, cursorY));
g1.push(...g1Pair("RUA 017", ["017", "016"], SIDE_X, cursorY));
cursorY += COL_H + BLOCK_GAP;

// ---- Rua 016 / Rua 015 ----
g1.push(...g1NumRow("RUA 016", [8, 9, 10, 11, 12, 13, 14], MARGIN_X, cursorY));
g1.push(g1Label("RUA 015", SIDE_X, cursorY, SIDE_W, SIDE_H, "015"));
cursorY += COL_H + 34;
g1.push(...g1NumRow("RUA 016", [7, 6, 5, 4, 3, 2], MARGIN_X, cursorY));
cursorY += COL_H + 34;
g1.push(...g1NumRow("RUA 015", [8, 9, 10, 11, 12, 13], MARGIN_X, cursorY));
g1.push(g1Label("AMOSTRAS", SIDE_X, cursorY, SIDE_W, SIDE_H, "ESTOQUE AMOSTRAS"));
g1.push(g1Label("AMOSTRAS", SIDE_X, cursorY + SIDE_H + GAP, SIDE_W, SIDE_H, "04 (RUA 02)"));
cursorY += COL_H + BLOCK_GAP;

// ---- Rua 013 (+ estoque de amostras) ----
{
    const aY = cursorY;
    g1.push(...g1NumRow("RUA 013", [8, 9, 10, 11, 12, 13, 14], MARGIN_X, aY));
    const bY = aY + COL_H + 20;
    g1.push(...g1NumRow("RUA 013", [7, 6, 5, 4, 3, 2, 1], MARGIN_X, bY));
    const cY = bY + COL_H + GAP;
    g1.push(...g1NumRow("RUA 013", [8, 9, 10, 11, 12, 13, 14], MARGIN_X, cY));
    const dY = cY + COL_H + 20;
    g1.push(...g1NumRow("RUA 013", [7, 6, 5, 4, 3, 2, 1], MARGIN_X, dY));

    let sideY = aY;
    g1.push(g1Label("AMOSTRAS", SIDE_X, sideY, SIDE_W, SIDE_H, "ESTOQUE AMOSTRAS"));
    sideY += SIDE_H + GAP;
    g1.push(g1Label("AMOSTRAS", SIDE_X, sideY, SIDE_W, SIDE_H, "04 (RUA 02)"));
    sideY += SIDE_H + GAP;
    g1.push(...g1Pair("RUA 013", ["004", "004"], SIDE_X, sideY));
    sideY += SIDE_H + GAP;
    g1.push(...g1Pair("RUA 013", ["001", "002"], SIDE_X, sideY));
    sideY += SIDE_H + GAP;
    g1.push(g1Label("AMOSTRAS", SIDE_X, sideY, SIDE_W, SIDE_H, "03 (RUA 02)"));
    sideY += SIDE_H + GAP;
    g1.push(g1Label("AMOSTRAS", SIDE_X, sideY, SIDE_W, SIDE_H, "02 (RUA 02)"));
    sideY += SIDE_H + GAP;
    g1.push(...g1Pair("RUA 013", ["004", "003"], SIDE_X, sideY));
    sideY += SIDE_H + GAP;
    g1.push(...g1Pair("RUA 013", ["004", "004"], SIDE_X, sideY));
    sideY += SIDE_H + GAP;
    g1.push(g1Label("AMOSTRAS", SIDE_X, sideY, SIDE_W, SIDE_H, "04 (RUA 02)"));
    sideY += SIDE_H + GAP;

    cursorY = Math.max(dY + COL_H, sideY) + BLOCK_GAP;
}

// ---- Ruas 012, 011, 010, 009, 008, 007 (corredores duplos) ----
for (const rua of ["012", "011", "010", "009", "008", "007"]) {
    const rowY1 = cursorY;
    g1.push(...g1NumRow(`RUA ${rua}`, [7, 6, 5, 4, 3, 2, 1], MARGIN_X, rowY1));
    const rowY2 = rowY1 + COL_H + GAP;
    g1.push(...g1NumRow(`RUA ${rua}`, [8, 9, 10, 11, 12, 13, 14], MARGIN_X, rowY2));
    g1.push(...g1Pair(`RUA ${rua}`, ["004", "004"], SIDE_X, rowY1));
    g1.push(...g1Pair(`RUA ${rua}`, ["004", "004"], SIDE_X, rowY2));
    cursorY = rowY2 + COL_H + 30;
}

// ---- Rua 006 / 005 ----
{
    const aY = cursorY;
    g1.push(...g1NumRow("RUA 006", [7, 6, 5, 4, 3, 2, 1], MARGIN_X, aY));
    const bY = aY + COL_H + GAP;
    g1.push(...g1NumRow("RUA 006", [8, 9, 10, 11, 12, 13, 14], MARGIN_X, bY));
    g1.push(g1Label("AMOSTRAS", SIDE_X, aY, SIDE_W, SIDE_H, "ESTOQUE AMOSTRAS"));
    g1.push(g1Label("AMOSTRAS", SIDE_X, aY + SIDE_H + GAP, SIDE_W, SIDE_H, "04 (RUA 02)"));
    cursorY = bY + COL_H + 34;
    g1.push(...g1NumRow("RUA 005", [7, 6, 5, 4, 3, 2, 1], MARGIN_X, cursorY));
    cursorY += COL_H + BLOCK_GAP;
}

// ---- Rua 001 — Doca (grade em zigue-zague, igual ao script do HTML) ----
{
    const DOCK_COL1_W = 70;
    const DOCK_COL2_W = 70;
    const DOCK_CELL = 64;

    const colX = (idx: number) => {
        if (idx === 1) return MARGIN_X;
        if (idx === 2) return MARGIN_X + DOCK_COL1_W + GAP;
        return MARGIN_X + DOCK_COL1_W + GAP + DOCK_COL2_W + GAP + (idx - 3) * (DOCK_CELL + GAP);
    };
    const rowY = (row: number) => cursorY + (row - 1) * (DOCK_CELL + GAP);

    // linha 1: colunas 3–16 → valores 30..43
    for (let i = 0; i < 14; i++) {
        g1.push(g1Cell("RUA 001", colX(3 + i), rowY(1), DOCK_CELL, DOCK_CELL, String(30 + i), "doca", 10));
    }
    // coluna 1: linhas 2–10 → valores 29..21
    for (let i = 0; i < 9; i++) {
        g1.push(g1Cell("RUA 001", colX(1), rowY(2 + i), DOCK_COL1_W, DOCK_CELL, String(29 - i), "doca", 10));
    }
    // linha 4 (meio): colunas 3–16 → valores 14..01
    [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach((n, i) => {
        g1.push(g1Cell("RUA 001", colX(3 + i), rowY(4), DOCK_CELL, DOCK_CELL, String(n).padStart(2, "0"), "doca", 10));
    });
    // coluna 2: linhas 5–10 → valores 15..20
    for (let i = 0; i < 6; i++) {
        g1.push(g1Cell("RUA 001", colX(2), rowY(5 + i), DOCK_COL2_W, DOCK_CELL, String(15 + i), "doca", 10));
    }

    cursorY = rowY(10) + DOCK_CELL + 60;
}

export const GALPAO_1_POSITIONS: DockDefinition[] = g1;

const G1_CONTENT_HEIGHT = cursorY;
// margem esquerda + largura da doca (70+6+70+6+14*64+13*6) + margem direita
const G1_CONTENT_WIDTH = MARGIN_X + (70 + GAP + 70 + GAP + 14 * 64 + 13 * GAP) + 60;

/* ============================================================
 * GALPÃO 2 — mantém o layout anterior (abstrato), apenas
 * reposicionado ao lado do novo Galpão 1.
 * ============================================================ */

const G2_OFFSET_X = G1_CONTENT_WIDTH + 20 - 900;

function buildDockRow(opts: {
    galpao: 1 | 2;
    codePrefix: string;
    labelPrefix: string;
    count: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    stepX?: number;
}): DockDefinition[] {
    const { galpao, codePrefix, labelPrefix, count, startX, startY, width, height } = opts;
    const stepX = opts.stepX ?? width + 6;

    return Array.from({ length: count }).map((_, i) => {
        const number = String(i + 1).padStart(2, "0");
        return {
            code: `${codePrefix}-${number}`,
            type: "doca" as const,
            label: `${labelPrefix} ${number}`,
            shortLabel: number,
            galpao,
            x: startX + i * stepX,
            y: startY,
            width,
            height,
            defaultCapacity: 10,
        };
    });
}

function buildAisleGrid(opts: {
    galpao: 1 | 2;
    rua: string;
    codePrefix: string;
    rows: number;
    cols: number;
    startX: number;
    startY: number;
    cellWidth: number;
    cellHeight: number;
    gapX?: number;
    gapY?: number;
}): DockDefinition[] {
    const { galpao, rua, codePrefix, rows, cols, startX, startY, cellWidth, cellHeight } = opts;
    const gapX = opts.gapX ?? 4;
    const gapY = opts.gapY ?? 6;

    const positions: DockDefinition[] = [];
    let seqNumber = 1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const seq = String(seqNumber).padStart(3, "0");
            positions.push({
                code: `${codePrefix}-${seq}`,
                type: "posicao",
                label: `${rua} - ${seq}`,
                shortLabel: seq,
                galpao,
                rua,
                x: startX + col * (cellWidth + gapX),
                y: startY + row * (cellHeight + gapY),
                width: cellWidth,
                height: cellHeight,
                defaultCapacity: 1,
            });
            seqNumber++;
        }
    }

    return positions;
}

const g2TopDocks = buildDockRow({
    galpao: 2,
    codePrefix: "G2-DOCA",
    labelPrefix: "Doca",
    count: 12,
    startX: 950 + G2_OFFSET_X,
    startY: 90,
    width: 54,
    height: 130,
    stepX: 60,
});

const g2RecebimentoDocks = buildDockRow({
    galpao: 2,
    codePrefix: "G2-REC",
    labelPrefix: "Doca Recebimento",
    count: 10,
    startX: 950 + G2_OFFSET_X,
    startY: 240,
    width: 62,
    height: 24,
    stepX: 68,
});

const G2_RUAS = [
    { rua: "RUA D", rows: 3, cols: 8 },
    { rua: "RUA 670", rows: 4, cols: 8 },
    { rua: "RUA 620", rows: 4, cols: 8 },
    { rua: "RUA 500", rows: 3, cols: 8 },
];

let g2RuaY = 300;
const g2Ruas: DockDefinition[] = [];
for (const { rua, rows, cols } of G2_RUAS) {
    const grid = buildAisleGrid({
        galpao: 2,
        rua,
        codePrefix: `G2-${rua.replace(/\s+/g, "")}`,
        rows,
        cols,
        startX: 950 + G2_OFFSET_X,
        startY: g2RuaY,
        cellWidth: 38,
        cellHeight: 20,
        gapX: 4,
        gapY: 5,
    });
    g2Ruas.push(...grid);
    g2RuaY += rows * (20 + 5) + 22;
}

const g2Rua027 = buildAisleGrid({
    galpao: 2,
    rua: "RUA 027",
    codePrefix: "G2-RUA027",
    rows: 1,
    cols: 7,
    startX: 950 + G2_OFFSET_X,
    startY: 900,
    cellWidth: 62,
    cellHeight: 40,
    gapX: 6,
});

export const GALPAO_2_POSITIONS: DockDefinition[] = [
    ...g2TopDocks,
    ...g2RecebimentoDocks,
    ...g2Ruas,
    ...g2Rua027,
];

export const DOCK_DEFINITIONS: DockDefinition[] = [...GALPAO_1_POSITIONS, ...GALPAO_2_POSITIONS];

export const DOCK_CODES = DOCK_DEFINITIONS.map((d) => d.code);

export function getDockDefinition(code: string): DockDefinition | undefined {
    return DOCK_DEFINITIONS.find((d) => d.code === code);
}

export interface WarehouseRoom {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
    fill?: string;
}

export const WAREHOUSE_ROOMS: WarehouseRoom[] = [
    {
        id: "g1-outline",
        x: 20,
        y: 60,
        width: G1_CONTENT_WIDTH,
        height: G1_CONTENT_HEIGHT + 40,
        fill: "#ffffff",
    },
    {
        id: "g2-outline",
        x: 900 + G2_OFFSET_X - 50,
        y: 70,
        width: 800,
        height: 920,
        fill: "#ffffff",
    },
    {
        id: "vestiario",
        x: 950 + G2_OFFSET_X,
        y: 250,
        width: 160,
        height: 40,
        label: "Vestiário",
        fill: "#ffffff",
    },
    {
        id: "lava-rapido",
        x: 1200 + G2_OFFSET_X,
        y: 500,
        width: 200,
        height: 140,
        label: "Lava Rápido",
        fill: "#e0f2fe",
    },
];

export const WAREHOUSE_WALLS: WallSegment[] = [
    {
        id: "divisor-g1-g2",
        x1: G1_CONTENT_WIDTH + 10,
        y1: 60,
        x2: G1_CONTENT_WIDTH + 10,
        y2: G1_CONTENT_HEIGHT + 100,
        thick: true,
    },
];

export const WAREHOUSE_DOORS: DoorSymbol[] = [
    { id: "porta-g1-frente", x: MARGIN_X + 300, y: 70, width: 40, rotation: 0 },
    { id: "porta-g2-frente", x: 1300 + G2_OFFSET_X, y: 70, width: 40, rotation: 0 },
];

export const WAREHOUSE_VIEWBOX = {
    width: 1700 + G2_OFFSET_X + 60,
    height: Math.max(G1_CONTENT_HEIGHT, 990) + 60,
};

export const WAREHOUSE_IMPORT_COLUMN_HINTS = ["DOCA", "LOCALIZACAO", "LOCALIZAÇÃO", "LOCAL", "ENDERECO", "ENDEREÇO"];