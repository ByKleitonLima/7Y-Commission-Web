"use client";

import { useState, useRef, useEffect } from "react";
import { PackagePlus, Upload, AlertTriangle, CheckCircle2, X } from "lucide-react";
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

// Converte valores numéricos vindos da planilha respeitando o formato
// brasileiro (milhar com ponto, decimal com vírgula). Usar apenas
// `.replace(",", ".")` (como era feito antes) NÃO remove o ponto de
// milhar — um valor como "1.234,56" virava a string "1.234.56", e
// parseFloat parava no segundo ponto, lendo só "1.234". Essa era a causa
// dos preços/valores errados ao importar a planilha de produtos.
function toNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return 0;

    // Remove qualquer coisa que não seja dígito, ponto, vírgula ou sinal.
    const cleaned = trimmed.replace(/[^\d.,-]/g, "");
    if (!cleaned) return 0;

    if (cleaned.includes(",")) {
        // Formato BR: pontos são separador de milhar, vírgula é decimal.
        const normalized = cleaned.replace(/\./g, "").replace(",", ".");
        const parsed = Number(normalized);
        if (!Number.isNaN(parsed)) return parsed;
    }

    // Sem vírgula: já pode ser um número "puro" (ex: 1234.56) vindo direto
    // de uma célula numérica da planilha.
    const fallback = Number(cleaned);
    return Number.isNaN(fallback) ? 0 : fallback;
}

export default function Products() {
    const { suppliers = [], refresh } = useOrgData();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal de confirmação de exclusão (substitui o confirm() nativo do navegador)
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast de notificação (substitui o alert() nativo do navegador)
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<"success" | "error">("success");

    const showToast = (message: string, variant: "success" | "error" = "success") => {
        setToastVariant(variant);
        setToastMessage(message);
    };

    // Esconde o toast automaticamente após alguns segundos
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 4000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

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
            showToast(
                editingProduct ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!",
                "success"
            );
        } catch (err) {
            console.error("Erro ao salvar produto:", err);
            showToast("Não foi possível salvar o produto. Tente novamente.", "error");
        } finally {
            handleCloseModal();
        }
    };

    // Abre o modal de confirmação ao clicar na lixeira da tabela
    const openDeleteModal = (product: Product) => {
        setProductToDelete(product);
    };

    // Executa a exclusão de fato, só depois do usuário confirmar no modal
    const handleConfirmDelete = async () => {
        if (!productToDelete) return;

        const target = productToDelete;
        setProductToDelete(null);
        setIsDeleting(true);

        try {
            await deleteProduct(target.id);
            if (target.supplier_code) {
                await recomputeSupplierProductsCount([target.supplier_code]);
            }
            await refresh();
            await loadProducts();
            showToast(`O produto "${target.name}" foi removido com sucesso.`, "success");
        } catch (err) {
            console.error("Erro ao remover produto:", err);
            showToast("Não foi possível remover esse produto. Tente novamente.", "error");
        } finally {
            setIsDeleting(false);
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
                    // CORREÇÃO: antes era `parseFloat(String(...).replace(",", "."))`,
                    // que não remove o ponto de milhar e cortava o valor
                    // (ex: "1.234,56" virava 1.234). Agora usa toNumber(),
                    // que trata corretamente o formato BR.
                    const price = toNumber(row[colPrice !== -1 ? colPrice : 2]);
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
                showToast(`Importação concluída! ${importedCount} produto(s) cadastrado(s)/atualizado(s).`, "success");
            } catch (error) {
                console.error("Erro ao processar arquivo:", error);
                showToast("Erro ao ler o arquivo Excel. Verifique o formato das colunas.", "error");
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

            {/* TOAST / POPUP DE NOTIFICAÇÃO (substitui alert()) */}
            {toastMessage && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 text-white shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${toastVariant === "success"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-red-600 border-red-700"
                        }`}
                >
                    {toastVariant === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-300 shrink-0" />
                    )}
                    <p className="text-sm font-medium">{toastMessage}</p>
                    <button
                        onClick={() => setToastMessage(null)}
                        className="ml-2 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (substitui confirm()) */}
            {productToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Excluir Produto</h3>
                        </div>

                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Tem certeza que deseja excluir o produto{" "}
                            <strong className="text-gray-900">{productToDelete.name}</strong>?
                        </p>
                        <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                            Essa ação não pode ser desfeita.
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setProductToDelete(null)}
                                disabled={isDeleting}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Não, manter
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
                            >
                                {isDeleting ? "Excluindo..." : "Sim, excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
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

            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6">
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
                    onDelete={openDeleteModal}
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