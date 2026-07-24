"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { fetchAllSalesRecords } from "@/services/salesService";

export interface SalesRecord {
    id?: string;
    supervisorId: string;
    managerName: string;
    partnerCode?: string;
    sellerCode: string;
    sellerName: string;
    network?: string;
    clientCode: string;
    clientName: string;
    issueDate: string;
    uniqueNumber?: string;
    orderRef?: string;
    supplier: string;
    productCode: string;
    productName: string;
    quantity: number;
    bundleQuantity: number;
    unitValue: number;
    totalValue: number;
    percentBoleto?: number;
    vlr?: number;
    percentDescBoni?: number;
    vlrUnitLiq?: number;
    netValue: number;
    tableType?: string;
    percent?: number;
    commissionValue: number;
    description?: string;
    appType?: string;
    division: string;
    premium?: string;
    groupCode?: string;
    regPromo?: string;
    vlrPromo?: number;
    group: string;
    family: string;
    importedAt?: string;
}

interface SalesDataContextType {
    records: SalesRecord[];
    setRecords: (records: SalesRecord[]) => void;
    fileName: string | null;
    setFileName: (name: string | null) => void;
    isLoading: boolean;
    hasLoaded: boolean;
    refresh: () => Promise<void>;
}

const SalesDataContext = createContext<SalesDataContextType | undefined>(undefined);

export function SalesDataProvider({ children }: { children: ReactNode }) {
    const [records, setRecords] = useState<SalesRecord[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Evita disparar 2 buscas em paralelo (ex: StrictMode monta o efeito
    // duas vezes em dev, ou o usuário clica em "Atualizar" duas vezes rápido).
    const isFetchingRef = useRef(false);

    const refresh = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            const data = await fetchAllSalesRecords();
            setRecords(data || []);
            setHasLoaded(true);
        } catch (error) {
            console.error("Erro ao carregar dados de vendas:", error);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // SalesDataProvider vive no layout raiz do app, então este efeito roda
    // UMA vez só quando o usuário entra no site — navegar entre as telas
    // (Home, Gerentes, Vendedores...) não remonta o provider, então os
    // dados continuam em memória e não são buscados de novo. Só o clique
    // no botão "Atualizar" (via refresh()) dispara uma nova busca.
    useEffect(() => {
        if (!hasLoaded) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SalesDataContext.Provider
            value={{ records, setRecords, fileName, setFileName, isLoading, hasLoaded, refresh }}
        >
            {children}
        </SalesDataContext.Provider>
    );
}

export function useSalesData() {
    const context = useContext(SalesDataContext);
    if (!context) {
        throw new Error("useSalesData precisa ser usado dentro de um SalesDataProvider");
    }
    return context;
}