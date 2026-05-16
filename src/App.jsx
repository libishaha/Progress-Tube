import Navbar from "./Navbar"
import CourseCard from "./CourseCard"
import { useState, useEffect } from "react"
import { getCourses, addCourse, deleteCourse } from "./api"

export default function App(){

  const [page, setPage]       = useState("courses")
  const [url, setUrl]         = useState("")
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState("")

  useEffect( () => {fetchCourses}, [] )

  function fetchCourses(){
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

  function handleAdd(){
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

  function hadleDelete(id){
    if(!window.confirm("Remove this curse?")) return
    await deleteCourse(id)
    await fetchCourses()
  }
}