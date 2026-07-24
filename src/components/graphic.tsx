"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
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
    return (
        <div className="mt-8 min-w-0 flex-1">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                {title}
            </h2>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                domain={[0, "dataMax"]}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                axisLine={false}
                                tickLine={false}
                                label={{
                                    value: "Fardos",
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
                                }}
                                cursor={{ fill: "#f9f9f9" }}
                                formatter={(value: number, name: string) => [
                                    `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} fardos`,
                                    name,
                                ]}
                                labelFormatter={(label) => `Dia ${label}`}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            {products.map((product) => (
                                <Bar
                                    key={product.key}
                                    dataKey={product.key}
                                    fill={product.color}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}