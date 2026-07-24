"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

interface AddClientModalProps {
    open: boolean;
    isOpen?: boolean;
    onClose: () => void;
    onSave: (clientData: any) => Promise<void>;
    clientToEdit?: any | null;
}

export default function AddClientModal({
    open,
    isOpen,
    onClose,
    onSave,
    clientToEdit,
}: AddClientModalProps) {
    const isModalOpen = open ?? isOpen ?? false;

    const [formData, setFormData] = useState({
        name: "",
        supId: "",
        sellerCode: "",
        code: "",
        region: "",
        status: "Ativo" as "Ativo" | "Inativo",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isModalOpen) {
            if (clientToEdit) {
                setFormData({
                    name: clientToEdit.name || "",
                    supId: clientToEdit.sup_id || clientToEdit.supId || "",
                    sellerCode: clientToEdit.seller_code || clientToEdit.sellerCode || "",
                    code: clientToEdit.client_code || clientToEdit.code || "",
                    region: clientToEdit.region || "",
                    status: clientToEdit.status || "Ativo",
                });
            } else {
                setFormData({
                    name: "",
                    supId: "",
                    sellerCode: "",
                    code: "",
                    region: "",
                    status: "Ativo",
                });
            }
        }
    }, [clientToEdit, isModalOpen]);

    if (!isModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {clientToEdit ? "Editar Cliente" : "Novo Cliente"}
                    </h2>
                    <button
                        onClick={onClose}
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
                            placeholder="Nome do cliente"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">ID Sup (vendedor)</label>
                            <input
                                type="text"
                                placeholder="Ex: V001"
                                value={formData.supId}
                                onChange={(e) => setFormData({ ...formData, supId: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Código do Vendedor</label>
                            <input
                                type="text"
                                placeholder="Ex: S-001"
                                value={formData.sellerCode}
                                onChange={(e) => setFormData({ ...formData, sellerCode: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código do cliente</label>
                        <input
                            type="text"
                            placeholder="Ex: C-001"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Região</label>
                        <input
                            type="text"
                            placeholder="Ex: Zona Sul"
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as "Ativo" | "Inativo" })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {loading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}