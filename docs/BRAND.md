# Marca — ARVOKTA / DOVEXO

**Estado:** nombre de producto aprobado (DOVEXO); dominio pendiente.
**Fecha:** 2026-11-10
**Decisión vigente:** [ADR-016](DECISIONS.md#adr-016--arvokta-empresa-dovexo-producto). Reemplaza a la marca provisional ARREGLO ([ADR-015](DECISIONS.md#adr-015--marca-provisional-arreglo), obsoleta en el nombre).

## Empresa y producto

| Concepto | Nombre | Uso |
|---|---|---|
| Empresa | **ARVOKTA** | Titular, contratos, facturación, Play Console (cuenta del desarrollador), pie de página legal. |
| Producto | **DOVEXO** | UI, emails, PDF, landing, app móvil, documentación para clientes. |

Ejemplo de uso:

| Contexto | Texto correcto |
|---|---|
| Pie de la landing | "DOVEXO es un producto de ARVOKTA." |
| Remitente de email | `DOVEXO <no-reply@dominio-verificado>` |
| Título de la app Android | "DOVEXO" |
| Términos y privacidad | Titular: ARVOKTA. Servicio: DOVEXO. |

## Estado del dominio

- Dominio de DOVEXO: **pendiente**. No se asume ningún dominio hasta registrarlo.
- Búsqueda de marca y registro de la marca: **pendiente**.
- Hasta verificar el dominio, no se envían emails productivos (ver `KNOWN_ISSUES.md`).

## Identificadores Android

| Campo | Valor objetivo | Estado actual en repositorio |
|---|---|---|
| `applicationId` / package | `com.dovexo.mobile` | `com.arreglo.mobile` (`apps/mobile/app.json`) |
| Scheme | `dovexo` | `arreglo` |
| Slug | `dovexo` | `arreglo` |

El cambio de `applicationId` debe hacerse antes de generar la keystore de release y de la primera subida a Play. Después no se puede cambiar sin crear una app nueva.

## Nombre: reglas de centralización

1. El nombre comercial vive en un solo lugar del frontend: `apps/web/src/lib/brand.ts` (`brand.name`, `brand.legalName`). Hoy sigue con el valor anterior y se cambiará en un cambio de código aparte.
2. La app móvil toma nombre, slug y scheme de `apps/mobile/app.json`. No hardcodear el nombre en pantallas.
3. Los emails usan una sola constante de remitente, configurada con la variable `EMAIL_FROM`.
4. La documentación usa "DOVEXO" para el producto y "ARVOKTA" para la empresa.
5. No usar el nombre de marca en identificadores de código, bases de datos ni URLs.

## Qué NO se renombra

| Elemento | Motivo |
|---|---|
| Rutas web y de API (`/api/v1/...`, `/q/[token]`, `/tech`, `/portal/...`) | Rompe enlaces ya entregados y clientes móviles instalados. |
| Nombres de tablas, columnas y migraciones | Cambiarlos exige migraciones sin beneficio para el usuario. |
| Slug de tenant demo `servicios-demo` y cuentas demo | Son datos de prueba referenciados en docs y pruebas. |
| Proyectos de Vercel y repositorio (`saas-gestion-web`, `saas-gestion-api`, `SAAS_GESTION_APP`) | Cambiarlos rompe despliegues y CI. |
| Nombre del paquete Python y variables de entorno | Son internos. |
| `applicationId` anterior `com.arreglo.mobile` | Solo existe en un APK de prueba firmado con debug. Se reemplaza antes de Play, no después (ADR-016). |

## Tagline

Textos de marca anteriores (`ARREGLO`) quedan **sin validar** para DOVEXO:

- Principal: "El sistema de tu empresa de servicios técnicos."
- Hero: "Del primer llamado al último cobro, todo en orden."
- Alternativa: "Tu operación técnica, en un solo lugar."

Revalidar con el nombre nuevo antes de usarlos en landing o Play. No inventar testimonios ni métricas.

## Voz

- Español argentino, directo, sin jerga de startup.
- Frases cortas. Beneficio concreto antes que tecnología.
- No prometer "revolucionar" ni "potenciar con IA".
- Sin testimonios, logos ni métricas inventadas.

## Paleta

Sin cambios respecto de la paleta anterior (ADR-015).

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0B1F33` | Texto principal, fondos oscuros |
| `teal` | `#0F766E` | Acción principal, estados positivos |
| `amber` | `#F59E0B` | Acentos, alertas suaves, detalles |
| `paper` | `#F7F5F0` | Fondo principal |
| `mist` | `#E7E2D8` | Bordes, fondos secundarios |
| `slate` | `#5B6B7A` | Texto secundario |

Sin gradientes genéricos. Superficies planas, líneas finas y grillas sutiles.

## Tipografía

- Títulos: **Space Grotesk** (`font-display`).
- Texto y UI: **Geist** (`font-sans`).
- Números y códigos: **Geist Mono** (`font-mono`).

## Logo y monograma

Estado: **sin diseño aprobado para DOVEXO**.

- Dirección: monograma **D** construido con trazos geométricos simples, en ink sobre paper o paper sobre ink, con acento teal.
- Versión reducida (solo monograma) para favicon, PWA e ícono de Android.
- Evitar: engranajes, llaves inglesas cruzadas, casas, cohetes, cerebros con circuitos y degradados violetas.
- El monograma anterior ("A") queda descartado para DOVEXO.
- No invertir en piezas definitivas hasta validar marca y dominio.

## Aplicación

- Landing: fondo paper, bloques ink, acentos teal y amber.
- Panel: fondo paper, tarjetas blancas, bordes mist, acciones teal.
- PWA técnico y app móvil: alto contraste, botones grandes, una acción principal por pantalla.
- PDF de presupuesto: encabezado con nombre del producto, datos claros, sin adornos.

## Dominios

Verificación RDAP del 2026-11-10:

- `dovexo.com`: registrado por un tercero. No usar como dominio principal.
- `dovexo.com.ar`: no aparece registrado en RDAP. Confirmar disponibilidad en NIC.ar antes de comprar.
- `arvokta.com` y `arvokta.com.ar`: no aparecen registrados en RDAP. Confirmar en NIC.ar.

Recomendación: usar **ARVOKTA** como dominio corporativo y **DOVEXO** como marca de producto. No comprar ni configurar Resend hasta confirmar disponibilidad y titularidad.

## Pendientes

- [ ] Búsqueda de marca DOVEXO.
- [ ] Registro del dominio y confirmación en NIC.ar.
- [x] Cambio de `brand.ts` y `app.json` a DOVEXO/ARVOKTA.
- [x] Monograma D aplicado en web y Android (provisorio, sin diseño definitivo).
- [ ] Revisión final de taglines y textos legales.
- [ ] Backup de la keystore de release fuera de esta máquina.
