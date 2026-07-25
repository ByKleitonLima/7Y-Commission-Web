"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import DateRangeFilter from "@/components/dateRangeFilter";
import RefreshButton from "@/components/refreshButton";
import TopRankingCard from "@/components/topRankCard";
import DailySalesChart from "@/components/graphic";
import GroupSalesPieChart from "@/components/groupProducts";
import { useSalesData } from "@/context/salesDataContext";
import { Loader2 } from "lucide-react";
import {
    buildDashboardAggregates,
    buildDailyTotals,
    filterSaleOrders,
    getSortedGroups,
    getSortedFamilies,
    getSortedRegions,
    extractFamily,
    extractRegion,
    filterByDateRange,
} from "@/lib/salesAggregations";

const STORAGE_KEY = "7y_dashboard_date_range";
const ALL_FAMILIES = "Todas";
const ALL_REGIONS = "Todas";

function getDefaultRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return { from: fmt(first), to: fmt(last) };
}

function readSavedRange(): { from: string; to: string } {
    if (typeof window === "undefined") return getDefaultRange();
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.from && parsed?.to) return parsed;
        }
    } catch {
        // ignora JSON inválido e usa o padrão
    }
    return getDefaultRange();
}

export default function Home() {
    const [dateRange, setDateRange] = useState(() => readSavedRange());
    // Filtro principal do Dashboard (antes "Mercadoria", agora agrupa por
    // FAMÍLIA — coluna FAMILIA da planilha importada).
    const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILIES);
    const [selectedRegion, setSelectedRegion] = useState<string>(ALL_REGIONS);
    // Filtro independente, só do gráfico "Faturamento Total de Mercadorias":
    // não interfere nos demais cards/rankings da Home.
    const [chartFamily, setChartFamily] = useState<string>(ALL_FAMILIES);
    const { records, isLoading, refresh } = useSalesData();

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
        } catch {
            // localStorage indisponível — segue sem persistir
        }
    }, [dateRange]);

    const handleDateChange = useCallback((from: string, to: string) => {
        setDateRange({ from, to });
    }, []);

    // Relatórios da Home consideram só pedidos de venda de fato (DESCR.
    // "[D] - PED. VENDA" ou "PED. VENDA"). O resto dos lançamentos (ex:
    // devolução, bonificação) fica de fora e é usado em outras telas.
    const saleOrderRecords = useMemo(() => filterSaleOrders(records || []), [records]);

    const recordsInRange = useMemo(
        () => filterByDateRange(saleOrderRecords, dateRange.from, dateRange.to),
        [saleOrderRecords, dateRange]
    );

    // Opções de filtro calculadas ANTES do filtro de Família/Região, pra que
    // o dropdown sempre mostre todas as opções disponíveis no período,
    // independente do que já está selecionado.
    const familyOptions = useMemo(() => getSortedFamilies(recordsInRange), [recordsInRange]);
    const regionOptions = useMemo(() => getSortedRegions(recordsInRange), [recordsInRange]);

    // ---- Sequência de filtragem: período -> família -> região ----
    // Esse é o ÚNICO conjunto de registros usado por todos os cards,
    // rankings e gráficos da Home (exceto o gráfico diário, que aplica um
    // filtro de família adicional e independente por cima deste).
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
        () => buildDashboardAggregates(filteredRecords, dateRange.from, dateRange.to),
        [filteredRecords, dateRange]
    );

    // Filtro independente só do gráfico "Faturamento Total de Mercadorias":
    // parte dos mesmos registros já filtrados por região/período/família
    // principal, mas deixa escolher uma família específica (ou todas) só
    // pra esse gráfico, sem afetar os demais componentes da Home.
    const chartRecords = useMemo(() => {
        if (chartFamily === ALL_FAMILIES) return filteredRecords;
        return filteredRecords.filter(
            (record) => extractFamily(record).toLowerCase() === chartFamily.toLowerCase()
        );
    }, [filteredRecords, chartFamily]);

    const dailyTotalsForChart = useMemo(
        () => buildDailyTotals(chartRecords, dateRange.from, dateRange.to),
        [chartRecords, dateRange]
    );

    const availableGroups = useMemo(() => getSortedGroups(filteredRecords), [filteredRecords]);
    const group1Name = availableGroups[0] || "Grupo 1";
    const group2Name = availableGroups[1] || "Grupo 2";
    const topFamiliesGroup1 = aggregates.productsByGroup[group1Name] || [];
    const topFamiliesGroup2 = aggregates.productsByGroup[group2Name] || [];

    const hasData = filteredRecords.length > 0;

    return (
        <div className="relative mx-auto w-full max-w-[1600px] space-y-8 pb-12">
            {isLoading && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                        <Loader2 className="h-10 w-10 animate-spin text-[#2d2d2d]" strokeWidth={2} />
                        <p className="text-sm font-semibold text-[#2d2d2d]">Reconstruindo o Dashboard...</p>
                        <p className="text-xs text-gray-400">Calculando indicadores baseados nos dados reais.</p>
                    </div>
                </div>
            )}

            {/*
              Barra de filtros: todos os controles (Família, Região, Período,
              Atualizar) ficam num único flex "items-end", cada um dentro de
              uma coluna com label + controle de mesma altura (h-10). O botão
              Atualizar ganha um label invisível igual aos demais só pra
              garantir que a base de todos os elementos fique alinhada.
            */}
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Família</label>
                    <select
                        value={selectedFamily}
                        onChange={(e) => setSelectedFamily(e.target.value)}
                        className="h-10 max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        <option value={ALL_FAMILIES}>Todas as famílias</option>
                        {familyOptions.map((f) => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Região</label>
                    <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    >
                        <option value={ALL_REGIONS}>Todas as regiões</option>
                        {regionOptions.map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={handleDateChange} />

                <div className="ml-auto">
                    <label
                        aria-hidden
                        className="mb-1 block select-none text-xs font-semibold uppercase text-transparent"
                    >
                        Atualizar
                    </label>
                    <RefreshButton onRefresh={refresh} />
                </div>
            </div>

            {/*
              DIAGNÓSTICO TEMPORÁRIO — remova este bloco depois de confirmar
              onde os dados estão zerando. Mostra a contagem de registros em
              cada etapa do pipeline (total carregado -> pedidos de venda ->
              dentro do período -> após família/região). Assim que a Home
              estiver mostrando dados normalmente, pode apagar este <div>.
            */}
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                <strong>Diagnóstico:</strong> total carregado: {records?.length ?? 0} · pedidos de venda
                (DESCR. contém &quot;PED. VENDA&quot;): {saleOrderRecords.length} · dentro do período (
                {dateRange.from} a {dateRange.to}): {recordsInRange.length} · após família/região:{" "}
                {filteredRecords.length}
            </div>

            {!hasData && !isLoading && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Nenhum registro de venda encontrado para o período ou filtros selecionados. Vá em{" "}
                    <span className="font-medium text-[#2d2d2d]">Importar</span> no menu pra carregar dados ou troque os filtros.
                </div>
            )}

            {hasData && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-3">
                        <TopRankingCard title="Gerentes com Maior Faturamento" items={aggregates.topManagers} />
                        <TopRankingCard title="Vendedores com Maior Volume de Vendas" items={aggregates.topSellers} />
                        <TopRankingCard title="Famílias Campeãs de Vendas (Fardos)" items={aggregates.topProducts} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-2">
                        <TopRankingCard title={`Top 3 Famílias - ${group1Name}`} items={topFamiliesGroup1} />
                        <TopRankingCard title={`Top 3 Famílias - ${group2Name}`} items={topFamiliesGroup2} />
                    </div>

                    <div>
                        <div className="flex flex-wrap items-end justify-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">
                                    Família do gráfico
                                </label>
                                <select
                                    value={chartFamily}
                                    onChange={(e) => setChartFamily(e.target.value)}
                                    className="h-10 max-w-[240px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                                >
                                    <option value={ALL_FAMILIES}>Todas as famílias</option>
                                    {familyOptions.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DailySalesChart title="Faturamento Total de Mercadorias" data={dailyTotalsForChart} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-2">
                        <GroupSalesPieChart title="Faturamento por Grupos (R$)" data={aggregates.groupSalesData} />
                        <TopRankingCard title="Vendas por Região (Faturamento)" items={aggregates.topRegions} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-2">
                        <TopRankingCard title="Vendas por Fornecedor (Fardos)" items={aggregates.topSuppliers} />
                    </div>
                </div>
            )}
        </div>
    );
}