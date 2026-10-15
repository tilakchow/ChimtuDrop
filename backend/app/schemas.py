from typing import Optional, Literal
from pydantic import BaseModel, Field, HttpUrl

class ExtractRequest(BaseModel):
    url: str = Field(..., description="The media URL to extract (Instagram, YouTube, X, Facebook, or Direct)")

class QualityFormat(BaseModel):
    id: str
    label: str
    url: Optional[str] = None
    resolution: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    ext: str = "mp4"
    filesize_approx: Optional[int] = None
    has_video: bool = True
    has_audio: bool = True
    direct_url: Optional[str] = None

class MediaItemSchema(BaseModel):
    id: str
    type: Literal["video", "image"]
    url: str
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size_bytes: Optional[int] = None
    qualities: Optional[list[QualityFormat]] = None

class ExtractResponse(BaseModel):
    extraction_id: str
    platform: Literal["instagram", "x", "youtube", "facebook", "direct"]
    original_url: str
    canonical_url: str
    title: str
    media_type: Literal["video", "image", "carousel"]
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    author: Optional[dict] = None
    items: list[MediaItemSchema]
    formats: list[QualityFormat]
    download_endpoint: str
    retrieved_at: int

class DownloadRequest(BaseModel):
    extraction_id: str = Field(..., description="The extraction ID returned from /api/extract")
    format_id: Optional[str] = Field("best", description="Specific format ID or 'best' / 'audio'")
    audio_only: Optional[bool] = Field(False, description="Convert and extract MP3 audio only")

class DownloadResponse(BaseModel):
    download_id: str
    status: Literal["ready", "processing", "failed"]
    filename: str
    file_size_bytes: int
    download_url: str
    expires_in_seconds: int
    message: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    ytdlp_available: bool
    ytdlp_version: str
    ffmpeg_available: bool
    storage_active: bool
    timestamp: float
