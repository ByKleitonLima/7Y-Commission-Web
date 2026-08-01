"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Camera, X, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product, ProductSize } from "@/components/productsTable";
import { Supplier } from "@/components/suppliersTable";
import { getAllowedDockCodes, isDockAllowedForCategory } from "@/lib/warehouseLayout";

interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (productData: Omit<Product, "id">) => Promise<void>;
    productToEdit: Product | null;
    suppliers: Supplier[];
}

const CATEGORIES = ["Linha Infantil", "Linha Geriátrica", "Toalha e lenços", "Outros"];

const CATEGORY_BUCKETS: Record<string, string> = {
    "Linha Infantil": "linha-infantil",
    "Linha Geriátrica": "linha-geriatrica",
    "Toalha e lenços": "toalha-e-lencos",
    "Outros": "outros",
};

export default function AddProductModal({
    open,
    onClose,
    onSave,
    productToEdit,
    suppliers,
}: AddProductModalProps) {
    const [name, setName] = useState("");
    const [productCode, setProductCode] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [supplierCode, setSupplierCode] = useState("");
    const [price, setPrice] = useState<number | "">("");
    const [promoPrice100, setPromoPrice100] = useState<number | "">("");
    const [bundleQuantity, setBundleQuantity] = useState("");

    // Estado para Doca e Fardos
    const [sizeName, setSizeName] = useState("");
    const [sizeBundles, setSizeBundles] = useState("");
    const [sizeCode, setSizeCode] = useState("");
    const [sizeDock, setSizeDock] = useState("");

    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [color, setColor] = useState("#2563eb");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fornecedorDropdownOpen, setFornecedorDropdownOpen] = useState(false);
    const [isDraggingImage, setIsDraggingImage] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedDockCodes = useMemo(() => getAllowedDockCodes(category), [category]);

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name || "");
            setProductCode(productToEdit.product_code || "");
            setCategory(productToEdit.category || CATEGORIES[0]);
            setPrice(productToEdit.price || 0);
            setPromoPrice100(productToEdit.promoPrice100 ?? "");
            setBundleQuantity(productToEdit.bundleQuantity || "");

            const singleSize = productToEdit.sizes?.[0];
            setSizeName(singleSize?.name || "");
            setSizeCode(singleSize?.code || "");
            setSizeDock(singleSize?.dock || productToEdit.dock || "");
            setSizeBundles(singleSize?.quantity || "");

            setSupplierCode(productToEdit.supplier_code || "");
            setStatus(productToEdit.status || "Ativo");
            setColor(productToEdit.color || "#2563eb");
            setImageUrl(productToEdit.image_url || null);
        } else {
            setName("");
            setProductCode("");
            setCategory(CATEGORIES[0]);
            setPrice("");
            setPromoPrice100("");
            setBundleQuantity("");
            setSizeName("");
            setSizeBundles("");
            setSizeCode("");
            setSizeDock("");
            setSupplierCode(suppliers[0]?.supplier_code || "");
            setStatus("Ativo");
            setColor("#2563eb");
            setImageUrl(null);
        }
    }, [productToEdit, open, suppliers]);

    if (!open) return null;

    const uploadFile = async (file: File) => {
        try {
            setIsUploadingPhoto(true);
            const bucket = CATEGORY_BUCKETS[category] || "outros";
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            setImageUrl(data.publicUrl);
        } catch (err) {
            console.error("Erro ao subir imagem:", err);
            alert("Erro ao enviar a imagem do produto.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (sizeDock && !isDockAllowedForCategory(sizeDock, category)) {
            alert(`A localização "${sizeDock}" não é permitida para a categoria "${category}".`);
            return;
        }

        setIsSaving(true);
        try {
            const singleSize: ProductSize = {
                id: productToEdit?.sizes?.[0]?.id || Math.random().toString(36).slice(2, 10),
                name: sizeName,
                quantity: sizeBundles, // Quantidade de fardos na doca
                code: sizeCode || productCode,
                dock: sizeDock || null,
            };

            await onSave({
                name,
                product_code: productCode,
                category,
                price: Number(price) || 0,
                promoPrice100: promoPrice100 === "" ? null : Number(promoPrice100),
                bundleQuantity,
                sizes: sizeName || sizeDock || sizeBundles ? [singleSize] : [],
                supplier_code: supplierCode,
                status,
                image_url: imageUrl,
                dock: sizeDock || null,
                color: sizeDock ? color : null,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const selectedSupplierName =
        suppliers.find((s) => s.supplier_code === supplierCode)?.name ||
        (productToEdit && productToEdit.supplier_name) ||
        "Selecione um fornecedor";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {productToEdit ? "Editar Produto" : "Novo Produto"}
                    </h2>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Nome do produto</label>
                            <input
                                type="text"
                                required
                                placeholder="Digite o nome do produto..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Código do produto</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: PRD-001"
                                value={productCode}
                                onChange={(e) => setProductCode(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-mono text-[#2d2d2d] outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Categoria</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Fornecedor</label>
                            <button
                                type="button"
                                onClick={() => setFornecedorDropdownOpen((v) => !v)}
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-[#2d2d2d]"
                            >
                                <span className="truncate">{selectedSupplierName}</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                            </button>

                            {fornecedorDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setFornecedorDropdownOpen(false)} />
                                    <div className="absolute top-[105%] left-0 z-20 max-h-[160px] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                        {suppliers.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                    setSupplierCode(s.supplier_code);
                                                    setFornecedorDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-[#2d2d2d] hover:bg-gray-50"
                                            >
                                                {s.name} ({s.supplier_code})
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Preço normal (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0,00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Preço PROMO 100 (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={promoPrice100}
                                onChange={(e) => setPromoPrice100(e.target.value === "" ? "" : Number(e.target.value))}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">
                            Qtd. de pacotes por fardo (PCT/FDS)
                        </label>
                        <input
                            type="number"
                            placeholder="Ex: 4"
                            value={bundleQuantity}
                            onChange={(e) => setBundleQuantity(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                        <div>
                            <h3 className="text-sm font-semibold text-[#2d2d2d]">Alocação na Doca</h3>
                            <p className="text-xs text-gray-500">Informe a quantidade de fardos que dará entrada na doca do galpão.</p>
                        </div>

                        <div className="grid grid-cols-12 gap-2 items-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="col-span-3 flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-gray-500">Tamanho</label>
                                <input
                                    type="text"
                                    placeholder="Ex: P, M, G"
                                    value={sizeName}
                                    onChange={(e) => setSizeName(e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs outline-none"
                                />
                            </div>

                            <div className="col-span-3 flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-gray-500">Qtd. Fardos na Doca</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 50"
                                    value={sizeBundles}
                                    onChange={(e) => setSizeBundles(e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs outline-none"
                                />
                            </div>

                            <div className="col-span-3 flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-gray-500">Cód. Tamanho</label>
                                <input
                                    type="text"
                                    placeholder="Ex: PRD-001-P"
                                    value={sizeCode}
                                    onChange={(e) => setSizeCode(e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-2.5 text-xs font-mono outline-none"
                                />
                            </div>

                            <div className="col-span-3 flex flex-col gap-1">
                                <label className="text-[11px] font-medium text-gray-500">Doca/Posição</label>
                                <select
                                    value={sizeDock}
                                    onChange={(e) => setSizeDock(e.target.value)}
                                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-xs outline-none"
                                >
                                    <option value="">Sem Doca</option>
                                    {allowedDockCodes.map((code) => (
                                        <option key={code} value={code}>{code}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Cor de identificação na doca:</label>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                        />
                        <span className="text-xs text-gray-400">Pinta a doca selecionada no mapa visual do galpão.</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Imagem do Produto</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-gray-50 p-4 text-center hover:border-[#2d2d2d]"
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="Prévia" className="max-h-[90px] rounded-md object-contain" />
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-gray-400" />
                                    <p className="text-sm font-medium text-[#2d2d2d]">
                                        {isUploadingPhoto ? "Enviando..." : "Clique ou arraste a imagem aqui"}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving || isUploadingPhoto} className="rounded-lg bg-[#2d2d2d] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f1f1f]">
                            {isSaving ? "Salvando..." : "Salvar produto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}