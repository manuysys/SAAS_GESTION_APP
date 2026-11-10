from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.quote import Quote


class WorkOrder(UUIDMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "work_orders"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_work_orders_tenant_code"),)

    customer_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    service_request_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)
    commercial_status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    operational_status: Mapped[str] = mapped_column(
        String(20), default="new", nullable=False, index=True
    )
    payment_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    assigned_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    appointments: Mapped[list["Appointment"]] = relationship(  # noqa: UP037
        back_populates="work_order",
        cascade="save-update, merge",
        passive_deletes=True,
    )
    quotes: Mapped[list["Quote"]] = relationship(  # noqa: UP037
        back_populates="work_order",
        cascade="save-update, merge",
        passive_deletes=True,
    )


class WorkOrderEvent(UUIDMixin, Base):
    __tablename__ = "work_order_events"

    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    work_order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    client_request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
