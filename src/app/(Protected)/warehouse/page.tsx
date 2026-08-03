"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Boxes, Map as MapIcon } from "lucide-react";
import { fetchProducts } from "@/services/productService";
import { fetchDockMeta, buildDockOccupancy, DockOccupancy } from "@/services/wareHouseServices";
import { Product } from "@/components/productsTable";
import { supabase } from "@/lib/supabase";
import WarehouseMap, { WarehouseMapHandle } from "@/components/warehouseMap";
import WarehouseMap3D from "@/components/warehouseMap3D";
import WarehouseToolbar from "@/components/warehouseToolbar";
import WarehouseSidebar from "@/components/WarehouseSidebar";
import WarehouseModal from "@/components/warehouseModal";

type ViewMode = "2d" | "3d";

export default function WarehousePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [meta, setMeta] = useState<Record<string, { capacityMax: number; blocked: boolean }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDock, setSelectedDock] = useState<DockOccupancy | null>(null);
    const [highlightedDock, setHighlightedDock] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("2d");

    const mapRef = useRef<WarehouseMapHandle>(null);

    const loadData = useCallback(async () => {
        const [productsData, metaData] = await Promise.all([fetchProducts(), fetchDockMeta()]);
        setProducts(productsData);
        setMeta(metaData);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const channel = supabase
            .channel("warehouse-products-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    const docks = buildDockOccupancy(products, meta);
    const activeDock = selectedDock ? docks.find((d) => d.code === selectedDock.code) ?? null : null;

    const handleSelectDock = (code: string) => {
        setHighlightedDock(code);
        // Centralizar a câmera automaticamente só existe no modo 2D (SVG);
        // no 3D o usuário navega livremente com o OrbitControls.
        if (viewMode === "2d") {
            mapRef.current?.centerOnDock(code);
        }
        window.setTimeout(() => setHighlightedDock(null), 2500);
    };

    if (isLoading) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                Carregando mapa do galpão...
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-[280px_1fr]">
            <WarehouseSidebar docks={docks} onSelectDock={handleSelectDock} />

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("2d")}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "2d" ? "bg-[#2d2d2d] text-white" : "text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            <MapIcon className="h-4 w-4" strokeWidth={1.75} />
                            2D
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("3d")}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "3d" ? "bg-[#2d2d2d] text-white" : "text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            <Boxes className="h-4 w-4" strokeWidth={1.75} />
                            3D
                        </button>
                    </div>

                    {viewMode === "2d" && (
                        <WarehouseToolbar
                            onZoomIn={() => mapRef.current?.zoomIn()}
                            onZoomOut={() => mapRef.current?.zoomOut()}
                            onReset={() => mapRef.current?.reset()}
                            onFitScreen={() => mapRef.current?.fitScreen()}
                        />
                    )}
                </div>

                {viewMode === "2d" ? (
                    <WarehouseMap
                        ref={mapRef}
                        docks={docks}
                        onDockClick={setSelectedDock}
                        highlightedDock={highlightedDock}
                    />
                ) : (
                    <WarehouseMap3D
                        docks={docks}
                        onDockClick={setSelectedDock}
                        highlightedDock={highlightedDock}
                    />
                )}
            </div>

            <WarehouseModal dock={activeDock} onClose={() => setSelectedDock(null)} onChanged={loadData} />
        </div>
    );
}