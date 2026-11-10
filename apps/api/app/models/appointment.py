from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.work_order import WorkOrder


class Appointment(UUIDMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "appointments"

    work_order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    technician_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="appointments")  # noqa: UP037
