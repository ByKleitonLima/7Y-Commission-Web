"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProducts } from "@/services/productService";
import { fetchDockCapacities, buildDockOccupancy, DockOccupancy } from "@/services/wareHouseServices";
import { Product } from "@/components/productsTable";
import { supabase } from "@/lib/supabase";
import WarehouseMap, { WarehouseMapHandle } from "@/components/warehouseMap";
import WarehouseStatistics from "@/components/warehouseStatistics";
import WarehouseLegend from "@/components/warehouseLegend";
import WarehouseSearch from "@/components/warehouseSearch";
import WarehouseToolbar from "@/components/warehouseToolbar";
import DockModal from "@/components/dockModal";

export default function WarehousePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [capacities, setCapacities] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDock, setSelectedDock] = useState<DockOccupancy | null>(null);
    const [highlightedDock, setHighlightedDock] = useState<string | null>(null);

    const mapRef = useRef<WarehouseMapHandle>(null);

    const loadData = useCallback(async () => {
        const [productsData, capacitiesData] = await Promise.all([fetchProducts(), fetchDockCapacities()]);
        setProducts(productsData);
        setCapacities(capacitiesData);
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

    const docks = buildDockOccupancy(products, capacities);

    const handleSelectDockFromSearch = (dockCode: string) => {
        setHighlightedDock(dockCode);
        mapRef.current?.centerOnDock(dockCode);
        window.setTimeout(() => setHighlightedDock(null), 2500);
    };

    const handleDockClick = (dock: DockOccupancy) => {
        setSelectedDock(dock);
    };

    if (isLoading) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                Carregando mapa do galpão...
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <WarehouseStatistics docks={docks} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <WarehouseSearch products={products} onSelectDock={handleSelectDockFromSearch} />
                <WarehouseToolbar
                    onZoomIn={() => mapRef.current?.zoomIn()}
                    onZoomOut={() => mapRef.current?.zoomOut()}
                    onReset={() => mapRef.current?.reset()}
                />
            </div>

            <WarehouseMap ref={mapRef} docks={docks} onDockClick={handleDockClick} highlightedDock={highlightedDock} />

            <WarehouseLegend />

            <DockModal
                dock={selectedDock}
                onClose={() => setSelectedDock(null)}
                onCapacityChanged={async () => {
                    const capacitiesData = await fetchDockCapacities();
                    setCapacities(capacitiesData);
                }}
            />
        </div>
    );
}