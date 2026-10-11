from backend.app.routers.auth import router as auth_router
from backend.app.routers.reports import router as reports_router
from backend.app.routers.voice import router as voice_router
from backend.app.routers.plain_language import router as plain_language_router
from backend.app.routers.flags import router as flags_router
from backend.app.routers.mini_doctor import router as mini_doctor_router
from backend.app.routers.llm import router as llm_router
from backend.app.routers.profile import router as profile_router

__all__ = [
    "auth_router",
    "reports_router",
    "voice_router",
    "plain_language_router",
    "flags_router",
    "mini_doctor_router",
    "llm_router",
    "profile_router",
]

