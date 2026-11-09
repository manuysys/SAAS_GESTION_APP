# Demo pública

## URL

- Frontend: https://saas-gestion-web.vercel.app
- API: https://saas-gestion-api.vercel.app
- Base de datos: Neon PostgreSQL, región `gru1`, plan Free.

Frontend y API están desplegados en Vercel. La base está en Neon. La demo no
depende de una máquina local ni de un túnel.

Limitaciones: plan Free de Neon (almacenamiento/conexiones) y plan Hobby de
Vercel (cold starts y límites de ejecución). No es un entorno con SLA.

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

### Fundador / panel global

```text
Email: founder@saasgestion.com
Password: Founder12345!
Empresa: SaaS Gestion HQ
```

El usuario fundador tiene `is_platform_admin=true` y puede entrar a `/admin`.
No publicar estas credenciales fuera del equipo.

## Datos cargados

- 3 clientes.
- 2 solicitudes.
- 2 órdenes de trabajo.
- Presupuesto `QT-2026-0001` aprobado por el cliente.
- Presupuesto `QT-2026-0002` enviado y pendiente.
- 1 turno agendado para el técnico.
- 1 pago parcial registrado.
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
