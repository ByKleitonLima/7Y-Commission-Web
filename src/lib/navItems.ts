import {
  LayoutDashboard,
  UserCog,
  Users,
  Truck,
  Package,
  Boxes,
  Upload,
  Warehouse,
  History,
  ClipboardList,
  Percent,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItemDef {
  label: string;
  href: string;
  icon: LucideIcon;
  pageTitle: string;
}

// Fonte única de verdade dos itens de navegação. Fica fora de menu.tsx
// (que é "use client" e importa AuthContext) para evitar import circular
// com permissions.ts / AuthContext.tsx, que precisam da lista de hrefs.
export const NAV_ITEMS: NavItemDef[] = [
  { label: "Dashboard", href: "/home", icon: LayoutDashboard, pageTitle: "Dashbord de comissão" },
  { label: "Gerentes", href: "/managers", icon: UserCog, pageTitle: "Gerentes de vendas" },
  { label: "Vendedores", href: "/sellers", icon: Users, pageTitle: "Vendedores" },
  { label: "Comissões", href: "/commissions", icon: Percent, pageTitle: "Comissões" },
  { label: "Descontos", href: "/discounts", icon: ClipboardList, pageTitle: "Descontos de Comissão" },
  { label: "Clientes", href: "/clients", icon: Truck, pageTitle: "Clientes" },
  { label: "Fornecedores", href: "/suppliers", icon: Package, pageTitle: "Fornecedores" },
  { label: "Estoque", href: "/stock", icon: Boxes, pageTitle: "Estoque" },
  { label: "Preços & Histórico", href: "/prices-history", icon: History, pageTitle: "Preços & Histórico de Estoque" },
  { label: "Mapa do Galpão", href: "/warehouse", icon: Warehouse, pageTitle: "Mapa do Galpão" },
  { label: "Importar", href: "/import", icon: Upload, pageTitle: "Importar planilha de comissão" },
  { label: "Logs de Auditoria", href: "/audit-logs", icon: ScrollText, pageTitle: "Logs de Auditoria" },
  { label: "Administração", href: "/admin/users", icon: ShieldCheck, pageTitle: "Administração de usuários" },
];

// Hrefs que só funcionam/aparecem para quem tem role "Admin", independente
// de qualquer allowedPages configurado para o usuário.
export const ADMIN_ONLY_HREFS = ["/audit-logs", "/admin/users"];