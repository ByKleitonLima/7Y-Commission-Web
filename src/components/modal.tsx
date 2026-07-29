"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        document.addEventListener("keydown", handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
            >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-base font-semibold text-[#2d2d2d]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                </div>

                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}