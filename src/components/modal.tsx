"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
    if (!open) return null;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
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