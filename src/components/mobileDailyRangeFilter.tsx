"use client";

import { useEffect, useState } from "react";

// Mesmo breakpoint "mobile" usado no resto do app (md = 768px, ver
// componentes como sellersStable.tsx / managerStable.tsx que trocam
// tabela <-> cards em "md").
const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export const DAILY_RANGE_OPTIONS = [
    { label: "Últimos 7 dias", value: 7 },
    { label: "Últimos 15 dias", value: 15 },
    { label: "Últimos 30 dias", value: 30 },
    { label: "Tudo", value: 0 },
] as const;

// Detecta mobile do mesmo jeito que o resto do app entende "mobile"
// (abaixo de md/768px). Usa matchMedia + fallback por innerWidth no
// primeiro render (evita ficar preso em "desktop" até o efeito rodar).
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    useEffect(() => {
        const query = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
        const update = () => setIsMobile(query.matches);
        update();

        if (query.addEventListener) {
            query.addEventListener("change", update);
            return () => query.removeEventListener("change", update);
        }

        // Fallback para navegadores/webviews mais antigos sem
        // addEventListener em MediaQueryList.
        query.addListener(update);
        return () => query.removeListener(update);
    }, []);

    return isMobile;
}

interface MobileDailyRangeFilterProps {
    value: number;
    onChange: (days: number) => void;
    className?: string;
}

// Filtro de período (em dias) que só aparece no mobile — usado para
// evitar que gráficos de série diária fiquem "espremidos"/ilegíveis em
// telas pequenas quando o período selecionado é muito longo. O
// componente só renderiza o <select>; quem decide como fatiar os
// dados é o componente pai (ver DailySalesChart em graphic.tsx).
export default function MobileDailyRangeFilter({ value, onChange, className }: MobileDailyRangeFilterProps) {
    return (
        <div className={`md:hidden ${className || ""}`}>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-[#2d2d2d] outline-none focus:border-[#2d2d2d]"
            >
                {DAILY_RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}