// src/app/(Protected)/commissions/page.tsx
"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Loader2, Users, UserCog, Percent } from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import DateRangeFilter from "@/components/dateRangeFilter";
import CommissionTable, { CommissionRow } from "@/components/commissionTable";
import EditCommissionModal from "@/components/editCommissionModal";
import EditGroupPercentModal from "@/components/editGroupPercentModal";
import EditManagerSellerPercentModal from "@/components/editManagerSellerPercentModal";
import { useSalesData } from "@/context/salesDataContext";
import { useAuth } from "@/context/AuthContext";
import {
    buildGroupCommissionAggregates,
    buildGroupPercentOverridesMap,
    buildFlatPercentOverridesMap,
    buildManagerSellerPercentOverridesMap,
    resolveGroupPercent,
    DEFAULT_GROUP_PERCENTS,
    SellerGroupCommissionAggregate,
    ManagerGroupCommissionAggregate,
} from "@/lib/groupCommissionAggregations";
import { filterByDateRange } from "@/lib/salesAggregations";
import {
    fetchCommissionOverrides,
    upsertCommissionOverride,
    deleteCommissionOverrideByKey,
    CommissionOverride,
} from "@/services/commissionOverridesService";
import {
    fetchSellerGroupPercents,
    SellerGroupPercentRow,
} from "@/services/groupCommissionSettingsService";
import { fetchSellerFlatPercents, SellerFlatPercentRow } from "@/services/sellerFlatCommissionService";
import {
    fetchManagerSellerPercents,
    ManagerSellerPercentRow,
} from "@/services/managerSellerCommissionService";
import { fetchManualDiscounts, ManualDiscount } from "@/services/discountService";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tab = "vendedores" | "gerentes";

export default function CommissionsPage() {
    const { records, isLoading, refresh } = useSalesData();
    const { name, user } = useAuth();
    const editorName = name || user?.email?.split("@")[0] || "Usuário";

    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    const [tab, setTab] = useState<Tab>("vendedores");

    // Ajustes MANUAIS de valor final por período (o lápis de "Ajustar
    // comissão"), independentes das regras de % por grupo.
    const [overrides, setOverrides] = useState<CommissionOverride[]>([]);
    const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
    const [editingRow, setEditingRow] = useState<CommissionRow | null>(null);
    const [editingType, setEditingType] = useState<"seller" | "manager">("seller");

    // Percentuais customizados por vendedor/grupo (GRUPO1/GRUPO2), que
    // substituem o padrão da tabela (3%/2%) quando definidos.
    const [groupPercents, setGroupPercents] = useState<SellerGroupPercentRow[]>([]);
    const [isLoadingGroupPercents, setIsLoadingGroupPercents] = useState(false);
    const [editingGroupSeller, setEditingGroupSeller] = useState<SellerGroupCommissionAggregate | null>(null);

    // % flat por vendedor (sobre faturamento líquido) — usado pelas
    // vendedoras do Gerente 10 (padrão 0,5285%), sobrescrevível por vendedor.
    const [flatPercents, setFlatPercents] = useState<SellerFlatPercentRow[]>([]);
    const [isLoadingFlatPercents, setIsLoadingFlatPercents] = useState(false);

    // % que o gerente ganha por vendedor específico (sobre faturamento
    // líquido do vendedor) — usado pelo Gerente 10 (padrão 1,75%),
    // sobrescrevível por vendedor. Editável na tela via o novo modal.
    const [managerSellerPercents, setManagerSellerPercents] = useState<ManagerSellerPercentRow[]>([]);
    const [isLoadingManagerSellerPercents, setIsLoadingManagerSellerPercents] = useState(false);
    const [editingManagerSellerRow, setEditingManagerSellerRow] = useState<ManagerGroupCommissionAggregate | null>(null);

    // Descontos manuais lançados na tela de Devoluções/Descontos
    // (tabela seller_discounts). As devoluções automáticas (linhas
    // DEV.VENDA NF/NF-B) JÁ são descontadas sozinhas aqui, porque elas
    // entram com VLR_LIQUIDO negativo dentro do cálculo por grupo em
    // groupCommissionAggregations.ts. O que faltava era abater também
    // os lançamentos manuais feitos na tela de Descontos — é isso que
    // este bloco resolve.
    const [manualDiscounts, setManualDiscounts] = useState<ManualDiscount[]>([]);
    const [isLoadingManualDiscounts, setIsLoadingManualDiscounts] = useState(false);

    const loadOverrides = useCallback(async () => {
        setIsLoadingOverrides(true);
        try {
            const data = await fetchCommissionOverrides(dateRange.from, dateRange.to);
            setOverrides(data);
        } finally {
            setIsLoadingOverrides(false);
        }
    }, [dateRange.from, dateRange.to]);

    const loadGroupPercents = useCallback(async () => {
        setIsLoadingGroupPercents(true);
        try {
            const data = await fetchSellerGroupPercents();
            setGroupPercents(data);
        } finally {
            setIsLoadingGroupPercents(false);
        }
    }, []);

    const loadFlatPercents = useCallback(async () => {
        setIsLoadingFlatPercents(true);
        try {
            const data = await fetchSellerFlatPercents();
            setFlatPercents(data);
        } finally {
            setIsLoadingFlatPercents(false);
        }
    }, []);

    const loadManagerSellerPercents = useCallback(async () => {
        setIsLoadingManagerSellerPercents(true);
        try {
            const data = await fetchManagerSellerPercents();
            setManagerSellerPercents(data);
        } finally {
            setIsLoadingManagerSellerPercents(false);
        }
    }, []);

    const loadManualDiscounts = useCallback(async () => {
        setIsLoadingManualDiscounts(true);
        try {
            const data = await fetchManualDiscounts();
            setManualDiscounts(data);
        } finally {
            setIsLoadingManualDiscounts(false);
        }
    }, []);

    useEffect(() => {
        loadOverrides();
    }, [loadOverrides]);

    useEffect(() => {
        loadGroupPercents();
    }, [loadGroupPercents]);

    useEffect(() => {
        loadFlatPercents();
    }, [loadFlatPercents]);

    useEffect(() => {
        loadManagerSellerPercents();
    }, [loadManagerSellerPercents]);

    useEffect(() => {
        loadManualDiscounts();
    }, [loadManualDiscounts]);

    const handleDateChange = useCallback((from: string, to: string) => {
        setDateRange({ from, to });
    }, []);

    const handleClearDateFilter = useCallback(() => {
        setDateRange({ from: "", to: "" });
    }, []);

    const hasDateFilter = Boolean(dateRange.from && dateRange.to);

    // IMPORTANTE: assim como antes, NÃO filtramos por "PED. VENDA" aqui —
    // a comissão soma vendas, devoluções (NF/NF-B) e bonificações juntas.
    // As devoluções já chegam com VLR_LIQUIDO negativo, então somando o
    // líquido por grupo (GRUPO1/GRUPO2) elas já se descontam sozinhas da
    // comissão. Ver groupCommissionAggregations.ts.
    const recordsInRange = useMemo(
        () => (hasDateFilter ? filterByDateRange(records || [], dateRange.from, dateRange.to) : records || []),
        [records, dateRange, hasDateFilter]
    );

    const groupPercentOverridesMap = useMemo(
        () => buildGroupPercentOverridesMap(groupPercents),
        [groupPercents]
    );

    const flatPercentOverridesMap = useMemo(
        () => buildFlatPercentOverridesMap(flatPercents),
        [flatPercents]
    );

    const managerSellerPercentOverridesMap = useMemo(
        () => buildManagerSellerPercentOverridesMap(managerSellerPercents),
        [managerSellerPercents]
    );

    const {
        sellers,
        managers,
        totals: baseTotals,
        groupsFound,
    } = useMemo(
        () =>
            buildGroupCommissionAggregates(
                recordsInRange,
                groupPercentOverridesMap,
                flatPercentOverridesMap,
                managerSellerPercentOverridesMap
            ),
        [recordsInRange, groupPercentOverridesMap, flatPercentOverridesMap, managerSellerPercentOverridesMap]
    );

    const findOverride = useCallback(
        (entityType: "seller" | "manager", entityCode: string) =>
            overrides.find((o) => o.entityType === entityType && o.entityCode === (entityCode || "")),
        [overrides]
    );

    // Soma os descontos manuais por vendedor. Usa o código do vendedor
    // como chave principal; quando o lançamento não tem código (foi
    // preenchido só com o nome), cai no nome como chave de fallback —
    // mesmo padrão de agrupamento usado em discountAggregations.ts.
    const manualDiscountsBySeller = useMemo(() => {
        const map = new Map<string, number>();
        for (const d of manualDiscounts) {
            const amount = Number(d.amount) || 0;
            if (amount <= 0) continue;

            const code = (d.sellerCode || "").trim();
            const key = code || `NOME:${(d.sellerName || "").trim().toUpperCase()}`;
            map.set(key, (map.get(key) || 0) + amount);
        }
        return map;
    }, [manualDiscounts]);

    const getManualDiscountFor = useCallback(
        (sellerCode: string, sellerName: string) => {
            const byCode = sellerCode ? manualDiscountsBySeller.get(sellerCode) : undefined;
            if (byCode) return byCode;
            const byName = manualDiscountsBySeller.get(`NOME:${(sellerName || "").trim().toUpperCase()}`);
            return byName || 0;
        },
        [manualDiscountsBySeller]
    );

    const sellerRows: CommissionRow[] = useMemo(
        () =>
            sellers.map((s) => {
                const ov = findOverride("seller", s.sellerCode);
                const baseCommission = ov?.overrideCommission ?? (
                    ov?.overridePercent != null ? (s.netRevenue * ov.overridePercent) / 100 : s.commission
                );
                const effectivePercent =
                    ov?.overridePercent ??
                    (ov?.overrideCommission != null && s.netRevenue !== 0
                        ? (ov.overrideCommission / s.netRevenue) * 100
                        : s.netRevenue !== 0
                            ? (baseCommission / s.netRevenue) * 100
                            : 0);

                // Desconto manual (tela de Devoluções/Descontos) abatido
                // do valor final pago ao vendedor.
                const manualDiscount = getManualDiscountFor(s.sellerCode, s.sellerName);
                const commission = baseCommission - manualDiscount;

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
                    originalPercent: s.netRevenue !== 0 ? (s.commission / s.netRevenue) * 100 : 0,
                    manualDiscount,
                };
            }),
        [sellers, findOverride, getManualDiscountFor]
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
                        : m.netRevenue !== 0
                            ? (m.commission / m.netRevenue) * 100
                            : 0);

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
                    originalPercent: m.netRevenue !== 0 ? (m.commission / m.netRevenue) * 100 : 0,
                };
            }),
        [managers, findOverride]
    );

    // Totais refletem os valores FINAIS (com ajustes manuais e descontos
    // da tela de Devoluções já aplicados), já que é isso que efetivamente
    // será pago.
    const totals = useMemo(() => {
        const representativeCommission = sellerRows.reduce((sum, r) => sum + r.commission, 0);
        const managerCommission = managerRows.reduce((sum, r) => sum + r.commission, 0);
        const manualDiscountsTotal = sellerRows.reduce((sum, r) => sum + (r.manualDiscount || 0), 0);
        return {
            netRevenue: baseTotals.netRevenue,
            representativeCommission,
            managerCommission,
            premium: baseTotals.premium,
            orders: baseTotals.orders,
            manualDiscountsTotal,
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

    // Abre o modal de % por grupo (GRUPO1/GRUPO2) pro vendedor da linha
    // clicada, já preenchendo com o percentual EFETIVO atual dele
    // (customizado, se existir, senão o padrão 3%/2%).
    const openEditGroupPercent = (row: CommissionRow) => {
        const sellerAgg = sellers.find((s) => s.sellerCode === row.code);
        if (!sellerAgg) return;
        setEditingGroupSeller(sellerAgg);
    };

    const currentGroupPercentsForEditingSeller = useMemo(() => {
        if (!editingGroupSeller) return {};
        const result: Record<string, number> = {};
        groupsFound.forEach((g) => {
            result[g] = resolveGroupPercent(editingGroupSeller.sellerCode, g, groupPercentOverridesMap);
        });
        return result;
    }, [editingGroupSeller, groupsFound, groupPercentOverridesMap]);

    // Abre o modal de % por vendedor (visão do gerente): define quanto o
    // gerente ganha sobre cada vendedor dele, e o % flat de cada vendedor.
    const openEditManagerSellerPercent = (row: CommissionRow) => {
        const managerAgg = managers.find(
            (m) => (m.supervisorId || `NOME:${m.managerName}`) === row.code
        );
        if (!managerAgg) return;
        setEditingManagerSellerRow(managerAgg);
    };

    const currentFlatPercentsForEditingManager = useMemo(() => {
        if (!editingManagerSellerRow) return {};
        const result: Record<string, number | undefined> = {};
        editingManagerSellerRow.sellerContributions.forEach((s) => {
            result[s.sellerCode] = flatPercentOverridesMap.get(s.sellerCode);
        });
        return result;
    }, [editingManagerSellerRow, flatPercentOverridesMap]);

    const handleRefreshAll = async () => {
        await Promise.all([
            refresh(),
            loadOverrides(),
            loadGroupPercents(),
            loadFlatPercents(),
            loadManagerSellerPercents(),
            loadManualDiscounts(),
        ]);
    };

    const isPageLoading =
        isLoading ||
        isLoadingOverrides ||
        isLoadingGroupPercents ||
        isLoadingFlatPercents ||
        isLoadingManagerSellerPercents ||
        isLoadingManualDiscounts;

    return (
        <div className="relative pb-12">
            {isPageLoading && (
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
                <RefreshButton onRefresh={handleRefreshAll} />
            </div>

            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
                Regra padrão: vendedor recebe <strong className="text-gray-700">3% sobre o GRUPO1</strong> e{" "}
                <strong className="text-gray-700">2% sobre o GRUPO2</strong> (devoluções já descontadas do
                faturamento líquido). Gerente recebe <strong className="text-gray-700">1/4 do total</strong>{" "}
                que os vendedores dele recebem. Use o ícone <Percent className="inline h-3 w-3" /> na
                linha do vendedor pra combinar um percentual diferente por grupo, e o ícone de pessoas na
                linha do gerente pra definir um % customizado por vendedor (ex: equipe do Gerente 10, que
                recebe 0,5285% flat e cujo gerente recebe 1,75% sobre cada uma). Descontos lançados
                manualmente na tela de <strong className="text-gray-700">Descontos</strong> também são
                abatidos automaticamente do valor final aqui.
            </div>

            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6">
                <StatCard label="Faturamento Líquido" value={currencyFmt(totals.netRevenue)} />
                <StatCard label="Comissão Vendedores" value={currencyFmt(totals.representativeCommission)} />
                <StatCard label="Comissão Gerentes" value={currencyFmt(totals.managerCommission)} />
                <StatCard label="Descontos manuais abatidos" value={currencyFmt(totals.manualDiscountsTotal)} />
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
                    onEditGroupPercent={openEditGroupPercent}
                />
            )}

            {hasData && tab === "gerentes" && (
                <CommissionTable
                    title="Comissão por Gerente"
                    rows={managerRows}
                    nameColumnLabel="Gerente"
                    subtitleColumnLabel="Vendedores"
                    extraColumnLabel="Vendedores"
                    searchPlaceholder="Buscar por gerente ou ID supervisor..."
                    emptyLabel="Nenhum gerente encontrado para os filtros selecionados."
                    onEdit={(row) => openEdit(row, "manager")}
                    onEditManagerSellerPercent={openEditManagerSellerPercent}
                />
            )}

            <EditCommissionModal
                open={editingRow !== null}
                onClose={() => setEditingRow(null)}
                row={editingRow}
                onSave={handleSaveOverride}
                onReset={handleResetOverride}
            />

            <EditGroupPercentModal
                open={editingGroupSeller !== null}
                onClose={() => setEditingGroupSeller(null)}
                sellerCode={editingGroupSeller?.sellerCode || ""}
                sellerName={editingGroupSeller?.sellerName || ""}
                groups={groupsFound}
                currentPercents={currentGroupPercentsForEditingSeller}
                onSaved={loadGroupPercents}
            />

            <EditManagerSellerPercentModal
                open={editingManagerSellerRow !== null}
                onClose={() => setEditingManagerSellerRow(null)}
                supervisorId={editingManagerSellerRow?.supervisorId || ""}
                managerName={editingManagerSellerRow?.managerName || ""}
                sellerContributions={editingManagerSellerRow?.sellerContributions || []}
                currentFlatPercents={currentFlatPercentsForEditingManager}
                onSaved={async () => {
                    await Promise.all([loadManagerSellerPercents(), loadFlatPercents()]);
                }}
            />
        </div>
    );
}