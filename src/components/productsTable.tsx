"use client";

import { Edit2, Trash2, Package } from "lucide-react";

export interface Product {
    id: string;
    product_code: string;
    name: string;
    price: number;
    status: "Ativo" | "Inativo";
    supplier_code: string;
    supplier_name?: string;
    image_url?: string | null;
}

interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

export default function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
    if (products.length === 0) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                Nenhum produto encontrado.
            </div>
        );
    }

    return (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                    <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Fornecedor</th>
                        <th className="px-6 py-4">Preço</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                        <tr key={product.id} className="transition-colors hover:bg-gray-50/80">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                                                <Package className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-medium text-gray-900">{product.name}</span>
                                </div>
                            </td>

                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                {product.product_code || "-"}
                            </td>

                            <td className="px-6 py-4 text-gray-700">
                                {product.supplier_name || product.supplier_code || "N/A"}
                            </td>

                            <td className="px-6 py-4 font-medium text-gray-900">
                                {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                }).format(product.price || 0)}
                            </td>

                            <td className="px-6 py-4">
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        product.status === "Ativo"
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-red-50 text-red-700 border border-red-200"
                                    }`}
                                >
                                    {product.status}
                                </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(product)}
                                        className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                                        title="Editar"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja remover o produto "${product.name}"?`)) {
                                                onDelete(product);
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