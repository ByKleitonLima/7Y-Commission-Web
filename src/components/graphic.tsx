"use client";

import { useMemo, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

export interface ProductSeries {
    key: string;
    color: string;
}

interface ProductSalesChartProps {
    title: string;
    data: Record<string, string | number>[];
    products: ProductSeries[];
}

export default function ProductSalesChart({ title, data, products }: ProductSalesChartProps) {
    // null = todos os produtos selecionados (estado padrão)
    const [selected, setSelected] = useState<string[] | null>(null);
    const [search, setSearch] = useState("");

    const activeKeys = selected ?? products.map((p) => p.key);

    const visibleProducts = useMemo(
        () => products.filter((p) => activeKeys.includes(p.key)),
        [products, activeKeys]
    );

    const filteredProductList = useMemo(
        () => products.filter((p) => p.key.toLowerCase().includes(search.toLowerCase())),
        [products, search]
    );

    const toggleProduct = (key: string) => {
        setSelected((prev) => {
            const base = prev ?? products.map((p) => p.key);
            return base.includes(key) ? base.filter((k) => k !== key) : [...base, key];
        });
    };

    const selectAll = () => setSelected(null);
    const clearAll = () => setSelected([]);

    return (
        <div className="mt-8 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
                <h2 className="text-base font-semibold text-[#2d2d2d]">{title}</h2>

                <div className="flex items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar produto..."
                        className="h-8 w-44 rounded-md border border-gray-200 px-2 text-xs text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                    />
                    <button
                        type="button"
                        onClick={selectAll}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    {data.length === 0 ? (
                        <div className="flex h-[420px] w-full items-center justify-center text-sm text-gray-400">
                            Nenhum dado no período selecionado.
                        </div>
                    ) : (
                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 11, fill: "#6b7280" }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        domain={[0, "dataMax"]}
                                        tick={{ fontSize: 12, fill: "#6b7280" }}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{
                                            value: "Quantidade",
                                            angle: -90,
                                            position: "insideLeft",
                                            style: { fontSize: 12, fill: "#6b7280" },
                                        }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                            fontSize: 12,
                                            maxHeight: 280,
                                            overflowY: "auto",
                                        }}
                                        cursor={{ fill: "#f9f9f9" }}
                                        formatter={(value: number, name: string) => [
                                            `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} un.`,
                                            name,
                                        ]}
                                        labelFormatter={(label) => `Dia ${label}`}
                                    />
                                    {visibleProducts.map((product) => (
                                        <Bar
                                            key={product.key}
                                            dataKey={product.key}
                                            stackId="produtos"
                                            fill={product.color}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Lista lateral funciona como legenda e como filtro (um produto, vários ou todos) */}
                <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                        Produtos ({visibleProducts.length}/{products.length})
                    </p>
                    <div className="space-y-1">
                        {filteredProductList.length === 0 && (
                            <p className="px-1 py-4 text-center text-xs text-gray-400">Nenhum produto encontrado.</p>
                        )}
                        {filteredProductList.map((p) => (
                            <label
                                key={p.key}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-gray-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={activeKeys.includes(p.key)}
                                    onChange={() => toggleProduct(p.key)}
                                    className="h-3 w-3"
                                />
                                <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                />
                                <span className="truncate text-[#2d2d2d]" title={p.key}>
                                    {p.key}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}