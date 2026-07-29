import { supabase } from "@/lib/supabase";
import { Supplier } from "@/components/suppliersTable";

export async function fetchSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Erro ao buscar fornecedores:", error);
        return [];
    }

    return (data || []).map((s) => ({
        id: s.id,
        supplier_code: s.supplier_code,
        name: s.name,
        status: s.status,
        avatar_url: s.avatar_url,
        productsCount: s.products_count || 0,
    }));
}

export async function createSupplier(supplierData: Omit<Supplier, "id">) {
    const { data, error } = await supabase
        .from("suppliers")
        .insert([
            {
                supplier_code: supplierData.supplier_code,
                name: supplierData.name,
                status: supplierData.status,
                avatar_url: supplierData.avatar_url,
                products_count: supplierData.productsCount || 0,
                updated_at: new Date().toISOString(),
            },
        ])
        .select();

    if (error) throw error;
    return data;
}

export async function updateSupplier(id: string, supplierData: Omit<Supplier, "id">) {
    const { data, error } = await supabase
        .from("suppliers")
        .update({
            supplier_code: supplierData.supplier_code,
            name: supplierData.name,
            status: supplierData.status,
            avatar_url: supplierData.avatar_url,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

    if (error) throw error;
    return data;
}

export async function deleteSupplier(id: string) {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;
}

export async function recomputeSupplierProductsCount(supplierCodes: string[]) {
    if (!supplierCodes || supplierCodes.length === 0) return;

    for (const code of supplierCodes) {
        const { count, error } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("supplier_code", code);

        if (!error) {
            await supabase
                .from("suppliers")
                .update({ products_count: count || 0 })
                .eq("supplier_code", code);
        }
    }
}