import { useState, useEffect } from "react";
import { updateProgress, getPlaylistVideos, rescanPlaylist, bulkUpdateVideoProgress } from "./api";

export default function ProgressModal({ course, onClose, onUpdated }) {
  const isPlaylist = course.type === "playlist";

  // ─── Single-video state ───────────────────────────────────────────────────
  const [hours,   setHours]   = useState(Math.floor(course.watched_seconds / 3600));
  const [minutes, setMinutes] = useState(Math.floor((course.watched_seconds % 3600) / 60));

  // ─── Shared state ─────────────────────────────────────────────────────────
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [showCert, setShowCert] = useState(false);

  // ─── Playlist state ───────────────────────────────────────────────────────
  const [videos,        setVideos]        = useState([]);   // rows from DB
  const [localProgress, setLocalProgress] = useState({});   // { video_id: watched_seconds }
  const [expanded,      setExpanded]      = useState(null); // video_id of open row
  const [videosLoading, setVideosLoading] = useState(false);
  const [rescanning,    setRescanning]    = useState(false);

  // ─── Derived values ───────────────────────────────────────────────────────
  const totalSecs  = course.total_duration_seconds;
  const totalHours = Math.floor(totalSecs / 3600);
  const totalMins  = Math.floor((totalSecs % 3600) / 60);

  // For single video: derived from hours/minutes inputs
  const singleWatched = hours * 3600 + minutes * 60;

  // For playlist: sum localProgress values
  const playlistWatched = Object.values(localProgress).reduce((s, ws) => s + ws, 0);

  const watchedSecs = isPlaylist ? playlistWatched : singleWatched;
  const percent     = totalSecs > 0
    ? Math.min(100, Math.round((watchedSecs / totalSecs) * 100))
    : 0;

  // ─── Load playlist videos on mount ───────────────────────────────────────
  useEffect(() => {
    if (!isPlaylist) return;
    setVideosLoading(true);
    getPlaylistVideos(course.id)
      .then((rows) => {
        setVideos(rows);
        // Seed localProgress from DB values
        const init = {};
        rows.forEach((v) => { init[v.video_id] = v.watched_seconds; });
        setLocalProgress(init);
      })
      .catch(() => setError("Could not load playlist videos."))
      .finally(() => setVideosLoading(false));
  }, [course.id, isPlaylist]);

  // ─── Playlist helpers ─────────────────────────────────────────────────────
  function toggleCheck(video) {
    const alreadyDone = localProgress[video.video_id] >= video.duration_seconds && video.duration_seconds > 0;
    const newWatched  = alreadyDone ? 0 : video.duration_seconds;
    setLocalProgress((prev) => ({ ...prev, [video.video_id]: newWatched }));
  }

  function setVideoTime(video, h, m) {
    let ws = h * 3600 + m * 60;
    ws = Math.min(ws, video.duration_seconds); // clamp
    setLocalProgress((prev) => ({ ...prev, [video.video_id]: ws }));
  }

  function isChecked(video) {
    const ws = localProgress[video.video_id] ?? 0;
    return video.duration_seconds > 0 && ws >= video.duration_seconds;
  }

  function fmtDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function videoHours(videoId) {
    return Math.floor((localProgress[videoId] ?? 0) / 3600);
  }

  function videoMins(videoId) {
    return Math.floor(((localProgress[videoId] ?? 0) % 3600) / 60);
  }

  // ─── Rescan ───────────────────────────────────────────────────────────────
  async function handleRescan() {
    setRescanning(true);
    setError("");
    try {
      const res = await rescanPlaylist(course.id);
      setVideos(res.videos);
      const init = {};
      res.videos.forEach((v) => { init[v.video_id] = v.watched_seconds; });
      setLocalProgress(init);
    } catch (e) {
      setError(e.message);
    } finally {
      setRescanning(false);
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      let result;
      if (isPlaylist) {
        const updates = videos.map((v) => ({
          video_id: v.video_id,
          watched_seconds: localProgress[v.video_id] ?? 0,
        }));
        result = await bulkUpdateVideoProgress(course.id, updates);
      } else {
        result = await updateProgress(course.id, singleWatched);
      }

      if (result.certificate_earned && !course.certificate_earned) {
        setShowCert(true);
      } else {
        onUpdated();
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Certificate screen ───────────────────────────────────────────────────
  if (showCert) {
    return (
      <div style={styles.overlay}>
        <div style={styles.certBox}>
          <div style={styles.certCorners}>
            {["⭐", "⭐", "⭐", "⭐"].map((s, i) => (
              <span key={i} style={styles.corner}>{s}</span>
            ))}
          </div>
          <p style={styles.certSub}>CERTIFICATE OF COMPLETION</p>
          <p style={styles.certTrophy}>🏆</p>
          <p style={styles.certTitle}>CONGRATULATIONS</p>
          <p style={styles.certCourse}>{course.title}</p>
          <p style={styles.certDate}>
            Completed on {new Date().toLocaleDateString()} via ProgressTube
          </p>
          <button style={styles.btnGold} onClick={() => { onUpdated(); onClose(); }}>
            ⭐ CLAIM TROPHY
          </button>
        </div>
      </div>
    );
  }

  // ─── Shared header + ring section ────────────────────────────────────────
  const watchedH = Math.floor(watchedSecs / 3600);
  const watchedM = Math.floor((watchedSecs % 3600) / 60);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>UPDATE PROGRESS</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Course title */}
          <p style={styles.courseTitle}>{course.title}</p>

          {/* Circular progress ring */}
          <div style={styles.ringWrap}>
            <CircularProgress percent={percent} />
          </div>

          {/* Stats row */}
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>TOTAL LENGTH</span>
              <span style={styles.statVal}>{totalHours}h {totalMins}m</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>WATCHED</span>
              <span style={styles.statVal}>{watchedH}h {watchedM}m</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>STATUS</span>
              <span style={{
                ...styles.statVal,
                color: percent === 100 ? "#4CAF50" : percent > 0 ? "#F5C518" : "#888"
              }}>
                {percent === 100 ? "DONE ✓" : percent > 0 ? "IN PROGRESS" : "NOT STARTED"}
              </span>
            </div>
          </div>

          {/* ── SINGLE VIDEO: original hours/minutes input ── */}
          {!isPlaylist && (
            <>
              <p style={styles.inputLabel}>HOW MUCH HAVE YOU WATCHED?</p>
              <div style={styles.timeInputRow}>
                <div style={styles.timeGroup}>
                  <span style={styles.timeLabel}>HOURS</span>
                  <input
                    style={styles.timeInput}
                    type="number" min={0} max={totalHours + 1}
                    value={hours === 0 ? "" : hours}
                    placeholder="0"
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <span style={styles.timeSep}>:</span>
                <div style={styles.timeGroup}>
                  <span style={styles.timeLabel}>MINUTES</span>
                  <input
                    style={styles.timeInput}
                    type="number" min={0} max={59}
                    value={minutes === 0 ? "" : minutes}
                    placeholder="0"
                    onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>
              <p style={styles.hint}>Max: {totalHours}h {totalMins}m</p>
            </>
          )}

          {/* ── PLAYLIST: per-video checklist ── */}
          {isPlaylist && (
            <div>
              <div style={styles.playlistHeader}>
                <span style={styles.inputLabel}>PLAYLIST VIDEOS</span>
                <button
                  style={styles.btnRescan}
                  onClick={handleRescan}
                  disabled={rescanning}
                >
                  {rescanning ? "SCANNING..." : "⟳ RE-SCAN"}
                </button>
              </div>

              {videosLoading ? (
                <p style={styles.hint}>Loading videos...</p>
              ) : videos.length === 0 ? (
                <div style={styles.emptyList}>
                  <p style={styles.emptyText}>
                    Videos not indexed yet.
                  </p>
                  <p style={styles.hint}>
                    Click RE-SCAN to fetch video list from YouTube.
                  </p>
                </div>
              ) : (
                <div style={styles.videoList}>
                  {videos.map((video) => {
                    const checked  = isChecked(video);
                    const isOpen   = expanded === video.video_id;
                    const ws       = localProgress[video.video_id] ?? 0;
                    const vh       = videoHours(video.video_id);
                    const vm       = videoMins(video.video_id);
                    const maxH     = Math.floor(video.duration_seconds / 3600);
                    const maxM     = Math.floor((video.duration_seconds % 3600) / 60);

                    return (
                      <div key={video.video_id} style={{
                        ...styles.videoRow,
                        borderLeft: checked
                          ? "4px solid #4CAF50"
                          : isOpen
                          ? "4px solid #F5C518"
                          : "4px solid transparent",
                        background: isOpen
                          ? "rgba(245,197,24,0.05)"
                          : "transparent",
                      }}>
                        {/* Main row: checkbox + title + duration + expand arrow */}
                        <div style={styles.videoRowMain}>
                          {/* Custom checkbox */}
                          <button
                            style={{
                              ...styles.checkbox,
                              background: checked ? "#4CAF50" : "transparent",
                              borderColor: checked ? "#4CAF50" : "#555",
                            }}
                            onClick={() => toggleCheck(video)}
                            title={checked ? "Mark as unwatched" : "Mark as complete"}
                          >
                            {checked && <span style={styles.checkmark}>✓</span>}
                          </button>

                          {/* Title — click to expand */}
                          <button
                            style={styles.videoTitle}
                            onClick={() => setExpanded(isOpen ? null : video.video_id)}
                          >
                            <span style={styles.videoPos}>{video.position}.</span>
                            {video.title}
                          </button>

                          {/* Duration + expand arrow */}
                          <div style={styles.videoMeta}>
                            <span style={styles.videoDur}>{fmtDuration(video.duration_seconds)}</span>
                            <span style={{ color: "#F5C518", fontSize: "0.65rem" }}>
                              {isOpen ? "▼" : "▶"}
                            </span>
                          </div>
                        </div>

                        {/* Expandable: partial-watch inputs */}
                        {isOpen && (
                          <div style={styles.expandBody}>
                            <p style={styles.expandLabel}>WATCHED SO FAR</p>
                            <div style={styles.timeInputRow}>
                              <div style={styles.timeGroup}>
                                <span style={styles.timeLabel}>HOURS</span>
                                <input
                                  style={styles.timeInputSm}
                                  type="number" min={0} max={maxH + 1}
                                  value={vh === 0 ? "" : vh}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const newH = Math.max(0, parseInt(e.target.value) || 0);
                                    setVideoTime(video, newH, vm);
                                  }}
                                />
                              </div>
                              <span style={styles.timeSep}>:</span>
                              <div style={styles.timeGroup}>
                                <span style={styles.timeLabel}>MINUTES</span>
                                <input
                                  style={styles.timeInputSm}
                                  type="number" min={0} max={59}
                                  value={vm === 0 ? "" : vm}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const newM = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                    setVideoTime(video, vh, newM);
                                  }}
                                />
                              </div>
                            </div>
                            <p style={styles.hint}>Max: {maxH}h {maxM}m</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p style={styles.error}>⚠ {error}</p>}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.btnCancel} onClick={onClose}>CANCEL</button>
          <button style={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? "SAVING..." : "💾 SAVE PROGRESS"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Circular progress ring (unchanged) ──────────────────────────────────────

function CircularProgress({ percent }) {
  const size        = 140;
  const strokeWidth = 12;
  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (percent / 100) * circumference;
  const color       = percent === 100 ? "#4CAF50" : percent > 0 ? "#F5C518" : "#555";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "monospace", fontSize: "1.3rem", color, fontWeight: "bold" }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  // ── Layout ─────────────────────────────────────
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.85)",
    zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "16px",
  },
  modal: {
    background: "#1A1A2E",
    border: "3px solid #F5C518",
    boxShadow: "8px 8px 0 #4A0E0E",
    width: "100%", maxWidth: "480px",
    maxHeight: "90vh", overflowY: "auto",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "3px solid #F5C518",
    background: "#4A0E0E",
  },
  headerTitle: {
    fontFamily: "monospace", fontSize: "0.7rem",
    color: "#F5C518", letterSpacing: "2px", margin: 0,
  },
  closeBtn: {
    background: "none", border: "2px solid #888",
    color: "#888", cursor: "pointer", fontSize: "1rem",
    padding: "2px 8px",
  },
  body: { padding: "20px", display: "flex", flexDirection: "column", gap: "14px" },
  courseTitle: {
    fontFamily: "monospace", fontWeight: "bold",
    fontSize: "0.95rem", color: "#FFF8E7",
    borderLeft: "4px solid #F5C518", paddingLeft: "12px",
    margin: 0,
  },
  ringWrap: { display: "flex", justifyContent: "center" },
  statsRow: { display: "flex", gap: "12px", flexWrap: "wrap" },
  stat: { display: "flex", flexDirection: "column", gap: "3px", flex: 1 },
  statLabel: {
    fontFamily: "monospace", fontSize: "0.5rem",
    color: "#888", letterSpacing: "1px",
  },
  statVal: {
    fontFamily: "monospace", fontSize: "1rem",
    color: "#F5C518", fontWeight: "bold",
  },

  // ── Single video inputs ─────────────────────────
  inputLabel: {
    fontFamily: "monospace", fontSize: "0.5rem",
    color: "#2E5FD9", letterSpacing: "1px", margin: 0,
  },
  timeInputRow: { display: "flex", alignItems: "flex-end", gap: "10px" },
  timeGroup: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  timeLabel: {
    fontFamily: "monospace", fontSize: "0.45rem", color: "#888", letterSpacing: "1px",
  },
  timeInput: {
    background: "#0D1F4A", border: "3px solid #F5C518",
    color: "#FFF8E7", fontFamily: "monospace",
    fontSize: "1.2rem", padding: "8px", textAlign: "center",
    width: "100%", outline: "none",
  },
  timeInputSm: {
    background: "#0D1F4A", border: "2px solid rgba(245,197,24,0.5)",
    color: "#FFF8E7", fontFamily: "monospace",
    fontSize: "1rem", padding: "6px", textAlign: "center",
    width: "100%", outline: "none",
  },
  timeSep: { color: "#F5C518", fontSize: "1.5rem", paddingBottom: "6px" },
  hint: { fontFamily: "monospace", fontSize: "0.75rem", color: "#555", margin: 0 },
  error: { color: "#ff6b6b", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 },

  // ── Playlist list ───────────────────────────────
  playlistHeader: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: "8px",
  },
  btnRescan: {
    background: "transparent",
    border: "1px solid #555",
    color: "#888", cursor: "pointer",
    fontFamily: "monospace", fontSize: "0.5rem",
    padding: "4px 10px", letterSpacing: "1px",
    transition: "border-color 0.2s, color 0.2s",
  },
  videoList: {
    maxHeight: "280px",
    overflowY: "auto",
    border: "2px solid rgba(245,197,24,0.15)",
    background: "#0D1120",
  },
  videoRow: {
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    transition: "background 0.15s",
  },
  videoRowMain: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 10px",
  },

  // ── Checkbox ────────────────────────────────────
  checkbox: {
    width: "20px", height: "20px", flexShrink: 0,
    border: "2px solid #555",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, transition: "background 0.15s, border-color 0.15s",
  },
  checkmark: {
    color: "#fff", fontSize: "0.7rem", fontWeight: "bold", lineHeight: 1,
  },

  // ── Video row elements ──────────────────────────
  videoTitle: {
    flex: 1,
    background: "none", border: "none",
    color: "#FFF8E7", cursor: "pointer",
    fontFamily: "monospace", fontSize: "0.75rem",
    textAlign: "left", padding: 0,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: "1.4",
  },
  videoPos: {
    color: "#555", marginRight: "5px", flexShrink: 0,
  },
  videoMeta: {
    display: "flex", flexDirection: "column",
    alignItems: "flex-end", gap: "3px", flexShrink: 0,
  },
  videoDur: {
    fontFamily: "monospace", fontSize: "0.6rem", color: "#555",
  },

  // ── Expand body ─────────────────────────────────
  expandBody: {
    padding: "10px 14px 12px 42px",
    borderTop: "1px solid rgba(245,197,24,0.1)",
    background: "rgba(13,31,74,0.5)",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  expandLabel: {
    fontFamily: "monospace", fontSize: "0.45rem",
    color: "#2E5FD9", letterSpacing: "1px", margin: 0,
  },

  // ── Empty state ─────────────────────────────────
  emptyList: {
    padding: "20px 10px",
    border: "2px solid rgba(245,197,24,0.1)",
    background: "#0D1120",
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "monospace", fontSize: "0.8rem",
    color: "#888", margin: "0 0 6px",
  },

  // ── Footer ──────────────────────────────────────
  footer: {
    display: "flex", gap: "12px", padding: "16px 20px",
    borderTop: "2px solid rgba(245,197,24,0.2)",
    justifyContent: "flex-end",
  },
  btnCancel: {
    background: "#4A0E0E", color: "#FFF8E7",
    border: "2px solid #000", fontFamily: "monospace",
    fontSize: "0.6rem", padding: "10px 18px", cursor: "pointer",
    letterSpacing: "1px",
  },
  btnSave: {
    background: "#F5C518", color: "#000",
    border: "2px solid #000", fontFamily: "monospace",
    fontSize: "0.6rem", padding: "10px 18px", cursor: "pointer",
    letterSpacing: "1px", fontWeight: "bold",
  },

  // ── Certificate ─────────────────────────────────
  certBox: {
    background: "#1A0A0A", border: "6px solid #F5C518",
    boxShadow: "12px 12px 0 #000",
    padding: "40px", maxWidth: "500px", width: "100%",
    textAlign: "center", position: "relative",
  },
  certCorners: {
    position: "absolute", inset: 0, pointerEvents: "none",
  },
  corner: {
    position: "absolute", fontSize: "1.2rem", color: "#F5C518",
  },
  certSub: {
    fontFamily: "monospace", fontSize: "0.55rem",
    color: "#888", letterSpacing: "3px", margin: "0 0 8px",
  },
  certTrophy: { fontSize: "3rem", margin: "12px 0" },
  certTitle: {
    fontFamily: "monospace", fontSize: "1.2rem",
    color: "#F5C518", letterSpacing: "2px",
    margin: "0 0 12px",
  },
  certCourse: {
    fontFamily: "monospace", fontSize: "1rem",
    color: "#FFF8E7", border: "2px solid rgba(245,197,24,0.3)",
    padding: "10px", margin: "0 0 16px",
  },
  certDate: {
    fontFamily: "monospace", fontSize: "0.75rem",
    color: "#888", margin: "0 0 24px",
  },
  btnGold: {
    background: "#F5C518", color: "#000",
    border: "3px solid #000", fontFamily: "monospace",
    fontSize: "0.65rem", padding: "12px 24px",
    cursor: "pointer", letterSpacing: "1px", fontWeight: "bold",
  },
};