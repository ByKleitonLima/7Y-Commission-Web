"use client";

import { memo } from "react";
import StatCard from "@/components/statCard";
import { DockOccupancy } from "@/services/wareHouseServices";

interface WarehouseStatisticsProps {
    docks: DockOccupancy[];
}

function WarehouseStatisticsBase({ docks }: WarehouseStatisticsProps) {
    const total = docks.length;
    const ocupadas = docks.filter((d) => d.status === "ocupado").length;
    const bloqueadas = docks.filter((d) => d.status === "bloqueado").length;
    const livres = docks.filter((d) => d.status === "livre").length;
    const produtosArmazenados = docks.reduce((sum, d) => sum + d.productCount, 0);

    return (
        <div className="flex flex-col gap-4">
            <StatCard label="Total de posições" value={total} />
            <StatCard label="Ocupadas" value={ocupadas} />
            <StatCard label="Bloqueadas" value={bloqueadas} />
            <StatCard label="Livres" value={livres} />
            <StatCard label="Produtos armazenados" value={produtosArmazenados} />
        </div>
    );
}

export default memo(WarehouseStatisticsBase);