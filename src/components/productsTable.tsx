"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, SlidersHorizontal, Package } from "lucide-react";
import Modal from "@/components/modal";

export interface ProductSize {
    id: string;
    name: string;
    quantity: string;
    code: string;
    dock?: string | null;
}

export interface Product {
    id: string;
    product_code: string;
    name: string;
    price: number;
    promoPrice100?: number | null;
    bundleQuantity?: string;
    category?: string;
    sizes?: ProductSize[];
    status: "Ativo" | "Inativo";
    supplier_code: string;
    supplier_name?: string;
    image_url?: string | null;
    dock?: string | null;
    color?: string | null;
}

type StatusFilter = "Todos os status" | "Ativo" | "Inativo";

interface ColumnFilters {
    code: string;
    name: string;
    supplier: string;
    status: StatusFilter;
}

const EMPTY_FILTERS: ColumnFilters = {
    code: "",
    name: "",
    supplier: "",
    status: "Todos os status",
};

interface ProductsTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

export default function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
    const [search, setSearch] = useState("");
    const [isFilterModalOpen, setFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
    const [draftFilters, setDraftFilters] = useState<ColumnFilters>(EMPTY_FILTERS);

    const activeFilterCount = useMemo(
        () =>
            Object.entries(filters).filter(([key, value]) =>
                key === "status" ? value !== "Todos os status" : Boolean(value)
            ).length,
        [filters]
    );

    const openFilterModal = () => {
        setDraftFilters(filters);
        setFilterModalOpen(true);
    };

    const applyFilters = () => {
        setFilters(draftFilters);
        setFilterModalOpen(false);
    };

    const clearFilters = () => {
        setDraftFilters(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setFilterModalOpen(false);
    };

    const filtered = products.filter((p) => {
        const matchesSearch = `${p.name || ""} ${p.product_code || ""} ${p.supplier_name || ""}`
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesCode =
            !filters.code || (p.product_code || "").toLowerCase().includes(filters.code.toLowerCase());

        const matchesName =
            !filters.name || (p.name || "").toLowerCase().includes(filters.name.toLowerCase());

        const matchesSupplier =
            !filters.supplier ||
            `${p.supplier_name || ""} ${p.supplier_code || ""}`
                .toLowerCase()
                .includes(filters.supplier.toLowerCase());

        const matchesStatus = filters.status === "Todos os status" || p.status === filters.status;

        return matchesSearch && matchesCode && matchesName && matchesSupplier && matchesStatus;
    });

    if (products.length === 0) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                Nenhum produto encontrado.
            </div>
        );
    }

    return (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, código ou fornecedor..."
                        className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                    />
                </div>

                <button
                    type="button"
                    onClick={openFilterModal}
                    className="relative flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#2d2d2d] transition-colors hover:bg-gray-50"
                >
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
                    Filtros
                    {activeFilterCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2d2d2d] px-1 text-[11px] font-semibold text-white">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            <table className="w-full text-left text-sm text-gray-600">
                <thead className="border-b border-gray-100 text-gray-500">
                    <tr>
                        <th className="px-6 py-3 font-medium">Produto</th>
                        <th className="px-6 py-3 font-medium">Código</th>
                        <th className="px-6 py-3 font-medium">Fornecedor</th>
                        <th className="px-6 py-3 font-medium">Docas / Tamanhos</th>
                        <th className="px-6 py-3 font-medium">Preço</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 text-right font-medium">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filtered.map((product) => {
                        const sizesWithDocks = product.sizes?.filter((s) => s.dock) || [];

                        return (
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

                                <td className="px-6 py-4 text-gray-700">
                                    {sizesWithDocks.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {sizesWithDocks.map((s) => (
                                                <span
                                                    key={s.id}
                                                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                                >
                                                    <span
                                                        className="h-2 w-2 rounded-full border border-black/10"
                                                        style={{ backgroundColor: product.color || "#9ca3af" }}
                                                    />
                                                    {s.name ? `${s.name}: ` : ""}{s.dock}
                                                </span>
                                            ))}
                                        </div>
                                    ) : product.dock ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full border border-black/10"
                                                style={{ backgroundColor: product.color || "#9ca3af" }}
                                            />
                                            {product.dock}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">Sem local</span>
                                    )}
                                </td>

                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                    }).format(product.price || 0)}
                                </td>

                                <td className="px-6 py-4">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.status === "Ativo"
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
                                            <Pencil className="h-4 w-4" />
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
                        );
                    })}

                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400">
                                Nenhum produto encontrado para os filtros selecionados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Modal open={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtrar produtos">
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                        <input
                            type="text"
                            value={draftFilters.code}
                            onChange={(e) => setDraftFilters({ ...draftFilters, code: e.target.value })}
                            placeholder="Filtrar por código do produto"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={draftFilters.name}
                            onChange={(e) => setDraftFilters({ ...draftFilters, name: e.target.value })}
                            placeholder="Filtrar por nome do produto"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Fornecedor</label>
                        <input
                            type="text"
                            value={draftFilters.supplier}
                            onChange={(e) => setDraftFilters({ ...draftFilters, supplier: e.target.value })}
                            placeholder="Filtrar por nome ou código do fornecedor"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={draftFilters.status}
                            onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value as StatusFilter })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="Todos os status">Todos os status</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                    </div>

                    <div className="mt-6 flex justify-between gap-3">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Limpar filtros
                        </button>
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]"
                        >
                            Aplicar filtros
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}