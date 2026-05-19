import { useState } from "react";
import { updateProgress } from "./api";

export default function ProgressModal({course, onClose, onUpdated}){
    const [hours, setHours]         = useState(Math.floor(course.watched_seconds / 3600))
    const [minutes, setMinutes]     = useState(Math.floor((course.watched_seconds % 3600) / 60 ))
    const [saving, setSaving]       = useState(false)
    const [error, setError]         = useState("")
    const [showCert, setShowCert]   = useState(false)

    const totalSecs = course.total_duration_seconds
    const totalHours = Math.floor(totalSecs / 3600)
    const totalMins = Math.floor((totalSecs % 3600) / 60)
    const watchedSecs = hours * 3600 + minutes * 60
    const percent = totalSecs > 0
                    ? Math.min(100, Math.round((watchedSecs / totalSecs) * 100))
                    : 0

    async function handleSave(){
        setSaving(true)
        setError("")

        try{
            const result = await updateProgress(course.id, watchedSecs)
            if(result.certificate_earned){
                setShowCert(true)
            }
            else{
                onUpdated()
                onClose()
            }
        }
        catch(e){
            setError(e.message)
        }
        finally{
            setSaving(false)
        }
    }

    if(showCert){
        return(
            <div style={styles.overlay}>
                <div style={styles.certBox}>
                    <div style={styles.certCorners}>
                        {["⭐", "⭐", "⭐", "⭐"].map((s, i) =>(
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
                    <button
                        style = {styles.btnGold}
                        onClick = {() => {onUpdated(); onClose();}}
                    >
                        ⭐ CLAIM TROPHY
                    </button>
                </div>
            </div>
        )
    }

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
              <span style={styles.statVal}>{hours}h {minutes}m</span>
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

          {/* Time input */}
          <p style={styles.inputLabel}>HOW MUCH HAVE YOU WATCHED?</p>
          <div style={styles.timeInputRow}>
            <div style={styles.timeGroup}>
              <span style={styles.timeLabel}>HOURS</span>
              <input
                style={styles.timeInput}
                type="number"
                min={0}
                max={totalHours + 1}
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
                type="number"
                min={0}
                max={59}
                value={minutes === 0 ? "" : minutes}
                placeholder="0"
                onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>
          <p style={styles.hint}>Max: {totalHours}h {totalMins}m</p>

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
  )
}

function CircularProgress({ percent }) {
  const size        = 140
  const strokeWidth = 12
  const radius      = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset      = circumference - (percent / 100) * circumference
  const color       = percent === 100 ? "#4CAF50" : percent > 0 ? "#F5C518" : "#555"

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {/* Center text */}
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
  )
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.8)",
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
  timeSep: { color: "#F5C518", fontSize: "1.5rem", paddingBottom: "6px" },
  hint: { fontFamily: "monospace", fontSize: "0.75rem", color: "#555", margin: 0 },
  error: { color: "#ff6b6b", fontFamily: "monospace", fontSize: "0.85rem", margin: 0 },
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

  // Certificate styles
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
}