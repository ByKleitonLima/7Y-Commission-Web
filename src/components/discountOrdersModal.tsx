"use client";

import Modal from "@/components/modal";
import { DevolutionOrderDetail } from "@/lib/discountAggregations";

interface DiscountOrdersModalProps {
    open: boolean;
    onClose: () => void;
    sellerName: string;
    orders: DevolutionOrderDetail[];
}

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DiscountOrdersModal({ open, onClose, sellerName, orders }: DiscountOrdersModalProps) {
    return (
        <Modal open={open} onClose={onClose} title={`Devoluções de ${sellerName || "vendedor"}`}>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {orders.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
                        Nenhum pedido de devolução encontrado.
                    </p>
                ) : (
                    orders.map((o) => (
                        <div key={o.id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-medium text-[#2d2d2d]">
                                    {o.productName || "Sem descrição"}
                                </span>
                                <span className="shrink-0 font-semibold text-red-600">{currencyFmt(o.totalValue)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span>{o.description}</span>
                                <span>{o.issueDate}</span>
                            </div>
                            {o.uniqueNumber && (
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Pedido: {o.uniqueNumber} · Cód. produto: {o.productCode}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
}