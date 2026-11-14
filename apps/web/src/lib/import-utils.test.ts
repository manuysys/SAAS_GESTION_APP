import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import type { ImportSummary } from "@/lib/import-api";
import {
  IMPORT_MAX_FILE_BYTES,
  canCommitImport,
  commitButtonLabel,
  formatCommitResult,
  hasSkippedRows,
  importErrorMessage,
  importFileSchema,
  importRowName,
  importRowStatus,
  validateImportFile,
} from "@/lib/import-utils";

const SUMMARY: ImportSummary = { total: 10, valid: 8, invalid: 1, duplicates: 1 };

describe("validateImportFile", () => {
  it("accepts csv and xlsx regardless of case", () => {
    expect(validateImportFile({ name: "clientes.csv", size: 1200 })).toBeNull();
    expect(validateImportFile({ name: "CLIENTES.XLSX", size: 1200 })).toBeNull();
  });

  it("rejects other extensions", () => {
    expect(validateImportFile({ name: "clientes.pdf", size: 1200 })).toBe(
      "Subí un archivo .csv o .xlsx.",
    );
    expect(validateImportFile({ name: "clientes", size: 1200 })).toBe(
      "Subí un archivo .csv o .xlsx.",
    );
  });

  it("rejects empty files", () => {
    expect(validateImportFile({ name: "vacio.csv", size: 0 })).toBe("El archivo está vacío.");
  });

  it("allows exactly 2 MB and rejects one byte more", () => {
    expect(validateImportFile({ name: "ok.csv", size: IMPORT_MAX_FILE_BYTES })).toBeNull();
    expect(validateImportFile({ name: "grande.csv", size: IMPORT_MAX_FILE_BYTES + 1 })).toMatch(
      /supera 2 MB/,
    );
  });
});

describe("importFileSchema", () => {
  it("rejects a missing file without throwing", () => {
    expect(importFileSchema.safeParse({ file: null }).success).toBe(false);
  });

  it("accepts a valid csv file", () => {
    const file = new File(["name\nAna"], "clientes.csv", { type: "text/csv" });
    expect(importFileSchema.safeParse({ file }).success).toBe(true);
  });

  it("rejects an unsupported file with the shared message", () => {
    const file = new File(["x"], "clientes.txt", { type: "text/plain" });
    const result = importFileSchema.safeParse({ file });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Subí un archivo .csv o .xlsx.");
    }
  });
});

describe("importRowStatus", () => {
  it("prioritizes duplicate over errors for the real backend payload", () => {
    // El backend marca duplicado y además adjunta el motivo como error.
    const row = {
      line: 4,
      data: { name: "Carlos Gomez", email: "carlos@example.com" },
      errors: ["Email ya existe en la empresa"],
      duplicate: true,
    };
    expect(importRowStatus(row)).toBe("duplicate");
  });

  it("marks rows with errors as invalid when they are not duplicates", () => {
    expect(importRowStatus({ errors: ["Email inválido"], duplicate: false })).toBe("invalid");
  });

  it("marks duplicates without errors and valid rows", () => {
    expect(importRowStatus({ errors: [], duplicate: true })).toBe("duplicate");
    expect(importRowStatus({ errors: [], duplicate: false })).toBe("valid");
  });
});

describe("importRowName", () => {
  it("falls back when the name is blank or missing", () => {
    expect(importRowName({ data: { name: "  Ana  " } })).toBe("Ana");
    expect(importRowName({ data: { name: "   " } })).toBe("Sin nombre");
    expect(importRowName({ data: {} })).toBe("Sin nombre");
  });
});

describe("canCommitImport", () => {
  it("enables commit only with valid rows, not committing and not applied", () => {
    expect(canCommitImport(SUMMARY, { committing: false, applied: false })).toBe(true);
    expect(canCommitImport(SUMMARY, { committing: true, applied: false })).toBe(false);
    expect(canCommitImport(SUMMARY, { committing: false, applied: true })).toBe(false);
    expect(canCommitImport({ ...SUMMARY, valid: 0 }, { committing: false, applied: false })).toBe(
      false,
    );
  });

  it("labels the button with the valid count", () => {
    expect(commitButtonLabel(1)).toBe("Importar 1 cliente");
    expect(commitButtonLabel(8)).toBe("Importar 8 clientes");
  });
});

describe("hasSkippedRows", () => {
  it("is true when there are invalid or duplicate rows", () => {
    expect(hasSkippedRows(SUMMARY)).toBe(true);
    expect(hasSkippedRows({ total: 2, valid: 2, invalid: 0, duplicates: 0 })).toBe(false);
  });
});

describe("formatCommitResult", () => {
  it("describes what was created and skipped using the backend response", () => {
    expect(formatCommitResult({ created: 8, skipped_duplicates: 1, skipped_invalid: 1 })).toBe(
      "Se crearon 8 clientes. Se omitieron 1 duplicado y 1 fila con errores.",
    );
  });

  it("omits the skipped sentence when nothing was skipped", () => {
    expect(formatCommitResult({ created: 1, skipped_duplicates: 0, skipped_invalid: 0 })).toBe(
      "Se crearon 1 cliente.",
    );
  });
});

describe("importErrorMessage", () => {
  it("explains that the preview endpoint is not available on 404", () => {
    expect(importErrorMessage(new ApiError(404, ""), "preview")).toBe(
      "La importación todavía no está disponible en este entorno. No se creó ningún cliente.",
    );
  });

  it("does not claim the import exists when commit returns 404", () => {
    expect(importErrorMessage(new ApiError(404, ""), "commit")).toBe(
      "No encontramos esta importación. Volvé a analizar el archivo.",
    );
  });

  it("uses the backend detail for business errors", () => {
    expect(
      importErrorMessage(new ApiError(422, "Falta la columna obligatoria 'name'"), "preview"),
    ).toBe("Falta la columna obligatoria 'name'");
  });

  it("uses the step fallback for 422 without detail", () => {
    expect(importErrorMessage(new ApiError(422, ""), "preview")).toBe(
      "No se pudo analizar el archivo. Probá de nuevo.",
    );
  });

  it("uses the fallback for server errors and hides internal details", () => {
    expect(importErrorMessage(new ApiError(500, "stacktrace interno"), "preview")).toBe(
      "No se pudo analizar el archivo. Probá de nuevo.",
    );
  });

  it("reports network failures without claiming success", () => {
    expect(importErrorMessage(new TypeError("Failed to fetch"), "commit")).toMatch(
      /No pudimos conectar/,
    );
  });

  it("states that the commit was not confirmed when it fails unexpectedly", () => {
    expect(importErrorMessage(new Error("boom"), "commit")).toMatch(/No se confirmó/);
  });

  it("shows the backend detail for a 413 about file size", () => {
    expect(
      importErrorMessage(new ApiError(413, "El archivo excede el límite de 2 MB"), "preview"),
    ).toBe("El archivo excede el límite de 2 MB");
  });

  it("shows the backend detail for a 413 about row count, not the size message", () => {
    const message = importErrorMessage(new ApiError(413, "Máximo 500 filas permitidas"), "preview");
    expect(message).toBe("Máximo 500 filas permitidas");
    expect(message).not.toMatch(/2 MB/);
  });

  it("names both limits when a 413 arrives without detail", () => {
    const message = importErrorMessage(new ApiError(413, ""), "preview");
    expect(message).toMatch(/2 MB/);
    expect(message).toMatch(/500 filas/);
  });

  it("asks to sign in again on 401 without detail", () => {
    expect(importErrorMessage(new ApiError(401, ""), "preview")).toBe(
      "Tu sesión venció. Volvé a ingresar.",
    );
  });
});
