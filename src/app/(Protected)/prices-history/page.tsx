"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
    DollarSign,
    Eye,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import StatCard from "@/components/statCard";
import RefreshButton from "@/components/refreshButton";
import UploadLoader from "@/components/uploadLoader";
import Modal from "@/components/modal";
import StatusBadge from "@/components/statusBadge";
import { useAuth } from "@/context/AuthContext";
import { parseStockFile, ParsedStockFile } from "@/lib/parseStockFile";
import { parsePriceFile, PriceRecord } from "@/lib/parsePriceFile";
import {
    saveStockSnapshot,
    fetchStockImports,
    fetchStockImportItems,
    deleteStockImport,
    buildPriceDiffs,
    applyPriceUpdate,
    fetchPriceUpdates,
    fetchPriceHistoryByUpdate,
    StockImportSummary,
    StockSnapshotItem,
    PriceDiff,
    PriceUpdateSummary,
    PriceHistoryEntry,
} from "@/services/stockPriceService";

const currencyFmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

export default function PricesHistoryPage() {
    const { user, name } = useAuth();
    const userDisplayName = name || user?.email?.split("@")[0] || "Usuário";

    const [imports, setImports] = useState<StockImportSummary[]>([]);
    const [priceUpdates, setPriceUpdates] = useState<PriceUpdateSummary[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const stockInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);

    const [stockFile, setStockFile] = useState<File | null>(null);
    const [stockParsed, setStockParsed] = useState<ParsedStockFile | null>(null);
    const [stockError, setStockError] = useState<string | null>(null);
    const [isParsingStock, setIsParsingStock] = useState(false);
    const [isSavingStock, setIsSavingStock] = useState(false);
    const [stockProgress, setStockProgress] = useState({ sent: 0, total: 0 });

    const [priceFile, setPriceFile] = useState<File | null>(null);
    const [priceRecords, setPriceRecords] = useState<PriceRecord[] | null>(null);
    const [priceDiffs, setPriceDiffs] = useState<PriceDiff[] | null>(null);
    const [priceError, setPriceError] = useState<string | null>(null);
    const [isParsingPrice, setIsParsingPrice] = useState(false);
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastVariant, setToastVariant] = useState<"success" | "error">("success");

    const [importToDelete, setImportToDelete] = useState<StockImportSummary | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [detailImport, setDetailImport] = useState<StockImportSummary | null>(null);
    const [detailItems, setDetailItems] = useState<StockSnapshotItem[]>([]);
    const [detailPage, setDetailPage] = useState(0);
    const [detailTotal, setDetailTotal] = useState(0);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const DETAIL_PAGE_SIZE = 50;

    const [detailUpdate, setDetailUpdate] = useState<PriceUpdateSummary | null>(null);
    const [detailUpdateEntries, setDetailUpdateEntries] = useState<PriceHistoryEntry[]>([]);
    const [isLoadingUpdateDetail, setIsLoadingUpdateDetail] = useState(false);

    const showToast = (message: string, variant: "success" | "error" = "success") => {
        setToastVariant(variant);
        setToastMessage(message);
    };

    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(null), 4000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const [stockData, priceData] = await Promise.all([fetchStockImports(), fetchPriceUpdates()]);
        setImports(stockData);
        setPriceUpdates(priceData);
        setIsLoadingHistory(false);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const lastImport = imports[0] || null;
    const totalImports = imports.length;

    const dashboard = useMemo(() => {
        return {
            lastFile: lastImport?.fileName || "Nenhum envio ainda",
            lastDate: lastImport ? formatDateTime(lastImport.createdAt) : "-",
            totalProducts: lastImport?.rowCount || 0,
            totalUnits: lastImport?.totalQuantity || 0,
            totalValue: lastImport?.totalValue || 0,
            totalImports,
        };
    }, [lastImport, totalImports]);

    const handleStockFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStockFile(file);
        setStockParsed(null);
        setStockError(null);
        setIsParsingStock(true);

        try {
            const parsed = await parseStockFile(file);
            setStockParsed(parsed);
        } catch (err: any) {
            console.error(err);
            setStockError(err.message || "Não foi possível ler essa planilha de estoque.");
        } finally {
            setIsParsingStock(false);
        }
    };

    const cancelStockImport = () => {
        setStockFile(null);
        setStockParsed(null);
        setStockError(null);
        if (stockInputRef.current) stockInputRef.current.value = "";
    };

    const confirmStockImport = async () => {
        if (!stockFile || !stockParsed) return;

        setIsSavingStock(true);
        setStockProgress({ sent: 0, total: stockParsed.records.length });

        try {
            await saveStockSnapshot({
                fileName: stockFile.name,
                fileSize: stockFile.size,
                referenceDate: stockParsed.referenceDate,
                uploadedBy: userDisplayName,
                records: stockParsed.records,
                columnsFound: stockParsed.columnsFound,
                onProgress: (sent, total) => setStockProgress({ sent, total }),
            });

            showToast(
                `Estoque "${stockFile.name}" importado com sucesso (${stockParsed.records.length} produtos).`,
                "success"
            );
            cancelStockImport();
            await loadHistory();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Não foi possível salvar o estoque importado.", "error");
        } finally {
            setIsSavingStock(false);
        }
    };

    const handlePriceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPriceFile(file);
        setPriceRecords(null);
        setPriceDiffs(null);
        setPriceError(null);
        setIsParsingPrice(true);

        try {
            const records = await parsePriceFile(file);
            const diffs = await buildPriceDiffs(records);
            setPriceRecords(records);
            setPriceDiffs(diffs);
        } catch (err: any) {
            console.error(err);
            setPriceError(err.message || "Não foi possível ler essa planilha de preços.");
        } finally {
            setIsParsingPrice(false);
        }
    };

    const cancelPriceUpdate = () => {
        setPriceFile(null);
        setPriceRecords(null);
        setPriceDiffs(null);
        setPriceError(null);
        if (priceInputRef.current) priceInputRef.current.value = "";
    };

    const confirmPriceUpdate = async () => {
        if (!priceFile || !priceDiffs) return;

        setIsSavingPrice(true);
        try {
            const result = await applyPriceUpdate({
                fileName: priceFile.name,
                fileSize: priceFile.size,
                uploadedBy: userDisplayName,
                diffs: priceDiffs,
            });

            showToast(
                `Atualização de preços concluída: ${result.changedCount} produto(s) alterado(s).`,
                "success"
            );
            cancelPriceUpdate();
            await loadHistory();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Não foi possível salvar a atualização de preços.", "error");
        } finally {
            setIsSavingPrice(false);
        }
    };

    const changedDiffs = useMemo(
        () => (priceDiffs || []).filter((d) => d.previousPrice === null || d.previousPrice !== d.newPrice),
        [priceDiffs]
    );

    const handleConfirmDeleteImport = async () => {
        if (!importToDelete) return;
        const target = importToDelete;
        setImportToDelete(null);
        setIsDeleting(true);

        try {
            await deleteStockImport(target.id);
            showToast(`A importação "${target.fileName}" foi removida com sucesso.`, "success");
            await loadHistory();
        } catch (err: any) {
            console.error(err);
            showToast("Não foi possível excluir essa importação.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const openDetail = async (imp: StockImportSummary) => {
        setDetailImport(imp);
        setDetailPage(0);
        setIsLoadingDetail(true);
        const { items, total } = await fetchStockImportItems(imp.id, 0, DETAIL_PAGE_SIZE);
        setDetailItems(items);
        setDetailTotal(total);
        setIsLoadingDetail(false);
    };

    const changeDetailPage = async (nextPage: number) => {
        if (!detailImport) return;
        setIsLoadingDetail(true);
        setDetailPage(nextPage);
        const { items, total } = await fetchStockImportItems(detailImport.id, nextPage, DETAIL_PAGE_SIZE);
        setDetailItems(items);
        setDetailTotal(total);
        setIsLoadingDetail(false);
    };

    const openUpdateDetail = async (update: PriceUpdateSummary) => {
        setDetailUpdate(update);
        setIsLoadingUpdateDetail(true);
        const entries = await fetchPriceHistoryByUpdate(update.id);
        setDetailUpdateEntries(entries);
        setIsLoadingUpdateDetail(false);
    };

    const detailTotalPages = Math.max(1, Math.ceil(detailTotal / DETAIL_PAGE_SIZE));

    return (
        <div className="pb-12 relative">
            <UploadLoader
                isLoading={isSavingStock}
                progress={{ sent: stockProgress.sent, total: stockProgress.total }}
            />

            {toastMessage && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 text-white shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${toastVariant === "success"
                        ? "bg-gray-900 border-gray-800"
                        : "bg-red-600 border-red-700"
                        }`}
                >
                    {toastVariant === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-300 shrink-0" />
                    )}
                    <p className="text-sm font-medium">{toastMessage}</p>
                    <button
                        onClick={() => setToastMessage(null)}
                        className="ml-2 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {importToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Excluir Snapshot de Estoque</h3>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                            Tem certeza que deseja excluir o snapshot{" "}
                            <strong className="text-gray-900">{importToDelete.fileName}</strong>?
                        </p>
                        <p className="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                            Atenção: esse estoque pode estar vinculado ao cálculo de comissões daquele período.
                        </p>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setImportToDelete(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Não, manter
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteImport}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-60"
                            >
                                {isDeleting ? "Excluindo..." : "Sim, excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#2d2d2d]">Preços & Histórico de Estoque</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Cada envio gera um snapshot imutável, usado depois no cálculo de comissões.
                    </p>
                </div>
                <RefreshButton onRefresh={loadHistory} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label="Último arquivo" value={dashboard.lastFile} />
                <StatCard label="Última atualização" value={dashboard.lastDate} />
                <StatCard label="Total de produtos" value={numberFmt(dashboard.totalProducts)} />
                <StatCard label="Total de unidades" value={numberFmt(dashboard.totalUnits)} />
                <StatCard label="Valor total do estoque" value={currencyFmt(dashboard.totalValue)} />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                        <Package className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                        <h2 className="text-base font-semibold text-[#2d2d2d]">Importar Estoque do Dia</h2>
                    </div>

                    {!stockFile && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" strokeWidth={1.5} />
                            <p className="mt-3 text-sm font-medium text-[#2d2d2d]">
                                Envie a planilha de estoque (.xlsx ou .xls)
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Nenhum estoque anterior será substituído — cada envio vira um snapshot novo.
                            </p>
                            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]">
                                <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                                Selecione o arquivo
                                <input
                                    ref={stockInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleStockFileChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}

                    {stockFile && (
                        <div>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[#2d2d2d]">{stockFile.name}</p>
                                        <p className="text-xs text-gray-400">{formatFileSize(stockFile.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={cancelStockImport}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {isParsingStock && (
                                <p className="mt-3 text-xs text-gray-400 animate-pulse">Lendo planilha...</p>
                            )}

                            {stockError && (
                                <p className="mt-3 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
                                    {stockError}
                                </p>
                            )}

                            {stockParsed && !stockError && (
                                <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-[11px] text-gray-400">Registros</p>
                                            <p className="text-lg font-semibold text-[#2d2d2d]">
                                                {numberFmt(stockParsed.records.length)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-[11px] text-gray-400">Unidades</p>
                                            <p className="text-lg font-semibold text-[#2d2d2d]">
                                                {numberFmt(stockParsed.totalQuantity)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-[11px] text-gray-400">Valor total</p>
                                            <p className="text-lg font-semibold text-[#2d2d2d]">
                                                {currencyFmt(stockParsed.totalValue)}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400">
                                        Colunas identificadas: {stockParsed.columnsFound.join(", ")}
                                    </p>

                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-3 py-2 font-medium">Produto</th>
                                                    <th className="px-3 py-2 font-medium">Qtd.</th>
                                                    <th className="px-3 py-2 font-medium">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockParsed.records.slice(0, 8).map((r, i) => (
                                                    <tr key={i} className="border-t border-gray-100">
                                                        <td className="px-3 py-2 truncate max-w-[200px]">
                                                            {r.productName || r.productCode}
                                                        </td>
                                                        <td className="px-3 py-2">{numberFmt(r.quantity)}</td>
                                                        <td className="px-3 py-2">{currencyFmt(r.totalValue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {stockParsed.records.length > 8 && (
                                            <p className="bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
                                                + {stockParsed.records.length - 8} produto(s) não exibido(s) na prévia
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={cancelStockImport}
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmStockImport}
                                            disabled={isSavingStock}
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

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                        <DollarSign className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                        <h2 className="text-base font-semibold text-[#2d2d2d]">Atualizar Preços</h2>
                    </div>

                    {!priceFile && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" strokeWidth={1.5} />
                            <p className="mt-3 text-sm font-medium text-[#2d2d2d]">
                                Envie a planilha de preços (.xlsx ou .xls)
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                O sistema compara com o preço atual e mantém histórico de cada alteração.
                            </p>
                            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f1f1f]">
                                <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                                Selecione o arquivo
                                <input
                                    ref={priceInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handlePriceFileChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}

                    {priceFile && (
                        <div>
                            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-[#2d2d2d]">{priceFile.name}</p>
                                        <p className="text-xs text-gray-400">{formatFileSize(priceFile.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={cancelPriceUpdate}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {isParsingPrice && (
                                <p className="mt-3 text-xs text-gray-400 animate-pulse">
                                    Lendo planilha e comparando preços...
                                </p>
                            )}

                            {priceError && (
                                <p className="mt-3 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
                                    {priceError}
                                </p>
                            )}

                            {priceDiffs && !priceError && (
                                <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-[11px] text-gray-400">Produtos na planilha</p>
                                            <p className="text-lg font-semibold text-[#2d2d2d]">
                                                {numberFmt(priceDiffs.length)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 p-3">
                                            <p className="text-[11px] text-gray-400">Com alteração de preço</p>
                                            <p className="text-lg font-semibold text-[#2d2d2d]">
                                                {numberFmt(changedDiffs.length)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                                        <table className="w-full text-left text-xs">
                                            <thead className="sticky top-0 bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-3 py-2 font-medium">Produto</th>
                                                    <th className="px-3 py-2 font-medium">Anterior</th>
                                                    <th className="px-3 py-2 font-medium">Novo</th>
                                                    <th className="px-3 py-2 font-medium">Variação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {changedDiffs.map((d) => (
                                                    <tr key={d.productCode} className="border-t border-gray-100">
                                                        <td className="px-3 py-2 truncate max-w-[160px]">
                                                            {d.productName || d.productCode}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500">
                                                            {d.previousPrice !== null ? currencyFmt(d.previousPrice) : "Novo"}
                                                        </td>
                                                        <td className="px-3 py-2 font-medium text-[#2d2d2d]">
                                                            {currencyFmt(d.newPrice)}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {d.percentChange !== null ? (
                                                                <span
                                                                    className={`inline-flex items-center gap-1 font-medium ${d.difference >= 0 ? "text-emerald-600" : "text-red-600"
                                                                        }`}
                                                                >
                                                                    {d.difference >= 0 ? (
                                                                        <TrendingUp className="h-3 w-3" />
                                                                    ) : (
                                                                        <TrendingDown className="h-3 w-3" />
                                                                    )}
                                                                    {d.percentChange.toFixed(1)}%
                                                                </span>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {changedDiffs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                                                            Nenhuma alteração de preço identificada.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={cancelPriceUpdate}
                                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={confirmPriceUpdate}
                                            disabled={isSavingPrice || changedDiffs.length === 0}
                                            className="rounded-lg bg-[#2d2d2d] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f1f1f] disabled:opacity-60"
                                        >
                                            {isSavingPrice ? "Salvando..." : "Confirmar alterações"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-12">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                    <History className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                    <h2 className="text-base font-semibold text-[#2d2d2d]">Histórico de Estoques Importados</h2>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-6 py-3">Arquivo</th>
                                <th className="px-6 py-3">Enviado em</th>
                                <th className="px-6 py-3">Produtos</th>
                                <th className="px-6 py-3">Unidades</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Enviado por</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {imports.map((imp) => (
                                <tr key={imp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-[#2d2d2d] flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                        {imp.fileName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formatDateTime(imp.createdAt)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{numberFmt(imp.rowCount)}</td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{numberFmt(imp.totalQuantity)}</td>
                                    <td className="px-6 py-4 text-gray-900 font-semibold">{currencyFmt(imp.totalValue)}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                                            <User className="h-3 w-3" />
                                            {imp.uploadedBy || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge
                                            label={imp.status}
                                            variant={
                                                imp.status === "Concluído"
                                                    ? "success"
                                                    : imp.status === "Erro"
                                                        ? "danger"
                                                        : "neutral"
                                            }
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openDetail(imp)}
                                                title="Visualizar produtos deste estoque"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                            >
                                                <Eye className="h-4 w-4" strokeWidth={1.75} />
                                            </button>
                                            <button
                                                onClick={() => setImportToDelete(imp)}
                                                title="Excluir esta importação"
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
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
                                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">
                                        Nenhum estoque importado até o momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-12">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
                    <DollarSign className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
                    <h2 className="text-base font-semibold text-[#2d2d2d]">Histórico de Atualizações de Preço</h2>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
                                <th className="px-6 py-3">Arquivo</th>
                                <th className="px-6 py-3">Enviado em</th>
                                <th className="px-6 py-3">Analisados</th>
                                <th className="px-6 py-3">Alterados</th>
                                <th className="px-6 py-3">Enviado por</th>
                                <th className="px-6 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceUpdates.map((upd) => (
                                <tr key={upd.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-[#2d2d2d] flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                                        {upd.fileName}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{formatDateTime(upd.createdAt)}</td>
                                    <td className="px-6 py-4 text-gray-500 font-medium">{numberFmt(upd.rowCount)}</td>
                                    <td className="px-6 py-4 text-gray-900 font-semibold">{numberFmt(upd.changedCount)}</td>
                                    <td className="px-6 py-4 text-gray-500">{upd.uploadedBy || "-"}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => openUpdateDetail(upd)}
                                            title="Ver alterações"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
                                        >
                                            <Eye className="h-4 w-4" strokeWidth={1.75} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!isLoadingHistory && priceUpdates.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                                        Nenhuma atualização de preço registrada até o momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                open={detailImport !== null}
                onClose={() => setDetailImport(null)}
                title={detailImport ? `Estoque: ${detailImport.fileName}` : ""}
            >
                {detailImport && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-[11px] text-gray-400">Enviado em</p>
                                <p className="font-medium text-[#2d2d2d]">{formatDateTime(detailImport.createdAt)}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-[11px] text-gray-400">Enviado por</p>
                                <p className="font-medium text-[#2d2d2d]">{detailImport.uploadedBy || "-"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-[11px] text-gray-400">Produtos / Unidades</p>
                                <p className="font-medium text-[#2d2d2d]">
                                    {numberFmt(detailImport.rowCount)} / {numberFmt(detailImport.totalQuantity)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-[11px] text-gray-400">Valor total</p>
                                <p className="font-medium text-[#2d2d2d]">{currencyFmt(detailImport.totalValue)}</p>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Produto</th>
                                        <th className="px-3 py-2 font-medium">Fornecedor</th>
                                        <th className="px-3 py-2 font-medium">Qtd.</th>
                                        <th className="px-3 py-2 font-medium">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingDetail ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                                                Carregando...
                                            </td>
                                        </tr>
                                    ) : (
                                        detailItems.map((item) => (
                                            <tr key={item.id} className="border-t border-gray-100">
                                                <td className="px-3 py-2 truncate max-w-[180px]">
                                                    {item.productName || item.productCode}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 truncate max-w-[140px]">
                                                    {item.supplierName || item.supplierCode || "-"}
                                                </td>
                                                <td className="px-3 py-2">{numberFmt(item.quantity)}</td>
                                                <td className="px-3 py-2">{currencyFmt(item.totalValue)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                                Página {detailPage + 1} de {detailTotalPages} ({numberFmt(detailTotal)} itens)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changeDetailPage(Math.max(0, detailPage - 1))}
                                    disabled={detailPage === 0 || isLoadingDetail}
                                    className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => changeDetailPage(Math.min(detailTotalPages - 1, detailPage + 1))}
                                    disabled={detailPage >= detailTotalPages - 1 || isLoadingDetail}
                                    className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-gray-600 disabled:opacity-40"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                open={detailUpdate !== null}
                onClose={() => setDetailUpdate(null)}
                title={detailUpdate ? `Alterações de preço: ${detailUpdate.fileName}` : ""}
            >
                {detailUpdate && (
                    <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-3 py-2 font-medium">Produto</th>
                                    <th className="px-3 py-2 font-medium">Anterior</th>
                                    <th className="px-3 py-2 font-medium">Novo</th>
                                    <th className="px-3 py-2 font-medium">Variação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingUpdateDetail ? (
                                    <tr>
                                        <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                                            Carregando...
                                        </td>
                                    </tr>
                                ) : (
                                    detailUpdateEntries.map((entry) => (
                                        <tr key={entry.id} className="border-t border-gray-100">
                                            <td className="px-3 py-2 truncate max-w-[160px]">
                                                {entry.productName || entry.productCode}
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">
                                                {entry.previousPrice !== null ? currencyFmt(entry.previousPrice) : "Novo"}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-[#2d2d2d]">
                                                {currencyFmt(entry.newPrice)}
                                            </td>
                                            <td className="px-3 py-2">
                                                {entry.percentChange !== null ? (
                                                    <span
                                                        className={`font-medium ${(entry.difference || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                                                            }`}
                                                    >
                                                        {entry.percentChange.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </div>
    );
}