"use client";

import Sidebar from "@/components/menu";
import { SidebarProvider, useSidebar } from "@/components/pageTile";
import { SalesDataProvider } from "@/context/salesDataContext";
import { OrgDataProvider } from "@/context/orgDataContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { expanded } = useSidebar();

    return (
        <div className="flex min-h-screen bg-[#F9F9F9]">
            <Sidebar />
            <main
                className={`flex-1 pr-10 pt-12 pb-12 px-9 transition-[padding] duration-300 ease-in-out ${expanded ? "pl-[308px]" : "pl-[120px]"
                    }`}
            >
                {children}
            </main>
        </div>
    );
}

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <SalesDataProvider>
                <OrgDataProvider>
                    <LayoutContent>{children}</LayoutContent>
                </OrgDataProvider>
            </SalesDataProvider>
        </SidebarProvider>
    );
}