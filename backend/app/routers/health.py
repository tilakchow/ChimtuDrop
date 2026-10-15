import shutil
import time
import yt_dlp
from fastapi import APIRouter
from ..schemas import HealthResponse
from ..config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
def get_health():
    ffmpeg_on_path = shutil.which("ffmpeg") is not None
    ytdlp_ver = getattr(yt_dlp, "__version__", "unknown")
    storage_ok = settings.storage_dir.exists() and settings.storage_dir.is_dir()

    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
        ytdlp_available=True,
        ytdlp_version=str(ytdlp_ver),
        ffmpeg_available=ffmpeg_on_path,
        storage_active=storage_ok,
        timestamp=time.time(),
    )
