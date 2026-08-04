"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls, PointerLockControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { WAREHOUSE_ROOMS, WAREHOUSE_VIEWBOX, getDockDefinition } from "@/lib/warehouseLayout";
import { DockOccupancy, DOCK_STATUS_COLORS } from "@/services/wareHouseServices";
import WarehouseTooltip from "@/components/warehouseTooltip";

// O layout 2D é em pixels (na casa dos milhares). Essa escala converte pra
// um tamanho de cena gerenciável (equivalente a "metros" na visão 3D).
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

// PRNG determinístico (mesma doca sempre gera a mesma "bagunça" de caixas,
// em vez de trocar de posição a cada re-render).
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

const CARDBOARD_TONES = ["#c8a165", "#d4b483", "#b8935f", "#c9ab78"];

/* ============================================================
 * PORTA-PALETE REAL: montantes azuis + vigas laranja + contraventamento
 * em X + protetores amarelos na base + pallets com caixas de papelão
 * variadas empilhadas, no estilo de um armazém logístico de verdade.
 * ============================================================ */
const RACK_LEVELS = 4;
const RACK_HEIGHT = 1.9;

function CrossBrace({ x, halfD, height, color }: { x: number; halfD: number; height: number; color: string }) {
    const dz = halfD * 2;
    const length = Math.sqrt(height * height + dz * dz);
    const angle = Math.atan2(dz, height);
    const thickness = 0.02;

    return (
        <group position={[x, height / 2, 0]}>
            <mesh rotation={[angle, 0, 0]}>
                <boxGeometry args={[thickness, length, thickness]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <mesh rotation={[-angle, 0, 0]}>
                <boxGeometry args={[thickness, length, thickness]} />
                <meshStandardMaterial color={color} />
            </mesh>
        </group>
    );
}

function FootGuard({ x, z }: { x: number; z: number }) {
    return (
        <group position={[x, 0.12, z]}>
            <mesh castShadow>
                <boxGeometry args={[0.09, 0.24, 0.09]} />
                <meshStandardMaterial color="#facc15" />
            </mesh>
            <mesh position={[0, -0.1, 0.06]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.09, 0.14, 0.03]} />
                <meshStandardMaterial color="#facc15" />
            </mesh>
        </group>
    );
}

// Um "pallet carregado": tábuas de madeira + várias caixas de papelão de
// tamanhos levemente diferentes, com posição pseudo-aleatória (mas fixa)
// pra parecer carga empilhada de verdade em vez de um bloco perfeito.
function LoadedPallet({ w, d, seed, boxColorHint }: { w: number; d: number; seed: number; boxColorHint?: string }) {
    const rand = useMemo(() => mulberry32(seed), [seed]);

    const boxes = useMemo(() => {
        const count = 2 + Math.floor(rand() * 3); // 2 a 4 caixas por pallet
        const cols = count <= 2 ? count : 2;
        const rows = Math.ceil(count / cols);
        const cellW = (w * 0.78) / cols;
        const cellD = (d * 0.78) / rows;

        const list: { x: number; z: number; w: number; d: number; h: number; color: string }[] = [];
        let i = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (i >= count) break;
                const bw = cellW * (0.72 + rand() * 0.22);
                const bd = cellD * (0.72 + rand() * 0.22);
                const bh = 0.16 + rand() * 0.16;
                const x = -w * 0.39 + cellW * (c + 0.5) + (rand() - 0.5) * cellW * 0.15;
                const z = -d * 0.39 + cellD * (r + 0.5) + (rand() - 0.5) * cellD * 0.15;
                const color = boxColorHint || CARDBOARD_TONES[Math.floor(rand() * CARDBOARD_TONES.length)];
                list.push({ x, z, w: bw, d: bd, h: bh, color });
                i++;
            }
        }
        return list;
    }, [rand, w, d, boxColorHint]);

    return (
        <group>
            {/* tábuas do pallet de madeira */}
            {[-0.28, 0, 0.28].map((offset, i) => (
                <mesh key={i} position={[0, 0.025, offset * d]} castShadow>
                    <boxGeometry args={[w * 0.85, 0.05, d * 0.2]} />
                    <meshStandardMaterial color="#92400e" />
                </mesh>
            ))}

            {/* caixas de papelão empilhadas, tamanhos e posições variados */}
            {boxes.map((b, i) => (
                <mesh key={i} position={[b.x, 0.05 + b.h / 2, b.z]} castShadow>
                    <boxGeometry args={[b.w, b.h, b.d]} />
                    <meshStandardMaterial color={b.color} />
                </mesh>
            ))}
        </group>
    );
}

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
    const w = dock.width * SCALE * 0.85;
    const d = dock.height * SCALE * 0.85;
    const postT = 0.035;
    const beamT = 0.03;

    const levelYs = [0, RACK_HEIGHT / 3, (RACK_HEIGHT / 3) * 2, RACK_HEIGHT];

    const ratio = dock.capacityMax > 0 ? dock.productCount / dock.capacityMax : 0;
    const loadedLevels = dock.blocked
        ? 0
        : Math.max(dock.productCount > 0 ? 1 : 0, Math.round(ratio * RACK_LEVELS));

    // Estrutura no padrão logístico real: montantes azuis, vigas laranja.
    const postColor = "#1d4ed8";
    const beamColor = dock.blocked ? DOCK_STATUS_COLORS.bloqueado : "#f97316";
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
            {/* área de seleção/hover invisível cobrindo toda a estrutura,
                pra não precisar de handler em cada mesh pequena */}
            <mesh position={[0, RACK_HEIGHT / 2, 0]} visible={false} {...handlers}>
                <boxGeometry args={[w * 1.1, RACK_HEIGHT + 0.4, d * 1.1]} />
            </mesh>

            {/* base de concreto sob a estrutura */}
            <mesh position={[0, 0.03, 0]} receiveShadow>
                <boxGeometry args={[w * 1.08, 0.06, d * 1.08]} />
                <meshStandardMaterial color="#94a3b8" />
            </mesh>

            {/* 4 montantes verticais azuis */}
            {postCorners.map(([px, pz], i) => (
                <mesh key={i} position={[px, RACK_HEIGHT / 2, pz]} castShadow>
                    <boxGeometry args={[postT, RACK_HEIGHT, postT]} />
                    <meshStandardMaterial color={postColor} />
                </mesh>
            ))}

            {/* protetores amarelos na base dos dois montantes da frente */}
            <FootGuard x={-halfW} z={-halfD} />
            <FootGuard x={halfW} z={-halfD} />

            {/* contraventamento em X nas duas laterais */}
            <CrossBrace x={-halfW} halfD={halfD} height={RACK_HEIGHT} color={postColor} />
            <CrossBrace x={halfW} halfD={halfD} height={RACK_HEIGHT} color={postColor} />

            {/* vigas horizontais laranja (frente e fundo) em cada nível */}
            {levelYs.map((y, i) => (
                <group key={i}>
                    <mesh position={[0, Math.max(y, 0.05), -halfD]} castShadow>
                        <boxGeometry args={[w - postT, beamT, postT * 1.4]} />
                        <meshStandardMaterial color={beamColor} />
                    </mesh>
                    <mesh position={[0, Math.max(y, 0.05), halfD]} castShadow>
                        <boxGeometry args={[w - postT, beamT, postT * 1.4]} />
                        <meshStandardMaterial color={beamColor} />
                    </mesh>
                </group>
            ))}

            {/* pallets carregados com caixas de papelão, um por nível ocupado */}
            {levelYs.slice(0, loadedLevels).map((y, i) => (
                <group key={i} position={[0, y + 0.02, 0]}>
                    <LoadedPallet w={w * 0.82} d={d * 0.82} seed={seedBase + i * 97} boxColorHint={boxColorHint} />
                </group>
            ))}

            {/* placa numerada no topo da estrutura, sempre visível */}
            <Text
                position={[0, RACK_HEIGHT + 0.14, 0]}
                fontSize={Math.min(w, 0.4) * 0.55}
                color="#facc15"
                anchorX="center"
                anchorY="middle"
            >
                {dock.shortLabel || dock.code}
            </Text>

            {highlighted && (
                <Text
                    position={[0, RACK_HEIGHT + 0.42, 0]}
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

/* ============================================================
 * POSIÇÃO DE PRATELEIRA: pallet de madeira + caixa do produto
 * em cima (só aparece a caixa quando a posição está ocupada).
 * ============================================================ */
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
    const w = dock.width * SCALE * 0.9;
    const d = dock.height * SCALE * 0.9;
    const occupied = dock.productCount > 0;
    const palletH = 0.08;

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
            <mesh position={[0, RACK_HEIGHT * 0.15, 0]} visible={false} {...handlers}>
                <boxGeometry args={[w * 1.05, RACK_HEIGHT * 0.3 + 0.4, d * 1.05]} />
            </mesh>

            {/* pallet de madeira */}
            <mesh position={[0, palletH / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w * 0.92, palletH, d * 0.92]} />
                <meshStandardMaterial color="#92400e" />
            </mesh>

            {/* caixa/mercadoria empilhada, só se houver produto na posição */}
            {(occupied || dock.blocked) && (
                <group position={[0, palletH + 0.02, 0]}>
                    <LoadedPallet w={w * 0.86} d={d * 0.86} seed={hashCode(dock.code)} boxColorHint={(dock as any).productColor} />
                </group>
            )}

            {highlighted && (
                <Text position={[0, 0.7, 0]} fontSize={0.2} color="#1d4ed8" anchorX="center" anchorY="bottom">
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
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial
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

/* ============================================================
 * TECLADO: hook simples que mantém em uma ref quais teclas estão
 * pressionadas agora, sem re-renderizar a cada tecla.
 * ============================================================ */
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

// Acha a doca/posição pra qual o jogador está olhando (cone estreito à
// frente da câmera), pra mostrar o tooltip com o produto no modo Andar
// sem depender do mouse (que fica travado no centro da tela).
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
        if (dot < 0.86) continue; // cone estreito, só o que está "na mira"

        const score = dot - dist * 0.02;
        if (score > bestScore) {
            bestScore = score;
            best = o.dock;
        }
    }

    return best;
}

/* ============================================================
 * MODO ANDAR: WASD/setas move, mouse olha (via PointerLockControls),
 * com colisão simples contra as docas/posições e limites do galpão.
 * ============================================================ */
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

    // Posiciona o jogador num ponto seguro (rua ampla) ao entrar no modo Andar.
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
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

    // Ponto de partida do modo Andar: o meio da maior "rua" do layout,
    // uma área aberta e (na prática) livre de caixas.
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

    // Quando volta pro modo mapa, centraliza a câmera de órbita na doca
    // que foi pedida enquanto ainda estava no modo Andar (busca da sidebar).
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
        <div ref={containerRef} className="relative h-[640px] w-full overflow-hidden rounded-xl border border-gray-200 bg-[#0f172a]">
            <Canvas
                shadows
                camera={{
                    position: initialCamera.position.toArray(),
                    fov: 45,
                }}
            >
                <color attach="background" args={["#0f172a"]} />
                <ambientLight intensity={0.65} />
                <directionalLight
                    position={[sceneWidth * 0.4, sceneWidth * 0.9, sceneDepth * 0.3]}
                    intensity={1.15}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />

                {/* Piso base, um pouco maior que o galpão pra dar "moldura" */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
                    <planeGeometry args={[sceneWidth * 1.3, sceneDepth * 1.3]} />
                    <meshStandardMaterial color="#1e293b" />
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
                    // Controles estilo Google Maps: arrastar (botão esquerdo) desloca,
                    // botão direito gira a câmera, scroll dá zoom.
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

            {/* Tooltip com foto e dados do produto — segue o mouse no modo mapa,
                fica fixo na mira central da tela no modo Andar. */}
            {hoveredDock && <WarehouseTooltip dock={hoveredDock} x={tooltipPos.x} y={tooltipPos.y} />}

            {/* Mira central, só visível andando com o mouse travado */}
            {mode === "walk" && walkLocked && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
                    <div className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                    <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                </div>
            )}

            {/* Botão para entrar no modo Andar (modo mapa) */}
            {mode === "orbit" && (
                <button
                    type="button"
                    onClick={enterWalkMode}
                    className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-3 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-[#1f1f1f]"
                >
                    🚶 Andar pelo galpão
                </button>
            )}

            {/* Overlay do modo Andar: instruções, prompt de clique e botão de saída */}
            {mode === "walk" && (
                <>
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm">
                        W A S D move · Mouse olha · Shift corre · ESC solta o mouse
                    </div>

                    <button
                        type="button"
                        onClick={exitWalkMode}
                        className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#2d2d2d] shadow-lg transition-colors hover:bg-gray-100"
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