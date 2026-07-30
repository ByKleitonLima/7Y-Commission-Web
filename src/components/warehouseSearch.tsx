"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Product } from "@/components/productsTable";

interface WarehouseSearchProps {
    products: Product[];
    onSelectDock: (dockCode: string) => void;
}

export default function WarehouseSearch({ products, onSelectDock }: WarehouseSearchProps) {
    const [term, setTerm] = useState("");
    const [open, setOpen] = useState(false);

    const results = useMemo(() => {
        if (term.trim().length < 2) return [];
        const lower = term.toLowerCase();
        return products
            .filter((p) => p.dock && (p.name.toLowerCase().includes(lower) || p.product_code.toLowerCase().includes(lower)))
            .slice(0, 8);
    }, [term, products]);

    return (
        <div className="relative w-full max-w-sm">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                <input
                    value={term}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Pesquisar produto por nome ou código..."
                    className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                />
            </div>

            {open && results.length > 0 && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute top-[105%] left-0 z-20 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        {results.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    onSelectDock(p.dock as string);
                                    setOpen(false);
                                    setTerm(p.name);
                                }}
                                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                            >
                                <span className="truncate text-[#2d2d2d]">{p.name}</span>
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                                    {p.dock}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}