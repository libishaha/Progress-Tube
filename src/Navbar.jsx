export default function Navbar({ page, onNavigate }) {
  return (
    <nav style={styles.nav}>
      <span style={styles.logo} onClick={() => onNavigate("dashboard")}>▶ ProgressTube</span>
      <div style={styles.links}>
        {["dashboard", "courses", "trophies"].map((p) => (
          <button
            key={p}
            onClick={() => onNavigate(p)}
            style={{
              ...styles.link,
              borderBottom: page === p ? "2px solid #F5C518" : "2px solid transparent",
              color: page === p ? "#F5C518" : "#aaa",
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: "60px",
    background: "#1a0a0a",
    borderBottom: "3px solid #F5C518",
  },
  logo: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "1.1rem",
    color: "#F5C518",
    cursor: "pointer",
  },
  links: { display: "flex", gap: "8px" },
  link: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 14px",
    fontFamily: "monospace",
    fontSize: "0.75rem",
    letterSpacing: "1px",
    transition: "color 0.2s",
  },
}