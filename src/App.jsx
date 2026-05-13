import Navbar from "./Navbar"
import CourseCard from "./CourseCard"

export default function App() {
  return(
    <>
      <h1>ProgressTube</h1>

      <Navbar
        page="dashboard"
        onNavigate={() => {}}
      />

      <CourseCard
        course={{
          title: "React Basics",
          thumbnail: "",
          type: "playlist",
          status: "in_progress",
          completed_percentage: 70,
          total_videos: 12,
          total_duration_seconds: 7200,
          watched_seconds: 3600,
        }}
        onDelete={() => {}}
        onOpen={() => {}}
      />
    </>
  )
}