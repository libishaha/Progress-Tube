from fastapi import FastAPI, HTTPException
import database as db
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import youtube_service as yt

app = FastAPI(title="ProgressTube API")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_headers = ["*"],
    allow_methods = ["*"]
)

# ─────────────────────────────────────────────
# Request models
# ─────────────────────────────────────────────

class AddCourseRequest(BaseModel):
    youtube_url: str

class UpdateProgressRequest(BaseModel):
    watched_seconds: int

class VideoProgressItem(BaseModel):
    video_id: str
    watched_seconds: int

class BulkProgressRequest(BaseModel):
    updates: List[VideoProgressItem]

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _upsert_playlist_videos(course_id: int, videos: list):
    """Insert or update rows in playlist_videos for a given course."""
    for v in videos:
        db.execute(
            """INSERT INTO playlist_videos
               (course_id, position, video_id, title, duration_seconds)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE
                 position         = VALUES(position),
                 title            = VALUES(title),
                 duration_seconds = VALUES(duration_seconds)
            """,
            (course_id, v["position"], v["video_id"], v["title"], v["duration_seconds"])
        )

def _recalc_course_from_videos(course_id: int):
    """Recompute watched_seconds / completed_percentage / status on courses
    from the current playlist_videos rows and persist it."""
    course = db.query(
        "SELECT * FROM courses WHERE id = %s", (course_id,), fetchall=False
    )
    if not course:
        return None

    total = course["total_duration_seconds"]

    agg = db.query(
        "SELECT COALESCE(SUM(watched_seconds),0) AS ws FROM playlist_videos WHERE course_id = %s",
        (course_id,), fetchall=False
    )
    watched = int(agg["ws"]) if agg else 0
    watched = min(watched, total)

    completed_percentage = round((watched / total) * 100) if total > 0 else 0

    if completed_percentage == 0:
        status = "not_started"
    elif completed_percentage >= 100:
        status = "completed"
    else:
        status = "in_progress"

    certificate = 1 if status == "completed" else course["certificate_earned"]

    db.execute(
        """UPDATE courses
           SET watched_seconds = %s, completed_percentage = %s,
               status = %s, certificate_earned = %s
           WHERE id = %s""",
        (watched, completed_percentage, status, certificate, course_id)
    )

    if status == "completed" and not course["certificate_earned"]:
        db.execute(
            "INSERT INTO trophies(course_id, trophy_type) VALUES(%s, %s)",
            (course_id, "video_complete")
        )

    return {
        "status": status,
        "completion_percent": round((watched / total * 100) if total > 0 else 0, 1),
        "certificate_earned": bool(certificate),
    }

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Progress Tube backend is live!"}

@app.get("/courses")
def get_courses():
    return db.query("SELECT * FROM courses ORDER BY created_at DESC")

@app.post("/courses")
def add_courses(req: AddCourseRequest):
    try:
        meta = yt.fetch_youtube_metadata(req.youtube_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {str(e)}")

    course_id = db.execute(
        """INSERT INTO courses
           (youtube_url, type, title, thumbnail, total_duration_seconds, total_videos)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (
            req.youtube_url,
            meta["type"],
            meta["title"],
            meta["thumbnail"],
            meta["total_duration_seconds"],
            meta["total_videos"],
        )
    )

    # For playlists: persist per-video rows
    if meta["type"] == "playlist" and meta.get("videos"):
        _upsert_playlist_videos(course_id, meta["videos"])

    return {
        "message": "Course added",
        "course_id": course_id,
        "title": meta["title"],
        "thumbnail": meta["thumbnail"],
        "total_duration_seconds": meta["total_duration_seconds"],
        "total_videos": meta["total_videos"],
        "type": meta["type"],
    }

# ── Single-video progress (unchanged) ────────

@app.put("/courses/{course_id}/progress")
def update_progress(course_id: int, req: UpdateProgressRequest):
    course = db.query(
        "SELECT * FROM courses WHERE id = %s", (course_id,), fetchall=False
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    total = (course["total_duration_seconds"] // 60) * 60
    watched = (min(req.watched_seconds, total) // 60) * 60
    completed_percentage = round((watched / total) * 100) if total > 0 else 0

    if completed_percentage == 0:
        status = "not_started"
    elif completed_percentage >= 100:
        status = "completed"
    else:
        status = "in_progress"

    certificate = 1 if status == "completed" else course["certificate_earned"]

    db.execute(
        """UPDATE courses
           SET watched_seconds = %s, completed_percentage = %s,
               status = %s, certificate_earned = %s
           WHERE id = %s""",
        (watched, completed_percentage, status, certificate, course_id)
    )

    if status == "completed" and not course["certificate_earned"]:
        db.execute(
            "INSERT INTO trophies(course_id, trophy_type) VALUES(%s, %s)",
            (course_id, "video_complete")
        )

    completion_percent = round((watched / total * 100) if total > 0 else 0, 1)
    return {
        "status": status,
        "completion_percent": completion_percent,
        "certificate_earned": bool(certificate)
    }

# ── Playlist: list videos ─────────────────────

@app.get("/courses/{course_id}/videos")
def get_playlist_videos(course_id: int):
    course = db.query(
        "SELECT id FROM courses WHERE id = %s", (course_id,), fetchall=False
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    videos = db.query(
        """SELECT id, position, video_id, title,
                  duration_seconds, watched_seconds, is_completed
           FROM playlist_videos
           WHERE course_id = %s
           ORDER BY position ASC""",
        (course_id,)
    )
    return videos  # empty list = needs rescan

# ── Playlist: rescan from YouTube ─────────────

@app.post("/courses/{course_id}/rescan")
def rescan_playlist(course_id: int):
    course = db.query(
        "SELECT * FROM courses WHERE id = %s", (course_id,), fetchall=False
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course["type"] != "playlist":
        raise HTTPException(status_code=400, detail="Only playlists can be rescanned")

    try:
        meta = yt.fetch_youtube_metadata(course["youtube_url"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {str(e)}")

    if not meta.get("videos"):
        raise HTTPException(status_code=502, detail="No videos returned from YouTube")

    # Upsert all videos (preserves existing watched_seconds)
    _upsert_playlist_videos(course_id, meta["videos"])

    # Update course totals in case playlist changed
    db.execute(
        """UPDATE courses
           SET total_duration_seconds = %s, total_videos = %s
           WHERE id = %s""",
        (meta["total_duration_seconds"], meta["total_videos"], course_id)
    )

    videos = db.query(
        """SELECT id, position, video_id, title,
                  duration_seconds, watched_seconds, is_completed
           FROM playlist_videos WHERE course_id = %s ORDER BY position ASC""",
        (course_id,)
    )
    return {"message": "Rescan complete", "videos": videos}

# ── Playlist: bulk progress update ────────────

@app.put("/courses/{course_id}/videos/bulk-progress")
def bulk_update_video_progress(course_id: int, req: BulkProgressRequest):
    course = db.query(
        "SELECT * FROM courses WHERE id = %s", (course_id,), fetchall=False
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for item in req.updates:
        # Fetch the video row to enforce max
        video = db.query(
            "SELECT * FROM playlist_videos WHERE course_id = %s AND video_id = %s",
            (course_id, item.video_id), fetchall=False
        )
        if not video:
            continue

        clamped = min(item.watched_seconds, video["duration_seconds"])
        is_completed = 1 if clamped >= video["duration_seconds"] and video["duration_seconds"] > 0 else 0

        db.execute(
            """UPDATE playlist_videos
               SET watched_seconds = %s, is_completed = %s
               WHERE course_id = %s AND video_id = %s""",
            (clamped, is_completed, course_id, item.video_id)
        )

    # Recalculate course-level totals
    result = _recalc_course_from_videos(course_id)
    return result

# ─────────────────────────────────────────────
# Other existing routes
# ─────────────────────────────────────────────

@app.delete("/courses/{course_id}")
def delete_course(course_id: int):
    course = db.query(
        "SELECT * FROM courses WHERE id = %s",
        (course_id,), fetchall=False
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.execute(
        "DELETE FROM courses where id = %s",
        (course_id,)
    )
    return {"message": "Deleted"}

@app.get("/dashboard")
def get_dashboard():
    stats = db.query(
        """
            SELECT
                COUNT(*) as total_courses,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_courses,
                SUM(CASE WHEN STATUS = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_courses,
                SUM(watched_seconds) AS total_watched_seconds
            FROM courses
        """
    , fetchall=False)

    trophies = db.query(
        "SELECT COUNT(*) AS total FROM trophies", fetchall = False
    )

    stats["total_trophies"] = trophies["total"]
    return stats

@app.get("/trophies")
def get_trophies():
    return db.query(
        """
            SELECT t.*, c.title
            FROM trophies t JOIN courses c
            ON c.id = t.course_id
            ORDER BY t.awarded_at DESC
        """
    )