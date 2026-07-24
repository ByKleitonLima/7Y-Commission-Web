"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/menu";

interface SidebarContextType {
    expanded: boolean;
    setExpanded: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <SidebarContext.Provider value={{ expanded, setExpanded }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar precisa ser usado dentro de um SidebarProvider");
    }
    return context;
}

export default function PageTitle() {
    const pathname = usePathname();

    const current = NAV_ITEMS.find((item) => item.href === pathname);

    if (!current) return null;

    const Icon = current.icon;

    return (
        <div className="mt-[50px] flex h-20 items-center gap-2 border-b border-gray-200">
            <Icon className="h-10 w-10 text-[#2d2d2d]" strokeWidth={1.75} />
            <h1 className="text-3xl font-semibold text-[#2d2d2d]">{current.label}</h1>
        </div>
    );
}