"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/modal";
import { DockOccupancy, upsertDockCapacity, DOCK_STATUS_COLORS, DOCK_STATUS_LABELS } from "@/services/wareHouseServices";

interface DockModalProps {
    dock: DockOccupancy | null;
    onClose: () => void;
    onCapacityChanged: () => void;
}

export default function DockModal({ dock, onClose, onCapacityChanged }: DockModalProps) {
    const [capacityInput, setCapacityInput] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (dock) setCapacityInput(String(dock.capacityMax));
    }, [dock]);

    if (!dock) return null;

    const handleSaveCapacity = async () => {
        const parsed = Number(capacityInput);
        if (!parsed || parsed <= 0) return;
        try {
            setSaving(true);
            await upsertDockCapacity(dock.code, parsed);
            onCapacityChanged();
        } catch (err) {
            console.error("Erro ao atualizar capacidade da doca:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={dock !== null} onClose={onClose} title={dock.code}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: DOCK_STATUS_COLORS[dock.status] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{DOCK_STATUS_LABELS[dock.status]}</span>
                    <span className="ml-auto text-sm font-semibold text-[#2d2d2d]">
                        {dock.occupancyPercent.toFixed(0)}% ocupado
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-[11px] text-gray-400">Produtos nesta doca</p>
                        <p className="text-lg font-semibold text-[#2d2d2d]">{dock.productCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-[11px] text-gray-400">Capacidade (SKUs)</p>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                type="number"
                                min={1}
                                value={capacityInput}
                                onChange={(e) => setCapacityInput(e.target.value)}
                                className="h-8 w-20 rounded-md border border-gray-300 px-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                            />
                            <button
                                type="button"
                                onClick={handleSaveCapacity}
                                disabled={saving}
                                className="rounded-md bg-[#2d2d2d] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1f1f1f] disabled:opacity-60"
                            >
                                {saving ? "..." : "Salvar"}
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Produtos armazenados</p>
                    {dock.products.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
                            Nenhum produto vinculado a esta doca.
                        </p>
                    ) : (
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {dock.products.map((p) => (
                                <div key={p.id} className="rounded-lg border border-gray-100 p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-[#2d2d2d]">{p.name}</span>
                                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
                                            {p.product_code}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                        <span>{p.supplier_name || "Sem fornecedor"}</span>
                                        <span className="font-semibold text-gray-700">
                                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price || 0)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}