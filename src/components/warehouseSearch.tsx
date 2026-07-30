"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DockOccupancy } from "@/services/wareHouseServices";

interface WarehouseSearchProps {
    docks: DockOccupancy[];
    onSelectDock: (code: string) => void;
}

export default function WarehouseSearch({ docks, onSelectDock }: WarehouseSearchProps) {
    const [term, setTerm] = useState("");
    const [open, setOpen] = useState(false);

    const results = useMemo(() => {
        const query = term.trim().toLowerCase();
        if (query.length < 2) return [];

        return docks
            .filter((d) => {
                const haystack = [
                    d.code,
                    d.rua || "",
                    d.label,
                    ...d.products.flatMap((p) => [p.name, p.product_code, p.supplier_name || ""]),
                ]
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(query);
            })
            .slice(0, 10);
    }, [term, docks]);

    return (
        <div className="relative w-full">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={1.75} />
                <input
                    value={term}
                    onChange={(e) => {
                        setTerm(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Produto, código, rua, posição ou fornecedor..."
                    className="w-full bg-transparent text-sm text-[#2d2d2d] outline-none placeholder:text-gray-400"
                />
            </div>

            {open && results.length > 0 && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute top-[105%] left-0 z-20 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        {results.map((d) => (
                            <button
                                key={d.code}
                                type="button"
                                onClick={() => {
                                    onSelectDock(d.code);
                                    setOpen(false);
                                    setTerm(d.code);
                                }}
                                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
                            >
                                <span className="truncate text-[#2d2d2d]">
                                    {d.products[0]?.name || d.label}
                                </span>
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                                    {d.code}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}