"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProducts } from "@/services/productService";
import { fetchDockMeta, buildDockOccupancy, DockOccupancy } from "@/services/wareHouseServices";
import { Product } from "@/components/productsTable";
import { supabase } from "@/lib/supabase";
import WarehouseMap, { WarehouseMapHandle } from "@/components/warehouseMap";
import WarehouseToolbar from "@/components/warehouseToolbar";
import WarehouseSidebar from "@/components/WarehouseSidebar";
import WarehouseModal from "@/components/warehouseModal";

export default function WarehousePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [meta, setMeta] = useState<Record<string, { capacityMax: number; blocked: boolean }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDock, setSelectedDock] = useState<DockOccupancy | null>(null);
    const [highlightedDock, setHighlightedDock] = useState<string | null>(null);

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
        mapRef.current?.centerOnDock(code);
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
                <div className="flex justify-end">
                    <WarehouseToolbar
                        onZoomIn={() => mapRef.current?.zoomIn()}
                        onZoomOut={() => mapRef.current?.zoomOut()}
                        onReset={() => mapRef.current?.reset()}
                        onFitScreen={() => mapRef.current?.fitScreen()}
                    />
                </div>

                <WarehouseMap
                    ref={mapRef}
                    docks={docks}
                    onDockClick={setSelectedDock}
                    highlightedDock={highlightedDock}
                />
            </div>

            <WarehouseModal dock={activeDock} onClose={() => setSelectedDock(null)} onChanged={loadData} />
        </div>
    );
}