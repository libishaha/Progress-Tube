export default function CourseCard({course, onDelete, onOpen}){
  const { title, thumbnail, type, status, completed_percentage,
          total_videos, total_duration_seconds, watched_seconds } = course

  const statusColor = {
    not_started: "#888",
    in_progress: "#F5C518",
    completed: "#4CAF50",
  }[status] || "#888"

  function formatTime(secs){
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h : ${m}m` : `${m}m`
  }

  return(
    <div style={styles.card}>
      <div style={styles.thumbWrap}>
        {
          thumbnail
          ? <img src={thumbnail} alt={title} style={styles.thumb} />
          : <div style={styles.thumbPlaceHolder}> ▶ </div>
        }
        <span style={styles.typeTag}>
          {
            type === "playlist"
            ? `${total_videos} videos`
            : "VIDEO"
          }
        </span>
      </div>
      
      <div style={styles.body}>
        <p style={styles.title} title={title}>{title}</p>

        <span style={{...styles.status, color: statusColor, borderColor: statusColor}}>
          {status.replace("_", " ").toUpperCase()}
        </span>

        <div style={styles.barWrap}>
          <div style={{...styles.barFill, width: `${completed_percentage}%`}}></div>
        </div>

        <p style={styles.percent}>
          {completed_percentage}%
        </p>

        <p style={styles.time}>
          {formatTime(watched_seconds)} / {formatTime(total_duration_seconds)}
        </p>

        <div style={styles.actions}>
          <button style={styles.btnOpen} onClick={onOpen}>OPEN</button>
          <button style={styles.btnDel} onClick={onDelete}>X</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: "#1A1A2E",
    border: "3px solid #F5C518",
    boxShadow: "6px 6px 0 #4A0E0E",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "transform 0.15s",
  },

  thumbWrap: {
    position: "relative",
    aspectRatio: "16/9",
    background: "#0D14A4"
  },

  thumb: {
    width: "100%",
    height: "100%", 
    objectFit: "cover",
    display: "block",
  },

  thumbPlaceHolder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    color: "#2E5FD9"
  },

  typeTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    background: "#7B1D1D",
    color: "#FFF8E7",
    fontSize: "0.6rem",
    padding: "3px 8px",
    FontFamily: "monospace",
  },

  body: {
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  title: {
    FontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "0.9rem",
    color: "#FFF8E7",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    margin: 0,
  },

  status: {
    FontFamily: "monospace",
    fontSize: "0.55rem",
    padding: "3px 8px",
    border: "1px solid",
    alignSelf: "flex-start",
    letterSpacing: "1px",
  },

  barWrap: {
    width: "100%", height: "8px",
    background: "rgba(255,255,255,0.06)",
    border: "2px solid #F5C518",
  },

  barFill: { 
    height: "100%", 
    background: "#F5C518",
    transition: "width 0.4s" 
  },

  percent: {
    fontFamily: "monospace", 
    fontSize: "0.7rem", 
    color: "#F5C518", 
    margin: 0, 
    textAlign: "right",
  },

  time: { 
    fontFamily: "monospace", 
    fontSize: "0.75rem", 
    color: "#888", 
    margin: 0,
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },

  btnOpen: {
    flex: 1,
    background: "#1B3A8C",
    color: "#FFF8E7",
    border: "2px solid #000",
    fontFamily: "monospace",
    fontSize: "0.6rem",
    padding: "8px",
    cursor: "pointer",
    letterSpacing: "1px",
  },

  btnDel: {
    background: "8B0000",
    color: "#000",
    border: "2px solid #000",
    fontFamily: "monospace",
    fontSize: "0.8rem",
    padding: "8px 12px",
    cursor: "pointer",
  }
}