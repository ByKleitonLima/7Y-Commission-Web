import { supabase } from "@/lib/supabase";
import { Product } from "@/components/productsTable";
import { logAudit } from "@/services/auditLogService";

const TABLE = "products";

export async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select(`
            *,
            suppliers (
                name
            )
        `)
        .order("name", { ascending: true });

    if (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
    }

    return (data || []).map((p) => ({
        id: p.id,
        product_code: p.product_code,
        name: p.name,
        price: p.price || 0,
        promoPrice100: p.promo_price_100,
        bundleQuantity: p.bundle_quantity || "",
        category: p.category || "",
        sizes: p.sizes || [],
        status: p.status,
        supplier_code: p.supplier_code,
        supplier_name: p.suppliers?.name || "Sem Fornecedor",
        image_url: p.image_url,
        dock: p.dock || null,
        color: p.color || null,
        level: p.level ?? null,
    }));
}

export async function createProduct(productData: Omit<Product, "id">) {
    const { data, error } = await supabase
        .from(TABLE)
        .insert([
            {
                product_code: productData.product_code,
                name: productData.name,
                price: productData.price,
                promo_price_100: productData.promoPrice100 ?? null,
                bundle_quantity: productData.bundleQuantity || null,
                category: productData.category || null,
                sizes: productData.sizes || [],
                status: productData.status,
                supplier_code: productData.supplier_code,
                image_url: productData.image_url,
                dock: productData.dock || null,
                color: productData.color || null,
                updated_at: new Date().toISOString(),
            },
        ])
        .select();

    if (error) throw error;

    const created = data?.[0];
    await logAudit({
        action: "create",
        entityType: "product",
        entityId: created?.id,
        entityLabel: productData.name,
        description: `Produto "${productData.name}" criado (código ${productData.product_code || "-"}).`,
        changes: { after: productData },
    });

    return data;
}

export async function updateProduct(id: string, productData: Omit<Product, "id">) {
    const { data, error } = await supabase
        .from(TABLE)
        .update({
            product_code: productData.product_code,
            name: productData.name,
            price: productData.price,
            promo_price_100: productData.promoPrice100 ?? null,
            bundle_quantity: productData.bundleQuantity || null,
            category: productData.category || null,
            sizes: productData.sizes || [],
            status: productData.status,
            supplier_code: productData.supplier_code,
            image_url: productData.image_url,
            dock: productData.dock || null,
            color: productData.color || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

    if (error) throw error;

    await logAudit({
        action: "update",
        entityType: "product",
        entityId: id,
        entityLabel: productData.name,
        description: `Produto "${productData.name}" atualizado.`,
        changes: { after: productData },
    });

    return data;
}

export async function deleteProduct(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;

    await logAudit({
        action: "delete",
        entityType: "product",
        entityId: id,
        description: `Produto removido (id ${id}).`,
    });
}