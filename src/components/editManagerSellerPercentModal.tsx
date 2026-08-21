// src/components/editManagerSellerPercentModal.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { X } from "lucide-react";
import { ManagerSellerContribution } from "@/lib/groupCommissionAggregations";
import { upsertManagerSellerPercent, deleteManagerSellerPercent } from "@/services/managerSellerCommissionService";
import { upsertSellerFlatPercent, deleteSellerFlatPercent } from "@/services/sellerFlatCommissionService";

interface EditManagerSellerPercentModalProps {
    open: boolean;
    onClose: () => void;
    supervisorId: string;
    managerName: string;
    sellerContributions: ManagerSellerContribution[];
    // sellerCode -> % flat customizado atual (undefined = sem override)
    currentFlatPercents: Record<string, number | undefined>;
    onSaved: () => Promise<void> | void;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EditManagerSellerPercentModal({
    open,
    onClose,
    supervisorId,
    managerName,
    sellerContributions,
    currentFlatPercents,
    onSaved,
}: EditManagerSellerPercentModalProps) {
    const [managerPercents, setManagerPercents] = useState<Record<string, string>>({});
    const [flatPercents, setFlatPercents] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        const initialManager: Record<string, string> = {};
        const initialFlat: Record<string, string> = {};
        sellerContributions.forEach((s) => {
            initialManager[s.sellerCode] = s.isCustomPercent ? String(s.percent) : "";
            const flat = currentFlatPercents[s.sellerCode];
            initialFlat[s.sellerCode] = flat !== undefined ? String(flat) : "";
        });
        setManagerPercents(initialManager);
        setFlatPercents(initialFlat);
    }, [open, sellerContributions, currentFlatPercents]);

    if (!open) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            for (const s of sellerContributions) {
                const managerRaw = managerPercents[s.sellerCode] ?? "";
                const flatRaw = flatPercents[s.sellerCode] ?? "";

                // % do gerente sobre este vendedor
                if (managerRaw.trim() === "") {
                    await deleteManagerSellerPercent(s.sellerCode);
                } else {
                    const percent = Number(managerRaw);
                    if (!Number.isNaN(percent)) {
                        await upsertManagerSellerPercent({ supervisorId, sellerCode: s.sellerCode, percent });
                    }
                }

                // % flat do vendedor (sobre o faturamento líquido dele)
                if (flatRaw.trim() === "") {
                    await deleteSellerFlatPercent(s.sellerCode);
                } else {
                    const percent = Number(flatRaw);
                    if (!Number.isNaN(percent)) {
                        await upsertSellerFlatPercent({ sellerCode: s.sellerCode, percent });
                    }
                }
            }
            await onSaved();
            onClose();
        } catch (err) {
            console.error("Erro ao salvar percentuais do gerente/vendedores:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#2d2d2d]">% por vendedor</h2>
                        <p className="text-xs text-gray-500">
                            {managerName} {supervisorId ? `(ID Sup ${supervisorId})` : ""}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500 leading-relaxed">
                    Deixe os campos em branco para usar o padrão (vendedor: cálculo por GRUPO1/GRUPO2;
                    gerente: 1/4 da comissão do vendedor). Preenchendo "% flat vendedor", a comissão desse
                    vendedor passa a ser <strong>faturamento líquido × esse %</strong>. Preenchendo "% gerente",
                    a contribuição desse vendedor na comissão do gerente passa a ser{" "}
                    <strong>faturamento líquido do vendedor × esse %</strong>.
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-semibold uppercase text-gray-400">
                        <div className="col-span-4">Vendedor</div>
                        <div className="col-span-3 text-right">Faturamento líquido</div>
                        <div className="col-span-2">% flat vendedor</div>
                        <div className="col-span-3">% gerente sobre ele</div>
                    </div>

                    {sellerContributions.map((s) => (
                        <div
                            key={s.sellerCode}
                            className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-100 p-2.5"
                        >
                            <div className="col-span-4 min-w-0">
                                <p className="truncate text-sm font-medium text-[#2d2d2d]">{s.sellerName}</p>
                                <p className="text-[11px] text-gray-400">{s.sellerCode}</p>
                            </div>
                            <div className="col-span-3 text-right text-xs text-gray-600">
                                {currencyFmt(s.netRevenue)}
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    placeholder="padrão"
                                    value={flatPercents[s.sellerCode] ?? ""}
                                    onChange={(e) =>
                                        setFlatPercents((prev) => ({ ...prev, [s.sellerCode]: e.target.value }))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    placeholder="padrão (1/4)"
                                    value={managerPercents[s.sellerCode] ?? ""}
                                    onChange={(e) =>
                                        setManagerPercents((prev) => ({ ...prev, [s.sellerCode]: e.target.value }))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                                />
                            </div>
                        </div>
                    ))}

                    {sellerContributions.length === 0 && (
                        <p className="py-6 text-center text-sm text-gray-400">
                            Nenhum vendedor encontrado para este gerente no período selecionado.
                        </p>
                    )}

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
                            disabled={saving || sellerContributions.length === 0}
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