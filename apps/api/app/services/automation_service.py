from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID, uuid4

import structlog
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AutomationExecution, AutomationRule, Notification
from app.repositories import automations as repo
from app.schemas.automation import AutomationRuleCreate, AutomationRuleUpdate

logger = structlog.get_logger()


class AutomationSkippedError(Exception):
    """Raised when an action is intentionally skipped."""


_NOTIFICATION_ROLES = frozenset({"owner", "admin", "dispatcher"})


def _coerce_decimal(value: object) -> Decimal | None:
    if isinstance(value, Decimal):
        return value
    priority_map = {"low": 1, "normal": 2, "high": 3, "urgent": 4}
    if isinstance(value, str) and value.lower() in priority_map:
        return Decimal(priority_map[value.lower()])
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _coerce_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


def _match_conditions(conditions: dict[str, object] | None, payload: dict[str, object]) -> bool:
    if not conditions:
        return True
    for key, expected in conditions.items():
        if "__gte" in key:
            field = key.split("__gte")[0]
            actual = payload.get(field)
            actual_dec = _coerce_decimal(actual)
            expected_dec = _coerce_decimal(expected)
            if actual_dec is None or expected_dec is None:
                actual_dt = _coerce_datetime(actual)
                expected_dt = _coerce_datetime(expected)
                if actual_dt is None or expected_dt is None or actual_dt < expected_dt:
                    return False
            elif actual_dec < expected_dec:
                return False
        elif "__lte" in key:
            field = key.split("__lte")[0]
            actual = payload.get(field)
            actual_dec = _coerce_decimal(actual)
            expected_dec = _coerce_decimal(expected)
            if actual_dec is None or expected_dec is None:
                actual_dt = _coerce_datetime(actual)
                expected_dt = _coerce_datetime(expected)
                if actual_dt is None or expected_dt is None or actual_dt > expected_dt:
                    return False
            elif actual_dec > expected_dec:
                return False
        elif "__contains" in key:
            field = key.split("__contains")[0]
            actual = str(payload.get(field, ""))
            if str(expected) not in actual:
                return False
        else:
            if payload.get(key) != expected:
                return False
    return True


async def _run_action(
    db: AsyncSession,
    *,
    rule: AutomationRule,
    event_type: str,
    payload: dict[str, Any],
    tenant_id: UUID,
) -> None:
    config = rule.action_config or {}
    title = str(config.get("title", f"Evento: {event_type}"))
    message = str(config.get("message", f"Se disparó el evento {event_type}"))
    notification_type = str(config.get("type", "info"))

    if rule.action_type == "notify":
        raw_user_ids = config.get("user_ids")
        if isinstance(raw_user_ids, list) and raw_user_ids:
            targets = [UUID(str(uid)) for uid in raw_user_ids]
        else:
            targets = await repo.list_dispatcher_user_ids(db, tenant_id=tenant_id)
        for user_id in targets:
            await repo.create_notification(
                db,
                tenant_id=tenant_id,
                user_id=user_id,
                title=title,
                message=message,
                type=notification_type,
            )
    elif rule.action_type == "notify_user":
        user_id = UUID(str(config.get("user_id")))
        await repo.create_notification(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
        )
    elif rule.action_type == "send_whatsapp":
        raise AutomationSkippedError("WhatsApp no configurado")
    else:
        raise AutomationSkippedError(f"Acción no soportada: {rule.action_type}")


async def emit_event(
    db: AsyncSession,
    tenant_id: UUID,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    rules = await repo.list_active_rules(db, tenant_id=tenant_id, event_type=event_type)
    if not rules:
        return

    event_id = uuid4()
    for rule in rules:
        if not _match_conditions(rule.conditions, payload):
            continue

        idempotency_key = f"{rule.id}:{event_id}"
        execution = await repo.create_execution(
            db,
            tenant_id=tenant_id,
            rule_id=rule.id,
            event_type=event_type,
            status="pending",
            payload=payload,
            error=None,
            idempotency_key=idempotency_key,
            attempts=0,
            executed_at=None,
        )

        try:
            async with db.begin_nested():
                await _run_action(
                    db,
                    rule=rule,
                    event_type=event_type,
                    payload=payload,
                    tenant_id=tenant_id,
                )
                execution.status = "success"
                execution.attempts = 1
                execution.executed_at = datetime.now(UTC)
                await db.flush()
        except AutomationSkippedError as exc:
            execution.status = "skipped"
            execution.error = str(exc)
            execution.attempts = 1
            execution.executed_at = datetime.now(UTC)
            try:
                await db.flush()
            except Exception as flush_exc:
                logger.warning(
                    "automation_flush_failed",
                    rule_id=str(rule.id),
                    event_type=event_type,
                    error=str(flush_exc),
                )
        except Exception as exc:
            execution.status = "failed"
            execution.error = str(exc)
            execution.attempts = 1
            execution.executed_at = datetime.now(UTC)
            try:
                await db.flush()
            except Exception as flush_exc:
                logger.warning(
                    "automation_flush_failed",
                    rule_id=str(rule.id),
                    event_type=event_type,
                    error=str(flush_exc),
                )
            logger.warning(
                "automation_execution_failed",
                rule_id=str(rule.id),
                event_type=event_type,
                error=str(exc),
            )


async def list_tenant_rules(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[AutomationRule], int]:
    return await repo.list_rules(db, tenant_id=tenant_id, limit=limit, offset=offset)


async def create_tenant_rule(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    payload: AutomationRuleCreate,
) -> AutomationRule:
    try:
        rule = await repo.create_rule(
            db,
            tenant_id=tenant_id,
            name=payload.name.strip(),
            event_type=payload.event_type,
            conditions=payload.conditions,
            action_type=payload.action_type,
            action_config=payload.action_config,
            active=payload.active,
        )
        await db.commit()
        await db.refresh(rule)
        return rule
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A rule with that name already exists",
        ) from exc


async def get_tenant_rule(db: AsyncSession, *, tenant_id: UUID, rule_id: UUID) -> AutomationRule:
    rule = await repo.get_rule(db, tenant_id=tenant_id, rule_id=rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return rule


async def update_tenant_rule(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    rule_id: UUID,
    payload: AutomationRuleUpdate,
) -> AutomationRule:
    rule = await get_tenant_rule(db, tenant_id=tenant_id, rule_id=rule_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        rule.name = data["name"].strip()
    for field in ("event_type", "conditions", "action_type", "action_config", "active"):
        if field in data:
            setattr(rule, field, data[field])
    try:
        await db.commit()
        await db.refresh(rule)
    except IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A rule with that name already exists",
        ) from exc
    return rule


async def toggle_tenant_rule(db: AsyncSession, *, tenant_id: UUID, rule_id: UUID) -> AutomationRule:
    rule = await get_tenant_rule(db, tenant_id=tenant_id, rule_id=rule_id)
    rule.active = not rule.active
    await db.commit()
    await db.refresh(rule)
    return rule


async def delete_tenant_rule(db: AsyncSession, *, tenant_id: UUID, rule_id: UUID) -> None:
    rule = await get_tenant_rule(db, tenant_id=tenant_id, rule_id=rule_id)
    await repo.delete_rule(db, rule)
    await db.commit()


async def list_tenant_executions(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[AutomationExecution], int]:
    return await repo.list_executions(db, tenant_id=tenant_id, limit=limit, offset=offset)


async def list_tenant_notifications(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str,
    limit: int,
    offset: int,
) -> tuple[list[Notification], int, int]:
    return await repo.list_notifications(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        role=role,
        limit=limit,
        offset=offset,
    )


async def mark_notification_read(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    notification_id: UUID,
    user_id: UUID,
    role: str,
) -> object:
    notification = await repo.mark_notification_read(
        db,
        tenant_id=tenant_id,
        notification_id=notification_id,
        user_id=user_id,
        role=role,
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    await db.commit()
    await db.refresh(notification)
    return notification


async def mark_all_notifications_read(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str,
) -> int:
    count = await repo.mark_all_notifications_read(
        db, tenant_id=tenant_id, user_id=user_id, role=role
    )
    await db.commit()
    return count
