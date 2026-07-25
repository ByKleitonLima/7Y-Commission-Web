"use client";

import { memo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export interface GroupSalesData {
    name: string;
    value: number;
    fardos?: number;
    color: string;
}

interface GroupSalesPieChartProps {
    title: string;
    data?: GroupSalesData[];
}

function CustomTooltip({ active, payload, data }: any) {
    if (!active || !payload || !payload.length) return null;

    const entry = payload[0];
    const total = (data || []).reduce(
        (sum: number, d: GroupSalesData) => sum + (Number(d.value) || 0),
        0
    );

    const pct =
        total > 0 ? ((Number(entry.value) / total) * 100).toFixed(1) : "0";

    const fardos = entry.payload?.fardos ?? 0;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-[#2d2d2d]">{entry.name}</p>

            <p className="mb-0.5 text-gray-500">
                Faturamento:{" "}
                <span className="font-medium text-[#2d2d2d]">
                    {Number(entry.value).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                    })}
                </span>
            </p>

            <p className="mb-0.5 text-gray-500">
                Fardos:{" "}
                <span className="font-medium text-[#2d2d2d]">
                    {Number(fardos).toLocaleString("pt-BR")}
                </span>
            </p>

            <p className="text-gray-500">
                Participação:{" "}
                <span className="font-medium text-[#2d2d2d]">{pct}%</span>
            </p>
        </div>
    );
}

// min-h-[420px] fixo na caixa branca (igual ao TopRankingCard), pra que a
// caixa nunca dependa só do "items-stretch" do grid pra ter uma altura
// razoável. Dentro dela, o conteúdo (gráfico OU mensagem de "sem dados")
// ocupa flex-1 + items-center + justify-center, então fica sempre
// centralizado nos dois eixos.
function GroupSalesPieChart({
    title,
    data = [],
}: GroupSalesPieChartProps) {
    const chartData = Array.isArray(data) ? data : [];

    return (
        <div className="mt-8 flex h-full min-w-0 flex-1 flex-col">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                {title}
            </h2>

            <div className="mt-4 flex min-h-[420px] flex-1 flex-col rounded-xl border border-gray-200 bg-white p-6">
                {chartData.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="px-4 text-center text-sm text-gray-400">
                            Nenhum dado encontrado para os filtros selecionados.
                        </p>
                    </div>
                ) : (
                    <div className="w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>

                                <Tooltip
                                    content={(props) => (
                                        <CustomTooltip {...props} data={chartData} />
                                    )}
                                />

                                <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(GroupSalesPieChart);