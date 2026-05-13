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
          ? <img src={thumbnail} alt={title} />
          : <div> ▶ </div>
        }
        <span>
          {
            type === "playlist"
            ? `${total_videos} videos`
            : "VIDEO"
          }
        </span>
      </div>
      
      <div>
        <p title={title}>{title}</p>

        <span style={{color: statusColor, borderColor: statusColor}}>
          {status.replace("_", " ").toUpperCase()}
        </span>

        <div>
          <div style={{width: `${completed_percentage}%`}}></div>
        </div>

        <p>
          {completed_percentage}%
        </p>

        <p>
          {formatTime(watched_seconds)} / {formatTime(total_duration_seconds)}
        </p>

        <div>
          <button onClick={onOpen}>OPEN</button>
          <button onClick={onDelete}>X</button>
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
    position: "relative"
  }
}