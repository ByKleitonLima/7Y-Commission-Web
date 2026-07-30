"use client";

import { useMemo } from "react";
import { WAREHOUSE_ROOMS, WAREHOUSE_WALLS, WAREHOUSE_DOORS } from "@/lib/warehouseLayout";
import { DockOccupancy } from "@/services/wareHouseServices";
import WarehousePosition from "@/components/warehousePosition";

interface WarehouseSvgProps {
    docks: DockOccupancy[];
    highlightedDock: string | null;
    onDockClick: (dock: DockOccupancy) => void;
    onDockHoverStart: (dock: DockOccupancy, x: number, y: number) => void;
    onDockHoverEnd: () => void;
}

interface StreetGroup {
    rua: string;
    galpao: 1 | 2;
    labelX: number;
    labelY: number;
}

export default function WarehouseSvg({
    docks,
    highlightedDock,
    onDockClick,
    onDockHoverStart,
    onDockHoverEnd,
}: WarehouseSvgProps) {
    const streetGroups = useMemo<StreetGroup[]>(() => {
        const map = new Map<string, { galpao: 1 | 2; minX: number; minY: number }>();

        docks.forEach((d) => {
            if (!d.rua) return;
            const key = `${d.galpao}-${d.rua}`;
            const current = map.get(key);
            if (!current) {
                map.set(key, { galpao: d.galpao, minX: d.x, minY: d.y });
            } else {
                current.minX = Math.min(current.minX, d.x);
                current.minY = Math.min(current.minY, d.y);
            }
        });

        return Array.from(map.entries()).map(([key, value]) => ({
            rua: key.split("-").slice(1).join("-"),
            galpao: value.galpao,
            labelX: value.minX,
            labelY: value.minY - 6,
        }));
    }, [docks]);

    return (
        <>
            {WAREHOUSE_ROOMS.map((room) => (
                <g key={room.id}>
                    <rect
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        fill={room.fill || "#ffffff"}
                        stroke="#334155"
                        strokeWidth={room.id.includes("outline") ? 2.5 : 1}
                    />
                    {room.label && (
                        <text
                            x={room.x + room.width / 2}
                            y={room.y + 16}
                            textAnchor="middle"
                            fontSize={12}
                            fontWeight={600}
                            fill="#1f2937"
                        >
                            {room.label}
                        </text>
                    )}
                </g>
            ))}

            {WAREHOUSE_WALLS.map((wall) => (
                <line
                    key={wall.id}
                    x1={wall.x1}
                    y1={wall.y1}
                    x2={wall.x2}
                    y2={wall.y2}
                    stroke="#111827"
                    strokeWidth={wall.thick ? 3 : 1.5}
                />
            ))}

            {WAREHOUSE_DOORS.map((door) => (
                <g key={door.id} transform={`translate(${door.x} ${door.y}) rotate(${door.rotation})`}>
                    <path
                        d={`M0,0 A${door.width},${door.width} 0 0 1 ${door.width},${door.width}`}
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                    />
                    <line x1={0} y1={0} x2={door.width} y2={0} stroke="#6b7280" strokeWidth={1.5} />
                </g>
            ))}

            {streetGroups.map((group) => (
                <text
                    key={`${group.galpao}-${group.rua}`}
                    x={group.labelX}
                    y={group.labelY}
                    fontSize={11}
                    fontWeight={600}
                    fill="#374151"
                >
                    {group.rua}
                </text>
            ))}

            {docks.map((dock) => (
                <WarehousePosition
                    key={dock.code}
                    dock={dock}
                    highlighted={highlightedDock === dock.code}
                    onClick={onDockClick}
                    onHoverStart={onDockHoverStart}
                    onHoverEnd={onDockHoverEnd}
                />
            ))}
        </>
    );
}