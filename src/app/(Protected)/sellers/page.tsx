"use client";

import { useEffect, useState, useRef } from "react";
import { UserPlus, Upload } from "lucide-react";
import StatCard from "@/components/statCard";
import SellersTable, { Seller } from "@/components/sellersStable";
import AddSellerModal from "@/components/addSallersModal";
import UploadLoader from "@/components/uploadLoader";
import { fetchSellers, createSeller, updateSeller, deleteSeller } from "@/services/salesService";
import { supabase } from "@/lib/supabase";
import { recomputeManagerSellersCount, recomputeSellerClientsCount } from "@/lib/importSync";
import * as XLSX from "xlsx";

export default function Sellers() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadSellers();
    }, []);

    const loadSellers = async () => {
        setLoading(true);
        try {
            const data = await fetchSellers();
            const formattedData = (data || []).map((item: any) => ({
                id: item.id,
                supId: item.supervisor_id || item.supId || "",
                code: item.seller_code || item.code || "",
                name: item.name || "",
                clientsCount: Number(item.clientsCount || item.clients_count || 0),
                ordersCount: Number(item.ordersCount || item.orders_count || 0),
                status: item.status || "Ativo",
            }));
            setSellers(formattedData);
        } catch (err) {
            console.error("Erro ao carregar vendedores:", err);
        } finally {
            setLoading(false);
        }
    };

    const total = sellers.length;
    const active = sellers.filter((s) => s.status === "Ativo").length;
    const inactive = sellers.filter((s) => s.status === "Inativo").length;
    const linkedClients = sellers.reduce((sum, s) => sum + s.clientsCount, 0);

    const handleOpenCreate = () => {
        setEditingSeller(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (seller: Seller) => {
        setEditingSeller(seller);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingSeller(null);
        setModalOpen(false);
    };

    const handleSaveSeller = async (sellerData: Omit<Seller, "id">) => {
        try {
            if (editingSeller) {
                await updateSeller(editingSeller.id, sellerData);
            } else {
                await createSeller(sellerData);
            }
            // Garante que o gerente vinculado reflita esse vendedor na contagem
            if (sellerData.supId) await recomputeManagerSellersCount([sellerData.supId]);
            await loadSellers();
        } catch (err) {
            console.error("Erro ao salvar vendedor:", err);
        } finally {
            handleCloseModal();
        }
    };

    const handleDeleteSeller = async (seller: Seller) => {
        try {
            await deleteSeller(seller.id);
            setSellers((prev) => prev.filter((s) => s.id !== seller.id));
            if (seller.supId) await recomputeManagerSellersCount([seller.supId]);
        } catch (err) {
            console.error("Erro ao remover vendedor:", err);
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
                    row.some((cell: any) => String(cell).toLowerCase().includes("código") || String(cell).toLowerCase().includes("vendedor"))
                );

                if (headerIndex === -1) headerIndex = 1;

                const headers = data[headerIndex] || [];
                const rows = data.slice(headerIndex + 1);

                // Filtra apenas as linhas válidas de vendedores antes de iniciar o progresso
                const validRows = rows.filter((row) => {
                    const colCode = headers.findIndex((h: any) => String(h).toLowerCase().includes("código"));
                    const colApelido = headers.findIndex((h: any) => String(h).toLowerCase().includes("apelido"));
                    const code = String(row[colCode !== -1 ? colCode : 5] || "").trim();
                    const name = String(row[colApelido !== -1 ? colApelido : 7] || "").trim();

                    if (!code || !name || code === "undefined" || name === "undefined") return false;
                    const lowerName = name.toLowerCase();
                    if (lowerName.includes("gerente") || lowerName.includes("<sem vendedor>") || lowerName.includes("inativos")) {
                        return false;
                    }
                    return true;
                });

                const totalRows = validRows.length;
                setIsUploading(true);
                setProgress({ sent: 0, total: totalRows });

                let importedCount = 0;
                let linkedCount = 0;
                let sentCount = 0;

                // Acumula os códigos vinculados durante o import para recalcular
                // as contagens de Gerentes (sellers_count) e Vendedores (clients_count)
                // ao final, garantindo que os StatCards de todas as telas fiquem corretos.
                const supervisorIdsTouched = new Set<string>();
                const sellerCodesTouched = new Set<string>();

                // IMPORTANTE: "código" também aparece em "Código Parceiro", então excluímos
                // essa coluna para não pegar o código do cliente no lugar do vendedor.
                const colCode = headers.findIndex((h: any) => String(h).toLowerCase().includes("código") && !String(h).toLowerCase().includes("parceiro"));
                const colApelido = headers.findIndex((h: any) => String(h).toLowerCase().includes("apelido") && !String(h).toLowerCase().includes("parceiro"));
                const colSup = headers.findIndex((h: any) => String(h).toLowerCase().includes("supervisor") || String(h).toLowerCase().includes("fbs"));
                const colAtivo = headers.findIndex((h: any) => String(h).toLowerCase().includes("ativo"));
                const colParceiroCode = headers.findIndex((h: any) => String(h).toLowerCase().includes("parceiro") && !String(h).toLowerCase().includes("nome"));
                const colParceiroName = headers.findIndex((h: any) => String(h).toLowerCase().includes("nome parceiro"));
                // Região fica na coluna "Divisão" (coluna AC da planilha = índice 28).
                // Se o cabeçalho não bater pelo nome, cai no índice fixo 28 como fallback.
                let colDivisao = headers.findIndex((h: any) => {
                    const t = String(h).toLowerCase();
                    return t.includes("divisão") || t.includes("divisao") || t.includes("região") || t.includes("regiao");
                });
                if (colDivisao === -1) colDivisao = 28; // coluna AC

                for (const row of validRows) {
                    const code = String(row[colCode !== -1 ? colCode : 5] || "").trim();
                    const name = String(row[colApelido !== -1 ? colApelido : 7] || "").trim();
                    const supId = String(row[colSup !== -1 ? colSup : 0] || "").trim();
                    const statusText = String(row[colAtivo !== -1 ? colAtivo : 6] || "Sim").trim();

                    const clientCode = String(row[colParceiroCode !== -1 ? colParceiroCode : 11] || "").trim();
                    const clientName = String(row[colParceiroName !== -1 ? colParceiroName : 12] || "").trim();
                    const region = String(row[colDivisao] || "").trim();

                    const statusValue = (statusText.toLowerCase() === "sim" || statusText === "Ativo") ? "Ativo" : "Inativo";

                    // 1. Cadastra ou atualiza o vendedor, vinculado ao gerente (supervisor_id)
                    const sellerPayload = {
                        supervisor_id: supId !== "undefined" && supId !== "" ? supId : null,
                        seller_code: code,
                        name: name,
                        status: statusValue,
                        updated_at: new Date().toISOString(),
                    };

                    const { error: sellerError } = await supabase
                        .from("sellers")
                        .upsert([sellerPayload], { onConflict: "seller_code" });

                    if (!sellerError) {
                        importedCount++;
                        if (sellerPayload.supervisor_id) supervisorIdsTouched.add(sellerPayload.supervisor_id);
                    }

                    // 2. Vincula o cliente/parceiro ao vendedor, se existir
                    if (clientCode && clientCode !== "0" && clientCode !== "<SEM PARCEIRO>") {
                        const clientPayload = {
                            client_code: clientCode,
                            name: clientName !== "" ? clientName : "Cliente " + clientCode,
                            seller_code: code,
                            seller_name: name,
                            supervisor_id: sellerPayload.supervisor_id,
                            region: region !== "" && region !== "undefined" ? region : null,
                            status: "Ativo",
                            updated_at: new Date().toISOString(),
                        };

                        const { error: clientError } = await supabase
                            .from("clients")
                            .upsert([clientPayload], { onConflict: "client_code" });

                        if (!clientError) {
                            linkedCount++;
                            sellerCodesTouched.add(code);
                        }
                    }

                    sentCount++;
                    setProgress({ sent: sentCount, total: totalRows });
                }

                // Fecha o vínculo hierárquico: Gerente <- Vendedor <- Cliente,
                // atualizando as contagens usadas nos StatCards das telas de
                // Gerentes e Vendedores.
                await recomputeManagerSellersCount(Array.from(supervisorIdsTouched));
                await recomputeSellerClientsCount(Array.from(sellerCodesTouched));

                await loadSellers();
                alert(`Importação concluída!\n- Vendedores cadastrados/atualizados: ${importedCount}\n- Vínculos de clientes processados: ${linkedCount}`);
            } catch (error) {
                console.error("Erro ao processar arquivo:", error);
                alert("Erro ao ler o arquivo Excel. Verifique o formato das colunas.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="relative">
            {/* Componente padrão de Upload/Loader com bloqueio e barra de progresso */}
            <UploadLoader isLoading={isUploading} progress={progress} />

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            <div className="flex items-center justify-end gap-3">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                    <Upload className="h-4 w-4 text-gray-500" strokeWidth={1.75} />
                    Importar Vendedores & Vínculos
                </button>

                <button
                    onClick={handleOpenCreate}
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                    <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                    Criar um novo vendedor
                </button>
            </div>

            <div className="mt-6 flex gap-6">
                <StatCard label="Total de vendedores" value={total} />
                <StatCard label="Ativos" value={active} />
                <StatCard label="Inativos" value={inactive} />
                <StatCard label="Clientes vinculados" value={linkedClients} />
            </div>

            {loading ? (
                <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Carregando vendedores...
                </div>
            ) : (
                <SellersTable
                    sellers={sellers}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteSeller}
                />
            )}

            <AddSellerModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSeller}
                sellerToEdit={editingSeller}
            />
        </div>
    );
}