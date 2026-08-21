"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Search, Download, Eye, ShieldAlert } from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import Modal from "@/components/modal";
import { useAuth } from "@/context/AuthContext";
import { fetchAuditLogs, AuditLogEntry, AuditLogFilters } from "@/services/auditLogService";

const ACTION_OPTIONS = [
    { value: "", label: "Todas as ações" },
    { value: "create", label: "Criação" },
    { value: "update", label: "Atualização" },
    { value: "delete", label: "Exclusão" },
    { value: "upload", label: "Importação" },
];

const ENTITY_OPTIONS = [
    { value: "", label: "Todos os tipos" },
    { value: "manager", label: "Gerente" },
    { value: "seller", label: "Vendedor" },
    { value: "client", label: "Cliente" },
    { value: "supplier", label: "Fornecedor" },
    { value: "product", label: "Produto" },
    { value: "sales_upload", label: "Importação de comissão" },
    { value: "stock_price_import", label: "Importação de estoque/preços" },
    { value: "commission_override", label: "Ajuste de comissão" },
    { value: "group_commission_percent", label: "% comissão por grupo" },
    { value: "manager_seller_percent", label: "% gerente por vendedor" },
    { value: "seller_flat_percent", label: "% flat do vendedor" },
    { value: "discount", label: "Desconto manual" },
    { value: "warehouse_dock", label: "Doca do galpão" },
];

const ACTION_BADGE: Record<string, string> = {
    create: "bg-green-100 text-green-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
    upload: "bg-purple-100 text-purple-700",
};

const PAGE_SIZE = 30;

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}
function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const ENTITY_LABEL_MAP = Object.fromEntries(ENTITY_OPTIONS.map((o) => [o.value, o.label]));
const ACTION_LABEL_MAP = Object.fromEntries(ACTION_OPTIONS.map((o) => [o.value, o.label]));

export default function AuditLogsPage() {
    const { role, loading: authLoading } = useAuth();

    const [from, setFrom] = useState(daysAgoISO(7));
    const [to, setTo] = useState(todayISO());
    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [items, setItems] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    const filters: AuditLogFilters = useMemo(
        () => ({
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            action: action || undefined,
            entityType: entityType || undefined,
            search: debouncedSearch || undefined,
            page,
            pageSize: PAGE_SIZE,
        }),
        [from, to, action, entityType, debouncedSearch, page]
    );

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { items: data, total: count } = await fetchAuditLogs(filters);
            setItems(data);
            setTotal(count);
        } catch (err: any) {
            console.error("Erro ao carregar logs de auditoria:", err);
            setError(err.message || "Não foi possível carregar os logs de auditoria.");
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        setPage(0);
    }, [from, to, action, entityType, debouncedSearch]);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const stats = useMemo(() => {
        const creates = items.filter((i) => i.action === "create").length;
        const updates = items.filter((i) => i.action === "update").length;
        const deletes = items.filter((i) => i.action === "delete").length;
        return { creates, updates, deletes };
    }, [items]);

    const handleExportCSV = () => {
        const header = ["Data", "Usuário", "E-mail", "Ação", "Tipo", "Item", "Descrição"];
        const rows = items.map((i) => [
            formatDateTime(i.createdAt),
            i.userName || "",
            i.userEmail || "",
            ACTION_LABEL_MAP[i.action] || i.action,
            ENTITY_LABEL_MAP[i.entityType] || i.entityType,
            i.entityLabel || "",
            (i.description || "").replace(/\n/g, " "),
        ]);

        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `logs-auditoria-${todayISO()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
        setFrom(daysAgoISO(7));
        setTo(todayISO());
        setAction("");
        setEntityType("");
        setSearch("");
    };

    if (authLoading) {
        return (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                Carregando...
            </div>
        );
    }

    if (role && role !== "Admin") {
        return (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <ShieldAlert className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[#2d2d2d]">Esta tela é restrita a administradores.</p>
            </div>
        );
    }

    return (
        <div className="pb-12">
            <div className="flex flex-wrap items-center justify-end gap-3">
                <RefreshButton onRefresh={load} />
                <button
                    onClick={handleExportCSV}
                    disabled={items.length === 0}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                    <Download className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
                    Exportar CSV (página atual)
                </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6">
                <StatCard label="Total no período" value={total} />
                <StatCard label="Criações (página atual)" value={stats.creates} />
                <StatCard label="Atualizações (página atual)" value={stats.updates} />
                <StatCard label="Exclusões (página atual)" value={stats.deletes} />
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">De</label>
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Até</label>
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Ação</label>
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Tipo</label>
                    <select
                        value={entityType}
                        onChange={(e) => setEntityType(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="min-w-[220px] flex-1">
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Buscar</label>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
                        <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Usuário, item ou descrição..."
                            className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 shrink-0 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                    Limpar filtros
                </button>
            </div>

            {error && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Mobile */}
                <div className="divide-y divide-gray-100 md:hidden">
                    {items.map((log) => (
                        <button
                            key={log.id}
                            onClick={() => setDetailLog(log)}
                            className="block w-full p-4 text-left hover:bg-gray-50/60"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#2d2d2d]">
                                        {log.entityLabel || ENTITY_LABEL_MAP[log.entityType] || log.entityType}
                                    </p>
                                    <p className="truncate text-xs text-gray-500">{log.description || "-"}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_BADGE[log.action] || "bg-gray-100 text-gray-600"}`}>
                                    {ACTION_LABEL_MAP[log.action] || log.action}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                                <span>{log.userName || "Sistema"}</span>
                                <span>{formatDateTime(log.createdAt)}</span>
                            </div>
                        </button>
                    ))}
                    {!isLoading && items.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-gray-400">
                            Nenhum log encontrado para os filtros selecionados.
                        </div>
                    )}
                </div>

                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-4 py-3">Data/Hora</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Ação</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3 text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Carregando logs...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">Nenhum log encontrado para os filtros selecionados.</td></tr>
                            ) : (
                                items.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDateTime(log.createdAt)}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{log.userName || "Sistema"}</span>
                                                {log.userEmail && <span className="text-xs text-gray-400">{log.userEmail}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ACTION_BADGE[log.action] || "bg-gray-100 text-gray-600"}`}>
                                                {ACTION_LABEL_MAP[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{ENTITY_LABEL_MAP[log.entityType] || log.entityType}</td>
                                        <td className="px-4 py-3 font-medium text-[#2d2d2d]">{log.entityLabel || "-"}</td>
                                        <td className="max-w-[320px] truncate px-4 py-3 text-gray-500">{log.description || "-"}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setDetailLog(log)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-4 w-4" strokeWidth={1.75} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
                    <span>Página {page + 1} de {totalPages} ({total.toLocaleString("pt-BR")} registros no total)</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isLoading} className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40">Anterior</button>
                        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || isLoading} className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40">Próxima</button>
                    </div>
                </div>
            </div>

            <Modal open={detailLog !== null} onClose={() => setDetailLog(null)} title="Detalhes do log">
                {detailLog && (
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[11px] text-gray-400">Data/Hora</p><p className="font-medium text-[#2d2d2d]">{formatDateTime(detailLog.createdAt)}</p></div>
                            <div><p className="text-[11px] text-gray-400">Usuário</p><p className="font-medium text-[#2d2d2d]">{detailLog.userName || "Sistema"}</p></div>
                            <div><p className="text-[11px] text-gray-400">Ação</p><p className="font-medium text-[#2d2d2d]">{ACTION_LABEL_MAP[detailLog.action] || detailLog.action}</p></div>
                            <div><p className="text-[11px] text-gray-400">Tipo</p><p className="font-medium text-[#2d2d2d]">{ENTITY_LABEL_MAP[detailLog.entityType] || detailLog.entityType}</p></div>
                            <div className="col-span-2"><p className="text-[11px] text-gray-400">Item</p><p className="font-medium text-[#2d2d2d]">{detailLog.entityLabel || "-"}</p></div>
                            <div className="col-span-2"><p className="text-[11px] text-gray-400">Descrição</p><p className="font-medium text-[#2d2d2d]">{detailLog.description || "-"}</p></div>
                        </div>
                        {detailLog.changes && (
                            <div>
                                <p className="mb-1 text-[11px] text-gray-400">Alterações (antes / depois)</p>
                                <pre className="max-h-64 overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-700">
                                    {JSON.stringify(detailLog.changes, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}