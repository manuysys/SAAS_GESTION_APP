"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Link2, Mail, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CopyLinkField } from "@/components/copy-link-field";
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
import { api, type Customer, type PortalAccess } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emailDeliveryFeedback } from "@/lib/email-delivery";
import { userFacingError } from "@/lib/errors";
import { MANAGEMENT_ROLES } from "@/lib/navigation";
import { PORTAL_ACCESS_NOTICE, canSendPortalEmail, isSafePortalUrl } from "@/lib/portal-access";
import { formatDate } from "@/lib/utils";

type PortalAccessSectionProps = {
  customer: Customer;
};

export function PortalAccessSection({ customer }: PortalAccessSectionProps) {
  const { activeTenantId, tenants } = useAuth();
  const role = tenants.find((tenant) => tenant.id === activeTenantId)?.role ?? "";
  const canManage = MANAGEMENT_ROLES.includes(role);
  const hasEmail = canSendPortalEmail(customer.email);
  const [access, setAccess] = useState<PortalAccess | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const tenantId = activeTenantId ?? "";

  const createMutation = useMutation({
    mutationFn: (sendEmail: boolean) => api.portalAccess.create(tenantId, customer.id, sendEmail),
    onSuccess: (result, sendEmail) => {
      setError(null);
      setAccess(result);
      if (sendEmail) {
        const feedback = emailDeliveryFeedback(result.email_status, customer.email ?? "");
        setNotice({
          tone: feedback.tone === "warning" ? "warning" : "info",
          text: feedback.message,
        });
      } else {
        setNotice({
          tone: "info",
          text: "Enlace generado. Compartilo solo con el cliente por un canal de confianza.",
        });
      }
    },
    onError: (mutationError) => {
      setNotice(null);
      setError(userFacingError(mutationError, "No se pudo generar el acceso al portal."));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => api.portalAccess.revoke(tenantId, customer.id),
    onSuccess: () => {
      setRevokeOpen(false);
      setAccess(null);
      setNotice(null);
      setError(null);
      toast.success(`Se revocaron los accesos al portal de ${customer.name}`);
    },
    onError: (mutationError) => {
      setError(
        userFacingError(mutationError, "No se pudieron revocar los accesos. Intentá de nuevo."),
      );
    },
  });

  const busy = createMutation.isPending || revokeMutation.isPending;
  const showableUrl = access && isSafePortalUrl(access.access_url) ? access.access_url : null;

  return (
    <section aria-labelledby="portal-access-title">
      <Card>
        <CardHeader>
          <CardTitle id="portal-access-title" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-teal" aria-hidden="true" />
            Acceso al portal
          </CardTitle>
          <p className="text-sm text-slate">
            El cliente entra con un enlace seguro para ver sus solicitudes, órdenes, presupuestos y
            pagos. Solo ve su información.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate">
            Contacto registrado:{" "}
            <span className="font-medium text-ink">{customer.email ?? "sin email cargado"}</span>
          </p>

          {!canManage ? (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Solo owner, administradores y coordinadores pueden gestionar el acceso al portal.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !hasEmail}
                  onClick={() => createMutation.mutate(true)}
                  aria-describedby={hasEmail ? undefined : "portal-email-hint"}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {createMutation.isPending && createMutation.variables === true
                    ? "Enviando..."
                    : "Enviar acceso por email"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => createMutation.mutate(false)}
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  {createMutation.isPending && createMutation.variables === false
                    ? "Generando..."
                    : "Copiar enlace"}
                </Button>
              </div>
              {!hasEmail && (
                <p id="portal-email-hint" className="text-xs text-slate">
                  Cargá un email en la ficha del cliente para enviarle el acceso. También podés
                  copiar el enlace.
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              {access && (
                <div className="space-y-3 rounded-xl border border-mist bg-white p-4">
                  {notice && (
                    <p
                      role="status"
                      className={
                        notice.tone === "warning" ? "text-sm text-amber-900" : "text-sm text-slate"
                      }
                    >
                      {notice.text}
                    </p>
                  )}
                  {showableUrl ? (
                    <CopyLinkField
                      id="portal-access-url"
                      label="Enlace de acceso del cliente"
                      value={showableUrl}
                      helpText={`${PORTAL_ACCESS_NOTICE} Vence el ${formatDate(access.expires_at)}.`}
                    />
                  ) : (
                    <p role="alert" className="text-sm text-red-700">
                      El enlace recibido no es válido. Generá uno nuevo.
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-mist pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={() => {
                    revokeMutation.reset();
                    setRevokeOpen(true);
                  }}
                >
                  Revocar accesos
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocar accesos al portal</DialogTitle>
            <DialogDescription>
              ¿Confirmás que querés revocar los accesos al portal de {customer.name}? El cliente
              tendrá que recibir un nuevo enlace para volver a entrar.
            </DialogDescription>
          </DialogHeader>
          {revokeMutation.isError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {userFacingError(revokeMutation.error, "No se pudieron revocar los accesos.")}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={revokeMutation.isPending}
              onClick={() => revokeMutation.mutate()}
            >
              {revokeMutation.isPending ? "Revocando..." : "Revocar accesos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
