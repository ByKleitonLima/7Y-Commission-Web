"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X } from "lucide-react";
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {productToEdit ? "Editar Produto" : "Criar Novo Produto"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
                            {imageUrl ? (
                                <img src={imageUrl} alt="Foto do Produto" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                    <Camera className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className="text-xs font-medium text-blue-600 hover:underline"
                        >
                            {isUploadingPhoto ? "Enviando..." : imageUrl ? "Alterar foto" : "Adicionar foto"}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Código do Produto</label>
                        <input
                            type="text"
                            required
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Fornecedor Vinculado</label>
                        <select
                            required
                            value={supplierCode}
                            onChange={(e) => setSupplierCode(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value="" disabled>Selecione um fornecedor</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.supplier_code}>
                                    {s.name} ({s.supplier_code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Preço (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "Ativo" | "Inativo")}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUploadingPhoto}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm text-white hover:bg-[#1f1f1f] disabled:opacity-50"
                        >
                            {isSaving ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}