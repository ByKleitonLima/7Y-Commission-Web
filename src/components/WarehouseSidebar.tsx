"use client";

import WarehouseSearch from "@/components/warehouseSearch";
import WarehouseLegend from "@/components/warehouseLegend";
import WarehouseStatistics from "@/components/warehouseStatistics";
import { DockOccupancy } from "@/services/wareHouseServices";

interface WarehouseSidebarProps {
    docks: DockOccupancy[];
    onSelectDock: (code: string) => void;
}

export default function WarehouseSidebar({ docks, onSelectDock }: WarehouseSidebarProps) {
    return (
        <div className="flex flex-col gap-4">
            <WarehouseSearch docks={docks} onSelectDock={onSelectDock} />
            <WarehouseStatistics docks={docks} />
            <WarehouseLegend />
        </div>
    );
}