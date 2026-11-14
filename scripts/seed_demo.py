"""Wrapper local para resetear/sembrar el tenant demo `servicios-demo`.

Uso:
    uv run python scripts/seed_demo.py

Requiere que PostgreSQL local esté corriendo (scripts/db-start.ps1).
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
API_ROOT = REPO_ROOT / "apps" / "api"
sys.path.insert(0, str(API_ROOT))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.models import Membership, Tenant, User
from app.services.demo_service import reset_demo

DEFAULT_DATABASE_URL = "postgresql+asyncpg://saas:saas_dev_password@127.0.0.1:55432/saas_gestion"


async def main() -> None:
    database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    engine = create_async_engine(database_url, echo=False, future=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        tenant = await session.scalar(select(Tenant).where(Tenant.slug == "servicios-demo"))

        if tenant is None:
            tenant = Tenant(name="Servicios Demo", slug="servicios-demo")
            session.add(tenant)
            await session.flush()
            print(f"Tenant demo creado: {tenant.id}")

        user = await session.scalar(select(User).limit(1))
        if user is None:
            user = User(
                email="demo@saasgestion.com",
                password_hash=hash_password("Demo12345!"),
                full_name="Demo Local",
            )
            session.add(user)
            await session.flush()
            membership = Membership(
                tenant_id=tenant.id,
                user_id=user.id,
                role="owner",
                status="active",
            )
            session.add(membership)
            await session.flush()
            print(f"Usuario demo creado: {user.email}")

        result = await reset_demo(session, actor_user_id=user.id)
        await session.commit()

    await engine.dispose()

    print("Demo seed completado.")
    print(f"tenant_id: {result['tenant_id']}")
    for key, value in result["counts"].items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
