"use client";

import { DockOccupancy } from "@/services/wareHouseServices";

interface DockTooltipProps {
    dock: DockOccupancy;
    x: number;
    y: number;
}

export default function DockTooltip({ dock, x, y }: DockTooltipProps) {
    return (
        <div
            className="pointer-events-none absolute z-30 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 10px))" }}
        >
            <p className="text-sm font-semibold text-[#2d2d2d]">{dock.code}</p>
            <p className="mb-2 text-[11px] text-gray-400">Produtos armazenados</p>

            {dock.products.length === 0 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Doca vazia</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {dock.products.slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-gray-700">{p.name}</span>
                            <span className="shrink-0 text-gray-400">{p.product_code}</span>
                        </div>
                    ))}
                    {dock.products.length > 5 && (
                        <span className="text-[11px] text-gray-400">
                            + {dock.products.length - 5} produto(s)
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}