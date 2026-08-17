"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import {
    LayoutDashboard,
    UserCog,
    Users,
    Truck,
    Package,
    Boxes,
    Upload,
    Warehouse,
    LogOut,
    History,
    ClipboardList,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/home", icon: LayoutDashboard, pageTitle: "Dashbord de comissão" },
    { label: "Gerentes", href: "/managers", icon: UserCog, pageTitle: "Gerentes de vendas" },
    { label: "Vendedores", href: "/sellers", icon: Users, pageTitle: "Vendedores" },
    { label: "Descontos", href: "/discounts", icon: ClipboardList, pageTitle: "Descontos de Comissão" },
    { label: "Clientes", href: "/clients", icon: Truck, pageTitle: "Clientes" },
    { label: "Fornecedores", href: "/suppliers", icon: Package, pageTitle: "Fornecedores" },
    { label: "Estoque", href: "/stock", icon: Boxes, pageTitle: "Estoque" },
    { label: "Preços & Histórico", href: "/prices-history", icon: History, pageTitle: "Preços & Histórico de Estoque" },
    { label: "Mapa do Galpão", href: "/warehouse", icon: Warehouse, pageTitle: "Mapa do Galpão" },
    { label: "Importar", href: "/import", icon: Upload, pageTitle: "Importar planilha de comissão" },
];

function Sidebar() {
    const pathname = usePathname();
    const { user, name, role, logout } = useAuth();

    const displayName = name || user?.email?.split("@")[0] || "Usuário";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <aside className="group fixed left-3 sm:left-6 top-[20px] sm:top-[50px] bottom-[20px] sm:bottom-[50px] z-50 w-[64px] sm:w-[72px]">
            <div
                className="absolute inset-y-0 left-0 flex flex-col rounded-2xl bg-[#2d2d2d] shadow-2xl transition-[width] duration-200 ease-out will-change-[width] overflow-hidden w-[64px] sm:w-[72px] lg:group-hover:w-64"
                style={{ contain: "paint layout" }}
            >
                <div className="flex h-16 sm:h-20 shrink-0 items-center overflow-hidden my-4 sm:my-6 px-3 sm:px-4">
                    <div className="relative transition-all duration-200 ease-out shrink-0 h-8 w-8 sm:h-9 sm:w-9 lg:group-hover:h-14 lg:group-hover:w-[130px]">
                        <Image
                            src="/img/logo.png"
                            alt="7Y Distribuidora"
                            fill
                            priority
                            sizes="130px"
                            className="object-contain object-left"
                        />
                    </div>
                </div>

                <nav className="sidebar-scroll flex-1 space-y-1 px-2 sm:px-3 overflow-y-auto overflow-x-hidden">
                    {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex h-10 sm:h-11 items-center gap-3 rounded-lg px-2.5 sm:px-3 transition-colors ${active
                                    ? "bg-white text-[#2d2d2d]"
                                    : "text-gray-300 hover:bg-white/10"
                                    }`}
                            >
                                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                                <span className="whitespace-nowrap text-sm font-medium opacity-0 invisible pointer-events-none transition-opacity duration-150 lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:pointer-events-auto">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 px-2 sm:px-3 pb-4 sm:pb-6 pt-4 overflow-hidden shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden px-1 mb-2.5">
                        <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                            {initial}
                        </div>
                        <div className="whitespace-nowrap opacity-0 invisible pointer-events-none transition-opacity duration-150 lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:pointer-events-auto">
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
                        className="flex h-10 w-full items-center gap-3 rounded-lg px-2.5 sm:px-3 text-gray-300 transition-colors hover:bg-white/10"
                    >
                        <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                        <span className="whitespace-nowrap text-sm font-medium opacity-0 invisible pointer-events-none transition-opacity duration-150 lg:group-hover:opacity-100 lg:group-hover:visible lg:group-hover:pointer-events-auto">
                            Sair
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default memo(Sidebar);