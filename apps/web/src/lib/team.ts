import type { PublicInvitationStatus, TeamRole } from "@/lib/api";

/** Roles que pueden ver y gestionar el equipo. El resto ve un estado sin permisos. */
const TEAM_MANAGER_ROLES: readonly string[] = ["owner", "admin"];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  dispatcher: "Coordinador",
  technician: "Técnico",
  viewer: "Consulta",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Control total de la empresa.",
  admin: "Gestiona equipo, facturación y configuración.",
  dispatcher: "Coordina agenda, órdenes y clientes.",
  technician: "Ve y ejecuta sus trabajos desde el celular.",
  viewer: "Solo consulta, sin modificar datos.",
};

export function isTeamRole(value: string): value is TeamRole {
  return Object.keys(TEAM_ROLE_LABELS).includes(value);
}

export function roleLabel(role: string): string {
  return isTeamRole(role) ? TEAM_ROLE_LABELS[role] : "Sin rol";
}

export function canManageTeam(role: string | null | undefined): boolean {
  return role !== null && role !== undefined && TEAM_MANAGER_ROLES.includes(role);
}

/**
 * Roles que el actor puede asignar al invitar. Espeja las reglas del backend:
 * nadie invita `owner`; solo `owner` puede invitar `admin`.
 */
export function assignableRoles(actorRole: string | null | undefined): TeamRole[] {
  if (actorRole === "owner") {
    return ["admin", "dispatcher", "technician", "viewer"];
  }
  if (actorRole === "admin") {
    return ["dispatcher", "technician", "viewer"];
  }
  return [];
}

export type InvitationStatus = PublicInvitationStatus;

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Pendiente",
  expired: "Vencida",
  accepted: "Aceptada",
  revoked: "Revocada",
};

export const INVITATION_STATUS_VARIANTS: Record<
  InvitationStatus,
  "info" | "warning" | "success" | "danger"
> = {
  pending: "info",
  expired: "warning",
  accepted: "success",
  revoked: "danger",
};

/**
 * Estado a mostrar. Una invitación "pending" cuyo `expires_at` ya pasó se muestra
 * como vencida aunque el backend todavía no la haya marcado. Devuelve null si el
 * estado no es reconocido.
 */
export function invitationDisplayStatus(
  invitation: { status: string; expires_at: string },
  now: Date,
): InvitationStatus | null {
  switch (invitation.status) {
    case "accepted":
    case "revoked":
    case "expired":
      return invitation.status;
    case "pending": {
      const expiresAt = new Date(invitation.expires_at).getTime();
      if (Number.isNaN(expiresAt)) {
        return null;
      }
      return expiresAt <= now.getTime() ? "expired" : "pending";
    }
    default:
      return null;
  }
}

/** Solo las invitaciones abiertas pueden reenviarse o revocarse. */
export function canResendInvitation(status: InvitationStatus | null): boolean {
  return status === "pending" || status === "expired";
}

export function canRevokeInvitation(status: InvitationStatus | null): boolean {
  return status === "pending" || status === "expired";
}

/** Ruta inicial tras aceptar: los técnicos usan su shell móvil, el resto el panel. */
export function homePathForRole(role: string): "/tech" | "/dashboard" {
  return role === "technician" ? "/tech" : "/dashboard";
}

/** Mensaje para la pantalla pública de aceptación cuando la invitación no se puede usar. */
export function publicInvitationMessage(status: InvitationStatus): string | null {
  switch (status) {
    case "pending":
      return null;
    case "expired":
      return "Esta invitación venció. Pedí a tu empresa que te envíe una nueva.";
    case "accepted":
      return "Esta invitación ya fue aceptada. Si ya tenés cuenta, ingresá para ver tu empresa.";
    case "revoked":
      return "Esta invitación fue revocada. Consultá con la persona que te la envió.";
  }
}
