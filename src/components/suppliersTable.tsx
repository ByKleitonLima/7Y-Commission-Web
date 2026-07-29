"use client";

import { Edit2, Trash2, Building2 } from "lucide-react";

export interface Supplier {
    id: string;
    supplier_code: string;
    name: string;
    status: "Ativo" | "Inativo";
    avatar_url?: string | null;
    productsCount?: number;
}

interface SuppliersTableProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({ suppliers, onEdit, onDelete }: SuppliersTableProps) {
    if (suppliers.length === 0) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                Nenhum fornecedor encontrado.
            </div>
        );
    }

    return (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                        <th className="px-6 py-4">Fornecedor</th>
                        <th className="px-6 py-4">Código / CNPJ</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Produtos Vinculados</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {suppliers.map((supplier) => (
                        <tr key={supplier.id} className="transition-colors hover:bg-gray-50/80">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                        {supplier.avatar_url ? (
                                            <img
                                                src={supplier.avatar_url}
                                                alt={supplier.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold text-gray-600">
                                                {supplier.name ? supplier.name.charAt(0).toUpperCase() : <Building2 className="h-4 w-4 text-gray-400" />}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-medium text-gray-900">{supplier.name}</span>
                                </div>
                            </td>

                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                {supplier.supplier_code || "-"}
                            </td>

                            <td className="px-6 py-4">
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        supplier.status === "Ativo"
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                    }`}
                                >
                                    {supplier.status}
                                </span>
                            </td>

                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                                {supplier.productsCount ?? 0}
                            </td>

                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(supplier)}
                                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                        title="Editar"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja remover o fornecedor "${supplier.name}"?`)) {
                                                onDelete(supplier);
                                            }
                                        }}
                                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}