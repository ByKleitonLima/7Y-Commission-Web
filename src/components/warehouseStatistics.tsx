"use client";

import { memo } from "react";
import StatCard from "@/components/statCard";
import { DockOccupancy } from "@/services/wareHouseServices";

interface WarehouseStatisticsProps {
    docks: DockOccupancy[];
}

function WarehouseStatistics({ docks }: WarehouseStatisticsProps) {
    const totalDocks = docks.length;
    const ocupadas = docks.filter((d) => d.productCount > 0).length;
    const vazias = totalDocks - ocupadas;
    const produtosArmazenados = docks.reduce((sum, d) => sum + d.productCount, 0);
    const capacidadeUtilizada =
        totalDocks > 0
            ? docks.reduce((sum, d) => sum + d.occupancyPercent, 0) / totalDocks
            : 0;

    return (
        <div className="flex flex-wrap gap-6">
            <StatCard label="Total de Docas" value={totalDocks} />
            <StatCard label="Docas Ocupadas" value={ocupadas} />
            <StatCard label="Docas Vazias" value={vazias} />
            <StatCard label="Produtos Armazenados" value={produtosArmazenados} />
            <StatCard label="Capacidade Utilizada" value={`${capacidadeUtilizada.toFixed(0)}%`} />
        </div>
    );
}

export default memo(WarehouseStatistics);