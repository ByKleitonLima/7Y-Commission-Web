"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import DiscountsSummaryTable, { DiscountSummaryRow } from "@/components/discountsSummaryTable";
import ManualDiscountsTable from "@/components/manualDiscountsTable";
import AddDiscountModal from "@/components/addDiscountModal";
import DiscountOrdersModal from "@/components/discountOrdersModal";
import { useSalesData } from "@/context/salesDataContext";
import { useOrgData } from "@/context/orgDataContext";
import { useAuth } from "@/context/AuthContext";
import { buildAutomaticDiscountsFromRecords, AutomaticSellerDiscount } from "@/lib/discountAggregations";
import {
    fetchManualDiscounts,
    createManualDiscount,
    updateManualDiscount,
    deleteManualDiscount,
    ManualDiscount,
} from "@/services/discountService";

export default function DiscountsPage() {
    const { records, isLoading: salesLoading, refresh: refreshSales } = useSalesData();
    const { sellers, refresh: refreshOrg } = useOrgData();
    const { name, user } = useAuth();
    const uploaderName = name || user?.email?.split("@")[0] || "Usuário";

    const [manualDiscounts, setManualDiscounts] = useState<ManualDiscount[]>([]);
    const [isLoadingManual, setIsLoadingManual] = useState(true);

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<ManualDiscount | null>(null);
    const [presetSeller, setPresetSeller] = useState<{ code: string; name: string } | null>(null);

    const [ordersModalSeller, setOrdersModalSeller] = useState<AutomaticSellerDiscount | null>(null);

    const [discountToDelete, setDiscountToDelete] = useState<ManualDiscount | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadManualDiscounts = async () => {
        setIsLoadingManual(true);
        const data = await fetchManualDiscounts();
        setManualDiscounts(data);
        setIsLoadingManual(false);
    };

    useEffect(() => {
        loadManualDiscounts();
    }, []);

    const automaticDiscounts = useMemo(() => buildAutomaticDiscountsFromRecords(records), [records]);

    const automaticBySeller = useMemo(() => {
        const map = new Map<string, AutomaticSellerDiscount>();
        automaticDiscounts.forEach((a) => map.set(a.sellerCode, a));
        return map;
    }, [automaticDiscounts]);

    const manualBySeller = useMemo(() => {
        const map = new Map<string, { count: number; value: number; name: string }>();
        manualDiscounts.forEach((d) => {
            const key = d.sellerCode || `NOME:${d.sellerName}`;
            const entry = map.get(key) || { count: 0, value: 0, name: d.sellerName };
            entry.count += 1;
            entry.value += d.amount;
            entry.name = d.sellerName || entry.name;
            map.set(key, entry);
        });
        return map;
    }, [manualDiscounts]);

    const summaryRows: DiscountSummaryRow[] = useMemo(() => {
        const keys = new Set<string>([...automaticBySeller.keys(), ...manualBySeller.keys()]);
        const rows: DiscountSummaryRow[] = [];

        keys.forEach((key) => {
            const auto = automaticBySeller.get(key);
            const manual = manualBySeller.get(key);
            const sellerCode = auto?.sellerCode ?? (key.startsWith("NOME:") ? "" : key);
            const sellerName = auto?.sellerName || manual?.name || "Sem Vendedor";

            rows.push({
                sellerCode,
                sellerName,
                automaticCount: auto?.ordersCount || 0,
                automaticValue: auto?.totalValue || 0,
                manualCount: manual?.count || 0,
                manualValue: manual?.value || 0,
                totalValue: (auto?.totalValue || 0) + (manual?.value || 0),
            });
        });

        return rows.sort((a, b) => b.totalValue - a.totalValue);
    }, [automaticBySeller, manualBySeller]);

    const totals = useMemo(() => {
        const sellersWithDiscount = summaryRows.filter((r) => r.totalValue > 0).length;
        const automaticTotal = summaryRows.reduce((sum, r) => sum + r.automaticValue, 0);
        const manualTotal = summaryRows.reduce((sum, r) => sum + r.manualValue, 0);
        const grandTotal = automaticTotal + manualTotal;
        return { sellersWithDiscount, automaticTotal, manualTotal, grandTotal };
    }, [summaryRows]);

    const handleOpenCreate = () => {
        setEditingDiscount(null);
        setPresetSeller(null);
        setModalOpen(true);
    };

    const handleAddManualForRow = (row: DiscountSummaryRow) => {
        setEditingDiscount(null);
        setPresetSeller({ code: row.sellerCode, name: row.sellerName });
        setModalOpen(true);
    };

    const handleEditDiscount = (discount: ManualDiscount) => {
        setEditingDiscount(discount);
        setPresetSeller(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingDiscount(null);
        setPresetSeller(null);
        setModalOpen(false);
    };

    const handleSaveDiscount = async (data: {
        sellerCode: string;
        sellerName: string;
        amount: number;
        reason: string;
        discountDate: string;
    }) => {
        if (editingDiscount) {
            await updateManualDiscount(editingDiscount.id, data);
        } else {
            await createManualDiscount({ ...data, createdBy: uploaderName });
        }
        await loadManualDiscounts();
    };

    const handleViewOrders = (sellerCode: string) => {
        const auto = automaticBySeller.get(sellerCode);
        if (auto) setOrdersModalSeller(auto);
    };

    const handleConfirmDelete = async () => {
        if (!discountToDelete) return;
        setIsDeleting(true);
        try {
            await deleteManualDiscount(discountToDelete.id);
            setDiscountToDelete(null);
            await loadManualDiscounts();
        } catch (err) {
            console.error("Erro ao excluir desconto:", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRefreshAll = async () => {
        await Promise.all([refreshSales(), refreshOrg(), loadManualDiscounts()]);
    };

    const isLoading = salesLoading || isLoadingManual;

    return (
        <div>
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-3 mt-4">
                    <RefreshButton onRefresh={handleRefreshAll} />
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        Novo desconto manual
                    </button>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-6">
                <StatCard label="Vendedores com desconto" value={totals.sellersWithDiscount} />
                <StatCard
                    label="Devoluções automáticas (planilha)"
                    value={totals.automaticTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                />
                <StatCard
                    label="Descontos manuais"
                    value={totals.manualTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                />
                <StatCard
                    label="Total descontado"
                    value={totals.grandTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                />
            </div>

            {isLoading && summaryRows.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando descontos...
                </div>
            ) : (
                <>
                    <DiscountsSummaryTable
                        rows={summaryRows}
                        onViewOrders={handleViewOrders}
                        onAddManual={handleAddManualForRow}
                    />

                    <ManualDiscountsTable
                        discounts={manualDiscounts}
                        onEdit={handleEditDiscount}
                        onDelete={setDiscountToDelete}
                    />
                </>
            )}

            <AddDiscountModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveDiscount}
                sellers={sellers}
                discountToEdit={editingDiscount}
                presetSeller={presetSeller}
            />

            <DiscountOrdersModal
                open={ordersModalSeller !== null}
                onClose={() => setOrdersModalSeller(null)}
                sellerName={ordersModalSeller?.sellerName || ""}
                orders={ordersModalSeller?.orders || []}
            />

            {discountToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Excluir desconto</h3>
                        </div>

                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Tem certeza que deseja excluir o desconto de{" "}
                            <strong className="text-gray-900">
                                {discountToDelete.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </strong>{" "}
                            lançado para <strong className="text-gray-900">{discountToDelete.sellerName}</strong>?
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDiscountToDelete(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Não, manter
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
                            >
                                {isDeleting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Excluindo...
                                    </span>
                                ) : (
                                    "Sim, excluir"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}