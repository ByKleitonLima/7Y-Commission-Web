"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls, PointerLockControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { WAREHOUSE_ROOMS, WAREHOUSE_VIEWBOX, getDockDefinition } from "@/lib/warehouseLayout";
import { DockOccupancy, DOCK_STATUS_COLORS } from "@/services/wareHouseServices";
import WarehouseTooltip from "@/components/warehouseTooltip";

const SCALE = 0.02;
const EYE_HEIGHT = 1.1;
const WALK_SPEED = 3.2;
const RUN_SPEED = 6.5;
const PLAYER_RADIUS = 0.22;

export interface WarehouseMap3DHandle {
    centerOnDock: (code: string) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    fitScreen: () => void;
}

interface WarehouseMap3DProps {
    docks: DockOccupancy[];
    onDockClick: (dock: DockOccupancy) => void;
    highlightedDock: string | null;
    onWalkModeChange?: (walking: boolean) => void;
}

function toSceneX(x: number, w: number) {
    return (x + w / 2 - WAREHOUSE_VIEWBOX.width / 2) * SCALE;
}

function toSceneZ(y: number, h: number) {
    return (y + h / 2 - WAREHOUSE_VIEWBOX.height / 2) * SCALE;
}

function mulberry32(seed: number) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return h;
}

// ============================================================================
// MATERIAIS E GEOMETRIAS COMPARTILHADAS
// ============================================================================
const SHARED_GEO = new THREE.BoxGeometry(1, 1, 1);
const BLACK_BOX_TONES = ["#111111", "#1a1a1a", "#222222", "#0a0a0a"];

const MATS = {
    wood: new THREE.MeshLambertMaterial({ color: "#e0b98a" }),
    post: new THREE.MeshLambertMaterial({ color: "#1d4ed8" }),
    guardBlack: new THREE.MeshLambertMaterial({ color: "#111111" }),
    rackBase: new THREE.MeshLambertMaterial({ color: "#94a3b8" }),
    beamNormal: new THREE.MeshLambertMaterial({ color: "#f97316" }),
    beamBlocked: new THREE.MeshLambertMaterial({ color: DOCK_STATUS_COLORS.bloqueado }),
    boxes: BLACK_BOX_TONES.map(color => new THREE.MeshLambertMaterial({ color }))
};

function CrossBrace({ x, halfD, height }: { x: number; halfD: number; height: number }) {
    const dz = halfD * 2;
    const length = Math.sqrt(height * height + dz * dz);
    const angle = Math.atan2(dz, height);
    const thickness = 0.03;

    return (
        <group position={[x, height / 2, 0]}>
            <mesh
                geometry={SHARED_GEO}
                material={MATS.post}
                scale={[thickness, length, thickness]}
                rotation={[angle, 0, 0]}
            />
            <mesh
                geometry={SHARED_GEO}
                material={MATS.post}
                scale={[thickness, length, thickness]}
                rotation={[-angle, 0, 0]}
            />
        </group>
    );
}

// Pilares mais finos na largura/profundidade e mais altos (altura aumentada para 1.6)
function PositionGuards({ w, d, height = 1.6 }: { w: number; d: number; height?: number }) {
    const halfW = w / 2;
    const halfD = d / 2;
    const guardSizeX = 0.10; // Mais fino
    const guardSizeZ = 0.10; // Mais fino

    const corners: [number, number][] = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [-halfW, halfD],
        [halfW, halfD],
    ];

    return (
        <group>
            {corners.map(([px, pz], i) => (
                <mesh
                    key={`guard-corner-${i}`}
                    position={[px, height / 2, pz]}
                    geometry={SHARED_GEO}
                    material={MATS.guardBlack}
                    scale={[guardSizeX, height, guardSizeZ]}
                />
            ))}
        </group>
    );
}

function WoodenPallet({ w, d }: { w: number; d: number }) {
    const boardThickness = 0.015;
    const stringerHeight = 0.06;

    const numTopBoards = 5;
    const topBoardD = (d * 0.85) / numTopBoards;
    const topBoards = [];
    for (let i = 0; i < numTopBoards; i++) {
        const zPos = -d / 2 + topBoardD / 2 + (i / (numTopBoards - 1)) * (d - topBoardD);
        topBoards.push(
            <mesh
                key={`top-${i}`}
                position={[0, boardThickness * 1.5 + stringerHeight, zPos]}
                geometry={SHARED_GEO}
                material={MATS.wood}
                scale={[w, boardThickness, topBoardD]}
            />
        );
    }

    const stringerW = w * 0.12;
    const stringers = [];
    for (let i = 0; i < 3; i++) {
        const xPos = -w / 2 + stringerW / 2 + (i / 2) * (w - stringerW);
        stringers.push(
            <mesh
                key={`str-${i}`}
                position={[xPos, boardThickness + stringerHeight / 2, 0]}
                geometry={SHARED_GEO}
                material={MATS.wood}
                scale={[stringerW, stringerHeight, d]}
            />
        );
    }

    return (
        <group>
            {stringers}
            {topBoards}
        </group>
    );
}

function LoadedPallet({ w, d, seed, boxColorHint }: { w: number; d: number; seed: number; boxColorHint?: string }) {
    const { boxIndex, boxH } = useMemo(() => {
        const rand = mulberry32(seed);
        return {
            boxIndex: Math.floor(rand() * MATS.boxes.length),
            boxH: 0.30 + rand() * 0.10
        };
    }, [seed]);

    const customMat = useMemo(() => boxColorHint ? new THREE.MeshLambertMaterial({ color: boxColorHint }) : null, [boxColorHint]);
    const boxMat = customMat || MATS.boxes[boxIndex];

    const boxW = w * 0.78;
    const boxD = d * 0.78;
    const palletHeight = 0.09;

    return (
        <group>
            <WoodenPallet w={w} d={d} />
            <mesh
                position={[0, palletHeight + boxH / 2, 0]}
                geometry={SHARED_GEO}
                material={boxMat}
                scale={[boxW, boxH, boxD]}
            />
        </group>
    );
}

// ============================================================================
// RackFrame (Porta-Paletes)
// ============================================================================
function RackFrame({
    dock,
    highlighted,
    interactive,
    onClick,
    onHoverStart,
    onHoverEnd,
}: {
    dock: DockOccupancy;
    highlighted: boolean;
    interactive: boolean;
    onClick: () => void;
    onHoverStart: (dock: DockOccupancy, clientX: number, clientY: number) => void;
    onHoverEnd: () => void;
}) {
    const rackHeight = 3.6;

    const w = dock.width * SCALE * 0.96;
    const d = dock.height * SCALE * 0.96;
    const postT = 0.05;
    const beamT = 0.045;

    const levelYs = [0, rackHeight / 3, (rackHeight / 3) * 2, rackHeight];

    const occupiedLevels = useMemo(
        () =>
            new Set(
                (dock.levels || [])
                    .filter((l) => l.status === "ocupado")
                    .map((l) => l.level)
            ),
        [dock.levels]
    );

    const beamMaterial = dock.blocked ? MATS.beamBlocked : MATS.beamNormal;
    const boxColorHint = dock.blocked ? undefined : (dock as any).productColor;

    const halfW = w / 2 - postT / 2;
    const halfD = d / 2 - postT / 2;

    const handlers = interactive
        ? {
            onClick: (e: any) => {
                e.stopPropagation();
                onClick();
            },
            onPointerMove: (e: any) => {
                e.stopPropagation();
                onHoverStart(dock, e.clientX, e.clientY);
            },
            onPointerOut: (e: any) => {
                e.stopPropagation();
                onHoverEnd();
            },
        }
        : {};

    const postCorners: [number, number][] = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [-halfW, halfD],
        [halfW, halfD],
    ];

    const seedBase = hashCode(dock.code);

    return (
        <group position={[toSceneX(dock.x, dock.width), 0, toSceneZ(dock.y, dock.height)]}>
            <mesh position={[0, rackHeight / 2, 0]} visible={false} {...handlers}>
                <boxGeometry args={[w * 1.1, rackHeight + 0.4, d * 1.1]} />
            </mesh>

            <mesh
                position={[0, 0.03, 0]}
                geometry={SHARED_GEO}
                material={MATS.rackBase}
                scale={[w * 1.08, 0.06, d * 1.08]}
            />

            {postCorners.map(([px, pz], i) => (
                <mesh
                    key={i}
                    position={[px, rackHeight / 2, pz]}
                    geometry={SHARED_GEO}
                    material={MATS.post}
                    scale={[postT, rackHeight, postT]}
                />
            ))}

            <CrossBrace x={-halfW} halfD={halfD} height={rackHeight} />
            <CrossBrace x={halfW} halfD={halfD} height={rackHeight} />

            {levelYs.map((y, i) => (
                <group key={i}>
                    <mesh
                        position={[0, Math.max(y, 0.05), -halfD]}
                        geometry={SHARED_GEO}
                        material={beamMaterial}
                        scale={[w - postT, beamT, postT * 1.4]}
                    />
                    <mesh
                        position={[0, Math.max(y, 0.05), halfD]}
                        geometry={SHARED_GEO}
                        material={beamMaterial}
                        scale={[w - postT, beamT, postT * 1.4]}
                    />
                </group>
            ))}

            {levelYs.map((y, i) => {
                const levelNumber = i + 1;
                if (!occupiedLevels.has(levelNumber)) return null;
                return (
                    <group key={i} position={[0, y + 0.02, 0]}>
                        <LoadedPallet w={w * 0.82} d={d * 0.82} seed={seedBase + i * 97} boxColorHint={boxColorHint} />
                    </group>
                );
            })}

            <Text
                position={[0, rackHeight + 0.14, 0]}
                fontSize={Math.min(w, 0.4) * 0.55}
                color="#facc15"
                anchorX="center"
                anchorY="middle"
            >
                {dock.shortLabel || dock.code}
            </Text>

            {highlighted && (
                <Text
                    position={[0, rackHeight + 0.42, 0]}
                    fontSize={0.24}
                    color="#1d4ed8"
                    anchorX="center"
                    anchorY="bottom"
                >
                    {dock.code}
                </Text>
            )}
        </group>
    );
}

// ============================================================================
// PositionPallet (Demais Docas)
// ============================================================================
function PositionPallet({
    dock,
    highlighted,
    interactive,
    onClick,
    onHoverStart,
    onHoverEnd,
}: {
    dock: DockOccupancy;
    highlighted: boolean;
    interactive: boolean;
    onClick: () => void;
    onHoverStart: (dock: DockOccupancy, clientX: number, clientY: number) => void;
    onHoverEnd: () => void;
}) {
    const rackHeight = 3.6;

    const w = dock.width * SCALE * 0.9;
    const d = dock.height * SCALE * 0.9;
    const occupied = dock.productCount > 0;

    const handlers = interactive
        ? {
            onClick: (e: any) => {
                e.stopPropagation();
                onClick();
            },
            onPointerMove: (e: any) => {
                e.stopPropagation();
                onHoverStart(dock, e.clientX, e.clientY);
            },
            onPointerOut: (e: any) => {
                e.stopPropagation();
                onHoverEnd();
            },
        }
        : {};

    return (
        <group position={[toSceneX(dock.x, dock.width), 0, toSceneZ(dock.y, dock.height)]}>
            <mesh position={[0, rackHeight * 0.15, 0]} visible={false} {...handlers}>
                <boxGeometry args={[w * 1.05, rackHeight * 0.3 + 0.4, d * 1.05]} />
            </mesh>

            <group>
                {(occupied || dock.blocked) ? (
                    <LoadedPallet w={w * 0.92} d={d * 0.92} seed={hashCode(dock.code)} boxColorHint={(dock as any).productColor} />
                ) : (
                    <WoodenPallet w={w * 0.92} d={d * 0.92} />
                )}

                <PositionGuards w={w} d={d} height={1.6} />
            </group>

            {highlighted && (
                <Text position={[0, 1.8, 0]} fontSize={0.2} color="#1d4ed8" anchorX="center" anchorY="bottom">
                    {dock.code}
                </Text>
            )}
        </group>
    );
}

function RoomFloor({ room }: { room: (typeof WAREHOUSE_ROOMS)[number] }) {
    const isHeader = room.id.endsWith("-header");
    const w = room.width * SCALE;
    const d = room.height * SCALE;

    return (
        <group position={[toSceneX(room.x, room.width), isHeader ? 0.06 : 0.01, toSceneZ(room.y, room.height)]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, d]} />
                <meshBasicMaterial
                    color={room.fill || (room.isStreet ? "#cbd5e1" : "#f1f5f9")}
                    transparent={!room.isStreet && !isHeader}
                    opacity={room.isStreet || isHeader ? 1 : 0.35}
                />
            </mesh>

            {room.label && !isHeader && Math.min(w, d) > 0.3 && (
                <Text
                    position={[0, 0.04, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    fontSize={Math.min(w, d) * 0.16}
                    color="#64748b"
                    anchorX="center"
                    anchorY="middle"
                >
                    {room.label}
                </Text>
            )}
        </group>
    );
}

function useKeyboardState() {
    const keys = useRef<Record<string, boolean>>({});

    useEffect(() => {
        const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
        const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    return keys;
}

interface Obstacle {
    dock: DockOccupancy;
    x: number;
    z: number;
    hw: number;
    hd: number;
}

function collides(pos: THREE.Vector3, obstacles: Obstacle[]): boolean {
    for (const o of obstacles) {
        if (Math.abs(pos.x - o.x) < o.hw + PLAYER_RADIUS && Math.abs(pos.z - o.z) < o.hd + PLAYER_RADIUS) {
            return true;
        }
    }
    return false;
}

function findLookedAtDock(camera: THREE.Camera, obstacles: Obstacle[], maxDist = 6): DockOccupancy | null {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const dir2 = new THREE.Vector2(dir.x, dir.z).normalize();
    const camX = camera.position.x;
    const camZ = camera.position.z;

    let best: DockOccupancy | null = null;
    let bestScore = -Infinity;

    for (const o of obstacles) {
        const dx = o.x - camX;
        const dz = o.z - camZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > maxDist || dist < 0.05) continue;

        const toObj = new THREE.Vector2(dx, dz).normalize();
        const dot = dir2.dot(toObj);
        if (dot < 0.86) continue;

        const score = dot - dist * 0.02;
        if (score > bestScore) {
            bestScore = score;
            best = o.dock;
        }
    }

    return best;
}

function WalkControls({
    obstacles,
    bounds,
    spawnPoint,
    onLocked,
    onLookAt,
}: {
    obstacles: Obstacle[];
    bounds: { halfW: number; halfD: number };
    spawnPoint: THREE.Vector3;
    onLocked: (locked: boolean) => void;
    onLookAt: (dock: DockOccupancy | null) => void;
}) {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);
    const keys = useKeyboardState();

    useEffect(() => {
        camera.position.copy(spawnPoint);
        camera.rotation.set(0, 0, 0);
        (camera as THREE.PerspectiveCamera).fov = 75;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }, [camera, spawnPoint]);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        const handleLock = () => onLocked(true);
        const handleUnlock = () => onLocked(false);
        controls.addEventListener("lock", handleLock);
        controls.addEventListener("unlock", handleUnlock);
        return () => {
            controls.removeEventListener("lock", handleLock);
            controls.removeEventListener("unlock", handleUnlock);
        };
    }, []);

    useFrame((_, delta) => {
        const controls = controlsRef.current;
        if (!controls || !controls.isLocked) return;

        const speed = (keys.current["ShiftLeft"] || keys.current["ShiftRight"] ? RUN_SPEED : WALK_SPEED) * delta;
        const prev = camera.position.clone();

        let moveZ = 0;
        let moveX = 0;
        if (keys.current["KeyW"] || keys.current["ArrowUp"]) moveZ += speed;
        if (keys.current["KeyS"] || keys.current["ArrowDown"]) moveZ -= speed;
        if (keys.current["KeyD"] || keys.current["ArrowRight"]) moveX += speed;
        if (keys.current["KeyA"] || keys.current["ArrowLeft"]) moveX -= speed;

        if (moveZ !== 0) controls.moveForward(moveZ);
        if (moveX !== 0) controls.moveRight(moveX);
        camera.position.y = EYE_HEIGHT;

        const outOfBounds = Math.abs(camera.position.x) > bounds.halfW || Math.abs(camera.position.z) > bounds.halfD;
        if (outOfBounds || collides(camera.position, obstacles)) {
            camera.position.copy(prev);
            camera.position.y = EYE_HEIGHT;
        }

        onLookAt(findLookedAtDock(camera, obstacles));
    });

    return <PointerLockControls ref={controlsRef} />;
}

const WarehouseMap3D = forwardRef<WarehouseMap3DHandle, WarehouseMap3DProps>(function WarehouseMap3D(
    { docks, onDockClick, highlightedDock, onWalkModeChange },
    ref
) {
    const sceneWidth = WAREHOUSE_VIEWBOX.width * SCALE;
    const sceneDepth = WAREHOUSE_VIEWBOX.height * SCALE;

    const initialCamera = useMemo(
        () => ({
            position: new THREE.Vector3(0, Math.max(sceneWidth, sceneDepth) * 0.85, sceneDepth * 0.55),
            target: new THREE.Vector3(0, 0, 0),
        }),
        [sceneWidth, sceneDepth]
    );

    const spawnPoint = useMemo(() => {
        let best: (typeof WAREHOUSE_ROOMS)[number] | null = null;
        let bestArea = 0;
        for (const room of WAREHOUSE_ROOMS) {
            if (!room.isStreet || !room.label) continue;
            const area = room.width * room.height;
            if (area > bestArea) {
                bestArea = area;
                best = room;
            }
        }
        if (!best) return new THREE.Vector3(0, EYE_HEIGHT, 0);
        return new THREE.Vector3(toSceneX(best.x, best.width), EYE_HEIGHT, toSceneZ(best.y, best.height));
    }, []);

    const obstacles: Obstacle[] = useMemo(
        () =>
            docks.map((dock) => ({
                dock,
                x: toSceneX(dock.x, dock.width),
                z: toSceneZ(dock.y, dock.height),
                hw: (dock.width * SCALE * 0.96) / 2,
                hd: (dock.height * SCALE * 0.96) / 2,
            })),
        [docks]
    );

    const bounds = useMemo(
        () => ({ halfW: (sceneWidth * 1.25) / 2, halfD: (sceneDepth * 1.25) / 2 }),
        [sceneWidth, sceneDepth]
    );

    const orbitControlsRef = useRef<any>(null);
    const [mode, setMode] = useState<"orbit" | "walk">("orbit");
    const [walkLocked, setWalkLocked] = useState(false);
    const [pendingCenterCode, setPendingCenterCode] = useState<string | null>(null);
    const [hoveredDock, setHoveredDock] = useState<DockOccupancy | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onWalkModeChange?.(mode === "walk");
    }, [mode, onWalkModeChange]);

    useEffect(() => {
        if (mode !== "orbit" || !pendingCenterCode) return;
        const controls = orbitControlsRef.current;
        if (!controls) return;

        const def = getDockDefinition(pendingCenterCode);
        if (def) {
            const x = toSceneX(def.x, def.width);
            const z = toSceneZ(def.y, def.height);
            const distance = 5.5;
            controls.target.set(x, 0, z);
            controls.object.position.set(x, distance * 0.75, z + distance);
            controls.object.fov = 45;
            controls.object.updateProjectionMatrix();
            controls.update();
        }
        setPendingCenterCode(null);
    }, [mode, pendingCenterCode]);

    function dollyBy(factor: number) {
        const controls = orbitControlsRef.current;
        if (!controls) return;
        const camera = controls.object as THREE.PerspectiveCamera;
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        const newLength = THREE.MathUtils.clamp(dir.length() * factor, controls.minDistance, controls.maxDistance);
        dir.setLength(newLength);
        camera.position.copy(controls.target).add(dir);
        controls.update();
    }

    function resetOrbitView() {
        const controls = orbitControlsRef.current;
        if (!controls) return;
        controls.object.position.copy(initialCamera.position);
        controls.object.fov = 45;
        controls.object.updateProjectionMatrix();
        controls.target.copy(initialCamera.target);
        controls.update();
    }

    useImperativeHandle(ref, () => ({
        zoomIn: () => mode === "orbit" && dollyBy(0.75),
        zoomOut: () => mode === "orbit" && dollyBy(1.35),
        reset: () => mode === "orbit" && resetOrbitView(),
        fitScreen: () => mode === "orbit" && resetOrbitView(),
        centerOnDock: (code: string) => {
            if (mode === "walk") {
                setPendingCenterCode(code);
                setMode("orbit");
                return;
            }
            const controls = orbitControlsRef.current;
            const def = getDockDefinition(code);
            if (!def || !controls) return;
            const x = toSceneX(def.x, def.width);
            const z = toSceneZ(def.y, def.height);
            const distance = 5.5;
            controls.target.set(x, 0, z);
            controls.object.position.set(x, distance * 0.75, z + distance);
            controls.update();
        },
    }));

    const handleHoverStart = (dock: DockOccupancy, clientX: number, clientY: number) => {
        if (mode !== "orbit") return;
        setHoveredDock(dock);
        setTooltipPos({ x: clientX, y: clientY });
    };
    const handleHoverEnd = () => {
        if (mode !== "orbit") return;
        setHoveredDock(null);
    };

    const handleLookAt = (dock: DockOccupancy | null) => {
        setHoveredDock(dock);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 - 40 });
        }
    };

    function enterWalkMode() {
        setMode("walk");
        setHoveredDock(null);
    }

    function exitWalkMode() {
        setMode("orbit");
        setWalkLocked(false);
        setHoveredDock(null);
    }

    return (
        <div ref={containerRef} className="relative h-[calc(100vh-220px)] min-h-[520px] w-full overflow-hidden rounded-xl border border-gray-200 bg-[#0f172a]">
            <Canvas
                gl={{ antialias: false, powerPreference: "high-performance" }}
                camera={{
                    position: initialCamera.position.toArray(),
                    fov: 45,
                }}
            >
                <color attach="background" args={["#0f172a"]} />
                <ambientLight intensity={0.8} />
                <directionalLight
                    position={[sceneWidth * 0.4, sceneWidth * 0.9, sceneDepth * 0.3]}
                    intensity={1.0}
                />

                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                    <planeGeometry args={[sceneWidth * 1.3, sceneDepth * 1.3]} />
                    <meshBasicMaterial color="#1e293b" />
                </mesh>

                {WAREHOUSE_ROOMS.map((room) => (
                    <RoomFloor key={room.id} room={room} />
                ))}

                {docks.map((dock) =>
                    dock.type === "doca" ? (
                        <RackFrame
                            key={dock.code}
                            dock={dock}
                            highlighted={highlightedDock === dock.code}
                            interactive={mode === "orbit"}
                            onClick={() => onDockClick(dock)}
                            onHoverStart={handleHoverStart}
                            onHoverEnd={handleHoverEnd}
                        />
                    ) : (
                        <PositionPallet
                            key={dock.code}
                            dock={dock}
                            highlighted={highlightedDock === dock.code}
                            interactive={mode === "orbit"}
                            onClick={() => onDockClick(dock)}
                            onHoverStart={handleHoverStart}
                            onHoverEnd={handleHoverEnd}
                        />
                    )
                )}

                {mode === "orbit" ? (
                    <MapControls
                        ref={orbitControlsRef}
                        makeDefault
                        enableDamping
                        dampingFactor={0.08}
                        rotateSpeed={0.6}
                        panSpeed={1.1}
                        zoomSpeed={0.9}
                        minDistance={2.5}
                        maxDistance={Math.max(sceneWidth, sceneDepth) * 2}
                        maxPolarAngle={Math.PI / 2.1}
                        target={initialCamera.target}
                    />
                ) : (
                    <WalkControls
                        obstacles={obstacles}
                        bounds={bounds}
                        spawnPoint={spawnPoint}
                        onLocked={setWalkLocked}
                        onLookAt={handleLookAt}
                    />
                )}
            </Canvas>

            {hoveredDock && <WarehouseTooltip dock={hoveredDock} x={tooltipPos.x} y={tooltipPos.y} />}

            {mode === "walk" && walkLocked && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
                    <div className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                    <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                </div>
            )}

            {mode === "orbit" && (
                <button
                    type="button"
                    onClick={enterWalkMode}
                    className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-3 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-[#1f1f1f]"
                >
                    🚶 Andar pelo galpão
                </button>
            )}

            {mode === "walk" && (
                <>
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm">
                        W A S D move · Mouse olha · Shift corre · ESC solta o mouse
                    </div>

                    <button
                        type="button"
                        onClick={exitWalkMode}
                        className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#2d2d2d] shadow-lg transition-colors hover:bg-gray-150"
                    >
                        Sair do modo Andar
                    </button>

                    {!walkLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="rounded-xl bg-white px-6 py-4 text-center shadow-2xl">
                                <p className="text-sm font-semibold text-[#2d2d2d]">Clique na área do galpão para começar a andar</p>
                                <p className="mt-1 text-xs text-gray-500">Use WASD para se mover e o mouse para olhar ao redor</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

export default WarehouseMap3D;