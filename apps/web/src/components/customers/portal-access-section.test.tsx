import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PortalAccessSection } from "@/components/customers/portal-access-section";
import { api, type Customer, type PortalAccess } from "@/lib/api";

const authState = vi.hoisted(() => ({
  activeTenantId: "tenant-1" as string | null,
  role: "owner",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    activeTenantId: authState.activeTenantId,
    tenants: [
      { id: "tenant-1", name: "Servicios Demo", slug: "servicios-demo", role: authState.role },
    ],
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      portalAccess: {
        create: vi.fn(),
        revoke: vi.fn(),
      },
    },
  };
});

const customer: Customer = {
  id: "customer-1",
  tenant_id: "tenant-1",
  name: "Carlos Gomez",
  phone: null,
  email: "carlos@example.com",
  notes: null,
  status: "active",
  created_at: "2026-11-01T12:00:00Z",
  updated_at: "2026-11-01T12:00:00Z",
};

function renderSection(target: Customer = customer) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PortalAccessSection customer={target} />
    </QueryClientProvider>,
  );
}

function access(overrides: Partial<PortalAccess> = {}): PortalAccess {
  return {
    access_url: "https://saas-gestion-web.vercel.app/portal/servicios-demo?token=raw-token-123",
    expires_at: "2026-11-11T12:00:00Z",
    email_status: "sent",
    ...overrides,
  };
}

describe("PortalAccessSection", () => {
  beforeEach(() => {
    vi.mocked(api.portalAccess.create).mockReset();
    authState.role = "owner";
    authState.activeTenantId = "tenant-1";
  });

  it("shows a no-permission notice to roles that cannot manage portal access", () => {
    authState.role = "technician";
    renderSection();

    expect(screen.getByText(/Solo owner, administradores y coordinadores/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar enlace" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar acceso por email" }),
    ).not.toBeInTheDocument();
  });

  it("generates a link without email and shows it once in a read-only field", async () => {
    vi.mocked(api.portalAccess.create).mockResolvedValue(access());
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    const field = await screen.findByDisplayValue(
      "https://saas-gestion-web.vercel.app/portal/servicios-demo?token=raw-token-123",
    );
    expect(field).toHaveAttribute("readonly");
    expect(api.portalAccess.create).toHaveBeenCalledWith("tenant-1", "customer-1", false);
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("is honest when the provider accepted the email but console mode sent nothing", async () => {
    vi.mocked(api.portalAccess.create).mockResolvedValue(access({ email_status: "console" }));
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Enviar acceso por email" }));

    expect(await screen.findByText(/no salió ningún correo/)).toBeInTheDocument();
    expect(api.portalAccess.create).toHaveBeenCalledWith("tenant-1", "customer-1", true);
  });

  it("reports the provider acceptance without claiming delivery", async () => {
    vi.mocked(api.portalAccess.create).mockResolvedValue(access({ email_status: "sent" }));
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Enviar acceso por email" }));

    expect(await screen.findByText(/El proveedor aceptó el email/)).toBeInTheDocument();
    expect(screen.queryByText(/entregado/i)).not.toBeInTheDocument();
  });

  it("refuses to display a link that is not http(s)", async () => {
    vi.mocked(api.portalAccess.create).mockResolvedValue(
      access({ access_url: "javascript:alert(1)" }),
    );
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("no es válido");
    expect(screen.queryByDisplayValue("javascript:alert(1)")).not.toBeInTheDocument();
  });

  it("disables email sending when the customer has no email", async () => {
    renderSection({ ...customer, email: null });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enviar acceso por email" })).toBeDisabled(),
    );
    expect(screen.getByRole("button", { name: "Copiar enlace" })).toBeEnabled();
  });
});
