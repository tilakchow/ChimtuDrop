import time
import asyncio
from pathlib import Path
from typing import Optional
from .config import settings

class StorageManager:
    def __init__(self):
        self.extractions: dict[str, dict] = {} # extraction_id -> metadata cache
        self.downloads: dict[str, dict] = {}   # download_id -> { file_path, filename, size, expires_at }
        self.cleanup_task: Optional[asyncio.Task] = None

    def save_extraction(self, extraction_id: str, data: dict):
        self.extractions[extraction_id] = {
            "data": data,
            "created_at": time.time(),
        }

    def get_extraction(self, extraction_id: str) -> Optional[dict]:
        entry = self.extractions.get(extraction_id)
        if not entry:
            return None
        # Invalidate after 2 hours
        if time.time() - entry["created_at"] > 7200:
            del self.extractions[extraction_id]
            return None
        return entry["data"]

    def register_download(self, download_id: str, file_path: Path, filename: str) -> dict:
        expires_at = time.time() + settings.file_ttl_seconds
        size = file_path.stat().st_size if file_path.exists() else 0
        record = {
            "file_path": file_path,
            "filename": filename,
            "file_size": size,
            "expires_at": expires_at,
        }
        self.downloads[download_id] = record
        return record

    def get_download(self, download_id: str) -> Optional[dict]:
        record = self.downloads.get(download_id)
        if not record:
            return None
        if time.time() > record["expires_at"]:
            self.delete_download(download_id)
            return None
        if not record["file_path"].exists():
            del self.downloads[download_id]
            return None
        return record

    def delete_download(self, download_id: str):
        record = self.downloads.pop(download_id, None)
        if record and record["file_path"].exists():
            try:
                record["file_path"].unlink(missing_ok=True)
            except Exception:
                pass

    async def start_periodic_cleanup(self):
        while True:
            try:
                await asyncio.sleep(300) # Run cleanup every 5 minutes
                now = time.time()
                # Clean expired downloads
                expired_keys = [k for k, v in self.downloads.items() if now > v["expires_at"]]
                for k in expired_keys:
                    self.delete_download(k)

                # Clean orphaned temp files in directory
                for f in settings.storage_dir.glob("*"):
                    if f.is_file():
                        try:
                            if now - f.stat().st_mtime > settings.file_ttl_seconds:
                                f.unlink(missing_ok=True)
                        except Exception:
                            pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Cleanup Error] {e}")

storage_manager = StorageManager()
