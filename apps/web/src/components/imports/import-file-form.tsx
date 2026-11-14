"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileSpreadsheet } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  IMPORT_ACCEPT_ATTRIBUTE,
  IMPORT_COLUMNS,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  importFileSchema,
  type ImportFileValues,
} from "@/lib/import-utils";

type ImportFileFormProps = {
  pending: boolean;
  serverError: string | null;
  onAnalyze: (file: File) => void;
};

export function ImportFileForm({ pending, serverError, onAnalyze }: ImportFileFormProps) {
  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImportFileValues>({
    resolver: zodResolver(importFileSchema),
    defaultValues: { file: null },
  });

  function onSubmit(values: ImportFileValues) {
    if (values.file) {
      onAnalyze(values.file);
    }
  }

  const fileError = errors.file?.message ?? null;
  const maxMb = IMPORT_MAX_FILE_BYTES / (1024 * 1024);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="import-file" className="mb-1 block text-sm font-medium text-ink">
          Archivo CSV o XLSX
        </label>
        <input
          id="import-file"
          type="file"
          accept={IMPORT_ACCEPT_ATTRIBUTE}
          disabled={pending}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? "import-file-help import-file-error" : "import-file-help"}
          onChange={(event) =>
            setValue("file", event.target.files?.[0] ?? null, { shouldValidate: true })
          }
          className="block w-full min-w-0 rounded-xl border border-mist bg-white text-sm text-ink file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-mist/60 file:px-4 file:text-sm file:font-semibold file:text-ink hover:file:bg-mist focus-visible:ring-2 focus-visible:ring-teal focus-visible:outline-none disabled:opacity-60"
        />
        <p id="import-file-help" className="mt-2 text-xs text-slate">
          Hasta {IMPORT_MAX_ROWS} filas y {maxMb} MB. Solo es obligatoria la columna{" "}
          <code className="font-mono text-ink">name</code>.
        </p>
        {fileError && (
          <p id="import-file-error" role="alert" className="mt-1 text-xs text-red-600">
            {fileError}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-paper px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate uppercase">
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
          Columnas reconocidas
        </p>
        <p className="mt-2 font-mono text-xs leading-relaxed break-words text-ink">
          {IMPORT_COLUMNS.join(", ")}
        </p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Analizando archivo..." : "Analizar archivo"}
        </Button>
      </div>
    </form>
  );
}
