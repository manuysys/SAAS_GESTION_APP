---
name: Project Context
description: Leer y mantener el contexto, estado y decisiones del proyecto antes de trabajar
---

# Project Context

Usar al inicio de cada sesión significativa o antes de una decisión de producto,
arquitectura o alcance.

## Lectura mínima

1. `AGENTS.md`
2. `docs/PROJECT_STATUS.md`
3. `docs/DECISIONS.md`
4. `docs/ROADMAP.md`
5. La sección relevante de `CONTEXTO_GUIA_PROYECTO.md`

No cargues las 2.940 líneas del contexto maestro si no hace falta; buscá la
sección con `grep` o `rg`.

## Reglas

- No afirmes que algo está implementado si solo está planificado.
- Si una decisión cambia, agregá un ADR en `docs/DECISIONS.md` y marcá el
  anterior como obsoleto.
- Actualizá `docs/PROJECT_STATUS.md` al cerrar la sesión.
- Registrá problemas abiertos en `docs/KNOWN_ISSUES.md`.
- Mantené coherencia entre README, PRD, arquitectura y estado.

## Cierre de sesión

1. ¿Qué se implementó y verificó?
2. ¿Qué archivos cambiaron?
3. ¿Qué pruebas se ejecutaron y con qué resultado?
4. ¿Qué quedó pendiente?
5. ¿Cuál es el próximo paso concreto?

Escribí eso en `docs/PROJECT_STATUS.md` y `docs/CHANGELOG.md`.
