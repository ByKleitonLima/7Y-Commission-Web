"use client";

import { useState, useMemo, ChangeEvent, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, Database, History, User, Calendar, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useSalesData } from "@/context/salesDataContext";
import { parseSalesFile } from "@/lib/parseSalesFile";
import {
    uploadSalesRecordsInBatches,
    saveUploadHistory,
    fetchUploadHistory,
    syncOrganizationFromRecords,
    deleteUploadHistoryEntry,
} from "@/services/salesService";
import UploadLoader from "@/components/uploadLoader";
import { useAuth } from "@/context/AuthContext";
import type { SalesRecord } from "@/context/salesDataContext";

function getRecordKey(r: SalesRecord): string {
    const order = r.uniqueNumber?.trim();
    if (order) return `${order}-${r.productCode}-${r.totalValue}`;
    return `${r.productCode}-${r.issueDate}-${r.totalValue}`;
}

function dedupeRecords(records: SalesRecord[]): SalesRecord[] {
    const seen = new Set<string>();
    const result: SalesRecord[] = [];

    for (const record of records) {
        const key = getRecordKey(record);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(record);
    }

    return result;
}

export default function ImportPage() {
    const { user, name } = useAuth();

    const { records, setRecords, fileName, setFileName, refresh } = useSalesData();
    const [isProcessing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);

    const [isSaving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [isSuccess, setIsSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Estados para o Modal de Confirmação e o Popup/Toast de Sucesso
    const [itemToDelete, setItemToDelete] = useState<{ id: string; fileName: string } | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    // Esconde o popup de confirmação após 4 segundos
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const metrics = useMemo(() => {
        if (records.length === 0) return null;

        const totalValue = records.reduce((sum, r) => sum + r.totalValue, 0);
        const uniqueManagers = new Set(records.map((r) => r.managerName)).size;
        const uniqueSellers = new Set(records.map((r) => r.sellerName)).size;
        const uniqueClients = new Set(records.map((r) => r.clientName)).size;

        return {
            totalValue,
            uniqueManagers,
            uniqueSellers,
            uniqueClients,
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
        setDuplicatesRemoved(0);

        try {
            const parsed = await parseSalesFile(file);
            const deduped = dedupeRecords(parsed);

            setDuplicatesRemoved(parsed.length - deduped.length);
            setRecords(deduped);
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
            const totalValue = records.reduce((sum, r) => sum + r.totalValue, 0);

            const historyEntry = await saveUploadHistory({
                fileName,
                rowCount: records.length,
                uploadedBy: userDisplayName,
                totalValue,
            });

            if (!historyEntry) {
                throw new Error(
                    "Não foi possível registrar o histórico da importação. Verifique se a tabela 'upload_history' existe."
                );
            }

            await uploadSalesRecordsInBatches(records, historyEntry.id, (sent, total) => {
                setSaveProgress({ done: sent, total });
            });

            await syncOrganizationFromRecords(records);

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

    // Abre o modal de confirmação ao clicar no botão da lixeira
    const openDeleteModal = (item: { id: string; fileName: string }) => {
        setItemToDelete(item);
    };

    // Executa a exclusão após o usuário confirmar no Modal
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        const target = itemToDelete;
        setItemToDelete(null); // Fecha o modal
        setDeletingId(target.id);
        setDeleteError(null);

        try {
            await deleteUploadHistoryEntry(target.id);
            await loadHistory();
            await refresh();

            // Exibe o popup/toast informando que a operação foi concluída
            setToastMessage(`A importação "${target.fileName}" foi removida com sucesso.`);
        } catch (err: any) {
            console.error("Erro ao excluir importação:", err);
            setDeleteError(err.message || "Não foi possível excluir essa importação.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="pb-12 relative">
            <UploadLoader
                isLoading={isSaving}
                progress={{ sent: saveProgress.done, total: saveProgress.total }}
            />

            {/* POPUP / TOAST DE NOTIFICAÇÃO (Exibido após excluir) */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-4 text-white shadow-2xl border border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[calc(100vw-3rem)]">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-sm font-medium">{toastMessage}</p>
                    <button
                        onClick={() => setToastMessage(null)}
                        className="ml-2 rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Excluir Importação</h3>
                        </div>

                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Tem certeza que deseja cancelar e excluir a planilha{" "}
                            <strong className="text-gray-900">{itemToDelete.fileName}</strong>?
                        </p>
                        <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                            Atenção: Isso irá remover permanentemente todas as vendas vinculadas a este arquivo em todos os dashboards.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Não, manter
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Sim, excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 sm:p-10 text-center shadow-sm">
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

                {duplicatesRemoved > 0 && !isProcessing && (
                    <p className="mt-3 text-xs text-amber-600 font-medium">
                        {duplicatesRemoved} linha(s) duplicada(s) dentro do próprio arquivo foram ignoradas.
                    </p>
                )}

                {error && <p className="mt-3 text-xs text-red-500 font-medium">{error}</p>}
            </div>

            {metrics && fileName && (
                <div className="mt-8 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
                        <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                                <span className="truncate">Pré-visualização: {fileName}</span>
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

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Faturamento</span>
                                <Database className="h-5 w-5 shrink-0 text-emerald-500" />
                            </div>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[#2d2d2d] break-words">
                                {metrics.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Linhas</span>
                                <Database className="h-5 w-5 shrink-0 text-blue-500" />
                            </div>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[#2d2d2d]">
                                {records.length.toLocaleString("pt-BR")}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Gerentes</span>
                                <Database className="h-5 w-5 shrink-0 text-purple-500" />
                            </div>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueManagers}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendedores</span>
                                <Database className="h-5 w-5 shrink-0 text-orange-500" />
                            </div>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueSellers}
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Clientes</span>
                                <Database className="h-5 w-5 shrink-0 text-indigo-500" />
                            </div>
                            <p className="mt-2 text-lg sm:text-xl font-bold text-[#2d2d2d]">
                                {metrics.uniqueClients}
                            </p>
                        </div>
                    </div>

                    {isSuccess && !isSaving && (
                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 p-4 rounded-xl">
                            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
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

                {deleteError && (
                    <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl">
                        {deleteError}
                    </div>
                )}

                {/* ---- MOBILE: cards ---- */}
                <div className="space-y-3 md:hidden">
                    {history.map((item, index) => (
                        <div key={item.id || index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
                                    <span className="truncate text-sm font-medium text-[#2d2d2d]">{item.fileName}</span>
                                </div>
                                <button
                                    onClick={() => openDeleteModal(item)}
                                    disabled={deletingId === item.id}
                                    title="Excluir esta importação e as vendas vinculadas"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                    {deletingId === item.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                                    ) : (
                                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                    )}
                                </button>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p className="text-gray-400">Data</p>
                                    <p className="font-medium text-gray-700">
                                        {new Date(item.created_at).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Registros</p>
                                    <p className="font-medium text-gray-700">{item.rowCount?.toLocaleString("pt-BR")}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Faturamento</p>
                                    <p className="font-semibold text-gray-900">
                                        {item.totalValue?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Enviado por</p>
                                    <p className="truncate font-medium text-gray-700">{item.uploadedBy}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {history.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                            Nenhum envio registrado até o momento.
                        </div>
                    )}
                </div>

                {/* ---- DESKTOP: tabela ---- */}
                <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-6 py-3">Arquivo</th>
                                <th className="px-6 py-3">Data do Envio</th>
                                <th className="px-6 py-3">Registros</th>
                                <th className="px-6 py-3">Faturamento</th>
                                <th className="px-6 py-3">Enviado Por</th>
                                <th className="px-6 py-3">Ações</th>
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
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => openDeleteModal(item)}
                                            disabled={deletingId === item.id}
                                            title="Excluir esta importação e as vendas vinculadas"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                        >
                                            {deletingId === item.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                                            ) : (
                                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
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