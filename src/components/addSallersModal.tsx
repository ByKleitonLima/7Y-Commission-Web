"use client";

import { useState, FormEvent, useEffect } from "react";
import { X } from "lucide-react";
import { Seller } from "@/components/sellersStable";

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

    const isEditing = Boolean(sellerToEdit);

    const resetForm = () => {
        setSupId("");
        setCode("");
        setName("");
        setStatus("Ativo");
    };

    useEffect(() => {
        if (!open) return;

        if (sellerToEdit) {
            setSupId(sellerToEdit.supId || "");
            setCode(sellerToEdit.code || "");
            setName(sellerToEdit.name || "");
            setStatus(sellerToEdit.status || "Ativo");
        } else {
            resetForm();
        }
    }, [open, sellerToEdit]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSave({
            supId: supId || "",
            code: code || "",
            name,
            clientsCount: sellerToEdit?.clientsCount ?? 0,
            ordersCount: sellerToEdit?.ordersCount ?? 0,
            status,
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
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]"
                        >
                            {isEditing ? "Salvar alterações" : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}