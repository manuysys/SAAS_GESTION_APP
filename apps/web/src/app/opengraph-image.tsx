import { ImageResponse } from "next/og";

import { brand } from "@/lib/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Imagen social generada con ImageResponse. Solo usa la fuente por defecto y colores de marca. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: brand.colors.ink,
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#0E2740",
            border: "2px solid rgba(255,255,255,0.15)",
            color: brand.colors.amber,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          A
        </div>
        <div style={{ fontSize: 40, fontWeight: 700 }}>{brand.name}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.02,
          }}
        >
          <div style={{ display: "flex" }}>Del primer llamado al último cobro,</div>
          <div style={{ display: "flex", color: brand.colors.amber }}>todo en orden.</div>
        </div>
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.75)", maxWidth: 980 }}>
          Órdenes, presupuestos con link público, agenda y cobros para servicios técnicos.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 120, height: 10, borderRadius: 999, background: brand.colors.teal }} />
        <div
          style={{ width: 120, height: 10, borderRadius: 999, background: brand.colors.amber }}
        />
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)", marginLeft: 12 }}>
          Hecho para Argentina · ARS
        </div>
      </div>
    </div>,
    { ...size },
  );
}
