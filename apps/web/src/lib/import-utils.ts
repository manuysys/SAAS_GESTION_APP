import { z } from "zod";

import { ApiError } from "@/lib/api";
import type { CustomerImportCommitResult, ImportPreviewRow, ImportSummary } from "@/lib/import-api";

export const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const;
export const IMPORT_ACCEPT_ATTRIBUTE =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Columnas que reconoce el importador. Solo `name` es obligatoria. */
export const IMPORT_COLUMNS = [
  "name",
  "email",
  "phone",
  "address",
  "city",
  "province",
  "postal_code",
  "notes",
] as const;

/**
 * Chequeo previo en el navegador para dar feedback inmediato. El backend es la
 * fuente de verdad: también valida tipo, tamaño y cantidad de filas.
 */
export function validateImportFile(file: Pick<File, "name" | "size">): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAcceptedExtension = IMPORT_ACCEPTED_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );
  if (!hasAcceptedExtension) {
    return "Subí un archivo .csv o .xlsx.";
  }
  if (file.size === 0) {
    return "El archivo está vacío.";
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return "El archivo supera 2 MB. Dividilo en archivos más chicos.";
  }
  return null;
}

export const importFileSchema = z.object({
  file: z
    .custom<File | null>((value) => value instanceof File, {
      error: "Elegí un archivo .csv o .xlsx.",
    })
    .superRefine((value, ctx) => {
      if (!(value instanceof File)) {
        return;
      }
      const message = validateImportFile(value);
      if (message) {
        ctx.addIssue({ code: "custom", message });
      }
    }),
});

export type ImportFileValues = z.infer<typeof importFileSchema>;

export type ImportRowStatus = "valid" | "duplicate" | "invalid";

/**
 * Prioridad: duplicada > con errores > válida. El backend puede marcar una fila como
 * duplicada y además adjuntar errores (p. ej. "Email ya existe en la empresa"); en ese
 * caso el motivo que importa al usuario es que ya existe, no que tenga un error de formato.
 */
export function importRowStatus(
  row: Pick<ImportPreviewRow, "errors" | "duplicate">,
): ImportRowStatus {
  if (row.duplicate) {
    return "duplicate";
  }
  return row.errors.length > 0 ? "invalid" : "valid";
}

export const IMPORT_ROW_STATUS_LABELS: Record<ImportRowStatus, string> = {
  valid: "Válida",
  duplicate: "Duplicada",
  invalid: "Con errores",
};

export const IMPORT_ROW_STATUS_VARIANTS: Record<ImportRowStatus, "success" | "warning" | "danger"> =
  {
    valid: "success",
    duplicate: "warning",
    invalid: "danger",
  };

export function importRowName(row: Pick<ImportPreviewRow, "data">): string {
  const name = row.data.name?.trim();
  return name ? name : "Sin nombre";
}

/** El botón de aplicar solo se habilita con filas válidas y sin una aplicación previa. */
export function canCommitImport(
  summary: ImportSummary,
  options: { committing: boolean; applied: boolean },
): boolean {
  return summary.valid > 0 && !options.committing && !options.applied;
}

/** Hay filas omitidas (con error o duplicadas) cuyo detalle se puede descargar. */
export function hasSkippedRows(summary: ImportSummary): boolean {
  return summary.invalid + summary.duplicates > 0;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function commitButtonLabel(validCount: number): string {
  return `Importar ${plural(validCount, "cliente", "clientes")}`;
}

/** Texto que solo se muestra después de la respuesta del backend. */
export function formatCommitResult(result: CustomerImportCommitResult): string {
  const created = `Se crearon ${plural(result.created, "cliente", "clientes")}.`;
  const skipped: string[] = [];
  if (result.skipped_duplicates > 0) {
    skipped.push(plural(result.skipped_duplicates, "duplicado", "duplicados"));
  }
  if (result.skipped_invalid > 0) {
    skipped.push(plural(result.skipped_invalid, "fila con errores", "filas con errores"));
  }
  return skipped.length > 0 ? `${created} Se omitieron ${skipped.join(" y ")}.` : created;
}

export type ImportRequestStep = "preview" | "commit" | "errors";

const NETWORK_MESSAGE =
  "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.";
const SESSION_MESSAGE = "Tu sesión venció. Volvé a ingresar.";
/** Motivo genérico solo si el backend no informó `detail`: el 413 puede ser por tamaño o por filas. */
const TOO_LARGE_MESSAGE = `El archivo es demasiado grande: el máximo es 2 MB y ${IMPORT_MAX_ROWS} filas.`;

/**
 * Mensaje para el usuario según el paso. Requiere que el cliente HTTP deje `detail`
 * vacío cuando el backend no informó un motivo (ver `import-api.ts`); así no se confunde
 * el texto de fallback con un mensaje de negocio.
 *
 * - 413: el backend distingue tamaño (2 MB) y filas (500); se muestra su `detail`.
 * - 404 en análisis: el endpoint todavía no está disponible; no se afirma importación.
 */
export function importErrorMessage(error: unknown, step: ImportRequestStep): string {
  if (error instanceof TypeError) {
    return NETWORK_MESSAGE;
  }
  if (!(error instanceof ApiError)) {
    return fallbackFor(step);
  }
  const detail = error.detail.trim();
  if (error.status === 401) {
    return detail || SESSION_MESSAGE;
  }
  if (error.status === 404) {
    return step === "preview"
      ? "La importación todavía no está disponible en este entorno. No se creó ningún cliente."
      : "No encontramos esta importación. Volvé a analizar el archivo.";
  }
  if (error.status === 413) {
    return detail || TOO_LARGE_MESSAGE;
  }
  if (error.status >= 400 && error.status < 500 && detail !== "") {
    return detail;
  }
  return fallbackFor(step);
}

function fallbackFor(step: ImportRequestStep): string {
  switch (step) {
    case "preview":
      return "No se pudo analizar el archivo. Probá de nuevo.";
    case "commit":
      return "No se pudo aplicar la importación. No se confirmó la creación de clientes; podés reintentar sin duplicar datos.";
    case "errors":
      return "No se pudo descargar el detalle de errores. Probá de nuevo.";
  }
}
