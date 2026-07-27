"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, memo } from "react";
import {
    LayoutDashboard,
    UserCog,
    Users,
    Truck,
    Upload,
    LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/components/pageTile";
import Image from "next/image";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/home", icon: LayoutDashboard, pageTitle: "Dashbord de comissão" },
    { label: "Gerentes", href: "/managers", icon: UserCog, pageTitle: "Gerentes de vendas" },
    { label: "Vendedores", href: "/sellers", icon: Users, pageTitle: "Vendedores" },
    { label: "Clientes", href: "/clients", icon: Truck, pageTitle: "Clientes" },
    { label: "Importar", href: "/import", icon: Upload, pageTitle: "Importar planilha de comissão" },
];

export const SIDEBAR_COLLAPSED_WIDTH = 72;

function Sidebar() {
    const { expanded, setExpanded } = useSidebar();
    const pathname = usePathname();
    const { user, name, role, logout } = useAuth();

    const displayName = name || user?.email?.split("@")[0] || "Usuário";
    const initial = displayName.charAt(0).toUpperCase();

    const handleMouseEnter = useCallback(() => setExpanded(true), [setExpanded]);
    const handleMouseLeave = useCallback(() => setExpanded(false), [setExpanded]);

    const asideClassName = useMemo(
        () =>
            `fixed left-6 top-[50px] bottom-[50px] z-40 flex flex-col rounded-2xl bg-[#2d2d2d] transition-[width] duration-200 ease-out will-change-[width] ${expanded ? "w-65" : "w-[72px]"
            }`,
        [expanded]
    );

    return (
        <aside
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={asideClassName}
        >
            <div className="flex h-20 shrink-0 justify-center items-center overflow-hidden mt-9 mb-9">
                <div
                    className={`relative transition-all duration-200 ease-out ${expanded ? "h-14 w-[130px]" : "h-9 w-9"
                        }`}
                >
                    <Image
                        src="/img/logo.png"
                        alt="7Y Distribuidora"
                        fill
                        priority
                        className="object-contain object-left"
                    />
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex h-11 items-center gap-3 rounded-lg px-3 transition-colors ${active
                                ? "bg-white text-[#2d2d2d]"
                                : "text-gray-300 hover:bg-white/10"
                                }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                            <span
                                className={`whitespace-nowrap text-sm font-medium transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"
                                    }`}
                            >
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 px-3 pb-6 pt-4">
                <div className="flex items-center gap-3 overflow-hidden px-1 mb-2.5">
                    <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                        {initial}
                    </div>
                    <div
                        className={`whitespace-nowrap transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"
                            }`}
                    >
                        <p className="text-sm font-medium leading-tight text-white">
                            {displayName}
                        </p>
                        <span className="mt-2.5 flex justify-center items-center rounded-full bg-[#F9F9F9] h-[16px] w-[100px] text-[11px] text-[#2d2d2d]">
                            {role ?? "..."}
                        </span>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-gray-300 transition-colors hover:bg-white/10"
                >
                    <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    <span
                        className={`whitespace-nowrap text-sm font-medium transition-opacity duration-150 ${expanded ? "opacity-100" : "opacity-0"
                            }`}
                    >
                        Sair
                    </span>
                </button>
            </div>
        </aside>
    );
}

export default memo(Sidebar);