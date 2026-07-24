"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface UploadLoaderProps {
    isLoading: boolean;
    progress: { sent: number; total: number };
}

export default function UploadLoader({ isLoading, progress }: UploadLoaderProps) {

    useEffect(() => {
        if (!isLoading) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "O upload está em andamento. Se você fechar ou atualizar agora, o salvamento das comissões será interrompido!";
            return e.returnValue;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isLoading]);

    useEffect(() => {
        if (!isLoading) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" || e.key === "Tab") {
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isLoading]);

    if (!isLoading) return null;

    const percentage = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto select-none">
            <div className="mx-4 flex w-full max-w-md flex-col items-center rounded-2xl bg-white p-8 text-center shadow-2xl">
                <Loader2 className="h-12 w-12 animate-spin text-[#2d2d2d]" />

                <h3 className="mt-6 text-xl font-bold text-[#2d2d2d]">
                    Salvando Dados da Planilha...
                </h3>

                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    O sistema está gravando todos os dados de vendas e comissões de forma segura no banco de dados. <br />
                    <strong className="text-red-500">Não atualize a página</strong> e <strong className="text-red-500">não feche esta aba</strong> para evitar perdas de dados.
                </p>

                <div className="mt-6 w-full">
                    <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                        <span>Progresso do Upload</span>
                        <span>{progress.sent} de {progress.total} ({percentage}%)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                <div className="mt-4 text-[11px] text-gray-400">
                    As comissões de cada vendedor estarão disponíveis assim que o processo concluir.
                </div>
            </div>
        </div>
    );
}