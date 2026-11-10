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
- `/assistant` con Groq y fallback determinista.
- `/settings/billing` con plan y uso.
- `/settings/whatsapp` (sin credenciales reales, no envía).
- `/admin` solo para platform admins.
- Portal del cliente en la app móvil (`/portal/servicios-demo` en la API).

## App móvil

### Técnico

```text
Email: tecnico@saasgestion.com
Password: Tecnico12345!
Empresa: Servicios Demo
```

### Cliente

```text
Empresa: servicios-demo
Email: carlos@example.com
```

En la app, usar **“Probar demo de cliente”**. El backend devuelve un token de
demostración solo para el tenant `servicios-demo` cuando `PORTAL_DEV_MODE=true`.
En producción real, el acceso se envía por email o WhatsApp.

### APK de prueba

Descargar el APK arm64 desde la release pública:

```text
https://github.com/manuysys/SAAS_GESTION_APP/releases/tag/mobile-apk-3
```

El APK está firmado con la keystore de debug: sirve para probar en un Android
real, no para publicar en Google Play. Habilitar “instalar apps desconocidas”
para el navegador o el explorador de archivos.

## Advertencia

No cargar datos personales reales ni información confidencial. Es un entorno de
demostración con credenciales públicas.
