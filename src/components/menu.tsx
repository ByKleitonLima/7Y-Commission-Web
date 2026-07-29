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
    LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/home", icon: LayoutDashboard, pageTitle: "Dashbord de comissão" },
    { label: "Gerentes", href: "/managers", icon: UserCog, pageTitle: "Gerentes de vendas" },
    { label: "Vendedores", href: "/sellers", icon: Users, pageTitle: "Vendedores" },
    { label: "Clientes", href: "/clients", icon: Truck, pageTitle: "Clientes" },
    { label: "Fornecedores", href: "/suppliers", icon: Package, pageTitle: "Fornecedores" },
    { label: "Produtos", href: "/products", icon: Boxes, pageTitle: "Produtos" },
    { label: "Importar", href: "/import", icon: Upload, pageTitle: "Importar planilha de comissão" },
];

function Sidebar() {
    const pathname = usePathname();
    const { user, name, role, logout } = useAuth();

    const displayName = name || user?.email?.split("@")[0] || "Usuário";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        /* O container de fora tem a classe 'group' para controlar o hover apenas via CSS */
        <aside className="group fixed left-6 top-[50px] bottom-[50px] z-50 w-[72px]">
            <div
                className="absolute inset-y-0 left-0 flex flex-col rounded-2xl bg-[#2d2d2d] shadow-2xl transition-[width] duration-200 ease-out will-change-[width] overflow-hidden w-[72px] group-hover:w-64"
                style={{ contain: "paint layout" }}
            >
                <div className="flex h-20 shrink-0 items-center overflow-hidden my-6 px-4">
                    <div className="relative transition-all duration-200 ease-out shrink-0 h-9 w-9 group-hover:h-14 group-hover:w-[130px]">
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

                <nav className="flex-1 space-y-1 px-3 overflow-hidden">
                    {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex h-11 items-center gap-3 rounded-lg px-3 transition-colors ${
                                    active
                                        ? "bg-white text-[#2d2d2d]"
                                        : "text-gray-300 hover:bg-white/10"
                                }`}
                            >
                                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                                <span className="whitespace-nowrap text-sm font-medium opacity-0 invisible pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 px-3 pb-6 pt-4 overflow-hidden">
                    <div className="flex items-center gap-3 overflow-hidden px-1 mb-2.5">
                        <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                            {initial}
                        </div>
                        <div className="whitespace-nowrap opacity-0 invisible pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto">
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
                        <span className="whitespace-nowrap text-sm font-medium opacity-0 invisible pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto">
                            Sair
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default memo(Sidebar);