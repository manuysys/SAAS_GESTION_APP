from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class WorkOrderMaterial(UUIDMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "work_order_materials"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "work_order_id",
            "client_request_id",
            name="uq_work_order_materials_tenant_order_client",
        ),
    )

    work_order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="unit", nullable=False)
    client_request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
