"""
ReviveAI — Database Engine

Async SQLAlchemy setup with SQLite (aiosqlite driver).
Schema is normalized and migration-ready for PostgreSQL.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# Create async engine — check_same_thread is SQLite-specific
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables and run non-destructive schema migrations on application startup."""
    # Import all models to register them with Base.metadata
    import app.models  # noqa: F401

    def _migrate_schema(connection):
        Base.metadata.create_all(connection)
        # For SQLite: check and add missing columns to merchants table
        try:
            res = connection.exec_driver_sql("PRAGMA table_info(merchants)")
            existing_cols = {row[1] for row in res.fetchall()}
            
            new_columns = [
                ("industry", "VARCHAR(100)"),
                ("currency", "VARCHAR(10) DEFAULT 'INR'"),
                ("country", "VARCHAR(50) DEFAULT 'IN'"),
                ("average_order_value_inr", "FLOAT DEFAULT 0.0"),
                ("primary_recovery_goals", "VARCHAR(500)"),
                ("primary_payment_types", "VARCHAR(500)"),
                ("onboarding_state", "VARCHAR(50) DEFAULT 'NEW_USER'"),
            ]
            for col_name, col_def in new_columns:
                if col_name not in existing_cols:
                    connection.exec_driver_sql(f"ALTER TABLE merchants ADD COLUMN {col_name} {col_def}")
        except Exception:
            pass

    async with engine.begin() as conn:
        await conn.run_sync(_migrate_schema)

