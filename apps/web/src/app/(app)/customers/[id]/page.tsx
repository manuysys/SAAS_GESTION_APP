"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PortalAccessSection } from "@/components/customers/portal-access-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { userFacingError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { activeTenantId } = useAuth();

  const customerQuery = useQuery({
    queryKey: ["customer", activeTenantId, customerId],
    queryFn: () => api.customers.get(activeTenantId ?? "", customerId),
    enabled: Boolean(activeTenantId && customerId),
  });

  if (!activeTenantId) {
    return <p className="text-sm text-slate">No hay una empresa activa.</p>;
  }

  if (customerQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando cliente...
      </div>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <Card className="p-8">
        <p role="alert" className="text-sm font-medium text-ink">
          {userFacingError(customerQuery.error, "No se encontró el cliente.")}
        </p>
        <Link href="/customers" className="mt-3 inline-block text-sm text-ink underline">
          Volver a clientes
        </Link>
      </Card>
    );
  }

  const customer = customerQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a clientes
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {customer.name}
          </h1>
          <p className="mt-1 text-sm text-slate">Alta el {formatDate(customer.created_at)}</p>
        </div>
        <Badge variant={customer.status === "active" ? "success" : "neutral"}>
          {customer.status === "active" ? "Activo" : customer.status}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate" aria-hidden="true" />
                <dt className="sr-only">Teléfono</dt>
                <dd className="text-ink">{customer.phone ?? "Sin teléfono"}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate" aria-hidden="true" />
                <dt className="sr-only">Email</dt>
                <dd className="break-all text-ink">{customer.email ?? "Sin email"}</dd>
              </div>
              {customer.notes && (
                <div className="border-t border-mist pt-3">
                  <dt className="text-xs tracking-wide text-slate uppercase">Observaciones</dt>
                  <dd className="mt-1 whitespace-pre-line text-ink">{customer.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <PortalAccessSection customer={customer} />
      </div>
    </div>
  );
}
