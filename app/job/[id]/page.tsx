import Link from "next/link"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { ArrowLeft, Building2, MapPin } from "lucide-react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { JobActions } from "@/components/features/JobActions"
import { JobActionsGuest } from "@/components/features/JobActionsGuest"
import { getJobFromDatabase } from "@/lib/jobSync"
import { MatchScoreDisplay } from "@/components/features/MatchScoreDisplay"
import { JobMatchScoreClient } from "@/components/features/JobMatchScoreClient"

interface JobPageProps {
    params: Promise<{ id: string }>
    searchParams: Promise<{ score?: string }>
}

function formatPostedDate(postedAt: Date | null | undefined): string {
    if (!postedAt) {
        return "Unknown"
    }

    const now = new Date()
    const posted = new Date(postedAt)
    const diffInMs = now.getTime() - posted.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    const diffInWeeks = Math.floor(diffInDays / 7)
    const diffInMonths = Math.floor(diffInDays / 30)
    const diffInYears = Math.floor(diffInDays / 365)

    if (diffInSeconds < 60) {
        return "Just now"
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`
    } else if (diffInHours < 24) {
        return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`
    } else if (diffInDays < 7) {
        return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`
    } else if (diffInWeeks < 4) {
        return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`
    } else if (diffInMonths < 12) {
        return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`
    } else {
        return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`
    }
}

export default async function JobPage({ params, searchParams }: JobPageProps) {
    // Await params and searchParams (Next.js 15+)
    const { id } = await params
    const search = await searchParams
    
    // Fetch job from database
    const job = await getJobFromDatabase(id)

    if (!job) {
        return (
            <div className="min-h-screen bg-[#0B0F19] text-white">
                <div className="max-w-5xl mx-auto px-6 py-10">
                    <Link href="/results" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to Jobs
                    </Link>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Job not found</h1>
                        <p className="text-gray-400">The job you're looking for doesn't exist or has been removed.</p>
                    </div>
                </div>
            </div>
        )
    }

    // Check authentication and fetch user's resume if logged in
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    let resumeId: string | undefined = undefined
    let matchScore: number | null = null
    let scoreSource: "url" | "cache" | "none" = "none"

    // Get resume ID if user is logged in (needed for cache lookup)
    if (userId) {
        const resume = await prisma.resume.findFirst({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        })
        if (resume) {
            resumeId = resume.id
        }
    }

    // First, check if score is provided in URL (from results page)
    // If URL has score, use it directly (highest priority, no API call needed)
    if (search.score) {
        const urlScore = parseInt(search.score, 10)
        if (!isNaN(urlScore) && urlScore >= 0 && urlScore <= 100) {
            matchScore = urlScore
            scoreSource = "url"
            console.log(`✅ Job ${id}: Using score from URL parameter: ${matchScore}%`)
        } else {
            console.warn(`⚠️  Job ${id}: Invalid score in URL parameter: ${search.score}`)
        }
    }

    // If no URL score, we'll let JobMatchScoreClient check cache
    // No server-side calculation to avoid unnecessary API calls

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white">
            <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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

            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Main Column */}
                    <div className="md:col-span-2 space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
                            <div className="flex items-center gap-4 text-gray-400">
                                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {job.company}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {job.location}</span>
                                <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{job.jobType}</span>
                            </div>
                        </div>

                        <Card className="p-8">
                            <h3 className="text-xl font-semibold mb-4">Job Description</h3>
                            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {job.fullDescription}
                            </div>
                        </Card>
                    </div>

                    {/* Side Column */}
                    <div className="space-y-6">
                        <Card className="p-6 sticky top-24">
                            <div className="mb-6">
                                {scoreSource === "url" ? (
                                    // If score is from URL, use MatchScoreDisplay directly (no cache check needed)
                                    <MatchScoreDisplay 
                                        score={matchScore} 
                                        showLabel={true}
                                        size="md"
                                    />
                                ) : (
                                    // If no URL score, use JobMatchScoreClient to check cache
                                    <JobMatchScoreClient
                                        jobId={id}
                                        resumeId={resumeId}
                                        serverScore={null}
                                    />
                                )}
                            </div>

                            <div className="mb-6">
                                <Link href={`/job/${job.id}/apply`}>
                                    <Button className="w-full">
                                        Apply Now
                                    </Button>
                                </Link>
                            </div>

                            {userId ? (
                                <JobActions
                                    jobId={job.id}
                                    jobDescription={job.fullDescription}
                                    jobSourceUrl={job.sourceUrl ?? ""}
                                    resumeId={resumeId}
                                />
                            ) : (
                                <JobActionsGuest jobSourceUrl={job.sourceUrl ?? ""} />
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="font-semibold text-sm mb-3">Job Details</h4>
                                <div className="space-y-2 text-sm text-gray-400">
                                    <div className="flex justify-between">
                                        <span>Posted</span>
                                        <span>{formatPostedDate(job.postedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
