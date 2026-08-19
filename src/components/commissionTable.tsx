"use client";

import { useMemo, useState, ChangeEvent } from "react";
import { ChevronUp, ChevronDown, Search, Pencil, Percent } from "lucide-react";

export interface CommissionRow {
    code: string;
    name: string;
    subtitle: string;
    netRevenue: number;
    commission: number;
    effectivePercent: number;
    extraValue: number;
    orders: number;
    hasOverride?: boolean;
    originalCommission?: number;
    originalPercent?: number;
    // Valor lançado na tela de Descontos (seller_discounts) já abatido
    // do "commission" acima. Só existe para linhas de vendedor.
    manualDiscount?: number;
}

type SortKey = "netRevenue" | "commission" | "effectivePercent" | "extraValue" | "orders";

interface CommissionTableProps {
    title: string;
    rows: CommissionRow[];
    nameColumnLabel: string;
    subtitleColumnLabel: string;
    extraColumnLabel: string;
    searchPlaceholder: string;
    emptyLabel: string;
    onEdit?: (row: CommissionRow) => void;
    // Só usado na aba de Vendedores: abre o modal de % por grupo
    // (GRUPO1/GRUPO2) daquele vendedor específico.
    onEditGroupPercent?: (row: CommissionRow) => void;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const percentFmt = (v: number) => `${(v || 0).toFixed(2)}%`;

export default function CommissionTable({
    title,
    rows,
    nameColumnLabel,
    subtitleColumnLabel,
    extraColumnLabel,
    searchPlaceholder,
    emptyLabel,
    onEdit,
    onEditGroupPercent,
}: CommissionTableProps) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("commission");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const filteredSorted = useMemo(() => {
        const query = search.trim().toLowerCase();
        const filtered = query
            ? rows.filter((r) => `${r.name} ${r.code} ${r.subtitle}`.toLowerCase().includes(query))
            : rows;

        return [...filtered].sort((a, b) => {
            const diff = a[sortKey] - b[sortKey];
            return sortDir === "asc" ? diff : -diff;
        });
    }, [rows, search, sortKey, sortDir]);

    const hasActionsColumn = Boolean(onEdit || onEditGroupPercent);

    const SortHeader = ({ label, sortField }: { label: string; sortField: SortKey }) => (
        <th className="px-4 py-3 font-medium">
            <button
                type="button"
                onClick={() => toggleSort(sortField)}
                className="flex items-center gap-1 hover:text-[#2d2d2d]"
            >
                {label}
                {sortKey === sortField &&
                    (sortDir === "asc" ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    ))}
            </button>
        </th>
    );

    return (
        <div className="mt-8">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">{title}</h2>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                <input
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                />
            </div>

            <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                            <th className="px-4 py-3 font-medium">{nameColumnLabel}</th>
                            <th className="px-4 py-3 font-medium">{subtitleColumnLabel}</th>
                            <SortHeader label="Faturamento Líquido" sortField="netRevenue" />
                            <SortHeader label="Comissão Paga" sortField="commission" />
                            <SortHeader label="% Efetivo" sortField="effectivePercent" />
                            <SortHeader label={extraColumnLabel} sortField="extraValue" />
                            <SortHeader label="Pedidos" sortField="orders" />
                            {hasActionsColumn && <th className="px-4 py-3 font-medium">Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSorted.map((r) => (
                            <tr key={r.code} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                <td className="px-4 py-3 font-semibold text-[#2d2d2d]">
                                    {r.name}
                                    <div className="text-xs font-normal text-gray-400">{r.code || "-"}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{r.subtitle || "-"}</td>
                                <td className="px-4 py-3 text-gray-700">{currencyFmt(r.netRevenue)}</td>
                                <td className="px-4 py-3 font-semibold text-emerald-700">
                                    {currencyFmt(r.commission)}
                                    {r.hasOverride && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                            Ajustado
                                        </span>
                                    )}
                                    {!!r.manualDiscount && r.manualDiscount > 0 && (
                                        <div className="mt-0.5 text-[11px] font-normal text-red-500">
                                            − {currencyFmt(r.manualDiscount)} desconto (Devoluções)
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-700">{percentFmt(r.effectivePercent)}</td>
                                <td className="px-4 py-3 text-gray-500">
                                    {extraColumnLabel === "Prêmio" ? currencyFmt(r.extraValue) : numberFmt(r.extraValue)}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{r.orders.toLocaleString("pt-BR")}</td>
                                {hasActionsColumn && (
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {onEditGroupPercent && (
                                                <button
                                                    onClick={() => onEditGroupPercent(r)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                                    title="Definir % de comissão por grupo (GRUPO1/GRUPO2)"
                                                >
                                                    <Percent className="h-4 w-4" strokeWidth={1.75} />
                                                </button>
                                            )}
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(r)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                                    title="Ajustar valor final da comissão"
                                                >
                                                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}

                        {filteredSorted.length === 0 && (
                            <tr>
                                <td colSpan={hasActionsColumn ? 8 : 7} className="px-4 py-8 text-center text-sm text-gray-400">
                                    {emptyLabel}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}