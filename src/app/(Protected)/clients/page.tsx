"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import StatCard from "@/components/statCard";
import ClientsTable from "@/components/clientsStable";
import AddClientModal from "@/components/addClientModal";
import RefreshButton from "@/components/refreshButton";
import { createClient, updateClient, deleteClient } from "@/services/salesService";
import { useOrgData } from "@/context/orgDataContext";

export default function ClientesPage() {
    const { clients, isLoading, refresh } = useOrgData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any | null>(null);

    const total = clients.length;
    const active = clients.filter((c) => c.status === "Ativo").length;
    const inactive = clients.filter((c) => c.status === "Inativo").length;
    const withoutSeller = clients.filter((c) => !c.sellerCode && !c.supId).length;

    const handleOpenCreate = () => {
        setEditingClient(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (client: any) => {
        setEditingClient(client);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingClient(null);
        setModalOpen(false);
    };

    const handleSaveClient = async (clientData: any) => {
        try {
            if (editingClient) {
                await updateClient(editingClient.id, clientData);
            } else {
                await createClient(clientData);
            }
            await refresh();
        } catch (err) {
            console.error("Erro ao salvar cliente:", err);
        } finally {
            handleCloseModal();
        }
    };

    const handleDeleteClient = async (client: any) => {
        try {
            await deleteClient(client.id);
            await refresh();
        } catch (err) {
            console.error("Erro ao remover cliente:", err);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-end gap-3">
                <RefreshButton onRefresh={refresh} />
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]"
                >
                    <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                    Criar um novo cliente
                </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 sm:gap-6">
                <StatCard label="Total de clientes" value={total} />
                <StatCard label="Ativos" value={active} />
                <StatCard label="Inativos" value={inactive} />
                <StatCard label="Sem vendedor vinculado" value={withoutSeller} />
            </div>

            {isLoading && clients.length === 0 ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando clientes...
                </div>
            ) : (
                <ClientsTable
                    clients={clients}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteClient}
                />
            )}

            <AddClientModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveClient}
                clientToEdit={editingClient}
            />
        </div>
    );
}