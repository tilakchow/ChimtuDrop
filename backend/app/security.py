import ipaddress
import socket
from urllib.parse import urlparse
from fastapi import HTTPException

ALLOWED_DOMAINS = {
    # Instagram
    "instagram.com", "www.instagram.com", "instagr.am", "www.instagr.am",
    # YouTube
    "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
    # X / Twitter
    "twitter.com", "www.twitter.com", "x.com", "www.x.com",
    # Facebook
    "facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch",
}

DIRECT_EXTENSIONS = {
    ".mp4", ".m4v", ".mov", ".webm", ".jpg", ".jpeg", ".png", ".webp"
}

def is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_multicast or
            ip.is_reserved or
            ip.is_unspecified or
            str(ip).startswith("169.254.") # AWS / cloud metadata
        )
    except ValueError:
        return True

def validate_and_sanitize_url(url_str: str) -> tuple[str, str]:
    """
    Validates URL scheme, domain, and prevents SSRF to internal networks.
    Returns: (sanitized_url, detected_platform)
    """
    if not url_str or not isinstance(url_str, str):
        raise HTTPException(status_code=400, detail="A valid media URL is required.")

    trimmed = url_str.strip()
    if not trimmed.startswith(("http://", "https://")):
        trimmed = f"https://{trimmed}"

    try:
        parsed = urlparse(trimmed)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL structure.")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only HTTP and HTTPS protocols are allowed.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(status_code=400, detail="URL missing valid host.")

    # Anti-SSRF: Resolve hostname to verify destination IP is not private/internal
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_info:
            ip = sockaddr[0]
            if is_private_ip(ip):
                raise HTTPException(
                    status_code=400,
                    detail=f"Security violation: access to internal IP {ip} is strictly forbidden."
                )
    except socket.gaierror:
        raise HTTPException(status_code=400, detail=f"Cannot resolve domain '{hostname}'.")

    # Detect platform
    platform = None
    if any(d in hostname for d in ("instagram.com", "instagr.am")):
        platform = "instagram"
    elif any(d in hostname for d in ("youtube.com", "youtu.be")):
        platform = "youtube"
    elif any(d in hostname for d in ("twitter.com", "x.com")):
        platform = "x"
    elif any(d in hostname for d in ("facebook.com", "fb.watch")):
        platform = "facebook"
    elif any(parsed.path.lower().endswith(ext) for ext in DIRECT_EXTENSIONS):
        platform = "direct"

    if not platform:
        raise HTTPException(
            status_code=400,
            detail="Unsupported link. Supported platforms: Instagram, YouTube, X (Twitter), Facebook, and direct media files."
        )

    # Disallow Instagram stories without authentication
    if platform == "instagram" and "/stories/" in parsed.path.lower():
        raise HTTPException(
            status_code=403,
            detail="Instagram Stories require authenticated account access and cannot be retrieved anonymously."
        )

    # Clean tracking and referral query parameters (igsh, cplk, rpxt, fbclid, utm_*, etc.)
    cleaned_url = trimmed
    if platform == "instagram":
        clean_path = parsed.path.rstrip("/") + "/"
        cleaned_url = f"{parsed.scheme}://{parsed.netloc}{clean_path}"
    elif platform == "x":
        clean_path = parsed.path.rstrip("/")
        cleaned_url = f"{parsed.scheme}://{parsed.netloc}{clean_path}"
    elif platform == "youtube":
        from urllib.parse import parse_qs
        qs = parse_qs(parsed.query)
        v = qs.get("v")
        if v:
            cleaned_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}?v={v[0]}"
        else:
            cleaned_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    elif platform == "facebook":
        from urllib.parse import parse_qs
        qs = parse_qs(parsed.query)
        v = qs.get("v")
        if v:
            cleaned_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}?v={v[0]}"
        else:
            clean_path = parsed.path.rstrip("/") + "/"
            cleaned_url = f"{parsed.scheme}://{parsed.netloc}{clean_path}"

    return cleaned_url, platform
