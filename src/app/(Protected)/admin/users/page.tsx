"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, ShieldOff, Save, RotateCw, Search } from "lucide-react";
import { authFetch } from "@/lib/apiClient";
import { NAV_ITEMS } from "@/lib/navItems";
import { useAuth } from "@/context/AuthContext";

interface AdminUserRow {
    uid: string;
    email: string;
    name: string;
    role: "Admin" | "Usuário";
    allowedPages: string[];
    disabled: boolean;
    createdAt: string | null;
    lastSignIn: string | null;
}

// Telas que podem ser marcadas individualmente para um usuário comum.
// Auditoria e Administração ficam de fora — só existem para Admin.
const ASSIGNABLE_PAGES = NAV_ITEMS.filter(
    (item) => item.href !== "/audit-logs" && item.href !== "/admin/users"
);

export default function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [savingUid, setSavingUid] = useState<string | null>(null);
    // Rascunho local de allowedPages por usuário (editado antes de salvar).
    const [draftPages, setDraftPages] = useState<Record<string, string[]>>({});

    const loadUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authFetch("/api/admin/users", { method: "GET" });
            const list: AdminUserRow[] = data.users || [];
            setUsers(list);
            const drafts: Record<string, string[]> = {};
            list.forEach((u) => {
                drafts[u.uid] = u.allowedPages;
            });
            setDraftPages(drafts);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Não foi possível carregar os usuários.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
    }, [users, search]);

    const toggleDraftPage = (uid: string, href: string) => {
        setDraftPages((prev) => {
            const current = prev[uid] || [];
            const next = current.includes(href)
                ? current.filter((h) => h !== href)
                : [...current, href];
            return { ...prev, [uid]: next };
        });
    };

    const handleToggleRole = async (u: AdminUserRow) => {
        const nextRole = u.role === "Admin" ? "Usuário" : "Admin";
        if (nextRole === "Usuário" && !confirm(`Remover o acesso de administrador de "${u.name}"?`)) return;

        setSavingUid(u.uid);
        try {
            await authFetch(`/api/admin/users/${u.uid}`, {
                method: "PATCH",
                body: JSON.stringify({ role: nextRole }),
            });
            await loadUsers();
        } catch (err: any) {
            alert(err.message || "Não foi possível atualizar o papel deste usuário.");
        } finally {
            setSavingUid(null);
        }
    };

    const handleSavePages = async (u: AdminUserRow) => {
        setSavingUid(u.uid);
        try {
            await authFetch(`/api/admin/users/${u.uid}`, {
                method: "PATCH",
                body: JSON.stringify({ allowedPages: draftPages[u.uid] || [] }),
            });
            await loadUsers();
        } catch (err: any) {
            alert(err.message || "Não foi possível salvar as permissões deste usuário.");
        } finally {
            setSavingUid(null);
        }
    };

    return (
        <div className="pb-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou e-mail..."
                        className="w-64 bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                    />
                </div>
                <button
                    type="button"
                    onClick={loadUsers}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                    <RotateCw className="h-4 w-4" strokeWidth={1.75} />
                    Atualizar
                </button>
            </div>

            {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando usuários...
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {filtered.map((u) => {
                        const isAdmin = u.role === "Admin";
                        const isSelf = u.uid === currentUser?.uid;
                        return (
                            <div key={u.uid} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[#2d2d2d]">
                                            {u.name}{" "}
                                            {isSelf && <span className="text-xs font-normal text-gray-400">(você)</span>}
                                        </p>
                                        <p className="truncate text-xs text-gray-500">{u.email}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {u.role}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleRole(u)}
                                            disabled={savingUid === u.uid || (isAdmin && isSelf)}
                                            title={
                                                isAdmin && isSelf
                                                    ? "Você não pode remover seu próprio acesso de administrador"
                                                    : ""
                                            }
                                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isAdmin
                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                }`}
                                        >
                                            {isAdmin ? (
                                                <>
                                                    <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} /> Remover admin
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> Tornar admin
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Telas com acesso {isAdmin && "(admin tem acesso a todas automaticamente)"}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                        {ASSIGNABLE_PAGES.map((page) => {
                                            const checked = isAdmin || (draftPages[u.uid] || []).includes(page.href);
                                            return (
                                                <label
                                                    key={page.href}
                                                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${isAdmin ? "border-gray-100 bg-gray-50 text-gray-400" : "border-gray-200 text-gray-700"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        disabled={isAdmin}
                                                        onChange={() => toggleDraftPage(u.uid, page.href)}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                    {page.label}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {!isAdmin && (
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleSavePages(u)}
                                                disabled={savingUid === u.uid}
                                                className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-60"
                                            >
                                                <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                {savingUid === u.uid ? "Salvando..." : "Salvar permissões"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                            Nenhum usuário encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}