"use client";

import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, SlidersHorizontal } from "lucide-react";
import StatusBadge from "@/components/statusBadge";
import Modal from "@/components/modal";

export interface Client {
    id: string;
    supId?: string;
    sellerName?: string;
    sellerCode?: string;
    code: string;
    name: string;
    region?: string;
    ordersCount?: number;
    status: "Ativo" | "Inativo";
}

type ProfileFilter = "Todos os status" | "Ativo" | "Inativo";

interface ColumnFilters {
    supId: string;
    sellerCode: string;
    code: string;
    name: string;
    region: string;
    status: ProfileFilter;
}

const EMPTY_FILTERS: ColumnFilters = {
    supId: "",
    sellerCode: "",
    code: "",
    name: "",
    region: "",
    status: "Todos os status",
};

interface ClientsTableProps {
    clients: Client[];
    onEdit?: (client: Client) => void;
    onDelete?: (client: Client) => void;
}

export default function ClientsTable({ clients, onEdit, onDelete }: ClientsTableProps) {
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

    const filtered = clients.filter((client) => {
        const matchesSearch = `${client.name || ""} ${client.code || ""} ${client.supId || ""} ${client.sellerCode || ""} ${client.region || ""}`
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesSupId =
            !filters.supId || (client.supId || "").toLowerCase().includes(filters.supId.toLowerCase());

        const matchesSellerCode =
            !filters.sellerCode ||
            `${client.sellerCode || ""} ${client.sellerName || ""}`
                .toLowerCase()
                .includes(filters.sellerCode.toLowerCase());

        const matchesCode =
            !filters.code || (client.code || "").toLowerCase().includes(filters.code.toLowerCase());

        const matchesName =
            !filters.name || (client.name || "").toLowerCase().includes(filters.name.toLowerCase());

        const matchesRegion =
            !filters.region || (client.region || "").toLowerCase().includes(filters.region.toLowerCase());

        const matchesStatus = filters.status === "Todos os status" || client.status === filters.status;

        return (
            matchesSearch &&
            matchesSupId &&
            matchesSellerCode &&
            matchesCode &&
            matchesName &&
            matchesRegion &&
            matchesStatus
        );
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
                        <th className="px-4 py-3 font-medium">Vendedor</th>
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">Região</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((client) => (
                        <tr key={client.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-gray-500">{client.supId || "-"}</td>
                            <td className="px-4 py-3 text-gray-500">{client.sellerCode || client.sellerName || "-"}</td>
                            <td className="px-4 py-3 text-gray-500">{client.code || "-"}</td>
                            <td className="px-4 py-3 font-semibold text-[#2d2d2d]">{client.name}</td>
                            <td className="px-4 py-3 text-gray-500">{client.region || "-"}</td>
                            <td className="px-4 py-3">
                                <StatusBadge
                                    label={client.status || "Ativo"}
                                    variant={client.status === "Ativo" ? "success" : "danger"}
                                />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEdit?.(client)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                        title="Editar"
                                    >
                                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(client)}
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
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                                Nenhum cliente encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <Modal open={isFilterModalOpen} onClose={() => setFilterModalOpen(false)} title="Filtrar clientes">
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">ID Sup</label>
                        <input
                            type="text"
                            value={draftFilters.supId}
                            onChange={(e) => setDraftFilters({ ...draftFilters, supId: e.target.value })}
                            placeholder="Filtrar por ID Sup"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Vendedor</label>
                        <input
                            type="text"
                            value={draftFilters.sellerCode}
                            onChange={(e) => setDraftFilters({ ...draftFilters, sellerCode: e.target.value })}
                            placeholder="Filtrar por código ou nome do vendedor"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                        <input
                            type="text"
                            value={draftFilters.code}
                            onChange={(e) => setDraftFilters({ ...draftFilters, code: e.target.value })}
                            placeholder="Filtrar por código do cliente"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={draftFilters.name}
                            onChange={(e) => setDraftFilters({ ...draftFilters, name: e.target.value })}
                            placeholder="Filtrar por nome do cliente"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Região</label>
                        <input
                            type="text"
                            value={draftFilters.region}
                            onChange={(e) => setDraftFilters({ ...draftFilters, region: e.target.value })}
                            placeholder="Filtrar por região"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={draftFilters.status}
                            onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value as ProfileFilter })}
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