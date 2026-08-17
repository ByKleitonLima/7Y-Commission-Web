"use client";

import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    WheelEvent,
    MouseEvent,
    TouchEvent,
} from "react";
import { WAREHOUSE_VIEWBOX, getDockDefinition } from "@/lib/warehouseLayout";
import { DockOccupancy } from "@/services/wareHouseServices";
import { useWarehouseZoom } from "@/components/warehouseZoom";
import WarehouseSvg from "@/components/warehouseSvg";
import WarehouseTooltip from "@/components/warehouseTooltip";

export interface WarehouseMapHandle {
    centerOnDock: (code: string) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    fitScreen: () => void;
}

interface WarehouseMapProps {
    docks: DockOccupancy[];
    onDockClick: (dock: DockOccupancy) => void;
    highlightedDock: string | null;
}

const WarehouseMap = forwardRef<WarehouseMapHandle, WarehouseMapProps>(function WarehouseMap(
    { docks, onDockClick, highlightedDock },
    ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredDock, setHoveredDock] = useState<DockOccupancy | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const zoom = useWarehouseZoom(WAREHOUSE_VIEWBOX.width, WAREHOUSE_VIEWBOX.height);

    useImperativeHandle(ref, () => ({
        centerOnDock: (code: string) => {
            const def = getDockDefinition(code);
            const container = containerRef.current;
            if (!def || !container) return;
            zoom.centerOn(def.x + def.width / 2, def.y + def.height / 2, container.clientWidth, container.clientHeight);
        },
        zoomIn: zoom.zoomIn,
        zoomOut: zoom.zoomOut,
        reset: zoom.reset,
        fitScreen: () => {
            const container = containerRef.current;
            if (!container) return;
            zoom.fitScreen(container.clientWidth, container.clientHeight);
        },
    }));

    const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        zoom.handleWheel(e.deltaY);
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => zoom.startDrag(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => zoom.moveDrag(e.clientX, e.clientY);
    const handleMouseUp = () => zoom.endDrag();

    const touchDistance = (touches: React.TouchList) => {
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            zoom.startPinch(touchDistance(e.touches));
        } else if (e.touches.length === 1) {
            zoom.startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            zoom.movePinch(touchDistance(e.touches));
        } else if (e.touches.length === 1) {
            zoom.moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleTouchEnd = () => {
        zoom.endDrag();
        zoom.endPinch();
    };

    const handleDockHoverStart = (dock: DockOccupancy, clientX: number, clientY: number) => {
        setHoveredDock(dock);
        setTooltipPos({ x: clientX, y: clientY });
    };

    const handleDockHoverEnd = () => setHoveredDock(null);

    return (
        <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-[65vh] min-h-[380px] w-full cursor-grab overflow-hidden rounded-xl border border-gray-200 bg-gray-50 active:cursor-grabbing touch-none lg:h-[calc(100vh-220px)] lg:min-h-[520px]"
        >
            <svg
                width={WAREHOUSE_VIEWBOX.width}
                height={WAREHOUSE_VIEWBOX.height}
                style={{
                    transform: `translate(${zoom.transform.tx}px, ${zoom.transform.ty}px) scale(${zoom.transform.scale})`,
                    transformOrigin: "0 0",
                    transition: zoom.isDragging ? "none" : "transform 0.2s ease-out",
                }}
            >
                <WarehouseSvg
                    docks={docks}
                    highlightedDock={highlightedDock}
                    onDockClick={onDockClick}
                    onDockHoverStart={handleDockHoverStart}
                    onDockHoverEnd={handleDockHoverEnd}
                />
            </svg>

            {hoveredDock && <WarehouseTooltip dock={hoveredDock} x={tooltipPos.x} y={tooltipPos.y} />}
        </div>
    );
});

export default WarehouseMap;