import { useState } from "react"
import { updateUser } from "./api"
import { User, ArrowRight, Check, SkipForward } from "lucide-react"

export default function Onboarding({ user, onComplete }) {
  const [step, setStep]         = useState(1)   // 1 or 2
  const [username, setUsername] = useState("")
  const [bio, setBio]           = useState("")
  const [photo, setPhoto]       = useState(null) // base64 string
  const [preview, setPreview]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  // ── Step 1: Save username + bio, advance to step 2 ──
  async function handleStep1(skipBio = false) {
    if (!username.trim()) { setError("Username is required"); return }
    setError("")
    setLoading(true)
    try {
      await updateUser(user.id, {
        username: username.trim(),
        bio: skipBio ? "" : bio.trim(),
      })
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Upload photo or skip ──
  async function handleStep2(skip = false) {
    setLoading(true)
    try {
      const updated = await updateUser(user.id, {
        profile_picture: skip ? null : photo,
      })
      onComplete({ ...user, username: username.trim(), bio: bio.trim(), profile_picture: updated.profile_picture })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhoto(ev.target.result)
      setPreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={s.page}>
      <div style={s.bgBlob} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.logoRow}>
          <span style={s.logoIcon}>▶</span>
          <span style={s.logoText}>ProgressTube</span>
        </div>

        {/* Step indicator */}
        <div style={s.stepRow}>
          {[1, 2].map((n) => (
            <div key={n} style={s.stepItem}>
              <div style={{
                ...s.stepDot,
                background: step >= n ? "#F5C518" : "transparent",
                border: step >= n ? "2px solid #F5C518" : "2px solid #444",
                color: step >= n ? "#000" : "#444",
              }}>
                {step > n ? <Check size={12} /> : n}
              </div>
              {n < 2 && <div style={{ ...s.stepLine, background: step > n ? "#F5C518" : "#333" }} />}
            </div>
          ))}
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <h2 style={s.heading}>Set up your profile</h2>
            <p style={s.sub}>Choose a username to get started</p>

            <label style={s.label}>USERNAME <span style={{ color: "#ff6b6b" }}>*</span></label>
            <input
              id="onboard-username"
              style={s.input}
              placeholder="e.g. learner42"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError("") }}
            />

            <label style={{ ...s.label, marginTop: "16px" }}>BIO <span style={s.optional}>(optional)</span></label>
            <textarea
              id="onboard-bio"
              style={{ ...s.input, height: "80px", resize: "vertical" }}
              placeholder="A passionate learner who loves..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />

            {error && <p style={s.error}>⚠ {error}</p>}

            <div style={s.btnRow}>
              <button
                id="onboard-skip-bio"
                style={s.btnSecondary}
                onClick={() => handleStep1(true)}
                disabled={loading}
              >
                <SkipForward size={14} /> SKIP BIO
              </button>
              <button
                id="onboard-next"
                style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
                onClick={() => handleStep1(false)}
                disabled={loading}
              >
                {loading ? "SAVING..." : "NEXT"} <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <h2 style={s.heading}>Profile picture</h2>
            <p style={s.sub}>Upload a photo or skip for now</p>

            {/* Preview */}
            <div style={s.avatarWrap}>
              {preview ? (
                <img src={preview} alt="preview" style={s.avatarImg} />
              ) : (
                <User size={70} color="#F5C518" />
              )}
            </div>

            <label id="onboard-photo-label" style={s.uploadBtn} htmlFor="photo-input">
              📷 CHOOSE PHOTO
            </label>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />

            {error && <p style={s.error}>⚠ {error}</p>}

            <div style={s.btnRow}>
              <button
                id="onboard-skip-photo"
                style={s.btnSecondary}
                onClick={() => handleStep2(true)}
                disabled={loading}
              >
                <SkipForward size={14} /> SKIP
              </button>
              <button
                id="onboard-finish"
                style={{ ...s.btnPrimary, opacity: !photo || loading ? 0.5 : 1 }}
                onClick={() => handleStep2(false)}
                disabled={!photo || loading}
              >
                {loading ? "SAVING..." : "FINISH"} <Check size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "monospace",
  },
  bgBlob: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "440px",
    background: "#111118",
    border: "3px solid #F5C518",
    boxShadow: "8px 8px 0 #4A0E0E",
    padding: "40px 36px",
    margin: "24px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  },
  logoIcon: { fontSize: "1.4rem", color: "#F5C518" },
  logoText: { fontFamily: "monospace", fontWeight: "bold", fontSize: "1.2rem", color: "#F5C518" },

  stepRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "28px",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
  },
  stepDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "monospace",
    fontSize: "0.7rem",
    fontWeight: "bold",
    flexShrink: 0,
    transition: "all 0.3s",
  },
  stepLine: {
    width: "60px",
    height: "2px",
    margin: "0 8px",
    transition: "background 0.3s",
  },

  heading: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "1.2rem",
    color: "#FFF8E7",
    margin: "0 0 6px",
  },
  sub: {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    color: "#666",
    margin: "0 0 24px",
  },
  label: {
    fontFamily: "monospace",
    fontSize: "0.55rem",
    color: "#F5C518",
    letterSpacing: "2px",
    display: "block",
    marginBottom: "6px",
  },
  optional: {
    color: "#555",
    letterSpacing: "0",
    fontSize: "0.55rem",
  },
  input: {
    width: "100%",
    background: "#0D1F4A",
    color: "#FFF8E7",
    border: "2px solid rgba(245,197,24,0.35)",
    fontFamily: "monospace",
    fontSize: "0.9rem",
    padding: "12px 14px",
    outline: "none",
    boxSizing: "border-box",
  },
  error: {
    color: "#ff6b6b",
    fontFamily: "monospace",
    fontSize: "0.72rem",
    margin: "10px 0 0",
  },
  btnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
  },
  btnPrimary: {
    flex: 1,
    background: "#F5C518",
    color: "#000",
    border: "3px solid #000",
    fontFamily: "monospace",
    fontSize: "0.65rem",
    letterSpacing: "2px",
    fontWeight: "bold",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  btnSecondary: {
    flex: 1,
    background: "transparent",
    color: "#888",
    border: "2px solid #444",
    fontFamily: "monospace",
    fontSize: "0.65rem",
    letterSpacing: "1px",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },

  avatarWrap: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    background: "#0D1F4A",
    border: "4px solid #F5C518",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadBtn: {
    display: "block",
    textAlign: "center",
    background: "transparent",
    color: "#F5C518",
    border: "2px solid rgba(245,197,24,0.4)",
    fontFamily: "monospace",
    fontSize: "0.65rem",
    letterSpacing: "2px",
    padding: "12px",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },
}
