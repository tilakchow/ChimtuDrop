import hashlib
import time
from typing import Any
import yt_dlp
from fastapi import HTTPException
from .config import settings
from .schemas import ExtractResponse, QualityFormat, MediaItemSchema
from .storage import storage_manager

def format_quality_label(height: int | None, format_note: str | None) -> str:
    if height:
        if height >= 1080:
            return f"{height}p Full HD"
        elif height >= 720:
            return f"{height}p HD"
        else:
            return f"{height}p"
    return format_note or "Standard Quality"

# In-memory short-lived metadata cache (5 minutes TTL)
# Key: normalized_url -> (timestamp, ExtractResponse, storage_record)
_EXTRACTION_CACHE: dict[str, tuple[float, ExtractResponse, dict]] = {}
CACHE_TTL_SECONDS = 300

class MediaExtractor:
    def extract_info(self, url: str, platform: str) -> ExtractResponse:
        now = time.time()

        # 1. Check in-memory short-lived cache for instant response
        if url in _EXTRACTION_CACHE:
            cached_time, cached_response, cached_record = _EXTRACTION_CACHE[url]
            if now - cached_time < CACHE_TTL_SECONDS:
                # Re-register extraction in storage manager so download session stays active
                storage_manager.save_extraction(cached_response.extraction_id, cached_record)
                return cached_response

        # 2. For direct files, handle instantly without invoking extractor
        if platform == "direct":
            filename = url.split("?")[0].split("/")[-1] or "media"
            is_video = any(url.lower().endswith(ext) for ext in (".mp4", ".m4v", ".mov", ".webm"))
            item = MediaItemSchema(
                id=f"direct_{int(now)}",
                type="video" if is_video else "image",
                url=url,
                thumbnail_url=url if not is_video else None,
                qualities=[
                    QualityFormat(
                        id="original",
                        label="Best Available Quality",
                        url=url,
                        ext="mp4" if is_video else "jpg",
                        has_video=is_video,
                        has_audio=is_video,
                        direct_url=url,
                    )
                ] if is_video else None,
            )
            extraction_id = hashlib.sha256(f"{url}_{now}".encode()).hexdigest()[:16]
            response = ExtractResponse(
                extraction_id=extraction_id,
                platform="direct",
                original_url=url,
                canonical_url=url,
                title=filename,
                media_type="video" if is_video else "image",
                thumbnail_url=url if not is_video else None,
                items=[item],
                formats=item.qualities or [],
                download_endpoint=f"/api/download?id={extraction_id}",
                retrieved_at=int(now * 1000),
            )
            record = {"url": url, "info": {}, "platform": platform}
            storage_manager.save_extraction(extraction_id, record)
            _EXTRACTION_CACHE[url] = (now, response, record)
            return response

        # 3. Configure yt-dlp with optimized performance flags
        ydl_opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": False,
            "noplaylist": True,
            "no_color": True,
            "socket_timeout": 12,
            # Performance optimization: skip downloading large DASH XML manifests for YouTube
            "youtube_include_dash_manifest": False,
            "lazy_playlist": True,
        }

        # Optional cookies authentication from environment/config
        if settings.cookies_file and settings.cookies_file.exists():
            ydl_opts["cookiefile"] = str(settings.cookies_file)

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            lowered = err_msg.lower()

            if "empty media response" in lowered or "cookies" in lowered:
                raise HTTPException(
                    status_code=403,
                    detail="This Instagram post is private, age-restricted, or requires login to view."
                )
            elif "no video could be found" in lowered:
                raise HTTPException(
                    status_code=404,
                    detail="No video found in this post/tweet. Please ensure the link contains a video."
                )
            elif "private" in lowered or "login" in lowered:
                raise HTTPException(
                    status_code=403,
                    detail="This content is private or requires account login."
                )
            elif "not found" in lowered or "deleted" in lowered or "404" in lowered:
                raise HTTPException(
                    status_code=404,
                    detail="The requested media was not found or has been removed."
                )
            elif "cannot parse data" in lowered:
                raise HTTPException(
                    status_code=422,
                    detail="This post or reel is restricted or not accessible publicly."
                )
            elif "unsupported url" in lowered:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported URL format. Please paste a supported link."
                )
            else:
                raise HTTPException(
                    status_code=422,
                    detail=f"Media extraction failed: {err_msg[:120]}"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected extraction error: {str(e)[:120]}")

        if not info:
            raise HTTPException(status_code=404, detail="No media streams could be located for this link.")

        raw_title = (info.get("title") or "").strip()
        description = (info.get("description") or "").strip()
        lowered_title = raw_title.lower()

        # Clean author-centric titles ("Video by xyz", "Post by xyz")
        if not raw_title or any(lowered_title.startswith(p) for p in ("video by", "post by", "tweet by", "reel by")):
            first_line = description.split("\n")[0].strip() if description else ""
            if first_line and len(first_line) > 3 and not any(first_line.lower().startswith(p) for p in ("video by", "post by")):
                title = first_line[:60]
            else:
                title = f"{platform.capitalize()} Video" if info.get("_type") != "image" else f"{platform.capitalize()} Photo"
        else:
            title = raw_title[:80]

        thumbnail = info.get("thumbnail")
        if not thumbnail and info.get("thumbnails"):
            valid_thumbs = [t.get("url") for t in info["thumbnails"] if t.get("url")]
            if valid_thumbs:
                thumbnail = valid_thumbs[-1]
        duration = info.get("duration")

        # Organize available formats
        raw_formats = info.get("formats", [])
        dedup_formats: dict[int, QualityFormat] = {}
        processed_formats: list[QualityFormat] = []

        extraction_id = hashlib.sha256(f"{url}_{now}".encode()).hexdigest()[:16]

        for fmt in raw_formats:
            fmt_id = fmt.get("format_id", "")
            height = fmt.get("height")
            vcodec = fmt.get("vcodec", "none")
            acodec = fmt.get("acodec", "none")
            has_video = vcodec != "none"
            has_audio = acodec != "none"

            # Filter video formats with meaningful resolution
            if has_video and height and height >= 144:
                if height not in dedup_formats or (has_audio and not dedup_formats[height].has_audio):
                    direct_stream_url = fmt.get("url") if has_audio else None
                    download_url = direct_stream_url or f"/api/download?id={extraction_id}&format_id={fmt_id}"
                    dedup_formats[height] = QualityFormat(
                        id=fmt_id,
                        label=format_quality_label(height, fmt.get("format_note")),
                        url=download_url,
                        resolution=f"{fmt.get('width', 0)}x{height}",
                        width=fmt.get("width"),
                        height=height,
                        ext="mp4",
                        filesize_approx=fmt.get("filesize") or fmt.get("filesize_approx"),
                        has_video=True,
                        has_audio=has_audio,
                        direct_url=download_url,
                    )

        # Sort formats highest resolution first
        sorted_heights = sorted(dedup_formats.keys(), reverse=True)
        for h in sorted_heights:
            processed_formats.append(dedup_formats[h])

        # If platform is Instagram, X, or Facebook: enforce Best Available default
        if platform in ("instagram", "x", "facebook") or not processed_formats:
            best_download_url = f"/api/download?id={extraction_id}&format_id=best"
            best_format = QualityFormat(
                id="best",
                label="Best Available Quality",
                url=best_download_url,
                ext="mp4",
                has_video=True,
                has_audio=True,
                direct_url=best_download_url,
            )
            # Insert at top for automatic max quality
            processed_formats.insert(0, best_format)

        # Resolve real playable direct preview URL if available
        preview_url = None
        if platform == "direct" and url.lower().endswith((".mp4", ".mov", ".m4v", ".webm")):
            preview_url = url
        else:
            playable_candidates = [
                f for f in raw_formats
                if f.get("vcodec") != "none"
                and f.get("acodec") != "none"
                and f.get("url", "").startswith("http")
                and ".m3u8" not in f.get("url", "")
            ]
            if playable_candidates:
                # Pick balanced resolution for fast streaming preview (~480p to 720p)
                playable_candidates.sort(key=lambda f: f.get("height") or 0)
                selected_candidate = next(
                    (c for c in reversed(playable_candidates) if (c.get("height") or 0) <= 720),
                    playable_candidates[-1]
                )
                preview_url = selected_candidate.get("url")
            elif info.get("url") and info.get("url", "").startswith("http") and ".m3u8" not in info.get("url", ""):
                preview_url = info.get("url")

        best_url = (
            processed_formats[0].url
            if processed_formats
            else f"/api/download?id={extraction_id}"
        )

        media_item = MediaItemSchema(
            id=f"{platform}_{info.get('id', int(now))}",
            type="video",
            url=best_url,
            thumbnail_url=thumbnail,
            preview_url=preview_url,
            width=info.get("width"),
            height=info.get("height"),
            qualities=processed_formats,
        )

        response = ExtractResponse(
            extraction_id=extraction_id,
            platform=platform, # type: ignore
            original_url=url,
            canonical_url=info.get("webpage_url") or url,
            title=title,
            media_type="video",
            thumbnail_url=thumbnail,
            duration_seconds=duration,
            author=None, # Stripped to keep UI clean and minimalist
            items=[media_item],
            formats=processed_formats,
            download_endpoint=f"/api/download?id={extraction_id}",
            retrieved_at=int(now * 1000),
        )

        record = {
            "url": url,
            "info": info,
            "platform": platform,
            "formats": processed_formats,
        }
        storage_manager.save_extraction(extraction_id, record)
        _EXTRACTION_CACHE[url] = (now, response, record)

        return response

media_extractor = MediaExtractor()
