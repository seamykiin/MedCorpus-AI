import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.app.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

try:
    engine = create_async_engine(
        db_url,
        echo=False,
        connect_args=connect_args
    )
except Exception as e:
    logger.warning(f"Could not initialize primary database with {db_url}: {e}. Falling back to SQLite.")
    engine = create_async_engine(
        "sqlite+aiosqlite:///./medcorpus.db",
        echo=False,
        connect_args={"check_same_thread": False}
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Safe column additions if table was created previously
            columns_to_add = [
                ("specialty", "VARCHAR(255)"),
                ("license_number", "VARCHAR(100)"),
                ("hospital_affiliation", "VARCHAR(255)"),
                ("age", "INTEGER"),
                ("blood_group", "VARCHAR(20)"),
            ]
            for col_name, col_type in columns_to_add:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass

            report_cols = [
                ("clinician_signed_off", "BOOLEAN DEFAULT FALSE"),
                ("signed_off_by", "VARCHAR(255)"),
                ("signed_off_at", "TIMESTAMP"),
                ("clinician_notes", "TEXT"),
            ]
            for col_name, col_type in report_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass

            finding_cols = [
                ("is_overridden", "BOOLEAN DEFAULT FALSE"),
                ("override_notes", "TEXT"),
            ]
            for col_name, col_type in finding_cols:
                try:
                    await conn.execute(text(f"ALTER TABLE findings ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Database table sync note: {e}")
