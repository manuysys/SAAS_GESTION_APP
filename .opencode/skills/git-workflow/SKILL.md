---
name: Git Workflow
description: Ramas, commits convencionales, revisión y push seguro
---

# Git Workflow

## Ramas

- `main` siempre estable.
- `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`.
- Una rama por cambio lógico.

## Commits

Formato Conventional Commits:

```text
feat(api): add tenant-scoped customer creation
fix(web): handle 401 on session expiry
docs(architecture): document outbox pattern
test(api): cover cross-tenant access
chore(deps): update fastapi
```

- Mensaje en inglés técnico claro.
- Un commit por intención.
- No mezclar refactors grandes con features.

## Antes de commit

```powershell
git status
git diff --stat
git diff
```

- Revisar que no haya secretos, `.env`, `.local/` ni artefactos.
- Ejecutar la verificación correspondiente.
- Actualizar docs si cambió el comportamiento.

## Push

- `git push` requiere confirmación (configurado como `ask`).
- No force-push a `main`.
- Abrir PR con resumen, pruebas y riesgos.
- Si hay conflicto, resolverlo localmente y volver a verificar.
