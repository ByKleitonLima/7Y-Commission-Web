"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X, ChevronDown, Plus, Trash2, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product, ProductSize } from "@/components/productsTable";
import { Supplier } from "@/components/suppliersTable";
import { DOCK_CODES } from "@/lib/wareHouseLayout";

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

function makeSizeId() {
    return Math.random().toString(36).slice(2, 10);
}

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
    const [sizes, setSizes] = useState<ProductSize[]>([]);
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [dock, setDock] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fornecedorDropdownOpen, setFornecedorDropdownOpen] = useState(false);
    const [isDraggingImage, setIsDraggingImage] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name || "");
            setProductCode(productToEdit.product_code || "");
            setCategory(productToEdit.category || CATEGORIES[0]);
            setPrice(productToEdit.price || 0);
            setPromoPrice100(productToEdit.promoPrice100 ?? "");
            setBundleQuantity(productToEdit.bundleQuantity || "");
            setSizes(productToEdit.sizes || []);
            setSupplierCode(productToEdit.supplier_code || "");
            setStatus(productToEdit.status || "Ativo");
            setDock(productToEdit.dock || "");
            setImageUrl(productToEdit.image_url || null);
        } else {
            setName("");
            setProductCode("");
            setCategory(CATEGORIES[0]);
            setPrice("");
            setPromoPrice100("");
            setBundleQuantity("");
            setSizes([]);
            setSupplierCode(suppliers[0]?.supplier_code || "");
            setStatus("Ativo");
            setDock("");
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
            alert("Erro ao enviar a imagem do produto. Verifique se o bucket correspondente à categoria existe no Supabase.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingImage(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const addSize = () => {
        setSizes((prev) => [...prev, { id: makeSizeId(), name: "", quantity: "", code: "" }]);
    };

    const updateSize = (id: string, field: keyof Omit<ProductSize, "id">, value: string) => {
        setSizes((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };

    const removeSize = (id: string) => {
        setSizes((prev) => prev.filter((s) => s.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave({
                name,
                product_code: productCode,
                category,
                price: Number(price) || 0,
                promoPrice100: promoPrice100 === "" ? null : Number(promoPrice100),
                bundleQuantity,
                sizes,
                supplier_code: supplierCode,
                status,
                image_url: imageUrl,
                dock: dock || null,
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
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {productToEdit ? "Editar Produto" : "Novo Produto"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Nome do produto</label>
                        <input
                            type="text"
                            required
                            placeholder="Digite o nome do produto..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
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
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Categoria</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
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
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            >
                                <span className="truncate">{selectedSupplierName}</span>
                                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                            </button>

                            {fornecedorDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setFornecedorDropdownOpen(false)} />
                                    <div className="absolute top-[105%] left-0 z-20 max-h-[160px] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                        {suppliers.length === 0 && (
                                            <p className="px-4 py-2.5 text-sm text-gray-400">
                                                Nenhum fornecedor cadastrado.
                                            </p>
                                        )}
                                        {suppliers.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                    setSupplierCode(s.supplier_code);
                                                    setFornecedorDropdownOpen(false);
                                                }}
                                                className="w-full px-4 py-2.5 text-left text-sm text-[#2d2d2d] transition-colors hover:bg-gray-50"
                                            >
                                                {s.name} ({s.supplier_code})
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-[#2d2d2d]">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" strokeWidth={2} />
                            Localização no Galpão
                        </label>
                        <select
                            value={dock}
                            onChange={(e) => setDock(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="">Sem localização definida</option>
                            {DOCK_CODES.map((code) => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
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
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
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
                                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Qtd por fardo (PCT/FDS)</label>
                        <input
                            type="text"
                            placeholder="Ex: 4, 6, 8"
                            value={bundleQuantity}
                            onChange={(e) => setBundleQuantity(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-[#2d2d2d]">Grade de Tamanhos e Códigos</label>
                            <button
                                type="button"
                                onClick={addSize}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                Adicionar Tamanho
                            </button>
                        </div>

                        {sizes.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs italic text-gray-400">
                                Nenhum tamanho adicionado. O produto será cadastrado sem grade específica.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {sizes.map((s) => (
                                    <div key={s.id} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Tamanho (Ex: P, M, G)"
                                            value={s.name}
                                            onChange={(e) => updateSize(s.id, "name", e.target.value)}
                                            className="h-9 w-1/3 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Qtd"
                                            value={s.quantity}
                                            onChange={(e) => updateSize(s.id, "quantity", e.target.value)}
                                            className="h-9 w-1/4 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Código"
                                            value={s.code}
                                            onChange={(e) => updateSize(s.id, "code", e.target.value)}
                                            className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d] font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSize(s.id)}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Imagem do Produto</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            disabled={isUploadingPhoto}
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDraggingImage(true);
                            }}
                            onDragLeave={() => setIsDraggingImage(false)}
                            onDrop={handleDrop}
                            className={`flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed bg-gray-50 p-4 text-center transition-colors ${
                                isDraggingImage ? "border-[#2d2d2d] bg-gray-100" : "border-gray-300 hover:border-[#2d2d2d] hover:bg-gray-100"
                            }`}
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="Prévia" className="max-h-[110px] rounded-md object-contain" />
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-gray-400" strokeWidth={1.75} />
                                    <p className="text-sm font-medium text-[#2d2d2d]">
                                        {isUploadingPhoto ? "Enviando..." : "Clique ou arraste a imagem aqui"}
                                    </p>
                                    <p className="text-xs text-gray-400">Formatos suportados: JPG, PNG, WEBP</p>
                                </>
                            )}
                        </div>
                        {imageUrl && (
                            <button
                                type="button"
                                onClick={() => setImageUrl(null)}
                                className="self-start text-xs font-medium text-red-500 hover:text-red-600"
                            >
                                Remover imagem
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "Ativo" | "Inativo")}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUploadingPhoto}
                            className="rounded-lg bg-[#2d2d2d] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
                        >
                            {isSaving ? "Salvando..." : "Salvar produto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}