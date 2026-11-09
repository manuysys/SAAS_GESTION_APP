"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login(values.email, values.password);
      router.replace("/dashboard");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.detail : "No se pudo iniciar sesión");
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <p className="text-teal text-xs font-semibold tracking-[0.14em] uppercase">Bienvenido</p>
      <h1 className="font-display text-ink mt-2 text-2xl font-semibold tracking-tight">Ingresar</h1>
      <p className="text-slate mt-2 text-sm">Accedé al panel de tu empresa.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-ink mb-1 block text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-ink mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>

      <div className="bg-paper border-mist mt-5 rounded-xl border px-3 py-2.5 text-xs">
        <p className="text-ink font-semibold">Cuenta de demo</p>
        <p className="text-slate mt-0.5">
          demo@saasgestion.com · Demo12345! ·{" "}
          <Link href="/register" className="text-teal font-medium hover:underline">
            crear cuenta
          </Link>
        </p>
      </div>

      <p className="text-slate mt-6 text-center text-sm">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="text-teal font-medium hover:underline">
          Crear una empresa
        </Link>
      </p>
    </Card>
  );
}
