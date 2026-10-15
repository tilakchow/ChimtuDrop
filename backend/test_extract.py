import httpx
import re
import json

shortcode = "DegJAHGP41Y"
headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

with httpx.Client(timeout=10, follow_redirects=True, headers=headers) as client:
    r = client.get(f"https://www.instagram.com/p/{shortcode}/embed/captioned/")
    
    # Search for all mp4 links
    mp4s = re.findall(r'https?://[^"\'\s<>]+\.mp4[^"\'\s<>]*', r.text)
    print("Found direct mp4s in HTML:", len(mp4s))
    for m in mp4s[:3]:
        print("MP4:", m[:120])
        
    # Search for JSON blocks
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', r.text, re.DOTALL)
    print("Script tags count:", len(scripts))
    for i, s in enumerate(scripts):
        if "video" in s or "media" in s:
            print(f"Script {i} contains video/media (len {len(s)})")
            # Look for video_url or similar keys
            matches = re.findall(r'(\b[a-zA-Z0-9_]*video[a-zA-Z0-9_]*\b)', s, re.IGNORECASE)
            print("Video keywords:", set(matches[:5]))

