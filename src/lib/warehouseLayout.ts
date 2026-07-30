export type DockType = "doca" | "expedicao";

export interface DockDefinition {
    code: string;
    type: DockType;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    defaultCapacity: number;
}

export const WAREHOUSE_VIEWBOX = { width: 1472, height: 705 };

const DOCA_COUNT = 8;
const DOCA_START_Y = 283;
const DOCA_STEP = 20;
const DOCA_X = 48;
const DOCA_WIDTH = 74;
const DOCA_HEIGHT = 18;

const EXP_COUNT = 6;
const EXP_START_X = 900;
const EXP_STEP = 42;
const EXP_Y = 545;
const EXP_WIDTH = 35;
const EXP_HEIGHT = 90;

function buildDocas(): DockDefinition[] {
    return Array.from({ length: DOCA_COUNT }).map((_, i) => {
        const number = String(i + 1).padStart(3, "0");
        return {
        code: `DOCA-${number}`,
        type: "doca",
        label: `Doca ${number}`,
        x: DOCA_X,
        y: DOCA_START_Y + i * DOCA_STEP,
        width: DOCA_WIDTH,
        height: DOCA_HEIGHT,
        defaultCapacity: 10,
        };
    });
}

function buildExpedicao(): DockDefinition[] {
    return Array.from({ length: EXP_COUNT }).map((_, i) => {
        const number = String(i + 1).padStart(3, "0");
        return {
        code: `EXP-${number}`,
        type: "expedicao",
        label: `Expedição ${number}`,
        x: EXP_START_X + i * EXP_STEP,
        y: EXP_Y,
        width: EXP_WIDTH,
        height: EXP_HEIGHT,
        defaultCapacity: 8,
        };
    });
}

export const DOCK_DEFINITIONS: DockDefinition[] = [...buildDocas(), ...buildExpedicao()];

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
    { id: "outline", x: 70, y: 75, width: 1350, height: 560, fill: "#e5e7eb" },
    { id: "top-left", x: 70, y: 75, width: 320, height: 185, fill: "#ffffff" },
    { id: "bottom-left", x: 70, y: 440, width: 320, height: 195, fill: "#ffffff" },
    { id: "galpao-1", x: 390, y: 75, width: 345, height: 380, label: "GALPÃO 001", fill: "#ffffff" },
    { id: "galpao-2", x: 735, y: 75, width: 370, height: 560, label: "GALPÃO 002", fill: "#ffffff" },
    { id: "top-right", x: 1105, y: 75, width: 315, height: 185, fill: "#ffffff" },
    { id: "bottom-right", x: 1155, y: 440, width: 265, height: 195, fill: "#ffffff" },
];

export const WAREHOUSE_IMPORT_COLUMN_HINTS = ["DOCA", "LOCALIZACAO", "LOCALIZAÇÃO", "LOCAL", "ENDERECO", "ENDEREÇO"];