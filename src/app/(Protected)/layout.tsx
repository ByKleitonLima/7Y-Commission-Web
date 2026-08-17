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
                className={`flex-1 min-w-0 pt-8 pb-8 px-4 transition-[padding] duration-300 ease-in-out
                    sm:px-6 sm:pt-10 sm:pb-10
                    lg:pt-12 lg:pb-12 lg:pr-10 lg:px-9
                    pl-[92px] sm:pl-[104px]
                    ${expanded ? "lg:pl-[308px]" : "lg:pl-[120px]"}
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