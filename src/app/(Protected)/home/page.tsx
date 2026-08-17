"use client";

import { useMemo, useState, useCallback } from "react";
import DateRangeFilter from "@/components/dateRangeFilter";
import RefreshButton from "@/components/refreshButton";
import StatCard from "@/components/statCard";
import TopRankingCard from "@/components/groupProducts";
import DailySalesChart from "@/components/graphic";
import GroupSalesPieChart from "@/components/topRankCard";
import SupplierRankingTable from "@/components/supplierRankingTable";
import { useSalesData } from "@/context/salesDataContext";
import { Loader2 } from "lucide-react";
import {
    buildDashboardAggregates,
    buildDailyTotals,
    filterSaleOrders,
    getSortedFamilies,
    getSortedRegions,
    extractFamily,
    extractRegion,
    filterByDateRange,
} from "@/lib/salesAggregations";

const ALL_FAMILIES = "Todas";
const ALL_REGIONS = "Todas";

export default function Home() {
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILIES);
    const [selectedRegion, setSelectedRegion] = useState<string>(ALL_REGIONS);
    const [chartFamily, setChartFamily] = useState<string>(ALL_FAMILIES);
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

    const familyOptions = useMemo(() => getSortedFamilies(recordsInRange), [recordsInRange]);
    const regionOptions = useMemo(() => getSortedRegions(recordsInRange), [recordsInRange]);

    const filteredRecords = useMemo(() => {
        if (selectedFamily === ALL_FAMILIES && selectedRegion === ALL_REGIONS) return recordsInRange;
        return recordsInRange.filter((record) => {
            const matchesFamily =
                selectedFamily === ALL_FAMILIES || extractFamily(record).toLowerCase() === selectedFamily.toLowerCase();
            const matchesRegion =
                selectedRegion === ALL_REGIONS || extractRegion(record).toLowerCase() === selectedRegion.toLowerCase();
            return matchesFamily && matchesRegion;
        });
    }, [recordsInRange, selectedFamily, selectedRegion]);

    const aggregates = useMemo(
        () => buildDashboardAggregates(filteredRecords, dateRange.from || undefined, dateRange.to || undefined),
        [filteredRecords, dateRange]
    );

    const totalBundles = useMemo(() => {
        return filteredRecords.reduce((acc, item) => acc + (item.bundleQuantity || item.quantity || 0), 0);
    }, [filteredRecords]);

    const chartRecords = useMemo(() => {
        if (chartFamily === ALL_FAMILIES) return filteredRecords;
        return filteredRecords.filter(
            (record) => extractFamily(record).toLowerCase() === chartFamily.toLowerCase()
        );
    }, [filteredRecords, chartFamily]);

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
                        value={selectedFamily}
                        onChange={(e) => setSelectedFamily(e.target.value)}
                        className="h-10 w-full sm:max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        <option value={ALL_FAMILIES}>Todas mercadorias</option>
                        {familyOptions.map((f) => (
                            <option key={f} value={f}>{f}</option>
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
                    Nenhum registro de venda encontrado{hasDateFilter || selectedFamily !== ALL_FAMILIES || selectedRegion !== ALL_REGIONS ? " para os filtros selecionados" : ""}. Vá em{" "}
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
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">
                                    Grupo
                                </label>
                                <select
                                    value={chartFamily}
                                    onChange={(e) => setChartFamily(e.target.value)}
                                    className="h-10 w-full max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                                >
                                    <option value={ALL_FAMILIES}>Todas mercadorias</option>
                                    {familyOptions.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
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