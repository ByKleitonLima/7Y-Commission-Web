import { supabase } from "@/lib/supabase";
import { Product } from "@/components/productsTable";

export async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from("products")
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
        status: p.status,
        supplier_code: p.supplier_code,
        supplier_name: p.suppliers?.name || "Sem Fornecedor",
        image_url: p.image_url,
    }));
}

export async function createProduct(productData: Omit<Product, "id">) {
    const { data, error } = await supabase
        .from("products")
        .insert([
            {
                product_code: productData.product_code,
                name: productData.name,
                price: productData.price,
                status: productData.status,
                supplier_code: productData.supplier_code,
                image_url: productData.image_url,
                updated_at: new Date().toISOString(),
            },
        ])
        .select();

    if (error) throw error;
    return data;
}

export async function updateProduct(id: string, productData: Omit<Product, "id">) {
    const { data, error } = await supabase
        .from("products")
        .update({
            product_code: productData.product_code,
            name: productData.name,
            price: productData.price,
            status: productData.status,
            supplier_code: productData.supplier_code,
            image_url: productData.image_url,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

    if (error) throw error;
    return data;
}

export async function deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
}