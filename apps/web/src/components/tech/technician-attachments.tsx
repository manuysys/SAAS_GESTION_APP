"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { api, errorMessage } from "@/lib/api";
import { formatFileSize, validateAttachmentFile } from "@/lib/technician";
import { downloadBlob, formatDate } from "@/lib/utils";

type Props = {
  tenantId: string;
  orderId: string;
};

export function TechnicianAttachments({ tenantId, orderId }: Props) {
  const queryClient = useQueryClient();
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const attachmentsKey = ["tech-attachments", tenantId, orderId];

  const attachmentsQuery = useQuery({
    queryKey: attachmentsKey,
    queryFn: () => api.technicianWorkOrders.attachments.list(tenantId, orderId),
    enabled: Boolean(tenantId && orderId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      api.technicianWorkOrders.attachments.upload(tenantId, orderId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentsKey });
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAttachmentFile(file);
    setFileError(validationError);
    setDownloadError(null);
    uploadMutation.reset();
    if (validationError) return;
    uploadMutation.mutate(file);
  }

  async function handleDownload(attachmentId: string, filename: string) {
    setDownloadError(null);
    setDownloadingId(attachmentId);
    try {
      const blob = await api.technicianWorkOrders.attachments.download(
        tenantId,
        orderId,
        attachmentId,
      );
      downloadBlob(blob, filename);
    } catch (error) {
      setDownloadError(errorMessage(error, "No se pudo descargar la foto"));
    } finally {
      setDownloadingId(null);
    }
  }

  const attachments = attachmentsQuery.data ?? [];
  const uploadError = uploadMutation.isError
    ? errorMessage(uploadMutation.error, "No se pudo subir la foto")
    : null;
  const message = fileError ?? uploadError;

  return (
    <section
      aria-labelledby="tech-photos-title"
      className="rounded-2xl border border-zinc-200 bg-white p-4"
    >
      <h2 id="tech-photos-title" className="text-base font-semibold">
        Fotos del trabajo
      </h2>

      <div className="mt-3">
        <label htmlFor="tech-photo" className="mb-2 block text-sm font-medium text-zinc-800">
          Subir foto (JPG, PNG o WebP, máximo 5 MB)
        </label>
        <input
          id="tech-photo"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={uploadMutation.isPending}
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:min-h-12 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-700 disabled:opacity-60"
        />
        {uploadMutation.isPending && (
          <p role="status" className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Subiendo foto...
          </p>
        )}
        {message && (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        )}
        {uploadMutation.isSuccess && !message && (
          <p
            role="status"
            className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            Foto subida.
          </p>
        )}
      </div>

      <div className="mt-5">
        {attachmentsQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Cargando fotos...</p>
        ) : attachmentsQuery.isError ? (
          <p role="alert" className="text-sm text-red-700">
            No se pudieron cargar las fotos.
          </p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay fotos de este trabajo.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {attachments.map((attachment) => {
              const busy = downloadingId === attachment.id;
              return (
                <li key={attachment.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatFileSize(attachment.size_bytes)} · {formatDate(attachment.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Descargar ${attachment.filename}`}
                    onClick={() => void handleDownload(attachment.id, attachment.filename)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )}
                    Descargar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {downloadError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {downloadError}
          </p>
        )}
      </div>
    </section>
  );
}
