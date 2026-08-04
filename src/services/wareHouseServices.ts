import { supabase } from "@/lib/supabase";
import { DOCK_DEFINITIONS, DockDefinition, DockLevel } from "@/lib/warehouseLayout";
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

// Um produto "ocupa" uma doca/posição se o campo solto `dock` do produto
// bate com o código da doca OU se algum item de `sizes` (tamanho/pallet)
// está alocado nela. É dentro de `sizes` que o nível de verdade fica
// guardado (a coluna `level` não existe na tabela `products`), então
// olhamos lá primeiro.
function productOccupiesDock(product: any, dockCode: string): boolean {
    if (product.dock === dockCode) return true;
    return (product.sizes || []).some((s: any) => s.dock === dockCode);
}

// Descobre em qual nível o produto está alocado NESTA doca específica.
// Prioriza o nível salvo no `size` cujo dock bate com a doca (é ali que o
// nível de verdade fica); só cai pro campo solto `product.level` como
// fallback de compatibilidade com dados antigos/manuais.
function resolveLevelForDock(product: any, dockCode: string): number {
    const matchingSize = (product.sizes || []).find((s: any) => s.dock === dockCode);
    if (matchingSize?.level) return Number(matchingSize.level) || 1;
    return Number(product.level) || 1;
}

export function buildDockOccupancy(
    products: Product[],
    meta: Record<string, DockMeta>
): DockOccupancy[] {
    return DOCK_DEFINITIONS.map((def) => {
        const dockProducts = products.filter((p) => productOccupiesDock(p, def.code));
        const m = meta[def.code] ?? { capacityMax: def.defaultCapacity, blocked: false };
        const occupancyPercent =
            m.capacityMax > 0 ? Math.min(100, (dockProducts.length / m.capacityMax) * 100) : 0;

        const productColor = (dockProducts.find((p: any) => p.color)?.color as string) || null;

        const levels: DockLevel[] = def.levels.map((lvl) => {
            if (m.blocked) return { ...lvl, status: "bloqueado" };

            const productAtLevel = dockProducts.find(
                (p: any) => resolveLevelForDock(p, def.code) === lvl.level
            );

            if (productAtLevel) {
                return {
                    ...lvl,
                    status: "ocupado",
                    product: productAtLevel.name,
                    product_code: productAtLevel.product_code,
                };
            }
            return { ...lvl, status: "vazio" };
        });

        return {
            ...def,
            capacityMax: m.capacityMax,
            blocked: m.blocked,
            productCount: dockProducts.length,
            occupancyPercent,
            status: resolveStatus(dockProducts.length, m.blocked),
            products: dockProducts,
            productColor,
            levels,
        };
    });
}