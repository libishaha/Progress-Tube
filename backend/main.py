from fastapi import FastAPI, HTTPException
import database as db
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProgressTube API")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_headers = ["*"],
    allow_methods = ["*"]
)

class AddCourseRequest(BaseModel):
    youtube_url: str
    thumbnail: str
    title: str
    total_duration_seconds: int = 0
    total_videos: int = 1
    type: str = 'video'

class UpdateProgressRequest(BaseModel):
    watched_seconds: int

@app.get("/")
def root():
    return {"message" : "Progress Tube backend is live!"}

@app.get("/courses")
def get_courses():
    courses = db.query("SELECT * FROM courses ORDER BY created_at DESC")
    for c in courses:
        total = c["total_duration_seconds"]
        watched = c["watched_seconds"]
        c["completed_percentage"] = round((watched / total * 100) if total > 0 else 0, 1)
    return courses

@app.post("/courses")
def add_courses(req: AddCourseRequest):
    course_id = db.execute(
        "INSERT INTO courses(youtube_url, thumbnail, title, total_duration_seconds, total_videos, type) VALUES (%s, %s, %s, %s, %s, %s)",
        (req.youtube_url, req.thumbnail, req.title, req.total_duration_seconds, req.total_videos, req.type)
    )
    return {"message" : "Course added", "course_id" : course_id}

@app.put("/courses/{course_id}/progress")
def update_progress(course_id: int, req: UpdateProgressRequest):
    courses = db.query(
        "SELECT * FROM courses WHERE id = %s", (course_id,), fetchall=False
    )

    if not courses:
        raise HTTPException(status_code=404, detail="Course not found")

    total = courses["total_duration_seconds"]
    watched = min(req.watched_seconds, total)

    if watched == 0:
        status = "not_started"
    elif watched >= total:
        status = "completed"
    else:
        status = "in_progress"
    
    certificate = 1 if status == "completed" else courses["certificate_earned"]

    db.execute(
        "UPDATE courses SET watched_seconds = %s, status = %s, certificate_earned = %s WHERE id = %s",
        (watched, status, certificate, course_id)
    )

    if status == "completed" and not courses["certificate_earned"]:
        db.execute(
            "INSERT INTO trophies(course_id, trophy_type) VALUES(%s, %s)",
            (course_id, "video_complete")
        )
    
    completion_percent = round((watched / total * 100) if total > 0 else 0, 1)
    return{
        "status" : status,
        "completion_percent" : completion_percent,
        "certificate_earned" : bool(certificate)
    }

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
    return {"message" : "Deleted"}

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