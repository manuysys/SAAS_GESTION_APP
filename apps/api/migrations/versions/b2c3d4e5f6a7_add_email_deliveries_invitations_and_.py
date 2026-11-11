"""add email deliveries, invitations and secure customer portal tokens

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "email_deliveries",
        sa.Column("tenant_id", sa.UUID(), nullable=True),
        sa.Column("to_email", sa.String(length=320), nullable=False),
        sa.Column("template", sa.String(length=80), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_email_deliveries_tenant_id"),
        "email_deliveries",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_deliveries_to_email"),
        "email_deliveries",
        ["to_email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_email_deliveries_idempotency_key"),
        "email_deliveries",
        ["idempotency_key"],
        unique=True,
    )

    op.create_table(
        "invitations",
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("invited_by", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_invitations_tenant_id"),
        "invitations",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invitations_email_normalized"),
        "invitations",
        ["email_normalized"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invitations_invited_by"),
        "invitations",
        ["invited_by"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invitations_token_hash"),
        "invitations",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_invitations_tenant_email_pending",
        "invitations",
        ["tenant_id", "email_normalized"],
        unique=True,
        postgresql_where=sa.text("accepted_at IS NULL AND revoked_at IS NULL"),
    )

    op.add_column(
        "customer_access_tokens",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "customer_access_tokens",
        sa.Column("created_by", sa.UUID(), nullable=True),
    )
    op.add_column(
        "customer_access_tokens",
        sa.Column(
            "purpose",
            sa.String(length=40),
            server_default="portal_access",
            nullable=False,
        ),
    )
    op.create_index(
        op.f("ix_customer_access_tokens_created_by"),
        "customer_access_tokens",
        ["created_by"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_customer_access_tokens_created_by_users",
        "customer_access_tokens",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_customer_access_tokens_created_by_users",
        "customer_access_tokens",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_customer_access_tokens_created_by"),
        table_name="customer_access_tokens",
    )
    op.drop_column("customer_access_tokens", "purpose")
    op.drop_column("customer_access_tokens", "created_by")
    op.drop_column("customer_access_tokens", "revoked_at")

    op.drop_index(
        "ix_invitations_tenant_email_pending",
        table_name="invitations",
    )
    op.drop_index(
        op.f("ix_invitations_token_hash"),
        table_name="invitations",
    )
    op.drop_index(
        op.f("ix_invitations_invited_by"),
        table_name="invitations",
    )
    op.drop_index(
        op.f("ix_invitations_email_normalized"),
        table_name="invitations",
    )
    op.drop_index(
        op.f("ix_invitations_tenant_id"),
        table_name="invitations",
    )
    op.drop_table("invitations")

    op.drop_index(
        op.f("ix_email_deliveries_idempotency_key"),
        table_name="email_deliveries",
    )
    op.drop_index(
        op.f("ix_email_deliveries_to_email"),
        table_name="email_deliveries",
    )
    op.drop_index(
        op.f("ix_email_deliveries_tenant_id"),
        table_name="email_deliveries",
    )
    op.drop_table("email_deliveries")
