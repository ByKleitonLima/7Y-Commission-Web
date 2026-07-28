"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, SlidersHorizontal, User } from "lucide-react";
import StatusBadge from "@/components/statusBadge";
import Modal from "@/components/modal";

export interface Seller {
    id: string;
    supId: string;
    name: string;
    code: string;
    clientsCount: number;
    ordersCount: number;
    status: "Ativo" | "Inativo";
    photoUrl?: string;
}

type StatusFilter = "Todos os status" | "Ativos" | "Inativos";

interface ColumnFilters {
    supId: string;
    code: string;
    name: string;
    status: StatusFilter;
}

const EMPTY_FILTERS: ColumnFilters = {
    supId: "",
    code: "",
    name: "",
    status: "Todos os status",
};

interface SellersTableProps {
    sellers: Seller[];
    onEdit?: (seller: Seller) => void;
    onDelete?: (seller: Seller) => void;
}

export default function SellersTable({ sellers, onEdit, onDelete }: SellersTableProps) {
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

    const filtered = sellers.filter((s) => {
        const matchesSearch = `${s.name} ${s.code} ${s.supId}`
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesSupId =
            !filters.supId || (s.supId || "").toLowerCase().includes(filters.supId.toLowerCase());

        const matchesCode =
            !filters.code || (s.code || "").toLowerCase().includes(filters.code.toLowerCase());

        const matchesName =
            !filters.name || (s.name || "").toLowerCase().includes(filters.name.toLowerCase());

        const matchesStatus =
            filters.status === "Todos os status" ||
            (filters.status === "Ativos" && s.status === "Ativo") ||
            (filters.status === "Inativos" && s.status === "Inativo");

        return matchesSearch && matchesSupId && matchesCode && matchesName && matchesStatus;
    });

    return (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome, código ou ID Sup..."
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

            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                        <th className="px-4 py-3 font-medium">ID Sup</th>
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Clientes</th>
                        <th className="px-4 py-3 font-medium">Pedidos</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((seller) => (
                        <tr key={seller.id} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3 text-gray-500">{seller.supId}</td>
                            <td className="px-4 py-3 text-gray-500">{seller.code}</td>
                            <td className="px-4 py-3 font-semibold text-[#2d2d2d]">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                        {seller.photoUrl ? (
                                            <img src={seller.photoUrl} alt={seller.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <User className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
                                        )}
                                    </div>
                                    {seller.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500">{Number(seller.clientsCount) || 0}</td>
                            <td className="px-4 py-3 text-gray-500">{Number(seller.ordersCount) || 0}</td>
                            <td className="px-4 py-3">
                                <StatusBadge
                                    label={seller.status}
                                    variant={seller.status === "Ativo" ? "success" : "danger"}
                                />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEdit?.(seller)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                    >
                                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(seller)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}

                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                                Nenhum vendedor encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Modal open={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtrar vendedores">
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">ID Sup (gerente)</label>
                        <input
                            type="text"
                            value={draftFilters.supId}
                            onChange={(e) => setDraftFilters({ ...draftFilters, supId: e.target.value })}
                            placeholder="Filtrar por ID Sup"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                        <input
                            type="text"
                            value={draftFilters.code}
                            onChange={(e) => setDraftFilters({ ...draftFilters, code: e.target.value })}
                            placeholder="Filtrar por código do vendedor"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={draftFilters.name}
                            onChange={(e) => setDraftFilters({ ...draftFilters, name: e.target.value })}
                            placeholder="Filtrar por nome do vendedor"
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
                            <option value="Ativos">Ativos</option>
                            <option value="Inativos">Inativos</option>
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