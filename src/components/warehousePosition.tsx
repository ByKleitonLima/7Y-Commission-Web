"use client";

import { memo, useCallback } from "react";
import { DockOccupancy, DOCK_STATUS_COLORS } from "@/services/wareHouseServices";

interface WarehousePositionProps {
    dock: DockOccupancy;
    highlighted: boolean;
    onClick: (dock: DockOccupancy) => void;
    onHoverStart: (dock: DockOccupancy, x: number, y: number) => void;
    onHoverEnd: () => void;
}

function WarehousePositionBase({ dock, highlighted, onClick, onHoverStart, onHoverEnd }: WarehousePositionProps) {
    const handleClick = useCallback(() => onClick(dock), [dock, onClick]);
    const handleEnter = useCallback(
        (e: React.MouseEvent<SVGRectElement>) => onHoverStart(dock, e.clientX, e.clientY),
        [dock, onHoverStart]
    );

    const displayText = dock.shortLabel ?? dock.code.split("-").slice(-2).join("-");
    const fontSize = dock.type === "doca" ? 10 : 9;

    return (
        <g>
            <rect
                x={dock.x}
                y={dock.y}
                width={dock.width}
                height={dock.height}
                rx={2}
                fill={dock.blocked ? DOCK_STATUS_COLORS.bloqueado : (dock as any).productColor || DOCK_STATUS_COLORS[dock.status]}
                stroke={highlighted ? "#2563eb" : "#1f2937"}
                strokeWidth={highlighted ? 2.5 : 0.6}
                className={`cursor-pointer transition-opacity hover:opacity-80 ${highlighted ? "animate-pulse" : ""}`}
                onMouseEnter={handleEnter}
                onMouseLeave={onHoverEnd}
                onClick={handleClick}
            />
            {dock.width >= 30 && dock.height >= 14 && (
                <text
                    x={dock.x + dock.width / 2}
                    y={dock.y + dock.height / 2 + fontSize / 3}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fill="#111827"
                    pointerEvents="none"
                >
                    {displayText}
                </text>
            )}
        </g>
    );
}

const WarehousePosition = memo(WarehousePositionBase);
export const WarehouseDock = WarehousePosition;
export default WarehousePosition;