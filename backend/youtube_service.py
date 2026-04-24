import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY", "")
BASE_URL = "https://www.googleapis.com/youtube/v3"

def extract_video_id(url):
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11})",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def extract_playlist_id(url):
    match = re.search(r"list=([A-Za-z0-9_-]+)", url)
    return match.group(1) if match else None

def parse_duration(iso_duration):
    pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
    match = re.match(pattern, iso_duration)

    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    return hours * 3600 + minutes * 60 + seconds

def get_video_metadata(video_id):
    resp = requests.get(f"{BASE_URL}/videos", params = {
        "key" : API_KEY,
        "id" : video_id,
        "part" : "snippet,contentDetails",
    })

    print(resp.json())

get_video_metadata("VXtjG_GzO7Q")