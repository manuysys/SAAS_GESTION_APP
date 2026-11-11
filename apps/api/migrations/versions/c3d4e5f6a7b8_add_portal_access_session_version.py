"""add portal access session version

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column(
            "portal_access_version",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_invitations_role",
        "invitations",
        "role IN ('admin', 'dispatcher', 'technician', 'viewer')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_invitations_role", "invitations", type_="check")
    op.drop_column("customers", "portal_access_version")
