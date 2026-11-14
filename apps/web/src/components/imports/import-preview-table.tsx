import { Badge } from "@/components/ui/badge";
import type { CustomerImportPreview } from "@/lib/import-api";
import {
  IMPORT_ROW_STATUS_LABELS,
  IMPORT_ROW_STATUS_VARIANTS,
  importRowName,
  importRowStatus,
} from "@/lib/import-utils";

type ImportPreviewTableProps = {
  preview: CustomerImportPreview;
};

const SUMMARY_TILES = [
  { key: "total", label: "Filas" },
  { key: "valid", label: "Válidas" },
  { key: "invalid", label: "Con errores" },
  { key: "duplicates", label: "Duplicadas" },
] as const;

export function ImportPreviewTable({ preview }: ImportPreviewTableProps) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SUMMARY_TILES.map((tile) => (
          <div key={tile.key} className="rounded-xl border border-mist bg-white px-4 py-3">
            <dt className="text-xs text-slate">{tile.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink">
              {preview.summary[tile.key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-mist">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Vista previa de las filas del archivo</caption>
          <thead className="sticky top-0 z-10 bg-paper text-xs tracking-wide text-slate uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Línea
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Nombre
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Email
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Teléfono
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {preview.rows.map((row) => {
              const status = importRowStatus(row);
              return (
                <tr key={row.line} className="align-top">
                  <td className="px-3 py-2 text-xs text-slate tabular-nums">{row.line}</td>
                  <td className="px-3 py-2 font-medium text-ink">{importRowName(row)}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-slate">
                    {row.data.email || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate">{row.data.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={IMPORT_ROW_STATUS_VARIANTS[status]}>
                      {IMPORT_ROW_STATUS_LABELS[status]}
                    </Badge>
                    {row.errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-red-700">
                        {row.errors.map((error, index) => (
                          <li key={`${row.line}-${index}`}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
