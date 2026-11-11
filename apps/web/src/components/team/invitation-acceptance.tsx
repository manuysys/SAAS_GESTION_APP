"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  api,
  type InvitationAcceptInput,
  type InvitationAcceptResponse,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { userFacingError } from "@/lib/errors";
import {
  homePathForRole,
  invitationDisplayStatus,
  publicInvitationMessage,
  roleLabel,
  type InvitationStatus,
} from "@/lib/team";
import { formatDate } from "@/lib/utils";

const newUserSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type FormValues = z.infer<typeof newUserSchema>;

const STATUS_TITLES: Record<Exclude<InvitationStatus, "pending">, string> = {
  expired: "Invitación vencida",
  accepted: "Invitación ya aceptada",
  revoked: "Invitación revocada",
};

export function InvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading: authLoading, adoptSession, logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const previewQuery = useQuery({
    queryKey: ["public-invitation", token],
    queryFn: () => api.publicInvitations.get(token),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { full_name: "", password: "" },
  });

  const acceptMutation = useMutation({
    mutationFn: (input: InvitationAcceptInput | null) =>
      input
        ? api.publicInvitations.acceptNewUser(token, input)
        : api.publicInvitations.acceptWithSession(token),
    onSuccess: async (response: InvitationAcceptResponse) => {
      await adoptSession(response.access_token, response.tenant.id);
      router.replace(homePathForRole(response.tenant.role));
    },
    onError: (error) => {
      setServerError(userFacingError(error, "No pudimos aceptar la invitación. Intentá de nuevo."));
    },
  });

  if (previewQuery.isLoading || authLoading) {
    return (
      <StateCard title="Cargando invitación">
        <p className="mt-2 text-sm text-slate">Un momento, estamos verificando el enlace.</p>
      </StateCard>
    );
  }

  if (previewQuery.isError) {
    if (previewQuery.error instanceof ApiError && previewQuery.error.status === 404) {
      return (
        <StateCard title="Invitación no válida">
          <p className="mt-2 text-sm text-slate">
            El enlace no existe o está incompleto. Pedí a tu empresa que te envíe una nueva
            invitación.
          </p>
        </StateCard>
      );
    }
    return (
      <StateCard title="No pudimos cargar la invitación">
        <p className="mt-2 text-sm text-slate">Revisá tu conexión y volvé a intentar.</p>
        <Button variant="outline" className="mt-5" onClick={() => void previewQuery.refetch()}>
          Reintentar
        </Button>
      </StateCard>
    );
  }

  const invitation = previewQuery.data;
  if (!invitation) {
    return (
      <StateCard title="Cargando invitación">
        <p className="mt-2 text-sm text-slate">Un momento, estamos verificando el enlace.</p>
      </StateCard>
    );
  }

  const status = invitationDisplayStatus(invitation, now);

  if (!status) {
    return (
      <StateCard title="No pudimos validar la invitación">
        <p className="mt-2 text-sm text-slate">
          Pedí a tu empresa que te envíe una nueva invitación.
        </p>
      </StateCard>
    );
  }

  if (status !== "pending") {
    return (
      <StateCard title={STATUS_TITLES[status]}>
        <p className="mt-2 text-sm text-slate">{publicInvitationMessage(status)}</p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-teal hover:underline"
        >
          Ir a ingresar
        </Link>
      </StateCard>
    );
  }

  const sessionErrorBlock = serverError && (
    <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
      {serverError}
    </p>
  );

  return (
    <Card className="w-full max-w-md p-8">
      <p className="text-xs font-semibold tracking-[0.14em] text-teal uppercase">Invitación</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
        Te invitaron a {invitation.tenant_name}
      </h1>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-mist bg-paper px-4 py-3 text-sm">
        <dt className="text-slate">Rol</dt>
        <dd className="font-medium text-ink">{roleLabel(invitation.role)}</dd>
        <dt className="text-slate">Email</dt>
        <dd className="font-medium break-all text-ink">{invitation.email_masked}</dd>
        <dt className="text-slate">Vence</dt>
        <dd className="font-medium text-ink">{formatDate(invitation.expires_at)}</dd>
      </dl>

      {user ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate">
            Estás ingresado como <span className="font-medium text-ink">{user.email}</span>. Si ese
            email no es el de la invitación, no vas a poder aceptarla.
          </p>
          {sessionErrorBlock}
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate(null)}
          >
            {acceptMutation.isPending ? "Aceptando..." : "Aceptar invitación"}
          </Button>
          <button
            type="button"
            className="w-full text-sm font-medium text-slate underline-offset-4 hover:text-ink hover:underline"
            onClick={() => void logout()}
          >
            Usar otra cuenta
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => acceptMutation.mutate(values))}
          className="mt-6 space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="invite-accept-name" className="mb-1 block text-sm font-medium text-ink">
              Nombre y apellido
            </label>
            <Input id="invite-accept-name" autoComplete="name" {...register("full_name")} />
            {errors.full_name && (
              <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="invite-accept-password"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Contraseña
            </label>
            <Input
              id="invite-accept-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            ) : (
              <p className="mt-1 text-xs text-slate">Mínimo 8 caracteres.</p>
            )}
          </div>
          {sessionErrorBlock}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || acceptMutation.isPending}
          >
            {acceptMutation.isPending ? "Creando tu acceso..." : "Aceptar invitación"}
          </Button>
          <p className="text-center text-xs text-slate">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-teal hover:underline">
              Ingresá
            </Link>{" "}
            y volvé a abrir este enlace.
          </p>
        </form>
      )}
    </Card>
  );
}

function StateCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="w-full max-w-md p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {children}
    </Card>
  );
}
