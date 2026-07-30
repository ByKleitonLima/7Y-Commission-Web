"use client";

import { DOCK_STATUS_COLORS, DOCK_STATUS_LABELS, DockStatus } from "@/services/wareHouseServices";

const ORDER: DockStatus[] = ["vazia", "baixa", "media", "alta"];

export default function WarehouseLegend() {
    return (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Legenda</span>
            {ORDER.map((status) => (
                <div key={status} className="flex items-center gap-2">
                    <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: DOCK_STATUS_COLORS[status] }}
                    />
                    <span className="text-xs text-gray-600">{DOCK_STATUS_LABELS[status]}</span>
                </div>
            ))}
        </div>
    );
}