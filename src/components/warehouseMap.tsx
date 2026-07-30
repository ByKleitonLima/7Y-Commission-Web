"use client";

import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
    WheelEvent,
    MouseEvent,
    TouchEvent,
} from "react";
import { WAREHOUSE_ROOMS, WAREHOUSE_VIEWBOX, getDockDefinition } from "@/lib/warehouseLayout";
import { DockOccupancy, DOCK_STATUS_COLORS } from "@/services/wareHouseServices";
import DockTooltip from "@/components/dockTooltip";

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;

export interface WarehouseMapHandle {
    centerOnDock: (code: string) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
}

interface WarehouseMapProps {
    docks: DockOccupancy[];
    onDockClick: (dock: DockOccupancy) => void;
    highlightedDock: string | null;
}

interface TransformState {
    scale: number;
    tx: number;
    ty: number;
}

const INITIAL_TRANSFORM: TransformState = { scale: 1, tx: 0, ty: 0 };

const WarehouseMap = forwardRef<WarehouseMapHandle, WarehouseMapProps>(function WarehouseMap(
    { docks, onDockClick, highlightedDock },
    ref
) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
    const [hoveredDock, setHoveredDock] = useState<DockOccupancy | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const dragState = useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
    const pinchState = useRef({ pinching: false, startDistance: 0, startScale: 1 });

    const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

    const applyZoom = useCallback((factor: number) => {
        setTransform((prev) => {
            const nextScale = clampScale(prev.scale * factor);
            return { ...prev, scale: nextScale };
        });
    }, []);

    const reset = useCallback(() => setTransform(INITIAL_TRANSFORM), []);

    const centerOnDock = useCallback((code: string) => {
        const def = getDockDefinition(code);
        const container = containerRef.current;
        if (!def || !container) return;

        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const scale = 1.6;
        const cx = def.x + def.width / 2;
        const cy = def.y + def.height / 2;

        setTransform({
            scale,
            tx: cw / 2 - cx * scale,
            ty: ch / 2 - cy * scale,
        });
    }, []);

    useImperativeHandle(ref, () => ({
        centerOnDock,
        zoomIn: () => applyZoom(1.2),
        zoomOut: () => applyZoom(1 / 1.2),
        reset,
    }));

    const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        applyZoom(e.deltaY < 0 ? 1.08 : 1 / 1.08);
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        dragState.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startTx: transform.tx,
            startTy: transform.ty,
        };
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!dragState.current.dragging) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        setTransform((prev) => ({ ...prev, tx: dragState.current.startTx + dx, ty: dragState.current.startTy + dy }));
    };

    const stopDragging = () => {
        dragState.current.dragging = false;
    };

    const touchDistance = (touches: React.TouchList) => {
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            pinchState.current = {
                pinching: true,
                startDistance: touchDistance(e.touches),
                startScale: transform.scale,
            };
        } else if (e.touches.length === 1) {
            dragState.current = {
                dragging: true,
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                startTx: transform.tx,
                startTy: transform.ty,
            };
        }
    };

    const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (pinchState.current.pinching && e.touches.length === 2) {
            const distance = touchDistance(e.touches);
            const factor = distance / pinchState.current.startDistance;
            setTransform((prev) => ({ ...prev, scale: clampScale(pinchState.current.startScale * factor) }));
            return;
        }

        if (dragState.current.dragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - dragState.current.startX;
            const dy = e.touches[0].clientY - dragState.current.startY;
            setTransform((prev) => ({ ...prev, tx: dragState.current.startTx + dx, ty: dragState.current.startTy + dy }));
        }
    };

    const handleTouchEnd = () => {
        dragState.current.dragging = false;
        pinchState.current.pinching = false;
    };

    const handleDockEnter = (dock: DockOccupancy, e: MouseEvent<SVGRectElement>) => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setHoveredDock(dock);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative h-[560px] w-full cursor-grab overflow-hidden rounded-xl border border-gray-200 bg-gray-50 active:cursor-grabbing"
        >
            <svg
                width={WAREHOUSE_VIEWBOX.width}
                height={WAREHOUSE_VIEWBOX.height}
                style={{
                    transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
                    transformOrigin: "0 0",
                    transition: dragState.current.dragging ? "none" : "transform 0.25s ease-out",
                }}
            >
                {WAREHOUSE_ROOMS.map((room) => (
                    <g key={room.id}>
                        <rect
                            x={room.x}
                            y={room.y}
                            width={room.width}
                            height={room.height}
                            fill={room.fill || "#ffffff"}
                            stroke="#334155"
                            strokeWidth={room.id === "outline" ? 3 : 1.5}
                        />
                        {room.label && (
                            <text
                                x={room.x + room.width / 2}
                                y={room.id === "galpao-2" ? room.y + 270 : room.y + 30}
                                textAnchor="middle"
                                fontSize={20}
                                fontWeight={600}
                                fill="#1f2937"
                            >
                                {room.label}
                            </text>
                        )}
                    </g>
                ))}

                <text x={90} y={345} fontSize={15} fontWeight={600} fill="#1f2937">DOCAS</text>
                <text x={930} y={528} fontSize={15} fontWeight={600} fill="#1f2937">DOCAS DE EXPEDIÇÃO</text>

                {docks.map((dock) => {
                    const isHighlighted = highlightedDock === dock.code;
                    return (
                        <g key={dock.code}>
                            <rect
                                x={dock.x}
                                y={dock.y}
                                width={dock.width}
                                height={dock.height}
                                rx={3}
                                fill={DOCK_STATUS_COLORS[dock.status]}
                                stroke={isHighlighted ? "#2563eb" : "#1f2937"}
                                strokeWidth={isHighlighted ? 3 : 1}
                                className={`cursor-pointer transition-opacity hover:opacity-80 ${isHighlighted ? "animate-pulse" : ""}`}
                                onMouseEnter={(e) => handleDockEnter(dock, e)}
                                onMouseLeave={() => setHoveredDock(null)}
                                onClick={() => onDockClick(dock)}
                            />
                        </g>
                    );
                })}
            </svg>

            {hoveredDock && <DockTooltip dock={hoveredDock} x={tooltipPos.x} y={tooltipPos.y} />}
        </div>
    );
});

export default WarehouseMap;