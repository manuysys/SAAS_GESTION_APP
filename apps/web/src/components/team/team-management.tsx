"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Link2, Mail, RotateCcw, ShieldAlert, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CopyLinkField } from "@/components/copy-link-field";
import { InviteForm } from "@/components/team/invite-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { api, type TeamInvitation, type TeamInvitationCreated } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailDeliveryFeedback, type EmailFeedback } from "@/lib/email-delivery";
import { userFacingError } from "@/lib/errors";
import {
  INVITATION_STATUS_LABELS,
  INVITATION_STATUS_VARIANTS,
  assignableRoles,
  canManageTeam,
  canResendInvitation,
  canRevokeInvitation,
  invitationDisplayStatus,
  roleLabel,
  type InvitationStatus,
} from "@/lib/team";
import { formatDate } from "@/lib/utils";

type LatestInvitation = {
  kind: "created" | "resent";
  invitation: TeamInvitationCreated;
};

export function TeamManagement() {
  const { activeTenantId, tenants } = useAuth();
  const queryClient = useQueryClient();
  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId);
  const role = activeTenant?.role ?? "";
  const canManage = canManageTeam(role);
  const roles = assignableRoles(role);
  const [now] = useState(() => new Date());
  const [latest, setLatest] = useState<LatestInvitation | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<TeamInvitation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["team", activeTenantId],
    queryFn: () => api.team.get(activeTenantId ?? ""),
    enabled: Boolean(activeTenantId) && canManage,
  });

  function refreshTeam() {
    void queryClient.invalidateQueries({ queryKey: ["team", activeTenantId] });
  }

  const resendMutation = useMutation({
    mutationFn: (invitationId: string) =>
      api.team.resendInvitation(activeTenantId ?? "", invitationId),
    onSuccess: (invitation) => {
      setActionError(null);
      setLatest({ kind: "resent", invitation });
      refreshTeam();
      toast.success("Invitación reenviada");
    },
    onError: (error) => {
      setActionError(
        userFacingError(error, "No se pudo reenviar la invitación. Intentá de nuevo."),
      );
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      api.team.revokeInvitation(activeTenantId ?? "", invitationId),
    onSuccess: () => {
      setRevokeTarget(null);
      setActionError(null);
      refreshTeam();
      toast.success("Invitación revocada. Ya no se puede aceptar.");
    },
  });

  if (!activeTenantId) {
    return (
      <Card className="p-8 text-sm text-slate">
        No hay una empresa activa. Cerrá sesión y volvé a ingresar.
      </Card>
    );
  }

  if (!canManage) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            No tenés permisos para gestionar el equipo
          </p>
          <p className="mt-1 text-sm text-slate">
            Solo el propietario o un administrador de {activeTenant?.name ?? "la empresa"} puede
            invitar y administrar integrantes.
          </p>
        </div>
      </Card>
    );
  }

  const data = teamQuery.data;
  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const openInvitations = invitations.filter(
    (invitation) => invitationDisplayStatus(invitation, now) === "pending",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Empresa"
        title="Equipo"
        description={`${members.length} integrante${members.length === 1 ? "" : "s"} en ${activeTenant?.name ?? "tu empresa"} · ${openInvitations} invitación${openInvitations === 1 ? "" : "es"} pendiente${openInvitations === 1 ? "" : "s"}.`}
      />

      <InviteForm
        tenantId={activeTenantId}
        roles={roles}
        onCreated={(invitation) => {
          setLatest({ kind: "created", invitation });
          setActionError(null);
          refreshTeam();
          toast.success("Invitación creada");
        }}
      />

      {latest && <LatestInvitationCard latest={latest} onDismiss={() => setLatest(null)} />}

      {actionError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {teamQuery.isLoading ? (
        <p className="text-sm text-slate">Cargando equipo...</p>
      ) : teamQuery.isError ? (
        <Card className="p-6">
          <p role="alert" className="text-sm text-red-700">
            {userFacingError(teamQuery.error, "No se pudo cargar el equipo.")}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void teamQuery.refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Integrantes activos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Users}
                    title="Todavía no hay integrantes"
                    description="Invitá a tu primer técnico o coordinador."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <caption className="sr-only">Integrantes de la empresa</caption>
                    <thead className="bg-paper text-xs tracking-wide text-slate uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Nombre
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Email
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Rol
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Estado
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Último acceso
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mist">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-4 py-3 font-semibold text-ink">{member.full_name}</td>
                          <td className="px-4 py-3 text-slate">{member.email}</td>
                          <td className="px-4 py-3">{roleLabel(member.role)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={member.status === "active" ? "success" : "neutral"}>
                              {member.status === "active" ? "Activo" : member.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate">
                            {member.last_login_at
                              ? formatDate(member.last_login_at)
                              : "Sin accesos todavía"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitaciones</CardTitle>
              <p className="text-sm text-slate">
                El enlace de una invitación solo se muestra al crearla o reenviarla. Si se perdió,
                reenviála para generar uno nuevo.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {invitations.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Mail}
                    title="No hay invitaciones"
                    description="Las invitaciones que envíes aparecen acá con su estado."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <caption className="sr-only">Invitaciones enviadas</caption>
                    <thead className="bg-paper text-xs tracking-wide text-slate uppercase">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Email
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Rol
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Estado
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Enviada
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Vence
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mist">
                      {invitations.map((invitation) => {
                        const status = invitationDisplayStatus(invitation, now);
                        return (
                          <tr key={invitation.id}>
                            <td className="px-4 py-3 font-medium text-ink">{invitation.email}</td>
                            <td className="px-4 py-3">{roleLabel(invitation.role)}</td>
                            <td className="px-4 py-3">
                              <InvitationStatusBadge status={status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate">
                              {formatDate(invitation.created_at)}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate">
                              {formatDate(invitation.expires_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {canResendInvitation(status) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Reenviar invitación a ${invitation.email}`}
                                    disabled={resendMutation.isPending}
                                    onClick={() => resendMutation.mutate(invitation.id)}
                                  >
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                    Reenviar
                                  </Button>
                                )}
                                {canRevokeInvitation(status) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-700 hover:bg-red-50"
                                    aria-label={`Revocar invitación a ${invitation.email}`}
                                    onClick={() => {
                                      revokeMutation.reset();
                                      setRevokeTarget(invitation);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Revocar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocar invitación</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés revocar la invitación a {revokeTarget?.email}? El enlace deja de
              funcionar y no se puede aceptar. Podés volver a invitar después.
            </DialogDescription>
          </DialogHeader>
          {revokeMutation.isError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {userFacingError(revokeMutation.error, "No se pudo revocar la invitación.")}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={revokeMutation.isPending}
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
            >
              {revokeMutation.isPending ? "Revocando..." : "Revocar invitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InvitationStatusBadge({ status }: { status: InvitationStatus | null }) {
  if (!status) {
    return <Badge variant="neutral">Sin estado</Badge>;
  }
  return (
    <Badge variant={INVITATION_STATUS_VARIANTS[status]}>{INVITATION_STATUS_LABELS[status]}</Badge>
  );
}

function LatestInvitationCard({
  latest,
  onDismiss,
}: {
  latest: LatestInvitation;
  onDismiss: () => void;
}) {
  const { invitation, kind } = latest;
  const feedback: EmailFeedback = emailDeliveryFeedback(invitation.email_status, invitation.email);
  const toneClass =
    feedback.tone === "success"
      ? "text-emerald-800"
      : feedback.tone === "warning"
        ? "text-amber-900"
        : "text-slate";

  return (
    <Card className="border-teal/30 bg-teal/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-teal" aria-hidden="true" />
          {kind === "created" ? "Invitación creada" : "Invitación reenviada"} para{" "}
          {invitation.email}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`text-sm ${toneClass}`}>{feedback.message}</p>
        <CopyLinkField
          id="latest-invitation-url"
          label="Enlace de invitación"
          value={invitation.invitation_url}
          helpText={`Se muestra una sola vez. Vence el ${formatDate(invitation.expires_at)}.`}
        />
        <p className="flex items-center gap-1.5 text-xs text-slate">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Compartí el enlace solo con la persona invitada.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Entendido, ocultar enlace
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
