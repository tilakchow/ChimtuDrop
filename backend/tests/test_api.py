import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["ytdlp_available"] is True
    assert "version" in data
    assert "ffmpeg_available" in data

def test_ssrf_protection_private_ip():
    # Attempting to query internal metadata service or localhost
    res = client.post("/api/extract", json={"url": "http://127.0.0.1:8000/internal"})
    assert res.status_code == 400
    assert "Security violation" in res.json()["detail"] or "Unsupported" in res.json()["detail"]

def test_unsupported_domain_rejected():
    res = client.post("/api/extract", json={"url": "https://github.com/some/unsupported/video"})
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "Unsupported link" in detail or "Cannot resolve domain" in detail

def test_instagram_stories_rejected():
    res = client.post("/api/extract", json={"url": "https://www.instagram.com/stories/some_user/123456789/"})
    assert res.status_code == 403
    assert "Stories require authenticated account access" in res.json()["detail"]

def test_direct_mp4_extraction():
    url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
    res = client.post("/api/extract", json={"url": url})
    assert res.status_code == 200
    data = res.json()
    assert data["platform"] == "direct"
    assert data["media_type"] == "video"
    assert len(data["items"]) > 0
    assert data["items"][0]["url"] == url
    assert "extraction_id" in data

def test_download_nonexistent_extraction():
    res = client.post("/api/download", json={"extraction_id": "nonexistent_fake_id", "format_id": "best"})
    assert res.status_code == 404
    assert "expired or not found" in res.json()["detail"].lower()

def test_serve_nonexistent_download():
    res = client.get("/api/download/nonexistent_dl_id")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
