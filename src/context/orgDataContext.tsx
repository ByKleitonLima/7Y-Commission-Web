"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { fetchManagers, fetchSellers, fetchClients } from "@/services/salesService";
import { fetchSuppliers } from "@/services/supplierService";
import { SalesManager } from "@/components/managerStable";
import { Seller } from "@/components/sellersStable";
import { Client } from "@/components/clientsStable";
import { Supplier } from "@/components/suppliersTable";

interface OrgDataContextType {
    managers: SalesManager[];
    sellers: Seller[];
    clients: Client[];
    suppliers: Supplier[];
    isLoading: boolean;
    hasLoaded: boolean;
    refresh: () => Promise<void>;
}

const OrgDataContext = createContext<OrgDataContextType | undefined>(undefined);

export function OrgDataProvider({ children }: { children: ReactNode }) {
    const [managers, setManagers] = useState<SalesManager[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const isFetchingRef = useRef(false);

    const refresh = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            const [managersData, sellersData, clientsData, suppliersData] = await Promise.all([
                fetchManagers(),
                fetchSellers(),
                fetchClients(),
                fetchSuppliers(),
            ]);
            setManagers(managersData || []);
            setSellers(sellersData || []);
            setClients(clientsData || []);
            setSuppliers(suppliersData || []);
            setHasLoaded(true);
        } catch (err) {
            console.error("Erro ao carregar dados organizacionais:", err);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (!hasLoaded) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <OrgDataContext.Provider value={{ managers, sellers, clients, suppliers, isLoading, hasLoaded, refresh }}>
            {children}
        </OrgDataContext.Provider>
    );
}

export function useOrgData() {
    const context = useContext(OrgDataContext);
    if (!context) {
        throw new Error("useOrgData precisa ser usado dentro de um OrgDataProvider");
    }
    return context;
}