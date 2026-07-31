"use client";

import React from "react";
import { DockOccupancy, DOCK_STATUS_LABELS } from "@/services/wareHouseServices";

interface WarehouseTooltipProps {
    dock: DockOccupancy;
    x: number;
    y: number;
}

export default function WarehouseTooltip({ dock, x, y }: WarehouseTooltipProps) {
    const levels = dock.levels || [
        { level: 4, status: "vazio" },
        { level: 3, status: "vazio" },
        { level: 2, status: "vazio" },
        { level: 1, status: "vazio" },
    ];

    return (
        <div
            style={{
                left: `${x + 15}px`,
                top: `${y + 15}px`,
            }}
            className="pointer-events-none fixed z-50 min-w-[220px] rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm"
        >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                <span className="font-bold text-slate-100">{dock.code}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    {dock.rua || "GALPÃO 01"}
                </span>
            </div>

            <div className="mb-2.5 flex items-center justify-between text-slate-300">
                <span>Status:</span>
                <span className="font-semibold text-emerald-400">
                    {DOCK_STATUS_LABELS[dock.status]}
                </span>
            </div>

            {/* Visualização dos 4 Níveis de Paletes */}
            <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Níveis de Armazenamento (Toalhas)
                </div>
                {[...levels].reverse().map((lvl) => {
                    const isOccupied = dock.productCount >= lvl.level;
                    return (
                        <div
                            key={lvl.level}
                            className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${isOccupied
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-400"
                                }`}
                        >
                            <span className="font-medium">Nível {lvl.level}</span>
                            <span>{isOccupied ? "Palete Presente" : "Vazio"}</span>
                        </div>
                    );
                })}
            </div>

            {dock.products && dock.products.length > 0 && (
                <div className="mt-2.5 border-t border-slate-800 pt-1.5 text-[11px] text-slate-300">
                    <span className="text-slate-400">Produtos armazenados:</span> {dock.products.length} item(s)
                </div>
            )}
        </div>
    );
}