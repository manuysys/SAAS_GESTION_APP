# Demo pública

## URL

- Frontend: https://saas-gestion-web.vercel.app
- API temporal: https://sims-instrumental-capture-enlarge.trycloudflare.com

La API corre en la máquina local y se expone por un túnel de Cloudflare. El
frontend está en Vercel. Si la máquina o el túnel se apagan, la demo deja de
funcionar. No es un entorno de producción.

El túnel rápido de Cloudflare cambia de URL cada vez que se reinicia. Si cambia,
hay que actualizar `NEXT_PUBLIC_API_URL` en Vercel y volver a desplegar:

```powershell
cd apps/web
vercel env rm NEXT_PUBLIC_API_URL production --yes
"https://<nueva-url>.trycloudflare.com" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod --yes
```

## Cuentas de prueba

### Administrador

```text
Email: demo@saasgestion.com
Password: Demo12345!
Empresa: Servicios Demo
```

### Técnico

```text
Email: tecnico@saasgestion.com
Password: Tecnico12345!
Empresa: Servicios Demo
```

## Datos cargados

- 3 clientes.
- 2 solicitudes.
- 2 órdenes de trabajo.
- Presupuesto `QT-2026-0001` aprobado por el cliente.
- Presupuesto `QT-2026-0002` enviado y pendiente.
- 1 turno agendado para el técnico.
- Suscripción Professional activa.
- Automatización "Avisar presupuesto aprobado".
- 1 notificación generada por la aprobación pública.
- Historial de eventos.

## Módulos visibles

- Panel, clientes, solicitudes, órdenes, presupuestos, agenda y pagos.
- `/tech` para el usuario técnico.
- `/automations` y `/notifications`.
- `/assistant` con proveedor determinista local.
- `/settings/billing` con plan y uso.
- `/settings/whatsapp` (sin credenciales reales, no envía).
- `/admin` solo para platform admins.

## Advertencia

No cargar datos personales reales ni información confidencial. Es un entorno de
demostración con credenciales públicas.
