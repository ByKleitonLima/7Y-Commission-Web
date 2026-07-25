"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import StatCard from "@/components/statCard";
import ManagersTable, { SalesManager } from "@/components/managerStable";
import AddManagerModal from "@/components/addManagerModal";
import RefreshButton from "@/components/refreshButton";
import { createManager, updateManager, deleteManager } from "@/services/salesService";
import { useOrgData } from "@/context/orgDataContext";

export default function Managers() {
    const { managers, isLoading, refresh } = useOrgData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingManager, setEditingManager] = useState<SalesManager | null>(null);

    const total = managers.length;
    const linkedSellers = managers.reduce((sum, m) => sum + (Number(m.sellersCount) || 0), 0);
    const active = managers.filter((m) => m.status === "Ativo").length;
    const inactive = managers.filter((m) => m.status === "Inativo").length;

    const handleOpenCreate = () => {
        setEditingManager(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (manager: SalesManager) => {
        setEditingManager(manager);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingManager(null);
        setModalOpen(false);
    };

    const handleSaveManager = async (managerData: Omit<SalesManager, "id">) => {
        try {
            if (editingManager) {
                await updateManager(editingManager.id, managerData);
            } else {
                await createManager(managerData);
            }
            await refresh();
        } catch (err) {
            console.error("Erro ao salvar gerente:", err);
        } finally {
            handleCloseModal();
        }
    };

    const handleDeleteManager = async (manager: SalesManager) => {
        try {
            await deleteManager(manager.id);
            await refresh();
        } catch (err) {
            console.error("Erro ao remover gerente:", err);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-end gap-3">
                <RefreshButton onRefresh={refresh} />
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]"
                >
                    <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                    Criar novo gerente
                </button>
            </div>

            <div className="mt-6 flex gap-6">
                <StatCard label="Total de gerentes" value={total} />
                <StatCard label="Vendedores vinculados" value={linkedSellers} />
                <StatCard label="Ativos" value={active} />
                <StatCard label="Inativos" value={inactive} />
            </div>

            {isLoading && managers.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando gerentes...
                </div>
            ) : (
                <ManagersTable
                    managers={managers}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteManager}
                />
            )}

            <AddManagerModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveManager}
                managerToEdit={editingManager}
            />
        </div>
    );
}