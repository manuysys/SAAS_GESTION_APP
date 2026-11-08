"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api, errorMessage } from "@/lib/api";

const noteSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(3, "Escribí una nota de al menos 3 caracteres")
    .max(2000, "La nota supera los 2000 caracteres"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

type Props = {
  tenantId: string;
  orderId: string;
};

export function TechnicianNoteForm({ tenantId, orderId }: Props) {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { notes: "" },
  });

  const noteMutation = useMutation({
    mutationFn: (notes: string) => api.technicianWorkOrders.note(tenantId, orderId, notes),
    onSuccess: () => {
      reset({ notes: "" });
      setSaved(true);
    },
  });

  const serverError = noteMutation.isError
    ? errorMessage(noteMutation.error, "No se pudo guardar la nota")
    : null;

  return (
    <section
      aria-labelledby="tech-note-title"
      className="rounded-2xl border border-zinc-200 bg-white p-4"
    >
      <h2 id="tech-note-title" className="text-base font-semibold">
        Agregar nota
      </h2>
      <form
        className="mt-3 space-y-3"
        onSubmit={handleSubmit((values) => {
          setSaved(false);
          noteMutation.reset();
          noteMutation.mutate(values.notes);
        })}
      >
        <div>
          <label htmlFor="tech-note" className="mb-1 block text-sm font-medium text-zinc-800">
            Nota del trabajo
          </label>
          <textarea
            id="tech-note"
            rows={3}
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby={errors.notes ? "tech-note-error" : undefined}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-base outline-none focus:border-zinc-900"
            {...register("notes")}
          />
          {errors.notes && (
            <p id="tech-note-error" className="mt-1 text-sm text-red-700">
              {errors.notes.message}
            </p>
          )}
        </div>
        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {saved && !serverError && (
          <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Nota guardada.
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || noteMutation.isPending}
          className="min-h-12 w-full rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {noteMutation.isPending ? "Guardando..." : "Guardar nota"}
        </button>
      </form>
    </section>
  );
}
