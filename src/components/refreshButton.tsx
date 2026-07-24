"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";

interface RefreshButtonProps {
    onRefresh?: () => void;
}

export default function RefreshButton({ onRefresh }: RefreshButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = () => {
        if (loading) return;

        setLoading(true);
        onRefresh?.();

        setTimeout(() => setLoading(false), 800);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="flex w-[150px] h-10 justify-center items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
        >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
            Atualizar
        </button>
    );
}