"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { Loader2, Upload, Sparkles, FileText, CheckCircle, LogIn } from "lucide-react"

export function ResumeBuilder() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [step, setStep] = useState<"initial" | "upload" | "create" | "generating" | "parsed" | "done">("initial")
    const [resumeData, setResumeData] = useState<any>(null)
    const [savedResumeId, setSavedResumeId] = useState<string | null>(null)

    // Check for stored resume data after sign-in
    useEffect(() => {
        if (typeof window !== "undefined" && session?.user && status === "authenticated") {
            const storedResumeData = sessionStorage.getItem("pendingResumeData")
            if (storedResumeData) {
                try {
                    const parsed = JSON.parse(storedResumeData)
                    setResumeData(parsed)
                    setStep("parsed")
                    sessionStorage.removeItem("pendingResumeData")
                } catch (e) {
                    console.error("Failed to parse stored resume data:", e)
                }
            }
        }
    }, [session, status])

    // Check for stored form data after sign-in and generate resume
    useEffect(() => {
        if (typeof window !== "undefined" && session?.user && status === "authenticated") {
            const storedFormData = sessionStorage.getItem("pendingResumeFormData")
            if (storedFormData) {
                try {
                    const parsedFormData = JSON.parse(storedFormData)
                    // Set form data to state
                    setFormData(parsedFormData)
                    // Generate resume using stored form data
                    setStep("generating")
                    
                    fetch("/api/resume/generate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            fullName: parsedFormData.fullName,
                            email: parsedFormData.email,
                            role: parsedFormData.role,
                            skills: parsedFormData.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
                            experience: parsedFormData.experience,
                        }),
                    })
                        .then(async (response) => {
                            // Check if response is JSON before parsing
                            const contentType = response.headers.get("content-type")
                            if (!contentType || !contentType.includes("application/json")) {
                                const text = await response.text()
                                console.error("Non-JSON response from /api/resume/generate:", text.substring(0, 200))
                                throw new Error(`Server returned ${response.status}: ${response.statusText}`)
                            }
                            
                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
                                throw new Error(errorData.message || "Failed to generate resume")
                            }

                            return response.json()
                        })
                        .then((data) => {
                            setResumeData(data)
                            setStep("parsed")
                            sessionStorage.removeItem("pendingResumeFormData")
                        })
                        .catch((error: any) => {
                            console.error("Failed to generate resume from stored form data:", error)
                            alert(error.message || "Failed to generate resume. Please try again.")
                            setStep("create")
                            sessionStorage.removeItem("pendingResumeFormData")
                        })
                } catch (e) {
                    console.error("Failed to parse stored form data:", e)
                    sessionStorage.removeItem("pendingResumeFormData")
                }
            }
        }
    }, [session, status])
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        role: "",
        skills: "",
        experience: "",
    })

    const saveResume = async (resumeData: any, type: "UPLOADED" | "GENERATED") => {
        try {
            const response = await fetch("/api/resume/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: resumeData, // API expects "content", not "resumeData"
                    type,
                    title: resumeData.headlineOrTitle || resumeData.role || "My Resume",
                }),
            })

            // Check if response is JSON before parsing
            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text()
                console.error("Non-JSON response from /api/resume/save:", text.substring(0, 200))
                throw new Error(`Server returned ${response.status}: ${response.statusText}`)
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: "Unknown error" }))
                throw new Error(error.message || "Failed to save resume")
            }

            const result = await response.json()
            setSavedResumeId(result.resumeId)
            return result.resumeId
        } catch (error: any) {
            console.error("Error saving resume:", error)
            throw error
        }
    }

    const handleSaveResume = async () => {
        // Check if user is authenticated
        if (!session?.user) {
            // Store resume data in sessionStorage before redirecting
            if (resumeData && typeof window !== "undefined") {
                sessionStorage.setItem("pendingResumeData", JSON.stringify(resumeData))
            }
            // Redirect to login with callback URL
            const currentUrl = window.location.pathname
            router.push(`/auth/login?callback=${encodeURIComponent(currentUrl)}`)
            return
        }

        // User is authenticated, proceed with saving
        try {
            setStep("generating")
            const type = step === "parsed" && resumeData ? "UPLOADED" : "GENERATED"
            await saveResume(resumeData, type)
            setStep("done")
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Failed to save resume. Please try again.")
            setStep("parsed")
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setStep("generating")

        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/resume/parse", {
                method: "POST",
                body: formData,
            })

            // Check if response is JSON before parsing
            const contentType = res.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text()
                console.error("Non-JSON response from /api/resume/parse:", text.substring(0, 200))
                throw new Error(`Server returned ${res.status}: ${res.statusText}`)
            }
            
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Unknown error" }))
                throw new Error(errorData.message || "Failed to parse resume")
            }

            const data = await res.json()
            setResumeData(data)
            
            // Show parsed resume preview instead of auto-saving
            setStep("parsed")
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Failed to parse resume. Please try again.")
            setStep("initial")
        }
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Check if user is authenticated
        if (!session?.user) {
            // Store form data in sessionStorage before redirecting
            if (typeof window !== "undefined") {
                sessionStorage.setItem("pendingResumeFormData", JSON.stringify(formData))
            }
            // Redirect to login with callback URL
            const currentUrl = window.location.pathname
            router.push(`/auth/login?callback=${encodeURIComponent(currentUrl)}`)
            return
        }

        // User is authenticated, proceed with generation
        setStep("generating")

        try {
            // Call AI generation API
            const response = await fetch("/api/resume/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    email: formData.email,
                    role: formData.role,
                    skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
                    experience: formData.experience,
                }),
            })

            // Check if response is JSON before parsing
            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text()
                console.error("Non-JSON response from /api/resume/generate:", text.substring(0, 200))
                throw new Error(`Server returned ${response.status}: ${response.statusText}`)
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
                throw new Error(errorData.message || "Failed to generate resume")
            }

            const data = await response.json()
            setResumeData(data)
            
            // Show parsed resume preview instead of auto-saving
            setStep("parsed")
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Failed to generate resume. Please try again.")
            setStep("create")
        }
    }

    if (step === "initial") {
        return (
            <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
                <Card className="p-8 hover:border-blue-500/50 transition-all cursor-pointer group" onClick={() => document.getElementById("resume-upload")?.click()}>
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Upload Resume</h3>
                        <p className="text-gray-400">Upload your PDF or DOCX to get started instantly.</p>
                        <input
                            id="resume-upload"
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx"
                            onChange={handleFileUpload}
                        />
                    </div>
                </Card>

                <Card className="p-8 hover:border-purple-500/50 transition-all cursor-pointer group" onClick={() => setStep("create")}>
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">Create with AI</h3>
                        <p className="text-gray-400">No resume? Let AI build a professional one for you.</p>
                    </div>
                </Card>
            </div>
        )
    }

    if (step === "create") {
        return (
            <Card className="w-full max-w-2xl mx-auto p-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Tell us about yourself</h2>
                    <p className="text-gray-400">AI will draft your resume based on these details.</p>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <Input
                        label="Full Name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Current Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        placeholder="e.g. Mechanical Engineer"
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Key Skills</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white h-24"
                            value={formData.skills}
                            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                            placeholder="Solid Works, 3d Modeling, AutoCad, Thermodynamics..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Experience Summary</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white h-32"
                            value={formData.experience}
                            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                            placeholder="Briefly describe your past roles..."
                            required
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setStep("initial")}>Back</Button>
                        <Button type="submit" className="flex-1">Generate Resume</Button>
                    </div>
                </form>
            </Card>
        )
    }

    if (step === "generating") {
        return (
            <div className="text-center py-20">
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AI is crafting your profile...</h3>
                <p className="text-gray-400">Analyzing skills, formatting experience, and optimizing keywords.</p>
            </div>
        )
    }

    if (step === "parsed") {
        return (
            <Card className="w-full max-w-2xl mx-auto p-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Resume Extracted Successfully!</h2>
                    <p className="text-gray-400">Review your resume below and save it to get started with job matching.</p>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-lg text-left mb-8 border border-gray-700">
                    <h4 className="font-semibold text-white mb-2 text-lg">{resumeData?.fullName || "Resume"}</h4>
                    {resumeData?.headlineOrTitle && (
                        <p className="text-blue-400 text-sm mb-4">{resumeData.headlineOrTitle}</p>
                    )}
                    {resumeData?.email && (
                        <p className="text-gray-400 text-sm mb-2">{resumeData.email}</p>
                    )}
                    {resumeData?.summary && (
                        <p className="text-gray-300 text-sm mb-4">{resumeData.summary}</p>
                    )}
                    {resumeData?.skills && Array.isArray(resumeData.skills) && resumeData.skills.length > 0 && (
                        <div className="mb-4">
                            <p className="text-gray-400 text-xs mb-2">Skills:</p>
                            <div className="flex flex-wrap gap-2">
                                {resumeData.skills.slice(0, 10).map((skill: string, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {!session?.user ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <LogIn className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-yellow-400 font-medium mb-1">Sign in required</p>
                                <p className="text-gray-400 text-sm">You need to sign in to save your resume and start matching with jobs.</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setStep("initial")}>Start Over</Button>
                    <Button onClick={handleSaveResume} className="flex-1">
                        {session?.user ? "Save Resume" : "Sign In to Save"}
                    </Button>
                </div>
            </Card>
        )
    }

    if (step === "done") {
        return (
            <Card className="w-full max-w-2xl mx-auto p-8 text-center">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Resume Ready!</h2>
                <p className="text-gray-400 mb-8">Your profile has been created and is ready for job matching.</p>

                <div className="bg-gray-800/50 p-6 rounded-lg text-left mb-8 border border-gray-700">
                    <h4 className="font-semibold text-white mb-2">{resumeData.fullName}</h4>
                    <p className="text-blue-400 text-sm mb-4">{resumeData.headlineOrTitle || resumeData.role}</p>
                    <p className="text-gray-300 text-sm">{resumeData.summary}</p>
                </div>

                <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => setStep("initial")}>Start Over</Button>
                    <Button onClick={() => {
                        if (savedResumeId) {
                            router.push(`/results?resumeId=${savedResumeId}`)
                        } else {
                            router.push("/results")
                        }
                    }}>Find Matching Jobs</Button>
                </div>
            </Card>
        )
    }

    return null
}
