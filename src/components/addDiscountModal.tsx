"use client";

import { useState, useEffect, FormEvent } from "react";
import { X } from "lucide-react";
import { Seller } from "@/components/sellersStable";
import { ManualDiscount } from "@/services/discountService";

interface AddDiscountModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: {
        sellerCode: string;
        sellerName: string;
        amount: number;
        reason: string;
        discountDate: string;
    }) => Promise<void>;
    sellers: Seller[];
    discountToEdit?: ManualDiscount | null;
    presetSeller?: { code: string; name: string } | null;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function AddDiscountModal({
    open,
    onClose,
    onSave,
    sellers,
    discountToEdit,
    presetSeller,
}: AddDiscountModalProps) {
    const [sellerCode, setSellerCode] = useState("");
    const [sellerName, setSellerName] = useState("");
    const [amount, setAmount] = useState<number | "">("");
    const [reason, setReason] = useState("");
    const [discountDate, setDiscountDate] = useState(todayISO());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (discountToEdit) {
            setSellerCode(discountToEdit.sellerCode || "");
            setSellerName(discountToEdit.sellerName || "");
            setAmount(discountToEdit.amount || "");
            setReason(discountToEdit.reason || "");
            setDiscountDate(discountToEdit.discountDate || todayISO());
        } else if (presetSeller) {
            setSellerCode(presetSeller.code || "");
            setSellerName(presetSeller.name || "");
            setAmount("");
            setReason("");
            setDiscountDate(todayISO());
        } else {
            setSellerCode("");
            setSellerName("");
            setAmount("");
            setReason("");
            setDiscountDate(todayISO());
        }
    }, [open, discountToEdit, presetSeller]);

    if (!open) return null;

    const handleSelectSeller = (code: string) => {
        const seller = sellers.find((s) => s.code === code);
        setSellerCode(code);
        setSellerName(seller?.name || "");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!sellerName.trim() || amount === "" || Number(amount) <= 0) return;

        try {
            setSaving(true);
            await onSave({
                sellerCode: sellerCode.trim(),
                sellerName: sellerName.trim(),
                amount: Number(amount),
                reason: reason.trim(),
                discountDate,
            });
            onClose();
        } catch (err) {
            console.error("Erro ao salvar desconto:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#2d2d2d]">
                        {discountToEdit ? "Editar desconto" : "Novo desconto manual"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Vendedor cadastrado
                        </label>
                        <select
                            value={sellerCode}
                            onChange={(e) => handleSelectSeller(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        >
                            <option value="">Selecione ou preencha manualmente abaixo</option>
                            {sellers.map((s) => (
                                <option key={s.id} value={s.code}>
                                    {s.name} ({s.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                            <input
                                type="text"
                                value={sellerCode}
                                onChange={(e) => setSellerCode(e.target.value)}
                                placeholder="Ex: V-001"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                            <input
                                type="text"
                                required
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                placeholder="Nome do vendedor"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="0,00"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
                            <input
                                type="date"
                                value={discountDate}
                                onChange={(e) => setDiscountDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Ajuste de comissão referente a..."
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] focus:ring-1 focus:ring-[#2d2d2d]"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {saving ? "Salvando..." : "Salvar desconto"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}