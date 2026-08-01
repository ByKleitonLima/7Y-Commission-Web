"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import Modal from "@/components/modal";
import {
    DockOccupancy,
    upsertDockCapacity,
    upsertDockBlocked,
    DOCK_STATUS_COLORS,
    DOCK_STATUS_LABELS,
} from "@/services/wareHouseServices";

interface WarehouseModalProps {
    dock: DockOccupancy | null;
    onClose: () => void;
    onChanged: () => void;
}

export default function WarehouseModal({ dock, onClose, onChanged }: WarehouseModalProps) {
    const [capacityInput, setCapacityInput] = useState("");
    const [savingCapacity, setSavingCapacity] = useState(false);
    const [togglingBlock, setTogglingBlock] = useState(false);

    useEffect(() => {
        if (dock) setCapacityInput(String(dock.capacityMax));
    }, [dock]);

    if (!dock) return null;

    const isDoca = dock.type === "doca";

    const handleSaveCapacity = async () => {
        const parsed = Number(capacityInput);
        if (!parsed || parsed <= 0) return;
        setSavingCapacity(true);
        try {
            await upsertDockCapacity(dock.code, parsed);
            onChanged();
        } finally {
            setSavingCapacity(false);
        }
    };

    const handleToggleBlocked = async () => {
        setTogglingBlock(true);
        try {
            await upsertDockBlocked(dock.code, !dock.blocked);
            onChanged();
        } finally {
            setTogglingBlock(false);
        }
    };

    return (
        <Modal open={dock !== null} onClose={onClose} title={dock.code}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <span
                        className="h-3 w-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: DOCK_STATUS_COLORS[dock.status] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{DOCK_STATUS_LABELS[dock.status]}</span>
                    <span className="ml-auto text-xs text-gray-400">
                        Galpão {dock.galpao}{dock.rua ? ` · ${dock.rua}` : ""}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-[11px] text-gray-400">Itens / Tamanhos</p>
                        <p className="text-lg font-semibold text-[#2d2d2d]">{dock.productCount}</p>
                    </div>
                    {isDoca ? (
                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-[11px] text-gray-400">Capacidade</p>
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
                                    disabled={savingCapacity}
                                    className="rounded-md bg-[#2d2d2d] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#1f1f1f] disabled:opacity-60"
                                >
                                    {savingCapacity ? "..." : "Salvar"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 p-3">
                            <p className="text-[11px] text-gray-400">Tipo</p>
                            <p className="text-sm font-medium text-[#2d2d2d]">Posição</p>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleToggleBlocked}
                    disabled={togglingBlock}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${dock.blocked
                        ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                >
                    {dock.blocked ? (
                        <>
                            <Unlock className="h-4 w-4" strokeWidth={1.75} />
                            Desbloquear posição
                        </>
                    ) : (
                        <>
                            <Lock className="h-4 w-4" strokeWidth={1.75} />
                            Marcar como bloqueada
                        </>
                    )}
                </button>

                <div>
                    <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Produtos e Tamanhos nesta posição</p>
                    {dock.products.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
                            Nenhum item/tamanho vinculado.
                        </p>
                    ) : (
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {dock.products.map((p: any, idx: number) => (
                                <div key={p.id || idx} className="rounded-lg border border-gray-100 p-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-[#2d2d2d]">
                                            {p.name} {p.sizeName ? `(Tam: ${p.sizeName})` : ""}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
                                            {p.sizeCode || p.product_code}
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