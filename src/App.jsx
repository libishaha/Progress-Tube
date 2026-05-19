import Navbar from "./Navbar"
import CourseCard from "./CourseCard"
import ProgressModal from "./ProgressModal"
import { useState, useEffect } from "react"
import { getCourses, addCourse, deleteCourse } from "./api"

export default function App(){
  const [page, setPage]       = useState("courses")
  const [url, setUrl]         = useState("")
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState("")
  const [openCourse, setOpenCourse] = useState(null)

  useEffect( () => {fetchCourses()}, [] )

  async function fetchCourses(){
    setLoading(true)
    setError("")

    try{
      const data = await getCourses()
      setCourses(data)
    }
    catch{
      setError("Could not connect to backend. Is FastAPI running?")
    }
    finally{
      setLoading(false)
    }
  }

  async function handleAdd(){
    if(!url.trim()) return
    setAdding(true)
    setError("")

    try{
      await addCourse(url.trim())
      setUrl("")
      await fetchCourses()
    }
    finally{
      setAdding(false)
    }
  }

  async function hadleDelete(id){
    if(!window.confirm("Remove this curse?")) return
    await deleteCourse(id)
    await fetchCourses()
  }

  return(
    <div  style={{background: "#0A0A0A", minHeight: "100vh", color: "#FFF8E7"}}>
      <Navbar page = {page} onNavigate={setPage}></Navbar>

      <main style={{maxWidth: "1100px", margin: "0 auto", padding: "32px 24px"}}>

        <div style={styles.addBar}> 
          <input 
            type="text"
            style={styles.input}
            placeholder="Paste a YouTube video URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button style={styles.btnAdd} onClick={handleAdd} disabled={adding}>
            {adding ? "LOADING" : "ADD COURSE"}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {
          loading ? (
            <p style={styles.msg}>Loading...</p>
          ) : courses.length === 0 ? (
            <p style={styles.msg}>No courses yet. Paste a Youtube url above</p>
          ) : (
            <div style={styles.grid}>
              {courses.map((c) => (
                <CourseCard
                  key={c.id}
                  course = {c}
                  onDelete={() => hadleDelete(c.id)}
                  onOpen={() => setOpenCourse(c)}
                />
              ))}
            </div>
          )
        }
      </main>
      {openCourse && (
        <ProgressModal
          course={openCourse}
          onClose={() => setOpenCourse(null)}
          onUpdated={() => {fetchCourses(); setOpenCourse(null);}}
        />
      )}
    </div>
  )
}

const styles = {
  addBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },

  input: {
    flex: 1,
    minWidth: "240px",
    background: "#0D1F4A",
    color: "#FFF8E7",
    border: "3px solid #F5C518",
    fontFamily: "monospace",
    fontSize: "0.95rem",
    fontSize: "0.95rem",
    padding: "10px 14px",
    outline: "none",
  },

  btnAdd: {
    background: "#F5C518",
    color: "#000",
    border: "3px solid #000", 
    fontFamily: "monospace",
    fontSize: "0.6rem", 
    padding: "10px 20px",
    cursor: "pointer", 
    letterSpacing: "1px", 
    fontWeight: "bold",
  },

  error: { 
    color: "#ff6b6b", 
    fontFamily: "monospace", 
    marginBottom: "16px" 
  },
  msg: { 
    fontFamily: "monospace", 
    color: "#888", 
    textAlign: "center", 
    marginTop: "60px" 
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  }
  
}