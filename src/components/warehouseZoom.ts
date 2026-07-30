"use client";

import { useCallback, useRef, useState } from "react";

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

export interface WarehouseTransform {
    scale: number;
    tx: number;
    ty: number;
}

const INITIAL: WarehouseTransform = { scale: 1, tx: 0, ty: 0 };

export function useWarehouseZoom(viewBoxWidth: number, viewBoxHeight: number) {
    const [transform, setTransform] = useState<WarehouseTransform>(INITIAL);
    const [isDragging, setIsDragging] = useState(false);
    const dragState = useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
    const pinchState = useRef({ pinching: false, startDistance: 0, startScale: 1 });

    const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

    const zoomIn = useCallback(() => {
        setTransform((prev) => ({ ...prev, scale: clampScale(prev.scale * 1.2) }));
    }, []);

    const zoomOut = useCallback(() => {
        setTransform((prev) => ({ ...prev, scale: clampScale(prev.scale / 1.2) }));
    }, []);

    const reset = useCallback(() => setTransform(INITIAL), []);

    const fitScreen = useCallback(
        (containerWidth: number, containerHeight: number) => {
            const scale = clampScale(Math.min(containerWidth / viewBoxWidth, containerHeight / viewBoxHeight));
            setTransform({
                scale,
                tx: (containerWidth - viewBoxWidth * scale) / 2,
                ty: (containerHeight - viewBoxHeight * scale) / 2,
            });
        },
        [viewBoxWidth, viewBoxHeight]
    );

    const centerOn = useCallback(
        (x: number, y: number, containerWidth: number, containerHeight: number, scale = 1.8) => {
            setTransform({
                scale,
                tx: containerWidth / 2 - x * scale,
                ty: containerHeight / 2 - y * scale,
            });
        },
        []
    );

    const handleWheel = useCallback((deltaY: number) => {
        setTransform((prev) => ({ ...prev, scale: clampScale(prev.scale * (deltaY < 0 ? 1.08 : 1 / 1.08)) }));
    }, []);

    const startDrag = useCallback(
        (clientX: number, clientY: number) => {
            dragState.current = {
                dragging: true,
                startX: clientX,
                startY: clientY,
                startTx: transform.tx,
                startTy: transform.ty,
            };
            setIsDragging(true);
        },
        [transform.tx, transform.ty]
    );

    const moveDrag = useCallback((clientX: number, clientY: number) => {
        if (!dragState.current.dragging) return;
        const dx = clientX - dragState.current.startX;
        const dy = clientY - dragState.current.startY;
        setTransform((prev) => ({ ...prev, tx: dragState.current.startTx + dx, ty: dragState.current.startTy + dy }));
    }, []);

    const endDrag = useCallback(() => {
        dragState.current.dragging = false;
        setIsDragging(false);
    }, []);

    const startPinch = useCallback(
        (distance: number) => {
            pinchState.current = { pinching: true, startDistance: distance, startScale: transform.scale };
        },
        [transform.scale]
    );

    const movePinch = useCallback((distance: number) => {
        if (!pinchState.current.pinching) return;
        const factor = distance / pinchState.current.startDistance;
        setTransform((prev) => ({ ...prev, scale: clampScale(pinchState.current.startScale * factor) }));
    }, []);

    const endPinch = useCallback(() => {
        pinchState.current.pinching = false;
    }, []);

    return {
        transform,
        isDragging,
        zoomIn,
        zoomOut,
        reset,
        fitScreen,
        centerOn,
        handleWheel,
        startDrag,
        moveDrag,
        endDrag,
        startPinch,
        movePinch,
        endPinch,
    };
}