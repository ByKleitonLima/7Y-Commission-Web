"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Loader2, Users, UserCog } from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import DateRangeFilter from "@/components/dateRangeFilter";
import CommissionTable, { CommissionRow } from "@/components/commissionTable";
import EditCommissionModal from "@/components/editCommissionModal";
import { useSalesData } from "@/context/salesDataContext";
import { useAuth } from "@/context/AuthContext";
import { buildCommissionAggregates } from "@/lib/commissionAggregations";
import { filterByDateRange } from "@/lib/salesAggregations";
import {
    fetchCommissionOverrides,
    upsertCommissionOverride,
    deleteCommissionOverrideByKey,
    CommissionOverride,
} from "@/services/commissionOverridesService";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tab = "vendedores" | "gerentes";

export default function CommissionsPage() {
    const { records, isLoading, refresh } = useSalesData();
    const { name, user } = useAuth();
    const editorName = name || user?.email?.split("@")[0] || "Usuário";

    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    const [tab, setTab] = useState<Tab>("vendedores");

    const [overrides, setOverrides] = useState<CommissionOverride[]>([]);
    const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
    const [editingRow, setEditingRow] = useState<CommissionRow | null>(null);
    const [editingType, setEditingType] = useState<"seller" | "manager">("seller");

    const loadOverrides = useCallback(async () => {
        setIsLoadingOverrides(true);
        try {
            const data = await fetchCommissionOverrides(dateRange.from, dateRange.to);
            setOverrides(data);
        } finally {
            setIsLoadingOverrides(false);
        }
    }, [dateRange.from, dateRange.to]);

    useEffect(() => {
        loadOverrides();
    }, [loadOverrides]);

    const handleDateChange = useCallback((from: string, to: string) => {
        setDateRange({ from, to });
    }, []);

    const handleClearDateFilter = useCallback(() => {
        setDateRange({ from: "", to: "" });
    }, []);

    const hasDateFilter = Boolean(dateRange.from && dateRange.to);

    // IMPORTANTE: aqui NÃO filtramos por "PED. VENDA" como o Dashboard faz.
    // A comissão paga considera vendas, devoluções (NF/NF-B) e bonificações
    // juntas — filtrar deixaria a comissão maior do que o valor real pago,
    // pois devoluções abatem da comissão. Os valores de representativeCommission,
    // managerCommission e premiumPaidValue já vêm calculados da planilha
    // (colunas AZ, BA, BB da aba DADOS — fórmulas de devolução/bonificação/
    // desconto por estoque já aplicadas linha a linha antes da exportação).
    // Ver comissionAggregations.ts.
    const recordsInRange = useMemo(
        () => (hasDateFilter ? filterByDateRange(records || [], dateRange.from, dateRange.to) : records || []),
        [records, dateRange, hasDateFilter]
    );

    const { sellers, managers, totals: baseTotals } = useMemo(
        () => buildCommissionAggregates(recordsInRange),
        [recordsInRange]
    );

    const findOverride = useCallback(
        (entityType: "seller" | "manager", entityCode: string) =>
            overrides.find((o) => o.entityType === entityType && o.entityCode === (entityCode || "")),
        [overrides]
    );

    const sellerRows: CommissionRow[] = useMemo(
        () =>
            sellers.map((s) => {
                const ov = findOverride("seller", s.sellerCode);
                const commission = ov?.overrideCommission ?? (
                    ov?.overridePercent != null ? (s.netRevenue * ov.overridePercent) / 100 : s.commission
                );
                const effectivePercent =
                    ov?.overridePercent ??
                    (ov?.overrideCommission != null && s.netRevenue !== 0
                        ? (ov.overrideCommission / s.netRevenue) * 100
                        : s.effectivePercent);

                return {
                    code: s.sellerCode,
                    name: s.sellerName,
                    subtitle: s.managerName,
                    netRevenue: s.netRevenue,
                    commission,
                    effectivePercent,
                    extraValue: s.premium,
                    orders: s.orders,
                    hasOverride: !!ov,
                    originalCommission: s.commission,
                    originalPercent: s.effectivePercent,
                };
            }),
        [sellers, findOverride]
    );

    const managerRows: CommissionRow[] = useMemo(
        () =>
            managers.map((m) => {
                const code = m.supervisorId || `NOME:${m.managerName}`;
                const ov = findOverride("manager", code);
                const commission = ov?.overrideCommission ?? (
                    ov?.overridePercent != null ? (m.netRevenue * ov.overridePercent) / 100 : m.commission
                );
                const effectivePercent =
                    ov?.overridePercent ??
                    (ov?.overrideCommission != null && m.netRevenue !== 0
                        ? (ov.overrideCommission / m.netRevenue) * 100
                        : m.effectivePercent);

                return {
                    code,
                    name: m.managerName,
                    subtitle: `${m.sellersCount} vendedor(es)`,
                    netRevenue: m.netRevenue,
                    commission,
                    effectivePercent,
                    extraValue: m.sellersCount,
                    orders: m.orders,
                    hasOverride: !!ov,
                    originalCommission: m.commission,
                    originalPercent: m.effectivePercent,
                };
            }),
        [managers, findOverride]
    );

    // Totais refletem os valores FINAIS (com ajustes manuais aplicados),
    // já que é isso que efetivamente será pago.
    const totals = useMemo(() => {
        const representativeCommission = sellerRows.reduce((sum, r) => sum + r.commission, 0);
        const managerCommission = managerRows.reduce((sum, r) => sum + r.commission, 0);
        return {
            netRevenue: baseTotals.netRevenue,
            representativeCommission,
            managerCommission,
            premium: baseTotals.premium,
            orders: baseTotals.orders,
        };
    }, [sellerRows, managerRows, baseTotals]);

    const hasData = recordsInRange.length > 0;

    const openEdit = (row: CommissionRow, type: "seller" | "manager") => {
        setEditingType(type);
        setEditingRow(row);
    };

    const handleSaveOverride = async (data: { overrideCommission: number | null; overridePercent: number | null; reason: string }) => {
        if (!editingRow) return;
        await upsertCommissionOverride({
            entityType: editingType,
            entityCode: editingRow.code,
            periodFrom: dateRange.from,
            periodTo: dateRange.to,
            overrideCommission: data.overrideCommission,
            overridePercent: data.overridePercent,
            reason: data.reason,
            updatedBy: editorName,
        });
        await loadOverrides();
    };

    const handleResetOverride = async () => {
        if (!editingRow) return;
        await deleteCommissionOverrideByKey(editingType, editingRow.code, dateRange.from, dateRange.to);
        await loadOverrides();
    };

    return (
        <div className="relative pb-12">
            {(isLoading || isLoadingOverrides) && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                        <Loader2 className="h-10 w-10 animate-spin text-[#2d2d2d]" strokeWidth={2} />
                        <p className="text-sm font-semibold text-[#2d2d2d]">Carregando dados de comissão...</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3">
                    <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={handleDateChange} />
                    {hasDateFilter && (
                        <button
                            type="button"
                            onClick={handleClearDateFilter}
                            className="h-10 shrink-0 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                        >
                            Ver todas as datas
                        </button>
                    )}
                </div>
                <RefreshButton onRefresh={async () => { await refresh(); await loadOverrides(); }} />
            </div>

            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6">
                <StatCard label="Faturamento Líquido" value={currencyFmt(totals.netRevenue)} />
                <StatCard label="Comissão Vendedores" value={currencyFmt(totals.representativeCommission)} />
                <StatCard label="Comissão Gerentes" value={currencyFmt(totals.managerCommission)} />
                <StatCard label="Prêmios Pagos" value={currencyFmt(totals.premium)} />
                <StatCard label="Pedidos" value={totals.orders.toLocaleString("pt-BR")} />
            </div>

            <div className="mt-8 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
                <button
                    type="button"
                    onClick={() => setTab("vendedores")}
                    className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "vendedores" ? "bg-[#2d2d2d] text-white" : "text-gray-500 hover:bg-gray-100"
                        }`}
                >
                    <Users className="h-4 w-4" strokeWidth={1.75} />
                    Vendedores
                </button>
                <button
                    type="button"
                    onClick={() => setTab("gerentes")}
                    className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "gerentes" ? "bg-[#2d2d2d] text-white" : "text-gray-500 hover:bg-gray-100"
                        }`}
                >
                    <UserCog className="h-4 w-4" strokeWidth={1.75} />
                    Gerentes
                </button>
            </div>

            {!hasData && !isLoading && (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Nenhum registro encontrado{hasDateFilter ? " para o período selecionado" : ""}. Vá em{" "}
                    <span className="font-medium text-[#2d2d2d]">Importar</span> no menu para carregar a planilha de
                    comissão.
                </div>
            )}

            {hasData && tab === "vendedores" && (
                <CommissionTable
                    title="Comissão por Vendedor"
                    rows={sellerRows}
                    nameColumnLabel="Vendedor"
                    subtitleColumnLabel="Gerente"
                    extraColumnLabel="Prêmio"
                    searchPlaceholder="Buscar por vendedor, código ou gerente..."
                    emptyLabel="Nenhum vendedor encontrado para os filtros selecionados."
                    onEdit={(row) => openEdit(row, "seller")}
                />
            )}

            {hasData && tab === "gerentes" && (
                <CommissionTable
                    title="Comissão por Gerente"
                    rows={managerRows}
                    nameColumnLabel="Gerente"
                    subtitleColumnLabel="ID Supervisor"
                    extraColumnLabel="Vendedores"
                    searchPlaceholder="Buscar por gerente ou ID supervisor..."
                    emptyLabel="Nenhum gerente encontrado para os filtros selecionados."
                    onEdit={(row) => openEdit(row, "manager")}
                />
            )}

            <EditCommissionModal
                open={editingRow !== null}
                onClose={() => setEditingRow(null)}
                row={editingRow}
                onSave={handleSaveOverride}
                onReset={handleResetOverride}
            />
        </div>
    );
}