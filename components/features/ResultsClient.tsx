"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { JobCard } from "@/components/features/JobCard"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Search, Filter, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Job {
    id: string
    title: string
    company: string
    location: string
    jobType: string
    shortDescription: string
    fullDescription: string
    sourceUrl: string
    matchScore?: number
}

interface ResultsClientProps {
    resumeId: string
    resumeTitle: string
    initialResumeData: any
}

export function ResultsClient({ resumeId, resumeTitle, initialResumeData }: ResultsClientProps) {
    const router = useRouter()
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [rematching, setRematching] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [noJobsError, setNoJobsError] = useState<string | null>(null)

    const fetchMatchedJobs = async (showRematching = false) => {
        if (showRematching) {
            setRematching(true)
        } else {
            setLoading(true)
        }

        try {
            const response = await fetch(`/api/jobs/match?resumeId=${resumeId}`)
            
            // Check if response is actually JSON
            const contentType = response.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text()
                console.error("Non-JSON response received:", text.substring(0, 200))
                throw new Error(`Server returned ${response.status}: ${response.statusText}`)
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Unknown error" }))
                const errorMessage = errorData.message || "Failed to fetch matched jobs"
                
                // Check if it's a "no jobs in database" error
                if (errorMessage.includes("No jobs available in database") || errorMessage.includes("sync jobs")) {
                    setNoJobsError(errorMessage)
                    setJobs([])
                } else {
                    throw new Error(errorMessage)
                }
            } else {
                const data = await response.json()
                const jobsData = data.jobs || []
                
                // Log received scores for debugging
                if (jobsData.length > 0) {
                    const scoreSummary = jobsData.slice(0, 5).map((j: Job) => `${j.matchScore || 'N/A'}%`).join(", ")
                    console.log(`✅ Received ${jobsData.length} jobs with scores. Sample: ${scoreSummary}`)
                }
                
                setJobs(jobsData)
                setNoJobsError(null)
            }
        } catch (error: any) {
            console.error("Error fetching matched jobs:", error)
            alert(`Failed to load job matches: ${error.message || "Unknown error"}`)
        } finally {
            setLoading(false)
            setRematching(false)
        }
    }

    const handleSyncJobs = async () => {
        setSyncing(true)
        try {
            const response = await fetch("/api/jobs/sync", { method: "POST" })
            const data = await response.json()
            
            if (data.success) {
                // After syncing, fetch matched jobs again (force refresh to get new jobs)
                // After syncing, fetch matched jobs again
await fetchMatchedJobs(false)
                alert(`Successfully synced ${data.total} jobs!`)
            } else {
                alert(`Failed to sync jobs: ${data.message || "Unknown error"}`)
            }
        } catch (error: any) {
            console.error("Error syncing jobs:", error)
            alert(`Failed to sync jobs: ${error.message || "Unknown error"}`)
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchMatchedJobs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeId])

    const handleRematch = () => {
        fetchMatchedJobs(true, true) // Force refresh when user clicks re-match
    }

    // Filter jobs based on search query
    const filteredJobs = jobs.filter(job => {
        if (!searchQuery.trim()) return true
        const query = searchQuery.toLowerCase()
        return (
            job.title.toLowerCase().includes(query) ||
            job.company.toLowerCase().includes(query) ||
            job.location.toLowerCase().includes(query) ||
            job.fullDescription.toLowerCase().includes(query)
        )
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white">
                <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="font-bold text-xl">AIJobMatch</div>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-6 py-20">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-400">Loading job matches...</p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white">
            <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            AIJobMatch
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-700" />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <aside className="w-full md:w-64 space-y-6 hidden md:block">
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Filters
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Remote
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Full-time
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <input type="checkbox" className="rounded bg-gray-800 border-gray-700" /> Contract
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <h4 className="font-bold text-blue-400 mb-2">Resume</h4>
                            <p className="text-sm text-gray-300 mb-2">{resumeTitle}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRematch}
                                disabled={rematching}
                                className="w-full"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${rematching ? "animate-spin" : ""}`} />
                                {rematching ? "Re-matching..." : "Re-match Jobs"}
                            </Button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="mb-8">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Top Matches for You</h1>
                                <p className="text-gray-400">
                                    Based on your resume, we found {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} with high compatibility.
                                </p>
                            </div>
                        </div>

                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-3 w-5 h-5 text-gray-500" />
                            <Input
                                className="pl-12 bg-gray-800/50 border-gray-700"
                                placeholder="Search by title, company, or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {filteredJobs.length === 0 ? (
                            <div className="text-center py-12">
                                {noJobsError ? (
                                    <>
                                        <p className="text-gray-400 mb-4">
                                            {noJobsError}
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            onClick={handleSyncJobs}
                                            disabled={syncing}
                                            className="mt-4"
                                        >
                                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                                            {syncing ? "Syncing jobs from Browser AI..." : "Sync Jobs from Browser AI"}
                                        </Button>
                                        <p className="text-xs text-gray-500 mt-4">
                                            This will fetch the latest jobs from Browser AI and save them to the database.
                                        </p>
                                    </>
                                ) : searchQuery ? (
                                    <>
                                        <p className="text-gray-400 mb-4">
                                            No jobs match your search.
                                        </p>
                                        <Button variant="outline" onClick={() => setSearchQuery("")}>
                                            Clear Search
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-gray-400 mb-4">
                                        No jobs found.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredJobs.map(job => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

