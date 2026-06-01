// Dashboard.jsx — Profile + Dashboard combined
import { useState, useEffect } from "react"
import { getDashboard, getActivity } from "./api"
import { BookOpen, CheckCircle, Clock, Award, User, Pencil } from "lucide-react"
import EditProfileModal from "./EditProfileModal"

export default function Dashboard({ user, onUserUpdate }) {
  const [stats, setStats]         = useState(null)
  const [activity, setActivity]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")
  const [editOpen, setEditOpen]   = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([getDashboard(user.id), getActivity(user.id)])
      setStats(s)
      setActivity(a)
    } catch (e) {
      setError("Could not load dashboard. Is FastAPI running?")
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={styles.msg}>Loading...</p>
  if (error)   return <p style={styles.error}>⚠ {error}</p>

  const completionRate = stats.total_courses > 0
    ? Math.round((stats.completed_courses / stats.total_courses) * 100)
    : 0

  return (
    <div style={styles.page}>
      <div style={styles.outerRow}>

        {/* ── LEFT: Profile ── */}
        <div style={styles.profileSide}>
          <div style={styles.avatar}>
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="avatar" style={styles.avatarImg} />
            ) : (
              <User size={100} color="#F5C518" />
            )}
          </div>
          <div style={styles.profileText}>
            <p style={styles.username}>{user.username || user.email}</p>
            <p style={styles.bio}>{user.bio || "No bio yet — click Edit Profile to add one!"}</p>
          </div>
          <button
            id="dashboard-edit-profile"
            style={styles.editBtn}
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={13} color="#000" />
            EDIT PROFILE
          </button>
        </div>

        {/* ── RIGHT: Dashboard ── */}
        <div style={styles.dashSide}>

          {/* 3 stat cards */}
          <div style={styles.statRow}>
            <StatCard
              icon={<BookOpen size={20} color="#F5C518" />}
              value={stats.total_courses ?? 0}
              label="Total Courses"
              color="#F5C518"
            />
            <StatCard
              icon={<CheckCircle size={20} color="#4CAF50" />}
              value={stats.completed_courses ?? 0}
              label="Completed"
              color="#4CAF50"
            />
            <StatCard
              icon={<Clock size={20} color="#2E5FD9" />}
              value={stats.in_progress_courses ?? 0}
              label="In Progress"
              color="#2E5FD9"
            />
          </div>

          {/* Bottom 2 cards */}
          <div style={styles.bottomRow}>

            {/* Completion ring */}
            <div style={styles.card}>
              <div style={styles.cardLabelRow}>
                <Award size={13} color="#F5C518" />
                <span style={styles.cardLabel}>OVERALL COMPLETION</span>
              </div>
              <div style={styles.ringWrap}>
                <CircularProgress percent={completionRate} size={150} />
              </div>
              <p style={styles.cardSub}>
                {stats.completed_courses ?? 0} of {stats.total_courses ?? 0} finished
              </p>
              <p style={styles.cardSub}>
                🏆 {stats.total_trophies ?? 0} certificates earned
              </p>
            </div>

            {/* Activity grid */}
            <div style={styles.card}>
              <div style={styles.cardLabelRow}>
                <BookOpen size={13} color="#F5C518" />
                <span style={styles.cardLabel}>ACTIVITY — LAST 12 WEEKS</span>
              </div>
              <ActivityGrid activity={activity} />
            </div>

          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            onUserUpdate(updated)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────
function StatCard({ icon, value, label, color }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div>
        <p style={{ ...styles.statValue, color }}>{value}</p>
        <p style={styles.statLabel}>{label}</p>
      </div>
    </div>
  )
}

// ── Activity grid ─────────────────────────────
function ActivityGrid({ activity }) {
  const activityMap = {}
  activity.forEach((a) => { activityMap[a.date] = a.count })

  const days = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    days.push({ date: key, count: activityMap[key] || 0 })
  }

  const weeks = []
  for (let w = 0; w < 12; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7))
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]

  function cellColor(count) {
    if (count === 0) return "rgba(255,255,255,0.05)"
    if (count === 1) return "#7B4A0E"
    if (count === 2) return "#B5720A"
    return "#F5C518"
  }

  return (
    <div style={styles.gridOuter}>

      {/* Grid */}
      <div style={styles.gridWrap}>
        <div style={styles.dayLabels}>
          {dayLabels.map((d, i) => (
            <span key={i} style={styles.dayLabel}>{d}</span>
          ))}
        </div>
        <div style={styles.weeksRow}>
          {weeks.map((week, wi) => (
            <div key={wi} style={styles.weekCol}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={`${day.date}: ${day.count} action${day.count !== 1 ? "s" : ""}`}
                  style={{
                    ...styles.cell,
                    background: cellColor(day.count),
                    border: day.count > 0
                      ? "1px solid rgba(245,197,24,0.4)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend — vertical on right */}
      <div style={styles.legendVertical}>
        <span style={styles.legendLabel}>More</span>
        {["#F5C518", "#B5720A", "#7B4A0E", "rgba(255,255,255,0.05)"].map((c, i) => (
          <div key={i} style={{
            ...styles.cell,
            background: c,
            border: "1px solid rgba(255,255,255,0.1)",
          }} />
        ))}
        <span style={styles.legendLabel}>Less</span>
      </div>

    </div>
  )
}

// ── Circular progress ─────────────────────────
function CircularProgress({ percent, size = 150 }) {
  const strokeWidth   = 14
  const radius        = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset        = circumference - (percent / 100) * circumference
  const color         = percent === 100 ? "#4CAF50" : percent > 0 ? "#F5C518" : "#555"

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "monospace", fontSize: "1.3rem", color, fontWeight: "bold" }}>
          {percent}%
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#888" }}>
          complete
        </span>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────
const styles = {
  page: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 40px 64px",
    boxSizing: "border-box",
  },

  outerRow: {
    display: "flex",
    gap: "80px",
    alignItems: "flex-start",
    width: "100%",
  },

  // ── Profile side ──
  profileSide: {
    width: "260px",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    paddingTop: "8px",
  },
  avatar: {
    width: "250px",
    height: "250px",
    borderRadius: "50%",
    background: "#0D1F4A",
    border: "4px solid #F5C518",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  profileText: {
    width: "100%",
    textAlign: "left",
  },
  username: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "1.3rem",
    color: "#FFF8E7",
    margin: 0,
    marginTop: "20px",
  },
  bio: {
    fontFamily: "monospace",
    fontSize: "0.82rem",
    color: "#888",
    margin: 0,
    lineHeight: 1.6,
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#F5C518",
    color: "#000",
    border: "2px solid #000",
    fontFamily: "monospace",
    fontSize: "0.5rem",
    padding: "8px 18px",
    cursor: "pointer",
    letterSpacing: "1px",
    fontWeight: "bold",
    marginTop: "4px",
    width: "100%",
    justifyContent: "center",
  },

  // ── Dashboard side ──
  dashSide: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "8px",
  },

  // Stat row
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "14px",
  },
  statCard: {
    background: "#1A1A2E",
    border: "2px solid rgba(245,197,24,0.35)",
    boxShadow: "3px 3px 0 #4A0E0E",
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  statIcon: { flexShrink: 0 },
  statValue: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "1.6rem",
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: "monospace",
    fontSize: "0.52rem",
    color: "#888",
    margin: "4px 0 0",
    letterSpacing: "0.5px",
  },

  // Bottom 2 cards
  bottomRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  card: {
    background: "#1A1A2E",
    border: "3px solid #F5C518",
    boxShadow: "4px 4px 0 #4A0E0E",
    padding: "20px",
  },
  cardLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "16px",
  },
  cardLabel: {
    fontFamily: "monospace",
    fontSize: "0.42rem",
    color: "#F5C518",
    letterSpacing: "1.5px",
  },
  cardSub: {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    color: "#888",
    margin: "8px 0 0",
    textAlign: "center",
  },
  ringWrap: {
    display: "flex",
    justifyContent: "center",
  },

  // Activity grid
  gridOuter: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    width: "100%",
  },
  gridWrap: {
    display: "flex",
    gap: "4px",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },
  dayLabels: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flexShrink: 0,
    paddingTop: "1px",
  },
  dayLabel: {
    fontFamily: "monospace",
    fontSize: "0.5rem",
    color: "#555",
    height: "14px",
    lineHeight: "14px",
  },
  weeksRow: {
    display: "flex",
    gap: "3px",
    flex: 1,
    justifyContent: "space-between",
  },
  weekCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  cell: {
    width: "14px",
    height: "14px",
    borderRadius: "2px",
    flexShrink: 0,
  },
  legendVertical: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    flexShrink: 0,
  },
  legendLabel: {
    fontFamily: "monospace",
    fontSize: "0.4rem",
    color: "#555",
    writingMode: "vertical-rl",
    textOrientation: "mixed",
    margin: "2px 0",
  },

  msg:   { fontFamily: "monospace", color: "#888",    textAlign: "center", padding: "60px 24px" },
  error: { fontFamily: "monospace", color: "#ff6b6b", textAlign: "center", padding: "60px 24px" },
}