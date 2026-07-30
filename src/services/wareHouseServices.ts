import { supabase } from "@/lib/supabase";
import { DOCK_DEFINITIONS, DockDefinition } from "@/lib/warehouseLayout";
import { Product } from "@/components/productsTable";

const TABLE = "warehouse_docks";

export type DockStatus = "vazia" | "baixa" | "media" | "alta";

export interface DockOccupancy extends DockDefinition {
    capacityMax: number;
    productCount: number;
    occupancyPercent: number;
    status: DockStatus;
    products: Product[];
}

export const DOCK_STATUS_COLORS: Record<DockStatus, string> = {
    vazia: "#9ca3af",
    baixa: "#10b981",
    media: "#f59e0b",
    alta: "#ef4444",
};

export const DOCK_STATUS_LABELS: Record<DockStatus, string> = {
    vazia: "Vazia",
    baixa: "Baixa ocupação",
    media: "Média ocupação",
    alta: "Alta ocupação",
};

export async function fetchDockCapacities(): Promise<Record<string, number>> {
    const capacities: Record<string, number> = {};
    DOCK_DEFINITIONS.forEach((d) => {
        capacities[d.code] = d.defaultCapacity;
    });

    const { data, error } = await supabase.from(TABLE).select("code, capacity_max");

    if (error) {
        console.warn(
        "Aviso: não foi possível carregar capacidades do galpão. Usando valores padrão. Verifique se a tabela 'warehouse_docks' existe."
        );
        return capacities;
    }

    (data ?? []).forEach((row: any) => {
        capacities[row.code] = row.capacity_max;
    });

    return capacities;
}

export async function upsertDockCapacity(code: string, capacityMax: number) {
    const { error } = await supabase
        .from(TABLE)
        .upsert([{ code, capacity_max: capacityMax, updated_at: new Date().toISOString() }], { onConflict: "code" });

    if (error) {
        console.error("Erro ao salvar capacidade da doca:", error);
        throw error;
    }
}

function resolveStatus(percent: number, productCount: number): DockStatus {
    if (productCount === 0) return "vazia";
    if (percent <= 30) return "baixa";
    if (percent <= 70) return "media";
    return "alta";
}

export function buildDockOccupancy(products: Product[], capacities: Record<string, number>): DockOccupancy[] {
    return DOCK_DEFINITIONS.map((def) => {
        const dockProducts = products.filter((p) => (p as any).dock === def.code);
        const capacityMax = capacities[def.code] ?? def.defaultCapacity;
        const occupancyPercent = capacityMax > 0 ? Math.min(100, (dockProducts.length / capacityMax) * 100) : 0;

        return {
        ...def,
        capacityMax,
        productCount: dockProducts.length,
        occupancyPercent,
        status: resolveStatus(occupancyPercent, dockProducts.length),
        products: dockProducts,
        };
    });
}