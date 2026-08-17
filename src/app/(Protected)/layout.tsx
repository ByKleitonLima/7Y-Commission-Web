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
                className={`flex-1 min-w-0 pb-8 px-4 transition-[padding] duration-300 ease-in-out
                    pt-[4.5rem]
                    sm:px-6 sm:pb-10
                    lg:pt-12 lg:pb-12 lg:pr-10 lg:px-9
                    lg:pl-[120px]
                    ${expanded ? "lg:pl-[308px]" : ""}
                `}
            >
                <div className="mx-auto w-full max-w-[1920px]">{children}</div>
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