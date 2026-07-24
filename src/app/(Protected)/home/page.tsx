"use client";

import { useMemo, useState, useEffect } from "react";
import DateRangeFilter from "@/components/dateRangeFilter";
import RefreshButton from "@/components/refreshButton";
import TopRankingCard from "@/components/topRankCard";
import ProductSalesChart from "@/components/graphic";
import GroupSalesPieChart from "@/components/groupProducts";
import { useSalesData } from "@/context/salesDataContext";
import { fetchAllSalesRecords } from "@/services/salesService";
import { Loader2 } from "lucide-react";
import {
    getTopManagers,
    getTopSellers,
    getTopProducts,
    getTopProductsByGroup,
    getFullProductEvolution,
    getGroupSalesComparison,
    getSortedGroups,
    getSortedProducts,
    getSortedRegions,
    getTopRegions,
    getTopSuppliers,
    extractProduct,
    extractRegion,
    filterByDateRange,
} from "@/lib/salesAggregations";

const STORAGE_KEY = "7y_dashboard_date_range";

// Período padrão: o mês corrente inteiro, no formato DD/MM/AAAA exigido pela tela.
function getDefaultRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return { from: fmt(first), to: fmt(last) };
}

// Lê o último período salvo pelo usuário (localStorage). Em SSR (window
// indisponível) cai para o período padrão; o valor real é sincronizado no
// client assim que o componente monta.
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
    const [isLoading, setIsLoading] = useState(false);
    const { records, setRecords } = useSalesData();

    // Busca TODOS os dados do banco. Só é chamada ao montar a página e quando
    // o usuário clica em "Atualizar" — nunca por causa de filtros, o que evita
    // recálculos desnecessários e mantém os valores estáveis entre atualizações.
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAllSalesRecords();
            setRecords(data || []);
        } catch (error) {
            console.error("Erro ao reconstruir dashboard:", error);
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // carrega uma única vez ao abrir o dashboard

    // Persiste o período selecionado para lembrar na próxima visita.
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
        } catch {
            // localStorage indisponível — segue sem persistir
        }
    }, [dateRange]);

    // Todo o processamento abaixo é derivado (useMemo) dos dados já carregados.
    // Trocar o período, a mercadoria ou a região apenas refiltra em memória —
    // não dispara nenhuma nova busca no banco.
    const recordsInRange = useMemo(
        () => filterByDateRange(records || [], dateRange.from, dateRange.to),
        [records, dateRange]
    );

    // Opções de mercadoria e região vêm de todos os registros do período (não dos
    // já filtrados por mercadoria/região), pra não sumir opção nenhuma do dropdown.
    const productOptions = useMemo(() => getSortedProducts(recordsInRange), [recordsInRange]);
    const regionOptions = useMemo(() => getSortedRegions(recordsInRange), [recordsInRange]);

    const filteredRecords = useMemo(() => {
        return recordsInRange.filter((record) => {
            const matchesProduct =
                selectedProduct === "Todas" || extractProduct(record).toLowerCase() === selectedProduct.toLowerCase();
            const matchesRegion =
                selectedRegion === "Todas" || extractRegion(record).toLowerCase() === selectedRegion.toLowerCase();

            return matchesProduct && matchesRegion;
        });
    }, [recordsInRange, selectedProduct, selectedRegion]);

    const topManagers = useMemo(() => getTopManagers(filteredRecords), [filteredRecords]);
    const topSellers = useMemo(() => getTopSellers(filteredRecords), [filteredRecords]);
    const topProducts = useMemo(() => getTopProducts(filteredRecords), [filteredRecords]);

    // Grupos reais ordenados alfabeticamente (ex: GRUPO1 antes de GRUPO2),
    // em vez de depender da ordem de aparição nos registros.
    const availableGroups = useMemo(() => getSortedGroups(filteredRecords), [filteredRecords]);

    const group1Name = availableGroups[0] || "Grupo 1";
    const group2Name = availableGroups[1] || "Grupo 2";

    const topProductsGroup1 = useMemo(() => getTopProductsByGroup(filteredRecords, group1Name), [filteredRecords, group1Name]);
    const topProductsGroup2 = useMemo(() => getTopProductsByGroup(filteredRecords, group2Name), [filteredRecords, group2Name]);

    const evolutionResult = useMemo(
        () => getFullProductEvolution(filteredRecords, dateRange.from, dateRange.to),
        [filteredRecords, dateRange]
    );

    const groupSalesData = useMemo(() => getGroupSalesComparison(filteredRecords), [filteredRecords]);

    const topRegions = useMemo(() => getTopRegions(filteredRecords), [filteredRecords]);
    const topSuppliers = useMemo(() => getTopSuppliers(filteredRecords), [filteredRecords]);

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
                    <DateRangeFilter
                        from={dateRange.from}
                        to={dateRange.to}
                        onChange={(from, to) => setDateRange({ from, to })}
                    />
                    <RefreshButton onRefresh={loadData} />
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
                        <TopRankingCard title="Gerentes com Maior Faturamento" items={topManagers} />
                        <TopRankingCard title="Vendedores com Maior Volume de Vendas" items={topSellers} />
                        <TopRankingCard title="Produtos Campeões de Vendas (Fardos)" items={topProducts} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TopRankingCard title={`Top 3 Produtos - ${group1Name}`} items={topProductsGroup1} />
                        <TopRankingCard title={`Top 3 Produtos - ${group2Name}`} items={topProductsGroup2} />
                    </div>

                    {/* Gráfico de evolução ocupa a linha inteira para não bugar as legendas */}
                    <div className="grid grid-cols-1">
                        <ProductSalesChart
                            title="Evolução de Vendas no Mês por Produto (Qtd)"
                            data={evolutionResult.data}
                            products={evolutionResult.products}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <GroupSalesPieChart title="Faturamento por Grupos (R$)" data={groupSalesData} />
                        <TopRankingCard title="Vendas por Região (Faturamento)" items={topRegions} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TopRankingCard title="Vendas por Fornecedor (Fardos)" items={topSuppliers} />
                    </div>
                </>
            )}
        </div>
    );
}