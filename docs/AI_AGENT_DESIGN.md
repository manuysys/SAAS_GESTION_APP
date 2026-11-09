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

## Groq (proveedor inicial)

Configuración:

```env
AI_PROVIDER=openai_compatible
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-120b
AI_API_KEY=...
```

Free tier de Groq para `openai/gpt-oss-120b`: 30 RPM, 1.000 requests/día,
8K tokens/minuto y 200K tokens/día. Es suficiente para demo y primeros usuarios,
no para escala.

Reglas:

- Cuota diaria por tenant para no agotar la cuota global de la organización.
- Si Groq devuelve 429, responder con el proveedor determinista y avisar
  “Modo local (la cuota de IA externa se agotó)”. No simular una respuesta del
  LLM.
- Si Groq devuelve error de red/5xx, devolver 502 controlado.
- Revisar términos de uso de datos del free tier antes de usarlo con datos
  reales de clientes.
- Alternativas gratuitas para fallback: Gemini 2.5 Flash u OpenRouter free
  (límites más bajos).
