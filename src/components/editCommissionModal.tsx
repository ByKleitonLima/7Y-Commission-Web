"use client";

import { useState, useEffect, FormEvent } from "react";
import { X, RotateCcw } from "lucide-react";
import { CommissionRow } from "@/components/commissionTable";

interface EditCommissionModalProps {
    open: boolean;
    onClose: () => void;
    row: CommissionRow | null;
    onSave: (data: { overrideCommission: number | null; overridePercent: number | null; reason: string }) => Promise<void>;
    onReset: () => Promise<void>;
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EditCommissionModal({ open, onClose, row, onSave, onReset }: EditCommissionModalProps) {
    const [commissionValue, setCommissionValue] = useState<number | "">("");
    const [percentValue, setPercentValue] = useState<number | "">("");
    const [mode, setMode] = useState<"value" | "percent">("value");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!open || !row) return;
        setCommissionValue(Number(row.commission.toFixed(2)));
        setPercentValue(Number(row.effectivePercent.toFixed(2)));
        setMode("value");
        setReason("");
    }, [open, row]);

    if (!open || !row) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                overrideCommission: mode === "value" ? (commissionValue === "" ? null : Number(commissionValue)) : null,
                overridePercent: mode === "percent" ? (percentValue === "" ? null : Number(percentValue)) : null,
                reason: reason.trim(),
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setResetting(true);
        try {
            await onReset();
            onClose();
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[#2d2d2d]">Ajustar comissão</h2>
                        <p className="text-xs text-gray-500">{row.name} {row.code ? `(${row.code})` : ""}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                    <p>Faturamento líquido: <span className="font-medium text-gray-700">{currencyFmt(row.netRevenue)}</span></p>
                    <p>Valor calculado automaticamente pela planilha: <span className="font-medium text-gray-700">{currencyFmt(row.originalCommission ?? row.commission)}</span> ({(row.originalPercent ?? row.effectivePercent).toFixed(2)}%)</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMode("value")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === "value" ? "border-[#2d2d2d] bg-[#2d2d2d] text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                        >
                            Definir valor (R$)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("percent")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === "percent" ? "border-[#2d2d2d] bg-[#2d2d2d] text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                        >
                            Definir % efetivo
                        </button>
                    </div>

                    {mode === "value" ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Valor final da comissão (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Percentual efetivo (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={percentValue}
                                onChange={(e) => setPercentValue(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Motivo do ajuste</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                            placeholder="Ex: correção manual referente a..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                        {row.hasOverride ? (
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={resetting}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                            >
                                <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                                {resetting ? "Restaurando..." : "Restaurar valor original"}
                            </button>
                        ) : <span />}

                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                            >
                                {saving ? "Salvando..." : "Salvar ajuste"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}