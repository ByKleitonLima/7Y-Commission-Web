"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    History,
    User,
    Calendar,
    Trash2,
    Loader2,
    AlertTriangle,
    X,
    Package,
    Eye,
    ClipboardList,
    ChevronDown,
} from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import UploadLoader from "@/components/uploadLoader";
import Modal from "@/components/modal";
import { useAuth } from "@/context/AuthContext";
import { parseStockPriceFile, ParsedStockPriceFile } from "@/lib/parseStockPriceFile";
import {
    saveStockAndPriceSnapshot,
    fetchStockImports,
    fetchStockImportItems,
    deleteStockImport,
    StockImportSummary,
    StockSnapshotItem,
} from "@/services/stockPriceService";

const currencyFmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberFmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function formatFileSize(bytes: number | null) {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Chave de agrupamento por DIA (DD/MM/AAAA), a partir de quando o envio
// foi feito — é isso que alimenta o filtro "por dia" pedido.
function dayKey(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
}

const ITEMS_PAGE_SIZE = 25;

export default function PricesHistoryPage() {
    const { user, name } = useAuth();
    const userDisplayName = name || user?.email?.split("@")[0] || "Usuário";

    const [imports, setImports] = useState<StockImportSummary[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [parsed, setParsed] = useState<ParsedStockPriceFile | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState({ sent: 0, total: 0 });

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
    const showToast = (message: string, variant: "success" | "error" = "success") => {
        setToastVariant(variant);
        setToastMessage(message);
    };
    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 4500);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const [importToDelete, setImportToDelete] = useState<StockImportSummary | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ---- Filtro por dia ----
    const [selectedDay, setSelectedDay] = useState<string>("");
    const [selectedImportId, setSelectedImportId] = useState<string>("");

    // ---- Tabela de produtos do envio selecionado ----
    const [items, setItems] = useState<StockSnapshotItem[]>([]);
    const [itemsTotal, setItemsTotal] = useState(0);
    const [itemsPage, setItemsPage] = useState(0);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [detailItem, setDetailItem] = useState<StockSnapshotItem | null>(null);

    const loadHistory = useCallback(async () => {
        setIsLoadingHistory(true);
        const data = await fetchStockImports();
        setImports(data);
        setIsLoadingHistory(false);
        return data;
    }, []);

    useEffect(() => {
        (async () => {
            const data = await loadHistory();
            if (data.length > 0) {
                const firstDay = dayKey(data[0].createdAt);
                setSelectedDay(firstDay);
                setSelectedImportId(data[0].id);
            }
        })();
    }, [loadHistory]);

    // Debounce da busca (evita ida ao banco a cada tecla).
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(t);
    }, [search]);

    const loadItems = useCallback(async (importId: string, page: number, term: string) => {
        if (!importId) {
            setItems([]);
            setItemsTotal(0);
            return;
        }
        setIsLoadingItems(true);
        try {
            const { items: data, total } = await fetchStockImportItems(importId, page, ITEMS_PAGE_SIZE, term);
            setItems(data);
            setItemsTotal(total);
        } finally {
            setIsLoadingItems(false);
        }
    }, []);

    useEffect(() => {
        setItemsPage(0);
        loadItems(selectedImportId, 0, debouncedSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedImportId, debouncedSearch]);

    // Agrupa os envios por dia (DD/MM/AAAA), do mais recente pro mais antigo.
    const importsByDay = useMemo(() => {
        const map = new Map<string, StockImportSummary[]>();
        for (const imp of imports) {
            const key = dayKey(imp.createdAt);
            const list = map.get(key) || [];
            list.push(imp);
            map.set(key, list);
        }
        return map;
    }, [imports]);

    const dayOptions = useMemo(() => Array.from(importsByDay.keys()), [importsByDay]);
    const importsForSelectedDay = importsByDay.get(selectedDay) || [];
    const selectedImport = imports.find((i) => i.id === selectedImportId) || null;

    const handleSelectDay = (day: string) => {
        setSelectedDay(day);
        const list = importsByDay.get(day) || [];
        setSelectedImportId(list[0]?.id || "");
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;

        setFile(f);
        setParsed(null);
        setParseError(null);
        setIsParsing(true);

        try {
            const result = await parseStockPriceFile(f);
            setParsed(result);
        } catch (err: any) {
            console.error(err);
            setParseError(err.message || "Não foi possível ler essa planilha.");
        } finally {
            setIsParsing(false);
        }
    };

    const cancelUpload = () => {
        setFile(null);
        setParsed(null);
        setParseError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const confirmUpload = async () => {
        if (!file || !parsed) return;

        setIsSaving(true);
        setSaveProgress({ sent: 0, total: parsed.records.length });

        try {
            const saved = await saveStockAndPriceSnapshot({
                fileName: file.name,
                fileSize: file.size,
                uploadedBy: userDisplayName,
                records: parsed.records,
                columnsFound: parsed.columnsFound,
                onProgress: (sent, total) => setSaveProgress({ sent, total }),
            });

            showToast(
                `Planilha "${file.name}" importada com sucesso (${parsed.records.length} produtos, ${saved.priceChangesCount} preço(s) atualizado(s)).`,
                "success"
            );
            cancelUpload();

            const data = await loadHistory();
            const today = dayKey(saved.createdAt);
            setSelectedDay(today);
            setSelectedImportId(saved.id);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Não foi possível salvar essa importação.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!importToDelete) return;
        const target = importToDelete;
        setImportToDelete(null);
        setIsDeleting(true);

        try {
            await deleteStockImport(target.id);
            showToast(`A importação "${target.fileName}" foi removida com sucesso.`, "success");
            const data = await loadHistory();

            if (target.id === selectedImportId) {
                if (data.length > 0) {
                    const firstDay = dayKey(data[0].createdAt);
                    setSelectedDay(firstDay);
                    setSelectedImportId(data[0].id);
                } else {
                    setSelectedDay("");
                    setSelectedImportId("");
                    setItems([]);
                    setItemsTotal(0);
                }
            }
        } catch (err) {
            console.error(err);
            showToast("Não foi possível excluir essa importação.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const changePage = (nextPage: number) => {
        setItemsPage(nextPage);
        loadItems(selectedImportId, nextPage, debouncedSearch);
    };

    const totalPages = Math.max(1, Math.ceil(itemsTotal / ITEMS_PAGE_SIZE));

    return (
        <div className="pb-12 relative">
            <UploadLoader isLoading={isSaving} progress={saveProgress} />

            {toastMessage && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 text-white shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${toastVariant === "success" ? "bg-gray-900 border-gray-800" : "bg-red-600 border-red-700"
                        }`}
                >
                    {toastVariant === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-300 shrink-0" />
                    )}
                    <p className="text-sm font-medium">{toastMessage}</p>
                    <button onClick={() => setToastMessage(null)} className="ml-2 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {importToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Excluir Importação</h3>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Tem certeza que deseja excluir <strong className="text-gray-900">{importToDelete.fileName}</strong>?
                        </p>
                        <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                            Isso remove todos os produtos desse envio e as alterações de preço vinculadas a ele.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button onClick={() => setImportToDelete(null)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Não, manter
                            </button>
                            <button onClick={handleConfirmDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                                {isDeleting ? "Excluindo..." : "Sim, excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-end mt-4">
                <RefreshButton
                    onRefresh={async () => {
                        await loadHistory();
                        if (selectedImportId) await loadItems(selectedImportId, itemsPage, debouncedSearch);
                    }}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Último arquivo" value={imports[0]?.fileName || "Nenhum envio ainda"} />
                <StatCard label="Última atualização" value={imports[0] ? formatDateTime(imports[0].createdAt) : "-"} />
                <StatCard label="Total de produtos (último envio)" value={numberFmt(imports[0]?.rowCount || 0)} />
                <StatCard label="Valor total (T1, último envio)" value={currencyFmt(imports[0]?.totalValue || 0)} />
            </div>

            <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                    <Package className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                    <h2 className="text-base font-semibold text-[#2d2d2d]">Importar planilha ESTOQUE_MKT</h2>
                </div>

                {!file && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" strokeWidth={1.5} />
                        <p className="mt-3 text-sm font-medium text-[#2d2d2d]">
                            Envie a planilha (.xlsx ou .xls) com estoque e preços juntos
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            Não é preciso enviar uma planilha separada de preços — tudo vem numa só.
                        </p>
                        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f1f1f]">
                            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                            Selecione o arquivo
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                )}

                {file && (
                    <div>
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#2d2d2d]">{file.name}</p>
                                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            <button onClick={cancelUpload} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {isParsing && <p className="mt-3 text-xs text-gray-400 animate-pulse">Lendo planilha...</p>}

                        {parseError && (
                            <p className="mt-3 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
                                {parseError}
                            </p>
                        )}

                        {parsed && !parseError && (
                            <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-[11px] text-gray-400">Produtos</p>
                                        <p className="text-lg font-semibold text-[#2d2d2d]">{numberFmt(parsed.records.length)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-[11px] text-gray-400">Unidades em estoque</p>
                                        <p className="text-lg font-semibold text-[#2d2d2d]">{numberFmt(parsed.totalStockUnits)}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-[11px] text-gray-400">Valor total (T1)</p>
                                        <p className="text-lg font-semibold text-[#2d2d2d]">{currencyFmt(parsed.totalValueT1)}</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400">
                                    {parsed.columnsFound.length} colunas identificadas — todos os campos serão armazenados.
                                </p>

                                <div className="flex justify-end gap-3">
                                    <button onClick={cancelUpload} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmUpload}
                                        disabled={isSaving}
                                        className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f1f1f] disabled:opacity-60"
                                    >
                                        Confirmar importação
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---- FILTRO POR DIA + TABELA DE PRODUTOS ---- */}
            <div className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                        <h2 className="text-base font-semibold text-[#2d2d2d]">Produtos por envio</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Dropdown 1: dia */}
                        <div className="relative">
                            <select
                                value={selectedDay}
                                onChange={(e) => handleSelectDay(e.target.value)}
                                className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                            >
                                {dayOptions.length === 0 && <option value="">Nenhum envio</option>}
                                {dayOptions.map((day) => (
                                    <option key={day} value={day}>
                                        {day} ({(importsByDay.get(day) || []).length} envio(s))
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>

                        {/* Dropdown 2: qual envio daquele dia (só aparece se houver mais de um) */}
                        {importsForSelectedDay.length > 1 && (
                            <div className="relative">
                                <select
                                    value={selectedImportId}
                                    onChange={(e) => setSelectedImportId(e.target.value)}
                                    className="h-10 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
                                >
                                    {importsForSelectedDay.map((imp) => (
                                        <option key={imp.id} value={imp.id}>
                                            {formatDateTime(imp.createdAt)} — {imp.fileName}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            </div>
                        )}

                        {selectedImport && (
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por nome, código, fornecedor ou marca..."
                                    className="w-72 bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {!selectedImport && !isLoadingHistory && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                        Nenhuma planilha importada ainda. Envie um arquivo acima para visualizar os produtos aqui.
                    </div>
                )}

                {selectedImport && (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs text-gray-500">
                            <User className="h-3.5 w-3.5" />
                            {selectedImport.uploadedBy || "-"}
                            <span className="mx-1">·</span>
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateTime(selectedImport.createdAt)}
                            <span className="mx-1">·</span>
                            {selectedImport.priceChangesCount} preço(s) atualizado(s) neste envio
                            <button
                                onClick={() => setImportToDelete(selectedImport)}
                                className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                Excluir este envio
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Produto</th>
                                        <th className="px-4 py-3">Fornecedor</th>
                                        <th className="px-4 py-3">Grupo / Família</th>
                                        <th className="px-4 py-3">Estoque total</th>
                                        <th className="px-4 py-3">T1</th>
                                        <th className="px-4 py-3">T2</th>
                                        <th className="px-4 py-3">% Comissão</th>
                                        <th className="px-4 py-3">Ativo</th>
                                        <th className="px-4 py-3 text-right">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingItems ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-400">
                                                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                                                Carregando produtos...
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-400">
                                                Nenhum produto encontrado{debouncedSearch ? " para essa busca" : ""}.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.productCode || "-"}</td>
                                                <td className="px-4 py-3 font-medium text-[#2d2d2d]">{item.productName || "-"}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.supplierName || "-"}</td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {[item.group, item.family].filter(Boolean).join(" / ") || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 font-medium">{numberFmt(item.totalStock)}</td>
                                                <td className="px-4 py-3 text-gray-700">{currencyFmt(item.priceT1)}</td>
                                                <td className="px-4 py-3 text-gray-500">{currencyFmt(item.priceT2)}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.commissionPercent}%</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${item.active === "ATIVO" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"
                                                            }`}
                                                    >
                                                        {item.active || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setDetailItem(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                                        title="Ver todos os dados deste produto"
                                                    >
                                                        <Eye className="h-4 w-4" strokeWidth={1.75} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-xs text-gray-500">
                            <span>
                                Página {itemsPage + 1} de {totalPages} ({numberFmt(itemsTotal)} produtos no total)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changePage(Math.max(0, itemsPage - 1))}
                                    disabled={itemsPage === 0 || isLoadingItems}
                                    className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => changePage(Math.min(totalPages - 1, itemsPage + 1))}
                                    disabled={itemsPage >= totalPages - 1 || isLoadingItems}
                                    className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ---- HISTÓRICO GERAL DE ENVIOS ---- */}
            <div className="mt-12">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                    <History className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                    <h2 className="text-base font-semibold text-[#2d2d2d]">Histórico de Envios</h2>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-6 py-3">Arquivo</th>
                                <th className="px-6 py-3">Enviado em</th>
                                <th className="px-6 py-3">Produtos</th>
                                <th className="px-6 py-3">Valor (T1)</th>
                                <th className="px-6 py-3">Preços alterados</th>
                                <th className="px-6 py-3">Enviado por</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imports.map((imp) => (
                                <tr key={imp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-[#2d2d2d] flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                        {imp.fileName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{formatDateTime(imp.createdAt)}</td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{numberFmt(imp.rowCount)}</td>
                                    <td className="px-6 py-4 text-gray-900 font-semibold">{currencyFmt(imp.totalValue)}</td>
                                    <td className="px-6 py-4 text-gray-500">{imp.priceChangesCount}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                                            <User className="h-3 w-3" />
                                            {imp.uploadedBy || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedDay(dayKey(imp.createdAt));
                                                    setSelectedImportId(imp.id);
                                                }}
                                                title="Exibir produtos deste envio"
                                                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 ${imp.id === selectedImportId ? "border-gray-800 text-gray-800" : "border-gray-200"
                                                    }`}
                                            >
                                                <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
                                            </button>
                                            <button
                                                onClick={() => setImportToDelete(imp)}
                                                title="Excluir este envio"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                {isDeleting && importToDelete?.id === imp.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoadingHistory && imports.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                                        Nenhum envio registrado até o momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ---- MODAL: TODOS OS CAMPOS DO PRODUTO ---- */}
            <Modal open={detailItem !== null} onClose={() => setDetailItem(null)} title={detailItem?.productName || "Produto"}>
                {detailItem && (
                    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                        <DetailSection
                            title="Identificação"
                            rows={[
                                ["Código", detailItem.productCode],
                                ["Fornecedor", detailItem.supplierName],
                                ["Marca", detailItem.brand],
                                ["Grupo", detailItem.group],
                                ["Cód. Grupo", detailItem.groupCode],
                                ["Descrição do grupo", detailItem.groupDescription],
                                ["Família", detailItem.family],
                                ["Tamanho", detailItem.size],
                                ["Legenda", detailItem.legend],
                                ["Ativo", detailItem.active],
                                ["Ativo Mobile", detailItem.activeMobile],
                                ["Exibir catálogo", detailItem.showCatalog],
                            ]}
                        />
                        <DetailSection
                            title="Estoque"
                            rows={[
                                ["Estoque 7Y", numberFmt(detailItem.stock7y)],
                                ["Estoque GALPÃO", numberFmt(detailItem.stockGalpao)],
                                ["Estoque CONEXÃO", numberFmt(detailItem.stockConexao)],
                                ["Estoque FWY Loja", numberFmt(detailItem.stockFwyLoja)],
                                ["Estoque total", numberFmt(detailItem.totalStock)],
                                ["Qtd. por fardo", numberFmt(detailItem.bundleQuantity)],
                                ["Qtd. tiras", numberFmt(detailItem.stripQuantity)],
                            ]}
                        />
                        <DetailSection
                            title="Preços"
                            rows={[
                                ["Tabela T1", currencyFmt(detailItem.priceT1)],
                                ["Tabela T2", currencyFmt(detailItem.priceT2)],
                                ["Tabela T3", currencyFmt(detailItem.priceT3)],
                                ["Tabela T4", currencyFmt(detailItem.priceT4)],
                                ["Tabela T5", currencyFmt(detailItem.priceT5)],
                                ["Tabela T11", currencyFmt(detailItem.priceT11)],
                                ["Valor promocional", currencyFmt(detailItem.promoValue)],
                                ["Qtd. promocional", numberFmt(detailItem.promoQuantity)],
                                ["Valor promo 2", currencyFmt(detailItem.promoValue2)],
                                ["Qtd. promo 2", numberFmt(detailItem.promoQuantity2)],
                            ]}
                        />
                        <DetailSection
                            title="Comissão"
                            rows={[
                                ["% Comissão", `${detailItem.commissionPercent}%`],
                                ["% Verba", `${detailItem.verbaPercent}%`],
                                ["Valor premiação", currencyFmt(detailItem.premiumValue)],
                            ]}
                        />
                        <DetailSection
                            title="Dados fiscais"
                            rows={[
                                ["CEST", detailItem.cest],
                                ["NCM", detailItem.ncm],
                                ["EAN", detailItem.ean],
                                ["DUN", detailItem.dun],
                            ]}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DetailSection({ title, rows }: { title: string; rows: [string, string | number][] }) {
    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                {rows.map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                        <span className="text-[11px] text-gray-400">{label}</span>
                        <span className="text-sm font-medium text-[#2d2d2d]">{value || "-"}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}