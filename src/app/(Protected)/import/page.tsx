"use client";

import { useState, useMemo, ChangeEvent, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Database, History, User, Calendar } from "lucide-react";
import { useSalesData } from "@/context/salesDataContext";
import { parseSalesFile } from "@/lib/parseSalesFile";
import {
    uploadSalesRecordsInBatches,
    saveUploadHistory,
    fetchUploadHistory,
    syncOrganizationFromRecords,
} from "@/services/salesService";
import UploadLoader from "@/components/uploadLoader";
import { useAuth } from "@/context/AuthContext";
import TopRankingCard from "@/components/topRankCard";
import { getTopManagers, getTopSellers, getTopProducts } from "@/lib/salesAggregations";

export default function ImportPage() {
    const { user, name } = useAuth();
    const { records, setRecords, fileName, setFileName } = useSalesData();
    const [isProcessing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isSaving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [isSuccess, setIsSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    const userDisplayName = name || user?.email?.split("@")[0] || "Usuário";

    const loadHistory = async () => {
        try {
            const data = await fetchUploadHistory();
            setHistory(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const metrics = useMemo(() => {
        if (records.length === 0) return null;

        const totalValue = records.reduce((sum, r) => sum + r.totalValue, 0);
        const uniqueManagers = new Set(records.map((r) => r.managerName)).size;
        const uniqueSellers = new Set(records.map((r) => r.sellerName)).size;
        const uniqueClients = new Set(records.map((r) => r.clientName)).size;

        const topManagers = getTopManagers(records).slice(0, 3);
        const topSellers = getTopSellers(records).slice(0, 3);
        const topProducts = getTopProducts(records).slice(0, 3);

        return {
            totalValue,
            uniqueManagers,
            uniqueSellers,
            uniqueClients,
            topManagers,
            topSellers,
            topProducts
        };
    }, [records]);

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setError(null);
        setIsSuccess(false);
        setSaveError(null);
        setSaveProgress({ done: 0, total: 0 });

        try {
            const parsed = await parseSalesFile(file);
            setRecords(parsed);
            setFileName(file.name);
        } catch (err) {
            console.error(err);
            setError("Não foi possível ler esse arquivo. Confira se é uma planilha válida (.xlsx ou .xls).");
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveToDatabase = async () => {
        if (records.length === 0 || !fileName) return;

        setSaving(true);
        setSaveError(null);
        setIsSuccess(false);
        setSaveProgress({ done: 0, total: records.length });

        try {
            await uploadSalesRecordsInBatches(records, (sent, total) => {
                setSaveProgress({ done: sent, total });
            });

            // Deriva e sincroniza gerentes / vendedores / clientes a partir
            // dos registros dessa importação (pedidos contam somente
            // "pedido de venda", devolução e bonificação ficam de fora).
            await syncOrganizationFromRecords(records);

            await saveUploadHistory({
                fileName,
                rowCount: records.length,
                uploadedBy: userDisplayName,
                totalValue: records.reduce((sum, r) => sum + r.totalValue, 0)
            });

            setIsSuccess(true);
            await loadHistory();

            setTimeout(() => {
                setRecords([]);
                setFileName("");
                setIsSuccess(false);
            }, 3500);

        } catch (err: any) {
            console.error(err);
            setSaveError(err.message || "Não foi possível salvar no banco de dados. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-12">
            <UploadLoader
                isLoading={isSaving}
                progress={{ sent: saveProgress.done, total: saveProgress.total }}
            />

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
                <Upload className="mx-auto h-8 w-8 text-gray-400" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-[#2d2d2d]">
                    Envie a planilha de comissão (.xlsx ou .xls)
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    Os dados são extraídos em tempo real para auditoria visual antes de irem pro banco.
                </p>

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]">
                    <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                    Selecione o arquivo
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>

                {isProcessing && (
                    <p className="mt-3 text-xs text-gray-400 animate-pulse">Extraindo dados...</p>
                )}

                {error && <p className="mt-3 text-xs text-red-500 font-medium">{error}</p>}
            </div>

            {metrics && fileName && (
                <div className="mt-8 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                                Pré-visualização: {fileName}
                            </div>
                            <span className="text-xs text-gray-500 px-1">Quem enviará: {userDisplayName}</span>
                        </div>

                        <button
                            onClick={handleSaveToDatabase}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-5 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-[#1f1f1f] disabled:opacity-60"
                        >
                            <Database className="h-4 w-4" strokeWidth={1.75} />
                            Salvar no banco de dados
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Faturamento</span>
                                <Database className="h-5 w-5 text-emerald-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#2d2d2d]">
                                {metrics.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Linhas</span>
                                <Database className="h-5 w-5 text-blue-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#2d2d2d]">
                                {records.length.toLocaleString("pt-BR")}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Gerentes</span>
                                <Database className="h-5 w-5 text-purple-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueManagers}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendedores</span>
                                <Database className="h-5 w-5 text-orange-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueSellers}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Clientes</span>
                                <Database className="h-5 w-5 text-indigo-500" />
                            </div>
                            <p className="mt-2 text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueClients}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-6 lg:flex-row">
                        <TopRankingCard title="Top Gerentes na Planilha" items={metrics.topManagers} />
                        <TopRankingCard title="Top Vendedores na Planilha" items={metrics.topSellers} />
                        <TopRankingCard title="Produtos Campeões na Planilha" items={metrics.topProducts} />
                    </div>

                    {isSuccess && !isSaving && (
                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 p-4 rounded-xl">
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                            Dados integrados ao Supabase e distribuídos para os Dashboards com sucesso!
                        </div>
                    )}

                    {saveError && (
                        <div className="mt-6 text-sm font-medium text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl">
                            {saveError}
                        </div>
                    )}
                </div>
            )}

            <div className="mt-12">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                    <History className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                    <h2 className="text-base font-semibold text-[#2d2d2d]">Histórico de Envios</h2>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-6 py-3">Arquivo</th>
                                <th className="px-6 py-3">Data do Envio</th>
                                <th className="px-6 py-3">Registros</th>
                                <th className="px-6 py-3">Faturamento</th>
                                <th className="px-6 py-3">Enviado Por</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item, index) => (
                                <tr key={item.id || index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-[#2d2d2d] flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                        {item.fileName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(item.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{item.rowCount?.toLocaleString("pt-BR")}</td>
                                    <td className="px-6 py-4 text-gray-900 font-semibold">{item.totalValue?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                                            <User className="h-3 w-3" />
                                            {item.uploadedBy}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                                        Nenhum envio registrado até o momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}