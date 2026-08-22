"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isPathAllowed } from "@/lib/permissions";

// Bloqueia (e redireciona) o acesso a qualquer tela do grupo Protected que
// o usuário não tenha permissão. Admin sempre passa. Usuário comum só
// acessa o que estiver em allowedPages.
export default function AccessGuard({ children }: { children: React.ReactNode }) {
    const { role, allowedPages, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const allowed = !loading && isPathAllowed(pathname, role, allowedPages);

    useEffect(() => {
        if (loading) return;
        if (!isPathAllowed(pathname, role, allowedPages)) {
            const fallback = role === "Admin" ? "/home" : (allowedPages && allowedPages[0]) || "/home";
            if (pathname !== fallback) router.replace(fallback);
        }
    }, [loading, pathname, role, allowedPages, router]);

    if (loading) return null;
    if (!allowed) return null;

    return <>{children}</>;
}