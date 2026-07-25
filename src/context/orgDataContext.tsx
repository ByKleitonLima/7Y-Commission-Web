"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { fetchManagers, fetchSellers, fetchClients } from "@/services/salesService";
import { SalesManager } from "@/components/managerStable";
import { Seller } from "@/components/sellersStable";
import { Client } from "@/components/clientsStable";

interface OrgDataContextType {
    managers: SalesManager[];
    sellers: Seller[];
    clients: Client[];
    isLoading: boolean;
    hasLoaded: boolean;
    refresh: () => Promise<void>;
}

const OrgDataContext = createContext<OrgDataContextType | undefined>(undefined);

// Carrega Gerentes/Vendedores/Clientes UMA vez quando o usuário entra no
// site (igual o SalesDataProvider já faz com as vendas). Navegar entre as
// telas não dispara nova busca — só o botão "Atualizar" chama refresh().
export function OrgDataProvider({ children }: { children: ReactNode }) {
    const [managers, setManagers] = useState<SalesManager[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Evita disparar buscas em paralelo (ex: StrictMode monta o efeito duas
    // vezes em dev, ou o usuário clica em "Atualizar" duas vezes rápido).
    const isFetchingRef = useRef(false);

    const refresh = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            const [managersData, sellersData, clientsData] = await Promise.all([
                fetchManagers(),
                fetchSellers(),
                fetchClients(),
            ]);
            setManagers(managersData || []);
            setSellers(sellersData || []);
            setClients(clientsData || []);
            setHasLoaded(true);
        } catch (err) {
            console.error("Erro ao carregar dados organizacionais:", err);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    // OrgDataProvider vive no layout raiz do app (junto do SalesDataProvider),
    // então este efeito roda UMA vez só quando o usuário entra no site —
    // navegar entre Gerentes/Vendedores/Clientes não remonta o provider, os
    // dados continuam em memória e só são buscados de novo no "Atualizar".
    useEffect(() => {
        if (!hasLoaded) refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <OrgDataContext.Provider value={{ managers, sellers, clients, isLoading, hasLoaded, refresh }}>
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