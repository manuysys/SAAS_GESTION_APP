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
  full_name: z.string().min(2, "Ingresá tu nombre"),
  company_name: z.string().min(2, "Ingresá el nombre de tu empresa"),
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await registerUser(values);
      router.replace("/dashboard");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.detail : "No se pudo crear la cuenta");
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <p className="text-teal text-xs font-semibold tracking-[0.14em] uppercase">Empezá hoy</p>
      <h1 className="font-display text-ink mt-2 text-2xl font-semibold tracking-tight">
        Crear cuenta
      </h1>
      <p className="text-slate mt-2 text-sm">
        Registrá tu empresa y empezá a ordenar la operación.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="full_name" className="text-ink mb-1 block text-sm font-medium">
            Nombre y apellido
          </label>
          <Input id="full_name" autoComplete="name" {...register("full_name")} />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="company_name" className="text-ink mb-1 block text-sm font-medium">
            Nombre de la empresa
          </label>
          <Input id="company_name" autoComplete="organization" {...register("company_name")} />
          {errors.company_name && (
            <p className="mt-1 text-xs text-red-600">{errors.company_name.message}</p>
          )}
        </div>

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
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
          <p className="text-slate mt-1 text-xs">Mínimo 8 caracteres.</p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting ? "Creando..." : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-slate mt-6 text-center text-sm">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-teal font-medium hover:underline">
          Ingresar
        </Link>
      </p>
    </Card>
  );
}
