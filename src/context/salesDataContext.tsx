"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
}

const SalesDataContext = createContext<SalesDataContextType | undefined>(undefined);

export function SalesDataProvider({ children }: { children: ReactNode }) {
    const [records, setRecords] = useState<SalesRecord[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);

    return (
        <SalesDataContext.Provider value={{ records, setRecords, fileName, setFileName }}>
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