import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ApiError, api } from "@/lib/api";
import {
  completeOnboarding,
  getOnboarding,
  patchOnboarding,
  type OnboardingStatus,
} from "@/lib/onboarding-api";

const authState = vi.hoisted(() => ({
  activeTenantId: "tenant-1" as string,
  role: "owner" as string,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    activeTenantId: authState.activeTenantId,
    tenants: [
      { id: "tenant-1", name: "Servicios Demo", slug: "servicios-demo", role: authState.role },
      { id: "tenant-2", name: "Otra Empresa", slug: "otra-empresa", role: authState.role },
    ],
  }),
}));

vi.mock("@/lib/onboarding-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/onboarding-api")>();
  return {
    ...actual,
    getOnboarding: vi.fn(),
    patchOnboarding: vi.fn(),
    completeOnboarding: vi.fn(),
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, customers: { list: vi.fn() } },
  };
});

/** Estado guardado por empresa. Cada test lo ajusta antes de renderizar. */
let statuses: Record<string, OnboardingStatus> = {};

function status(step: number, options: { completed?: boolean; company?: boolean } = {}) {
  return {
    completed: options.completed ?? false,
    state: {
      step,
      company:
        options.company === false
          ? null
          : {
              name: "Servicios Demo",
              timezone: "America/Argentina/Buenos_Aires",
              currency: "ARS",
            },
      services: [],
      schedule: {},
      team_invited: false,
      first_customer: false,
    },
  } satisfies OnboardingStatus;
}

function tree(client: QueryClient): ReactElement {
  return (
    <QueryClientProvider client={client}>
      <OnboardingWizard />
    </QueryClientProvider>
  );
}

function renderWizard() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const view = render(tree(client));
  return {
    ...view,
    switchTenant(tenantId: string) {
      authState.activeTenantId = tenantId;
      view.rerender(tree(client));
    },
  };
}

/**
 * El botón de finalizar sin clientes queda deshabilitado mientras se consulta la cantidad de
 * clientes. Esperar a que se habilite evita clickear un botón inerte.
 */
async function clickWhenEnabled(button: HTMLElement) {
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}

function customersTotal(total: number) {
  vi.mocked(api.customers.list).mockResolvedValue({ items: [], total, limit: 50, offset: 0 });
}

describe("OnboardingWizard", () => {
  beforeEach(() => {
    authState.activeTenantId = "tenant-1";
    authState.role = "owner";
    statuses = {};
    vi.mocked(getOnboarding).mockReset();
    vi.mocked(patchOnboarding).mockReset();
    vi.mocked(completeOnboarding).mockReset();
    vi.mocked(api.customers.list).mockReset();
    vi.mocked(getOnboarding).mockImplementation(async (tenantId) => {
      const saved = statuses[tenantId];
      if (!saved) throw new Error(`Sin estado de prueba para ${tenantId}`);
      return saved;
    });
    customersTotal(0);
  });

  it("resumes at the saved step", async () => {
    statuses["tenant-1"] = status(3);
    renderWizard();

    expect(await screen.findByText("Paso 3 de 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipo" })).toBeInTheDocument();
  });

  it("saves the company step with PATCH and advances to services", async () => {
    statuses["tenant-1"] = status(1, { company: false });
    vi.mocked(patchOnboarding).mockResolvedValue(status(2));
    renderWizard();

    fireEvent.click(await screen.findByRole("button", { name: "Guardar y continuar" }));

    await waitFor(() =>
      expect(patchOnboarding).toHaveBeenCalledWith("tenant-1", {
        company: {
          name: "Servicios Demo",
          timezone: "America/Argentina/Buenos_Aires",
          currency: "ARS",
        },
        step: 2,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Servicios que ofrecés" }),
    ).toBeInTheDocument();
  });

  it("saves the last step before completing and completes only after the PATCH", async () => {
    statuses["tenant-1"] = status(4);
    customersTotal(1);
    vi.mocked(patchOnboarding).mockResolvedValue(status(4));
    vi.mocked(completeOnboarding).mockResolvedValue({ completed: true });
    renderWizard();

    fireEvent.click(await screen.findByRole("button", { name: "Finalizar configuración" }));

    expect(await screen.findByText("La configuración inicial está completa")).toBeInTheDocument();
    expect(patchOnboarding).toHaveBeenCalledWith("tenant-1", {
      first_customer: true,
      step: 4,
    });
    expect(completeOnboarding).toHaveBeenCalledWith("tenant-1");
    const patchOrder = vi.mocked(patchOnboarding).mock.invocationCallOrder[0] ?? Infinity;
    const completeOrder = vi.mocked(completeOnboarding).mock.invocationCallOrder[0] ?? -Infinity;
    expect(patchOrder).toBeLessThan(completeOrder);
  });

  it("does not complete when saving the last step fails", async () => {
    statuses["tenant-1"] = status(4);
    vi.mocked(patchOnboarding).mockRejectedValue(new ApiError(500, ""));
    renderWizard();

    await clickWhenEnabled(await screen.findByRole("button", { name: "Finalizar sin clientes" }));

    expect(
      await screen.findByText("No se pudo guardar el paso. Revisá los datos y probá de nuevo."),
    ).toBeInTheDocument();
    expect(patchOnboarding).toHaveBeenCalledTimes(1);
    expect(completeOnboarding).not.toHaveBeenCalled();
    expect(screen.queryByText("La configuración inicial está completa")).not.toBeInTheDocument();
  });

  it("shows a retryable error when completing fails after saving", async () => {
    statuses["tenant-1"] = status(4);
    vi.mocked(patchOnboarding).mockResolvedValue(status(4));
    vi.mocked(completeOnboarding).mockRejectedValue(new ApiError(500, ""));
    renderWizard();

    await clickWhenEnabled(await screen.findByRole("button", { name: "Finalizar sin clientes" }));

    expect(
      await screen.findByText("No se pudo finalizar la configuración. Probá de nuevo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("La configuración inicial está completa")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalizar sin clientes" })).toBeEnabled();
  });

  it("does not show a completed company as completed after switching to another company", async () => {
    statuses["tenant-1"] = status(4);
    statuses["tenant-2"] = status(1, { company: false });
    vi.mocked(patchOnboarding).mockResolvedValue(status(4));
    vi.mocked(completeOnboarding).mockResolvedValue({ completed: true });
    const view = renderWizard();

    await clickWhenEnabled(await screen.findByRole("button", { name: "Finalizar sin clientes" }));
    expect(await screen.findByText("La configuración inicial está completa")).toBeInTheDocument();

    await act(async () => {
      view.switchTenant("tenant-2");
    });

    expect(await screen.findByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.queryByText("La configuración inicial está completa")).not.toBeInTheDocument();
    expect(getOnboarding).toHaveBeenCalledWith("tenant-2");
  });

  it("resets unsaved form values when the company changes", async () => {
    statuses["tenant-1"] = status(1);
    statuses["tenant-2"] = status(1, { company: false });
    const view = renderWizard();

    const nameInput = (await screen.findByLabelText(/Nombre de la empresa/)) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Empresa sin guardar" } });
    expect(nameInput.value).toBe("Empresa sin guardar");

    await act(async () => {
      view.switchTenant("tenant-2");
    });

    // El formulario de la empresa nueva parte de su propio estado, no del texto no guardado.
    const otherInput = (await screen.findByLabelText(/Nombre de la empresa/)) as HTMLInputElement;
    expect(otherInput.value).toBe("Otra Empresa");
  });

  it("links service field errors to their inputs for assistive technology", async () => {
    statuses["tenant-1"] = status(2);
    renderWizard();

    fireEvent.click(await screen.findByRole("button", { name: "Guardar y continuar" }));

    const nameInput = await screen.findByLabelText("Nombre *");
    await waitFor(() => expect(nameInput).toHaveAttribute("aria-invalid", "true"));
    const describedBy = nameInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toHaveTextContent(
      "Ingresá el nombre del servicio",
    );
    expect(patchOnboarding).not.toHaveBeenCalled();
  });

  it("does not PATCH or complete a company the user does not manage", async () => {
    authState.role = "dispatcher";
    renderWizard();

    expect(
      await screen.findByText("No tenés permisos para esta configuración"),
    ).toBeInTheDocument();
    expect(getOnboarding).not.toHaveBeenCalled();
    expect(patchOnboarding).not.toHaveBeenCalled();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });
});
