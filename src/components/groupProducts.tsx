"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface GroupSalesData {
    name: string;
    value: number;
    color: string;
}

interface GroupSalesPieChartProps {
    title: string;
    data: GroupSalesData[];
}

export default function GroupSalesPieChart({ title, data }: GroupSalesPieChartProps) {
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
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #e5e7eb",
                                    fontSize: 12,
                                }}
                                formatter={(value: number, name: string) => {
                                    const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
                                    const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                                    return [
                                        `${Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${pct}%)`,
                                        name,
                                    ];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}