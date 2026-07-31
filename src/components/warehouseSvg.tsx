"use client";

import React from "react";
import { WAREHOUSE_ROOMS } from "@/lib/warehouseLayout";
import { DockOccupancy, DOCK_STATUS_COLORS } from "@/services/wareHouseServices";

interface WarehouseSvgProps {
    docks: DockOccupancy[];
    highlightedDock: string | null;
    onDockClick: (dock: DockOccupancy) => void;
    onDockHoverStart: (dock: DockOccupancy, clientX: number, clientY: number) => void;
    onDockHoverEnd: () => void;
}

export default function WarehouseSvg({
    docks,
    highlightedDock,
    onDockClick,
    onDockHoverStart,
    onDockHoverEnd,
}: WarehouseSvgProps) {
    return (
        <g id="warehouse-svg-content">
            {/* 1. Renderiza o fundo, paredes e ruas do galpão */}
            {WAREHOUSE_ROOMS.map((room) => {
                const isHeader = room.id === "g1-header";
                const isOutline = room.id === "g1-outline";

                return (
                    <g key={room.id}>
                        <rect
                            x={room.x}
                            y={room.y}
                            width={room.width}
                            height={room.height}
                            fill={
                                room.fill ||
                                (room.isStreet ? "#e2e8f0" : "#ffffff")
                            }
                            stroke={room.stroke || "#cbd5e1"}
                            strokeWidth={isOutline ? 2 : 1}
                            rx={isOutline ? 8 : 2}
                        />
                        {room.label && (
                            <text
                                x={room.x + room.width / 2}
                                y={room.y + room.height / 2}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={isHeader ? "#ffffff" : "#64748b"}
                                fontSize={isHeader ? 14 : 10}
                                fontWeight={isHeader ? "bold" : "600"}
                                className="pointer-events-none select-none"
                            >
                                {room.label}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* 2. Renderiza cada posição/doca vinda do estado */}
            {(docks || []).map((dock) => {
                const isHighlighted = highlightedDock === dock.code;
                const strokeColor = isHighlighted ? "#3b82f6" : "#94a3b8";
                const fillColor = DOCK_STATUS_COLORS[dock.status] || "#ffffff";
                const isDarkText = dock.status === "livre";

                return (
                    <g
                        key={dock.code}
                        onClick={() => onDockClick(dock)}
                        onMouseMove={(e) => onDockHoverStart(dock, e.clientX, e.clientY)}
                        onMouseLeave={onDockHoverEnd}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                    >
                        <rect
                            x={dock.x}
                            y={dock.y}
                            width={dock.width}
                            height={dock.height}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={isHighlighted ? 2.5 : 1}
                            rx={3}
                        />
                        <text
                            x={dock.x + dock.width / 2}
                            y={dock.y + dock.height / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isDarkText ? "#1e293b" : "#ffffff"}
                            fontSize={9}
                            fontWeight="700"
                            className="pointer-events-none select-none"
                        >
                            {dock.shortLabel || dock.code.replace("G1-P", "")}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}