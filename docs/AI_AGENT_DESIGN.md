# Diseño del agente de IA

## Principio

La IA interpreta lenguaje natural y presenta resultados; los cálculos y las
operaciones críticas se resuelven con lógica determinista del backend. Nunca se
le da SQL libre ni acceso irrestricto a datos.

## Proveedores

Interfaz `AIProvider`:

- `OllamaProvider` para desarrollo local.
- `OpenAICompatibleProvider` para proveedores externos.
- `DeterministicProvider` para consultas frecuentes sin LLM.

El proveedor se selecciona por `AI_PROVIDER` y no debe acoplar el producto a un
vendedor.

## Herramientas

Nivel 1 — consulta:

- `get_business_summary`
- `search_customers`
- `get_customer_history`
- `search_work_orders`
- `get_work_order_details`
- `get_quote_status`
- `get_agenda`

Nivel 2 — preparación:

- `create_customer_draft`
- `create_quote_draft`
- `prepare_appointment`
- `prepare_technician_assignment`

Nivel 3 — ejecución autorizada:

- acciones habilitadas explícitamente por el administrador.

Nivel 4 — aprobación humana obligatoria:

- enviar presupuesto
- confirmar pago
- cancelar orden
- modificar permisos
- exportar datos

## Seguridad

- El tenant y el usuario se obtienen de la sesión, nunca del mensaje.
- Validar argumentos de cada herramienta.
- Los mensajes y archivos externos son datos no confiables.
- No permitir que un mensaje del cliente cambie instrucciones del sistema.
- Registrar cada llamada a herramienta y cada acción sensible.
- Las acciones sensibles requieren confirmación explícita.

## Costos y cuotas

Tabla `ai_usage_logs`:

- tenant_id
- user_id
- provider
- model
- feature
- input_tokens
- output_tokens
- estimated_cost
- created_at

Cuotas por plan y límites configurables. Si se supera la cuota, responder 429
con un mensaje claro.

## API

- `POST /api/v1/ai/chat`
- `GET /api/v1/ai/usage`
- `GET /api/v1/ai/status`

## Frontend

- `/assistant`: chat con preguntas rápidas.
- Mostrar fuentes de datos y aclarar cuando una respuesta es una estimación.
- Si no hay proveedor configurado, mostrar “IA no configurada”, sin simular.

## Pruebas

- Consulta de presupuestos pendientes usa datos reales.
- Aislamiento entre tenants.
- Herramienta con argumentos inválidos devuelve error controlado.
- Cuota agotada devuelve 429.
- Acción sensible sin confirmación no se ejecuta.
