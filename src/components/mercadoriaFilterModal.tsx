"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";

interface MercadoriaFilterModalProps {
    value: string;
    allLabel: string;
    options: string[];
    onChange: (value: string) => void;
}

export default function MercadoriaFilterModal({
    value,
    allLabel,
    options,
    onChange,
}: MercadoriaFilterModalProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;

        setSearch("");
        // pequeno delay pra esperar a animação/montagem antes de focar
        const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }

        document.addEventListener("keydown", handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [open]);

    const filteredOptions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return options;
        return options.filter((o) => o.toLowerCase().includes(query));
    }, [options, search]);

    const handleSelect = (option: string) => {
        onChange(option);
        setOpen(false);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2d2d2d] outline-none transition-colors hover:border-gray-300 focus:border-[#2d2d2d] sm:max-w-[280px]"
            >
                <span className="truncate">{value}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            </button>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150 sm:p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-full w-full flex-col bg-white shadow-2xl animate-in slide-in-from-bottom duration-200 sm:h-auto sm:max-h-[80vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:zoom-in-95"
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
                            <h2 className="text-base font-semibold text-[#2d2d2d]">Selecionar mercadoria</h2>
                            <button
                                onClick={() => setOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                        </div>

                        <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                                <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                                <input
                                    ref={inputRef}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar mercadoria pelo nome..."
                                    className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-3">
                            <button
                                type="button"
                                onClick={() => handleSelect(allLabel)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors ${value === allLabel
                                    ? "bg-gray-100 font-semibold text-[#2d2d2d]"
                                    : "text-gray-700 hover:bg-gray-50"
                                    }`}
                            >
                                {allLabel}
                                {value === allLabel && (
                                    <Check className="h-4 w-4 shrink-0 text-[#2d2d2d]" strokeWidth={2} />
                                )}
                            </button>

                            {filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors ${value === option
                                        ? "bg-gray-100 font-semibold text-[#2d2d2d]"
                                        : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <span className="truncate">{option}</span>
                                    {value === option && (
                                        <Check className="h-4 w-4 shrink-0 text-[#2d2d2d]" strokeWidth={2} />
                                    )}
                                </button>
                            ))}

                            {filteredOptions.length === 0 && (
                                <p className="px-3 py-8 text-center text-sm text-gray-400">
                                    Nenhuma mercadoria encontrada para &quot;{search}&quot;.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}