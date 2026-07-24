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
    getSortedGroups,
    getSortedProducts,
    getSortedRegions,
    extractProduct,
    extractRegion,
    filterByDateRange,
} from "@/lib/salesAggregations";

const STORAGE_KEY = "7y_dashboard_date_range";

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
    const [selectedProduct, setSelectedProduct] = useState<string>("Todas");
    const [selectedRegion, setSelectedRegion] = useState<string>("Todas");
    // records/isLoading/refresh vêm do SalesDataProvider (montado uma vez no
    // layout raiz do app) — a Home NÃO busca dados sozinha, só lê o que já
    // está carregado e dispara refresh() quando o usuário aperta "Atualizar".
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

    const recordsInRange = useMemo(
        () => filterByDateRange(records || [], dateRange.from, dateRange.to),
        [records, dateRange]
    );

    const productOptions = useMemo(() => getSortedProducts(recordsInRange), [recordsInRange]);
    const regionOptions = useMemo(() => getSortedRegions(recordsInRange), [recordsInRange]);

    const filteredRecords = useMemo(() => {
        if (selectedProduct === "Todas" && selectedRegion === "Todas") return recordsInRange;
        return recordsInRange.filter((record) => {
            const matchesProduct =
                selectedProduct === "Todas" || extractProduct(record).toLowerCase() === selectedProduct.toLowerCase();
            const matchesRegion =
                selectedRegion === "Todas" || extractRegion(record).toLowerCase() === selectedRegion.toLowerCase();
            return matchesProduct && matchesRegion;
        });
    }, [recordsInRange, selectedProduct, selectedRegion]);

    // Única passagem pelos dados filtrados — substitui as 9 chamadas
    // separadas que existiam antes (cada uma reiterando o array inteiro).
    // dateRange é passado só pra preencher com zero os dias sem venda no
    // gráfico diário, sem precisar de outra iteração pra isso.
    const aggregates = useMemo(
        () => buildDashboardAggregates(filteredRecords, dateRange.from, dateRange.to),
        [filteredRecords, dateRange]
    );

    const availableGroups = useMemo(() => getSortedGroups(filteredRecords), [filteredRecords]);
    const group1Name = availableGroups[0] || "Grupo 1";
    const group2Name = availableGroups[1] || "Grupo 2";
    const topProductsGroup1 = aggregates.productsByGroup[group1Name] || [];
    const topProductsGroup2 = aggregates.productsByGroup[group2Name] || [];

    const hasData = filteredRecords.length > 0;

    return (
        <div className="relative pb-12">
            {isLoading && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl border border-gray-100">
                        <Loader2 className="h-10 w-10 animate-spin text-[#2d2d2d]" strokeWidth={2} />
                        <p className="text-sm font-semibold text-[#2d2d2d]">Reconstruindo o Dashboard...</p>
                        <p className="text-xs text-gray-400">Calculando indicadores baseados nos dados reais.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Mercadoria</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="h-10 max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                        >
                            <option value="Todas">Todas as mercadorias</option>
                            {productOptions.map((p) => (
                                <option key={p} value={p}>{p}</option>
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
                            <option value="Todas">Todas as regiões</option>
                            {regionOptions.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={handleDateChange} />
                    <RefreshButton onRefresh={refresh} />
                </div>
            </div>

            {!hasData && !isLoading && (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Nenhum registro encontrado para o período ou filtros selecionados. Vá em <span className="font-medium text-[#2d2d2d]">Importar</span> no menu pra carregar dados ou troque os filtros.
                </div>
            )}

            {hasData && (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <TopRankingCard title="Gerentes com Maior Faturamento" items={aggregates.topManagers} />
                        <TopRankingCard title="Vendedores com Maior Volume de Vendas" items={aggregates.topSellers} />
                        <TopRankingCard title="Produtos Campeões de Vendas (Fardos)" items={aggregates.topProducts} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TopRankingCard title={`Top 3 Produtos - ${group1Name}`} items={topProductsGroup1} />
                        <TopRankingCard title={`Top 3 Produtos - ${group2Name}`} items={topProductsGroup2} />
                    </div>

                    <div className="grid grid-cols-1">
                        <DailySalesChart
                            title="Faturamento Total de Mercadorias"
                            data={aggregates.dailyTotals}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <GroupSalesPieChart title="Faturamento por Grupos (R$)" data={aggregates.groupSalesData} />
                        <TopRankingCard title="Vendas por Região (Faturamento)" items={aggregates.topRegions} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TopRankingCard title="Vendas por Fornecedor (Fardos)" items={aggregates.topSuppliers} />
                    </div>
                </>
            )}
        </div>
    );
}