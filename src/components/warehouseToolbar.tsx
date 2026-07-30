"use client";

import { Plus, Minus, RotateCcw } from "lucide-react";

interface WarehouseToolbarProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

export default function WarehouseToolbar({ onZoomIn, onZoomOut, onReset }: WarehouseToolbarProps) {
    return (
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
                type="button"
                onClick={onZoomOut}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
                title="Diminuir zoom"
            >
                <Minus className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
                type="button"
                onClick={onReset}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
                title="Restaurar visualização"
            >
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
                type="button"
                onClick={onZoomIn}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
                title="Aumentar zoom"
            >
                <Plus className="h-4 w-4" strokeWidth={1.75} />
            </button>
        </div>
    );
}