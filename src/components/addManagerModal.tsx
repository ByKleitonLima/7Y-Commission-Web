"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { SalesManager } from "./managerStable"; // Importa a tipagem do gerente

interface AddManagerModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (manager: any) => Promise<void>;
    managerToEdit?: SalesManager | null; // <--- Aqui está a propriedade que resolve o erro
}

export default function AddManagerModal({ open, onClose, onSave, managerToEdit }: AddManagerModalProps) {
    const [supId, setSupId] = useState("");
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [status, setStatus] = useState<"Ativo" | "Inativo">("Ativo");
    const [isLoading, setIsLoading] = useState(false);

    // Preenche os dados no formulário caso seja uma edição
    useEffect(() => {
        if (open) {
            if (managerToEdit) {
                setSupId(managerToEdit.supId || "");
                setCode(managerToEdit.code || "");
                setName(managerToEdit.name || "");
                setStatus(managerToEdit.status || "Ativo");
            } else {
                setSupId("");
                setCode("");
                setName("");
                setStatus("Ativo");
            }
        }
    }, [open, managerToEdit]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await onSave({ supId, code, name, status });
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {managerToEdit ? "Editar Gerente" : "Novo Gerente"}
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
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {isLoading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}