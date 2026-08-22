import { NAV_ITEMS, ADMIN_ONLY_HREFS } from "@/lib/navItems";

export const ALL_PAGE_HREFS = NAV_ITEMS.map((item) => item.href);
export { ADMIN_ONLY_HREFS };
export const ADMIN_ONLY_HREFS_SET = new Set(ADMIN_ONLY_HREFS);

// Admin sempre tem acesso a tudo. Usuário comum só tem acesso às telas
// salvas em allowedPages (e nunca às telas admin-only, mesmo que
// alguém tente forçar isso salvando o href errado).
export function resolveAllowedPages(
  role: string | null | undefined,
  allowedPagesRaw: unknown
): string[] {
  if (role === "Admin") return ALL_PAGE_HREFS;

  const arr = Array.isArray(allowedPagesRaw)
    ? allowedPagesRaw.filter((h): h is string => typeof h === "string")
    : [];

  return arr.filter((h) => ALL_PAGE_HREFS.includes(h) && !ADMIN_ONLY_HREFS_SET.has(h));
}

export function isPathAllowed(
  pathname: string,
  role: string | null,
  allowedPages: string[] | null
): boolean {
  if (role === "Admin") return true;

  if (ADMIN_ONLY_HREFS.some((h) => pathname === h || pathname.startsWith(`${h}/`))) {
    return false;
  }

  if (!allowedPages) return false;

  return allowedPages.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}