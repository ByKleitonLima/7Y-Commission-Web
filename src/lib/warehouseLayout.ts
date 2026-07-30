export type PositionType = "doca" | "posicao";

export interface DockDefinition {
    code: string;
    type: PositionType;
    label: string;
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

export const WAREHOUSE_VIEWBOX = { width: 1700, height: 1050 };

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

const g1TopDocks = buildDockRow({
    galpao: 1,
    codePrefix: "G1-DOCA",
    labelPrefix: "Doca",
    count: 8,
    startX: 90,
    startY: 90,
    width: 68,
    height: 130,
    stepX: 76,
});

const g1RecebimentoDocks = buildDockRow({
    galpao: 1,
    codePrefix: "G1-REC",
    labelPrefix: "Doca Recebimento",
    count: 10,
    startX: 70,
    startY: 240,
    width: 62,
    height: 24,
    stepX: 68,
});

const G1_RUAS = [
    { rua: "RUA 603", rows: 4, cols: 8 },
    { rua: "RUA 672", rows: 3, cols: 8 },
    { rua: "RUA 615", rows: 3, cols: 8 },
    { rua: "RUA 692", rows: 4, cols: 8 },
];

let g1RuaY = 300;
const g1Ruas: DockDefinition[] = [];
for (const { rua, rows, cols } of G1_RUAS) {
    const grid = buildAisleGrid({
        galpao: 1,
        rua,
        codePrefix: `G1-${rua.replace(/\s+/g, "")}`,
        rows,
        cols,
        startX: 90,
        startY: g1RuaY,
        cellWidth: 38,
        cellHeight: 20,
        gapX: 4,
        gapY: 5,
    });
    g1Ruas.push(...grid);
    g1RuaY += rows * (20 + 5) + 22;
}

const g1Rua25 = buildAisleGrid({
    galpao: 1,
    rua: "RUA 25",
    codePrefix: "G1-RUA25",
    rows: 1,
    cols: 7,
    startX: 90,
    startY: 900,
    cellWidth: 62,
    cellHeight: 40,
    gapX: 6,
});

export const GALPAO_1_POSITIONS: DockDefinition[] = [
    ...g1TopDocks,
    ...g1RecebimentoDocks,
    ...g1Ruas,
    ...g1Rua25,
];

const g2TopDocks = buildDockRow({
    galpao: 2,
    codePrefix: "G2-DOCA",
    labelPrefix: "Doca",
    count: 12,
    startX: 950,
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
    startX: 950,
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
        startX: 950,
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
    startX: 950,
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
    { id: "g1-outline", x: 50, y: 70, width: 800, height: 920, fill: "#ffffff" },
    { id: "g2-outline", x: 900, y: 70, width: 800, height: 920, fill: "#ffffff" },
    { id: "patio-1", x: 860, y: 300, width: 30, height: 300, label: "Pátio Interno 1", fill: "#f3f4f6" },
    { id: "patio-2", x: 860, y: 620, width: 30, height: 260, label: "Pátio Interno 2", fill: "#f3f4f6" },
    { id: "juncao", x: 855, y: 260, width: 40, height: 40, label: "Junção", fill: "#e5e7eb" },
    { id: "caixa-dagua", x: 620, y: 300, width: 120, height: 260, label: "Caixa D'Água", fill: "#e0f2fe" },
    { id: "manutencao", x: 60, y: 460, width: 90, height: 200, label: "Manutenção", fill: "#ffffff" },
    { id: "recepcao", x: 60, y: 780, width: 90, height: 100, label: "Recepção", fill: "#ffffff" },
    { id: "amostras", x: 60, y: 300, width: 90, height: 140, label: "Estoque Amostras", fill: "#fefce8" },
    { id: "vestiario", x: 900, y: 250, width: 160, height: 40, label: "Vestiário", fill: "#ffffff" },
    { id: "lava-rapido", x: 1200, y: 500, width: 200, height: 140, label: "Lava Rápido", fill: "#e0f2fe" },
];

export const WAREHOUSE_WALLS: WallSegment[] = [
    { id: "g1-topo-interno", x1: 50, y1: 230, x2: 850, y2: 230, thick: true },
    { id: "g1-ruas-base", x1: 50, y1: 880, x2: 850, y2: 880, thick: true },
    { id: "g2-topo-interno", x1: 900, y1: 230, x2: 1700, y2: 230, thick: true },
    { id: "g2-ruas-base", x1: 900, y1: 880, x2: 1700, y2: 880, thick: true },
    { id: "divisor-central-topo", x1: 850, y1: 70, x2: 850, y2: 260, thick: true },
    { id: "divisor-central-base", x1: 850, y1: 620, x2: 850, y2: 990, thick: true },
];

export const WAREHOUSE_DOORS: DoorSymbol[] = [
    { id: "porta-g1-frente", x: 400, y: 70, width: 40, rotation: 0 },
    { id: "porta-g2-frente", x: 1300, y: 70, width: 40, rotation: 0 },
    { id: "porta-manutencao", x: 150, y: 460, width: 24, rotation: 90 },
    { id: "porta-recepcao", x: 150, y: 780, width: 24, rotation: 90 },
    { id: "porta-lava-rapido", x: 1200, y: 570, width: 24, rotation: 180 },
];

export const WAREHOUSE_IMPORT_COLUMN_HINTS = ["DOCA", "LOCALIZACAO", "LOCALIZAÇÃO", "LOCAL", "ENDERECO", "ENDEREÇO"];