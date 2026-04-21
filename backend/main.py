from fastapi import FastAPI, HTTPException
import database as db
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ProgressTube API")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["https://localhost:5173"],
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
    course_id = db.query(
        "INSERT INTO courses(youtube_url, thumbnail, title, total_duration_seconds, total_videos, type) VALUES (%s, %s, %s, %s, %s, %s)",
        (req.youtube_url, req.thumbnail, req.title, req.total_duration_seconds, req.total_videos, req.type)
    )
    return {"message" : "Course added", "course_id" : course_id}

