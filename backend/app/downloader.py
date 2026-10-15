import uuid
import re
import os
import time
import datetime
from pathlib import Path
from typing import Any
import yt_dlp
from fastapi import HTTPException
from .config import settings
from .storage import storage_manager

def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', name)
    return cleaned[:60]

class MediaDownloader:
    def download(self, extraction_id: str, format_id: str = "best", audio_only: bool = False) -> dict:
        cached = storage_manager.get_extraction(extraction_id)
        if not cached:
            raise HTTPException(
                status_code=404,
                detail="Extraction session expired or not found. Please re-extract the media URL."
            )

        url = cached["url"]
        download_id = f"dl_{uuid.uuid4().hex[:12]}"
        output_template = str(settings.storage_dir / f"{download_id}_%(title).50s.%(ext)s")

        if cached.get("platform") == "direct" or url.lower().endswith((".mp4", ".mov", ".m4v", ".webm", ".jpg", ".jpeg", ".png", ".webp")):
            import httpx
            clean_url = url.split("?")[0]
            ext = Path(clean_url).suffix.lstrip(".") or "mp4"
            target_file = settings.storage_dir / f"{download_id}_direct.{ext}"
            time_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            user_facing_filename = f"media_{time_str}.{ext}"

            try:
                with httpx.Client(timeout=60.0, follow_redirects=True) as client:
                    with client.stream("GET", url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}) as response:
                        if response.status_code >= 400:
                            raise HTTPException(status_code=422, detail=f"Failed to download direct file: HTTP {response.status_code}")
                        total_bytes = 0
                        with open(target_file, "wb") as f:
                            for chunk in response.iter_bytes(chunk_size=65536):
                                total_bytes += len(chunk)
                                if total_bytes > settings.max_file_size_bytes:
                                    raise HTTPException(status_code=413, detail="File exceeds maximum allowed size.")
                                f.write(chunk)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Direct file retrieval failed: {str(e)[:200]}")

            now_ts = time.time()
            try:
                os.utime(target_file, (now_ts, now_ts))
            except Exception:
                pass

            record = storage_manager.register_download(download_id, target_file, user_facing_filename)
            return {
                "download_id": download_id,
                "filename": user_facing_filename,
                "file_size": record["file_size"],
                "expires_in_seconds": settings.file_ttl_seconds,
            }

        now_utc = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        ydl_opts: dict[str, Any] = {
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
            "no_color": True,
            "max_filesize": settings.max_file_size_bytes,
            "socket_timeout": 30,
            "updatetime": False,  # DO NOT set file mtime to the original video upload date
            "postprocessor_args": {
                "ffmpeg": ["-metadata", f"creation_time={now_utc}"]
            },
        }

        if audio_only:
            ydl_opts["format"] = "bestaudio/best"
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }]
        elif format_id and format_id != "best":
            # Ensure video + audio muxing if format is video-only
            ydl_opts["format"] = f"{format_id}+bestaudio/best"
            ydl_opts["merge_output_format"] = "mp4"
        else:
            ydl_opts["format"] = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
            ydl_opts["merge_output_format"] = "mp4"

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
        except yt_dlp.utils.DownloadError as e:
            raise HTTPException(status_code=422, detail=f"Download execution failed: {str(e)[:200]}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Server download error: {str(e)[:200]}")

        # Locate the downloaded file
        matching_files = list(settings.storage_dir.glob(f"{download_id}_*"))
        if not matching_files:
            raise HTTPException(status_code=500, detail="Downloaded media file could not be verified on server storage.")

        target_file = matching_files[0]
        ext = target_file.suffix.replace(".", "").lower()

        # Update MP4 container creation_time metadata so Android gallery places it at current time
        if ext == "mp4":
            import subprocess
            try:
                temp_remux = target_file.with_name(f"fixed_{target_file.name}")
                cmd = [
                    "ffmpeg", "-y", "-i", str(target_file),
                    "-c", "copy",
                    "-metadata", f"creation_time={now_utc}",
                    "-metadata:s:v", f"creation_time={now_utc}",
                    "-metadata:s:a", f"creation_time={now_utc}",
                    str(temp_remux)
                ]
                res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
                if res.returncode == 0 and temp_remux.exists() and temp_remux.stat().st_size > 0:
                    temp_remux.replace(target_file)
            except Exception:
                pass

        # Set file modification and access time to current download timestamp
        now_ts = time.time()
        try:
            os.utime(target_file, (now_ts, now_ts))
        except Exception:
            pass

        time_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        title = info.get("title") or ""
        clean_title = sanitize_filename(title).strip('_')
        if clean_title and clean_title.lower() not in ("video", "reel", "post", "tweet"):
            user_facing_filename = f"{clean_title}.{ext}"
        else:
            user_facing_filename = f"media_{time_str}.{ext}"

        record = storage_manager.register_download(download_id, target_file, user_facing_filename)
        return {
            "download_id": download_id,
            "filename": user_facing_filename,
            "file_size": record["file_size"],
            "expires_in_seconds": settings.file_ttl_seconds,
        }

media_downloader = MediaDownloader()
