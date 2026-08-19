"use client";

import { useState, useEffect, FormEvent } from "react";
import { X } from "lucide-react";
import { DEFAULT_GROUP_PERCENTS } from "@/lib/groupCommissionAggregations";
import { upsertSellerGroupPercent } from "@/services/groupCommissionSettingsService";

interface EditGroupPercentModalProps {
    open: boolean;
    onClose: () => void;
    sellerCode: string;
    sellerName: string;
    groups: string[]; // ex: ["GRUPO1", "GRUPO2"]
    currentPercents: Record<string, number>; // percentual EFETIVO atual (customizado ou padrão) por grupo
    onSaved: () => Promise<void> | void;
}

export default function EditGroupPercentModal({
    open,
    onClose,
    sellerCode,
    sellerName,
    groups,
    currentPercents,
    onSaved,
}: EditGroupPercentModalProps) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        const initial: Record<string, string> = {};
        groups.forEach((g) => {
            const current = currentPercents[g] ?? DEFAULT_GROUP_PERCENTS[g] ?? 0;
            initial[g] = String(current);
        });
        setValues(initial);
    }, [open, groups, currentPercents]);

    if (!open) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            for (const group of groups) {
                const percent = Number(values[group]);
                if (Number.isNaN(percent)) continue;
                await upsertSellerGroupPercent({ sellerCode, group, percent });
            }
            await onSaved();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar percentuais de comissão por grupo:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#2d2d2d]">% de comissão por grupo</h2>
                        <p className="text-xs text-gray-500">
                            {sellerName} {sellerCode ? `(${sellerCode})` : ""}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                    Padrão da tabela: 3% sobre o GRUPO1 e 2% sobre o GRUPO2. Só mude aqui se este
                    vendedor tiver um percentual diferente combinado.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {groups.length === 0 && (
                        <p className="text-sm text-gray-400">
                            Nenhum grupo encontrado nos dados importados.
                        </p>
                    )}

                    {groups.map((group) => (
                        <div key={group}>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                {group} — % de comissão
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={values[group] ?? ""}
                                onChange={(e) =>
                                    setValues((prev) => ({ ...prev, [group]: e.target.value }))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    ))}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || groups.length === 0}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {saving ? "Salvando..." : "Salvar percentuais"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}