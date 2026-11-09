from __future__ import annotations

import json
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import Settings


class ProviderConfigError(Exception):
    """Raised when an external AI provider is not properly configured."""


class ProviderError(Exception):
    """Raised when an external AI provider request fails."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ProviderRateLimitError(ProviderError):
    """Raised when the external provider rejects the request due to quota/rate limits."""


def _estimate_tokens(text: str) -> int:
    """Rough token estimator used when providers do not return usage data."""
    return max(1, len(text) // 4)


class BaseAIProvider(ABC):
    @abstractmethod
    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
    ) -> tuple[str, int, int, str]:
        """Return (reply_text, input_tokens, output_tokens, model_name)."""


class DeterministicProvider(BaseAIProvider):
    """Local, rule-based assistant that resolves common intents in Spanish.

    It receives a pre-computed tenant snapshot and never invents data.
    """

    def __init__(self, snapshot: dict[str, Any]) -> None:
        self.snapshot = snapshot

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
    ) -> tuple[str, int, int, str]:
        text = (messages[-1]["content"] if messages else "").lower()
        reply = self._resolve(text)
        input_tokens = _estimate_tokens(json.dumps(messages, ensure_ascii=False))
        output_tokens = _estimate_tokens(reply)
        return reply, input_tokens, output_tokens, "deterministic"

    def _resolve(self, text: str) -> str:
        if any(word in text for word in ("presupuesto", "presupuestos", "pendiente", "pendientes")):
            return self._pending_quotes()
        if any(
            phrase in text
            for phrase in ("agenda de hoy", "turnos de hoy", "turnos hoy", "agenda hoy")
        ):
            return self._today_agenda()
        if any(
            phrase in text for phrase in ("resumen", "cómo va el negocio", "cómo vamos", "como va")
        ):
            return self._business_summary()
        if any(
            phrase in text
            for phrase in ("órdenes urgentes", "ordenes urgentes", "urgente", "urgentes")
        ):
            return self._urgent_orders()
        if any(
            phrase in text
            for phrase in ("saldo pendiente", "pagos", "cuánto me deben", "cuanto me deben")
        ):
            return self._payments_summary()
        if any(
            phrase in text
            for phrase in ("ayuda", "qué podés hacer", "que podes hacer", "qué hacés")
        ):
            return self._capabilities()
        return self._fallback()

    def _format_money(self, value: Decimal) -> str:
        return f"${value:,.2f}"

    def _pending_quotes(self) -> str:
        quotes = self.snapshot.get("pending_quotes", [])
        if not quotes:
            return "No hay presupuestos pendientes."
        lines = [f"Tenés {len(quotes)} presupuesto(s) pendiente(s):"]
        for quote in quotes:
            total = quote.get("total", Decimal("0.00"))
            lines.append(
                f"- {quote['number']} | {quote['customer_name']} | {self._format_money(total)}"
            )
        return "\n".join(lines)

    def _today_agenda(self) -> str:
        appointments = self.snapshot.get("appointments_today", [])
        if not appointments:
            return "No hay turnos programados para hoy."
        lines = ["Turnos de hoy:"]
        for appt in appointments:
            technician = appt.get("technician_name", "sin técnico")
            lines.append(
                f"- {appt['time']} | {appt['work_order_code']} | "
                f"{appt['work_order_title']} | {technician}"
            )
        return "\n".join(lines)

    def _business_summary(self) -> str:
        return (
            f"Resumen del negocio:\n"
            f"- Clientes: {self.snapshot.get('customers_total', 0)}\n"
            f"- Solicitudes abiertas: {self.snapshot.get('service_requests_new', 0)}\n"
            f"- Órdenes abiertas: {self.snapshot.get('work_orders_open', 0)}\n"
            f"- Presupuestos pendientes: {self.snapshot.get('quotes_pending', 0)}\n"
            f"- Saldo pendiente: {
                self._format_money(self.snapshot.get('pending_balance', Decimal('0.00')))
            }"
        )

    def _urgent_orders(self) -> str:
        orders = self.snapshot.get("urgent_work_orders", [])
        if not orders:
            return "No hay órdenes urgentes pendientes."
        lines = ["Órdenes urgentes:"]
        for order in orders:
            lines.append(
                f"- {order['code']} | {order['title']} | "
                f"{order['customer_name']} | {order['operational_status']}"
            )
        return "\n".join(lines)

    def _payments_summary(self) -> str:
        pending = self.snapshot.get("pending_balance", Decimal("0.00"))
        payments = self.snapshot.get("payments_this_month", {"count": 0, "total": Decimal("0.00")})
        return (
            f"Saldo pendiente total: {self._format_money(pending)}\n"
            f"Pagos del mes: {payments['count']} por {self._format_money(payments['total'])}"
        )

    def _capabilities(self) -> str:
        return (
            "Puedo ayudarte con:\n"
            "- Presupuestos pendientes\n"
            "- Agenda de hoy\n"
            "- Resumen del negocio\n"
            "- Órdenes urgentes\n"
            "- Saldo pendiente y pagos del mes\n"
            "Solo consultas; no ejecuto acciones."
        )

    def _fallback(self) -> str:
        return (
            "No pude interpretar la consulta. Probá con: presupuestos pendientes, "
            "agenda de hoy, resumen del negocio, órdenes urgentes, "
            "saldo pendiente o qué podés hacer."
        )


class OpenAICompatibleProvider(BaseAIProvider):
    """Provider for any OpenAI-compatible HTTP endpoint."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.ai_base_url.rstrip("/")
        self.api_key = settings.ai_api_key
        self.model = settings.ai_model
        self.timeout = settings.ai_timeout_seconds

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
    ) -> tuple[str, int, int, str]:
        if not self.base_url or not self.model or not self.api_key:
            raise ProviderConfigError("OpenAI-compatible provider is not configured")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": payload_messages,
                        "temperature": 0.2,
                        "max_tokens": 800,
                    },
                )
                if response.status_code == 429:
                    raise ProviderRateLimitError("External AI quota exceeded")
                response.raise_for_status()
        except ProviderRateLimitError:
            raise
        except httpx.HTTPStatusError as exc:
            raise ProviderError("External AI service returned an error") from exc
        except httpx.RequestError as exc:
            raise ProviderError("Could not connect to external AI service") from exc

        data = response.json()
        text = data["choices"][0]["message"]["content"]
        if not isinstance(text, str) or not text.strip():
            raise ProviderError("External AI service returned an empty response")
        usage = data.get("usage") or {}
        input_tokens = usage.get("prompt_tokens")
        output_tokens = usage.get("completion_tokens")
        if input_tokens is None:
            input_tokens = _estimate_tokens(json.dumps(payload_messages, ensure_ascii=False))
        if output_tokens is None:
            output_tokens = _estimate_tokens(text)
        return text.strip(), int(input_tokens), int(output_tokens), self.model


class OllamaProvider(BaseAIProvider):
    """Provider for a local Ollama server."""

    def __init__(self, settings: Settings) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str | None = None,
    ) -> tuple[str, int, int, str]:
        if not self.base_url or not self.model:
            raise ProviderConfigError("Ollama provider is not configured")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    headers={"Content-Type": "application/json"},
                    json={
                        "model": self.model,
                        "messages": payload_messages,
                        "stream": False,
                    },
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ProviderError("Ollama service returned an error") from exc
        except httpx.RequestError as exc:
            raise ProviderError("Could not connect to Ollama service") from exc

        data = response.json()
        text = data["message"]["content"]
        input_tokens = _estimate_tokens(json.dumps(payload_messages, ensure_ascii=False))
        output_tokens = _estimate_tokens(text)
        return text.strip(), input_tokens, output_tokens, self.model
