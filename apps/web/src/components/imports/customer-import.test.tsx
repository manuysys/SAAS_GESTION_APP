import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerImport } from "@/components/imports/customer-import";
import { ApiError } from "@/lib/api";
import {
  commitCustomerImport,
  downloadCustomerImportErrors,
  previewCustomerImport,
  type CustomerImportCommitResult,
  type CustomerImportPreview,
} from "@/lib/import-api";
import { downloadBlob } from "@/lib/utils";

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

vi.mock("@/lib/import-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/import-api")>();
  return {
    ...actual,
    previewCustomerImport: vi.fn(),
    commitCustomerImport: vi.fn(),
    downloadCustomerImportErrors: vi.fn(),
  };
});

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, downloadBlob: vi.fn() };
});

const preview: CustomerImportPreview = {
  job_id: "job-1",
  headers: ["name", "email"],
  rows: [
    {
      line: 2,
      data: { name: "Carlos Gomez", email: "carlos@example.com" },
      errors: [],
      duplicate: false,
    },
    {
      line: 3,
      data: { name: "Ana", email: "no-es-email" },
      errors: ["Email inválido"],
      duplicate: false,
    },
  ],
  summary: { total: 2, valid: 1, invalid: 1, duplicates: 0 },
};

const duplicatePreview: CustomerImportPreview = {
  job_id: "job-2",
  headers: ["name", "email"],
  rows: [
    {
      line: 4,
      data: { name: "Laura Diaz", email: "laura@example.com" },
      errors: ["Email ya existe en la empresa"],
      duplicate: true,
    },
    {
      line: 5,
      data: { name: "Mario Ruiz", email: "mario@example.com" },
      errors: [],
      duplicate: false,
    },
  ],
  summary: { total: 2, valid: 1, invalid: 0, duplicates: 1 },
};

const committed: CustomerImportCommitResult = {
  created: 1,
  skipped_duplicates: 0,
  skipped_invalid: 1,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function tree(client: QueryClient): ReactElement {
  return (
    <QueryClientProvider client={client}>
      <CustomerImport />
    </QueryClientProvider>
  );
}

function renderImport() {
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

function chooseFile(name = "clientes.csv") {
  const input = document.getElementById("import-file") as HTMLInputElement;
  const file = new File(["name,email\nCarlos Gomez,carlos@example.com"], name, {
    type: "text/csv",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

function analyzeFile(name?: string) {
  chooseFile(name);
  fireEvent.click(screen.getByRole("button", { name: "Analizar archivo" }));
}

function fileInput() {
  return document.getElementById("import-file") as HTMLInputElement;
}

describe("CustomerImport", () => {
  beforeEach(() => {
    authState.activeTenantId = "tenant-1";
    authState.role = "owner";
    vi.mocked(previewCustomerImport).mockReset();
    vi.mocked(commitCustomerImport).mockReset();
    vi.mocked(downloadCustomerImportErrors).mockReset();
    vi.mocked(downloadBlob).mockReset();
  });

  it("shows the preview summary without claiming an import", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    renderImport();

    analyzeFile();

    expect(await screen.findByRole("button", { name: "Importar 1 cliente" })).toBeEnabled();
    expect(
      screen.getByText(
        "Todavía no se creó ningún cliente. Confirmá para aplicar las filas válidas.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Email inválido")).toBeInTheDocument();
    expect(screen.queryByText("Importación aplicada")).not.toBeInTheDocument();
  });

  it("shows a real duplicate row as Duplicada even though the backend also sends an error", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(duplicatePreview);
    renderImport();

    analyzeFile();

    const row = (await screen.findByText("Laura Diaz")).closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Duplicada")).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText("Con errores")).not.toBeInTheDocument();
  });

  it("confirms the import only after the backend responds and locks analysis and reset meanwhile", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    const pendingCommit = deferred<CustomerImportCommitResult>();
    vi.mocked(commitCustomerImport).mockReturnValueOnce(pendingCommit.promise);
    renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Importar 1 cliente" }));

    const committingButton = await screen.findByRole("button", { name: "Importando..." });
    expect(committingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Analizar otro archivo" })).toBeDisabled();
    expect(fileInput()).toBeDisabled();
    expect(screen.queryByText("Importación aplicada")).not.toBeInTheDocument();

    await act(async () => {
      pendingCommit.resolve(committed);
    });

    expect(await screen.findByText("Importación aplicada")).toBeInTheDocument();
    expect(
      screen.getByText("Se crearon 1 cliente. Se omitieron 1 fila con errores."),
    ).toBeInTheDocument();
    expect(commitCustomerImport).toHaveBeenCalledWith("tenant-1", "job-1");
    expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
  });

  it("keeps the preview and allows a retry when commit fails", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    vi.mocked(commitCustomerImport).mockRejectedValueOnce(new ApiError(500, ""));
    renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Importar 1 cliente" }));

    expect(
      await screen.findByText(
        "No se pudo aplicar la importación. No se confirmó la creación de clientes; podés reintentar sin duplicar datos.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Importación aplicada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 1 cliente" })).toBeEnabled();
  });

  it("explains a missing backend endpoint without breaking the page", async () => {
    vi.mocked(previewCustomerImport).mockRejectedValueOnce(new ApiError(404, ""));
    renderImport();

    analyzeFile();

    expect(
      await screen.findByText(
        "La importación todavía no está disponible en este entorno. No se creó ningún cliente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
  });

  it("blocks unsupported files before calling the API", async () => {
    renderImport();

    chooseFile("clientes.pdf");

    expect(await screen.findByText("Subí un archivo .csv o .xlsx.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Analizar archivo" }));
    expect(previewCustomerImport).not.toHaveBeenCalled();
  });

  it("does not render the import for roles without permission", () => {
    authState.role = "technician";
    renderImport();

    expect(screen.getByText("No tenés permisos para importar clientes")).toBeInTheDocument();
    expect(fileInput()).toBeNull();
  });

  it("keeps the commit button disabled when no row is valid", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce({
      ...preview,
      summary: { total: 2, valid: 0, invalid: 2, duplicates: 0 },
    });
    renderImport();

    analyzeFile();

    expect(await screen.findByText(/No hay filas válidas para importar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 0 clientes" })).toBeDisabled();
  });

  it("resets the analysis when the user chooses another file", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Analizar otro archivo" }));

    expect(screen.queryByText("Carlos Gomez")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
  });

  it("downloads the error CSV for the current job", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    const blob = new Blob(["linea,error\n3,Email inválido"], { type: "text/csv" });
    vi.mocked(downloadCustomerImportErrors).mockResolvedValueOnce(blob);
    renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Descargar errores (CSV)" }));

    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(blob, "errores-importacion-job-1.csv"),
    );
    expect(downloadCustomerImportErrors).toHaveBeenCalledWith("tenant-1", "job-1");
  });

  it("shows an error when the error CSV cannot be downloaded", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    vi.mocked(downloadCustomerImportErrors).mockRejectedValueOnce(new ApiError(404, ""));
    renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Descargar errores (CSV)" }));

    expect(
      await screen.findByText("No encontramos esta importación. Volvé a analizar el archivo."),
    ).toBeInTheDocument();
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("ignores a late preview from the previous tenant after switching company", async () => {
    const pendingPreview = deferred<CustomerImportPreview>();
    vi.mocked(previewCustomerImport).mockReturnValueOnce(pendingPreview.promise);
    const view = renderImport();

    analyzeFile();
    view.switchTenant("tenant-2");

    await act(async () => {
      pendingPreview.resolve(preview);
    });

    expect(screen.queryByText("Carlos Gomez")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Importar/ })).not.toBeInTheDocument();
    expect(fileInput()).toBeEnabled();
  });

  it("does not carry an applied import into another company", async () => {
    vi.mocked(previewCustomerImport).mockResolvedValueOnce(preview);
    vi.mocked(commitCustomerImport).mockResolvedValueOnce(committed);
    const view = renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Importar 1 cliente" }));
    expect(await screen.findByText("Importación aplicada")).toBeInTheDocument();

    view.switchTenant("tenant-2");

    expect(screen.queryByText("Importación aplicada")).not.toBeInTheDocument();
    expect(screen.queryByText("Carlos Gomez")).not.toBeInTheDocument();
    expect(fileInput()).toBeEnabled();
  });

  it("does not let a late commit from the previous company mark the new preview as applied", async () => {
    vi.mocked(previewCustomerImport)
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce(duplicatePreview);
    const pendingCommit = deferred<CustomerImportCommitResult>();
    vi.mocked(commitCustomerImport).mockReturnValueOnce(pendingCommit.promise);
    const view = renderImport();

    analyzeFile();
    fireEvent.click(await screen.findByRole("button", { name: "Importar 1 cliente" }));
    view.switchTenant("tenant-2");

    analyzeFile("otro.csv");
    expect(await screen.findByText("Mario Ruiz")).toBeInTheDocument();

    await act(async () => {
      pendingCommit.resolve(committed);
    });

    expect(screen.queryByText("Importación aplicada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importar 1 cliente" })).toBeEnabled();
  });
});
