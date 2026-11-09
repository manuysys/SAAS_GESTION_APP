from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AutomationExecution, AutomationRule, Membership, Notification


async def list_active_rules(
    db: AsyncSession, *, tenant_id: UUID, event_type: str
) -> list[AutomationRule]:
    result = await db.execute(
        select(AutomationRule)
        .where(
            AutomationRule.tenant_id == tenant_id,
            AutomationRule.event_type == event_type,
            AutomationRule.active.is_(True),
        )
        .order_by(AutomationRule.created_at.desc())
    )
    return list(result.scalars().all())


async def list_rules(
    db: AsyncSession, *, tenant_id: UUID, limit: int, offset: int
) -> tuple[list[AutomationRule], int]:
    filters = [AutomationRule.tenant_id == tenant_id]
    total = await db.scalar(select(func.count()).select_from(AutomationRule).where(*filters))
    result = await db.execute(
        select(AutomationRule)
        .where(*filters)
        .order_by(AutomationRule.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_rule(db: AsyncSession, *, tenant_id: UUID, rule_id: UUID) -> AutomationRule | None:
    result = await db.execute(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def create_rule(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    name: str,
    event_type: str,
    conditions: dict[str, object] | None,
    action_type: str,
    action_config: dict[str, object] | None,
    active: bool,
) -> AutomationRule:
    rule = AutomationRule(
        tenant_id=tenant_id,
        name=name,
        event_type=event_type,
        conditions=conditions,
        action_type=action_type,
        action_config=action_config,
        active=active,
    )
    db.add(rule)
    await db.flush()
    return rule


async def delete_rule(db: AsyncSession, rule: AutomationRule) -> None:
    await db.delete(rule)
    await db.flush()


async def create_execution(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    rule_id: UUID,
    event_type: str,
    status: str,
    payload: dict[str, object] | None,
    error: str | None,
    idempotency_key: str,
    attempts: int = 1,
    executed_at: datetime | None = None,
) -> AutomationExecution:
    execution = AutomationExecution(
        tenant_id=tenant_id,
        rule_id=rule_id,
        event_type=event_type,
        status=status,
        payload=payload,
        error=error,
        idempotency_key=idempotency_key,
        attempts=attempts,
        executed_at=executed_at,
    )
    db.add(execution)
    await db.flush()
    return execution


async def list_executions(
    db: AsyncSession, *, tenant_id: UUID, limit: int, offset: int
) -> tuple[list[AutomationExecution], int]:
    filters = [AutomationExecution.tenant_id == tenant_id]
    total = await db.scalar(select(func.count()).select_from(AutomationExecution).where(*filters))
    result = await db.execute(
        select(AutomationExecution)
        .where(*filters)
        .order_by(AutomationExecution.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0)


async def list_dispatcher_user_ids(db: AsyncSession, *, tenant_id: UUID) -> list[UUID]:
    result = await db.execute(
        select(Membership.user_id).where(
            Membership.tenant_id == tenant_id,
            Membership.status == "active",
            Membership.role.in_(("owner", "admin", "dispatcher")),
        )
    )
    return list(result.scalars().all())


async def create_notification(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID | None,
    title: str,
    message: str,
    type: str = "info",
) -> Notification:
    notification = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        title=title,
        message=message,
        type=type,
    )
    db.add(notification)
    await db.flush()
    return notification


_NOTIFICATION_ROLES = frozenset({"owner", "admin", "dispatcher"})


def _notification_filter(tenant_id: UUID, user_id: UUID, role: str | None):
    base = [Notification.tenant_id == tenant_id]
    if role not in _NOTIFICATION_ROLES:
        base.append(Notification.user_id == user_id)
    return base


async def list_notifications(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Notification], int, int]:
    filters = _notification_filter(tenant_id, user_id, role)
    total = await db.scalar(select(func.count()).select_from(Notification).where(*filters))
    unread = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(*filters, Notification.read_at.is_(None))
    )
    result = await db.execute(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all()), int(total or 0), int(unread or 0)


async def get_notification(
    db: AsyncSession, *, tenant_id: UUID, notification_id: UUID
) -> Notification | None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.tenant_id == tenant_id,
        )
    )
    return result.scalar_one_or_none()


async def mark_notification_read(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    notification_id: UUID,
    user_id: UUID,
    role: str | None,
) -> Notification | None:
    notification = await get_notification(db, tenant_id=tenant_id, notification_id=notification_id)
    if notification is None:
        return None
    if role not in _NOTIFICATION_ROLES and notification.user_id != user_id:
        return None
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await db.flush()
    return notification


async def mark_all_notifications_read(
    db: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str | None,
) -> int:
    filters = _notification_filter(tenant_id, user_id, role)
    result = await db.execute(select(Notification).where(*filters, Notification.read_at.is_(None)))
    notifications = result.scalars().all()
    now = datetime.now(UTC)
    for notification in notifications:
        notification.read_at = now
    await db.flush()
    return len(list(notifications))
