// api.js — all communication with FastAPI backend

const BASE_URL = "http://localhost:8000"

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || "Something went wrong")
  return data
}

export const getCourses       = ()                      => apiFetch("/courses")
export const addCourse        = (url)                   => apiFetch("/courses", { method: "POST", body: JSON.stringify({ youtube_url: url }) })
export const deleteCourse     = (id)                    => apiFetch(`/courses/${id}`, { method: "DELETE" })
export const updateProgress   = (id, watched)           => apiFetch(`/courses/${id}/progress`, { method: "PUT", body: JSON.stringify({ watched_seconds: watched }) })
export const getDashboard     = ()                      => apiFetch("/dashboard")
export const getTrophies      = ()                      => apiFetch("/trophies")

// ── Playlist-specific ──────────────────────────────────────────────────────
export const getPlaylistVideos     = (courseId)          => apiFetch(`/courses/${courseId}/videos`)
export const rescanPlaylist        = (courseId)          => apiFetch(`/courses/${courseId}/rescan`, { method: "POST" })
export const bulkUpdateVideoProgress = (courseId, updates) =>
  apiFetch(`/courses/${courseId}/videos/bulk-progress`, {
    method: "PUT",
    body: JSON.stringify({ updates }),
  })