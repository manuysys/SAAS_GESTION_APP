import { readBlobOrThrow, readJsonOrThrow, sessionFetch } from "@/lib/api-session";

/** Valores tal como los devuelve el backend. Una columna ausente en el archivo no aparece. */
export type ImportRowData = Record<string, string | null | undefined>;

export type ImportPreviewRow = {
  line: number;
  data: ImportRowData;
  errors: string[];
  duplicate: boolean;
};

export type ImportSummary = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
};

/** Resultado de `POST /api/v1/imports/customers/preview`. Nada se persiste como cliente todavía. */
export type CustomerImportPreview = {
  job_id: string;
  headers: string[];
  rows: ImportPreviewRow[];
  summary: ImportSummary;
};

/** Resultado de `POST /api/v1/imports/customers/commit`. Idempotente por `job_id`. */
export type CustomerImportCommitResult = {
  created: number;
  skipped_duplicates: number;
  skipped_invalid: number;
};

/*
 * Fallback vacío: si el backend no envía `detail`, el ApiError queda con "" y
 * `importErrorMessage` elige el mensaje del paso. Así no se confunde un texto genérico
 * con un motivo real del servidor (p. ej. el 413 de tamaño o de filas).
 */
const NO_DETAIL = "";

/** Analiza el archivo sin crear clientes. Requiere owner, admin o dispatcher. */
export async function previewCustomerImport(
  tenantId: string,
  file: File,
): Promise<CustomerImportPreview> {
  const body = new FormData();
  body.append("file", file);
  const response = await sessionFetch("/api/v1/imports/customers/preview", {
    method: "POST",
    tenantId,
    body,
  });
  return readJsonOrThrow<CustomerImportPreview>(response, NO_DETAIL);
}

/** Aplica solo las filas válidas y no duplicadas del job analizado. */
export async function commitCustomerImport(
  tenantId: string,
  jobId: string,
): Promise<CustomerImportCommitResult> {
  const response = await sessionFetch("/api/v1/imports/customers/commit", {
    method: "POST",
    tenantId,
    json: { job_id: jobId },
  });
  return readJsonOrThrow<CustomerImportCommitResult>(response, NO_DETAIL);
}

/** Descarga el CSV con línea, datos y motivo de cada fila omitida. */
export async function downloadCustomerImportErrors(tenantId: string, jobId: string): Promise<Blob> {
  const response = await sessionFetch(`/api/v1/imports/${encodeURIComponent(jobId)}/errors.csv`, {
    method: "GET",
    tenantId,
  });
  return readBlobOrThrow(response, NO_DETAIL);
}
