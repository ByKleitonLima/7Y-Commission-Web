"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LabelList,
} from "recharts";
import type { DailyTotal } from "@/lib/salesAggregations";
import MobileDailyRangeFilter, { useIsMobile } from "@/components/mobileDailyRangeFilter";

interface DailySalesChartProps {
    title: string;
    data: DailyTotal[];
}

const FARDOS_COLOR = "#2d2d2d";
const REVENUE_COLOR = "#10b981";

function formatCurrencyShort(v: number) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
    return `R$ ${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const fardos = payload.find((p: any) => p.dataKey === "fardos")?.value ?? 0;
    const revenue = payload.find((p: any) => p.dataKey === "revenue")?.value ?? 0;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-[#2d2d2d]">Dia {label}</p>
            <p className="mb-0.5 text-gray-500">
                Fardos vendidos: <span className="font-medium text-[#2d2d2d]">{Number(fardos).toLocaleString("pt-BR")}</span>
            </p>
            <p className="text-gray-500">
                Faturamento:{" "}
                <span className="font-medium text-[#2d2d2d]">
                    {Number(revenue).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
            </p>
        </div>
    );
}

// Memoizado: só recalcula quando `data` (referência) muda de verdade.
function DailySalesChart({ title, data }: DailySalesChartProps) {
    const isMobile = useIsMobile();

    // Filtro de período — só é exibido/aplicado no mobile (componente
    // MobileDailyRangeFilter). No desktop o gráfico sempre mostra o
    // range completo recebido via props (comportamento original,
    // controlado pelo DateRangeFilter lá em cima da tela do Dashboard).
    const [mobileRangeDays, setMobileRangeDays] = useState(7);

    // Sempre que a tela deixa de ser mobile, volta o filtro pro padrão
    // de 7 dias — evita que, ao voltar pro mobile depois, o gráfico
    // continue "bugado" mostrando todo o período sem o usuário perceber.
    useEffect(() => {
        if (!isMobile) setMobileRangeDays(7);
    }, [isMobile]);

    const displayData = useMemo(() => {
        if (!isMobile || mobileRangeDays === 0) return data;
        return data.slice(-mobileRangeDays);
    }, [data, isMobile, mobileRangeDays]);

    const hasData = displayData.some((d) => d.revenue > 0 || d.fardos > 0);

    return (
        <div className="mt-8 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <h2 className="text-base font-semibold text-[#2d2d2d]">{title}</h2>
                <MobileDailyRangeFilter value={mobileRangeDays} onChange={setMobileRangeDays} />
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
                {!hasData ? (
                    <div className="flex h-[380px] w-full items-center justify-center text-sm text-gray-400">
                        Nenhum dado no período/filtro selecionado.
                    </div>
                ) : (
                    <div className="h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={displayData}
                                margin={{ top: 24, right: 20, left: 0, bottom: isMobile ? 20 : 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11, fill: "#6b7280" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                    angle={isMobile ? -45 : 0}
                                    textAnchor={isMobile ? "end" : "middle"}
                                    height={isMobile ? 40 : 30}
                                />
                                <YAxis
                                    yAxisId="fardos"
                                    tick={{ fontSize: 11, fill: "#6b7280" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={isMobile ? 28 : 60}
                                />
                                <YAxis
                                    yAxisId="revenue"
                                    orientation="right"
                                    tickFormatter={formatCurrencyShort}
                                    tick={{ fontSize: 11, fill: "#6b7280" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={isMobile ? 46 : 60}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9f9f9" }} isAnimationActive={false} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    yAxisId="fardos"
                                    dataKey="fardos"
                                    name="Fardos vendidos"
                                    fill={FARDOS_COLOR}
                                    radius={[3, 3, 0, 0]}
                                    isAnimationActive={false}
                                >
                                    <LabelList
                                        dataKey="fardos"
                                        position="top"
                                        formatter={(value: number) => (value > 0 ? value.toLocaleString("pt-BR") : "")}
                                        style={{ fontSize: 10, fill: "#2d2d2d", fontWeight: 600 }}
                                    />
                                </Bar>
                                <Line
                                    yAxisId="revenue"
                                    dataKey="revenue"
                                    name="Faturamento"
                                    type="monotone"
                                    stroke={REVENUE_COLOR}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(DailySalesChart);