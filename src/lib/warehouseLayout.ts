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
 * HELPER DE NÍVEIS (1 NÍVEL P/ POSIÇÕES, 4 NÍVEIS P/ CAIXAS/DOCAS)
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
 * GRADE E DIMENSÕES DO GALPÃO
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
const LEFT_X = MARGIN_X;

const CORRIDOR_W = 50;
const CORRIDOR_X = LEFT_X + LEFT_WIDTH + GAP;

const SIDE_W = LEFT_WIDTH;
const SIDE_X = CORRIDOR_X + CORRIDOR_W + GAP;

const TOTAL_W = LEFT_WIDTH + CORRIDOR_W + SIDE_W + GAP * 2;

let g1SeqCounter = 0;

// Célula comum do galpão (1 NÍVEL APENAS)
function cell(
    rua: string,
    x: number,
    y: number,
    w: number,
    h: number
): DockDefinition {
    g1SeqCounter += 1;
    const code = `G1-P${String(g1SeqCounter).padStart(3, "0")}`;
    return {
        code,
        type: "posicao",
        label: code,
        shortLabel: String(g1SeqCounter),
        galpao: 1,
        rua,
        x,
        y,
        width: w,
        height: h,
        defaultCapacity: 1,
        levels: default1Level(),
    };
}

// Célula da entrada do galpão / Caixas (4 NÍVEIS E TAMANHO MENOR)
function docaCell(
    num: number,
    x: number,
    y: number,
    w: number,
    h: number
): DockDefinition {
    const numStr = String(num).padStart(2, "0");
    const code = `DOCA-${numStr}`;
    return {
        code,
        type: "doca",
        label: code,
        shortLabel: numStr,
        galpao: 1,
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

const g1: DockDefinition[] = [];
const g1Rooms: WarehouseRoom[] = [];

let cursorY = 70;

/* ---------- G6: RUA 017 & TOPO ---------- */
{
    const topCellW = (TOTAL_W - 7 * GAP) / 8;
    g1.push(...row("RUA 017", 8, LEFT_X, cursorY, topCellW, COL_H));
    cursorY += COL_H + GAP;

    g1Rooms.push({ id: "rua-017", x: LEFT_X, y: cursorY, width: TOTAL_W, height: BAND_H, label: "RUA 017", isStreet: true });
    cursorY += BAND_H + GAP;
}

// AJUSTE 1: Início do corredor central estendido até a base da RUA 017
const corridorTopY = cursorY;

{
    g1.push(...row("RUA 017", 6, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(single("RUA 017", SIDE_X, cursorY, SIDE_W, COL_H));
    cursorY += COL_H + BLOCK_GAP;
}

/* ---------- G5: RUA 016 / RUA 015 ---------- */
{
    const w6 = 6 * (COL_W + GAP) - GAP;

    g1.push(...row("RUA 016", 6, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, COL_H));
    cursorY += COL_H + GAP;

    g1Rooms.push({ id: "rua-016", x: LEFT_X, y: cursorY, width: w6, height: BAND_H_SM, label: "RUA 016", isStreet: true });
    g1.push(single("RUA 016", SIDE_X, cursorY, SIDE_W, BAND_H_SM));
    cursorY += BAND_H_SM + GAP;

    const rightStreetY = cursorY;

    g1.push(...row("RUA 016", 6, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;

    g1.push(...row("RUA 015", 6, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;

    g1Rooms.push({ id: "rua-015", x: LEFT_X, y: cursorY, width: w6, height: BAND_H_SM, label: "RUA 015", isStreet: true });
    cursorY += BAND_H_SM + GAP;

    const rightStreetH = cursorY - rightStreetY - GAP;
    g1Rooms.push({ id: "rua-direita-g5", x: SIDE_X, y: rightStreetY, width: SIDE_W, height: rightStreetH, label: "RUA", isStreet: true });

    g1.push(...row("RUA 015", 6, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(single("RUA 015", SIDE_X, cursorY, SIDE_W, COL_H));
    cursorY += COL_H + GAP;

    g1.push(single("RUA 015", SIDE_X, cursorY, SIDE_W, COL_H));
    cursorY += COL_H + BLOCK_GAP;
}

/* ---------- G4: RUA 013 ---------- */
{
    g1.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(single("RUA 013", SIDE_X, cursorY, SIDE_W, COL_H));
    cursorY += COL_H + GAP;

    g1Rooms.push({ id: "rua-013-l", x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 013", isStreet: true });
    g1Rooms.push({ id: "rua-013-r", x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H, label: "RUA 013", isStreet: true });
    cursorY += BAND_H + GAP;

    g1.push(...row("RUA 013", 7, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(...pairRow("RUA 013", SIDE_X, cursorY));
    cursorY += COL_H + BLOCK_GAP;
}

/* ---------- G3: RUAS 012 ATÉ 007 ---------- */
{
    g1.push(...row("RUA 012", 7, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(...pairRow("RUA 012", SIDE_X, cursorY));
    cursorY += COL_H + GAP;

    g1Rooms.push({ id: "rua-012-l", x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: "RUA 012", isStreet: true });
    g1Rooms.push({ id: "rua-012-r", x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: "RUA 012", isStreet: true });
    cursorY += BAND_H_SM + GAP;

    g1.push(...row("RUA 012", 7, LEFT_X, cursorY, COL_W, COL_H));
    g1.push(...pairRow("RUA 012", SIDE_X, cursorY));
    cursorY += COL_H + GAP;

    for (const rua of ["011", "010", "009", "008", "007"]) {
        const ruaLabel = `RUA ${rua}`;

        g1.push(...row(ruaLabel, 7, LEFT_X, cursorY, COL_W, COL_H));
        g1.push(...pairRow(ruaLabel, SIDE_X, cursorY));
        cursorY += COL_H + GAP;

        g1Rooms.push({ id: `rua-${rua}-l`, x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H_SM, label: ruaLabel, isStreet: true });
        g1Rooms.push({ id: `rua-${rua}-r`, x: SIDE_X, y: cursorY, width: SIDE_W, height: BAND_H_SM, label: ruaLabel, isStreet: true });
        cursorY += BAND_H_SM + GAP;

        g1.push(...row(ruaLabel, 7, LEFT_X, cursorY, COL_W, COL_H));
        g1.push(...pairRow(ruaLabel, SIDE_X, cursorY));
        cursorY += COL_H + GAP;
    }
    cursorY += BLOCK_GAP - GAP;
}

/* ---------- G2: RUA 004 & RUA 003 ---------- */
{
    let ry = cursorY;

    g1.push(...row("RUA 004", 7, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;

    g1.push(single("RUA 004", SIDE_X, ry, SIDE_W, COL_H));
    ry += COL_H + GAP;
    g1.push(single("RUA 004", SIDE_X, ry, SIDE_W, COL_H));
    ry += COL_H + GAP;
    g1.push(...pairRow("RUA 004", SIDE_X, ry));
    ry += COL_H + GAP;

    g1Rooms.push({ id: "rua-004-l", x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 004", isStreet: true });
    cursorY += BAND_H + GAP;

    g1Rooms.push({ id: "rua-006", x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 006", isStreet: true });
    ry += BAND_H_SM + GAP;

    g1.push(...row("RUA 004", 7, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;
    g1.push(...pairRow("RUA 004", SIDE_X, ry));
    ry += COL_H + GAP;

    g1.push(...row("RUA 003", 7, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;
    g1.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
    ry += COL_H + GAP;
    g1.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
    ry += COL_H + GAP;

    g1Rooms.push({ id: "rua-003-l", x: LEFT_X, y: cursorY, width: LEFT_WIDTH, height: BAND_H, label: "RUA 003", isStreet: true });
    cursorY += BAND_H + GAP;

    g1.push(...pairRow("RUA 003", SIDE_X, ry));
    ry += COL_H + GAP;
    g1Rooms.push({ id: "rua-005", x: SIDE_X, y: ry, width: SIDE_W, height: BAND_H_SM, label: "RUA 005", isStreet: true });
    ry += BAND_H_SM + GAP;

    g1.push(...row("RUA 003", 7, LEFT_X, cursorY, COL_W, COL_H));
    cursorY += COL_H + GAP;
    g1.push(...pairRow("RUA 003", SIDE_X, ry));
    ry += COL_H + GAP;
    g1.push(single("RUA 003", SIDE_X, ry, SIDE_W, COL_H));
    ry += COL_H + GAP;

    cursorY = Math.max(cursorY, ry) + BLOCK_GAP;
}

const corridorBottomY = cursorY;

/* ---------- CORREDOR CENTRAL ---------- */
g1Rooms.push({
    id: "corredor-central",
    x: CORRIDOR_X,
    y: corridorTopY,
    width: CORRIDOR_W,
    height: corridorBottomY - corridorTopY,
    label: "RUA",
    vertical: true,
    isStreet: true,
});

/* ---------- INÍCIO DO GALPÃO: CAIXAS / DOCAS (01 A 43) ---------- */
// AJUSTE 2: Larguras dinâmicas para caber 100% dentro de LEFT_WIDTH
{
    const ITEM_W = (LEFT_WIDTH - 14 * GAP) / 15; // 15 colunas contidas em LEFT_WIDTH
    const ITEM_H = 26;
    const STREET_SIZE = 35;

    const startX = LEFT_X;
    const startY = cursorY + 10;

    // 1. Canto cego sem caixa
    g1Rooms.push({
        id: "doca-canto-vazio",
        x: startX,
        y: startY,
        width: ITEM_W,
        height: ITEM_H,
        fill: "#1e293b",
        stroke: "#0f172a",
        label: "",
    });

    // 2. Linha Superior de Caixas (30 a 43)
    for (let num = 30; num <= 43; num++) {
        const i = num - 30;
        const x = startX + ITEM_W + GAP + i * (ITEM_W + GAP);
        g1.push(docaCell(num, x, startY, ITEM_W, ITEM_H));
    }

    // 3. Coluna da Esquerda (29 até 21 descendo)
    for (let num = 29; num >= 21; num--) {
        const i = 29 - num;
        const y = startY + ITEM_H + GAP + i * (ITEM_H + GAP);
        g1.push(docaCell(num, startX, y, ITEM_W, ITEM_H));
    }

    // 4. Rua Horizontal (Abaixo das caixas 30 a 43)
    const ruaHW = LEFT_WIDTH - (ITEM_W + GAP);
    g1Rooms.push({
        id: "doca-rua-h",
        x: startX + ITEM_W + GAP,
        y: startY + ITEM_H + GAP,
        width: ruaHW,
        height: STREET_SIZE,
        label: "RUA",
        isStreet: true,
    });

    // 5. Rua Vertical (À direita das caixas 29 a 21)
    const ruaVH = 9 * (ITEM_H + GAP) - GAP;
    g1Rooms.push({
        id: "doca-rua-v",
        x: startX + ITEM_W + GAP,
        y: startY + ITEM_H + GAP,
        width: STREET_SIZE,
        height: ruaVH,
        label: "RUA",
        vertical: true,
        isStreet: true,
    });

    // 6. Linha Interna de Caixas
    const innerStartX = startX + ITEM_W + GAP + STREET_SIZE + GAP;
    const innerStartY = startY + ITEM_H + GAP + STREET_SIZE + GAP;

    // Largura interna proporcional para 14 caixas ficarem contidas até o limite direito
    const INNER_ITEM_W = (LEFT_WIDTH - (ITEM_W + 2 * GAP + STREET_SIZE) - 13 * GAP) / 14;

    // Caixas Horizontais Internas (14 até 01)
    for (let num = 14; num >= 1; num--) {
        const i = 14 - num;
        const x = innerStartX + i * (INNER_ITEM_W + GAP);
        g1.push(docaCell(num, x, innerStartY, INNER_ITEM_W, ITEM_H));
    }

    // Caixas Verticais Internas (15 até 20)
    for (let num = 15; num <= 20; num++) {
        const i = num - 15;
        const y = innerStartY + (i + 1) * (ITEM_H + GAP);
        g1.push(docaCell(num, innerStartX, y, INNER_ITEM_W, ITEM_H));
    }

    const leftBottomY = startY + ITEM_H + GAP + 9 * (ITEM_H + GAP);
    cursorY = leftBottomY + 40;
}

/* ============================================================
 * EXPORTAÇÕES OBRIGATÓRIAS
 * ============================================================ */

export const DOCK_DEFINITIONS: DockDefinition[] = g1;
export const GALPAO_1_POSITIONS = DOCK_DEFINITIONS;

export function getDockDefinition(code: string): DockDefinition | undefined {
    return DOCK_DEFINITIONS.find((d) => d.code === code || d.shortLabel === code);
}

export const WAREHOUSE_ROOMS: WarehouseRoom[] = [
    {
        id: "g1-outline",
        x: 10,
        y: 10,
        width: TOTAL_W + MARGIN_X * 2 - 20,
        height: cursorY,
        fill: "#f8fafc",
        stroke: "#e2e8f0",
    },
    {
        id: "g1-header",
        x: 10,
        y: 10,
        width: TOTAL_W + MARGIN_X * 2 - 20,
        height: 45,
        fill: "#1e293b",
        label: "GALPÃO 01 - ARMAZÉM PRINCIPAL",
    },
    ...g1Rooms,
];

export const WAREHOUSE_VIEWBOX = {
    width: TOTAL_W + MARGIN_X * 2,
    height: cursorY + 40,
};

// Zona de mercadoria: as docas (tipo "doca", códigos DOCA-01 a DOCA-43 —
// o quadrado verde do mapa) são exclusivas para TOALHAS. As posições
// comuns (tipo "posicao", ex: G1-P001) são para as demais mercadorias.
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
    if (!dockCode) return true; // "sem localização" sempre é válido
    return getAllowedDockCodes(category).includes(dockCode);
}