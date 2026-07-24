"use client";

import { useMemo, useState, useEffect } from "react";
import Month from "@/components/month";
import RefreshButton from "@/components/refreshButton";
import TopRankingCard from "@/components/topRankCard";
import ProductSalesChart from "@/components/graphic";
import GroupSalesPieChart from "@/components/groupProducts";
import { useSalesData } from "@/context/salesDataContext";
import { fetchSalesByMonth } from "@/services/salesService";
import { Loader2 } from "lucide-react";
import {
    getTopManagers,
    getTopSellers,
    getTopProducts,
    getTopProductsByGroup,
    getMonthlySalesByProduct,
    getGroupSalesComparison,
    getSortedGroups,
    getSortedProducts,
    getSortedRegions,
    getTopRegions,
    getTopSuppliers,
    extractCompany,
    extractProduct,
    extractRegion,
} from "@/lib/salesAggregations";

// Mês atual no formato exigido pelo <input type="month"> (ex: "2026-07")
function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
    const [month, setMonth] = useState(getCurrentMonth());
    const [selectedCompany, setSelectedCompany] = useState<string>("Todas");
    const [selectedProduct, setSelectedProduct] = useState<string>("Todas");
    const [selectedRegion, setSelectedRegion] = useState<string>("Todas");
    const [isLoading, setIsLoading] = useState(false);
    const { records, setRecords } = useSalesData();

    const loadData = async (targetMonth: string) => {
        setIsLoading(true);
        setRecords([]);

        try {
            const data = await fetchSalesByMonth(targetMonth);
            setRecords(data || []);
        } catch (error) {
            console.error("Erro ao reconstruir dashboard:", error);
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData(month);
    }, [month]);

    const filteredRecords = useMemo(() => {
        if (!records || !Array.isArray(records)) return [];

        return records.filter((record) => {
            const matchesCompany =
                selectedCompany === "Todas" || extractCompany(record).toLowerCase() === selectedCompany.toLowerCase();
            const matchesProduct =
                selectedProduct === "Todas" || extractProduct(record).toLowerCase() === selectedProduct.toLowerCase();
            const matchesRegion =
                selectedRegion === "Todas" || extractRegion(record).toLowerCase() === selectedRegion.toLowerCase();

            return matchesCompany && matchesProduct && matchesRegion;
        });
    }, [records, selectedCompany, selectedProduct, selectedRegion]);

    // Opções de mercadoria e região vêm de TODOS os registros do mês (não dos já filtrados),
    // pra não sumir opção nenhuma do dropdown conforme o usuário filtra.
    const productOptions = useMemo(() => getSortedProducts(records || []), [records]);
    const regionOptions = useMemo(() => getSortedRegions(records || []), [records]);

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

    const monthlyResult = useMemo(() => getMonthlySalesByProduct(filteredRecords), [filteredRecords]);
    const monthlySales = monthlyResult?.data || [];
    const productSeries = monthlyResult?.products || [];

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
                        <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Empresa</label>
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                        >
                            <option value="Todas">Todas as empresas</option>
                            <option value="7y">7y</option>
                            <option value="DFM">DFM</option>
                        </select>
                    </div>

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
                    <Month value={month} onChange={setMonth} />
                    <RefreshButton onRefresh={() => loadData(month)} />
                </div>
            </div>

            {!hasData && !isLoading && (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Nenhum registro encontrado para o período ou empresa selecionada. Vá em <span className="font-medium text-[#2d2d2d]">Importar</span> no menu pra carregar dados ou troque os filtros.
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

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <ProductSalesChart title="Evolução de Vendas no Mês por Produto (Qtd)" data={monthlySales} products={productSeries} />
                        <GroupSalesPieChart title="Faturamento por Grupos (R$)" data={groupSalesData} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <TopRankingCard title="Vendas por Região (Faturamento)" items={topRegions} />
                        <TopRankingCard title="Vendas por Fornecedor (Fardos)" items={topSuppliers} />
                    </div>
                </>
            )}
        </div>
    );
}