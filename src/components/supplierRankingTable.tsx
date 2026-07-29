"use client";

import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { ChevronUp, ChevronDown, Camera, User } from "lucide-react";
import type { SupplierAggregate } from "@/lib/salesAggregations";
import { fetchSupplierPhotos, upsertSupplierPhoto } from "@/services/salesService";
import { uploadImageFile } from "@/lib/uploadImage";
import Modal from "@/components/modal";

interface SupplierRankingTableProps {
    suppliers: (SupplierAggregate & { region?: string })[];
}

type SortKey = "netRevenue" | "grossRevenue" | "quantity" | "fardos";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const COLUMNS: { key: SortKey; label: string; format: (v: number) => string }[] = [
    { key: "quantity", label: "Qtd (pacotes)", format: numberFmt },
    { key: "fardos", label: "Fardos", format: numberFmt },
    { key: "grossRevenue", label: "Receita Bruta", format: currencyFmt },
    { key: "netRevenue", label: "Receita Líquida", format: currencyFmt },
];

export default function SupplierRankingTable({ suppliers }: SupplierRankingTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>("netRevenue");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [photos, setPhotos] = useState<Record<string, string>>({});
    const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSupplierPhotos().then(setPhotos);
    }, []);

    const sorted = useMemo(() => {
        return [...suppliers].sort((a, b) => {
            const diff = a[sortKey] - b[sortKey];
            return sortDir === "asc" ? diff : -diff;
        });
    }, [suppliers, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const openPhotoModal = (supplierName: string) => {
        setEditingSupplier(supplierName);
        setPhotoFile(null);
        setPhotoPreview(photos[supplierName] || "");
    };

    const closePhotoModal = () => {
        setEditingSupplier(null);
        setPhotoFile(null);
        setPhotoPreview("");
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSavePhoto = async () => {
        if (!editingSupplier) return;
        try {
            setUploading(true);
            let url = photoPreview;
            if (photoFile) {
                url = await uploadImageFile(photoFile, "suppliers");
            }
            await upsertSupplierPhoto(editingSupplier, url);
            setPhotos((prev) => ({ ...prev, [editingSupplier]: url }));
            closePhotoModal();
        } catch (err) {
            console.error("Erro ao salvar foto do fornecedor:", err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mt-8">
            <h2 className="border-b border-gray-200 pb-2 text-base font-semibold text-[#2d2d2d]">
                Fornecedores
            </h2>

            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-gray-500">
                            <th className="px-4 py-3 font-medium">Fornecedor</th>
                            <th className="px-4 py-3 font-medium">Regiões líderes em compras</th>
                            {COLUMNS.map((c) => (
                                <th key={c.key} className="px-4 py-3 font-medium">
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(c.key)}
                                        className="flex items-center gap-1 hover:text-[#2d2d2d]"
                                    >
                                        {c.label}
                                        {sortKey === c.key &&
                                            (sortDir === "asc" ? (
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            ))}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s) => (
                            <tr key={s.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                                <td className="px-4 py-3 font-semibold text-[#2d2d2d]">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                            {photos[s.name] ? (
                                                <img src={photos[s.name]} alt={s.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
                                            )}
                                        </div>
                                        {s.name}
                                        <button
                                            type="button"
                                            onClick={() => openPhotoModal(s.name)}
                                            title="Alterar foto"
                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                                        >
                                            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{s.region || "—"}</td>
                                {COLUMNS.map((c) => (
                                    <td key={c.key} className="px-4 py-3 text-gray-500">
                                        {c.format(s[c.key])}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {sorted.length === 0 && (
                            <tr>
                                <td colSpan={COLUMNS.length + 2} className="px-4 py-8 text-center text-sm text-gray-400">
                                    Nenhum fornecedor encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal open={editingSupplier !== null} onClose={closePhotoModal} title="Foto do fornecedor">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Prévia" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-7 w-7 text-gray-400" strokeWidth={1.75} />
                            )}
                        </div>
                        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Escolher foto
                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closePhotoModal}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSavePhoto}
                            disabled={uploading}
                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-70"
                        >
                            {uploading ? "Salvando..." : "Salvar"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}