from fastapi import APIRouter, Query
from ..schemas import ExtractRequest, ExtractResponse
from ..security import validate_and_sanitize_url
from ..extractor import media_extractor

router = APIRouter(prefix="/api", tags=["Extraction"])

@router.post("/extract", response_model=ExtractResponse)
def extract_media_post(payload: ExtractRequest):
    sanitized_url, platform = validate_and_sanitize_url(payload.url)
    return media_extractor.extract_info(sanitized_url, platform)

@router.get("/extract", response_model=ExtractResponse)
def extract_media_get(url: str = Query(..., description="Target media URL")):
    sanitized_url, platform = validate_and_sanitize_url(url)
    return media_extractor.extract_info(sanitized_url, platform)
