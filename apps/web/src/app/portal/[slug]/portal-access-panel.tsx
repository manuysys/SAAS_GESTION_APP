"use client";

import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/lib/brand";

export function PortalAccessPanel({ slug, token }: { slug: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const deepLink = `dovexo://customer?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`;

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enlace incompleto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate">
            Falta el código de acceso. Pedile a la empresa que genere un enlace nuevo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-teal" aria-hidden="true" />
            Ingresá a {brand.name}
          </CardTitle>
          <p className="text-sm text-slate">
            Abrí la app en tu teléfono y elegí <strong>Soy cliente</strong>. Si el botón no abre la
            app, copiá el código y pegalo en la pantalla de ingreso.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <a
            href={deepLink}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir en la app
          </a>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">
              Código de acceso
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-mist bg-paper px-3 py-2 text-sm text-ink">
                {token}
              </code>
              <Button type="button" variant="outline" onClick={() => void copyToken()}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate">
            El código vence y solo se puede usar una vez. No lo compartas con otras personas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿No tenés la app?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate">
            Pedile a la empresa el enlace de instalación de DOVEXO para Android. Cuando la tengas
            instalada, volvé a este enlace o pegá el código en la pantalla de cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
