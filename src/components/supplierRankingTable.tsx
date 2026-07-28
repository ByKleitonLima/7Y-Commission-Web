"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { SupplierAggregate } from "@/lib/salesAggregations";

interface SupplierRankingTableProps {
    suppliers: (SupplierAggregate & { region?: string })[];
}

type SortKey = "netRevenue" | "grossRevenue" | "quantity" | "fardos";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
    { key: "quantity", label: "Qtd (pacotes)", format: numberFmt },
    { key: "fardos", label: "Fardos", format: numberFmt },
    { key: "grossRevenue", label: "Receita Bruta", format: currencyFmt },
    { key: "netRevenue", label: "Receita Líquida", format: currencyFmt },
];

export default function SupplierRankingTable({ suppliers }: SupplierRankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("netRevenue");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        return [...suppliers].sort((a, b) => {
            const diff = a[sortKey] - b[sortKey];
            return sortDir === "asc" ? diff : -diff;
        });
    }, [suppliers, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    return (
        <div className="mt-8">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                Fornecedores 
            </h2>

            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                            <th className="px-4 py-3 font-medium">Fornecedor</th>
                            <th className="px-4 py-3 font-medium">Região</th>
                            {COLUMNS.map((c) => (
                                <th key={c.key} className="px-4 py-3 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(c.key)}
                                        className="flex items-center gap-1 hover:text-[#2d2d2d]"
                                    >
                                        {c.label}
                                        {sortKey === c.key &&
                                            (sortDir === "asc" ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            ))}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s) => (
                            <tr key={s.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                <td className="px-4 py-3 font-semibold text-[#2d2d2d]">{s.name}</td>
                                <td className="px-4 py-3 text-gray-500">{s.region || "—"}</td>
                                {COLUMNS.map((c) => (
                                    <td key={c.key} className="px-4 py-3 text-gray-500">
                                        {c.format(s[c.key])}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length + 2} className="px-4 py-8 text-center text-sm text-gray-400">
                                    Nenhum fornecedor encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}