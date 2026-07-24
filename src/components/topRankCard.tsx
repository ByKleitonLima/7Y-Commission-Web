"use client";

import { useState } from "react";

export interface RankingDetail {
    label: string;
    value: string;
}

export interface RankingItem {
    position: number;
    name: string;
    subtitle: string;
    value: string;
    avatarUrl?: string;
    details?: RankingDetail[];
}

interface TopRankingCardProps {
    title: string;
    items: RankingItem[];
}

export default function TopRankingCard({ title, items }: TopRankingCardProps) {
    const [hovered, setHovered] = useState<number | null>(null);

    return (
        <div className="flex-1">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                {title}
            </h2>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-2">
                {items.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-gray-400">
                        Sem dados para os filtros selecionados.
                    </p>
                )}

                {items.map((item, index) => (
                    <div
                        key={item.position}
                        className={`relative flex items-center gap-3 px-2 py-3 ${index !== items.length - 1 ? "border-b border-gray-100/50" : ""
                            }`}
                        onMouseEnter={() => setHovered(index)}
                        onMouseLeave={() => setHovered((h) => (h === index ? null : h))}
                    >
                        <span className="w-4 text-sm font-medium text-gray-500">
                            {item.position}º
                        </span>

                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-300 bg-gray-100/50">
                            {item.avatarUrl && (
                                <img
                                    src={item.avatarUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>

                        <div className="flex-1 cursor-default">
                            <p className="text-sm font-semibold leading-tight text-[#2d2d2d]">
                                {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                        </div>

                        <span className="text-sm font-semibold text-[#2d2d2d]">
                            {item.value}
                        </span>

                        {item.details && item.details.length > 0 && hovered === index && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                                <p className="mb-2 truncate text-xs font-semibold text-[#2d2d2d]">
                                    {item.name}
                                </p>
                                <div className="space-y-1">
                                    {item.details.map((d) => (
                                        <div key={d.label} className="flex items-center justify-between gap-3 text-xs">
                                            <span className="text-gray-500">{d.label}</span>
                                            <span className="font-medium text-[#2d2d2d]">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}