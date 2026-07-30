"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/components/productsTable";
import { Supplier } from "@/components/suppliersTable";

interface AddProductModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (productData: Omit<Product, "id">) => Promise<void>;
    productToEdit: Product | null;
    suppliers: Supplier[];
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
    const [price, setPrice] = useState<number | "">("");
    const [supplierCode, setSupplierCode] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fornecedorDropdownOpen, setFornecedorDropdownOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name || "");
            setProductCode(productToEdit.product_code || "");
            setPrice(productToEdit.price || 0);
            setSupplierCode(productToEdit.supplier_code || "");
            setStatus(productToEdit.status || "Ativo");
            setImageUrl(productToEdit.image_url || null);
        } else {
            setName("");
            setProductCode("");
            setPrice("");
            setSupplierCode(suppliers[0]?.supplier_code || "");
            setStatus("Ativo");
            setImageUrl(null);
        }
    }, [productToEdit, open, suppliers]);

    if (!open) return null;

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingPhoto(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
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
        setIsSaving(true);
        try {
            await onSave({
                name,
                product_code: productCode,
                price: Number(price) || 0,
                supplier_code: supplierCode,
                status,
                image_url: imageUrl,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[90vh] w-[480px] flex-col gap-5 overflow-y-auto rounded-[12px] border border-gray-800 bg-[#171717] p-8">
                <div className="flex items-center justify-between border-b border-white pb-4">
                    <h2 className="text-lg font-bold text-white">
                        {productToEdit ? "Editar produto" : "Novo produto"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-[6px] border border-white p-1.5 text-white transition-colors hover:bg-white/10"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-white">Nome do produto</label>
                        <input
                            type="text"
                            required
                            placeholder="Digite o nome do produto..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-[40px] rounded-[6px] border border-white bg-transparent px-2.5 text-[14px] text-white outline-none placeholder:text-gray-500 focus:border-gray-300 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-white">Código do produto</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: PRD-001"
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            className="h-[40px] rounded-[6px] border border-white bg-transparent px-2.5 text-[14px] text-white outline-none placeholder:text-gray-500 focus:border-gray-300 transition-colors font-mono"
                        />
                    </div>

                    <div className="relative flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-white">Fornecedor</label>
                        <button
                            type="button"
                            onClick={() => setFornecedorDropdownOpen((v) => !v)}
                            className="flex h-[40px] w-full cursor-pointer items-center justify-between rounded-[6px] border border-white bg-transparent px-3 text-left text-[14px] font-medium text-white"
                        >
                            <span className="truncate">{selectedSupplierName}</span>
                            <ChevronDown size={14} className="text-white shrink-0" />
                        </button>

                        {fornecedorDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setFornecedorDropdownOpen(false)} />
                                <div className="absolute top-[105%] left-0 z-20 max-h-[160px] w-full overflow-y-auto rounded-[6px] border border-gray-700 bg-[#111] shadow-xl">
                                    {suppliers.length === 0 && (
                                        <p className="px-4 py-2.5 text-[13px] text-gray-500">
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
                                            className="w-full px-4 py-2.5 text-left text-[13px] text-white transition-colors hover:bg-white/10"
                                        >
                                            {s.name} ({s.supplier_code})
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-white">Preço (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0,00"
                            value={price}
                            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                            className="h-[40px] rounded-[6px] border border-white bg-transparent px-2.5 text-[14px] text-white outline-none placeholder:text-gray-500 focus:border-gray-300 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-white">Foto do produto</label>
                        <div className="relative flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-white/40 bg-white/5 p-4 transition-colors hover:border-white">
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                            />

                            {imageUrl ? (
                                <div className="flex w-full items-center gap-4 px-2">
                                    <img
                                        src={imageUrl}
                                        alt="Preview"
                                        className="h-[60px] w-[60px] rounded-[4px] border border-white/20 object-cover"
                                    />
                                    <div className="flex flex-col truncate">
                                        <span className="truncate text-[13px] font-semibold text-white">
                                            {isUploadingPhoto ? "Enviando..." : "Imagem selecionada"}
                                        </span>
                                        <span className="text-[11px] text-gray-400">Clique para trocar</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-white" />
                                    <div className="text-center">
                                        <p className="text-[13px] font-medium text-white">
                                            {isUploadingPhoto ? "Enviando..." : "Clique ou arraste a imagem aqui"}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-gray-400">
                                            Formatos suportados: JPG, PNG, WEBP
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-1 grid grid-cols-2 gap-3">
                        <div className="col-span-2 h-px bg-white/10" />

                        <label className="col-span-2 text-xs font-bold uppercase tracking-wide text-white opacity-60">
                            Status
                        </label>

                        <button
                            type="button"
                            onClick={() => setStatus("Ativo")}
                            className={`flex h-[40px] cursor-pointer select-none items-center justify-center gap-2 rounded-[6px] border text-[13px] font-bold transition-all ${
                                status === "Ativo"
                                    ? "border-green-600 bg-green-600 text-white shadow-lg shadow-green-600/20"
                                    : "border-white/30 bg-transparent text-white hover:bg-white/10"
                            }`}
                        >
                            Ativo
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus("Inativo")}
                            className={`flex h-[40px] cursor-pointer select-none items-center justify-center gap-2 rounded-[6px] border text-[13px] font-bold transition-all ${
                                status === "Inativo"
                                    ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-600/20"
                                    : "border-white/30 bg-transparent text-white hover:bg-white/10"
                            }`}
                        >
                            Inativo
                        </button>
                    </div>

                    <div className="mt-2 flex justify-end gap-3 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-[6px] border border-white px-4 py-2 text-[14px] text-white transition-colors hover:bg-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUploadingPhoto}
                            className="cursor-pointer rounded-[6px] bg-white px-5 py-2 text-[14px] font-bold text-black transition-colors hover:bg-gray-200 disabled:opacity-50"
                        >
                            {isSaving ? "Salvando..." : "Salvar produto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}