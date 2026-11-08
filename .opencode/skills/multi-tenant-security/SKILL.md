---
name: Multi-Tenant Security
description: Checklist de aislamiento entre empresas, roles y pruebas de acceso cruzado
---

# Multi-Tenant Security

## Regla de oro

El `tenant_id` sale de la sesión autenticada. Nunca del body, query, path ni
header enviado por el cliente.

## Checklist por endpoint

- [ ] Requiere autenticación.
- [ ] Resuelve tenant desde la sesión.
- [ ] Verifica membership y rol.
- [ ] Filtra por tenant en el repositorio.
- [ ] Valida que las entidades relacionadas sean del mismo tenant.
- [ ] Devuelve 404 para recursos de otro tenant.
- [ ] Registra auditoría si la acción es sensible.
- [ ] Tiene test con tenant A y tenant B.

## Roles

| Rol | Puede |
|---|---|
| owner | Todo el tenant, miembros y facturación |
| admin | Operación y configuración |
| dispatcher | Clientes, solicitudes, órdenes, agenda |
| technician | Solo sus órdenes y datos operativos |
| viewer | Lectura limitada |

## Pruebas mínimas

```python
async def test_cannot_read_other_tenant_customer(client, tenant_a, tenant_b):
    response = await client.get(f"/customers/{tenant_b.customer_id}", headers=tenant_a.auth)
    assert response.status_code == 404
```

Repetir para update, delete, archivos, pagos, presupuestos y webhooks.

## IA y automatizaciones

- Las herramientas reciben tenant y usuario, no confían en argumentos del modelo.
- Validar cada argumento contra el tenant.
- Las acciones sensibles requieren confirmación humana.
- Los webhooks resuelven el tenant por el recurso, no por el payload.
