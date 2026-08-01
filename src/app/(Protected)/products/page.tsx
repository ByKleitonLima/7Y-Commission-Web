"use client";

import { useState, useRef, useEffect } from "react";
import { PackagePlus, Upload } from "lucide-react";
import StatCard from "@/components/statCard";
import ProductsTable, { Product } from "@/components/productsTable";
import AddProductModal from "@/components/addProductsModal";
import UploadLoader from "@/components/uploadLoader";
import RefreshButton from "@/components/refreshButton";
import { createProduct, updateProduct, deleteProduct, fetchProducts } from "@/services/productService";
import { recomputeSupplierProductsCount } from "@/services/supplierService";
import { useOrgData } from "@/context/orgDataContext";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export default function Products() {
    const { suppliers = [], refresh } = useOrgData();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadProducts = async () => {
        setIsLoading(true);
        const data = await fetchProducts();
        setProducts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const total = products?.length || 0;
    const active = products?.filter((p) => p.status === "Ativo").length || 0;
    const inactive = products?.filter((p) => p.status === "Inativo").length || 0;
    const totalSuppliersWithProducts = new Set(products.map((p) => p.supplier_code)).size;

    const handleOpenCreate = () => {
        setEditingProduct(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingProduct(product);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProduct(null);
        setModalOpen(false);
    };

    const handleSaveProduct = async (productData: Omit<Product, "id">) => {
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
            } else {
                await createProduct(productData);
            }
            if (productData.supplier_code) {
                await recomputeSupplierProductsCount([productData.supplier_code]);
            }
            await refresh();
            await loadProducts();
        } catch (err) {
            console.error("Erro ao salvar produto:", err);
        } finally {
            handleCloseModal();
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        try {
            await deleteProduct(product.id);
            if (product.supplier_code) {
                await recomputeSupplierProductsCount([product.supplier_code]);
            }
            await refresh();
            await loadProducts();
        } catch (err) {
            console.error("Erro ao remover produto:", err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                let headerIndex = data.findIndex((row) =>
                    row.some((cell: any) => String(cell).toLowerCase().includes("produto") || String(cell).toLowerCase().includes("código"))
                );

                if (headerIndex === -1) headerIndex = 0;

                const headers = data[headerIndex] || [];
                const rows = data.slice(headerIndex + 1);

                const validRows = rows.filter((row) => {
                    const colName = headers.findIndex((h: any) => String(h).toLowerCase().includes("produto") || String(h).toLowerCase().includes("nome"));
                    const name = String(row[colName !== -1 ? colName : 0] || "").trim();
                    return name && name !== "undefined";
                });

                const totalRows = validRows.length;
                setIsUploading(true);
                setProgress({ sent: 0, total: totalRows });

                let importedCount = 0;
                let sentCount = 0;
                const supplierCodesTouched = new Set<string>();

                const importColumnHints = ["DOCA", "POSIÇÃO", "POSICAO", "RUA", "LOCALIZAÇÃO", "LOCALIZACAO", "CODE", "CODIGO"];

                const colCode = headers.findIndex((h: any) => String(h).toLowerCase().includes("código") || String(h).toLowerCase().includes("cod"));
                const colName = headers.findIndex((h: any) => String(h).toLowerCase().includes("produto") || String(h).toLowerCase().includes("nome"));
                const colPrice = headers.findIndex((h: any) => String(h).toLowerCase().includes("preço") || String(h).toLowerCase().includes("preco") || String(h).toLowerCase().includes("valor"));
                const colSupplier = headers.findIndex((h: any) => String(h).toLowerCase().includes("fornecedor") || String(h).toLowerCase().includes("cnpj"));
                const colDock = headers.findIndex((h: any) =>
                    importColumnHints.some((hint) => String(h).toUpperCase().includes(hint))
                );

                for (const row of validRows) {
                    const code = String(row[colCode !== -1 ? colCode : 0] || "").trim();
                    const name = String(row[colName !== -1 ? colName : 1] || "").trim();
                    const price = parseFloat(String(row[colPrice !== -1 ? colPrice : 2] || "0").replace(",", ".")) || 0;
                    const supplierCode = String(row[colSupplier !== -1 ? colSupplier : 3] || "").trim();
                    const dockValue = colDock !== -1 ? String(row[colDock] || "").trim().toUpperCase() : "";

                    const productPayload = {
                        product_code: code,
                        name: name,
                        price: price,
                        supplier_code: supplierCode || null,
                        status: "Ativo",
                        dock: dockValue || null,
                        updated_at: new Date().toISOString(),
                    };

                    const { error } = await supabase
                        .from("products")
                        .upsert([productPayload], { onConflict: "product_code" });

                    if (!error) {
                        importedCount++;
                        if (supplierCode) supplierCodesTouched.add(supplierCode);
                    }

                    sentCount++;
                    setProgress({ sent: sentCount, total: totalRows });
                }

                await recomputeSupplierProductsCount(Array.from(supplierCodesTouched));
                await refresh();
                await loadProducts();
                alert(`Importação concluída!\n- Produtos cadastrados/atualizados: ${importedCount}`);
            } catch (error) {
                console.error("Erro ao processar arquivo:", error);
                alert("Erro ao ler o arquivo Excel.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="relative">
            <UploadLoader isLoading={isUploading} progress={progress} />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <div className="flex items-center justify-end gap-3">
                <RefreshButton onRefresh={async () => { await refresh(); await loadProducts(); }} />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                    <Upload className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
                    Importar Produtos
                </button>

                <button
                    onClick={handleOpenCreate}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                    <PackagePlus className="h-4 w-4" strokeWidth={1.75} />
                    Criar um novo produto
                </button>
            </div>

            <div className="mt-6 flex gap-6">
                <StatCard label="Total de produtos" value={total} />
                <StatCard label="Ativos" value={active} />
                <StatCard label="Inativos" value={inactive} />
                <StatCard label="Fornecedores atendidos" value={totalSuppliersWithProducts} />
            </div>

            {isLoading ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando produtos...
                </div>
            ) : (
                <ProductsTable
                    products={products}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteProduct}
                />
            )}

            <AddProductModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveProduct}
                productToEdit={editingProduct}
                suppliers={suppliers}
            />
        </div>
    );
}