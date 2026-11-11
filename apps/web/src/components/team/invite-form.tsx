"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type TeamInvitationCreated, type TeamRole } from "@/lib/api";
import { userFacingError } from "@/lib/errors";
import { TEAM_ROLE_DESCRIPTIONS, TEAM_ROLE_LABELS } from "@/lib/team";

const schema = z.object({
  full_name: z.string().trim().min(2, "Ingresá el nombre de la persona"),
  email: z.string().trim().email("Ingresá un email válido").max(254, "El email es demasiado largo"),
  role: z.string(),
});

type FormValues = z.infer<typeof schema>;

type InviteFormProps = {
  tenantId: string;
  roles: TeamRole[];
  onCreated: (invitation: TeamInvitationCreated) => void;
};

export function InviteForm({ tenantId, roles, onCreated }: InviteFormProps) {
  const defaultRole: TeamRole = roles.includes("technician")
    ? "technician"
    : (roles[0] ?? "viewer");
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", role: defaultRole },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: { email: string; full_name: string; role: TeamRole }) =>
      api.team.createInvitation(tenantId, values),
    onSuccess: (invitation) => {
      setServerError(null);
      reset({ full_name: "", email: "", role: defaultRole });
      onCreated(invitation);
    },
    onError: (error) => {
      setServerError(userFacingError(error, "No se pudo crear la invitación. Intentá de nuevo."));
    },
  });

  async function onSubmit(values: FormValues) {
    const role = roles.find((candidate) => candidate === values.role);
    if (!role) {
      setServerError("Elegí un rol permitido para tu cuenta.");
      return;
    }
    setServerError(null);
    inviteMutation.mutate({ email: values.email, full_name: values.full_name, role });
  }

  if (roles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invitar integrante</CardTitle>
        <p className="text-sm text-slate">
          La persona recibe un enlace para crear su acceso. La invitación vence en 7 días.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div>
            <label htmlFor="invite-full-name" className="mb-1 block text-sm font-medium text-ink">
              Nombre y apellido *
            </label>
            <Input id="invite-full-name" autoComplete="off" {...register("full_name")} />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="invite-email" className="mb-1 block text-sm font-medium text-ink">
              Email *
            </label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              inputMode="email"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="invite-role" className="mb-1 block text-sm font-medium text-ink">
              Rol *
            </label>
            <select
              id="invite-role"
              className="min-h-10 w-full rounded-xl border border-mist bg-white px-3 py-2 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              aria-describedby="invite-role-help"
              {...register("role")}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {TEAM_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <p id="invite-role-help" className="mt-1 text-xs text-slate">
              {roles
                .map((role) => `${TEAM_ROLE_LABELS[role]}: ${TEAM_ROLE_DESCRIPTIONS[role]}`)
                .join(" ")}
            </p>
          </div>
          {serverError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
            >
              {serverError}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || inviteMutation.isPending}>
              {inviteMutation.isPending ? "Creando invitación..." : "Crear invitación"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
