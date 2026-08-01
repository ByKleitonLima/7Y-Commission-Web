import { supabase } from "@/lib/supabase";
import { DOCK_DEFINITIONS, DockDefinition } from "@/lib/warehouseLayout";
import { Product } from "@/components/productsTable";

const TABLE = "warehouse_docks";

export type DockStatus = "livre" | "ocupado" | "bloqueado";

export interface DockOccupancy extends DockDefinition {
    capacityMax: number;
    blocked: boolean;
    productCount: number;
    occupancyPercent: number;
    status: DockStatus;
    products: Product[];
    productColor: string | null;
}

export const DOCK_STATUS_COLORS: Record<DockStatus, string> = {
    livre: "#ffffff",
    ocupado: "#22c55e",
    bloqueado: "#ef4444",
};

export const DOCK_STATUS_LABELS: Record<DockStatus, string> = {
    livre: "Livre",
    ocupado: "Ocupado com carga",
    bloqueado: "Bloqueado",
};

interface DockMeta {
    capacityMax: number;
    blocked: boolean;
}

export async function fetchDockMeta(): Promise<Record<string, DockMeta>> {
    const meta: Record<string, DockMeta> = {};
    DOCK_DEFINITIONS.forEach((d) => {
        meta[d.code] = { capacityMax: d.defaultCapacity, blocked: false };
    });

    const { data, error } = await supabase.from(TABLE).select("*");

    if (error) {
        console.warn(
            "Aviso: não foi possível carregar status do galpão. Usando valores padrão. Verifique se a tabela 'warehouse_docks' existe."
        );
        return meta;
    }

    (data ?? []).forEach((row: any) => {
        const current = meta[row.code] ?? { capacityMax: 1, blocked: false };
        meta[row.code] = {
            capacityMax: row.capacity_max ?? current.capacityMax,
            blocked: Boolean(row.blocked),
        };
    });

    return meta;
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

export async function upsertDockBlocked(code: string, blocked: boolean) {
    const { error } = await supabase
        .from(TABLE)
        .upsert([{ code, blocked, updated_at: new Date().toISOString() }], { onConflict: "code" });

    if (error) {
        console.error("Erro ao atualizar bloqueio da posição:", error);
        throw error;
    }
}

function resolveStatus(productCount: number, blocked: boolean): DockStatus {
    if (blocked) return "bloqueado";
    return productCount > 0 ? "ocupado" : "livre";
}

export function buildDockOccupancy(
    products: Product[],
    meta: Record<string, DockMeta>
): DockOccupancy[] {
    return DOCK_DEFINITIONS.map((def) => {
        const dockProducts = products.filter((p) => (p as any).dock === def.code);
        const m = meta[def.code] ?? { capacityMax: def.defaultCapacity, blocked: false };
        const occupancyPercent =
            m.capacityMax > 0 ? Math.min(100, (dockProducts.length / m.capacityMax) * 100) : 0;

        // Cor definida no cadastro do produto, usada para pintar a doca no mapa.
        // Se houver mais de um produto na mesma doca com cores diferentes,
        // usa a cor do primeiro (o tooltip lista todos os produtos mesmo assim).
        const productColor = (dockProducts.find((p: any) => p.color)?.color as string) || null;

        return {
            ...def,
            capacityMax: m.capacityMax,
            blocked: m.blocked,
            productCount: dockProducts.length,
            occupancyPercent,
            status: resolveStatus(dockProducts.length, m.blocked),
            products: dockProducts,
            productColor,
        };
    });
}