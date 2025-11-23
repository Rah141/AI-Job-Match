"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Loader2, FileText, PenTool, Download, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { saveAs } from "file-saver"

interface JobData {
    id: string
    title: string
    company: string
    fullDescription: string
    sourceUrl?: string | null
}

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [step, setStep] = useState<"tailor" | "cover-letter" | "review" | "done">("tailor")
    const [isGenerating, setIsGenerating] = useState(false)
    const [tailoredResume, setTailoredResume] = useState<any>(null)
    const [tailoredResumeText, setTailoredResumeText] = useState("")
    const [coverLetter, setCoverLetter] = useState("")
    const [jobData, setJobData] = useState<JobData | null>(null)
    const [isLoadingJob, setIsLoadingJob] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch job data on page load
    useEffect(() => {
        const fetchJob = async () => {
            try {
                setIsLoadingJob(true)
                setError(null)
                const response = await fetch(`/api/jobs/list?id=${id}`)
                if (!response.ok) {
                    throw new Error("Failed to fetch job details")
                }
                const data = await response.json()
                if (data.jobs && data.jobs.length > 0) {
                    setJobData(data.jobs[0])
                } else {
                    throw new Error("Job not found")
                }
            } catch (error: any) {
                console.error("Error fetching job:", error)
                setError(error.message || "Failed to load job details")
            } finally {
                setIsLoadingJob(false)
            }
        }
        fetchJob()
    }, [id])

    // Format tailored resume JSON to readable text
    const formatResumeForDisplay = (resume: any): string => {
        if (!resume || typeof resume !== 'object') {
            return "No resume data available"
        }

        let formatted = ""

        // Full Name and Title
        if (resume.fullName) {
            formatted += `${resume.fullName}\n`
        }
        if (resume.headlineOrTitle) {
            formatted += `${resume.headlineOrTitle}\n`
        }
        if (resume.email || resume.location) {
            formatted += `${resume.email || ""}${resume.email && resume.location ? " | " : ""}${resume.location || ""}\n`
        }
        formatted += "\n"

        // Professional Summary
        if (resume.summary) {
            formatted += `PROFESSIONAL SUMMARY\n${"=".repeat(50)}\n${resume.summary}\n\n`
        }

        // Skills
        if (resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0) {
            formatted += `SKILLS\n${"=".repeat(50)}\n${resume.skills.join(", ")}\n\n`
        }

        // Experience
        if (resume.experience && Array.isArray(resume.experience) && resume.experience.length > 0) {
            formatted += `PROFESSIONAL EXPERIENCE\n${"=".repeat(50)}\n`
            resume.experience.forEach((exp: any, idx: number) => {
                formatted += `\n${idx + 1}. ${exp.jobTitle || "Position"}`
                if (exp.company) {
                    formatted += ` at ${exp.company}`
                }
                if (exp.startDate || exp.endDate) {
                    formatted += ` (${exp.startDate || ""} - ${exp.endDate || "Present"})`
                }
                formatted += "\n"
                if (exp.description) {
                    formatted += `${exp.description}\n`
                }
            })
            formatted += "\n"
        }

        // Education
        if (resume.education && Array.isArray(resume.education) && resume.education.length > 0) {
            formatted += `EDUCATION\n${"=".repeat(50)}\n`
            resume.education.forEach((edu: any) => {
                formatted += `${edu.degree || "Degree"}`
                if (edu.institution) {
                    formatted += ` from ${edu.institution}`
                }
                if (edu.startDate || edu.endDate) {
                    formatted += ` (${edu.startDate || ""} - ${edu.endDate || ""})`
                }
                formatted += "\n"
            })
        }

        return formatted.trim()
    }

    const handleTailorResume = async () => {
        if (!jobData) {
            setError("Job data not loaded. Please refresh the page.")
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch("/api/resume/tailor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: id,
                    jobDescription: jobData.fullDescription,
                    resumeId: undefined, // API will fetch latest resume
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                if (response.status === 401) {
                    router.push("/auth/login")
                    return
                }
                if (response.status === 404) {
                    throw new Error("No resume found. Please upload or generate a resume first.")
                }
                throw new Error(errorData.message || "Failed to tailor resume")
            }

            const data = await response.json()
            setTailoredResume(data.tailoredResume)
            setTailoredResumeText(formatResumeForDisplay(data.tailoredResume))
            setStep("cover-letter")
        } catch (error: any) {
            console.error("Error tailoring resume:", error)
            setError(error.message || "Failed to tailor resume. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleGenerateCoverLetter = async () => {
        if (!jobData) {
            setError("Job data not loaded. Please refresh the page.")
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch("/api/cover-letter/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId: id,
                    jobDescription: jobData.fullDescription,
                    resumeId: undefined, // API will fetch latest resume
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                if (response.status === 401) {
                    router.push("/auth/login")
                    return
                }
                if (response.status === 404) {
                    throw new Error("No resume found. Please upload or generate a resume first.")
                }
                throw new Error(errorData.message || "Failed to generate cover letter")
            }

            const data = await response.json()
            setCoverLetter(data.coverLetter || "")
            setStep("review")
        } catch (error: any) {
            console.error("Error generating cover letter:", error)
            setError(error.message || "Failed to generate cover letter. Please try again.")
        } finally {
            setIsGenerating(false)
        }
    }

    const createWordDocument = async (content: string, fileName: string) => {
        const lines = content.split("\n")
        const docParagraphs: Paragraph[] = []
        
        lines.forEach((line, index) => {
            const trimmed = line.trim()
            
            if (!trimmed) {
                // Empty line - add spacing
                if (index > 0 && index < lines.length - 1) {
                    docParagraphs.push(
                        new Paragraph({
                            text: "",
                            spacing: { after: 60 },
                        })
                    )
                }
                return
            }
            
            // Check if it's a section heading (has === or is all caps and short)
            if (trimmed.includes("=".repeat(20))) {
                const headingText = trimmed.replace(/=/g, "").trim()
                docParagraphs.push(
                    new Paragraph({
                        text: headingText,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 200, before: 300 },
                    })
                )
            } else if (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 5 && !trimmed.includes(".")) {
                // Likely a heading (all caps, reasonable length, no periods)
                docParagraphs.push(
                    new Paragraph({
                        text: trimmed,
                        heading: HeadingLevel.HEADING_2,
                        spacing: { after: 150, before: 200 },
                    })
                )
            } else if (trimmed.match(/^\d+\./)) {
                // Numbered list item
                docParagraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: trimmed,
                                size: 22,
                            }),
                        ],
                        spacing: { after: 100 },
                        indent: { left: 360 }, // 0.25 inch indent
                    })
                )
            } else {
                // Regular paragraph text
                docParagraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: trimmed,
                                size: 22,
                            }),
                        ],
                        spacing: { after: 120 },
                    })
                )
            }
        })
        
        // If no paragraphs were created, add the content as-is
        if (docParagraphs.length === 0) {
            docParagraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: content || "No content available",
                        }),
                    ],
                })
            )
        }
        
        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: docParagraphs,
                },
            ],
        })
        
        const blob = await Packer.toBlob(doc)
        saveAs(blob, fileName)
    }

    const handleDownload = async (type: "resume" | "cover-letter") => {
        if (type === "resume" && tailoredResumeText) {
            await createWordDocument(tailoredResumeText, `tailored-resume-${id}.docx`)
        } else if (type === "cover-letter" && coverLetter) {
            await createWordDocument(coverLetter, `cover-letter-${id}.docx`)
        }
    }

    if (isLoadingJob) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
                    <p className="text-gray-400">Loading job details...</p>
                </div>
            </div>
        )
    }

    if (error && !jobData) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white">
                <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                AIJobMatch
                            </span>
                        </Link>
                        <Link href="/results" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Jobs
                        </Link>
                    </div>
                </header>
                <div className="max-w-3xl mx-auto p-6">
                    <Card className="p-8">
                        <div className="text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                            <h2 className="text-2xl font-bold">Error Loading Job</h2>
                            <p className="text-gray-400">{error}</p>
                            <Button onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    if (!jobData) {
        return null
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white">
            <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            AIJobMatch
                        </span>
                    </Link>
                    <Link href={`/job/${id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Job
                    </Link>
                </div>
            </header>
            <div className="max-w-3xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Apply with AI</h1>
                    <p className="text-gray-400 mb-4">{jobData.title} at {jobData.company}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className={`flex items-center gap-2 ${step === "tailor" ? "text-blue-400 font-bold" : ""}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step === "tailor" ? "border-blue-400 bg-blue-400/10" : ""}`}>1</div> Tailor Resume
                        </div>
                        <div className="w-8 h-px bg-gray-700" />
                        <div className={`flex items-center gap-2 ${step === "cover-letter" ? "text-blue-400 font-bold" : ""}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step === "cover-letter" ? "border-blue-400 bg-blue-400/10" : ""}`}>2</div> Cover Letter
                        </div>
                        <div className="w-8 h-px bg-gray-700" />
                        <div className={`flex items-center gap-2 ${step === "review" ? "text-blue-400 font-bold" : ""}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step === "review" ? "border-blue-400 bg-blue-400/10" : ""}`}>3</div> Review & Download
                        </div>
                    </div>
                </div>

                {error && (
                    <Card className="p-4 mb-6 bg-red-500/10 border-red-500/50">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-400 font-semibold">Error</p>
                                <p className="text-gray-300 text-sm">{error}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setError(null)}>Dismiss</Button>
                        </div>
                    </Card>
                )}

                {step === "tailor" && (
                    <Card className="p-8">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                                <FileText className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Tailor Your Resume</h2>
                                <p className="text-gray-400">AI will analyze the job description and re-order your experience to highlight the most relevant skills.</p>
                            </div>
                            <Button 
                                onClick={handleTailorResume} 
                                isLoading={isGenerating} 
                                disabled={isGenerating}
                                className="w-full max-w-sm"
                            >
                                {isGenerating ? "Optimizing..." : "Tailor Resume to Job"}
                            </Button>
                        </div>
                    </Card>
                )}

                {step === "cover-letter" && (
                    <Card className="p-8">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
                                <PenTool className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Generate Cover Letter</h2>
                                <p className="text-gray-400">Create a personalized cover letter that speaks directly to the company's mission and requirements.</p>
                            </div>
                            {tailoredResumeText && (
                                <div className="bg-gray-800/50 p-4 rounded-lg text-left text-sm text-gray-300 mb-4 border border-gray-700 max-h-60 overflow-y-auto">
                                    <h4 className="font-semibold text-white mb-2">Tailored Resume Preview:</h4>
                                    <pre className="whitespace-pre-wrap font-sans text-xs">{tailoredResumeText.substring(0, 500)}...</pre>
                                </div>
                            )}
                            <Button 
                                onClick={handleGenerateCoverLetter} 
                                isLoading={isGenerating}
                                disabled={isGenerating}
                                className="w-full max-w-sm"
                            >
                                {isGenerating ? "Writing..." : "Generate Cover Letter"}
                            </Button>
                        </div>
                    </Card>
                )}

                {step === "review" && (
                    <div className="space-y-6">
                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Tailored Resume</h3>
                                <Button variant="outline" size="sm" onClick={() => handleDownload("resume")} disabled={!tailoredResumeText}>
                                    <Download className="w-4 h-4 mr-2" /> Download Word Doc
                                </Button>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 h-96 overflow-y-auto border border-gray-700">
                                <pre className="whitespace-pre-wrap font-sans">{tailoredResumeText || "No resume data available"}</pre>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold flex items-center gap-2"><PenTool className="w-4 h-4 text-purple-400" /> Cover Letter</h3>
                                <Button variant="outline" size="sm" onClick={() => handleDownload("cover-letter")} disabled={!coverLetter}>
                                    <Download className="w-4 h-4 mr-2" /> Download Word Doc
                                </Button>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-300 h-96 overflow-y-auto border border-gray-700">
                                <textarea
                                    className="w-full h-full bg-transparent outline-none resize-none text-gray-300"
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Cover letter will appear here..."
                                />
                            </div>
                        </Card>

                        <div className="flex justify-end gap-4">
                            {jobData.sourceUrl && jobData.sourceUrl !== "#" ? (
                                <Button variant="primary" onClick={() => window.open(jobData.sourceUrl!, "_blank")}>
                                    Apply on Company Site
                                </Button>
                            ) : (
                                <Button variant="secondary" disabled>
                                    Apply on Company Site (URL not available)
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <Card className="p-12 text-center">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-8">Good Luck!</h2>
                        <div className="flex gap-4 justify-center">
                            <Link href="/results">
                                <Button variant="outline">Back to Jobs</Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button>Go to Dashboard</Button>
                            </Link>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
