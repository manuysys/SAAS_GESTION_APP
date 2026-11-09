from __future__ import annotations

import logging

import structlog

_REQUEST_ID_KEY = "request_id"


def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.ExtraAdder(),
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)


def set_request_id(request_id: str) -> None:
    structlog.contextvars.bind_contextvars(**{_REQUEST_ID_KEY: request_id})


def clear_request_id() -> None:
    structlog.contextvars.unbind_contextvars(_REQUEST_ID_KEY)


def get_request_id() -> str | None:
    return structlog.contextvars.get_contextvars().get(_REQUEST_ID_KEY)


# Garantiza que la salida estándar de logging también esté configurada.
logging.basicConfig(
    format="%(message)s",
    level=logging.INFO,
)
configure_logging()
