"use client";

import { useMemo, useState } from "react";
import { Search, Eye, Plus } from "lucide-react";

export interface DiscountSummaryRow {
    sellerCode: string;
    sellerName: string;
    automaticCount: number;
    automaticValue: number;
    manualCount: number;
    manualValue: number;
    totalValue: number;
}

interface DiscountsSummaryTableProps {
    rows: DiscountSummaryRow[];
    onViewOrders: (sellerCode: string) => void;
    onAddManual: (row: DiscountSummaryRow) => void;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DiscountsSummaryTable({ rows, onViewOrders, onAddManual }: DiscountsSummaryTableProps) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return rows;
        return rows.filter((r) => `${r.sellerName} ${r.sellerCode}`.toLowerCase().includes(query));
    }, [rows, search]);

    return (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou código do vendedor..."
                        className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* ---- MOBILE: cards ---- */}
            <div className="divide-y divide-gray-100 md:hidden">
                {filtered.map((r) => (
                    <div key={r.sellerCode || r.sellerName} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2d2d2d]">{r.sellerName}</p>
                                <p className="text-xs text-gray-500">Código: {r.sellerCode || "-"}</p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-red-600">
                                {currencyFmt(r.totalValue)}
                            </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p className="text-gray-400">Devoluções (auto)</p>
                                <p className="font-medium text-gray-700">
                                    {currencyFmt(r.automaticValue)}
                                    <span className="ml-1 text-gray-400">({r.automaticCount})</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400">Descontos manuais</p>
                                <p className="font-medium text-gray-700">
                                    {currencyFmt(r.manualValue)}
                                    <span className="ml-1 text-gray-400">({r.manualCount})</span>
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => onViewOrders(r.sellerCode)}
                                disabled={r.automaticCount === 0}
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                            >
                                <Eye className="h-4 w-4" strokeWidth={1.75} />
                                Pedidos
                            </button>
                            <button
                                onClick={() => onAddManual(r)}
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                <Plus className="h-4 w-4" strokeWidth={1.75} />
                                Desconto
                            </button>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum vendedor com desconto encontrado.
                    </div>
                )}
            </div>

            {/* ---- DESKTOP: tabela ---- */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                            <th className="px-4 py-3 font-medium">Vendedor</th>
                            <th className="px-4 py-3 font-medium">Código</th>
                            <th className="px-4 py-3 font-medium">Devoluções (automático)</th>
                            <th className="px-4 py-3 font-medium">Descontos manuais</th>
                            <th className="px-4 py-3 font-medium">Total descontado</th>
                            <th className="px-4 py-3 font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.sellerCode || r.sellerName} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-[#2d2d2d]">{r.sellerName}</td>
                                <td className="px-4 py-3 text-gray-500">{r.sellerCode || "-"}</td>
                                <td className="px-4 py-3 text-gray-700">
                                    {currencyFmt(r.automaticValue)}
                                    <span className="ml-1 text-xs text-gray-400">({r.automaticCount} pedido(s))</span>
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    {currencyFmt(r.manualValue)}
                                    <span className="ml-1 text-xs text-gray-400">({r.manualCount} lançamento(s))</span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-red-600">{currencyFmt(r.totalValue)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onViewOrders(r.sellerCode)}
                                            disabled={r.automaticCount === 0}
                                            title="Ver pedidos de devolução"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                        <button
                                            onClick={() => onAddManual(r)}
                                            title="Adicionar desconto manual"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                        >
                                            <Plus className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                                    Nenhum vendedor com desconto encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}