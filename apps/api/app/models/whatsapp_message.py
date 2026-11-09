from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class WhatsAppMessage(UUIDMixin, Base):
    __tablename__ = "whatsapp_messages"
    __table_args__ = (Index("ix_whatsapp_messages_tenant_created", "tenant_id", "created_at"),)

    tenant_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    wa_message_id: Mapped[str | None] = mapped_column(
        String(120), unique=True, index=True, nullable=True
    )
    from_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    to_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="received", nullable=False)
    payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
