"use client";

import { memo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface GroupSalesData {
    name: string;
    value: number;
    fardos?: number;
    color: string;
}

interface GroupSalesPieChartProps {
    title: string;
    data: GroupSalesData[];
}

function CustomTooltip({ active, payload, data }: any) {
    if (!active || !payload || !payload.length) return null;

    const entry = payload[0];
    const total = data.reduce((sum: number, d: GroupSalesData) => sum + (Number(d.value) || 0), 0);
    const pct = total > 0 ? ((Number(entry.value) / total) * 100).toFixed(1) : "0";
    const fardos = entry.payload?.fardos ?? 0;

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg">
            <p className="mb-1 font-semibold text-[#2d2d2d]">{entry.name}</p>
            <p className="mb-0.5 text-gray-500">
                Faturamento:{" "}
                <span className="font-medium text-[#2d2d2d]">
                    {Number(entry.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
            </p>
            <p className="mb-0.5 text-gray-500">
                Fardos: <span className="font-medium text-[#2d2d2d]">{Number(fardos).toLocaleString("pt-BR")}</span>
            </p>
            <p className="text-gray-500">
                Participação: <span className="font-medium text-[#2d2d2d]">{pct}%</span>
            </p>
        </div>
    );
}

function GroupSalesPieChart({ title, data }: GroupSalesPieChartProps) {
    return (
        <div className="mt-8 min-w-0 flex-1">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                {title}
            </h2>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                            >
                                {data.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={(props) => <CustomTooltip {...props} data={data} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

export default memo(GroupSalesPieChart);