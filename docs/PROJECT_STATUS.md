# Estado del proyecto

**Última actualización:** 2026-11-07
**Fase:** Hito 0 — Fundamentos / preparación del entorno

## Resumen

El repositorio fue creado vacío. En esta sesión se está preparando el entorno
local, la configuración de OpenCode y la documentación inicial. Todavía **no
existe una aplicación ejecutable**.

## Hecho

- [x] Lectura completa del contexto maestro (`CONTEXTO_GUIA_PROYECTO.md`).
- [x] Auditoría del entorno local (Windows, Git, Node, Python, PostgreSQL, Docker, Ollama).
- [x] Repositorio Git inicializado con remoto `origin`.
- [x] `AGENTS.md` con instrucciones permanentes.
- [x] `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`.
- [x] Documentación inicial de producto, arquitectura, datos, seguridad y roadmap.
- [ ] Configuración de OpenCode (MCP, agentes, skills, comandos).
- [ ] Toolchain reproducible (Node 24, Python 3.12, PostgreSQL portable).
- [ ] Autenticación de GitHub (`gh auth login`) y primer push.
- [ ] Scaffold de `apps/web` y `apps/api`.
- [ ] Primer vertical slice funcional.

## Próximo paso concreto

Terminar la preparación del entorno, verificar que PostgreSQL local responde y
que OpenCode carga agentes/skills/MCP. Después, scaffold del monorepo y vertical
slice de autenticación + tenant + clientes.

## Limitaciones conocidas

- GitHub CLI instalado pero sin sesión iniciada; el push requiere autenticación.
- Docker Desktop no tiene WSL/Hyper-V operativo; no se usa para desarrollo.
- Ollama funciona con `gpt-oss:20b`, pero el hardware (i5-7300U, 16 GB) es
  limitado para modelos grandes. Se usará solo para pruebas puntuales.
- No hay credenciales de Supabase, WhatsApp, Mercado Pago ni proveedores de IA.

## Hipótesis no validadas

- El segmento inicial (servicios técnicos a domicilio) tiene dolor real y
  disposición a pagar.
- Las empresas pequeñas adoptarán una plataforma integrada en lugar de seguir
  con WhatsApp + Excel.
- La automatización y la IA aportan valor suficiente para justificar un plan
  superior.
- El precio y el modelo de suscripción son sostenibles en Argentina.
