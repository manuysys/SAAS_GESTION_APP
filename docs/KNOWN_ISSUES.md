# Problemas conocidos

## Entorno

- **GitHub CLI parcialmente autenticado.** `gh` está instalado y el push a
  `origin` funciona con la credencial de Windows, pero `gh auth login` no se
  completó porque el token existente no tiene el scope `read:org`. Para usar
  todas las funciones de `gh` hay que autorizar un token con ese scope.
- **Docker no operativo.** Docker Desktop está instalado, pero no hay WSL/Hyper-V
  activo. El desarrollo usa PostgreSQL portable, no contenedores.
- **Node 26 global en `Downloads`.** Se instaló Node 24 LTS con `fnm` para el
  proyecto. Si `fnm` no se activa en una shell nueva, usar
  `fnm exec --using=24 -- <comando>`.
- **Ollama limitado.** `gpt-oss:20b` ocupa 13 GB y el equipo tiene 16 GB de RAM
  y un i5 de dos núcleos. No usar en paralelo con builds pesados.
- **Sin credenciales externas.** No hay claves de Supabase, WhatsApp, Mercado
  Pago ni proveedores de IA.

## Producto

- No hay aplicación ejecutable todavía.
- No hay investigación competitiva verificada en esta sesión.
- No hay entrevistas a clientes.
- No hay nombre comercial aprobado (TIVORA fue descartado preliminarmente).

## Riesgos técnicos

- Compatibilidad de dependencias con Node 24/26 y Python 3.12.
- RLS de PostgreSQL y FK compuestas requieren diseño cuidadoso.
- Generación de PDF y enlaces seguros de aprobación.
- Integración oficial de WhatsApp (costos y verificación de negocio).
- Costos variables de IA sin cuotas bien definidas.
