"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, SlidersHorizontal, Building2 } from "lucide-react";
import StatusBadge from "@/components/statusBadge";
import Modal from "@/components/modal";

export interface Supplier {
    id: string;
    supplier_code: string;
    name: string;
    status: "Ativo" | "Inativo";
    avatar_url?: string | null;
    productsCount?: number;
    categories?: string[];
}

type StatusFilter = "Todos os status" | "Ativo" | "Inativo";

interface ColumnFilters {
    code: string;
    name: string;
    category: string;
    status: StatusFilter;
}

const EMPTY_FILTERS: ColumnFilters = {
    code: "",
    name: "",
    category: "",
    status: "Todos os status",
};

interface SuppliersTableProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({ suppliers, onEdit, onDelete }: SuppliersTableProps) {
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

    const filtered = suppliers.filter((s) => {
        const matchesSearch = `${s.name || ""} ${s.supplier_code || ""} ${(s.categories || []).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesCode =
            !filters.code || (s.supplier_code || "").toLowerCase().includes(filters.code.toLowerCase());

        const matchesName =
            !filters.name || (s.name || "").toLowerCase().includes(filters.name.toLowerCase());

        const matchesCategory =
            !filters.category ||
            (s.categories || []).some((c) => c.toLowerCase().includes(filters.category.toLowerCase()));

        const matchesStatus = filters.status === "Todos os status" || s.status === filters.status;

        return matchesSearch && matchesCode && matchesName && matchesCategory && matchesStatus;
    });

    if (suppliers.length === 0) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                Nenhum fornecedor encontrado.
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
                        placeholder="Buscar por nome, código/CNPJ ou categoria..."
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
                        <th className="px-6 py-3 font-medium">Fornecedor</th>
                        <th className="px-6 py-3 font-medium">Código / CNPJ</th>
                        <th className="px-6 py-3 font-medium">Categorias</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 text-center font-medium">Produtos Vinculados</th>
                        <th className="px-6 py-3 text-right font-medium">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filtered.map((supplier) => (
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
                                {supplier.categories && supplier.categories.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {supplier.categories.map((c) => (
                                            <span
                                                key={c}
                                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    "-"
                                )}
                            </td>

                            <td className="px-6 py-4">
                                <StatusBadge
                                    label={supplier.status}
                                    variant={supplier.status === "Ativo" ? "success" : "danger"}
                                />
                            </td>

                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                                {supplier.productsCount ?? 0}
                            </td>

                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onEdit(supplier)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                        title="Editar"
                                    >
                                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja remover o fornecedor "${supplier.name}"?`)) {
                                                onDelete(supplier);
                                            }
                                        }}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">
                                Nenhum fornecedor encontrado para os filtros selecionados.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Modal open={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtrar fornecedores">
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código / CNPJ</label>
                        <input
                            type="text"
                            value={draftFilters.code}
                            onChange={(e) => setDraftFilters({ ...draftFilters, code: e.target.value })}
                            placeholder="Filtrar por código ou CNPJ"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={draftFilters.name}
                            onChange={(e) => setDraftFilters({ ...draftFilters, name: e.target.value })}
                            placeholder="Filtrar por nome do fornecedor"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
                        <input
                            type="text"
                            value={draftFilters.category}
                            onChange={(e) => setDraftFilters({ ...draftFilters, category: e.target.value })}
                            placeholder="Filtrar por categoria de atuação"
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