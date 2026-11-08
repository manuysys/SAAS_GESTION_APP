---
name: Frontend Next.js
description: Convenciones y comandos para implementar el frontend Next.js, React y TypeScript estricto
---

# Frontend Next.js

## Estructura

```text
apps/web/
  src/
    app/
      (auth)/
      (app)/
      (technician)/
    components/
    features/
    lib/
      api/        cliente generado
      utils/
    hooks/
  public/
  e2e/
```

## Reglas

- TypeScript estricto; prohibido `any` y `@ts-ignore` sin justificación.
- Server Components por defecto; `"use client"` solo para interacción.
- Formularios con React Hook Form + Zod.
- Estado remoto con TanStack Query.
- Fechas `es-AR`; moneda ARS con `Intl.NumberFormat`.
- Accesibilidad: labels, foco, contraste, teclado.
- Responsive desde 360 px.
- No duplicar lógica de permisos: el backend decide.
- Evitar componentes gigantes; separar por feature.

## Comandos

```powershell
cd apps/web
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Checklist de pantalla

- [ ] Loading, empty y error state.
- [ ] Validación de formulario.
- [ ] Manejo de 401/403/404.
- [ ] Responsive y accesible.
- [ ] Sin datos hardcodeados.
- [ ] Test de componente o E2E si es flujo crítico.
