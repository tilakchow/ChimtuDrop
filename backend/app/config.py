import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    app_name: str = "ChimtuDrop Media Retrieval API"
    version: str = "2.1.0"
    port: int = int(os.getenv("PORT", "8000"))
    host: str = os.getenv("HOST", "0.0.0.0")
    cors_origins: list[str] = ["*"]
    
    # Storage settings
    storage_dir: Path = BASE_DIR / "temp_downloads"
    file_ttl_seconds: int = int(os.getenv("FILE_TTL_SECONDS", "1800")) # 30 min expiration
    max_file_size_bytes: int = int(os.getenv("MAX_FILE_SIZE_MB", "250")) * 1024 * 1024 # 250 MB
    request_timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "45"))
    max_concurrent_downloads: int = int(os.getenv("MAX_CONCURRENT_DOWNLOADS", "5"))
    cookies_file: Path | None = (
        (BASE_DIR / os.getenv("COOKIES_FILE", "cookies.txt"))
        if (BASE_DIR / os.getenv("COOKIES_FILE", "cookies.txt")).exists()
        else None
    )

settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
