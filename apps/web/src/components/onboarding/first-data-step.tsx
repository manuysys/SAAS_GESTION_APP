import Link from "next/link";
import { FileUp, UserPlus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FirstDataStepProps = {
  /** Cantidad de clientes del tenant. `null` mientras se consulta. */
  customersCount: number | null;
  customersError: boolean;
  pending: boolean;
  onBack: () => void;
  onFinish: (withFirstCustomer: boolean) => void;
};

export function FirstDataStep({
  customersCount,
  customersError,
  pending,
  onBack,
  onFinish,
}: FirstDataStepProps) {
  const hasCustomers = customersCount !== null && customersCount > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate">
        Cargá tus primeros clientes para empezar el historial. Podés importar una planilla o cargar
        uno a uno.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings/import"
          className="flex flex-col gap-2 rounded-xl border border-mist bg-white p-4 hover:border-teal/40 hover:bg-teal/5"
        >
          <FileUp className="h-5 w-5 text-teal" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">Importar desde CSV o Excel</span>
          <span className="text-xs text-slate">Revisamos cada fila antes de crear clientes.</span>
        </Link>
        <Link
          href="/customers"
          className="flex flex-col gap-2 rounded-xl border border-mist bg-white p-4 hover:border-teal/40 hover:bg-teal/5"
        >
          <UserPlus className="h-5 w-5 text-teal" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">Cargar un cliente</span>
          <span className="text-xs text-slate">Alta manual desde la cartera de clientes.</span>
        </Link>
      </div>

      <div role="status" className="rounded-xl bg-paper px-4 py-3 text-sm text-slate">
        {customersError
          ? "No pudimos revisar tus clientes. Podés finalizar igual y cargarlos después."
          : customersCount === null
            ? "Revisando tus clientes..."
            : hasCustomers
              ? `Ya tenés ${customersCount} ${customersCount === 1 ? "cliente cargado" : "clientes cargados"}.`
              : "Todavía no hay clientes cargados. Podés finalizar ahora y cargarlos después."}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-mist pt-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" disabled={pending} onClick={onBack}>
          Volver
        </Button>
        {hasCustomers ? (
          <Button type="button" disabled={pending} onClick={() => onFinish(true)}>
            {pending ? "Finalizando..." : "Finalizar configuración"}
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/customers"
              className={cn(buttonVariants({ variant: "ghost" }), "w-full sm:w-auto")}
            >
              Ir a clientes
            </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || (customersCount === null && !customersError)}
              onClick={() => onFinish(false)}
            >
              {pending ? "Finalizando..." : "Finalizar sin clientes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
