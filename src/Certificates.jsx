import { useState, useEffect, useRef } from "react"
import { getCourses } from "./api"
import { Award, Download, BookOpen } from "lucide-react"

export default function Certificates({ user }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  useEffect(() => { fetchCompleted() }, [])

  async function fetchCompleted() {
    setLoading(true)
    setError("")
    try {
      const data = await getCourses(user.id)
      setCourses(data.filter((c) => c.status === "completed"))
    } catch {
      setError("Could not load certificates. Is FastAPI running?")
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={s.msg}>Loading certificates...</p>
  if (error)   return <p style={s.error}>⚠ {error}</p>

  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <Award size={28} color="#F5C518" />
        <div>
          <h1 style={s.pageTitle}>My Certificates</h1>
          <p style={s.pageSub}>
            {courses.length === 0
              ? "Complete a course to earn your first certificate"
              : `${courses.length} certificate${courses.length !== 1 ? "s" : ""} earned`}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={s.grid}>
          {courses.map((c) => (
            <CertCard key={c.id} course={c} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────
function EmptyState() {
  return (
    <div style={s.emptyWrap}>
      <div style={s.emptyIcon}>🎓</div>
      <p style={s.emptyTitle}>No certificates yet</p>
      <p style={s.emptySub}>
        Finish a course to earn a certificate.<br />
        Your achievements will appear here.
      </p>
    </div>
  )
}

// ── Certificate card ───────────────────────────
function CertCard({ course, user }) {
  const canvasRef = useRef(null)

  // Format date nicely
  const completedDate = course.updated_at
    ? new Date(course.updated_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "Recently"

  function downloadCertificate() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const W = canvas.width
    const H = canvas.height

    // ── Background ──
    ctx.fillStyle = "#0A0A0A"
    ctx.fillRect(0, 0, W, H)

    // ── Outer border (gold thick) ──
    ctx.strokeStyle = "#F5C518"
    ctx.lineWidth = 12
    ctx.strokeRect(24, 24, W - 48, H - 48)

    // ── Inner border (thin) ──
    ctx.strokeStyle = "rgba(245,197,24,0.35)"
    ctx.lineWidth = 2
    ctx.strokeRect(38, 38, W - 76, H - 76)

    // ── Corner ornaments ──
    const corners = [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]]
    corners.forEach(([x, y]) => {
      ctx.fillStyle = "#F5C518"
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
    })

    // ── ProgressTube logo ──
    ctx.fillStyle = "#F5C518"
    ctx.font = "bold 22px monospace"
    ctx.textAlign = "center"
    ctx.fillText("▶ ProgressTube", W / 2, 100)

    // ── "Certificate of Completion" ──
    ctx.fillStyle = "#888"
    ctx.font = "14px monospace"
    ctx.letterSpacing = "4px"
    ctx.fillText("CERTIFICATE OF COMPLETION", W / 2, 145)

    // ── Divider ──
    ctx.strokeStyle = "rgba(245,197,24,0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, 165); ctx.lineTo(W - 80, 165)
    ctx.stroke()

    // ── "This is to certify that" ──
    ctx.fillStyle = "#666"
    ctx.font = "13px monospace"
    ctx.fillText("This is to certify that", W / 2, 210)

    // ── Username ──
    ctx.fillStyle = "#FFF8E7"
    ctx.font = "bold 34px monospace"
    ctx.fillText(user.username || user.email, W / 2, 258)

    // ── "has successfully completed" ──
    ctx.fillStyle = "#666"
    ctx.font = "13px monospace"
    ctx.fillText("has successfully completed", W / 2, 298)

    // ── Course title (wrapped) ──
    ctx.fillStyle = "#F5C518"
    ctx.font = "bold 20px monospace"
    const words = course.title.split(" ")
    let line = ""; const maxW = W - 160; const lineH = 30
    let y = 340
    for (const word of words) {
      const test = line + (line ? " " : "") + word
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, W / 2, y); y += lineH; line = word
      } else { line = test }
    }
    if (line) ctx.fillText(line, W / 2, y)
    y += lineH + 20

    // ── Divider ──
    ctx.strokeStyle = "rgba(245,197,24,0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, y); ctx.lineTo(W - 80, y)
    ctx.stroke()
    y += 30

    // ── Date ──
    ctx.fillStyle = "#888"
    ctx.font = "13px monospace"
    ctx.fillText(`Awarded on ${completedDate}`, W / 2, y)

    // ── Seal ──
    ctx.fillStyle = "rgba(245,197,24,0.12)"
    ctx.beginPath()
    ctx.arc(W / 2, H - 80, 44, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#F5C518"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = "#F5C518"
    ctx.font = "bold 28px monospace"
    ctx.fillText("🏆", W / 2 - 14, H - 65)

    // ── Download ──
    const link = document.createElement("a")
    link.download = `certificate-${course.title.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div style={s.certCard}>
      {/* Hidden canvas for PNG generation */}
      <canvas ref={canvasRef} width={800} height={560} style={{ display: "none" }} />

      {/* Card visual header */}
      <div style={s.certHeader}>
        <div style={s.certSeal}>
          <Award size={36} color="#F5C518" />
        </div>
        <div style={s.certHeaderText}>
          <span style={s.certBadge}>CERTIFICATE OF COMPLETION</span>
        </div>
      </div>

      {/* Thumbnail + info */}
      <div style={s.certBody}>
        {course.thumbnail && (
          <img src={course.thumbnail} alt={course.title} style={s.thumb} />
        )}
        <div style={s.certInfo}>
          <p style={s.certTitle}>{course.title}</p>
          <div style={s.certMeta}>
            <BookOpen size={12} color="#888" />
            <span style={s.certMetaText}>
              {course.type === "playlist"
                ? `${course.total_videos} videos`
                : "Single video"}
            </span>
          </div>
          <p style={s.certDate}>Completed {completedDate}</p>
        </div>
      </div>

      {/* Awarded to */}
      <div style={s.awardedRow}>
        <span style={s.awardedLabel}>AWARDED TO</span>
        <span style={s.awardedName}>{user.username || user.email}</span>
      </div>

      {/* Download button */}
      <button
        id={`download-cert-${course.id}`}
        style={s.downloadBtn}
        onClick={downloadCertificate}
      >
        <Download size={14} />
        DOWNLOAD PNG
      </button>
    </div>
  )
}

// ── Styles ─────────────────────────────────────
const s = {
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 24px 80px",
    fontFamily: "monospace",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "40px",
    paddingBottom: "20px",
    borderBottom: "3px solid rgba(245,197,24,0.25)",
  },
  pageTitle: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "1.4rem",
    color: "#FFF8E7",
    margin: 0,
  },
  pageSub: {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    color: "#666",
    margin: "4px 0 0",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "24px",
  },

  certCard: {
    background: "#111118",
    border: "3px solid #F5C518",
    boxShadow: "6px 6px 0 #4A0E0E",
    padding: "0",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.15s, box-shadow 0.15s",
    cursor: "default",
  },
  certHeader: {
    background: "linear-gradient(135deg, #1a0a00 0%, #0D1F4A 100%)",
    padding: "20px 20px 16px",
    borderBottom: "2px solid rgba(245,197,24,0.3)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  certSeal: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "rgba(245,197,24,0.12)",
    border: "2px solid rgba(245,197,24,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  certHeaderText: {
    flex: 1,
  },
  certBadge: {
    fontFamily: "monospace",
    fontSize: "0.5rem",
    color: "#F5C518",
    letterSpacing: "2px",
    fontWeight: "bold",
  },

  certBody: {
    display: "flex",
    gap: "14px",
    padding: "16px 20px",
    flex: 1,
  },
  thumb: {
    width: "80px",
    height: "56px",
    objectFit: "cover",
    border: "2px solid rgba(245,197,24,0.2)",
    flexShrink: 0,
  },
  certInfo: {
    flex: 1,
    minWidth: 0,
  },
  certTitle: {
    fontFamily: "monospace",
    fontSize: "0.82rem",
    fontWeight: "bold",
    color: "#FFF8E7",
    margin: "0 0 6px",
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  certMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    marginBottom: "4px",
  },
  certMetaText: {
    fontFamily: "monospace",
    fontSize: "0.62rem",
    color: "#888",
  },
  certDate: {
    fontFamily: "monospace",
    fontSize: "0.62rem",
    color: "#F5C518",
    margin: 0,
  },

  awardedRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "rgba(245,197,24,0.05)",
    borderTop: "1px solid rgba(245,197,24,0.15)",
  },
  awardedLabel: {
    fontFamily: "monospace",
    fontSize: "0.48rem",
    color: "#555",
    letterSpacing: "2px",
  },
  awardedName: {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    color: "#FFF8E7",
    fontWeight: "bold",
  },

  downloadBtn: {
    width: "100%",
    background: "#F5C518",
    color: "#000",
    border: "none",
    borderTop: "2px solid rgba(0,0,0,0.2)",
    fontFamily: "monospace",
    fontSize: "0.65rem",
    letterSpacing: "2px",
    fontWeight: "bold",
    padding: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background 0.15s",
  },

  emptyWrap: {
    textAlign: "center",
    padding: "80px 24px",
  },
  emptyIcon: { fontSize: "4rem", marginBottom: "16px" },
  emptyTitle: {
    fontFamily: "monospace",
    fontSize: "1rem",
    color: "#FFF8E7",
    margin: "0 0 10px",
  },
  emptySub: {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    color: "#555",
    lineHeight: 1.8,
    margin: 0,
  },

  msg: { fontFamily: "monospace", color: "#888", textAlign: "center", padding: "80px 24px" },
  error: { fontFamily: "monospace", color: "#ff6b6b", textAlign: "center", padding: "80px 24px" },
}
