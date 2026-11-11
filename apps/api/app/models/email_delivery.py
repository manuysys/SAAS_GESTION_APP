from __future__ import annotations

from uuid import UUID

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class EmailDelivery(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "email_deliveries"

    tenant_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    to_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    template: Mapped[str] = mapped_column(String(80), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
