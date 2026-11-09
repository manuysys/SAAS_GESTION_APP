import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles del tenant activo que ven el enlace. Sin `roles`, lo ven todos. */
  roles?: string[];
  /** Solo administradores de la plataforma SaaS (panel global). */
  platformAdminOnly?: boolean;
};

export const MANAGEMENT_ROLES = ["owner", "admin", "dispatcher"];
export const ADMIN_ROLES = ["owner", "admin"];

/**
 * Módulos financieros (panel, presupuestos, pagos, facturación) solo para roles de gestión.
 * Los técnicos usan /tech, fuera de este shell.
 */
export const navigation: NavItem[] = [
  {
    href: "/tech",
    label: "Mis trabajos",
    icon: Wrench,
    roles: ["technician"],
  },
  {
    href: "/dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    roles: MANAGEMENT_ROLES,
  },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/requests", label: "Solicitudes", icon: Inbox },
  { href: "/orders", label: "Órdenes", icon: ClipboardList },
  {
    href: "/quotes",
    label: "Presupuestos",
    icon: FileText,
    roles: MANAGEMENT_ROLES,
  },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  {
    href: "/payments",
    label: "Pagos",
    icon: Wallet,
    roles: MANAGEMENT_ROLES,
  },
  {
    href: "/automations",
    label: "Automatizaciones",
    icon: Workflow,
    roles: ADMIN_ROLES,
  },
  {
    href: "/assistant",
    label: "Asistente",
    icon: Sparkles,
    roles: MANAGEMENT_ROLES,
  },
  {
    href: "/settings/billing",
    label: "Facturación",
    icon: CreditCard,
    roles: ADMIN_ROLES,
  },
  {
    href: "/settings/whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: ADMIN_ROLES,
  },
  {
    href: "/admin",
    label: "Admin SaaS",
    icon: ShieldCheck,
    platformAdminOnly: true,
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function visibleNavigation(
  role: string,
  isPlatformAdmin: boolean | undefined,
): NavItem[] {
  return navigation.filter((item) => {
    if (item.platformAdminOnly) {
      return isPlatformAdmin === true;
    }
    return !item.roles || item.roles.includes(role);
  });
}
