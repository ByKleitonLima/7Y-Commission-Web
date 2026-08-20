"use client";

import { useMemo, useState, useCallback } from "react";
import DateRangeFilter from "@/components/dateRangeFilter";
import RefreshButton from "@/components/refreshButton";
import StatCard from "@/components/statCard";
import TopRankingCard from "@/components/groupProducts";
import DailySalesChart from "@/components/graphic";
import GroupSalesPieChart from "@/components/topRankCard";
import SupplierRankingTable from "@/components/supplierRankingTable";
import MercadoriaFilterModal from "@/components/mercadoriaFilterModal";
import { useSalesData } from "@/context/salesDataContext";
import { Loader2 } from "lucide-react";
import {
    buildDashboardAggregates,
    buildDailyTotals,
    filterSaleOrders,
    getSortedGroups,
    getSortedRegions,
    getSortedProducts,
    extractGroup,
    extractRegion,
    extractProduct,
    filterByDateRange,
} from "@/lib/salesAggregations";

const ALL_GROUPS = "Todas";
const ALL_REGIONS = "Todas";
const ALL_PRODUCTS = "Todas mercadorias";

export default function Home() {
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    // Filtro geral de mercadoria/grupo (topo da tela) — precisa usar o mesmo
    // critério (extractGroup / coluna GRUPO) que os gráficos usam para
    // agrupar, senão as opções do filtro nunca batem com o que aparece nos
    // gráficos (era esse o bug: usava extractFamily/getSortedFamilies, que
    // é uma coluna diferente da planilha).
    const [selectedGroup, setSelectedGroup] = useState<string>(ALL_GROUPS);
    const [selectedRegion, setSelectedRegion] = useState<string>(ALL_REGIONS);
    // Filtro de mercadoria específico do gráfico de evolução do faturamento —
    // filtra por PRODUTO INDIVIDUAL (mercadoria), não por grupo.
    const [chartProduct, setChartProduct] = useState<string>(ALL_PRODUCTS);
    const { records, isLoading, refresh } = useSalesData();

    const handleDateChange = useCallback((from: string, to: string) => {
        setDateRange({ from, to });
    }, []);

    const handleClearDateFilter = useCallback(() => {
        setDateRange({ from: "", to: "" });
    }, []);

    const saleOrderRecords = useMemo(() => filterSaleOrders(records || []), [records]);

    const hasDateFilter = Boolean(dateRange.from && dateRange.to);

    const recordsInRange = useMemo(
        () => (hasDateFilter ? filterByDateRange(saleOrderRecords, dateRange.from, dateRange.to) : saleOrderRecords),
        [saleOrderRecords, dateRange, hasDateFilter]
    );

    // Opções de mercadoria (grupo) e região são calculadas a partir dos
    // registros já filtrados por data, mas antes do filtro de
    // grupo/região em si — assim o dropdown sempre mostra todas as
    // mercadorias disponíveis no período selecionado.
    const groupOptions = useMemo(() => getSortedGroups(recordsInRange), [recordsInRange]);
    const regionOptions = useMemo(() => getSortedRegions(recordsInRange), [recordsInRange]);

    const filteredRecords = useMemo(() => {
        if (selectedGroup === ALL_GROUPS && selectedRegion === ALL_REGIONS) return recordsInRange;
        return recordsInRange.filter((record) => {
            const matchesGroup =
                selectedGroup === ALL_GROUPS || extractGroup(record).toLowerCase() === selectedGroup.toLowerCase();
            const matchesRegion =
                selectedRegion === ALL_REGIONS || extractRegion(record).toLowerCase() === selectedRegion.toLowerCase();
            return matchesGroup && matchesRegion;
        });
    }, [recordsInRange, selectedGroup, selectedRegion]);

    const aggregates = useMemo(
        () => buildDashboardAggregates(filteredRecords, dateRange.from || undefined, dateRange.to || undefined),
        [filteredRecords, dateRange]
    );

    const totalBundles = useMemo(() => {
        return filteredRecords.reduce((acc, item) => acc + (item.bundleQuantity || item.quantity || 0), 0);
    }, [filteredRecords]);

    // Opções de mercadoria (produto individual) para o filtro do gráfico
    // de evolução do faturamento.
    const productOptions = useMemo(() => getSortedProducts(filteredRecords), [filteredRecords]);

    // Se a mercadoria selecionada não existir mais nas opções atuais
    // (ex: usuário trocou o filtro de Grupo/Região/Data), volta pra
    // "Todas mercadorias" em vez de manter um filtro que não bate com
    // nada e deixar o gráfico vazio silenciosamente.
    const effectiveChartProduct = useMemo(() => {
        if (chartProduct === ALL_PRODUCTS) return ALL_PRODUCTS;
        const stillExists = productOptions.some(
            (p) => p.trim().toLowerCase() === chartProduct.trim().toLowerCase()
        );
        return stillExists ? chartProduct : ALL_PRODUCTS;
    }, [chartProduct, productOptions]);

    const chartRecords = useMemo(() => {
        if (effectiveChartProduct === ALL_PRODUCTS) return filteredRecords;
        // IMPORTANTE: extractProduct(record) precisa ser "trimado" antes de
        // comparar, porque a lista de opções (getSortedProducts) já vem
        // trimada — sem isso, nomes de produto com espaço sobrando no fim
        // (comum vindo da planilha) nunca batiam com a opção escolhida e o
        // gráfico ficava sempre vazio ao filtrar por mercadoria.
        const target = effectiveChartProduct.trim().toLowerCase();
        return filteredRecords.filter((record) => extractProduct(record).trim().toLowerCase() === target);
    }, [filteredRecords, effectiveChartProduct]);

    const dailyTotalsForChart = useMemo(
        () => buildDailyTotals(chartRecords, dateRange.from || undefined, dateRange.to || undefined),
        [chartRecords, dateRange]
    );

    const hasData = filteredRecords.length > 0;

    return (
        <div className="relative mx-auto w-full max-w-[1600px] space-y-8 pb-12 px-1 sm:px-2 lg:px-0">
            {isLoading && (
                <div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                    style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
                >
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                        <Loader2 className="h-10 w-10 animate-spin text-[#2d2d2d]" strokeWidth={2} />
                        <p className="text-sm font-semibold text-[#2d2d2d]">Reconstruindo o Dashboard...</p>
                        <p className="text-xs text-gray-400">Calculando indicadores baseados nos dados reais.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-end gap-3 sm:gap-4 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
                <div className="min-w-[160px] flex-1 sm:flex-none">
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Grupos</label>
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="h-10 w-full sm:max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        <option value={ALL_GROUPS}>Todas mercadorias</option>
                        {groupOptions.map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>

                <div className="min-w-[160px] flex-1 sm:flex-none">
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Regiões</label>
                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="h-10 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        <option value={ALL_REGIONS}>Todas as regiões</option>
                        {regionOptions.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-end gap-2">
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

                <div className="ml-0 sm:ml-auto">
                    <label
                        aria-hidden
                        className="mb-1 hidden select-none text-xs font-semibold uppercase text-transparent sm:block"
                    >
                        Atualizar
                    </label>
                    <RefreshButton onRefresh={refresh} />
                </div>
            </div>

            {!hasData && !isLoading && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Nenhum registro de venda encontrado{hasDateFilter || selectedGroup !== ALL_GROUPS || selectedRegion !== ALL_REGIONS ? " para os filtros selecionados" : ""}. Vá em{" "}
                    <span className="font-medium text-[#2d2d2d]">Importar</span> no menu pra carregar dados{hasDateFilter ? " ou troque os filtros" : ""}.
                </div>
            )}

            {hasData && (
                <div className="space-y-12 lg:space-y-16">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                        <StatCard
                            label="Receita Líquida"
                            value={aggregates.totalNetRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        />
                        <StatCard
                            label="Receita Bruta"
                            value={aggregates.totalGrossRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        />
                        <StatCard
                            label="Total de fardos vendidos"
                            value={totalBundles.toLocaleString("pt-BR")}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-stretch md:grid-cols-2 xl:grid-cols-3">
                        <TopRankingCard title="Gerentes com Maior Faturamento Líquido" items={aggregates.topManagers} />
                        <TopRankingCard title="Vendedores com Maior Volume (Pacotes)" items={aggregates.topSellers} />
                        <TopRankingCard title="Regiões com Maior Faturamento Líquido" items={aggregates.topRegions} />
                    </div>

                    <div>
                        <div className="flex flex-wrap items-end justify-end gap-3">
                            <div className="w-full sm:w-auto">
                                <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">
                                    Mercadoria
                                </label>
                                <MercadoriaFilterModal
                                    value={effectiveChartProduct}
                                    allLabel={ALL_PRODUCTS}
                                    options={productOptions}
                                    onChange={setChartProduct}
                                />
                            </div>
                        </div>
                        <DailySalesChart title="Evolução do Faturamento Líquido" data={dailyTotalsForChart} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-stretch md:grid-cols-2 xl:grid-cols-3">
                        <GroupSalesPieChart title="Faturamento Líquido por Grupos (R$)" data={aggregates.groupSalesData} />
                        <TopRankingCard title={`Top 5 Produtos - ${aggregates.group1Name || "Grupo 1"}`} items={aggregates.group1Products} />
                        <TopRankingCard title={`Top 5 Produtos - ${aggregates.group2Name || "Grupo 2"}`} items={aggregates.group2Products} />
                    </div>

                    <SupplierRankingTable suppliers={aggregates.supplierAggregates} />
                </div>
            )}
        </div>
    );
}