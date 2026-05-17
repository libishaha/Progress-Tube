import { useState } from "react";
import { updateProgress } from "./api";

export default function ProgressModal({course, onClose, onUpdate}){
    const [hours, setHours]         = useState(Math.floor(course.watched_seconds / 3600))
    const [minutes, setMinutes]     = useState(Math.floor((course.watched_seconds % 3600) / 60 ))
    const [saving, setSaving]       = useState(false)
    const [error, setError]         = useState("")
    const [showCert, setShowCert]   = useState(false)

    const totalSecs = course.total_duration_seconds
    const totalHours = Math.floor(totalSecs / 3600)
    const totalMins = Math.floor((totalSecs % 3600) / 60)
    const watchedSecs 
}