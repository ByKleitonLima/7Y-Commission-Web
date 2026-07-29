"use client";

import { useState, useRef } from "react";
import { UserPlus, Upload } from "lucide-react";
import StatCard from "@/components/statCard";
import SuppliersTable, { Supplier } from "@/components/suppliersTable";
import AddSupplierModal from "@/components/addSupplierModal";
import UploadLoader from "@/components/uploadLoader";
import RefreshButton from "@/components/refreshButton";
import { createSupplier, updateSupplier, deleteSupplier } from "@/services/supplierService";
import { supabase } from "@/lib/supabase";
import { useOrgData } from "@/context/orgDataContext";
import * as XLSX from "xlsx";

export default function Suppliers() {
    const { suppliers, isLoading, refresh } = useOrgData();

    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === "Ativo").length;
    const inactive = suppliers.filter((s) => s.status === "Inativo").length;
    const linkedProducts = suppliers.reduce((sum, s) => sum + (s.productsCount || 0), 0);

    const handleOpenCreate = () => {
        setEditingSupplier(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingSupplier(null);
        setModalOpen(false);
    };

    const handleSaveSupplier = async (supplierData: Omit<Supplier, "id">) => {
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, supplierData);
            } else {
                await createSupplier(supplierData);
            }
            await refresh();
        } catch (err) {
            console.error("Erro ao salvar fornecedor:", err);
        } finally {
            handleCloseModal();
        }
    };

    const handleDeleteSupplier = async (supplier: Supplier) => {
        try {
            await deleteSupplier(supplier.id);
            await refresh();
        } catch (err) {
            console.error("Erro ao remover fornecedor:", err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                let headerIndex = data.findIndex((row) =>
                    row.some((cell: any) => String(cell).toLowerCase().includes("fornecedor") || String(cell).toLowerCase().includes("código"))
                );

                if (headerIndex === -1) headerIndex = 0;

                const headers = data[headerIndex] || [];
                const rows = data.slice(headerIndex + 1);

                const validRows = rows.filter((row) => {
                    const colName = headers.findIndex((h: any) => String(h).toLowerCase().includes("fornecedor") || String(h).toLowerCase().includes("nome"));
                    const name = String(row[colName !== -1 ? colName : 0] || "").trim();
                    return name && name !== "undefined";
                });

                const totalRows = validRows.length;
                setIsUploading(true);
                setProgress({ sent: 0, total: totalRows });

                let importedCount = 0;
                let sentCount = 0;

                const colCode = headers.findIndex((h: any) => String(h).toLowerCase().includes("código") || String(h).toLowerCase().includes("cnpj"));
                const colName = headers.findIndex((h: any) => String(h).toLowerCase().includes("fornecedor") || String(h).toLowerCase().includes("nome"));
                const colStatus = headers.findIndex((h: any) => String(h).toLowerCase().includes("ativo") || String(h).toLowerCase().includes("status"));

                for (const row of validRows) {
                    const code = String(row[colCode !== -1 ? colCode : 0] || "").trim();
                    const name = String(row[colName !== -1 ? colName : 1] || "").trim();
                    const statusText = String(row[colStatus !== -1 ? colStatus : 2] || "Ativo").trim();

                    const statusValue = (statusText.toLowerCase() === "sim" || statusText.toLowerCase() === "ativo") ? "Ativo" : "Inativo";

                    const supplierPayload = {
                        supplier_code: code,
                        name: name,
                        status: statusValue,
                        updated_at: new Date().toISOString(),
                    };

                    const { error } = await supabase
                        .from("suppliers")
                        .upsert([supplierPayload], { onConflict: "supplier_code" });

                    if (!error) importedCount++;

                    sentCount++;
                    setProgress({ sent: sentCount, total: totalRows });
                }

                await refresh();
                alert(`Importação concluída!\n- Fornecedores processados: ${importedCount}`);
            } catch (error) {
                console.error("Erro ao processar arquivo:", error);
                alert("Erro ao ler o arquivo Excel.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="relative">
            <UploadLoader isLoading={isUploading} progress={progress} />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <div className="flex items-center justify-end gap-3">
                <RefreshButton onRefresh={refresh} />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                    <Upload className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
                    Importar Fornecedores
                </button>

                <button
                    onClick={handleOpenCreate}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                    <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                    Criar um novo fornecedor
                </button>
            </div>

            <div className="mt-6 flex gap-6">
                <StatCard label="Total de fornecedores" value={total} />
                <StatCard label="Ativos" value={active} />
                <StatCard label="Produtos vinculados" value={linkedProducts} />
                <StatCard label="Inativos" value={inactive} />
            </div>

            {isLoading && suppliers.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando fornecedores...
                </div>
            ) : (
                <SuppliersTable
                    suppliers={suppliers}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteSupplier}
                />
            )}

            <AddSupplierModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSupplier}
                supplierToEdit={editingSupplier}
            />
        </div>
    );
}