"use client";

import React from "react";
import { DockOccupancy, DOCK_STATUS_LABELS } from "@/services/wareHouseServices";

interface WarehouseTooltipProps {
    dock: DockOccupancy;
    x: number;
    y: number;
}

export default function WarehouseTooltip({ dock, x, y }: WarehouseTooltipProps) {
    // Tenta obter o produto alocado na doca
    const product = (dock as any).product || dock.products?.[0];
    const imageUrl = product?.image_url;
    const totalFardos = dock.quantity || product?.sizes?.[0]?.quantity;

    const levels = dock.levels || [
        { level: 4, status: "vazio" },
        { level: 3, status: "vazio" },
        { level: 2, status: "vazio" },
        { level: 1, status: "vazio" },
    ];

    return (
        <div
            style={{
                left: `${x + 15}px`,
                top: `${y + 15}px`,
            }}
            className="pointer-events-none fixed z-50 min-w-[240px] max-w-[280px] rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md"
        >
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
                <span className="font-bold text-slate-100 text-sm">{dock.code}</span>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                    {totalFardos ? `${totalFardos} Fardos` : (DOCK_STATUS_LABELS[dock.status] || "Vazio")}
                </span>
            </div>

            {/* SE HOUVER PRODUTO/MERCADORIA ALOCADA NA DOCA */}
            {product ? (
                <div className="mb-3 flex flex-col items-center gap-2 rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
                    {/* Imagem do Produto */}
                    {imageUrl ? (
                        <div className="relative h-28 w-full overflow-hidden rounded-md border border-slate-700 bg-white/5">
                            <img
                                src={imageUrl}
                                alt={product.name}
                                className="h-full w-full object-contain p-1"
                            />
                        </div>
                    ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-md bg-slate-800 text-[11px] text-slate-400">
                            Sem imagem
                        </div>
                    )}

                    {/* Detalhes da Mercadoria */}
                    <div className="w-full text-left">
                        <h4 className="font-bold text-slate-100 text-xs line-clamp-1">{product.name}</h4>
                        {product.product_code && (
                            <p className="text-[10px] text-slate-400 font-mono">Cód: {product.product_code}</p>
                        )}
                        {((dock as any).sizeName || product.sizes?.[0]?.name) && (
                            <p className="text-[10px] text-slate-300 mt-1">
                                Tamanho: <span className="font-semibold text-blue-400">{(dock as any).sizeName || product.sizes?.[0]?.name}</span>
                            </p>
                        )}
                    </div>
                </div>
            ) : null}

            {/* Visualização dos Níveis de Armazenamento */}
            <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Níveis de Armazenamento
                </div>
                {[...levels].reverse().map((lvl) => {
                    const isOccupied = dock.productCount >= lvl.level;
                    return (
                        <div
                            key={lvl.level}
                            className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${isOccupied
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800/60 text-slate-400"
                                }`}
                        >
                            <span className="font-medium">Nível {lvl.level}</span>
                            <span>{isOccupied ? "Palete Presente" : "Vazio"}</span>
                        </div>
                    );
                })}
            </div>

            {dock.products && dock.products.length > 0 && (
                <div className="mt-2.5 border-t border-slate-800 pt-1.5 text-[11px] text-slate-300">
                    <span className="text-slate-400">Produtos armazenados:</span> {dock.products.length} item(s)
                </div>
            )}
        </div>
    );
}