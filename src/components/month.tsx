"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

interface MonthPickerProps {
    value: string;
    onChange: (value: string) => void;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = () => {
        inputRef.current?.showPicker?.();
    };

    return (
        <div className="flex h-10 items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
            <input
                ref={inputRef}
                type="month"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-full flex-1 bg-transparent px-4 text-sm text-[#2d2d2d] outline-none [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <button
                type="button"
                onClick={handleIconClick}
                className="flex h-full w-10 shrink-0 items-center justify-center bg-[#2d2d2d] transition-colors hover:bg-[#1f1f1f]"
            >
                <Calendar className="h-4 w-4 text-white" strokeWidth={1.75} />
            </button>
        </div>
    );
}