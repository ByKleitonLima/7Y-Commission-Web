"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { X, User } from "lucide-react";
import { SalesManager } from "./managerStable";
import { uploadImageFile } from "@/lib/uploadImage";

interface AddManagerModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (manager: any) => Promise<void>;
    managerToEdit?: SalesManager | null;
}

export default function AddManagerModal({ open, onClose, onSave, managerToEdit }: AddManagerModalProps) {
    const [supId, setSupId] = useState("");
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [cpf, setCpf] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [photoUrl, setPhotoUrl] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [uploading, setUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isEditing = Boolean(managerToEdit);

    const resetForm = () => {
        setSupId("");
        setCode("");
        setName("");
        setCpf("");
        setPhone("");
        setEmail("");
        setRole("");
        setStatus("Ativo");
        setPhotoUrl("");
        setPhotoFile(null);
        setPhotoPreview("");
    };

    useEffect(() => {
        if (!open) return;

        if (managerToEdit) {
            setSupId(managerToEdit.supId || "");
            setCode(managerToEdit.code || "");
            setName(managerToEdit.name || "");
            setCpf(managerToEdit.cpf || "");
            setPhone(managerToEdit.phone || "");
            setEmail(managerToEdit.email || "");
            setRole(managerToEdit.role || "");
            setStatus(managerToEdit.status || "Ativo");
            setPhotoUrl(managerToEdit.photoUrl || "");
            setPhotoFile(null);
            setPhotoPreview(managerToEdit.photoUrl || "");
        } else {
            resetForm();
        }
    }, [open, managerToEdit]);

    if (!open) return null;

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
        setIsLoading(true);

        let finalPhotoUrl = photoUrl;

        try {
            if (photoFile) {
                setUploading(true);
                finalPhotoUrl = await uploadImageFile(photoFile, "managers");
                setUploading(false);
            }

            await onSave({
                supId,
                code,
                name,
                cpf,
                phone,
                email,
                role,
                status,
                photoUrl: finalPhotoUrl || "",
            });
            resetForm();
        } catch (err) {
            console.error("Erro ao salvar gerente:", err);
        } finally {
            setUploading(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {managerToEdit ? "Editar Gerente" : "Novo Gerente"}
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
                        <label className="mb-1 block text-sm font-medium text-gray-700">ID Sup (Supervisor ID)</label>
                        <input
                            type="text"
                            required
                            value={supId}
                            onChange={(e) => setSupId(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            placeholder="Ex: 1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                            <input
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                placeholder="Ex: 100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Cargo</label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                placeholder="Ex: Gerente Regional"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            placeholder="Nome completo"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">CPF</label>
                            <input
                                type="text"
                                value={cpf}
                                onChange={(e) => setCpf(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                placeholder="000.000.000-00"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            placeholder="email@exemplo.com"
                        />
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
                            disabled={isLoading}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {uploading ? "Enviando foto..." : isLoading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}