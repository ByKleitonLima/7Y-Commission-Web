"use client";

import { Pencil, Trash2 } from "lucide-react";
import { ManualDiscount } from "@/services/discountService";

interface ManualDiscountsTableProps {
    discounts: ManualDiscount[];
    onEdit: (discount: ManualDiscount) => void;
    onDelete: (discount: ManualDiscount) => void;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(dateStr: string) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

export default function ManualDiscountsTable({ discounts, onEdit, onDelete }: ManualDiscountsTableProps) {
    return (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-4">
                <h2 className="text-sm font-semibold text-[#2d2d2d]">Descontos manuais lançados</h2>
            </div>

            {/* ---- MOBILE: cards ---- */}
            <div className="divide-y divide-gray-100 md:hidden">
                {discounts.map((d) => (
                    <div key={d.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2d2d2d]">{d.sellerName}</p>
                                <p className="text-xs text-gray-500">Código: {d.sellerCode || "-"}</p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-red-600">{currencyFmt(d.amount)}</span>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                            <p>Data: <span className="font-medium text-gray-700">{formatDate(d.discountDate)}</span></p>
                            {d.reason && <p className="mt-1">Motivo: <span className="font-medium text-gray-700">{d.reason}</span></p>}
                        </div>

                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => onEdit(d)}
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                Editar
                            </button>
                            <button
                                onClick={() => onDelete(d)}
                                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}

                {discounts.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum desconto manual lançado ainda.
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
                            <th className="px-4 py-3 font-medium">Valor</th>
                            <th className="px-4 py-3 font-medium">Data</th>
                            <th className="px-4 py-3 font-medium">Motivo</th>
                            <th className="px-4 py-3 font-medium">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {discounts.map((d) => (
                            <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-[#2d2d2d]">{d.sellerName}</td>
                                <td className="px-4 py-3 text-gray-500">{d.sellerCode || "-"}</td>
                                <td className="px-4 py-3 font-semibold text-red-600">{currencyFmt(d.amount)}</td>
                                <td className="px-4 py-3 text-gray-500">{formatDate(d.discountDate)}</td>
                                <td className="px-4 py-3 text-gray-500">{d.reason || "-"}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onEdit(d)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                        >
                                            <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(d)}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {discounts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                                    Nenhum desconto manual lançado ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}