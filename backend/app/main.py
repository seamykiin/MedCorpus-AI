from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers import (
    auth_router,
    reports_router,
    voice_router,
    plain_language_router,
    flags_router,
    mini_doctor_router,
    llm_router,
    profile_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for MedCorpus AI — Medical reports, clearly summarized. Separating extracted facts from generated interpretation with source traceability.",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(voice_router)
app.include_router(plain_language_router)
app.include_router(flags_router)
app.include_router(mini_doctor_router)
app.include_router(llm_router)
app.include_router(profile_router)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "message": "MedCorpus AI Backend is operational."
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
