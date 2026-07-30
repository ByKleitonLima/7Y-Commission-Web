"use client";

import { DockOccupancy } from "@/services/wareHouseServices";

interface WarehouseTooltipProps {
    dock: DockOccupancy;
    x: number;
    y: number;
}

export default function WarehouseTooltip({ dock, x, y }: WarehouseTooltipProps) {
    return (
        <div
            className="pointer-events-none fixed z-[60] w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
            style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 12px))" }}
        >
            <p className="text-sm font-semibold text-[#2d2d2d]">{dock.code}</p>
            <p className="text-[11px] text-gray-400">
                Galpão {dock.galpao}{dock.rua ? ` · ${dock.rua}` : ""}
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                    <span>Produtos</span>
                    <span className="font-medium text-[#2d2d2d]">{dock.productCount}</span>
                </div>
                {dock.products[0] && (
                    <div className="flex justify-between gap-2">
                        <span className="truncate">{dock.products[0].name}</span>
                        <span className="shrink-0 text-gray-400">{dock.products[0].product_code}</span>
                    </div>
                )}
                {dock.products.length > 1 && (
                    <p className="text-[11px] text-gray-400">+ {dock.products.length - 1} outro(s)</p>
                )}
            </div>
        </div>
    );
}