"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Supplier } from "@/components/suppliersTable";

interface AddSupplierModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (supplierData: Omit<Supplier, "id">) => Promise<void>;
    supplierToEdit: Supplier | null;
}

export default function AddSupplierModal({ open, onClose, onSave, supplierToEdit }: AddSupplierModalProps) {
    const [name, setName] = useState("");
    const [supplierCode, setSupplierCode] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (supplierToEdit) {
            setName(supplierToEdit.name || "");
            setSupplierCode(supplierToEdit.supplier_code || "");
            setStatus(supplierToEdit.status || "Ativo");
            setAvatarUrl(supplierToEdit.avatar_url || null);
        } else {
            setName("");
            setSupplierCode("");
            setStatus("Ativo");
            setAvatarUrl(null);
        }
    }, [supplierToEdit, open]);

    if (!open) return null;

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingPhoto(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `suppliers/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (err) {
            console.error("Erro ao subir imagem:", err);
            alert("Erro ao enviar a imagem. Verifique se o bucket 'avatars' existe no Supabase.");
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
                productsCount: supplierToEdit?.productsCount || 0,
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
                        {supplierToEdit ? "Editar Fornecedor" : "Criar Novo Fornecedor"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-gray-300 bg-gray-100">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Foto do Fornecedor" className="h-full w-full object-cover" />
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
                            {isUploadingPhoto ? "Enviando..." : avatarUrl ? "Alterar foto" : "Adicionar foto"}
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
                        <label className="block text-xs font-medium text-gray-700">Código / CNPJ</label>
                        <input
                            type="text"
                            required
                            value={supplierCode}
                            onChange={(e) => setSupplierCode(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Nome do Fornecedor</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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