---
description: Divide una tarea en subagentes paralelos con archivos disjuntos
---

Tarea: $ARGUMENTS

Antes de delegar:

1. Leé el estado y los archivos relevantes.
2. Dividí la tarea en partes con archivos disjuntos.
3. Asigná cada parte a `backend`, `frontend`, `database`, `qa`, `docs` o
   `research`.
4. Definí para cada subagente: objetivo, archivos permitidos, comandos de
   verificación y criterio de terminado.

Lanzá los subagentes en background y esperá los resultados. Luego:

1. Integrá los cambios.
2. Resolvé conflictos.
3. Ejecutá la verificación completa.
4. Reportá qué hizo cada subagente y qué quedó pendiente.

No paralelices tareas que editen el mismo archivo.
