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

    resp.raise_for_status()

    items = resp.json().get("items", [])
    if not items:
        raise ValueError(f"No video id found for video id: {video_id}")

    item = items[0]
    duration = parse_duration(item["contentDetails"]["duration"])
    thumbnail = (
        item["snippet"]["thumbnails"].get("high", {}).get("url") or
        item["snippet"]["thumbnails"].get("default", {}).get("url", {})
    )

    return{
        "type" : "video",
        "title" : item["snippet"]["title"],
        "thumbnail" : thumbnail,
        "total_duration_seconds" : duration,
        "total_videos" : 1
    }

def get_playlist_metadata(playlist_id):
    pl_resp = requests.get(f"{BASE_URL}/playlists", params={
        "key" : API_KEY,
        "id" : playlist_id,
        "part" : "snippet"
    })

    pl_resp.raise_for_status()
    pl_items = pl_resp.json().get("items", [])

    if not pl_items:
        raise ValueError(f"No playlist found for id: {playlist_id}")
    
    pl = pl_items[0]["snippet"]
    title = pl["title"]
    thumbnail = (
        pl["thumbnails"].get("high", {}).get("url") or
        pl["thumbnails"].get("default", {}).get("url", "")
    )

    video_ids = []
    next_page = None

    while True:
        params = {
            "key" : API_KEY,
            "playlistId" : playlist_id,
            "part" : "contentDetails",
            "maxResults" : 50
        }

        if next_page:
            params["pageToken"] = next_page

        items_resp = requests.get(f"{BASE_URL}/playlistItems", params=params)
        items_resp.raise_for_status()
        data = items_resp.json()

        for item in data.get("items", []):
            video_ids.append(item["contentDetails"]["videoId"])

        next_page = data.get("nextPageToken")
        if not next_page:
            break
    
    total_seconds = 0
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        vids_resp = requests.get(f"{BASE_URL}/videos", params={
            "key": API_KEY,
            "id": ",".join(batch),
            "part": "contentDetails",
        })
        vids_resp.raise_for_status()
        for v in vids_resp.json().get("items", []):
            total_seconds += parse_duration(v["contentDetails"]["duration"])

    return {
        "type": "playlist",
        "title": title,
        "thumbnail": thumbnail,
        "total_duration_seconds": total_seconds,
        "total_videos": len(video_ids),
    }

def fetch_youtube_metadata(url):
    playlist_id = extract_playlist_id(url)
    if playlist_id:
        return get_playlist_metadata(playlist_id)

    video_id = extract_video_id(url)
    if video_id:
        return get_video_metadata(video_id)

    raise ValueError("Could not detect a valid YouTube video or playlist URL.")