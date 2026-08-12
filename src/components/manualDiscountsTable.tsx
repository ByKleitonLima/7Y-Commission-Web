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
    );
}