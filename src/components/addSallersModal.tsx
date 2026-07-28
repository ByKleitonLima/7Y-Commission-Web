"use client";

import { useState, FormEvent, useEffect, ChangeEvent } from "react";
import { X, User } from "lucide-react";
import { Seller } from "@/components/sellersStable";
import { uploadImageFile } from "@/lib/uploadImage";

interface AddSellerModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (seller: Omit<Seller, "id">) => void;
    sellerToEdit?: Seller | null;
}

export default function AddSellerModal({ open, onClose, onSave, sellerToEdit }: AddSellerModalProps) {
    const [supId, setSupId] = useState("");
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [photoUrl, setPhotoUrl] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [uploading, setUploading] = useState(false);

    const isEditing = Boolean(sellerToEdit);

    const resetForm = () => {
        setSupId("");
        setCode("");
        setName("");
        setStatus("Ativo");
        setPhotoUrl("");
        setPhotoFile(null);
        setPhotoPreview("");
    };

    useEffect(() => {
        if (!open) return;

        if (sellerToEdit) {
            setSupId(sellerToEdit.supId || "");
            setCode(sellerToEdit.code || "");
            setName(sellerToEdit.name || "");
            setStatus(sellerToEdit.status || "Ativo");
            setPhotoUrl(sellerToEdit.photoUrl || "");
            setPhotoFile(null);
            setPhotoPreview(sellerToEdit.photoUrl || "");
        } else {
            resetForm();
        }
    }, [open, sellerToEdit]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview("");
        setPhotoUrl("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let finalPhotoUrl = photoUrl;

        if (photoFile) {
            try {
                setUploading(true);
                finalPhotoUrl = await uploadImageFile(photoFile, "sellers");
            } catch (err) {
                console.error("Erro ao enviar foto do vendedor:", err);
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        onSave({
            supId: supId || "",
            code: code || "",
            name,
            clientsCount: sellerToEdit?.clientsCount ?? 0,
            ordersCount: sellerToEdit?.ordersCount ?? 0,
            status,
            photoUrl: finalPhotoUrl || "",
        });
        resetForm();
        onClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {isEditing ? "Editar vendedor" : "Adicionar vendedor"}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Prévia" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-7 w-7 text-gray-400" strokeWidth={1.75} />
                            )}
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                Escolher foto
                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                            </label>
                            {photoPreview && (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                >
                                    Remover foto
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome do vendedor"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                ID Sup (gerente)
                            </label>
                            <input
                                type="text"
                                value={supId}
                                onChange={(e) => setSupId(e.target.value)}
                                placeholder="Ex: S001"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Código do vendedor
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Ex: V-001"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as "Ativo" | "Inativo")}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {uploading ? "Enviando foto..." : isEditing ? "Salvar alterações" : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}