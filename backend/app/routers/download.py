from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from ..schemas import DownloadRequest, DownloadResponse
from ..downloader import media_downloader
from ..storage import storage_manager

router = APIRouter(prefix="/api", tags=["Download"])

@router.get("/download")
def download_stream(
    id: str | None = None,
    extraction_id: str | None = None,
    format_id: str = "best",
    audio_only: bool = False,
):
    target_id = id or extraction_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing extraction_id or id parameter.")

    result = media_downloader.download(
        extraction_id=target_id,
        format_id=format_id,
        audio_only=audio_only,
    )
    download_id = result["download_id"]
    record = storage_manager.get_download(download_id)
    if not record:
        raise HTTPException(status_code=500, detail="Download staging failed.")

    import time
    from email.utils import formatdate
    now_http = formatdate(time.time(), usegmt=True)

    return FileResponse(
        path=record["file_path"],
        filename=record["filename"],
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{record["filename"]}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Last-Modified": now_http,
        },
    )

@router.post("/download", response_model=DownloadResponse)
def prepare_download(payload: DownloadRequest, request: Request):
    result = media_downloader.download(
        extraction_id=payload.extraction_id,
        format_id=payload.format_id or "best",
        audio_only=payload.audio_only or False,
    )
    download_id = result["download_id"]
    download_url = f"/api/download/{download_id}"

    return DownloadResponse(
        download_id=download_id,
        status="ready",
        filename=result["filename"],
        file_size_bytes=result["file_size"],
        download_url=download_url,
        expires_in_seconds=result["expires_in_seconds"],
    )

@router.get("/download/{download_id}")
def serve_download(download_id: str):
    record = storage_manager.get_download(download_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail="Download not found or file has expired. Please initiate a new download."
        )

    file_path = record["file_path"]
    filename = record["filename"]

    import time
    from email.utils import formatdate
    now_http = formatdate(time.time(), usegmt=True)

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Last-Modified": now_http,
        },
    )
