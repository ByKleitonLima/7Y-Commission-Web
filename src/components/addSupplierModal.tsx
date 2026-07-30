"use client";

import { useState, useEffect, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Supplier } from "@/components/suppliersTable";

interface AddSupplierModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (supplierData: Omit<Supplier, "id">) => Promise<void>;
    supplierToEdit: Supplier | null;
}

const CATEGORIES = ["Linha Infantil", "Linha Geriátrica", "Toalha e lenços", "Outros"];

export default function AddSupplierModal({ open, onClose, onSave, supplierToEdit }: AddSupplierModalProps) {
    const [name, setName] = useState("");
    const [supplierCode, setSupplierCode] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;

        if (supplierToEdit) {
            setName(supplierToEdit.name || "");
            setSupplierCode(supplierToEdit.supplier_code || "");
            setStatus(supplierToEdit.status || "Ativo");
            setAvatarUrl(supplierToEdit.avatar_url || null);
            setCategories(supplierToEdit.categories || []);
        } else {
            setName("");
            setSupplierCode("");
            setStatus("Ativo");
            setAvatarUrl(null);
            setCategories([]);
        }
    }, [supplierToEdit, open]);

    if (!open) return null;

    const toggleCategory = (category: string) => {
        setCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
        );
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingPhoto(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `suppliers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("fornecedores")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("fornecedores").getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (err) {
            console.error("Erro ao subir imagem:", err);
            alert("Erro ao enviar a imagem. Verifique se o bucket 'fornecedores' existe no Supabase.");
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
                supplier_code: supplierCode,
                status,
                avatar_url: avatarUrl,
                categories,
                productsCount: supplierToEdit?.productsCount || 0,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
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
                        <label className="text-sm font-semibold text-[#2d2d2d]">Nome do fornecedor</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: CCM, Eurofral, Softys..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Código / CNPJ</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: 12.345.678/0001-90"
                            value={supplierCode}
                            onChange={(e) => setSupplierCode(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400 focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Categorias de Atuação</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map((c) => {
                                const selected = categories.includes(c);
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleCategory(c)}
                                        className={`flex h-10 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
                                            selected
                                                ? "border-[#2d2d2d] bg-[#2d2d2d] text-white shadow-sm"
                                                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        {c}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-[#2d2d2d]">Logo do fornecedor</label>
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
                            className="flex h-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#2d2d2d] hover:bg-gray-100"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Logo" className="h-full max-h-[96px] object-contain" />
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-gray-400">
                                    <ImagePlus className="h-6 w-6" strokeWidth={1.75} />
                                    <span className="text-xs">
                                        {isUploadingPhoto ? "Enviando..." : "Clique aqui para adicionar a logo"}
                                    </span>
                                </div>
                            )}
                        </div>
                        {avatarUrl && (
                            <button
                                type="button"
                                onClick={() => setAvatarUrl(null)}
                                className="self-start text-xs font-medium text-red-500 hover:text-red-600"
                            >
                                Remover logo
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
                            {isSaving ? "Salvando..." : "Salvar fornecedor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}