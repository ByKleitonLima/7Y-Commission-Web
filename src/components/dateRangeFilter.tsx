"use client";

import { useEffect, useState } from "react";

interface DateRangeFilterProps {
    from: string; // DD/MM/AAAA
    to: string; // DD/MM/AAAA
    onChange: (from: string, to: string) => void;
}

// Aplica a máscara DD/MM/AAAA enquanto o usuário digita, aceitando apenas números.
function maskDate(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    return [day, month, year].filter(Boolean).join("/");
}

// Valida se a string é uma data real no formato DD/MM/AAAA (ex: rejeita 31/02/2026).
function isValidDate(value: string): boolean {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

export default function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
    const [localFrom, setLocalFrom] = useState(from);
    const [localTo, setLocalTo] = useState(to);

    // Mantém os campos sincronizados caso o valor venha atualizado de fora
    // (ex: carregado do localStorage após a montagem do componente).
    useEffect(() => setLocalFrom(from), [from]);
    useEffect(() => setLocalTo(to), [to]);

    const commit = (nextFrom: string, nextTo: string) => {
        if (isValidDate(nextFrom) && isValidDate(nextTo)) {
            onChange(nextFrom, nextTo);
        }
    };

    const fromInvalid = localFrom.length === 10 && !isValidDate(localFrom);
    const toInvalid = localTo.length === 10 && !isValidDate(localTo);

    return (
        <div className="flex items-end gap-3">
            <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">De</label>
                <input
                    value={localFrom}
                    onChange={(e) => setLocalFrom(maskDate(e.target.value))}
                    onBlur={() => commit(localFrom, localTo)}
                    placeholder="01/04/2026"
                    inputMode="numeric"
                    maxLength={10}
                    className={`h-10 w-[130px] rounded-lg border bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] ${fromInvalid ? "border-red-400" : "border-gray-200"
                        }`}
                />
            </div>

            <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">Até</label>
                <input
                    value={localTo}
                    onChange={(e) => setLocalTo(maskDate(e.target.value))}
                    onBlur={() => commit(localFrom, localTo)}
                    placeholder="05/04/2026"
                    inputMode="numeric"
                    maxLength={10}
                    className={`h-10 w-[130px] rounded-lg border bg-white px-3 text-sm text-[#2d2d2d] outline-none focus:border-[#2d2d2d] ${toInvalid ? "border-red-400" : "border-gray-200"
                        }`}
                />
            </div>
        </div>
    );
}