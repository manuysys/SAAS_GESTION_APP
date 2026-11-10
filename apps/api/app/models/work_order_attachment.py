from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class WorkOrderAttachment(UUIDMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "work_order_attachments"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "work_order_id",
            "client_request_id",
            name="uq_work_order_attachments_tenant_order_client",
        ),
    )

    work_order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("work_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    client_request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    uploaded_by_user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
