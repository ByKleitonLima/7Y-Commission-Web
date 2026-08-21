"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useMemo, useState } from "react";
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
    Percent,
    Menu as MenuIcon,
    X,
    ScrollText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export const NAV_ITEMS = [
    { label: "Dashboard", href: "/home", icon: LayoutDashboard, pageTitle: "Dashbord de comissão" },
    { label: "Gerentes", href: "/managers", icon: UserCog, pageTitle: "Gerentes de vendas" },
    { label: "Vendedores", href: "/sellers", icon: Users, pageTitle: "Vendedores" },
    { label: "Comissões", href: "/commissions", icon: Percent, pageTitle: "Comissões" },
    { label: "Descontos", href: "/discounts", icon: ClipboardList, pageTitle: "Descontos de Comissão" },
    { label: "Clientes", href: "/clients", icon: Truck, pageTitle: "Clientes" },
    { label: "Fornecedores", href: "/suppliers", icon: Package, pageTitle: "Fornecedores" },
    { label: "Estoque", href: "/stock", icon: Boxes, pageTitle: "Estoque" },
    { label: "Preços & Histórico", href: "/prices-history", icon: History, pageTitle: "Preços & Histórico de Estoque" },
    { label: "Mapa do Galpão", href: "/warehouse", icon: Warehouse, pageTitle: "Mapa do Galpão" },
    { label: "Importar", href: "/import", icon: Upload, pageTitle: "Importar planilha de comissão" },
    { label: "Logs de Auditoria", href: "/audit-logs", icon: ScrollText, pageTitle: "Logs de Auditoria" },
];

// Itens que só devem aparecer no menu para usuários com role "Admin".
// Basta adicionar o href aqui — não precisa mexer em mais nada.
const ADMIN_ONLY_HREFS = ["/audit-logs"];

function Sidebar() {
    const pathname = usePathname();
    const { user, name, role, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const displayName = name || user?.email?.split("@")[0] || "Usuário";
    const initial = displayName.charAt(0).toUpperCase();
    const currentItem = NAV_ITEMS.find((item) => item.href === pathname);

    // Esconde itens admin-only enquanto o role ainda não carregou ou para
    // quem não é Admin. Recalcula só quando o role muda.
    const visibleNavItems = useMemo(
        () => NAV_ITEMS.filter((item) => !ADMIN_ONLY_HREFS.includes(item.href) || role === "Admin"),
        [role]
    );

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            {/* ============================================================
                BARRA SUPERIOR MOBILE (abaixo de lg)
                Fixa no topo, com botão de hambúrguer para abrir o menu.
                O layout protegido (Protected/layout.tsx) reserva espaço
                (pt) pra essa barra não cobrir o conteúdo.
               ============================================================ */}
            <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#2d2d2d] transition-colors active:bg-gray-100"
                >
                    <MenuIcon className="h-6 w-6" strokeWidth={1.75} />
                </button>

                <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#2d2d2d]">
                    {currentItem?.label || "7Y Hub"}
                </span>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d2d2d] text-xs font-semibold text-white">
                    {initial}
                </div>
            </header>

            {/* ============================================================
                DRAWER MOBILE (abaixo de lg)
               ============================================================ */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
                        onClick={closeMobile}
                    />
                    <div className="absolute inset-y-0 left-0 flex w-[80%] max-w-[300px] flex-col bg-[#2d2d2d] shadow-2xl animate-in slide-in-from-left duration-200">
                        <div className="flex h-16 shrink-0 items-center justify-between px-4">
                            <div className="relative h-9 w-[110px]">
                                <Image
                                    src="/img/logo.png"
                                    alt="7Y Distribuidora"
                                    fill
                                    priority
                                    sizes="110px"
                                    className="object-contain object-left"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={closeMobile}
                                aria-label="Fechar menu"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10"
                            >
                                <X className="h-5 w-5" strokeWidth={1.75} />
                            </button>
                        </div>

                        <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-1">
                            {visibleNavItems.map(({ label, href, icon: Icon }) => {
                                const active = pathname === href;
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={closeMobile}
                                        className={`flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-white text-[#2d2d2d]" : "text-gray-300 hover:bg-white/10"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="shrink-0 border-t border-white/10 px-3 pb-6 pt-4">
                            <div className="mb-2.5 flex items-center gap-3 px-1">
                                <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                                    {initial}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium leading-tight text-white">{displayName}</p>
                                    <span className="mt-1 inline-flex h-[16px] items-center justify-center rounded-full bg-[#F9F9F9] px-2 text-[11px] text-[#2d2d2d]">
                                        {role ?? "..."}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    closeMobile();
                                    logout();
                                }}
                                className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
                            >
                                <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
                SIDEBAR DESKTOP (lg e acima) — comportamento original,
                expande no hover.
               ============================================================ */}
            <aside className="group fixed left-6 top-[50px] bottom-[50px] z-50 hidden w-[72px] lg:block">
                <div
                    className="absolute inset-y-0 left-0 flex w-[72px] flex-col overflow-hidden rounded-2xl bg-[#2d2d2d] shadow-2xl transition-[width] duration-200 ease-out will-change-[width] group-hover:w-64"
                    style={{ contain: "paint layout" }}
                >
                    <div className="my-6 flex h-20 shrink-0 items-center overflow-hidden px-4">
                        <div className="relative h-9 w-9 shrink-0 transition-all duration-200 ease-out group-hover:h-14 group-hover:w-[130px]">
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

                    <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3">
                        {visibleNavItems.map(({ label, href, icon: Icon }) => {
                            const active = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex h-11 items-center gap-3 rounded-lg px-3 transition-colors ${active ? "bg-white text-[#2d2d2d]" : "text-gray-300 hover:bg-white/10"
                                        }`}
                                >
                                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                                    <span className="pointer-events-none invisible whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100">
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="shrink-0 overflow-hidden border-t border-white/10 px-3 pb-6 pt-4">
                        <div className="mb-2.5 flex items-center gap-3 overflow-hidden px-1">
                            <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                                {initial}
                            </div>
                            <div className="pointer-events-none invisible whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100">
                                <p className="text-sm font-medium leading-tight text-white">{displayName}</p>
                                <span className="mt-2.5 flex h-[16px] w-[100px] items-center justify-center rounded-full bg-[#F9F9F9] text-[11px] text-[#2d2d2d]">
                                    {role ?? "..."}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-gray-300 transition-colors hover:bg-white/10"
                        >
                            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                            <span className="pointer-events-none invisible whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100">
                                Sair
                            </span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default memo(Sidebar);